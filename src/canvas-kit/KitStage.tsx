import React, { useEffect, useRef, useState } from 'react'
import { Stage, Layer, Group, Shape, Rect as KRect } from 'react-konva'
import { CKTheme } from './theme'

type Size = { w: number; h: number }
type FitMode = 'width' | 'height' | 'contain'

export interface KitStageProps {
  contentSize: { width: number; height: number }
  zoom: number
  padding?: number
  fit?: FitMode              // ★ 新增，默认 'width'
  children: React.ReactNode
  onResetSignal?: number
}

export function KitStage({ contentSize, zoom, padding = 24, fit='width', children, onResetSignal }: KitStageProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [size, setSize] = useState<Size>({ w: 300, h: 300 })
  const [pos, setPos] = useState({ x: 0, y: 0 })

  useEffect(() => {
    if (!containerRef.current) return
    const ro = new ResizeObserver(() => {
      const el = containerRef.current!
      setSize({ w: el.clientWidth, h: el.clientHeight })
    })
    ro.observe(containerRef.current)
    setSize({ w: containerRef.current.clientWidth, h: containerRef.current.clientHeight })
    return () => ro.disconnect()
  }, [])

  // 禁用手势缩放
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const prevent = (e: Event) => e.preventDefault()
    el.addEventListener('wheel', prevent, { passive: false })
    el.addEventListener('gesturestart', prevent as any, { passive: false })
    el.addEventListener('gesturechange', prevent as any, { passive: false })
    el.addEventListener('gestureend', prevent as any, { passive: false })
    return () => {
      el.removeEventListener('wheel', prevent)
      el.removeEventListener('gesturestart', prevent as any)
      el.removeEventListener('gesturechange', prevent as any)
      el.removeEventListener('gestureend', prevent as any)
    }
  }, [])

  // --- 自适应：按宽度/高度/等比contain ---
  const sx = (size.w - padding * 2) / contentSize.width
  const sy = (size.h - padding * 2) / contentSize.height
  const baseScale =
    fit === 'width'  ? sx :
    fit === 'height' ? sy : Math.min(sx, sy)

  const scale = baseScale * zoom
  const ox = (size.w - contentSize.width * baseScale) / 2
  const oy = (size.h - contentSize.height * baseScale) / 2
  const groupX = ox + pos.x
  const groupY = oy + pos.y

  const resetRef = useRef(onResetSignal)
  useEffect(() => {
    if (resetRef.current !== onResetSignal) {
      resetRef.current = onResetSignal
      setPos({ x: 0, y: 0 })
    }
  }, [onResetSignal])

  return (
    <div ref={containerRef} className="canvas-root">
      <Stage width={size.w} height={size.h}>
        <Layer listening={false}>
          <KRect x={0} y={0} width={size.w} height={size.h} fill="transparent" />
          <GridFullStage w={size.w} h={size.h} />
        </Layer>
        <Layer>
          <Group
            x={groupX} y={groupY}
            scaleX={scale} scaleY={scale}
            draggable
            onDragMove={e => { const p = e.target.position(); setPos({ x: p.x - ox, y: p.y - oy }) }}
          >
            {children}
          </Group>
        </Layer>
      </Stage>
    </div>
  )
}

function GridFullStage({ w, h }: { w: number; h: number }) {
  const g = CKTheme.grid
  return (
    <Shape
      listening={false}
      sceneFunc={(ctx, shape) => {
        ctx.fillStyle = g.color; ctx.globalAlpha = 0.55
        for (let x=0; x<=w; x+=g.spacing)
          for (let y=0; y<=h; y+=g.spacing) { ctx.beginPath(); ctx.arc(x, y, g.dotSize, 0, Math.PI*2); ctx.fill() }
        ctx.globalAlpha = 1; ctx.fillStrokeShape(shape)
      }}
    />
  )
}
