import React from 'react'
import { Rect as KRect, Text as KText, Group } from 'react-konva'
import { CKTheme } from '../../canvas-kit/theme'

type Variant = 'primary' | 'white' | 'dark' | 'ghost' | 'dashed'

export interface BlockProps {
  x: number; y: number; w: number; h: number
  text?: string
  variant?: Variant
  strokeWidth?: number
  radius?: number
  id?: string
  active?: boolean            // 高亮（加重描边/阴影）
}

export function Block({
  x, y, w, h, text, variant='white', strokeWidth=1.5, radius=CKTheme.radius, id, active
}: BlockProps) {
  const t = CKTheme.color
  const style = {
    primary: { fill: t.primaryBg, stroke: t.primary },
    white:   { fill: t.whiteBg,   stroke: t.stroke  },
    dark:    { fill: t.darkBg,    stroke: t.darkBg  },
    ghost:   { fill: 'transparent', stroke: t.stroke },
    dashed:  { fill: 'transparent', stroke: t.dashed }
  }[variant]

  const dash = variant === 'dashed' ? [6, 6] : undefined
  const textColor = variant === 'dark' ? t.darkText : t.text

  return (
    <Group id={id}>
      <KRect
        x={x} y={y} width={w} height={h}
        cornerRadius={radius}
        fill={style.fill}
        stroke={style.stroke}
        strokeWidth={active ? strokeWidth + 1 : strokeWidth}
        dash={dash}
        shadowColor={active ? 'rgba(0,0,0,0.18)' : undefined}
        shadowBlur={active ? 14 : 0}
        shadowOffsetY={active ? 4 : 0}
        listening={false}
      />
      {text != null && (
        <KText
          x={x} y={y}
          width={w} height={h}
          text={text}
          fontSize={14}
          fontFamily="Inter, ui-sans-serif, system-ui"
          fill={textColor}
          align="center"
          verticalAlign="middle"
          listening={false}
        />
      )}
    </Group>
  )
}
