// src/lang/index.ts
import './autoreg'  // ★ 先执行自注册（会间接 import registry，再加载所有 *.instr.ts）

import { parseOneLine, type Ast, type ParseError } from './core'
import { RVV } from './architectures/rvv'

export { type Ast, type ParseError }

export function parseAsm(arch: string, source: string) {
  const a = arch.toLowerCase()
  if (a === 'rvv') return parseOneLine(RVV, source)
  return { errors: [{ line:1, col:1, message:`暂不支持架构 ${arch}` }] }
}
