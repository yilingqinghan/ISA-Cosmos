import type { DSLDoc } from '../utils/parse'
export interface InstructionMeta { usage: string; scenarios: string[]; notes: string[]; exceptions: string[] }
export interface BuildCtx {
  arch: string; opcode: string; form: string;
  operands: string[]; env?: { VL?: number; SEW?: number };
  values?: Record<string, Array<number|string>>;
}
export interface InstructionModule {
  id: string; title: string; sample?: string; meta?: InstructionMeta;
  build(ctx: BuildCtx): DSLDoc;
}

export interface ValidationError {
  message: string
  col?: number
}

export interface InstructionSetValidator {
  arch: string
  validate(ast: { arch: string; opcode: string; form: string; operands: string[] }): ValidationError[]
}