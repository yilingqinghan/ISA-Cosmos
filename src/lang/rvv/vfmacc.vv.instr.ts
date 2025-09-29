// src/lang/rvv/vfmacc.ts
import type { AsmAst } from '../types'
import { registerHandler, registerInstr, registerUsage, registerMiniDoc } from '../registry'
import type { InstrSpec } from '../core'

registerUsage('rvv.vfmacc.vv', 'vfmacc.vv vd, vs1, vs2  ; 浮点乘加累积：vd[i] = vd[i] + (vs1[i] * vs2[i])')

registerMiniDoc('rvv.vfmacc.vv', {
  usage: 'vfmacc.vv vd, vs1, vs2 ；浮点乘加累积：vd[i] = vd[i] + (vs1[i] * vs2[i])',
  scenarios: ['矩阵乘法', '点积计算', '卷积神经网络'],
  notes: ['融合乘加操作，中间结果不舍入，提高精度和性能', '支持 SEW=32/64 与掩码 vm'],
  exceptions: ['浮点异常（无效、溢出、下溢、不精确、除零）']
})

const spec: InstrSpec = {
  opcode: 'vfmacc',
  forms: {
    vv: { operands: [
      { kind:'vreg', role:'vd'  },
      { kind:'vreg', role:'vs1' },
      { kind:'vreg', role:'vs2' },
    ] }
  }
}
registerInstr('rvv', spec)

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

export function rvvVfmaccToDsl(ast: AsmAst): string {
  const [vdRaw, vs1Raw, vs2Raw] = ast.operands
  const vd  = (vdRaw || 'v0').trim()
  const vs1 = (vs1Raw || 'v1').trim()
  const vs2 = (vs2Raw || 'v2').trim()

  const idVd  = vxToIndex(vd)
  const idV1  = vxToIndex(vs1)
  const idV2  = vxToIndex(vs2)

  const lo = Math.min(idVd, idV1, idV2)
  const hi = Math.max(idVd, idV1, idV2)
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
    const color = (i === idV1 || i === idV2 || i === idVd) ? 'teal' : 'lightgray'
    topRowRects.push(
      `rect(rf_v${i}, ${REG_W}, ${REG_H}, ${xi(i)}, ${REG_Y.toFixed(2)}, "v${i}", ${color})`
    )
  }

  const vdInit = '10,20,30,40'
  const v1Init = '1.0,2.0,3.0,4.0'
  const v2Init = '0.5,1.5,2.5,3.5'

  return `# ----------------------------------------------------
# RVV vfmacc.vv：4-lane (VLEN=128, SEW=32/64)
# 叙事：
#   s0 顶部展示 VRF 的 32 个向量寄存器，突出 ${vs1}/${vs2} 与累加寄存器 ${vd}
#   s1 放大：载入 ${vs1}, ${vs2}, ${vd}（原值）
#   s2 乘法阶段：逐 lane 计算 p[i] = ${vs1}[i] × ${vs2}[i]
#   s3 累加阶段：${vd}[i] = ${vd}[i] + p[i]
#   s4 写回结果
# ----------------------------------------------------

step(s0,"选择寄存器")
step(s1,"载入与对齐（放大区）")
step(s2,"乘法：p[i] = ${vs1}[i] × ${vs2}[i]")
step(s3,"累加：${vd}[i] = ${vd}[i] + p[i]")
step(s4,"写回结果")

text(vrf_title, 2.60, -0.28, "VRF（32 × 向量寄存器）", 14, #111827)
text(vrf_legend, 5.60, -0.28, "源: ${vs1}, ${vs2}    累加/目标: ${vd}", 14, #0f172a)

group(reg_row, 2.50, -0.12, 10.40, 0.44, dotted)
pack_default(off)
nopack_prefix("rf_")

${topRowRects.join('\n')}

group(sel_box, ${selX}, ${selY}, ${selW}, ${selH}, dotted)
arrow(sel_to_zoom, ${arrowStartX}, ${arrowStartY}, ${arrowEndX}, ${arrowEndY}, 2.0, "", true, #111827, false, true)

appear(vrf_title, vrf_legend, reg_row, ${Array.from({length:32},(_,i)=>`rf_v${i}`).join(', ')}, sel_box, sel_to_zoom, s0)
blink(rf_v${idV1}, rf_v${idV2}, rf_v${idVd}, s0, 6, 450)
pack(${vs1}, ${vs2}, ${vd})

label(tag_${vs1}, 2.8, 1.3, "${vs1}")
label(tag_${vs2}, 2.8, 2.6, "${vs2}")
label(tag_${vd},  2.8, 3.9, "${vd}")

vec4(${vs1}, 4.0, 1.0, "${v1Init}", lightgray, x, 0.2)
vec4(${vs2}, 4.0, 2.3, "${v2Init}", teal,      x, 0.2)
vec4(${vd},  4.0, 3.6, "${vdInit}", teal,      x, 0.2)

disappear(vrf_title, vrf_legend, reg_row, ${Array.from({length:32},(_,i)=>`rf_v${i}`).join(', ')}, sel_box, sel_to_zoom, s1)
appear(tag_${vs1}, tag_${vs2}, tag_${vd}, ${vs1}, ${vs2}, ${vd}, ${vs1}__box, ${vs2}__box, ${vd}__box, s1)

label(dim, 4.8, 0.2, "向量位宽 128-bit（示例）")
appear(dim, s1)

group(mul_box, 3.6, 0.86, 6.0, 2.20, dotted)
text(mul_sign, 3.34, 1.7, "×", 40)
line(mul_sep, 3.6, 2.05, 9.0, 2.05, 2.0, #111827)

square(p0, 4.0, 2.7, "", lightgray)
square(p1, 5.2, 2.7, "", lightgray)
square(p2, 6.4, 2.7, "", lightgray)
square(p3, 7.6, 2.7, "", lightgray)

arrow(a_m0, 4.6, 1.35, 4.6, 2.55, 1.8, "", true, #0EA5E9, false, true)
arrow(a_m1, 5.8, 1.35, 5.8, 2.55, 1.8, "", true, #0EA5E9, false, true)
arrow(a_m2, 7.0, 1.35, 7.0, 2.55, 1.8, "", true, #0EA5E9, false, true)
arrow(a_m3, 8.2, 1.35, 8.2, 2.55, 1.8, "", true, #0EA5E9, false, true)

appear(mul_box, mul_sign, mul_sep, p0, p1, p2, p3, a_m0, a_m1, a_m2, a_m3, s2)
blink(mul_sign, s2, 3, 280)

group(add_box, 3.6, 3.35, 6.0, 1.10, dotted)
text(add_sign, 3.34, 3.5, "+", 40)
line(add_sep, 3.6, 3.65, 9.0, 3.65, 2.0, #111827)

arrow(a_a0, 4.6, 2.90, 4.6, 3.50, 1.8, "", true, #22d3ee, false, true)
arrow(a_a1, 5.8, 2.90, 5.8, 3.50, 1.8, "", true, #22d3ee, false, true)
arrow(a_a2, 7.0, 2.90, 7.0, 3.50, 1.8, "", true, #22d3ee, false, true)
arrow(a_a3, 8.2, 2.90, 8.2, 3.50, 1.8, "", true, #22d3ee, false, true)

appear(add_box, add_sign, add_sep, a_a0, a_a1, a_a2, a_a3, s3)
blink(add_sign, s3, 3, 280)

square(z0, 4.0, 3.6, "", teal)
square(z1, 5.2, 3.6, "", teal)
square(z2, 6.4, 3.6, "", teal)
square(z3, 7.6, 3.6, "", teal)

disappear(${vd}[0..3], s4)
appear(z0, z1, z2, z3, s4)
blink(z0, z1, z2, z3, s4, 2, 300)
`
}

registerHandler('rvv:vfmacc.vv', rvvVfmaccToDsl)