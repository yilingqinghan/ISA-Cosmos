import { RectEl, LineEl, ArrowEl, TextEl } from './types'

export function rect(p: Omit<RectEl, 'type'>): RectEl { return { type:'rect', ...p } }
export function line(p: Omit<LineEl, 'type'>): LineEl { return { type:'line', ...p } }
export function arrow(p: Omit<ArrowEl, 'type'>): ArrowEl { return { type:'arrow', ...p } }
export function text(p: Omit<TextEl, 'type'>): TextEl { return { type:'text', ...p } }
