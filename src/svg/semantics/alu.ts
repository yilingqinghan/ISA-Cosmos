import type { DSLShape } from '../../utils/parse'

export function alu(opts: { id: string; x: number; y: number; w?: number; h?: number; label?: string; color?: string }): DSLShape[] {
  const { id, x, y, w = 1.4, h = 1.2, label = 'ALU', color = '#0EA5E9' } = opts
  return [
    { kind:'rect', id, x, y, w, h, color, text: label } as any
  ]
}
