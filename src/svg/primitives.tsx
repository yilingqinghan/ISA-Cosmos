import React from 'react'

/** <g> 包装 */
type GroupProps = {
  x?: number
  y?: number
  opacity?: number
  listening?: boolean
  children?: React.ReactNode
}
export function Group({
  x = 0,
  y = 0,
  opacity = 1,
  listening = true,
  children,
}: GroupProps) {
  return (
    <g
      transform={`translate(${x},${y})`}
      opacity={opacity}
      pointerEvents={listening === false ? 'none' : undefined}
    >
      {children}
    </g>
  )
}

/** <rect> */
type RectProps = {
  x?: number
  y?: number
  width: number
  height: number
  cornerRadius?: number
  fill?: string
  stroke?: string
  dash?: number[]
  opacity?: number
  listening?: boolean
  shadowBlur?: number
  shadowColor?: string
}
export function Rect({
  x = 0,
  y = 0,
  width,
  height,
  cornerRadius = 0,
  fill,
  stroke,
  dash,
  opacity = 1,
  listening = true,
  shadowBlur,
}: RectProps) {
  const filter = shadowBlur ? 'url(#dropShadow)' : undefined
  return (
    <rect
      x={x}
      y={y}
      width={width}
      height={height}
      rx={cornerRadius}
      ry={cornerRadius}
      fill={fill}
      stroke={stroke}
      strokeDasharray={dash ? dash.join(' ') : undefined}
      opacity={opacity}
      filter={filter}
      pointerEvents={listening === false ? 'none' : undefined}
    />
  )
}

/** <text> */
type TextAlign = 'left' | 'center' | 'right'
type VAlign = 'top' | 'middle' | 'bottom'
export type TextProps = {
  text: string | number
  x: number
  y: number
  width?: number
  height?: number
  align?: TextAlign
  verticalAlign?: VAlign
  fontSize?: number
  fill?: string
  opacity?: number
  listening?: boolean
  fontFamily?: string
}
export function Text({
  text,
  x,
  y,
  width,
  height,
  align = 'left',
  verticalAlign = 'top',
  fontSize = 16,
  fill = '#0f172a',
  opacity = 1,
  listening = true,
  fontFamily,
}: TextProps) {
  let tx = x,
    ty = y
  let textAnchor: 'start' | 'middle' | 'end' = 'start'
  let dominantBaseline: string = 'text-before-edge'

  if (width != null) {
    if (align === 'center') {
      textAnchor = 'middle'
      tx = x + width / 2
    } else if (align === 'right') {
      textAnchor = 'end'
      tx = x + width
    }
  }
  if (height != null) {
    if (verticalAlign === 'middle') {
      dominantBaseline = 'middle'
      ty = y + height / 2
    } else if (verticalAlign === 'bottom') {
      dominantBaseline = 'text-after-edge'
      ty = y + height
    }
  }

  return (
    <text
      x={tx}
      y={ty}
      textAnchor={textAnchor}
      dominantBaseline={dominantBaseline}
      fontSize={fontSize}
      fill={fill}
      opacity={opacity}
      pointerEvents={listening === false ? 'none' : undefined}
      style={fontFamily ? { fontFamily } : undefined}
    >
      {String(text)}
    </text>
  )
}

/** 折线 / 多边形 / 直线 */
type LineProps = {
  points?: number[]            // [x0,y0,x1,y1,...]
  x1?: number
  y1?: number
  x2?: number
  y2?: number
  stroke?: string
  strokeWidth?: number
  opacity?: number
  listening?: boolean
  closed?: boolean             // true -> <polygon>
  fill?: string
}
export function Line({
  points,
  x1,
  y1,
  x2,
  y2,
  stroke = '#000',
  strokeWidth = 2,
  opacity = 1,
  listening = true,
  closed,
  fill,
}: LineProps) {
  const common: React.SVGProps<SVGElement> = {
    // @ts-expect-error SVG/HTML props overlap
    stroke,
    // @ts-expect-error ditto
    strokeWidth,
    // @ts-expect-error ditto
    opacity,
    // @ts-expect-error ditto
    pointerEvents: listening === false ? 'none' : undefined,
    // 让折线端点更圆润一些
    // @ts-expect-error
    strokeLinecap: 'round',
    // @ts-expect-error
    strokeLinejoin: 'round',
  }

  if (points && points.length >= 4) {
    // 把 [x0,y0,x1,y1,...] -> 'x0,y0 x1,y1 ...'
    const pairs: string[] = []
    for (let i = 0; i < points.length; i += 2) {
      const px = points[i]
      const py = points[i + 1]
      if (typeof px === 'number' && typeof py === 'number') {
        pairs.push(`${px},${py}`)       // ← 正确的模板字符串
      }
    }
    const pts = pairs.join(' ')
    if (closed) return <polygon points={pts} fill={fill} {...(common as any)} />
    return <polyline points={pts} fill="none" {...(common as any)} />
  }

  // 回退为 <line>
  return <line x1={x1} y1={y1} x2={x2} y2={y2} {...(common as any)} />
}