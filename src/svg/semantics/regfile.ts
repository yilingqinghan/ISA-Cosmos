import type { DSLShape } from '../../utils/parse'

/**
 * Create a vector register block with N lanes.
 * Units are in inches; Canvas multiplies by 96.
 */
export function regfile(opts: {
  id: string
  x: number; y: number
  lanes: number
  w?: number; h?: number
  gap?: number
  title?: string
  laneColor?: string
  boxColor?: string
  laneText?: (i:number)=>string
}): DSLShape[] {
  const { id, x, y, lanes, w = 4, h = 1, gap = 0.1, title, laneColor = 'lightgray', boxColor = undefined, laneText } = opts
  const laneW = (w - gap * (lanes + 1)) / lanes
  const laneH = h - gap * 2

  const shapes: DSLShape[] = []
  // Optional outer box
  shapes.push({ kind:'group', id: `${id}__box`, x, y, w, h } as any)

  for (let i = 0; i < lanes; i++) {
    const lx = x + gap + i * (laneW + gap)
    const ly = y + gap
    const idLane = `${id}[${i}]`
    const text = laneText ? laneText(i) : ''
    shapes.push({ kind:'rect', id: idLane, x: lx, y: ly, w: laneW, h: laneH, color: laneColor, text } as any)
  }

  if (title) {
    shapes.push({ kind:'text', id: `${id}__title`, x: x + w/2, y: y - 0.25, text: title, align:'center', size: 16 } as any)
  }

  return shapes
}
