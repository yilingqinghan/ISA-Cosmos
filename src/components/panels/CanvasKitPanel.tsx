import React, { useEffect, useMemo, useRef, useState } from 'react'
import KitStage from '../../canvas-kit/KitStage'
import { fetchDSL } from '../../utils/fetchDSL'
import { parseDSL, DSLDoc, DSLShape } from '../../utils/parse'
import { Group, Rect, Text, Line } from 'react-konva'
import { useApp } from '../../context'
import Axes from '../../canvas-kit/components/Axes'

const PX = (u: number) => u * 96
const COLOR: Record<string,string> = {
  lightgray:'#F4F6FA', teal:'#59E0D0', black:'#0B1220',
  '#0EA5E9':'#0EA5E9', '#22d3ee':'#22d3ee', '#111827':'#111827', '#94a3b8':'#94a3b8'
}
const col = (c?:string) => (c && COLOR[c]? COLOR[c] : (c || '#94a3b8'))

export default function CanvasKitPanel() {
  const { arch, opcode, form } = useApp()
  const [dsl, setDsl] = useState('')
  const [doc, setDoc] = useState<DSLDoc>({ steps:[], shapes:[], anims:[] })
  const [stepIdx, setStepIdx] = useState(0)
  const [zoom, setZoom] = useState(1)
  const [resetTick, setResetTick] = useState(0)
  const [showAxes, setShowAxes] = useState(false)

  // 播放控制
  const [playing, setPlaying] = useState(true)
  const [speed, setSpeed] = useState(1)   // 0.5/1/2/4
  const STEP_MS = 1600
  const stepStartRef = useRef<number>(performance.now())

  // 用于驱动 blink 的逐帧重渲染
  const [clock, setClock] = useState(0)

  useEffect(()=>{ fetchDSL({arch,opcode,form}).then(r=>setDsl(r.text)) },[arch,opcode,form])

  useEffect(()=>{
    const d = parseDSL(dsl)
    setDoc(d)
    setStepIdx(0)
    stepStartRef.current = performance.now()
    setResetTick(t=>t+1)
  },[dsl])

  // appear/disappear 索引
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

  // blink 索引
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

  // RAF：驱动自动播放 + 每帧刷新（blink 需要）
  useEffect(()=>{
    let raf = 0
    const loop = (t:number)=>{
      setClock(t) // 触发一次轻量重渲染，opacity 会跟时间变化
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

  // 尺寸自适配
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

  const isVisibleBase = (id:string) => {
    const ap = appearAt.has(id) ? appearAt.get(id)! : -1
    const dp = disappearAt.has(id) ? disappearAt.get(id)! : Infinity
    return stepIdx >= ap && stepIdx < dp
  }

  // 结合 blink 的透明度
  const opacityOf = (id:string, _clock?: number): number => {
    if (!isVisibleBase(id)) return 0
    const cfgs = blinkMap.get(id)
    if (!cfgs || cfgs.length===0) return 1
    const cfg = cfgs.find(x=>x.step===stepIdx)
    if (!cfg) return 1
    const now = performance.now()
    const elapsed = (now - stepStartRef.current) * speed
    const k = Math.floor(elapsed / cfg.interval)
    if (k >= cfg.times*2) return 1
    return (k % 2 === 0) ? 1 : 0.25  // 半透明更自然
  }

  const renderShape = (s: DSLShape) => {
    const op = opacityOf(s.id, clock)
    if (op <= 0) return null

    switch (s.kind) {
      case 'rect': {
        const W = PX(s.w), H = PX(s.h), X = PX(s.x), Y = PX(s.y)
        const fontSize = 28
        return (
          <Group key={s.id} x={X} y={Y} opacity={op}>
            <Rect width={W} height={H} cornerRadius={20} fill={col(s.color)} shadowBlur={14} shadowColor="#00000022" />
            {s.text ? (
              <Text
                text={s.text}
                x={0} y={0} width={W} height={H}
                align="center" verticalAlign="middle"
                fontSize={fontSize} fontStyle="600" fill="#0B1220"
                listening={false}
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
            <Text
              text={s.text}
              x={0} y={0} width={W} height={H}
              align="center" verticalAlign="middle"
              fontSize={fontSize} fontStyle="600" fill="#fff"
              fontFamily="'Futura','STFangsong','PingFang SC','Microsoft YaHei',system-ui"
              listening={false}
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
        const X = PX(s.x), Y = PX(s.y), W = PX(s.w), H = PX(s.h)
        return <Rect key={s.id} x={X} y={Y} width={W} height={H} cornerRadius={18}
                     stroke="#6B7280" dash={[10,8]} opacity={0.35*op} listening={false}/>
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

  const Content = () => {
    const groups = doc.shapes.filter(s => s.kind==='group')
    const main   = doc.shapes.filter(s => s.kind==='rect' || s.kind==='line' || s.kind==='arrow')
    const deco   = doc.shapes.filter(s => s.kind==='label' || s.kind==='text')
    return (
      <Group x={48} y={48}>
        <Axes show={showAxes} widthU={worldU.w} heightU={worldU.h}/>
        <Group listening={false}>{groups.map(renderShape)}</Group>
        <Group>{main.map(renderShape)}</Group>
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
        <label className="switch" style={{marginLeft:8}}>
          <input type="checkbox" checked={showAxes} onChange={e=>setShowAxes(e.target.checked)} />
          <span>坐标轴</span>
        </label>
      </div>

      <KitStage contentSize={contentSize} autoFit padding={48} pannable zoom={zoom} onResetSignal={resetTick}>
        <Content/>
      </KitStage>
    </div>
  )
}
