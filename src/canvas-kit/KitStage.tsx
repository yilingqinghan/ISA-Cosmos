import React, { useEffect, useRef, useState } from 'react'
import { Stage, Layer, Group, Shape, Rect as KRect } from 'react-konva'
import { CKTheme } from './theme'

type Size = { w: number; h: number }

export interface KitStageProps {
  contentSize: { width: number; height: number } // 逻辑场景尺寸
  zoom: number                                   // 0.5 | 0.75 | 1 | 1.25 | 1.5 | 2
  padding?: number                               // contain 留白
  children: React.ReactNode
  onResetSignal?: number                         // 改变时复位平移
}

/** 舞台容器：
 *  - 铺满父容器（右侧整块）
 *  - 网格到页面底部
 *  - 禁止手势缩放（滚轮/触控）；仅通过 zoom 属性控制
 *  - 整个场景 Group 可拖拽
 */
export function KitStage({ contentSize, zoom, padding = 24, children, onResetSignal }: KitStageProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [size, setSize] = useState<Size>({ w: 300, h: 300 })
  const [pos, setPos] = useState({ x: 0, y: 0 })

  // 跟随容器大小
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

  // 禁止手势缩放
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

  // contain 自适应 + 离散缩放
  const sx = (size.w - padding * 2) / contentSize.width
  const sy = (size.h - padding * 2) / contentSize.height
  const baseScale = Math.min(sx, sy)
  const scale = baseScale * zoom
  const ox = (size.w - contentSize.width * baseScale) / 2
  const oy = (size.h - contentSize.height * baseScale) / 2
  const groupX = ox + pos.x
  const groupY = oy + pos.y

  // 外部复位信号
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
        {/* 背景和全舞台网格 */}
        <Layer listening={false}>
          <KRect x={0} y={0} width={size.w} height={size.h} fill="transparent" />
          <GridFullStage w={size.w} h={size.h} />
        </Layer>

        {/* 内容层：整体可拖拽 */}
        <Layer>
          <Group
            x={groupX}
            y={groupY}
            scaleX={scale}
            scaleY={scale}
            draggable
            onDragMove={e => {
              const p = e.target.position()
              setPos({ x: p.x - ox, y: p.y - oy })
            }}
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
        if (g.type === 'dots') {
          ctx.fillStyle = g.color
          ctx.globalAlpha = 0.55
          for (let x=0; x<=w; x+=g.spacing)
            for (let y=0; y<=h; y+=g.spacing) { ctx.beginPath(); ctx.arc(x, y, g.dotSize, 0, Math.PI*2); ctx.fill() }
          ctx.globalAlpha = 1
        }
        // 若需线网格，扩展即可
        ctx.fillStrokeShape(shape)
      }}
    />
  )
}
