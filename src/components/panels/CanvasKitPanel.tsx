import React, { useEffect, useMemo, useRef, useState } from 'react'
import KitStage from '../../canvas-kit/KitStage'
import { fetchDSL } from '../../utils/fetchDSL'
import { parseDSL, DSLDoc, DSLShape } from '../../utils/parse'
import { Group, Rect, Text, Line } from 'react-konva'
import { useApp } from '../../context'
import { Toolbar, ToolbarGroup } from '@ui/Toolbar';
import { Select } from "@ui/Select";
import { useFormat, fmt, formatStore } from '../../state/formatStore'
// 追加：把一组 v1[0..3] / v2[0..3] 等 lane 识别出来
type LaneRect = { id:string; x:number; y:number; w:number; h:number; text?:string; color?:string }
type VecGroup = { baseId:string; lanes: LaneRect[]; box?: {x:number;y:number;w:number;h:number} }

function collectVecGroups(shapes: DSLShape[]): VecGroup[] {
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
    if (s.kind !== 'rect') continue

    let baseId: string | null = null
    // 支持两种命名：v1[0] / v1_0
    const m = s.id.match(/^([a-zA-Z_]\w*)$begin:math:display$(\\d+)$end:math:display$$/) || s.id.match(/^([a-zA-Z_]\w*)[_-](\d+)$/)
    if (m) {
      baseId = m[1]
    } else {
      // 没命中命名规则：用几何包含（中心点落在哪个 __box 内）
      const cx = s.x + s.w / 2, cy = s.y + s.h / 2
      for (const [bid, b] of Object.entries(boxes)) {
        if (cx >= b.x && cx <= b.x + b.w && cy >= b.y && cy <= b.y + b.h) { baseId = bid; break }
      }
    }

    if (!baseId) continue
    const g = map.get(baseId) ?? { baseId, lanes: [], box: boxes[baseId] }
    g.lanes.push({ id: s.id, x: s.x, y: s.y, w: s.w, h: s.h, text: s.text, color: s.color })
    map.set(baseId, g)
  }

  // 3) 排序输出
  const groups: VecGroup[] = []
  map.forEach((g) => {
    g.lanes.sort((a, b) => a.x - b.x)
    groups.push(g)
  })
  return groups
}

// 根据可用宽度做简单自适应字号
function fitFontSize(txt: string, widthPx: number, maxSize=28, pad=24) {
  const approxChar = 0.58;              // 英数大致宽度系数
  const need = txt.length * maxSize * approxChar + pad * 2
  if (need <= widthPx) return maxSize
  // 按比例缩小
  const s = Math.max(12, Math.floor((widthPx - pad*2) / (txt.length * approxChar)))
  return Math.min(maxSize, s)
}


const PX = (u: number) => u * 96
const COLOR: Record<string,string> = {
  lightgray:'#F4F6FA', teal:'#59E0D0', black:'#0B1220',
  '#0EA5E9':'#0EA5E9', '#22d3ee':'#22d3ee', '#111827':'#111827', '#94a3b8':'#94a3b8'
}
const col = (c?:string) => (c && COLOR[c]? COLOR[c] : (c || '#94a3b8'))

// === 动画参数 ===
const STEP_MS = 1600
const APPEAR_MS = 420
const DISAPPEAR_MS = 320
const BLINK_MIN = 0.55      // 呼吸最低不透明度
const BLINK_MAX = 1.00
// 仅渲染一段 Konva Text，且只会在 base/sew 变更时自身更新
function FmtText({
  value,
  x, y, width, height,
  align = 'center' as 'left'|'center'|'right',
  vAlign = 'middle' as 'top'|'middle'|'bottom',
  fontSize = 28,
  color = '#0B1220',
  // 可传自定义字体；默认用你的 Futura + 华文仿宋
  fontFamily = "'Futura','STFangsong','PingFang SC','Microsoft YaHei',system-ui",
}: {
  value: string | number
  x: number; y: number; width: number; height: number
  align?: 'left'|'center'|'right'
  vAlign?: 'top'|'middle'|'bottom'
  fontSize?: number; color?: string
  fontFamily?: string
}) {
  const snap = useFormat() // { base, hexDigits }
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
  const { arch, opcode, form } = useApp()
  const [dsl, setDsl] = useState('')
  const [doc, setDoc] = useState<DSLDoc>({ steps:[], shapes:[], anims:[] })
  const [stepIdx, setStepIdx] = useState(0)
  const [zoom, setZoom] = useState(1)
  const [resetTick, setResetTick] = useState(0)
  const fmtSnap = useFormat()

  const [playing, setPlaying] = useState(true)
  const [speed, setSpeed] = useState(1)
  const stepStartRef = useRef<number>(performance.now())
  const [clock, setClock] = useState(0)

  useEffect(()=>{ fetchDSL({arch,opcode,form}).then(r=>setDsl(r.text)) },[arch,opcode,form])
  useEffect(()=>{
    const d = parseDSL(dsl)
    setDoc(d); setStepIdx(0); stepStartRef.current = performance.now(); setResetTick(t=>t+1)
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

  // RAF 驱动自动播放与平滑动画
  useEffect(()=>{
    let raf = 0
    const loop = (t:number)=>{
      setClock(t)
      if (playing && doc.steps.length>0) {
        const elapsed = (t - stepStartRef.current) * speed
        if (elapsed >= STEP_MS) {
          setStepIdx(i=>{
            const n = Math.min(doc.steps.length-1, i+1)
            if (n!==i) stepStartRef.current = t
            return n
          })
        }
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return ()=>cancelAnimationFrame(raf)
  },[playing, speed, doc.steps.length])

  const stepName = doc.steps[stepIdx]?.name ?? ''
  const vecGroups = useMemo(()=>collectVecGroups(doc.shapes), [doc.shapes])

  // 内容尺寸估计（像素）
  const contentSize = useMemo(()=>{
    if(!doc.shapes.length) return { width: 1200, height: 800 }
    let maxX=0, maxY=0
    for(const s of doc.shapes){
      if(s.kind==='rect'||s.kind==='group'){ maxX=Math.max(maxX,PX(s.x+s.w)); maxY=Math.max(maxY,PX(s.y+s.h)) }
      else if(s.kind==='line'||s.kind==='arrow'){ maxX=Math.max(maxX,PX(Math.max(s.x1,s.x2))); maxY=Math.max(maxY,PX(Math.max(s.y1,s.y2))) }
      else if(s.kind==='label'||s.kind==='text'){ maxX=Math.max(maxX,PX(s.x)+400); maxY=Math.max(maxY,PX(s.y)+80) }
    }
    return { width: Math.max(900, maxX+120), height: Math.max(600, maxY+120) }
  },[doc])

  const worldU = useMemo(()=>{
    if(!doc.shapes.length) return { w: 10, h: 7 }
    let w=0,h=0
    for(const s of doc.shapes){
      if(s.kind==='rect'||s.kind==='group'){ w=Math.max(w,s.x+s.w); h=Math.max(h,s.y+s.h) }
      else if(s.kind==='line'||s.kind==='arrow'){ w=Math.max(w,Math.max(s.x1,s.x2)); h=Math.max(h,Math.max(s.y1,s.y2)) }
      else if(s.kind==='label'||s.kind==='text'){ w=Math.max(w,s.x+4); h=Math.max(h,s.y+1) }
    }
    return { w: Math.max(9,w+1), h: Math.max(6,h+1) }
  },[doc])

  // —— 过渡函数 —— //
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
    // 余弦缓动波形（呼吸灯）：0..1..0
    const local = (elapsed % cfg.interval) / cfg.interval
    const wave = 0.5 - 0.5 * Math.cos(local * Math.PI * 2) // 0~1~0
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
  const laneIdToVec = useMemo(()=>{
    const map = new Map<string,string>()
    vecGroups.forEach(g => g.lanes.forEach(l => map.set(l.id, g.baseId)))
    return map
  },[vecGroups])

  const renderShape = (s: DSLShape) => {
    if (fmtSnap.base === 'hex' && s.kind === 'rect' && laneIdToVec.has(s.id)) {
      return null
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
        const H = 32, padX = 14, fontSize = 16
        const W = Math.max(48, s.text.length * 9 + padX * 2)
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

    // 订阅数制（沿用你前面做的 formatStore/useFormat）

  // 收集 vec 组（v1[0..3]、v2[0..3]……）

  // 在十六进制模式下：把某个 vec 组渲染为“合并寄存器条”，并让单 lane 隐藏
  function renderCompactVec(g: VecGroup) {
    if (!g.lanes.length) return null
  
    // 盒子：优先用 __box，缺省用 lanes 的包围盒
    const box = g.box ?? (() => {
      const minX = Math.min(...g.lanes.map(l => l.x))
      const minY = Math.min(...g.lanes.map(l => l.y))
      const maxX = Math.max(...g.lanes.map(l => l.x + l.w))
      const maxY = Math.max(...g.lanes.map(l => l.y + l.h))
      return { x: minX, y: minY, w: maxX - minX, h: maxY - minY }
    })()
  
    const X = PX(box.x), Y = PX(box.y), W = PX(box.w), H = PX(box.h)
  
    // 连续拼接：0x0001 0002 0003 0004 -> 0x0001000200030004
    const digits = fmtSnap.hexDigits
    const laneHex = g.lanes.map(l => fmt(l.text ?? '', 'hex', digits).replace(/^0x/i, ''))
    const merged = '0x' + laneHex.join('')
  
    // 透明度 = lanes 的平均透明度（跟随 appear/disappear/blink）
    const op = g.lanes.map(l => finalOpacity(l.id)).reduce((a, b) => a + b, 0) / g.lanes.length
    if (op <= 0) return null
  
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
          </Group>
        )}
  
        <Group listening={false}>{deco.map(renderShape)}</Group>
      </Group>
    )
  }
  

  return (
    <div className="canvas-root">
      <div className="canvas-toolbar">
        <div className="chip step-chip">步骤：{Math.min(stepIdx+1, Math.max(1, doc.steps.length))}/{Math.max(doc.steps.length,1)} · {stepName || '—'}</div>

        <button className="btn" onClick={()=>{
          setPlaying(p=>{ const np = !p; if (np) stepStartRef.current = performance.now(); return np })
        }}>{playing ? '暂停' : '播放'}</button>

        <button className="btn" onClick={()=>{ setStepIdx(i=>Math.max(0,i-1)); stepStartRef.current = performance.now() }}>上一步</button>
        <button className="btn" onClick={()=>{ setStepIdx(i=>Math.min((doc.steps.length||1)-1,i+1)); stepStartRef.current = performance.now() }}>下一步</button>

        <label className="switch" style={{marginLeft:8}}>
          <span style={{marginRight:6,color:'#475569'}}>速度</span>
          <select className="select" value={String(speed)} onChange={e=>setSpeed(Number(e.target.value))}>
            <option value="0.5">0.5×</option><option value="1">1×</option><option value="2">2×</option><option value="4">4×</option>
          </select>
        </label>

        <label className="switch" style={{marginLeft:8}}>
          <span style={{marginRight:6,color:'#475569'}}>缩放</span>
          <select className="select" value={String(zoom)} onChange={e=>setZoom(parseFloat(e.target.value))}>
            <option value="0.75">75%</option><option value="1">100%</option>
            <option value="1.25">125%</option><option value="1.5">150%</option><option value="2">200%</option>
          </select>
        </label>

        <button className="btn" onClick={()=>setResetTick(t=>t+1)} style={{marginLeft:6}}>复位</button>
        <button className="btn" onClick={()=>setShowGrid(s=>!s)}>坐标</button> 
        <Toolbar floating>
          <ToolbarGroup>
            <span className="label-muted">数制</span>
            <Select
              value={fmtSnap.base}
              onChange={(e)=>formatStore.setBase(e.target.value as any)}
              className="select"
            >
              <option value="dec">10 进制</option>
              <option value="hex">16 进制</option>
            </Select>

            <span className="label-muted">Hex 宽度</span>
            <Select
              value={String(fmtSnap.hexDigits)}
              onChange={(e)=>formatStore.setHexDigits(parseInt(e.target.value))}
              className="select"
            >
              <option value="2">2</option>
              <option value="4">4</option>    {/* 默认：0x0001 */}
              <option value="8">8</option>
            </Select>
          </ToolbarGroup>
        </Toolbar>
      </div>

      <KitStage
        contentSize={{ width: 1200, height: 900 }}
        zoom={zoom}
        showGrid={showGrid}
        gridStyle={{
          spacing: 0.2,      // 每格 5 条细网格
          majorEvery: 5,     // 每 5 条一条主网格 → 每格 1 条主网格
          strokeWidth: 0.5,
          color: "#EEF2F7",  // 细网格
          majorColor: "#E5E7EB" // 主网格
        }}
      >
        <Content/>
        </KitStage>
    </div>
  )
}
