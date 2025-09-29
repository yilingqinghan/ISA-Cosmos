import type { DSLDoc } from '../utils/parse'

export interface InstructionMeta {
  usage: string
  scenarios: string[]
  notes: string[]
  exceptions: string[]
}

export interface InstructionModule {
  id: string            // e.g. 'rvv/vadd.vv'
  title: string         // display name
  sample?: string       // optional sample line for catalog/list
  meta?: InstructionMeta// optional mini doc to show in Usage panel
  build(ctx: any): DSLDoc   // produce the visual doc directly
}
