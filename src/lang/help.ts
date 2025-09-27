import type { AsmAst } from './types'
import { miniDocOf, makeKey, getUsage } from './registry'

// 兼容两种签名：usageOf(ast) / usageOf(arch, opcode, form)
export function usageOf(a: AsmAst): any
export function usageOf(arch: string, opcode: string, form: string): any
export function usageOf(...args: any[]): any {
  const key = args.length === 1
    ? makeKey(args[0] as AsmAst)
    : `${args[0]}.${args[1]}.${args[2]}`
  const doc = miniDocOf(key)
  if (doc) return doc                       // ✅ LeftPanel 会拿到 {usage, scenarios, ...}
  // 兼容旧逻辑：只返回一行 usage 文本
  return getUsage(typeof args[0] === 'string'
    ? { arch: args[0], opcode: args[1], form: args[2], operands: [] } as AsmAst
    : args[0])
}