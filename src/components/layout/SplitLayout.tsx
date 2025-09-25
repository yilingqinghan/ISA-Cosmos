import { useRef, useState, useEffect, ReactNode } from 'react'

interface Props {
  columns: [number, number, number]
  minPx: [number, number, number]
  children: [ReactNode, ReactNode, ReactNode]
}

export function SplitLayout({ columns, minPx, children }: Props) {
  const [cols, setCols] = useState(columns)
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    function onUp(){ dragging=null }
    function onMove(e: MouseEvent){
      if(!dragging || !containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const total = rect.width
      const px = e.clientX - rect.left
      if (dragging === 'a') {
        const c0 = Math.max(minPx[0], px) / total * 100
        const c1 = Math.max(minPx[1], (cols[0] + cols[1]) - c0)
        setCols([c0, c1, 100 - c0 - c1])
      } else if (dragging === 'b') {
        const leftPx = total * (cols[0]/100)
        const c1px = Math.max(minPx[1], px - leftPx)
        const c1 = c1px / total * 100
        setCols([cols[0], c1, 100 - cols[0] - c1])
      }
    }
    window.addEventListener('mouseup', onUp)
    window.addEventListener('mousemove', onMove)
    return () => {
      window.removeEventListener('mouseup', onUp)
      window.removeEventListener('mousemove', onMove)
    }
  }, [cols, minPx])

  let dragging: 'a' | 'b' | null = null

  return (
    <div
      ref={containerRef}
      style={{
        display:'grid',
        gridTemplateColumns:`${cols[0]}% 6px ${cols[1]}% 6px ${cols[2]}%`,
        /** ★ 关键：让唯一一行占满容器，并允许收缩，否则会按内容高度 ~300px */
        gridTemplateRows: 'minmax(0, 1fr)',
        height:'100vh',
        minHeight:0
      }}
    >
      <div className="split-pane">{children[0]}</div>
      <Grip onDown={() => dragging='a'} />
      <div className="split-pane">{children[1]}</div>
      <Grip onDown={() => dragging='b'} />
      <div className="split-pane">{children[2]}</div>
    </div>
  )
}

function Grip({ onDown }: { onDown: () => void }) {
  return (
    <div
      onMouseDown={onDown}
      style={{
        cursor:'col-resize',
        background:'linear-gradient(180deg, #0e141d0a, #0f18240a)',
        borderLeft:'1px solid var(--border)',
        borderRight:'1px solid var(--border)'
      }}
    />
  )
}
