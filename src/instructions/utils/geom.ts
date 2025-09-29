// src/instructions/utils/geom.ts
// 通用几何/数值辅助（指令无关 / 架构无关）

export type BasicRect = { id: string; x: number; y: number; w: number; h: number }
export type Shapes = Array<Partial<BasicRect> & { id: string; kind?: string; [k: string]: any }>

/** 语义单位：英寸。Canvas 渲染层会统一乘以 96，不需要你关心 */
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
  shapes: Shapes,
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

// utils/geom.ts
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