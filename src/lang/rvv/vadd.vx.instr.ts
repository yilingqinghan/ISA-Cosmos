// src/lang/rvv/vadd_vx.ts
import type { AsmAst } from '../types'
import { registerHandler, registerInstr, registerUsage, registerMiniDoc } from '../registry'
import type { InstrSpec } from '../core'

registerUsage('rvv.vadd.vx', 'vadd.vx vd, vs2, rs1  ; 向量-标量加法：vd[i] = vs2[i] + rs1')

registerMiniDoc('rvv.vadd.vx', {
  usage: 'vadd.vx vd, vs2, rs1 ；向量-标量加法：vd[i] = vs2[i] + rs1',
  scenarios: ['向量偏移计算', '常数加法', '地址计算'],
  notes: ['标量 rs1 会根据需要做符号扩展/截断以匹配 SEW', '支持掩码 vm'],
  exceptions: ['无']
})

const spec: InstrSpec = {
  opcode: 'vadd',
  forms: {
    vx: { operands: [
      { kind:'vreg', role:'vd'  },
      { kind:'vreg', role:'vs2' },
      { kind:'xreg', role:'rs1' },
    ] }
  }
}
registerInstr('rvv', spec)

// ---- 画面几何 ----
const REG_START_X = 2.60
const REG_STEP    = 0.31
const REG_Y       = 0.00
const REG_W       = 0.25
const REG_H       = 0.25

function vxToIndex(v: string): number {
  const m = v.trim().match(/^v(\d+)$/i)
  return m ? Math.max(0, Math.min(31, parseInt(m[1], 10))) : 0
}
function xi(i: number) { return +(REG_START_X + REG_STEP * i).toFixed(2) }

export function rvvVaddVxToDsl(ast: AsmAst): string {
  const [vdRaw, vs2Raw, rs1Raw] = ast.operands
  const vd  = (vdRaw  || 'v0').trim()
  const vs2 = (vs2Raw || 'v1').trim()
  const rs1 = (rs1Raw || 'x10').trim()

  const idVd  = vxToIndex(vd)
  const idV2  = vxToIndex(vs2)

  const lo = Math.min(idVd, idV2)
  const hi = Math.max(idVd, idV2)
  const selCount = hi - lo + 1
  const selX = +(xi(lo) - 0.10).toFixed(2)
  const selW = +(REG_STEP * selCount + 0.20).toFixed(2)
  const selY = -0.04
  const selH =  0.38

  const arrowStartX = +(selX + selW / 2).toFixed(2)
  const arrowStartY =  0.45
  const arrowEndX   =  6.00
  const arrowEndY   =  1.00

  const topRowRects: string[] = []
  for (let i = 0; i < 32; i++) {
    const color = (i === idV2 || i === idVd) ? 'teal' : 'lightgray'
    topRowRects.push(
      `rect(rf_v${i}, ${REG_W}, ${REG_H}, ${xi(i)}, ${REG_Y.toFixed(2)}, "v${i}", ${color})`
    )
  }

  const v2Init = '10,11,12,13'
  const scalarVal = '2' // 仅示意；真实数值视右上控件/仿真来源而定

  return `# ----------------------------------------------------
# RVV vadd.vx：4-lane (VLEN=128, SEW=32)
# 叙事：
#   s0 顶部展示 VRF 的 32 个向量寄存器，明确源: ${vs2}，目标: ${vd}；右侧提示标量 ${rs1}
#   s1 载入与对齐
#   s2 位宽解释
#   s3 逐 lane 相加（标量广播）
#   s4 写回结果
# ----------------------------------------------------

step(s0,"选择寄存器 / 标量")
step(s1,"第一步：载入与对齐")
step(s2,"第二步：位宽（128-bit = 4 × 32-bit）")
step(s3,"第三步：逐 lane 相加：${vd}[i] = ${vs2}[i] + ${rs1}")
step(s4,"第四步：写回结果")

# =============== s0：VRF 顶行（32 个寄存器，一排） ===============
text(vrf_title, 2.60, -0.28, "VRF（32 × 向量寄存器）", 14, #111827)
text(vrf_legend, 5.80, -0.28, "源: ${vs2}   目标: ${vd}   标量: ${rs1}", 14, #0f172a)

group(reg_row, 2.50, -0.12, 10.40, 0.44, dotted)
pack_default(off)
nopack_prefix("rf_")

${topRowRects.join('\n')}

group(sel_box, ${selX}, ${selY}, ${selW}, ${selH}, dotted)
arrow(sel_to_zoom, ${arrowStartX}, ${arrowStartY}, ${arrowEndX}, ${arrowEndY}, 2.0, "", true, #111827, false, true)

appear(vrf_title, vrf_legend, reg_row, ${Array.from({length:32},(_,i)=>`rf_v${i}`).join(', ')}, sel_box, sel_to_zoom, s0)
blink(rf_v${idV2}, rf_v${idVd}, s0, 6, 450)

pack(${vs2}, ${vd})

# =============== s1：载入与对齐（进入放大视图） ===============
label(tag_${vs2}, 2.8, 2.4, "${vs2}")
label(tag_${vd},  2.8, 4.2, "${vd}")
label(tag_sca,   2.8, 1.1, "${rs1}")

vec4(${vs2}, 4.0, 2.4, "${v2Init}", teal, x, 0.2)
square(rs1_box, 4.0, 1.1, "${scalarVal}", lightgray)

disappear(vrf_title, vrf_legend, reg_row, ${Array.from({length:32},(_,i)=>`rf_v${i}`).join(', ')}, sel_box, sel_to_zoom, s1)
appear(tag_${vs2}, tag_${vd}, tag_sca, ${vs2}, ${vs2}__box, rs1_box, s1)

# =============== s2：位宽解释（128-bit = 4 × 32-bit） ===============
label(dim, 4.8, 0.2, "向量位宽 128-bit（4 × 32-bit）")
text(b0, 4.3, 0.60, "32b", 14)
text(b1, 5.5, 0.60, "32b", 14)
text(b2, 6.7, 0.60, "32b", 14)
text(b3, 7.95,0.60, "32b", 14)
appear(dim, b0, b1, b2, b3, s2)
blink(dim, s2, 4, 300)

# =============== s3：逐 lane 相加（标量广播） ===============
vec4(${vd}, 4.0, 3.8, "", lightgray, x, 0.2, nobox)
line(l1, 3.6, 3.65, 8.8, 3.65, 3.3, black)
text(plus, 3.34, 3.5, "+", 40)
arrow(bcast0, 4.0, 1.2, 4.0, 2.2, 1.8, "", true, #0EA5E9, false, true)
arrow(bcast1, 5.2, 1.2, 5.2, 2.2, 1.8, "", true, #0EA5E9, false, true)
arrow(bcast2, 6.4, 1.2, 6.4, 2.2, 1.8, "", true, #0EA5E9, false, true)
arrow(bcast3, 7.6, 1.2, 7.6, 2.2, 1.8, "", true, #0EA5E9, false, true)

appear(tag_${vd}, ${vd}, l1, plus, bcast0, bcast1, bcast2, bcast3, s3)
blink(l1, plus, s3, 3, 240)

# =============== s4：写回结果（覆盖 ${vd} 空槽） ===============
square(z0, 4.0, 3.8, "12", teal)
square(z1, 5.2, 3.8, "13", teal)
square(z2, 6.4, 3.8, "14", teal)
square(z3, 7.6, 3.8, "15", teal)
disappear(${vd}[0..3], s4)
appear(z0, z1, z2, z3, s4)
blink(z0, z1, z2, z3, s4, 2, 300)
`
}

registerHandler('rvv:vadd.vx', rvvVaddVxToDsl)