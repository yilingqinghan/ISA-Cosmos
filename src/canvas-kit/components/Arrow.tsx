import React from 'react'
import { Arrow as KArrow, Text as KText, Group } from 'react-konva'
import { CKTheme } from '../theme'

export interface ArrowProps {
  x1: number; y1: number; x2: number; y2: number
  color?: string
  width?: number
  label?: string
  labelOffset?: { x?: number; y?: number }
}

export function Arrow({ x1,y1,x2,y2, color=CKTheme.color.primary, width=2.5, label, labelOffset }: ArrowProps) {
  const midx = (x1 + x2) / 2
  const midy = (y1 + y2) / 2
  return (
    <Group listening={false}>
      <KArrow
        points={[x1,y1,x2,y2]}
        stroke={color}
        fill={color}
        strokeWidth={width}
        pointerLength={12}
        pointerWidth={10}
      />
      {label && (
        <KText
          x={midx + (labelOffset?.x ?? 0)}
          y={midy + (labelOffset?.y ?? -10)}
          text={label}
          fontSize={12}
          fontFamily="Inter, ui-sans-serif"
          fill={CKTheme.color.muted}
        />
      )}
    </Group>
  )
}
