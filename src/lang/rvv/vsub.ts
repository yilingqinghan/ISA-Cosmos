// src/lang/rvv/vsub.ts
import type { AsmAst } from '../types'

/** RVV vsub.vv → DSL（占位原型，可再细化成和 vadd 一样的完整叙事） */
export function rvvVsubToDsl(ast: AsmAst): string {
  const [vd = 'v0', vs1 = 'v1', vs2 = 'v2'] = ast.operands
  return [
    `step(s1,"${vd} = ${vs1} - ${vs2}")`,
    `label(hint, 2, 1, "vsub.vv 原型（待完善）", 14)`,
    `appear(hint, s1)`,
  ].join('\n')
}
