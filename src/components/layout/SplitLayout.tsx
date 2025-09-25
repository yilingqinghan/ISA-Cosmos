
import React, { useRef, useState, useEffect, ReactNode } from 'react'
interface Props { columns:[number,number,number]; minPx:[number,number,number]; children:[ReactNode,ReactNode,ReactNode] }
export default function SplitLayout({columns, minPx, children}:Props){
  const [cols, setCols] = useState(columns)
  const ref = useRef<HTMLDivElement|null>(null)
  useEffect(()=>{
    let dragging: 'a'|'b'|null = null
    const onUp = ()=> dragging=null
    const onDownA = ()=> dragging='a'
    const onDownB = ()=> dragging='b'
    const grips = ref.current?.querySelectorAll('[data-grip]')
    grips?.[0]?.addEventListener('mousedown', onDownA)
    grips?.[1]?.addEventListener('mousedown', onDownB)
    const onMove=(e:MouseEvent)=>{
      if(!dragging || !ref.current) return
      const rect = ref.current.getBoundingClientRect()
      const total = rect.width; const px = e.clientX - rect.left
      if(dragging==='a'){
        const c0 = Math.max(minPx[0], px)/total*100
        const c1 = Math.max(minPx[1], (cols[0]+cols[1]) - c0)
        setCols([c0, c1, 100 - c0 - c1])
      }else{
        const leftPx = total*(cols[0]/100)
        const c1px = Math.max(minPx[1], px - leftPx)
        const c1 = c1px/total*100
        setCols([cols[0], c1, 100 - cols[0] - c1])
      }
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return ()=>{
      grips?.[0]?.removeEventListener('mousedown', onDownA)
      grips?.[1]?.removeEventListener('mousedown', onDownB)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [cols, minPx])
  return (
    <div ref={ref} style={{display:'grid', gridTemplateColumns:`${cols[0]}% 6px ${cols[1]}% 6px ${cols[2]}%`,
      gridTemplateRows:'minmax(0,1fr)', height:'100vh', minHeight:0}} className="app-root">
      <div className="panel panel--left">{children[0]}</div>
      <div data-grip style={{cursor:'col-resize', background:'linear-gradient(180deg,#0e141d0a,#0f18240a)',
        borderLeft:'1px solid var(--border)', borderRight:'1px solid var(--border)'}}/>
      <div className="panel panel--middle">{children[1]}</div>
      <div data-grip style={{cursor:'col-resize', background:'linear-gradient(180deg,#0e141d0a,#0f18240a)',
        borderLeft:'1px solid var(--border)', borderRight:'1px solid var(--border)'}}/>
      <div className="panel panel--right">{children[2]}</div>
    </div>
  )
}
