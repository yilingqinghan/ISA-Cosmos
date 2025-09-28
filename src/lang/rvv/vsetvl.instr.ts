// src/lang/rvv/vsetvl.ts
import type { AsmAst } from '../types'
import { registerHandler, registerInstr, registerUsage, registerMiniDoc } from '../registry'
import type { InstrSpec } from '../core'

registerUsage('rvv.vsetvl.rr', 'vsetvl rd, rs1, rs2  ; 设置向量长度与类型（vtype ← rs2，vl ← set_vl(rs1, vtype)；若 rd≠x0 写回 vl）')

registerMiniDoc('rvv.vsetvl.rr', {
  usage: 'vsetvl rd, rs1, rs2；动态设置向量配置（vtype=rs2，vl=函数set_vl(rs1, …)）',
  scenarios: ['动态向量配置', '保存/恢复向量上下文'],
  notes: ['比 vsetvli 更灵活，适用于运行时 vtype', 'rd=x0 时不写回，仅更新状态'],
  exceptions: ['若 rs2 中含保留 vtype 值，触发非法指令异常']
})

const spec: InstrSpec = {
  opcode: 'vsetvl',
  forms: {
    rr: { operands: [
      { kind:'xreg', role:'rd'  },
      { kind:'xreg', role:'rs1' },
      { kind:'xreg', role:'rs2' },
    ] }
  }
}
registerInstr('rvv', spec)

export function rvvVsetvlToDsl(ast: AsmAst): string {
  const [rdRaw, rs1Raw, rs2Raw] = ast.operands
  const rd  = (rdRaw  || 'x0').trim()
  const rs1 = (rs1Raw || 'x0').trim()
  const rs2 = (rs2Raw || 'x0').trim()

  return `# ----------------------------------------------------
# RVV vsetvl：设置向量长度与类型（vtype ← ${rs2}，vl ← set_vl(${rs1}, …)，若 ${rd}≠x0 写回）
# ----------------------------------------------------

step(s0,"读取参数")
step(s1,"解码 vtype（来自 ${rs2}）")
step(s2,"计算 vl 并条件写回 ${rd}")

# 顶部标签
label(tag_rd,  2.2, 0.40, "rd = ${rd}")
label(tag_rs1, 2.2, 0.85, "rs1 = ${rs1} (AVL)")
label(tag_rs2, 2.2, 1.30, "rs2 = ${rs2} (vtype)")
appear(tag_rd, tag_rs1, tag_rs2, s0)

# 放大视图区框
group(zone, 3.7, 0.35, 6.8, 3.6, dotted)
appear(zone, s0)

# s1: vtype 展开
label(vtype_t, 4.0, 0.55, "vtype 由 ${rs2} 提供")
rect(vsew, 1.3, 0.6, 4.2, 1.1, "vsew", lightgray)
rect(vlmul,1.3, 0.6, 5.7, 1.1, "vlmul", lightgray)
rect(vta,  1.0, 0.6, 7.1, 1.1, "vta",   lightgray)
rect(vma,  1.0, 0.6, 8.2, 1.1, "vma",   lightgray)
arrow(a_rs2_vtype, 3.0, 1.30, 4.0, 1.10, 1.5, "", true, #111827, false, true)
appear(vtype_t, vsew, vlmul, vta, vma, a_rs2_vtype, s1)
blink(vtype_t, s1, 3, 340)

# s2: set_vl(rs1, …) 计算与写回
label(calc_t, 4.0, 2.10, "vl = set_vl(${rs1}, vlmul, vsew, vta, vma)")
rect(vl_box, 1.3, 0.6, 4.2, 2.65, "vl", teal)
arrow(a_params_vl, 5.7, 1.40, 4.8, 2.65, 1.5, "", true, #0EA5E9, false, true)
arrow(a_avl_vl,   3.0, 0.85, 4.0, 2.65, 1.5, "", true, #0EA5E9, false, true)
appear(calc_t, vl_box, a_params_vl, a_avl_vl, s2)

# 条件写回：rd ≠ x0
label(wr_cond, 6.2, 2.10, "若 rd ≠ x0：写回 rd")
rect(rd_box,  1.6, 0.7, 6.6, 2.65, "${rd}", lightgray)
arrow(a_vl_rd, 5.5, 2.65, 6.6, 2.65, 1.6, "", false, #22d3ee, false, true)
appear(wr_cond, rd_box, a_vl_rd, s2)
blink(rd_box, s2, 2, 300)
`
}

registerHandler('rvv:vsetvl.rr', rvvVsetvlToDsl)