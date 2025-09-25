import React, { useEffect, useRef, useState } from 'react'
import { Stage, Layer, Group, Shape, Rect as KRect } from 'react-konva'
import { CKTheme } from './theme'

export type BBox = { minX:number; minY:number; maxX:number; maxY:number }
export function sizeOf(b:BBox){ return { w: b.maxX - b.minX, h: b.maxY - b.minY } }

type FitMode = 'width' | 'height' | 'contain'
type Insets = { top:number; right:number; bottom:number; left:number }

export default function KitStage({
  bbox, zoom, fit='width', padding=24, children, resetSignal,
  safeInsets = { top:0, right:0, bottom:0, left:0 },
}:{
  bbox:BBox; zoom:number; fit?:FitMode; padding?:number; children:React.ReactNode;
  resetSignal?:number; safeInsets?:Insets;
}){
  const ref = useRef<HTMLDivElement|null>(null)
  const [w,setW]=useState(1)
  const [h,setH]=useState(1)
  const [pos,setPos]=useState({x:0,y:0})

  // 安全的 ResizeObserver
  useEffect(()=>{
    const el = ref.current
    if(!el) return
    const apply = (node:HTMLElement) => {
      setW(Math.max(1, node.clientWidth))
      setH(Math.max(1, node.clientHeight))
    }
    apply(el)
    const ro = new ResizeObserver(e=>{
      const t = (e[0]?.target ?? ref.current) as HTMLElement | null
      if(t) apply(t)
    })
    ro.observe(el)
    return ()=>ro.disconnect()
  }, [])

  // 禁用手势缩放
  useEffect(()=>{
    const el = ref.current; if(!el) return
    const prevent=(e:Event)=>e.preventDefault()
    el.addEventListener('wheel',prevent,{passive:false})
    el.addEventListener('gesturestart',prevent as any,{passive:false})
    el.addEventListener('gesturechange',prevent as any,{passive:false})
    el.addEventListener('gestureend',prevent as any,{passive:false})
    return ()=>{
      el.removeEventListener('wheel',prevent)
      el.removeEventListener('gesturestart',prevent as any)
      el.removeEventListener('gesturechange',prevent as any)
      el.removeEventListener('gestureend',prevent as any)
    }
  }, [])

  // —— 关键：扣除安全边距后的可用宽高
  const innerW = Math.max(1, w - safeInsets.left - safeInsets.right)
  const innerH = Math.max(1, h - safeInsets.top  - safeInsets.bottom)

  const s = sizeOf(bbox)
  const sx = (innerW - padding*2) / s.w
  const sy = (innerH - padding*2) / s.h
  const base = fit==='width' ? sx : fit==='height' ? sy : Math.min(sx, sy)
  const scale = base * zoom

  // 原点偏移：先从左/上 insets 开始，再做居中，最后叠加拖拽偏移
  const ox = safeInsets.left + (innerW - s.w*base)/2 - bbox.minX*base + pos.x
  const oy = safeInsets.top  + (innerH - s.h*base)/2 - bbox.minY*base + pos.y

  const rRef = useRef(resetSignal)
  useEffect(()=>{
    if(rRef.current!==resetSignal){ rRef.current=resetSignal; setPos({x:0,y:0}) }
  },[resetSignal])

  return (
    <div ref={ref} className="ck-stage" style={{ position: 'absolute', inset: 0 }}>
      <Stage width={w} height={h}>
        <Layer listening={false}>
          <KRect x={0} y={0} width={w} height={h} fill="transparent" />
          <Grid w={w} h={h}/>
        </Layer>
        <Layer>
          <Group
            x={ox} y={oy}
            scaleX={scale} scaleY={scale}
            draggable
            onDragMove={e=>{
              const p=e.target.position()
              setPos({
                x: p.x - (safeInsets.left + (innerW - s.w*base)/2 - bbox.minX*base),
                y: p.y - (safeInsets.top  + (innerH - s.h*base)/2 - bbox.minY*base),
              })
            }}
          >
            {children}
          </Group>
        </Layer>
      </Stage>
    </div>
  )
}

function Grid({w,h}:{w:number;h:number}){
  const g=CKTheme.grid
  return (
    <Shape listening={false} sceneFunc={(ctx,shape)=>{
      ctx.fillStyle=g.color; ctx.globalAlpha=.55
      for(let x=0;x<=w;x+=g.spacing){
        for(let y=0;y<=h;y+=g.spacing){
          ctx.beginPath(); ctx.arc(x,y,g.dotSize,0,Math.PI*2); ctx.fill()
        }
      }
      ctx.globalAlpha=1; ctx.fillStrokeShape(shape)
    }}/>
  )
}