import type { DSLShape } from '../../utils/parse'

/**
 * Memory block (stack/heap). Renders a box and optional cells.
 */
export function memory(opts: {
  id: string
  x: number; y: number
  w: number; h: number
  cells?: number
  kind?: 'stack' | 'heap'
  label?: string
  cellColor?: string
}): DSLShape[] {
  const { id, x, y, w, h, cells = 0, kind = 'heap', label = 'MEM', cellColor = '#F4F6FA' } = opts
  const shapes: DSLShape[] = []

  shapes.push({ kind:'group', id: `${id}__box`, x, y, w, h } as any)
  if (label) shapes.push({ kind:'text', id:`${id}__label`, x: x + w/2, y: y - 0.25, text: label, align:'center', size: 16 } as any)

  if (cells > 0) {
    const gap = 0.08
    const cw = w - gap*2
    const ch = (h - gap*(cells+1)) / cells
    for (let i=0; i<cells; i++) {
      const cx = x + gap
      const cy = y + gap + i*(ch+gap)
      shapes.push({ kind:'rect', id:`${id}[${i}]`, x: cx, y: cy, w: cw, h: ch, color: cellColor } as any)
    }
  }
  return shapes
}
