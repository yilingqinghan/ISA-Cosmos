import React, { useContext, useMemo, useState, useEffect } from 'react'
import KitStage, { BBox } from '../../canvas-kit/KitStage'
import Block from '../../canvas-kit/components/Block'
import Arrow from '../../canvas-kit/components/Arrow'
import DottedGroup from '../../canvas-kit/components/DottedGroup'
import StepLabel from '../../canvas-kit/components/StepLabel'
import { parseDSL } from '../../utils/parse'
import useTimeline from '../../canvas-kit/animation/useTimeline'
import { Button } from '../../ui/Button'
import { Select } from '../../ui/Select'
import { AppCtx } from '../../context'
import { CKTheme } from '../../canvas-kit/theme'
import { Group } from 'react-konva'

const UNIT = 72
const DIM_OPACITY = 0.35

function useTicker(enabled:boolean){
  const [,setTick] = useState(0)
  useEffect(()=>{
    if(!enabled) return
    let raf:number
    const loop=()=>{ setTick(t=> (t+1)%1_000_000); raf=requestAnimationFrame(loop) }
    raf=requestAnimationFrame(loop)
    return ()=> cancelAnimationFrame(raf)
  }, [enabled])
}

export default function CanvasKitPanel(){
  const { dsl, steps: stepMeta, controls } = useContext(AppCtx)
  const [zoom,setZoom]=useState(1)
  const [reset,setReset]=useState(0)

  const doc = useMemo(()=> parseDSL(dsl), [dsl])
  const steps = stepMeta.length ? stepMeta : doc.steps
  const tl = useTimeline(steps.map(s=>({name:s.name, ms:900})), { autoPlay:true, speed:controls.speed })

  // 步骤索引映射
  const idxByStepId = useMemo(
    ()=> new Map<string,number>(steps.map((s,i)=>[s.id,i])),
    [steps]
  )

  // 计算首/末步
  const firstStep = (id:string)=>{
    const ap = doc.anims.find(a=>a.kind==='appear' && a.id===id) as any
    return ap ? (idxByStepId.get(ap.stepId) ?? 0) : 0
  }
  const lastStep = (id:string)=>{
    const dp = doc.anims.find(a=>a.kind==='disappear' && a.id===id) as any
    return dp ? (idxByStepId.get(dp.stepId) ?? Number.POSITIVE_INFINITY) : Number.POSITIVE_INFINITY
  }

  // 是否需要驱动 raf（有闪烁或正在播放）
  const hasBlink = useMemo(()=> doc.anims.some(a=>a.kind==='blink'), [doc])
  useTicker(tl.playing || hasBlink)

  const blinkOpacity = (id:string)=>{
    const b = doc.anims.find(a=>a.kind==='blink' && a.id===id) as any
    if(!b) return 1
    const si = idxByStepId.get(b.stepId) ?? 0
    if(tl.idx < si) return 1
    const period = b.period || 600
    // 0.6 ~ 1.0 之间脉冲
    return 0.6 + 0.4 * (0.5 + 0.5 * Math.sin((performance.now()%period)/period * Math.PI*2))
  }

  // 可见性 + “新出现/历史降噪”
  const visibility = (id:string)=>{
    const f = firstStep(id), l = lastStep(id)
    if(tl.idx < f || tl.idx >= l) return { visible:false, fresh:false }
    return { visible:true, fresh: tl.idx === f }
  }

  // 计算 bbox
  const bbox:BBox = useMemo(()=>{
    let minX=1e9, minY=1e9, maxX=-1e9, maxY=-1e9
    const put=(x:number,y:number,w:number,h:number)=>{ minX=Math.min(minX,x); minY=Math.min(minY,y); maxX=Math.max(maxX,x+w); maxY=Math.max(maxY,y+h) }
    for(const s of doc.shapes){
      if(s.kind==='rect') put(s.x*UNIT, s.y*UNIT, s.w*UNIT, s.h*UNIT)
      else if(s.kind==='group') put(s.x*UNIT, s.y*UNIT, s.w*UNIT, s.h*UNIT)
      else if(s.kind==='line' || s.kind==='arrow'){
        put(Math.min(s.x1,s.x2)*UNIT, Math.min(s.y1,s.y2)*UNIT, Math.abs(s.x2-s.x1)*UNIT, Math.abs(s.y2-s.y1)*UNIT)
      } else if(s.kind==='label') {
        put(s.x*UNIT, s.y*UNIT, 70, 30)
      }
    }
    if(minX===1e9){ minX=0; minY=0; maxX=800; maxY=600 }
    minX-=120; maxX+=120; minY-=40; maxY+=60
    return {minX,minY,maxX,maxY}
  }, [doc])

  return (
    <div className="panel__body canvas-root">
      {/* 步骤标题（HTML） */}
      <div style={{ position:'absolute', left:12, top:10, zIndex:6,
        fontFamily: CKTheme.font.zh, fontSize: 14, color: '#0f172a' }}>
        {steps[tl.idx]?.name ?? ''}
      </div>

      <KitStage
        bbox={bbox}
        zoom={zoom}
        fit="width"
        resetSignal={reset}
        safeInsets={{ top: 56, right: 12, bottom: 12, left: 12 }}
      >
        {doc.shapes.map((s)=>{
          const vis = visibility(s.id)
          if(!vis.visible) return null
          const baseOpacity = vis.fresh ? 1 : DIM_OPACITY
          const blink = blinkOpacity(s.id)
          const opacity = Math.max(0, Math.min(1, baseOpacity * blink))

          if(s.kind==='rect'){
            const variant = (s.color && s.color.toLowerCase()==='lightgray') ? 'white' : 'primary'
            return (
              <Group key={s.id} opacity={opacity}>
                <Block
                  x={s.x*UNIT} y={s.y*UNIT}
                  w={s.w*UNIT} h={s.h*UNIT}
                  text={s.text}
                  variant={variant as any}
                  fontSize={20}
                  active={vis.fresh}  // ★ 当前步新出现 → 高亮描边
                />
              </Group>
            )
          }else if(s.kind==='group'){
            return (
              <Group key={s.id} opacity={opacity}>
                <DottedGroup x={s.x*UNIT} y={s.y*UNIT} w={s.w*UNIT} h={s.h*UNIT}/>
              </Group>
            )
          }else if(s.kind==='label'){
            return (
              <Group key={s.id} opacity={opacity}>
                <StepLabel x={s.x*UNIT} y={s.y*UNIT} text={s.text}/>
              </Group>
            )
          }else if(s.kind==='line'){
            return (
              <Group key={s.id} opacity={opacity}>
                <Arrow x1={s.x1*UNIT} y1={s.y1*UNIT} x2={s.x2*UNIT} y2={s.y2*UNIT} color={s.color||'#0f172a'} width={s.width||2}/>
              </Group>
            )
          }else if(s.kind==='arrow'){
            return (
              <Group key={s.id} opacity={opacity}>
                <Arrow x1={s.x1*UNIT} y1={s.y1*UNIT} x2={s.x2*UNIT} y2={s.y2*UNIT} color={s.color||'#10BDB0'} width={s.width||2.5}/>
              </Group>
            )
          }
          return null
        })}
      </KitStage>

      <div className="canvas-toolbar">
        <span className="badge">步骤：{tl.idx+1}/{Math.max(steps.length,1)}</span>
        <Button onClick={()=>tl.prev()}>上一步</Button>
        <Button onClick={()=>tl.next()}>下一步</Button>
        <Button onClick={()=>tl.toggle()}>{tl.playing?'暂停':'继续'}</Button>
        <span className="label-muted">速度</span>
        <Select value={String(tl.speed)} onChange={(e)=>tl.setSpeed(parseFloat(e.target.value))}>
          <option value="0.5">0.5x</option><option value="1">1x</option>
          <option value="1.5">1.5x</option><option value="2">2x</option>
        </Select>
        <span className="label-muted">倍率</span>
        <Select value={String(zoom)} onChange={e=>setZoom(parseFloat(e.target.value))}>
          <option value="0.5">50%</option><option value="0.75">75%</option>
          <option value="1">100%</option><option value="1.25">125%</option>
          <option value="1.5">150%</option><option value="2">200%</option>
        </Select>
        <Button onClick={()=>setReset(s=>s+1)}>复位</Button>
      </div>
    </div>
  )
}