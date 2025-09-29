// src/lang/rvv/vle.ts
import type { AsmAst } from '../types'
import { registerHandler, registerInstr, registerUsage, registerMiniDoc } from '../registry'
import type { InstrSpec } from '../core'

registerUsage('rvv.vle.v', 'vle.v vd, (rs1)  ; 向量加载：vd[i] = Mem[rs1 + i*EEW/8]')

registerMiniDoc('rvv.vle.v', {
  usage: 'vle.v vd, (rs1)[, vm] ；从 rs1 地址开始按 EEW 加载到向量寄存器',
  scenarios: ['向量数据加载', '数组处理', '矩阵操作'],
  notes: ['EEW 为有效元素宽度（8/16/32/64）', '加载元素数量由 vl 决定，单位步长加载', '支持掩码 vm'],
  exceptions: ['地址未对齐可能触发地址未对齐异常']
})

const spec: InstrSpec = {
  opcode: 'vle',
  forms: {
    v: { operands: [
      { kind:'vreg', role:'vd'  },
      { kind:'xreg', role:'rs1' },
    ] }
  }
}
registerInstr('rvv', spec)

export function rvvVleToDsl(ast: AsmAst): string {
  const [vdRaw, rs1Raw] = ast.operands
  const vd  = (vdRaw  || 'v0').trim()
  const rs1 = (rs1Raw || 'x0').trim()

  const memVals = '10,11,12,13'

  return `# ----------------------------------------------------
# RVV vle.v：示意 EEW=32b（4 lane）从内存加载到 ${vd}
# ----------------------------------------------------

step(s0,"准备与地址")
step(s1,"按 EEW 逐 lane 加载")
step(s2,"写入寄存器 ${vd}")

# 标签
label(tag_mem, 2.6, 1.0, "Mem[${rs1} ...]")
label(tag_vd,  2.6, 3.6, "${vd}")
label(dim,     5.8, 0.2, "EEW = 32b（示意）")

# 内存行（用 vec4 作为内存四槽的示意）
vec4(mem, 4.0, 1.2, "${memVals}", lightgray, x, 0.2)

# 目标向量占位（写回前为空）
vec4(${vd}, 4.0, 3.8, "", lightgray, x, 0.2, nobox)

# 引导线与箭头
line(base, 3.6, 2.6, 8.8, 2.6, 2.0, #111827)
text(opx,  3.30, 2.38, "↓", 36)

arrow(a0, 4.60, 1.70, 4.60, 3.40, 2.0, "", true, #0EA5E9, false, true)
arrow(a1, 5.80, 1.70, 5.80, 3.40, 2.0, "", true, #0EA5E9, false, true)
arrow(a2, 7.00, 1.70, 7.00, 3.40, 2.0, "", true, #0EA5E9, false, true)
arrow(a3, 8.20, 1.70, 8.20, 3.40, 2.0, "", true, #0EA5E9, false, true)

# 编排
appear(tag_mem, tag_vd, dim, mem, mem__box, base, opx, s0)

# 加载动画（依次出现箭头，并闪烁）
appear(a0, s1)
blink(a0, s1, 2, 260)
appear(a1, s1)
blink(a1, s1, 2, 260)
appear(a2, s1)
blink(a2, s1, 2, 260)
appear(a3, s1)
blink(a3, s1, 2, 260)

# 写回（将 mem 的四槽值落到 ${vd}）
square(z0, 4.0, 3.8, "10", teal)
square(z1, 5.2, 3.8, "11", teal)
square(z2, 6.4, 3.8, "12", teal)
square(z3, 7.6, 3.8, "13", teal)
appear(z0, z1, z2, z3, s2)
blink(z0, z1, z2, z3, s2, 2, 300)
`
}

registerHandler('rvv:vle.v', rvvVleToDsl)