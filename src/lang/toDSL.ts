// src/lang/toDsl.ts
import type { AsmAst } from './types'
import { rvvVaddToDsl } from './rvv/vadd'
import { rvvVsubToDsl } from './rvv/vsub'
import { rvvVmulToDsl } from './rvv/vmul'

export function astToDsl(ast: AsmAst): string {
  const key = `${ast.arch}:${ast.opcode}.${ast.form}`.toLowerCase()
  switch (key) {
    case 'rvv:vadd.vv': return rvvVaddToDsl(ast)
    case 'rvv:vsub.vv': return rvvVsubToDsl(ast)
    case 'rvv:vmul.vv': return rvvVmulToDsl(ast)
    default:
      return [
        `step(s1,"${ast.opcode}.${ast.form}")`,
        `label(info, 1,1, "${ast.operands.join(' ')}")`,
        `appear(info, s1)`,
      ].join('\n')
  }
}
