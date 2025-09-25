export type ElementType = 'rect' | 'line' | 'arrow' | 'text'

export interface BaseEl { id?: string; type: ElementType; opacity?: number; visible?: boolean }

export interface RectEl extends BaseEl {
  type: 'rect'
  x: number; y: number; w: number; h: number
  fill?: string; stroke?: string; strokeWidth?: number; radius?: number; shadow?: boolean
}
export interface LineEl extends BaseEl {
  type: 'line'
  x1: number; y1: number; x2: number; y2: number
  stroke?: string; strokeWidth?: number; dash?: number[]
}
export interface ArrowEl extends BaseEl {
  type: 'arrow'
  x1: number; y1: number; x2: number; y2: number
  stroke?: string; strokeWidth?: number
}
export interface TextEl extends BaseEl {
  type: 'text'
  x: number; y: number; text: string
  color?: string; font?: string; align?: CanvasTextAlign; baseline?: CanvasTextBaseline
}
export type SceneEl = RectEl | LineEl | ArrowEl | TextEl

export interface GridOptions {
  enabled?: boolean
  type?: 'dots' | 'lines'
  spacing?: number
  color?: string
  dotSize?: number
  lineWidth?: number
  /** 'stage' = 覆盖整个右侧面板（默认）；'scene' = 只在场景逻辑区域内 */
  mode?: 'stage' | 'scene'
}

/** 逻辑场景定义（坐标系） */
export interface Scene {
  elements: SceneEl[]
  bg?: string
  size?: { width: number; height: number }
  fit?: 'contain' | 'cover' | 'none'
  padding?: number
  grid?: GridOptions
}
