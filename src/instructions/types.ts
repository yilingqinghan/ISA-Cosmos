import type { DSLDoc } from '../utils/parse'
export interface BuildCtx {
  arch: string; opcode: string; form: string;
  operands: string[]; env?: { VL?: number; SEW?: number };
  values?: Record<string, Array<number|string>>;
}

export interface ValidationError {
  message: string
  col?: number
}

export interface InstructionSetValidator {
  arch: string
  validate(ast: { arch: string; opcode: string; form: string; operands: string[] }): ValidationError[]
}

export interface InstructionMeta {
  usage: string
  scenarios?: string[]
  notes?: string[]
  exceptions?: string[]
}

export interface Synonym {
  arch: string
  name: string
  note?: string
  example?: string
  intrinsics?: string[]
}

/** 新增：信息提供者（只负责文案/同义指令，不负责动画） */
export interface InstructionInfoProvider {
  /** 必须与动画模块的 id 一致，如 'riscv/vadd.vv' */
  id: string
  /** 多语言：使用 tr('中','英')，返回当前语言的 meta */
  metaGetter?: () => InstructionMeta
  /** 多语言：返回当前语言的同义指令列表 */
  synonymsGetter?: () => Synonym[]
}

/** 现有：动画模块 */
export interface InstructionModule {
  id: string
  title: string
  sample?: string
  /** 可选：以后逐步移除，改由 .info.ts 提供 */
  meta?: InstructionMeta | (() => InstructionMeta)
  build(ctx: BuildCtx): any
}