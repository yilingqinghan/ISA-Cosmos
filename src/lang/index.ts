import { parseOneLine, type Ast, type ParseError } from './core'
import { RVV } from './architectures/rvv'

export { type Ast, type ParseError }

export function parseAsm(arch: string, source: string): { ast?: Ast, errors: ParseError[] } {
  const a = arch.toLowerCase()
  if (a === 'rvv') return parseOneLine(RVV, source)
  // 其他架构在此分发：ARM SVE、AVX512...
  return { errors: [{ line:1, col:1, message:`暂不支持架构 ${arch}` }] }
}
