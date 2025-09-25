// src/canvas-kit/KitStage.tsx
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Stage, Layer, Group, Rect } from 'react-konva'

export type KitStageProps = {
  contentSize: { width: number; height: number }   // 逻辑内容尺寸
  zoom?: number                                    // 0.75/1/1.25/1.5/2 ...
  onResetSignal?: number                           // 改变这个数值可触发复位
  pannable?: boolean                               // 是否允许拖动平移
  children?: React.ReactNode
}

/** 安全自适应画布容器（点阵背景 / 可拖动 / 禁止手势缩放） */
export const KitStage: React.FC<KitStageProps> = ({
  contentSize,
  zoom = 1,
  onResetSignal = 0,
  pannable = true,
  children
}) => {
  const wrapRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ w: 0, h: 0 })       // 容器实际像素
  const [offset, setOffset] = useState({ x: 0, y: 0 })   // 内容偏移（用于平移）
  const [dragging, setDragging] = useState(false)
  const dragOrigin = useRef<{ x: number; y: number } | null>(null)

  // 观察容器尺寸
  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const ro = new ResizeObserver(() => {
      setSize({ w: el.clientWidth, h: el.clientHeight })
    })
    ro.observe(el)
    // 初始化
    setSize({ w: el.clientWidth, h: el.clientHeight })
    return () => ro.disconnect()
  }, [])

  // 居中（当容器尺寸/缩放/复位信号变化时）
  useEffect(() => {
    if (!size.w || !size.h) return
    const cx = (size.w - contentSize.width * zoom) / 2
    const cy = (size.h - contentSize.height * zoom) / 2
    setOffset({ x: Math.round(cx), y: Math.round(cy) })
  }, [size.w, size.h, contentSize.width, contentSize.height, zoom, onResetSignal])

  // 拖动平移（不依赖 maxX/maxY）
  const onMouseDown = (e: any) => {
    if (!pannable) return
    if (e.evt?.button !== 0) return // 只接受左键
    setDragging(true)
    dragOrigin.current = {
      x: e.evt.clientX - offset.x,
      y: e.evt.clientY - offset.y
    }
  }
  const onMouseMove = (e: any) => {
    if (!dragging || !dragOrigin.current) return
    setOffset({
      x: e.evt.clientX - dragOrigin.current.x,
      y: e.evt.clientY - dragOrigin.current.y
    })
  }
  const onMouseUp = () => {
    setDragging(false)
    dragOrigin.current = null
  }

  // 点阵背景（随容器尺寸变化）
  const Grid = useMemo(() => {
    const gap = 24
    const cols = Math.ceil(size.w / gap) + 1
    const rows = Math.ceil(size.h / gap) + 1
    const dots: JSX.Element[] = []
    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        dots.push(
          <Rect
            key={`${i}-${j}`}
            x={i * gap}
            y={j * gap}
            width={1}
            height={1}
            fill="#cbd5e180"
            listening={false}
          />
        )
      }
    }
    return () => <Layer listening={false}>{dots}</Layer>
  }, [size.w, size.h])

  return (
    <div ref={wrapRef} style={{ position: 'absolute', inset: 0, minHeight: 0 }}>
      {/* 只有拿到有效宽高后才渲染 Stage，避免首帧 null 访问 */}
      {size.w > 0 && size.h > 0 && (
        <Stage
          width={size.w}
          height={size.h}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          // 禁止滚轮缩放（如果你在别处做倍率控制，这里保持默认即可）
          onWheel={(e) => e.evt.preventDefault()}
        >
          <Grid />
          <Layer x={offset.x} y={offset.y} scaleX={zoom} scaleY={zoom}>
            <Group>{children}</Group>
          </Layer>
        </Stage>
      )}
    </div>
  )
}

// 同时提供默认导出，和命名导出二选一均可
export default KitStage
