import type { AsmAst } from './types'
import { getHandler } from './registry'

export function astToDsl(ast: AsmAst): string {
  const fn = getHandler(ast)
  if (fn) return fn(ast)
  // 没有注册的默认兜底
  return [
    `step(s1,"${ast.opcode}.${ast.form}")`,
    `label(info, 2.5,1.2, "${ast.operands.join(' ')}")`,
    `appear(info, s1)`,
  ].join('\n')
}