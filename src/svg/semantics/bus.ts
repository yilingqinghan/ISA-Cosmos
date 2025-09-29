import type { DSLShape } from '../../utils/parse'

/** Draw a bus (line/polyline). */
export function bus(opts: { id:string; points?: [number,number][]; x1?:number; y1?:number; x2?:number; y2?:number; width?:number; color?:string; dashed?:boolean }): DSLShape[] {
  const { id, points, x1, y1, x2, y2, width = 2, color = '#94a3b8', dashed = false } = opts
  if (points && points.length >= 2) {
    const flat = points.flat() as any
    return [{ kind:'line', id, points: flat, width, color, dash: dashed ? [6,6] : undefined } as any]
  }
  return [{ kind:'line', id, x1: x1!, y1: y1!, x2: x2!, y2: y2!, width, color, dash: dashed ? [6,6] : undefined } as any]
}
