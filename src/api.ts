
export type FetchParams = {
  arch: string; opcode: string; form: string;
  vd: string; vs1: string; vs2: string;
  vlen: number; sew: number;
}
export type ServerDoc = {
  dsl?: string
  doc?: any               // 直接返回已解析的 DSLDoc 也支持
  stepMap?: Record<string, number> // id -> stepIndex
  steps?: number          // 总步骤数（可选；若无则取 stepMap 的 max+1）
}
