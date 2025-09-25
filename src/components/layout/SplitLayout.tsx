// src/components/layout/SplitLayout.tsx
import React, { useEffect, useMemo, useRef, useState } from 'react'

// 代替 classNames：把真值字符串拼起来
const cls = (...xs: Array<string | false | null | undefined>) =>
  xs.filter(Boolean).join(' ')

type Props = {
  columns: number[]        // 百分比，如 [32,68] 或 [34,32,34]
  minPx: number[]          // 每列最小像素，如 [260,480] 或 [260,260,320]
  gutter?: number          // 分割线宽度(px)
  children: React.ReactNode[] // 2 或 3 个子面板
}

export default function SplitLayout({ columns, minPx, gutter = 8, children }: Props) {
  const hostRef = useRef<HTMLDivElement>(null)
  const [sizes, setSizes] = useState(columns) // 百分比
  const [dragIdx, setDragIdx] = useState<number | null>(null)
  const dragStart = useRef<{ x: number; leftPx: number; rightPx: number; total: number } | null>(null)

  const count = React.Children.count(children)
  if (count < 2 || count > 3) {
    throw new Error(`SplitLayout only supports 2 or 3 panes, got ${count}`)
  }

  const width = hostRef.current?.clientWidth ?? 0
  const toPx = (percent: number) => Math.round((percent / 100) * width)
  const toPercent = (px: number) => (width === 0 ? 0 : (px / width) * 100)

  const onDown = (i: number, e: React.MouseEvent) => {
    if (!hostRef.current) return
    setDragIdx(i)
    const leftPx = toPx(sizes[i])
    const rightPx = toPx(sizes[i + 1])
    dragStart.current = { x: e.clientX, leftPx, rightPx, total: hostRef.current.clientWidth }
    e.preventDefault()
  }

  const onMove = (e: MouseEvent) => {
    if (dragIdx === null || !dragStart.current) return
    const delta = e.clientX - dragStart.current.x
    let newLeft = dragStart.current.leftPx + delta
    let newRight = dragStart.current.rightPx - delta

    // 约束最小像素
    newLeft = Math.max(newLeft, minPx[dragIdx])
    newRight = Math.max(newRight, minPx[dragIdx + 1])

    // 保持两列总宽不变
    const totalPair = dragStart.current.leftPx + dragStart.current.rightPx
    if (newLeft + newRight > totalPair) {
      const extra = (newLeft + newRight) - totalPair
      if (newLeft > dragStart.current.leftPx) newLeft -= extra
      else newRight -= extra
    }

    setSizes(prev => {
      const next = [...prev]
      next[dragIdx]     = toPercent(newLeft)
      next[dragIdx + 1] = toPercent(newRight)
      return next
    })
  }

  const onUp = () => { setDragIdx(null); dragStart.current = null }

  useEffect(() => {
    if (dragIdx === null) return
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragIdx, minPx, sizes, width])

  const gridTemplate = useMemo(() => {
    const cols: string[] = []
    for (let i = 0; i < count; i++) {
      cols.push(`${sizes[i]}%`)
      if (i < count - 1) cols.push(`${gutter}px`)
    }
    return cols.join(' ')
  }, [sizes, count, gutter])

  const panes = React.Children.toArray(children)

  return (
    <div
      ref={hostRef}
      className="app-root"
      style={{ display: 'grid', gridTemplateColumns: gridTemplate, minHeight: 0, height: '100%', width: '100%' }}
    >
      {panes.map((node, i) => (
        <React.Fragment key={i}>
          <div className={cls('panel', i === 0 && 'panel--left', i === count - 1 && 'panel--right')}
               style={{ minWidth: 0, minHeight: 0 }}>
            {node}
          </div>
          {i < count - 1 && (
            <div
              className="split-gutter"
              style={{
                cursor: 'col-resize',
                background: 'linear-gradient(180deg,#eef2ff,#f4f6ff)',
                borderLeft: '1px solid #e5eaf4',
                borderRight: '1px solid #e5eaf4'
              }}
              onMouseDown={(e) => onDown(i, e)}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  )
}
