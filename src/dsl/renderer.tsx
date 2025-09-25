import React from 'react'
import { parseDSL } from './parser'
import { BBoxBuilder } from '@/canvas-kit/bbox'
import AutoStage from '@/canvas-kit/AutoStage'
import { Block } from '@/canvas-kit/components/Block'
import { Arrow } from '@/canvas-kit/components/Arrow'

export function DSLRenderer({ source, zoom=1, resetSignal }:{ source:string; zoom?:number; resetSignal?:number }){
  const dsl = parseDSL(source)
  const u = dsl.units
  const bb = new BBoxBuilder()
  for(const c of dsl.commands){
    if(c.t==='rect'){
      bb.box(c.x*u, c.y*u, c.w*u, c.h*u)
    } else if(c.t==='line' || c.t==='arrow'){
      const minX = Math.min(c.x, c.x2)*u, minY = Math.min(c.y, c.y2)*u
      const maxX = Math.max(c.x, c.x2)*u, maxY = Math.max(c.y, c.y2)*u
      bb.box(minX, minY, maxX-minX, maxY-minY)
    }
  }
  bb.pad({left:40, right:40, top:40, bottom:40})

  return (
    <AutoStage bbox={bb.done()} zoom={zoom} fit="width" onResetSignal={resetSignal}>
      {dsl.commands.map((c,i)=>{
        if(c.t==='rect'){
          const variant = c.color==='primary' ? 'primary' : c.color==='dashed' ? 'dashed' : 'white'
          return <Block key={i} x={c.x*u} y={c.y*u} w={c.w*u} h={c.h*u} text={c.text||''} variant={variant as any} fontSize={18}/>
        } else if(c.t==='line'){
          return <Arrow key={i} x1={c.x*u} y1={c.y*u} x2={c.x2*u} y2={c.y2*u}
                        color={c.color||'#94A3B8'} width={c.width||2} label={c.text} />
        } else {
          return <Arrow key={i} x1={c.x*u} y1={c.y*u} x2={c.x2*u} y2={c.y2*u}
                        color={c.color||'#10BDB0'} width={c.width||2} label={c.text}
                        start={c.start} end={c.end}/>
        }
      })}
    </AutoStage>
  )
}
