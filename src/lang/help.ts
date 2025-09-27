import type { Ast } from './index'

const HELP: Record<string, string> = {
  'rvv.vadd.vv': '向量加法: 逐 lane：vd[i] = vs1[i] + vs2[i]，常用于并行数据处理、科学计算',
  // 继续加：'rvv.vadd.vx': 'vadd.vx vd, vs1, x2 ...'
}

export function usageOf(ast: Ast){
  const key = `${ast.arch}.${ast.opcode}.${ast.form}`.toLowerCase()
  return HELP[key] ?? `${ast.opcode}.${ast.form} ${ast.operands.join(', ')}`
}