import type { DSLShape } from '../../utils/parse'

/** Simple IO port as a small labeled rectangle. */
export function port(opts: { id:string; x:number; y:number; label?:string; dir?:'in'|'out'; color?:string }): DSLShape[] {
  const { id, x, y, label = 'IO', dir = 'in', color = '#F4F6FA' } = opts
  const w = 1.0, h = 0.6
  return [
    { kind:'rect', id, x, y, w, h, color } as any,
    { kind:'text', id: `${id}__label`, x: x + w/2, y: y + h/2, text: `${label}${dir==='in'?'←':'→'}`, align:'center', size: 14 } as any,
  ]
}
