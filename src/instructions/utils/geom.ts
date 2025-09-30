// 通用几何/数值辅助（指令无关 / 架构无关）

export type BasicRect = { id: string; x: number; y: number; w: number; h: number }
export type Shapes = Array<Partial<BasicRect> & { id: string; kind?: string; [k: string]: any }>

/** 语义单位：英寸。渲染层统一乘以 96，不需要你关心 */
export const inch = (u: number) => u

/** 解析数值（支持 "0x" 十六进制；解析失败返回 null，不抛异常） */
export function toNum(x: any): number | null {
  if (x == null) return null
  if (typeof x === 'number') return Number.isFinite(x) ? x : null
  const s = String(x).trim()
  if (/^0x/i.test(s)) {
    const v = parseInt(s.replace(/^0x/i, ''), 16)
    return Number.isFinite(v) ? v : null
  }
  const v = Number(s)
  return Number.isFinite(v) ? v : null
}

/** 在 shapes 中按 id 查 shape；若无则返回 undefined */
export function findShape<T extends { id: string } = any>(shapes: T[], id: string): T | undefined {
  return shapes.find(s => s.id === id)
}

// —— 锚点计算：返回某 shape 的关键点坐标（基于“英寸”坐标系）——
export type Pt = { x: number; y: number }

export function centerOf(shapes: Shapes, id: string): Pt {
  const s: any = findShape(shapes, id); if (!s) return { x: 0, y: 0 }
  return { x: (s.x || 0) + (s.w || 0) / 2, y: (s.y || 0) + (s.h || 0) / 2 }
}
export function leftMid(shapes: Shapes, id: string): Pt {
  const s: any = findShape(shapes, id); if (!s) return { x: 0, y: 0 }
  return { x: (s.x || 0), y: (s.y || 0) + (s.h || 0) / 2 }
}
export function rightMid(shapes: Shapes, id: string): Pt {
  const s: any = findShape(shapes, id); if (!s) return { x: 0, y: 0 }
  return { x: (s.x || 0) + (s.w || 0), y: (s.y || 0) + (s.h || 0) / 2 }
}
export function topMid(shapes: Shapes, id: string): Pt {
  const s: any = findShape(shapes, id); if (!s) return { x: 0, y: 0 }
  return { x: (s.x || 0) + (s.w || 0) / 2, y: (s.y || 0) }
}
export function bottomMid(shapes: Shapes, id: string): Pt {
  const s: any = findShape(shapes, id); if (!s) return { x: 0, y: 0 }
  return { x: (s.x || 0) + (s.w || 0) / 2, y: (s.y || 0) + (s.h || 0) }
}

/** 根据两个锚点生成一条箭头（仍然是英寸坐标；渲染层会转换为 px） */
export function arrowBetween(
  _shapes: Shapes,
  id: string,
  from: Pt,
  to: Pt,
  opts?: { color?: string; width?: number; dx1?: number; dy1?: number; dx2?: number; dy2?: number }
) {
  const x1 = from.x + (opts?.dx1 ?? 0)
  const y1 = from.y + (opts?.dy1 ?? 0)
  const x2 = to.x + (opts?.dx2 ?? 0)
  const y2 = to.y + (opts?.dy2 ?? 0)
  return { kind: 'arrow', id, x1, y1, x2, y2, color: opts?.color ?? '#94a3b8', width: opts?.width ?? 2 }
}

/** 按固定宽高在 box 内横排 n 个元素并垂直居中 */
export function layoutRowInBox(
  box:{x:number;y:number;w:number;h:number},
  n:number,
  laneW:number,
  laneH:number
){
  const gapX = (box.w - n*laneW) / (n+1)
  const y    = box.y + (box.h - laneH) / 2
  return Array.from({length:n}, (_,i)=>({
    x: box.x + gapX + i*(laneW + gapX),
    y, w: laneW, h: laneH
  }))
}

/** 由寄存器位宽/元素位宽得出演示用元素数（1~8），以及原始可容纳数 */
export function vectorSlotsFromEnv(
  env: any,
  opts?: { maxSlots?: number; defaultRegBits?: number; defaultElemBits?: number }
) {
  const maxSlots = opts?.maxSlots ?? 8
  const defReg   = opts?.defaultRegBits ?? 128
  const defElem  = opts?.defaultElemBits ?? 32

  // 通用命名优先；兼容 RVV 的 VLEN/SEW
  const regBits  = Number(env?.vector?.regBits ?? env?.regBits ?? env?.VLEN ?? defReg)
  const elemBits = Number(env?.vector?.elemBits ?? env?.elemBits ?? env?.SEW  ?? defElem)

  const rawSlots = Math.max(1, Math.floor(regBits / Math.max(1, elemBits)))
  const slots    = Math.max(1, Math.min(maxSlots, rawSlots))
  return { regBits, elemBits, rawSlots, slots }
}

/**
 * 在 box 内以“正方形”排布 n 个 lane，自动缩小边长保证放得下；垂直居中。
 * 返回 { side, gapX, lanes[] }，其中 side==w==h。
 */
export function layoutRowInBoxSquare(
  box: { x:number; y:number; w:number; h:number },
  n: number,
  preferSide: number,              // 例如 0.8（英寸）
  opts?: { gap?: number; minSide?: number }
) {
  // 动态间距：元素越多，默认 gap 越小，避免“被挤瘦”
  const gap = opts?.gap ?? (n >= 8 ? 0.10 : n >= 6 ? 0.14 : 0.18)
  const minSide = opts?.minSide ?? 0.34

  // 在保证正方形的前提下，尽量取 preferSide；不够就按宽度算一个可放下的边长
  let side = Math.min(
    preferSide,
    (box.w - (n + 1) * gap) / n
  )
  side = Math.max(minSide, side)

  const y = box.y + (box.h - side) / 2
  const gapX = (box.w - n * side) / (n + 1)

  return {
    side, gapX,
    lanes: Array.from({ length: n }, (_, i) => ({
      x: box.x + gapX + i * (side + gapX), y, w: side, h: side,
    }))
  }
}

/**
 * 在寄存器组上方画“位宽标尺”（双向箭头 + 文本）。文本仅用纯文字，无底色。
 * 支持把“总元素数”并排到位宽后：256-bit · 32 elems
 */
export function bitWidthRulerForBox(
  box: { x:number; y:number; w:number; h:number },
  bits: number,
  idPrefix: string,
  yGap: number = 0.40,
  opts?: { elems?: number }
) {
  const cy = box.y - yGap
  const cx = box.x + box.w / 2
  const text = `${bits}-bit${opts?.elems ? ` · ${opts.elems} elems` : ''}`
  return [
    // 端点往内缩，避免压到圆角
    { kind: 'arrow', id: `${idPrefix}__l`, x1: cx - 0.01, y1: cy, x2: box.x + 0.12,           y2: cy, color: '#64748b', width: 1 },
    { kind: 'arrow', id: `${idPrefix}__r`, x1: cx + 0.01, y1: cy, x2: box.x + box.w - 0.12,   y2: cy, color: '#64748b', width: 1 },
    // 纯文字，无底色
    { kind: 'text',  id: `${idPrefix}__t`, x:  cx,       y:  cy - 0.20, text, size: 14, color: '#334155', align: 'center' },
  ]
}