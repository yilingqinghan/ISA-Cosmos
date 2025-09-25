import React, { useEffect, useRef, useState } from 'react'
import { Stage, Layer, Group, Rect as KRect, Line as KLine, Arrow as KArrow, Text as KText, Shape } from 'react-konva'
import type { BuiltScene } from '@core/instructions/types'
import type { Scene, SceneEl, GridOptions } from '@core/canvas/types'

type Size = { w: number; h: number }

interface Props {
  built: BuiltScene
  zoom: number              // 离散倍率：0.5 | 0.75 | 1 | 1.25 | 1.5 | 2
  onRequestReset?: number   // 信号变更时复位平移
}

export default function StageView({ built, zoom, onRequestReset }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const stageRef = useRef<any>(null)
  const [size, setSize] = useState<Size>({ w: 300, h: 300 })
  const [frame, setFrame] = useState(0)

  // 仅平移（缩放完全由 props.zoom 控制）
  const [userPos, setUserPos] = useState({ x: 0, y: 0 })

  const scene = built.scene
  const animator = built.animator ?? null

  // 右侧容器自适应：高度跟随整列，到底
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

  // 动画驱动
  useEffect(() => {
    let raf = 0
    if (!animator) return
    const loop = (t: number) => { animator.tick(t, scene); setFrame(v => (v + 1) % 1000000); raf = requestAnimationFrame(loop) }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [animator, scene])

  // 基础自适应（contain）
  const pad = scene.padding ?? 24
  const logicalW = scene.size?.width ?? Math.max(1200, size.w)  // 默认更大
  const logicalH = scene.size?.height ?? Math.max(640, size.h)
  const sx = (size.w - pad * 2) / logicalW
  const sy = (size.h - pad * 2) / logicalH
  const baseScale = Math.min(sx, sy)
  const baseOx = (size.w - logicalW * baseScale) / 2
  const baseOy = (size.h - logicalH * baseScale) / 2

  // 总缩放：仅离散倍率
  const totalScale = baseScale * zoom
  const groupPos = { x: baseOx + userPos.x, y: baseOy + userPos.y }

  // 复位平移
  const resetRef = useRef(onRequestReset)
  useEffect(() => {
    if (onRequestReset !== resetRef.current) {
      resetRef.current = onRequestReset
      setUserPos({ x: 0, y: 0 })
    }
  }, [onRequestReset])

  // 禁止任何手势缩放（滚轮/触控）
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

  // 网格：覆盖整个右侧（stage 模式）
  const grid: GridOptions = {
    enabled: scene.grid?.enabled ?? true,
    type: scene.grid?.type ?? 'dots',
    spacing: scene.grid?.spacing ?? 16,
    color: scene.grid?.color ?? '#e5e7eb',
    dotSize: scene.grid?.dotSize ?? 1,
    lineWidth: scene.grid?.lineWidth ?? 1,
    mode: 'stage'
  }
  const bg = scene.bg ?? 'transparent'

  return (
    <div ref={containerRef} className="canvas-root" style={{ position:'relative', height:'100%', minHeight:0, background:'transparent' }}>
      <Stage ref={stageRef} width={size.w} height={size.h}>
        {/* 背景 + 点阵覆盖到底 */}
        <Layer listening={false}>
          <KRect x={0} y={0} width={size.w} height={size.h} fill={bg} listening={false} />
          {grid.enabled && <GridFullStage w={size.w} h={size.h} grid={grid} />}
        </Layer>

        {/* 场景：整个 Group 可拖拽实现平移 */}
        <Layer>
          <Group
            x={groupPos.x}
            y={groupPos.y}
            scaleX={totalScale}
            scaleY={totalScale}
            draggable                     // ★ 支持拖动
            onDragMove={e => {
              const p = e.target.position()
              // 反算 userPos：去掉基础偏移
              setUserPos({ x: p.x - baseOx, y: p.y - baseOy })
            }}
          >
            {scene.elements.map((el, i) => renderEl(el, i))}
          </Group>
        </Layer>
      </Stage>
    </div>
  )
}

function renderEl(el: SceneEl, i: number): React.ReactNode {
  if (el.visible === false) return null
  const key = (el as any).id || i
  switch (el.type) {
    case 'rect':
      return (
        <KRect
          key={key}
          x={el.x} y={el.y} width={el.w} height={el.h}
          fill={el.fill} stroke={el.stroke} strokeWidth={el.strokeWidth ?? 1}
          cornerRadius={el.radius ?? 10}
          opacity={el.opacity ?? 1}
          shadowColor={el.shadow ? 'rgba(0,0,0,0.12)' : undefined}
          shadowBlur={el.shadow ? 12 : 0}
          shadowOffsetY={el.shadow ? 4 : 0}
          listening={false}
        />
      )
    case 'line':
      return <KLine key={key} points={[el.x1, el.y1, el.x2, el.y2]} stroke={el.stroke || '#94a3b8'} strokeWidth={el.strokeWidth ?? 2} dash={el.dash} opacity={el.opacity ?? 1} listening={false} />
    case 'arrow':
      return <KArrow key={key} points={[el.x1, el.y1, el.x2, el.y2]} stroke={el.stroke || '#2563eb'} fill={el.stroke || '#2563eb'} strokeWidth={el.strokeWidth ?? 3} pointerLength={12} pointerWidth={10} opacity={el.opacity ?? 1} listening={false} />
    case 'text': {
      const { fontSize, fontFamily, fontStyle } = parseFont(el.font)
      const offsetY = el.baseline === 'middle' ? fontSize / 2 : 0
      return <KText key={key} x={el.x} y={el.y} text={el.text} fill={el.color || '#0f172a'} fontSize={fontSize} fontFamily={fontFamily} fontStyle={fontStyle} offsetY={offsetY} listening={false} />
    }
  }
}

function GridFullStage({ w, h, grid }: { w: number; h: number; grid: GridOptions }) {
  const spacing = grid.spacing ?? 16
  const color = grid.color ?? '#e5e7eb'
  const type = grid.type ?? 'dots'
  const dot = grid.dotSize ?? 1
  const lw = grid.lineWidth ?? 1
  return (
    <Shape
      listening={false}
      sceneFunc={(ctx, shape) => {
        if (type === 'dots') {
          ctx.fillStyle = color; ctx.globalAlpha = 0.6
          for (let x=0; x<=w; x+=spacing)
            for (let y=0; y<=h; y+=spacing) { ctx.beginPath(); ctx.arc(x, y, dot, 0, Math.PI*2); ctx.fill() }
          ctx.globalAlpha = 1
        } else {
          ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.globalAlpha = 0.5
          for (let x=0; x<=w; x+=spacing){ ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,h); ctx.stroke() }
          for (let y=0; y<=h; y+=spacing){ ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(w,y); ctx.stroke() }
          ctx.globalAlpha = 1
        }
        ctx.fillStrokeShape(shape)
      }}
    />
  )
}

function parseFont(font?: string){
  let fontSize = 14, fontFamily = 'Inter, sans-serif', fontStyle = 'normal'
  if (font) {
    const m = /([0-9]+)px\\s+(.+)/.exec(font)
    if (m) { fontSize = parseInt(m[1], 10); fontFamily = m[2] }
  }
  return { fontSize, fontFamily, fontStyle }
}
