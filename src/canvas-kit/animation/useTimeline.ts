
import { useEffect, useRef, useState } from 'react'
export interface TLStep{ name:string; ms:number }
export default function useTimeline(steps:TLStep[], opts:{autoPlay?:boolean, speed?:number}={}){
  const { autoPlay=true, speed:initial=1 } = opts
  const [idx,setIdx]=useState(0)
  const [t01,setT01]=useState(0)
  const [playing,setPlaying]=useState(autoPlay)
  const [speed,setSpeed]=useState(initial)
  const ref=useRef({last:0})
  useEffect(()=>{
    let raf=0
    const tick=(ts:number)=>{
      if(!playing){ raf=requestAnimationFrame(tick); return }
      if(!ref.current.last) ref.current.last=ts
      const dt=(ts-ref.current.last)*speed; ref.current.last=ts
      const dur=steps[idx]?.ms ?? 800
      const next=Math.min(1, t01 + dt/dur); setT01(next)
      if(next>=1){
        if(idx<steps.length-1){ setIdx(idx+1); setT01(0) }
        else { setPlaying(false) }
      }
      raf=requestAnimationFrame(tick)
    }
    raf=requestAnimationFrame(tick)
    return ()=> cancelAnimationFrame(raf)
  }, [idx,playing,speed,steps,t01])
  return {
    idx, t01, playing, speed,
    play:()=>setPlaying(true),
    pause:()=>setPlaying(false),
    toggle:()=>setPlaying(p=>!p),
    setSpeed:(m:number)=>setSpeed(Math.max(.25,Math.min(4,m))),
    prev:()=>{ setIdx(i=>Math.max(0,i-1)); setT01(0) },
    next:()=>{ setIdx(i=>Math.min(steps.length-1,i+1)); setT01(0) },
    goto:(i:number)=>{ setIdx(Math.max(0,Math.min(steps.length-1,i))); setT01(0) },
    reset:()=>{ setIdx(0); setT01(0) }
  }
}
