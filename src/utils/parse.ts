import { expandDSL } from './dslMacros'

export type DSLDoc = {
  steps: { id: string; name: string }[]
  shapes: DSLShape[]
  anims: DSLAnim[]
  packOn: string[]
  packOff: string[]
  packDefault?: 'auto' | 'on' | 'off'
}

export type DSLShape =
  | { kind: 'rect'; id: string; w: number; h: number; x: number; y: number; text?: string; color?: string; meta?: { vecItem?: boolean; family?: string } }
  | { kind: 'label'; id: string; x: number; y: number; text: string }
  | { kind: 'text';  id: string; x: number; y: number; text: string; size?: number; color?: string; align?: 'left'|'center'|'right' }
  | { kind: 'group'; id: string; x: number; y: number; w: number; h: number; style?: 'dotted' | 'solid' }
  | { kind: 'line';  id: string; x1: number; y1: number; x2: number; y2: number; width?: number; color?: string }
  | {
      kind: 'arrow'; id: string; x1: number; y1: number; x2: number; y2: number;
      width?: number; label?: string; above?: boolean; color?: string; start?: boolean; end?: boolean
    }

export type DSLAnim =
  | { kind: 'appear'; id: string; stepId: string }
  | { kind: 'disappear'; id: string; stepId: string }
  | { kind: 'blink'; id: string; stepId: string; times: number; interval: number }

const isBlank = (s: string) => !s || !s.trim()
const unq = (s?: string) => (s ?? '').replace(/^"(.*)"$/s, '$1')
const toNum = (s?: string) => (s ? Number(s) : 0)

function splitArgs(s: string): string[] {
  const out: string[] = []
  let buf = '', q = false
  for (let i = 0; i < s.length; i++) {
    const c = s[i]
    if (c === '"' && s[i - 1] !== '\\') { q = !q; buf += c; continue }
    if (c === ',' && !q) { out.push(buf.trim()); buf = ''; continue }
    buf += c
  }
  if (!isBlank(buf)) out.push(buf.trim())
  return out
}

type Groups = Map<string, string[]>
type Alias  = Map<string, string>

// 支持组别/别名/范围 v0[0..3]
function expandToken(tok: string, groups: Groups, alias: Alias): string[] {
  if (alias.has(tok)) return [alias.get(tok)!]
  const m = tok.match(/^([A-Za-z_]\w*)\[(\d+)\.\.(\d+)\]$/)
  if (m) {
    const base = m[1], a = Number(m[2]), b = Number(m[3])
    const lo = Math.min(a, b), hi = Math.max(a, b)
    const arr: string[] = []
    for (let i = lo; i <= hi; i++) {
      const key = `${base}[${i}]`
      arr.push(alias.get(key) ?? `${base}_${i}`)
    }
    return arr
  }
  if (groups.has(tok)) return groups.get(tok)!.slice()
  return [tok]
}

export function parseDSL(text: string): DSLDoc {
  // ★ 若未来你启用更高级的 DSL 宏（比如 vecN -> 多个 rect），在这里先做展开
  text = expandDSL(text)

  const shapes: DSLShape[] = []
  const anims: DSLAnim[] = []
  const steps: { id: string; name: string }[] = []
  const packOn: string[] = []
  const packOff: string[] = []
  let packDefault: 'auto' | 'on' | 'off' | undefined

  const groups: Groups = new Map()
  const alias:  Alias  = new Map()

  // 删除整行注释（# 开头），保留行内颜色如 #0EA5E9
  const src = text.split('\n').map(l => (/^\s*#/.test(l) ? '' : l)).join('\n')
  const stmts = src.split(/;|\n/g).map(s => s.trim()).filter(Boolean)

  const pushRect = (id: string, w: number, h: number, x: number, y: number, text?: string, color?: string, meta?: { vecItem?: boolean; family?: string }) => {
    shapes.push({ kind: 'rect', id, w, h, x, y, text, color, meta })
  }

  for (const raw of stmts) {
    const m = raw.match(/^([A-Za-z_]\w*)\s*\((.*)\)\s*(?:#.*)?$/)
    if (!m) continue
    const name = m[1].toLowerCase()
    const args = splitArgs(m[2])

    if (name === 'step') { const [id,n] = args; steps.push({ id, name: unq(n) }); continue }

    // --- pack 系列指令 ---
    if (name === 'pack_default') { const [mode] = args; const md = (unq(mode) || 'auto').toLowerCase() as any; if (md==='auto'||md==='on'||md==='off') packDefault = md; continue }
    if (name === 'pack')        { args.forEach(tok => expandToken(tok, groups, alias).forEach(id => packOn.push(id))); continue }
    if (name === 'nopack')      { args.forEach(tok => expandToken(tok, groups, alias).forEach(id => packOff.push(id))); continue }
    if (name === 'nopack_prefix') { /* 目前画布层在逻辑里已跳过 rf_ 前缀，这里当注释忽略 */ continue }

    // --- 基础元素 ---
    if (name === 'label')  { const [id,x,y,txt]=args; shapes.push({kind:'label', id, x:toNum(x), y:toNum(y), text:unq(txt)}); continue }
    if (name === 'text')   { const [id,x,y,txt,size,color,align]=args; shapes.push({kind:'text', id, x:toNum(x), y:toNum(y), text:unq(txt), size:size?toNum(size):undefined, color, align:align?(unq(align) as any):undefined}); continue }
    if (name === 'group')  { const [id,x,y,w,h,style]=args; shapes.push({kind:'group', id, x:toNum(x), y:toNum(y), w:toNum(w), h:toNum(h), style: style?(unq(style) as any):'dotted'}); continue }
    if (name === 'rect')   { const [id,w,h,x,y,txt,color]=args; pushRect(id,toNum(w),toNum(h),toNum(x),toNum(y),unq(txt),color, undefined); continue }
    if (name === 'square') { const [id,x,y,txt,color]=args; pushRect(id,1,1,toNum(x),toNum(y),unq(txt),color, undefined); continue }
    if (name === 'line')   { const [id,x1,y1,x2,y2,width,color]=args; shapes.push({kind:'line', id, x1:toNum(x1), y1:toNum(y1), x2:toNum(x2), y2:toNum(y2), width:width?toNum(width):undefined, color}); continue }
    if (name === 'arrow')  { const [id,x1,y1,x2,y2,width,label,above,color,st,en]=args; shapes.push({kind:'arrow', id, x1:toNum(x1), y1:toNum(y1), x2:toNum(x2), y2:toNum(y2), width:width?toNum(width):undefined, label:label?unq(label):undefined, above:above?unq(above)==='true':undefined, color, start:st?unq(st)==='true':undefined, end:en?unq(en)==='true':undefined}); continue }

    // --- vec2/4/8：最后一个参数为外框开关 ---
    if (/^vec(2|4|8)$/.test(name)) {
      const N = Number(name.replace('vec',''))
      const [id,x,y,labels,color,dir,gap,boxFlag] = args
      const baseX = toNum(x), baseY = toNum(y)
      const g = gap? toNum(gap): 0.2
      const d = (dir? unq(dir): 'x').toLowerCase()
      const lab = labels? unq(labels).split(','): []
      const members: string[] = []

      for (let i=0;i<N;i++){
        const dx = d==='x'? i*(1+g): 0
        const dy = d==='y'? i*(1+g): 0
        const cid = `${id}_${i}`
        members.push(cid)
        alias.set(`${id}[${i}]`, cid)
        pushRect(cid,1,1, baseX+dx, baseY+dy, lab[i]||'', color, { vecItem: true, family: id })
      }
      groups.set(id, members)

      // box: 默认有框；nobox/none/off/0/false/box:false 关闭
      let needBox = true
      if (boxFlag) {
        const v = unq(boxFlag).toLowerCase()
        if (v==='nobox' || v==='none' || v==='off' || v==='0' || v==='false' || v==='box:false') needBox = false
      }
      if (needBox) {
        const totalW = d==='x'? (N-1)*(1+g)+1: 1
        const totalH = d==='y'? (N-1)*(1+g)+1: 1
        shapes.push({ kind:'group', id:`${id}__box`, x:baseX-0.1, y:baseY-0.1, w:totalW+0.2, h:totalH-0.8, style:'dotted' })
      }
      continue
    }

    // --- appear/disappear/blink：支持多 ID + 范围，step 在最后 ---
    if (name === 'appear' || name === 'disappear') {
      if (args.length<2) continue
      const stepId = args[args.length-1]
      const ids = args.slice(0,-1).flatMap(tok => expandToken(tok, groups, alias))
      ids.forEach(id => anims.push({ kind: name as any, id, stepId }))
      continue
    }
    if (name === 'blink') {
      if (args.length<3) continue
      const stepId = args[args.length-3]
      const times  = toNum(args[args.length-2] ?? '6')
      const itv    = toNum(args[args.length-1] ?? '700')
      const ids = args.slice(0,-3).flatMap(tok => expandToken(tok, groups, alias))
      ids.forEach(id => anims.push({ kind:'blink', id, stepId, times, interval: itv }))
      continue
    }
  }

  return { steps, shapes, anims, packOn, packOff, packDefault }
}
