import type { VecGroup, LaneRect, DslOverride } from './panelTypes'
import { Group, Rect, Text, Line } from '../../svg/primitives'
import { SvgStage } from '../../svg/SvgStage'
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { parseDSL, DSLDoc, DSLShape } from '../../utils/parse'
import { useApp } from '../../context'
import { Select } from "@ui/Select";
import { useFormat, fmt, formatStore } from '../../state/formatStore'
import { RightNotch } from '../nav/NavBar'

// ---- LocalStorage helpers for UI prefs ----
const PREFS_KEY = 'isaViz.canvas.prefs.v1'
const FORMAT_KEY = 'isaViz.format.v1'
function readJSON<T>(k:string): T | null {
  try { const raw = localStorage.getItem(k); return raw ? JSON.parse(raw) as T : null } catch { return null }
}
function writeJSON(k:string, v:any){ try { localStorage.setItem(k, JSON.stringify(v)) } catch {} }

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

// --- Safe DSL parse helpers ---
const EMPTY_DOC: DSLDoc = { steps: [], anims: [], shapes: [], packOn: [], packOff: [] }
function safeParseDSL(s?: string | null): DSLDoc {
  try { return s ? parseDSL(s) : EMPTY_DOC } catch { return EMPTY_DOC }
}


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
    const o = dslOverride as unknown as DslOverride | null
    if (!o) return
    if ('doc' in o && (o as any).doc) {
      const next = (o as any).doc as DSLDoc
      setDoc(next); setStepIdx(0); stepStartRef.current = performance.now(); setResetTick(t=>t+1)
      return
    }
    setDsl(('text' in o ? (o as any).text : '') ?? '')
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
  const [regWide, setRegWide] = useState(false)
  const panelWidth = regWide ? 360 : 240
  const [hotkeyOpen, setHotkeyOpen] = useState(true)
  const [toolbarVisible, setToolbarVisible] = useState(true)
  const [logsOpen, setLogsOpen] = useState(true)

  // Restore UI prefs on mount
  useEffect(()=>{
    const p = readJSON<any>(PREFS_KEY)
    if (p) {
      if (typeof p.showGrid === 'boolean') setShowGrid(!!p.showGrid)
      if (typeof p.speed === 'number') setSpeed(Math.max(0.25, Math.min(8, p.speed)))
      if (typeof p.zoom === 'number') setZoom(Math.max(0.5, Math.min(2, p.zoom)))
      if (typeof p.regWide === 'boolean') setRegWide(!!p.regWide)
      if (typeof p.toolbarVisible === 'boolean') setToolbarVisible(!!p.toolbarVisible)
      if (typeof p.hotkeyOpen === 'boolean') setHotkeyOpen(!!p.hotkeyOpen)
      if (typeof p.debugOn === 'boolean') setDebugOn(!!p.debugOn)
    }
    // restore format (base / hexDigits)
    const f = readJSON<any>(FORMAT_KEY)
    if (f) {
      if (f.base === 'dec' || f.base === 'hex') formatStore.setBase(f.base)
      if (typeof f.hexDigits === 'number' && [2,4,8].includes(f.hexDigits)) formatStore.setHexDigits(f.hexDigits)
    }
  },[])

  // Persist UI prefs when changed (debounced)
  useEffect(()=>{
    const id = setTimeout(()=>{
      writeJSON(PREFS_KEY, {
        showGrid, speed, zoom, regWide, toolbarVisible, hotkeyOpen, debugOn
      })
    }, 200)
    return ()=> clearTimeout(id)
  }, [showGrid, speed, zoom, regWide, toolbarVisible, hotkeyOpen, debugOn])

  // Persist format (base/hexDigits) when changed
  useEffect(()=>{
    writeJSON(FORMAT_KEY, { base: fmtSnap.base, hexDigits: fmtSnap.hexDigits })
  }, [fmtSnap.base, fmtSnap.hexDigits])

  // ==== Icon button styles ====
  const iconBtn: React.CSSProperties = {
    width: 36, height: 28, minWidth: 36, minHeight: 28,
    borderRadius: 8,
    display: 'inline-flex',
    alignItems: 'center', justifyContent: 'center',
    border: '1px solid #e5e7eb',
    background: '#ffffff',
    boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
    cursor: 'pointer',
    fontSize: 12,
    padding: 0,
    flex: '0 0 auto'
  }
  const iconText: React.CSSProperties = { lineHeight: '1', fontSize: 12 }
  const iconGap: React.CSSProperties = { width: 6 }

  useEffect(()=>{
    const d = safeParseDSL(dsl)
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

  // ===== 寄存器快照（用于右侧面板显示） =====
  const vectorRegs = useMemo(() => {
    // Map baseId -> lane values (按 lanes 顺序)
    const map = new Map<string, string[]>()
    vecGroups.forEach(g => {
      const vals = g.lanes.map(l => String(l.text ?? ''))
      map.set(g.baseId, vals)
    })
    return map
  }, [vecGroups])

  const scalarRegs = useMemo(() => {
    // 收集 x0..x31 等标量寄存器（从 shapes 的 text 提取）
    const map = new Map<string, string>()
    for (const s of doc.shapes) {
      if (s.kind === 'rect' && /^x\d+$/.test(s.id)) {
        map.set(s.id, String(s.text ?? ''))
      }
      // 若 DSL 用 label/text 表示 xN，也尝试兼容
      if ((s.kind === 'label' || s.kind === 'text') && /^x\d+$/.test(s.text ?? '')) {
        // 下一步可在 DSL 里约定：同坐标附近的 rect/text 联动；目前先略过
      }
    }
    return map
  }, [doc.shapes])

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
  // ========== 全局快捷键 ==========
  useEffect(() => {
    const isTypingTarget = (el: EventTarget|null) => {
      if (!(el instanceof HTMLElement)) return false
      const tag = el.tagName.toLowerCase()
      const editable = el.getAttribute('contenteditable')
      return tag === 'input' || tag === 'textarea' || tag === 'select' || editable === 'true'
    }
    const onKey = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return
      switch (e.key) {
        case ' ': // 空格 播放/暂停
          e.preventDefault()
          setPlaying(p => { const np = !p; if (np) stepStartRef.current = performance.now(); return np })
          break
        case 'ArrowLeft': // 上一步
          e.preventDefault()
          setStepIdx(i => Math.max(0, i - 1))
          stepStartRef.current = performance.now()
          break
        case 'ArrowRight': // 下一步
          e.preventDefault()
          setStepIdx(i => Math.min((doc.steps.length || 1) - 1, i + 1))
          stepStartRef.current = performance.now()
          break
        case '+':
        case '=': // 放大
          setZoom(z => Math.min(2, +(z + 0.25).toFixed(2)))
          break
        case '-': // 缩小
          setZoom(z => Math.max(0.5, +(z - 0.25).toFixed(2)))
          break
        case 'g':
        case 'G': // 网格
          setShowGrid(s => !s)
          break
        case 'r':
        case 'R': // 复位
          setResetTick(t => t + 1)
          break
        case 't':
        case 'T': // 工具条显隐
          setToolbarVisible(v => !v)
          break
        case 'h':
        case 'H': // 快捷键帮助
          setHotkeyOpen(o => !o)
          break
        case '1': setSpeed(0.5); break
        case '2': setSpeed(1); break
        case '3': setSpeed(2); break
        case '4': setSpeed(4); break
        default: break
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [doc.steps.length])
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
      <div style={{position:'relative', flex:1, minHeight:0, overflow:'visible'}}>
        <div style={{position:'absolute', top:0, right:0, zIndex:12, pointerEvents:'auto'}}>
          <RightNotch />
        </div>
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
            borderRadius: 14,
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
        {toolbarVisible && (
          <div
            className="canvas-toolbar floating"
            style={{
              position: 'absolute',
              left: '50%',
              top: 84,
              transform: 'translateX(-50%)',
              zIndex: 10,
              width: 'min(96vw, 1100px)',
              maxWidth: '70%',
              borderRadius: 24,
              background: '#ffffff',
              boxShadow: '0 10px 24px rgba(0,0,0,0.12), 0 2px 6px rgba(0,0,0,0.08)',
              border: '1px solid #e5e7eb',
              padding: '10px 14px',
              paddingLeft: 14,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 10,
              flexWrap: 'wrap',
              rowGap: 10,
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
            <label className="switch" title="播放速度" style={{marginLeft:8, display:'inline-flex', alignItems:'center', gap:6, flexShrink:0}}>
              <span style={iconText}>⚡</span>
              <select className="select" value={String(speed)} onChange={e=>setSpeed(Number(e.target.value))} style={{height:32}}>
                <option value="0.5">0.5×</option><option value="1">1×</option><option value="2">2×</option><option value="4">4×</option>
              </select>
            </label>
            <label className="switch" title="缩放" style={{marginLeft:8, display:'inline-flex', alignItems:'center', gap:6, flexShrink:0}}>
              <span style={iconText}>🔍</span>
              <select className="select" value={String(zoom)} onChange={e=>setZoom(parseFloat(e.target.value))} style={{height:32}}>
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
              setDebugOn(v=>{
                const nv = !v
                // write immediately so刷新后也记住
                writeJSON(PREFS_KEY, { showGrid, speed, zoom, regWide, toolbarVisible, hotkeyOpen, debugOn: nv })
                return nv
              });
              if (!debugOn) clearLogs();
              dbg('--- DSL debug toggled ---')
            }}>
              <span style={iconText}>📝</span>
            </button>
            <button title="切换调试模式" className="btn icon" style={iconBtn} onClick={()=>setDebug(d=>!d)}>
              <span style={iconText}>🧪</span>
            </button>
            {/* Inline format controls */}
            <div className="format-mini" style={{display:'inline-flex', alignItems:'center', gap:6, marginLeft:8, flexShrink:0}}>
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
            <div className="format-mini" style={{display:'inline-flex', alignItems:'center', gap:6, flexShrink:0}}>
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
            {/* 收起工具条按钮（图钉） */}
            <button title="隐藏工具条 (T)" className="btn icon" style={{...iconBtn, marginLeft:6}} onClick={()=>setToolbarVisible(false)}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#111827" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </button>
          </div>
        )}
        {!toolbarVisible && (
          <button
            title="显示工具条 (T)"
            onClick={()=>setToolbarVisible(true)}
            style={{
              position:'absolute',
              left:'50%',
              top: 80,
              transform:'translateX(-50%)',
              zIndex: 10,
              height: 30,
              padding:'0 12px',
              borderRadius: 8,
              border:'1px solid #e5e7eb',
              background:'#ffffff',
              boxShadow:'0 4px 12px rgba(0,0,0,0.12)',
              fontSize:12,
              cursor:'pointer'
            }}
          >工具条</button>
        )}
        <div
          className="hotkey-cheatsheet"
          style={{
            position:'absolute',
            left: 12,
            bottom: 12, // 避开底部 180px 日志
            zIndex: 9,
            background:'#ffffff',
            border:'1px solid #e5e7eb',
            borderRadius: 12,
            boxShadow:'0 8px 20px rgba(0,0,0,0.12)',
            overflow:'hidden',
            minWidth: 180,
            pointerEvents:'auto'
          }}
        >
          <div style={{display:'flex', alignItems:'center', height:30, padding:'0 8px', gap:8, borderBottom:'1px solid #eef2f7'}}>
            <div style={{fontSize:12, fontWeight:700, color:'#0f172a'}}>快捷键</div>
            <div style={{flex:1}} />
            <button
              title={hotkeyOpen ? '收起 (H)' : '展开 (H)'}
              onClick={()=>setHotkeyOpen(o=>!o)}
              style={{width:28, height:24, borderRadius:8, border:'1px solid #e5e7eb', background:'#fff', cursor:'pointer'}}
            >{hotkeyOpen ? '−' : '＋'}</button>
          </div>
          {hotkeyOpen && (
            <div style={{padding:'8px 10px', fontSize:12, color:'#334155'}}>
              <ul style={{listStyle:'none', padding:0, margin:0, display:'grid', gridTemplateColumns:'auto auto', columnGap:10, rowGap:6}}>
                <li><b>Space</b> 播放/暂停</li>
                <li><b>←/→</b> 上/下一步</li>
                <li><b>+/−</b> 缩放</li>
                <li><b>1/2/3/4</b> 0.5×/1×/2×/4×</li>
                <li><b>G</b> 网格</li>
                <li><b>R</b> 复位</li>
                <li><b>S</b> 寄存器抽屉</li>
                <li><b>T</b> 工具条显示/隐藏</li>
                <li><b>H</b> 收起/展开本卡片</li>
              </ul>
            </div>
          )}
        </div>
        {/* SVG Stage (replaces KitStage) */}
        <SvgStage zoom={zoom} showGrid={showGrid}>
          <Content />
        </SvgStage>
      </div>
      <div className="canvas-logs" style={{borderTop:'1px solid #e5e7eb', background:'#fff', height: logsOpen ? 180 : 36, transition:'height .18s ease'}}>
        <div style={{display:'flex', alignItems:'center', height:36, padding:'0 8px', gap:8}}>
          <div style={{fontSize:12, fontWeight:600, color:'#0f172a'}}>Logs</div>
          <div style={{flex:1}} />
          <button
            className="btn icon"
            title={logsOpen ? '收起日志' : '展开日志'}
            onClick={()=>setLogsOpen(o=>!o)}
            style={{width:28, height:24, borderRadius:8, padding:0, border:'1px solid #e5e7eb', background:'#fff'}}
          >
            {logsOpen ? (
              // chevron-down icon
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#111827" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            ) : (
              // chevron-up icon
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#111827" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="18 15 12 9 6 15"></polyline>
              </svg>
            )}
          </button>
          <button className="btn" onClick={()=>clearLogs()} style={{marginLeft:6}}>清空</button>
        </div>
        {logsOpen && (
          <div style={{display:'flex', height:144}}>
            {/* Left: Logs (50% or 100% when reg pane closed) */}
            <div style={{flex: '0 0 50%' , overflow:'auto', padding:'6px 10px'}}>
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
            {/* Right: Embedded Register Pane (50%) */}
            {(
              <div style={{
                flex:'0 0 50%',
                borderLeft:'1px solid #e5e7eb',
                padding:'6px 10px',
                overflow:'auto',
                fontSize:12,
                color:'#334155',
                background:'#ffffff'
              }}>
                <div style={{marginBottom:6, display:'flex', alignItems:'center', gap:8}}>
                  <div style={{fontSize:12, fontWeight:700, color:'#0f172a'}}>寄存器</div>
                  <div style={{flex:1}} />
                  <button
                    className="btn icon"
                    title={regWide ? '收窄面板' : '展开面板'}
                    style={{width:28, height:24, borderRadius:8, padding:0, border:'1px solid #e5e7eb', background:'#fff'}}
                    onClick={()=>setRegWide(w=>!w)}
                  >
                    {regWide ? (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#111827" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <polyline points="15 18 9 12 15 6"></polyline>
                      </svg>
                    ) : (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#111827" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <polyline points="9 18 15 12 9 6"></polyline>
                      </svg>
                    )}
                  </button>
                </div>
                {/* 标量寄存器 */}
                <div style={{marginBottom:10, fontWeight:600, color:'#0f172a'}}>标量（x）</div>
                {scalarRegs.size === 0 ? (
                  <div style={{color:'#64748b'}}>暂无（DSL 中未发现 xN）</div>
                ) : (
                  <ul style={{listStyle:'none', padding:0, margin:0, display:'grid', gridTemplateColumns:'1fr 1fr', gap:6}}>
                    {Array.from(scalarRegs.entries()).sort((a,b)=>parseInt(a[0].slice(1)) - parseInt(b[0].slice(1))).map(([k,v])=>(
                      <li key={k} style={{display:'flex', alignItems:'center', gap:6, border:'1px solid #e5e7eb', borderRadius:8, padding:'6px 8px', background:'#f8fafc'}}>
                        <span style={{fontWeight:700}}>{k}</span>
                        <span style={{marginLeft:'auto'}}>{fmt(v, fmtSnap.base, fmtSnap.hexDigits)}</span>
                      </li>
                    ))}
                  </ul>
                )}
                {/* 向量寄存器 */}
                <div style={{margin:'12px 0 8px', fontWeight:600, color:'#0f172a'}}>向量（v）</div>
                {vectorRegs.size === 0 ? (
                  <div style={{color:'#64748b'}}>暂无（DSL 中未发现 v 组）</div>
                ) : (
                  <ul style={{listStyle:'none', padding:0, margin:0, display:'grid', gap:8}}>
                    {Array.from(vectorRegs.entries()).sort((a,b)=>parseInt(a[0].slice(1)) - parseInt(b[0].slice(1))).map(([base, lanes])=>{
                      const merged = '0x' + lanes.map(v => fmt(v, 'hex', fmtSnap.hexDigits).replace(/^0x/i, '')).join('')
                      return (
                        <li key={base} style={{border:'1px solid #e5e7eb', borderRadius:8, padding:'6px 8px', background:'#ffffff'}}>
                          <div style={{display:'flex', alignItems:'center', gap:8}}>
                            <span style={{fontWeight:700}}>{base}</span>
                            <span style={{fontSize:11, color:'#475569', padding:'2px 6px', border:'1px solid #e5e7eb', borderRadius:999}}>VL{lanes.length}</span>
                          </div>
                          <div style={{marginTop:6, fontFamily:'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace'}}>
                            {fmtSnap.base === 'hex'
                              ? <div style={{whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>{merged}</div>
                              : <div style={{display:'grid', gridTemplateColumns:'repeat(4, minmax(0,1fr))', gap:4}}>
                                  {lanes.map((v,i)=><span key={i} style={{textAlign:'right'}}>{fmt(v, fmtSnap.base, fmtSnap.hexDigits)}</span>)}
                                </div>}
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>
            )}
          </div>
        )}
        </div>
      </div>
    )
  }
