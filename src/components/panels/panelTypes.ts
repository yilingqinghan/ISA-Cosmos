import type { DSLDoc } from '../../utils/parse'
export type LaneRect = { id:string; x:number; y:number; w:number; h:number; text?:string; color?:string }
export type VecGroup = { baseId:string; lanes: LaneRect[]; box?: {x:number;y:number;w:number;h:number} }
export type DslOverride = { rev:number; text:string } | { rev:number; doc: DSLDoc }
