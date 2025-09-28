import React, { useEffect, useMemo, useRef, useState } from 'react'
import KitStage from '../../canvas-kit/KitStage'
import { parseDSL, DSLDoc, DSLShape } from '../../utils/parse'
import { Group, Rect, Text, Line } from 'react-konva'
import { useApp } from '../../context'
import { Toolbar, ToolbarGroup } from '@ui/Toolbar';
import { Select } from "@ui/Select";
import { useFormat, fmt, formatStore } from '../../state/formatStore'

// ---- Lane/Vec 结构 ----
type LaneRect = { id:string; x:number; y:number; w:number; h:number; text?:string; color?:string }
type VecGroup = { baseId:string; lanes: LaneRect[]; box?: {x:number;y:number;w:number;h:number} }

// 提取 lane 基名，如 v0[1] / v0_1 / v0-1 / v0.1 → v0
function laneBase(id: string): string | null {
  const m =
    id.match(/^([A-Za-z_]\w*)\[(\d+)\]$/) ||
    id.match(/^([A-Za-z_]\w*)[._-](\d+)$/);
  return m ? m[1] : null;
}

// ========== 变更 1：collectVecGroups 支持 allow 白名单（来自 DSL 的 pack(...)） ==========
function collectVecGroups(shapes: DSLShape[], allowSet = new Set<string>()): VecGroup[] {
  const map = new Map<string, VecGroup>()
  const boxes: Record<string, {x:number;y:number;w:number;h:number}> = {}

  // 1) 收集外框 __box
  for (const s of shapes) {
    if (s.kind === 'group' && /__box$/.test(s.id)) {
      const baseId = s.id.replace(/__box$/, '')
      boxes[baseId] = { x: s.x, y: s.y, w: s.w, h: s.h }
      if (!map.has(baseId)) map.set(baseId, { baseId, lanes: [], box: boxes[baseId] })
    }
  }

  // 2) 把每个 rect 归入 vec
  for (const s of shapes) {
    if (s.kind !== 'rect') continue;

    let baseId: string | null = null;

    // 显式命名：v1[0] / v1_0 / v1-0 / v1.0 都识别
    const m =
      s.id.match(/^([a-zA-Z_]\w*)\[(\d+)\]$/) ||
      s.id.match(/^([a-zA-Z_]\w*)[._-](\d+)$/);

    if (m && boxes[m[1]]) {
      // 有 __box → 直接按 box 归组
      baseId = m[1];
    } else if (m && allowSet.has(m[1])) {
      // 没有 __box，但在 pack 白名单 → 按名称归组（支持 nobox）
      baseId = m[1];
    } else {
      // 否则仅在几何上位于某个 __box 内时归组；没有 __box 一律不归组
      const cx = s.x + s.w / 2, cy = s.y + s.h / 2;
      for (const [bid, b] of Object.entries(boxes)) {
        if (cx >= b.x && cx <= b.x + b.w && cy >= b.y && cy <= b.y + b.h) { baseId = bid; break; }
      }
    }

    if (!baseId || (!boxes[baseId] && !allowSet.has(baseId))) continue; // 防止误并
    const g = map.get(baseId) ?? { baseId, lanes: [], box: boxes[baseId] };
    g.lanes.push({ id: s.id, x: s.x, y: s.y, w: s.w, h: s.h, text: s.text, color: s.color });
    map.set(baseId, g);
  }


  // 3) 排序输出
  const groups: VecGroup[] = []
  map.forEach((g) => {
    g.lanes.sort((a, b) => a.x - b.x)
    groups.push(g)
  })
  return groups
}

// 自适应字号
function fitFontSize(txt: string, widthPx: number, maxSize=28, pad=24) {
  const approxChar = 0.58;
  const need = txt.length * maxSize * approxChar + pad * 2
  if (need <= widthPx) return maxSize
  const s = Math.max(12, Math.floor((widthPx - pad*2) / (txt.length * approxChar)))
  return Math.min(maxSize, s)
}

const PX = (u: number) => u * 96
const COLOR: Record<string,string> = {
  lightgray:'#F4F6FA', teal:'#59E0D0', black:'#0B1220',
  '#0EA5E9':'#0EA5E9', '#22d3ee':'#22d3ee', '#111827':'#111827', '#94a3b8':'#94a3b8'
}
const col = (c?:string) => (c && COLOR[c]? COLOR[c] : (c || '#94a3b8'))

// 动画参数
const STEP_MS = 1600
const APPEAR_MS = 420
const DISAPPEAR_MS = 320
const BLINK_MIN = 0.55
const BLINK_MAX = 1.00

// 仅渲染一段 Text，跟随数制/位宽
function FmtText({
  value,
  x, y, width, height,
  align = 'center' as 'left'|'center'|'right',
  vAlign = 'middle' as 'top'|'middle'|'bottom',
  fontSize = 28,
  color = '#0B1220',
  fontFamily = "'Futura','STFangsong','PingFang SC','Microsoft YaHei',system-ui",
}: {
  value: string | number
  x: number; y: number; width: number; height: number
  align?: 'left'|'center'|'right'
  vAlign?: 'top'|'middle'|'bottom'
  fontSize?: number; color?: string
  fontFamily?: string
}) {
  const snap = useFormat()
  const txt = fmt(value, snap.base, snap.hexDigits)
  return (
    <Text
      text={txt}
      x={x} y={y} width={width} height={height}
      align={align} verticalAlign={vAlign}
      fontSize={fontSize} fill={color}
      listening={false}
      fontFamily={fontFamily}
    />
  )
}

export default function CanvasKitPanel() {
  const [showGrid, setShowGrid] = useState(true);
  const { arch, opcode, form, pushLog, clearLogs, dslOverride, logs } = useApp()
  const [dsl, setDsl] = useState('')
  const [doc, setDoc] = useState<DSLDoc>({ steps:[], shapes:[], anims:[], packOn:[], packOff:[] })
  const [stepIdx, setStepIdx] = useState(0)
  const [zoom, setZoom] = useState(1)
  const [resetTick, setResetTick] = useState(0)
  const fmtSnap = useFormat()
  useEffect(() => {
    if (dslOverride) { setDsl(dslOverride.text); return }
  // 依赖 rev，确保同一文本也会重新解析渲染
  }, [dslOverride?.rev, arch, opcode, form])
  // --- Debug toggle and logger ---
  const [debugOn, setDebugOn] = useState(false)
  const [debug, setDebug] = useState(false);
  const dbg = (...args: any[]) => {
    if (!debugOn) return;
    const line = args.map((x)=> (typeof x === 'string' ? x : JSON.stringify(x))).join(' ')
    // 写入控制台 + 左侧 Logs 面板
    // 控制台带统一前缀便于过滤
    // 面板只收短文本，避免超长
    console.debug('[DSL]', ...args)
    try { pushLog(line.length > 400 ? line.slice(0, 400) + ' …' : line) } catch {}
  }

  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)
  const stepStartRef = useRef<number>(performance.now())
  const [clock, setClock] = useState(0)

  // ==== Icon button styles ====
  const iconBtn: React.CSSProperties = {
    width: 28, height: 28,
    borderRadius: '50%',
    display: 'inline-flex',
    alignItems: 'center', justifyContent: 'center',
    border: '1px solid #e5e7eb',
    background: '#ffffff',
    boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
    cursor: 'pointer',
    fontSize: 12,
    padding: 0
  }
  const iconText: React.CSSProperties = { lineHeight: '1', fontSize: 12 }
  const iconGap: React.CSSProperties = { width: 6 }

  useEffect(()=>{
    const d = parseDSL(dsl)
    setDoc(d); setStepIdx(0); stepStartRef.current = performance.now(); setResetTick(t=>t+1)
    dbg('parse done:', { steps: d.steps.length, shapes: d.shapes.length, anims: d.anims.length, packOn: d.packOn, packOff: d.packOff })
  },[dsl])

  const appearAt = useMemo(()=>{
    const m = new Map<string, number>()
    doc.anims.forEach(a=>{ if(a.kind==='appear') m.set(a.id, doc.steps.findIndex(s=>s.id===a.stepId)) })
    return m
  },[doc])
  const disappearAt = useMemo(()=>{
    const m = new Map<string, number>()
    doc.anims.forEach(a=>{ if(a.kind==='disappear') m.set(a.id, doc.steps.findIndex(s=>s.id===a.stepId)) })
    return m
  },[doc])
  const blinkMap = useMemo(()=>{
    const m = new Map<string, {step:number; times:number; interval:number}[]>()
    doc.anims.forEach(a=>{
      if(a.kind==='blink'){
        const st = doc.steps.findIndex(s=>s.id===a.stepId)
        const arr = m.get(a.id) ?? []
        arr.push({ step: st, times: a.times, interval: a.interval })
        m.set(a.id, arr)
      }
    })
    return m
  },[doc])

  // RAF（只在需要时运行）：播放中，或手动切换步骤后的短暂过渡期
  useEffect(() => {
    const TRANSITION_MS = Math.max(APPEAR_MS, DISAPPEAR_MS) + 50; // 过渡缓冲

    // 是否需要时钟驱动：播放中，或暂停但处于过渡时间窗
    const needClock = () => {
      if (playing) return true;
      const now = performance.now();
      return (now - stepStartRef.current) < TRANSITION_MS;
    };

    if (!doc.steps.length || !needClock()) return; // 不需要则不占用 rAF

    let raf = 0;
    const loop = (t: number) => {
      // 播放时推进步骤；暂停时只用于让过渡动画自然结束
      if (playing && doc.steps.length > 0) {
        const elapsed = (t - stepStartRef.current) * speed;
        const atLast = stepIdx >= doc.steps.length - 1;
        if (!atLast && elapsed >= STEP_MS) {
          setStepIdx((i) => {
            const n = Math.min(doc.steps.length - 1, i + 1);
            if (n !== i) stepStartRef.current = t;
            return n;
          });
        } else if (atLast) {
          // 到达最后一步后，等待转场结束即自动停止刷新，避免持续占用 GPU
          if (elapsed >= TRANSITION_MS) {
            setPlaying(false);
          }
        }
      }

      // 仅当仍然需要时钟时才触发重绘；否则停止 rAF，避免空转占用 GPU
      if (needClock()) {
        setClock(t);
        raf = requestAnimationFrame(loop);
      }
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [playing, speed, doc.steps.length, stepIdx]);

  const stepName = doc.steps[stepIdx]?.name ?? ''

  // ========== 变更 2：把 DSL 的 packOn 做成白名单，传给收集函数 ==========
  const allowSet = useMemo(() => {
    const set = new Set(doc.packOn ?? []);
    if (set.size === 0) {
      // 当 DSL 未显式 pack(...) 时，尝试自动推断：
      // 1) 只统计形如 base[idx] / base_idx / base-idx / base.idx 的 lane
      // 2) 跳过 VRF 顶排（以 rf_ 开头）
      const cnt = new Map<string, number>();
      for (const s of doc.shapes) {
        if (s.kind !== 'rect') continue;
        const base = laneBase(s.id);
        if (!base) continue;
        if (base.startsWith('rf_')) continue; // 不合并 VRF 顶行
        cnt.set(base, (cnt.get(base) || 0) + 1);
      }
      cnt.forEach((n, b) => { if (n >= 2) set.add(b); });
    }
    return set;
  }, [doc.packOn, doc.shapes]);
  useEffect(()=>{
    dbg('allowSet =', Array.from(allowSet))
  }, [allowSet])

  // 注意：用 allowSet 调 collectVecGroups
  const vecGroups = useMemo(() => collectVecGroups(doc.shapes, allowSet), [doc.shapes, allowSet]);
  useEffect(()=>{
    const summary = vecGroups.map(g => ({ base: g.baseId, lanes: g.lanes.map(l=>l.id) }))
    dbg('vecGroups =', summary)
  }, [vecGroups])

  // 过渡
  const elapsedInCurrentStep = () => (performance.now() - stepStartRef.current) * speed
  const appearAlpha = (id:string): number => {
    const ap = appearAt.has(id) ? appearAt.get(id)! : -1
    if (ap < 0) return 1
    if (stepIdx < ap) return 0
    if (stepIdx > ap) return 1
    const t = elapsedInCurrentStep()
    return Math.max(0, Math.min(1, t / APPEAR_MS))
  }
  const disappearAlpha = (id:string): number => {
    const dp = disappearAt.has(id) ? disappearAt.get(id)! : Infinity
    if (stepIdx < dp) return 1
    if (stepIdx > dp) return 0
    const t = elapsedInCurrentStep()
    return 1 - Math.max(0, Math.min(1, t / DISAPPEAR_MS))
  }
  const blinkAlpha = (id:string): number => {
    const cfgs = blinkMap.get(id)
    if (!cfgs || !cfgs.length) return 1
    const cfg = cfgs.find(c=>c.step===stepIdx)
    if (!cfg) return 1
    const elapsed = elapsedInCurrentStep()
    const total = cfg.times * cfg.interval
    if (elapsed >= total) return 1
    const local = (elapsed % cfg.interval) / cfg.interval
    const wave = 0.5 - 0.5 * Math.cos(local * Math.PI * 2)
    return BLINK_MIN + (BLINK_MAX - BLINK_MIN) * wave
  }
  const isVisibleLogical = (id:string) => {
    const ap = appearAt.has(id) ? appearAt.get(id)! : -1
    const dp = disappearAt.has(id) ? disappearAt.get(id)! : Infinity
    return stepIdx >= ap && stepIdx <= dp
  }
  const finalOpacity = (id:string): number => {
    if (!isVisibleLogical(id)) return 0
    const a = appearAlpha(id)
    const d = disappearAlpha(id)
    const b = blinkAlpha(id)
    return Math.max(0, Math.min(1, a * d * b))
  }

  // lane → vec
  const laneIdToVec = useMemo(()=>{
    const map = new Map<string,string>()
    vecGroups.forEach(g => g.lanes.forEach(l => map.set(l.id, g.baseId)))
    return map
  },[vecGroups])
  useEffect(()=>{ dbg('mode =', fmtSnap.base, 'hidden-lanes=', laneIdToVec.size) }, [fmtSnap.base, laneIdToVec])
  useEffect(()=>{
    if (!debugOn) return;
    // 找出所有 id 属于 v0 家族的 rect
    const v0lanes = doc.shapes.filter(s => s.kind === 'rect' && /^(v0(\[\d+\]|[._-]\d+))$/.test(s.id)).map(s=>s.id)
    const grouped = vecGroups.find(g=>g.baseId==='v0')
    dbg('v0 lanes =', v0lanes)
    dbg('v0 grouped?', !!grouped, grouped ? grouped.lanes.map(l=>l.id) : [])
    dbg('allowSet has v0?', (allowSet as Set<string>).has('v0'))
  }, [debugOn, doc.shapes, vecGroups, allowSet])

  const renderShape = (s: DSLShape) => {
    // 在十六进制模式下：凡是 id 属于允许合并(base 在 allowSet) 的 lane（vX[0]/vX_0/…），直接隐藏单 lane，
    // 不再依赖收集到的 vecGroups 映射，避免 nobox 时“没 box 不合并”的情况
    if (fmtSnap.base === 'hex' && s.kind === 'rect') {
      const baseName = laneBase(s.id || '')
      if (baseName && allowSet.has(baseName)) {
        if (debugOn) dbg('[HIDE]', s.id, 'base=', baseName)
        return null
      }
    }
    const op = finalOpacity(s.id)
    if (op <= 0) return null

    switch (s.kind) {
      case 'rect': {
        const W = PX(s.w), H = PX(s.h), X = PX(s.x), Y = PX(s.y)
        return (
          <Group key={s.id} x={X} y={Y} opacity={op}>
            <Rect width={W} height={H} cornerRadius={20} fill={col(s.color)} shadowBlur={14} shadowColor="#00000022" />
            { s.text ? (
              <FmtText
                value={s.text ?? ''}
                x={0} y={0} width={W} height={H}
                align="center" vAlign="middle"
                fontSize={28}
                color="#0B1220"
                fontFamily="'Futura','STFangsong','PingFang SC','Microsoft YaHei',system-ui"
              />
            ) : null}
          </Group>
        )
      }
      case 'label': {
        const X = PX(s.x), Y = PX(s.y)
        const H = 32, padX = 14
        const W = Math.max(48, (s.text?.length ?? 0) * 9 + padX * 2)
        return (
          <Group key={s.id} x={X} y={Y} opacity={op} listening={false}>
            <Rect width={W} height={H} cornerRadius={H/2} fill="#111827" opacity={0.78} />
            <FmtText
              value={s.text}
              x={0} y={0} width={W} height={H}
              align="center" vAlign="middle"
              fontSize={16}
              color="#fff"
              fontFamily="'Futura','STFangsong','PingFang SC','Microsoft YaHei',system-ui"
            />
          </Group>
        )
      }
      case 'text': {
        const X = PX(s.x), Y = PX(s.y)
        const fs = s.size ?? 16
        const approx = s.text.length * fs * 0.6
        let x = X
        if (s.align === 'center') x = X - approx/2
        else if (s.align === 'right') x = X - approx
        return (
          <Text key={s.id} x={x} y={Y} text={s.text} fontSize={fs} fill={s.color ?? '#0f172a'}
                align="left" listening={false} opacity={op}
                fontFamily="'Futura','STFangsong','PingFang SC','Microsoft YaHei',system-ui"/>
        )
      }
      case 'group': {
        // hex 模式下隐藏 vec 的盒子（__box）
        if (fmtSnap.base === 'hex' && /__box$/.test(s.id)) return null
        const X = PX(s.x), Y = PX(s.y), W = PX(s.w), H = PX(s.h)
        return (
          <Rect
            key={s.id}
            x={X} y={Y} width={W} height={H}
            cornerRadius={18}
            stroke="#6B7280" dash={[10, 8]}
            opacity={0.35 * op}
            listening={false}
          />
        )
      }
      case 'line': {
        const pts = [PX(s.x1), PX(s.y1), PX(s.x2), PX(s.y2)]
        return <Line key={s.id} points={pts} stroke={col(s.color)} strokeWidth={s.width || 2} opacity={op}/>
      }
      case 'arrow': {
        const x1 = PX(s.x1), y1 = PX(s.y1), x2 = PX(s.x2), y2 = PX(s.y2)
        const w = s.width ?? 3
        const head = 10 + w*2
        const ang = Math.atan2(y2-y1, x2-x1)
        const hx = x2 - Math.cos(ang)*head
        const hy = y2 - Math.sin(ang)*head
        return (
          <Group key={s.id} opacity={op}>
            <Line points={[x1,y1,x2,y2]} stroke={col(s.color)} strokeWidth={w}/>
            <Line points={[
              x2, y2,
              hx - Math.sin(ang)*head*0.35, hy + Math.cos(ang)*head*0.35,
              hx + Math.sin(ang)*head*0.35, hy - Math.cos(ang)*head*0.35
            ]} closed fill={col(s.color)} />
          </Group>
        )
      }
      default: return null
    }
  }

  // 在十六进制模式下：把某个 vec 组渲染为“合并寄存器条”，并让单 lane 隐藏（见上面 renderShape）
  function renderCompactVec(g: VecGroup) {
    if (!g.lanes.length) return null

    // 盒子：优先用 __box；没有就用 lanes 的包围盒
    const box = g.box ?? (() => {
      const minX = Math.min(...g.lanes.map(l => l.x))
      const minY = Math.min(...g.lanes.map(l => l.y))
      const maxX = Math.max(...g.lanes.map(l => l.x + l.w))
      const maxY = Math.max(...g.lanes.map(l => l.y + l.h))
      return { x: minX, y: minY, w: maxX - minX, h: maxY - minY }
    })()

    const X = PX(box.x), Y = PX(box.y), W = PX(box.w), H = PX(box.h)

    // 0x0001 0002 0003 0004 → 0x0001000200030004
    const digits = fmtSnap.hexDigits
    const laneHex = g.lanes.map(l => fmt(l.text ?? '', 'hex', digits).replace(/^0x/i, ''))
    const merged = '0x' + laneHex.join('')

    // 透明度跟随 lanes（appear/disappear/blink）
    const laneOps = g.lanes.map(l => finalOpacity(l.id));
    const op = Math.max(...laneOps);
    
    // —— 调试日志 ——
    // 打印 base、step、box、合成的 hex 串、每个 lane 的不透明度以及最终 op
    if (debug) {
      // merged 变量在你函数上面已经算过：'0x' + laneHex.join('')
      // @ts-ignore
      console.info('[COMPACT]', {
        base: g.baseId,
        step: stepIdx,
        box,
        merged,
        laneIds: g.lanes.map(l => l.id),
        laneOps: laneOps.map(v => +v.toFixed(2)),
        op: +op.toFixed(2),
      });
    }
    
    if (op <= 0) return null;

    const fill = col(g.lanes[0].color || '#59E0D0')
    const fontSize = fitFontSize(merged, W, 28)

    return (
      <Group key={`${g.baseId}__compact`} x={X} y={Y} listening={false} opacity={op}>
        <Rect width={W} height={H} cornerRadius={20} fill={fill} shadowBlur={14} shadowColor="#00000022" />
        <Text
          text={merged}
          x={0} y={0} width={W} height={H}
          align="center" verticalAlign="middle"
          fontSize={fontSize} fill="#0B1220"
          listening={false}
          fontFamily="'Futura','STFangsong','PingFang SC','Microsoft YaHei',system-ui"
        />
      </Group>
    )
  }

  const Content = () => {
    const groups = doc.shapes.filter(s => s.kind==='group')
    const main   = doc.shapes.filter(s => s.kind==='rect' || s.kind==='line' || s.kind==='arrow')
    const deco   = doc.shapes.filter(s => s.kind==='label' || s.kind==='text')

    return (
      <Group x={48} y={48}>
        <Group listening={false}>{groups.map(renderShape)}</Group>
        <Group>{main.map(renderShape)}</Group>

        {/* 十六进制模式下渲染“合并寄存器条” */}
        {fmtSnap.base === 'hex' && (
          <Group listening={false}>
            {vecGroups.map(renderCompactVec)}
            {debug && vecGroups.map(g=>{
              const box = g.box ?? (() => {
                const minX = Math.min(...g.lanes.map(l => l.x));
                const minY = Math.min(...g.lanes.map(l => l.y));
                const maxX = Math.max(...g.lanes.map(l => l.x + l.w));
                const maxY = Math.max(...g.lanes.map(l => l.y + l.h));
                return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
              })();
              return (
                <Rect
                  key={`${g.baseId}__dbgbox`}
                  x={PX(box.x)} y={PX(box.y)} width={PX(box.w)} height={PX(box.h)}
                  stroke="#2563eb" dash={[6, 6]} opacity={0.35} cornerRadius={18}
                  listening={false}
                />
              );
            })}
          </Group>
        )}

        <Group listening={false}>{deco.map(renderShape)}</Group>
      </Group>
    )
  }

  return (
    <div className="canvas-root" style={{display:'flex', flexDirection:'column', height:'100%'}}>
      <div style={{position:'relative', flex:1, minHeight:0, overflow:'hidden'}}>
        {/* Step floating badge */}
        <div
          className="step-floating"
          style={{
            position:'absolute',
            left: 16,
            top: 12,
            zIndex: 11,
            background:'#1f2937',
            color:'#fff',
            borderRadius: 24,
            padding:'10px 16px',
            boxShadow:'0 8px 20px rgba(0,0,0,0.15), 0 2px 6px rgba(0,0,0,0.10)',
            border:'1px solid #0f172a1a',
            fontSize:14,
            lineHeight:1.2,
            whiteSpace:'nowrap',
            pointerEvents:'none'
          }}
        >
          <div>步骤：{Math.min(stepIdx+1, Math.max(1, doc.steps.length))}/{Math.max(doc.steps.length,1)} · {stepName || '—'}</div>
        </div>
        <div
          className="canvas-toolbar floating"
          style={{
            position: 'absolute',
            left: '50%',
            top: 12,
            transform: 'translateX(-50%)',
            zIndex: 10,
            maxWidth: 'min(96%, 1100px)',
            borderRadius: 20,
            background: '#ffffff',
            boxShadow: '0 10px 24px rgba(0,0,0,0.12), 0 2px 6px rgba(0,0,0,0.08)',
            border: '1px solid #e5e7eb',
            padding: '6px 10px',
            paddingLeft: 64,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            pointerEvents: 'auto'
          }}
        >
          {/* <div className="chip step-chip">步骤：{Math.min(stepIdx+1, Math.max(1, doc.steps.length))}/{Math.max(doc.steps.length,1)} · {stepName || '—'}</div> */}
          <button title={playing ? '暂停' : '播放'} className="btn icon" style={iconBtn} onClick={()=>{
            setPlaying(p=>{ const np = !p; if (np) stepStartRef.current = performance.now(); return np })
          }}>
            <span style={iconText}>{playing ? '⏸' : '▶'}</span>
          </button>
          <button title="上一步" className="btn icon" style={iconBtn} onClick={()=>{ setStepIdx(i=>Math.max(0,i-1)); stepStartRef.current = performance.now() }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#111827" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
          </button>
          <button title="下一步" className="btn icon" style={iconBtn} onClick={()=>{ setStepIdx(i=>Math.min((doc.steps.length||1)-1,i+1)); stepStartRef.current = performance.now() }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#111827" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </button>
          <label className="switch" title="播放速度" style={{marginLeft:8, display:'inline-flex', alignItems:'center', gap:6}}>
            <span style={iconText}>⚡</span>
            <select className="select" value={String(speed)} onChange={e=>setSpeed(Number(e.target.value))} style={{height:28}}>
              <option value="0.5">0.5×</option><option value="1">1×</option><option value="2">2×</option><option value="4">4×</option>
            </select>
          </label>
          <label className="switch" title="缩放" style={{marginLeft:8, display:'inline-flex', alignItems:'center', gap:6}}>
            <span style={iconText}>🔍</span>
            <select className="select" value={String(zoom)} onChange={e=>setZoom(parseFloat(e.target.value))} style={{height:28}}>
              <option value="0.75">75%</option><option value="1">100%</option>
              <option value="1.25">125%</option><option value="1.5">150%</option><option value="2">200%</option>
            </select>
          </label>
          <button title="复位" className="btn icon" style={{...iconBtn, marginLeft:6}} onClick={()=>setResetTick(t=>t+1)}>
            <span style={iconText}>⟲</span>
          </button>
          <button title="显示/隐藏网格" className="btn icon" style={iconBtn} onClick={()=>setShowGrid(s=>!s)}>
            <span style={iconText}>#</span>
          </button>
          <button title="切换 DSL 调试日志" className="btn icon" style={iconBtn} onClick={()=>{
            setDebugOn(v=>!v);
            if (!debugOn) clearLogs();
            dbg('--- DSL debug enabled ---')
          }}>
            <span style={iconText}>📝</span>
          </button>
          <button title="切换调试模式" className="btn icon" style={iconBtn} onClick={()=>setDebug(d=>!d)}>
            <span style={iconText}>🧪</span>
          </button>
          {/* Inline format controls */}
          <div className="format-mini" style={{display:'inline-flex', alignItems:'center', gap:6, marginLeft:8}}>
            <span className="label-muted" title="数制">⑩</span>
            <Select
              value={fmtSnap.base}
              onChange={(e)=>formatStore.setBase(e.target.value as any)}
              className="select"
            >
              <option value="dec">10 进制</option>
              <option value="hex">16 进制</option>
            </Select>
          </div>
          <div className="format-mini" style={{display:'inline-flex', alignItems:'center', gap:6}}>
            <span className="label-muted" title="Hex 位数">HEX</span>
            <Select
              value={String(fmtSnap.hexDigits)}
              onChange={(e)=>formatStore.setHexDigits(parseInt(e.target.value))}
              className="select"
            >
              <option value="2">2</option>
              <option value="4">4</option>
              <option value="8">8</option>
            </Select>
          </div>
        </div>
        <KitStage
          contentSize={{ width: 1200, height: 900 }}
          zoom={zoom}
          showGrid={showGrid}
          gridStyle={{
            spacing: 0.2,
            majorEvery: 5,
            strokeWidth: 0.5,
            color: "#EEF2F7",
            majorColor: "#E5E7EB"
          }}
        >
          <Content/>
        </KitStage>
      </div>
      <div className="canvas-logs" style={{borderTop:'1px solid #e5e7eb', background:'#fff', height:180}}>
        <div style={{display:'flex', alignItems:'center', height:36, padding:'0 8px', gap:8}}>
          <div style={{fontSize:12, fontWeight:600, color:'#0f172a'}}>Logs</div>
          <div style={{flex:1}} />
          <button className="btn" onClick={()=>clearLogs()} style={{marginLeft:6}}>清空</button>
        </div>
        <div style={{height:144, overflow:'auto', padding:'6px 10px'}}>
          {(!logs || logs.length===0) ? (
            <div style={{fontSize:12, color:'#64748b'}}>暂无日志。运行后会在此显示解析步骤 / 提示。</div>
          ) : (
            <ul style={{listStyle:'none', padding:0, margin:0, fontSize:12, color:'#334155'}}>
              {logs.map((l, i)=>(
                <li key={i} style={{display:'flex', gap:6, padding:'3px 0'}}>
                  <span style={{width:6, height:6, borderRadius:6, background:'#0ea5e9', marginTop:7}} />
                  <span style={{lineHeight:1.5}}>{l}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
