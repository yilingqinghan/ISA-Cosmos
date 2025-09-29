import type { DSLDoc } from '../utils/parse';

export interface BuildCtx {
  // 需要的话可加 VL、SEW、UI 配置等
}

export interface InstructionModule {
  id: string;            // 'rvv/vadd.vv'
  title: string;         // 'vadd.vv'
  build(ctx: BuildCtx): DSLDoc;   // 直接产出 DSLDoc，避免再反解析
}