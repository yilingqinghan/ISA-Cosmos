import React, { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Stage, Layer } from 'react-konva'

type Size = { width: number; height: number }

type Props = {
  contentSize: Size
  zoom?: number
  autoFit?: boolean
  padding?: number
  pannable?: boolean
  onResetSignal?: number
  children: React.ReactNode
}

export default function KitStage({
  contentSize,
  zoom = 1,
  autoFit = true,
  padding = 48,
  pannable = true,
  onResetSignal = 0,
  children
}: Props) {
  const hostRef = useRef<HTMLDivElement>(null)
  const [stageSize, setStageSize] = useState({ w: 300, h: 300 })
  const [view, setView] = useState({ scale: 1, x: 0, y: 0 })

  // 监听容器大小
  useLayoutEffect(() => {
    if (!hostRef.current) return
    const ro = new ResizeObserver((es) => {
      const cr = es[0].contentRect
      setStageSize({ w: cr.width, h: cr.height })
    })
    ro.observe(hostRef.current)
    return () => ro.disconnect()
  }, [])

  // AutoFit：等比 contain + 自定义缩放
  useEffect(() => {
    if (!autoFit) return
    const vw = stageSize.w || 1, vh = stageSize.h || 1
    const cw = contentSize.width, ch = contentSize.height
    const s0 = Math.min(vw / (cw + padding * 2), vh / (ch + padding * 2))
    const s = s0 * zoom
    const x = (vw - cw * s) / 2
    const y = (vh - ch * s) / 2
    setView({ scale: s, x, y })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoFit, stageSize.w, stageSize.h, contentSize.width, contentSize.height, padding, onResetSignal, zoom])

  // 拖拽平移
  const dragging = useRef(false)
  const dragStart = useRef<{ x: number; y: number; vx: number; vy: number }>()
  const onDown = (e: any) => { if (!pannable) return; dragging.current = true; dragStart.current = { x: e.evt.clientX, y: e.evt.clientY, vx: view.x, vy: view.y } }
  const onMove = (e: any) => { if (!pannable || !dragging.current || !dragStart.current) return; const dx=e.evt.clientX-dragStart.current.x, dy=e.evt.clientY-dragStart.current.y; setView(v=>({ ...v, x: dragStart.current!.vx+dx, y: dragStart.current!.vy+dy })) }
  const onUp   = () => { dragging.current = false }

  return (
    <div ref={hostRef} className="kitstage-host">
      <Stage width={stageSize.w} height={stageSize.h} onMouseDown={onDown} onMouseMove={onMove} onMouseUp={onUp}>
        <Layer x={view.x} y={view.y} scaleX={view.scale} scaleY={view.scale}>
          {children}
        </Layer>
      </Stage>
    </div>
  )
}
