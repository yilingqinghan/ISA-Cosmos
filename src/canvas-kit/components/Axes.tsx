import React from 'react'
import { Group, Line, Text } from 'react-konva'

const PX = (u: number) => u * 96

type Props = {
  show: boolean
  widthU: number
  heightU: number
  major?: number   // 主刻度（默认 1 格）
  minor?: number   // 次网格（默认 0.2 格）
}

export default function Axes({ show, widthU, heightU, major = 1, minor = 0.2 }: Props) {
  if (!show) return null
  const elems: React.ReactNode[] = []

  // 次级网格
  for (let x = 0; x <= widthU + 1e-6; x += minor) {
    elems.push(<Line key={`g-v-${x}`} points={[PX(x), 0, PX(x), PX(heightU)]} stroke="#cbd5e1" opacity={0.18} dash={[4, 8]} listening={false} />)
  }
  for (let y = 0; y <= heightU + 1e-6; y += minor) {
    elems.push(<Line key={`g-h-${y}`} points={[0, PX(y), PX(widthU), PX(y)]} stroke="#cbd5e1" opacity={0.18} dash={[4, 8]} listening={false} />)
  }

  // 主网格
  for (let x = 0; x <= widthU + 1e-6; x += major) {
    elems.push(<Line key={`M-v-${x}`} points={[PX(x), 0, PX(x), PX(heightU)]} stroke="#94a3b8" opacity={0.35} listening={false} />)
  }
  for (let y = 0; y <= heightU + 1e-6; y += major) {
    elems.push(<Line key={`M-h-${y}`} points={[0, PX(y), PX(widthU), PX(y)]} stroke="#94a3b8" opacity={0.35} listening={false} />)
  }

  // 轴线
  elems.push(<Line key="axis-x" points={[0, 0, PX(widthU), 0]} stroke="#111827" opacity={0.55} strokeWidth={2} listening={false} />)
  elems.push(<Line key="axis-y" points={[0, 0, 0, PX(heightU)]} stroke="#111827" opacity={0.55} strokeWidth={2} listening={false} />)

  // 刻度数字
  for (let x = 0; x <= Math.floor(widthU + 1e-6); x += 1) {
    elems.push(<Text key={`tx-${x}`} text={String(x)} x={PX(x) + 4} y={-18} fontSize={14} fill="#0f172a" listening={false} />)
  }
  for (let y = 0; y <= Math.floor(heightU + 1e-6); y += 1) {
    elems.push(<Text key={`ty-${y}`} text={String(y)} x={-24} y={PX(y) - 8} fontSize={14} fill="#0f172a" listening={false} />)
  }

  return <Group listening={false}>{elems}</Group>
}
