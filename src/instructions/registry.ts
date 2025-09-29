import type { InstructionModule, InstructionMeta, InstructionSetValidator } from './types'

// 自动加载本目录下所有 .ts（包含模块与校验器）
const modules = import.meta.glob('./**/*.ts', { eager: true }) as Record<string, any>

export const instructionRegistry: Record<string, InstructionModule> = {}
export const miniDocs: Record<string, InstructionMeta> = {}
const validators: InstructionSetValidator[] = []

function isModule(x: any): x is InstructionModule {
  return x && typeof x === 'object' && typeof x.id === 'string' && typeof x.build === 'function'
}
function isValidator(x: any): x is InstructionSetValidator {
  return x && typeof x === 'object' && typeof x.arch === 'string' && typeof x.validate === 'function'
}

for (const p in modules) {
  const mod = modules[p]
  const candidates: any[] = []
  if (isModule(mod?.default)) candidates.push(mod.default)
  for (const k of Object.keys(mod)) {
    if (k === 'default') continue
    const v = (mod as any)[k]
    if (isModule(v) || isValidator(v)) candidates.push(v)
  }
  for (const c of candidates) {
    if (isModule(c)) {
      instructionRegistry[c.id] = c
      if (c.meta) {
        miniDocs[c.id] = c.meta
        miniDocs[c.id.replace('/', '.')] = c.meta // 兼容旧键
      }
    } else if (isValidator(c)) {
      validators.push(c)
    }
  }
}

export const getInstrModule = (k: string) => instructionRegistry[k]

// 供 LeftPanel 调用：按 arch 找到对应校验器并汇总错误
export function validateWithRegistry(ast: { arch: string; opcode: string; form: string; operands: string[] }) {
  const errs = validators.filter(v => v.arch === ast.arch).flatMap(v => v.validate(ast))
  return errs
}