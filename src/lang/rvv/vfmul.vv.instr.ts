// src/lang/rvv/vfmul.ts
import type { AsmAst } from '../types'
import { registerHandler, registerInstr, registerUsage, registerMiniDoc } from '../registry'
import type { InstrSpec } from '../core'

registerUsage('rvv.vfmul.vv', 'vfmul.vv vd, vs1, vs2  ; 向量浮点乘法：vd[i] = vs1[i] * vs2[i]')

registerMiniDoc('rvv.vfmul.vv', {
  usage: 'vfmul.vv vd, vs1, vs2 ；向量-向量浮点乘法：vd[i] = vs1[i] * vs2[i]',
  scenarios: ['矩阵乘法', '卷积计算', '科学模拟'],
  notes: ['遵循 IEEE 754-2008 浮点标准', 'SEW 支持 32/64，舍入模式由 fcsr.frm 控制', '支持掩码 vm'],
  exceptions: ['浮点异常（无效、不精确、溢出、下溢、除零）']
})

const spec: InstrSpec = {
  opcode: 'vfmul',
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

export function rvvVfmulToDsl(ast: AsmAst): string {
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
    topRowRects.push(`rect(rf_v${i}, ${REG_W}, ${REG_H}, ${xi(i)}, ${REG_Y.toFixed(2)}, "v${i}", ${color})`)
  }

  const v1Init = '1.0,2.0,3.0,4.0'
  const v2Init = '10.0,11.0,12.0,13.0'

  return `# ----------------------------------------------------
# RVV vfmul.vv：4-lane (VLEN=128, SEW=32/64)
# 叙事：
#   s0 顶部展示 VRF 的 32 个向量寄存器，明确源: ${vs1}/${vs2}，目标: ${vd}
#   s1 载入与对齐
#   s2 位宽解释
#   s3 逐 lane 浮点相乘
#   s4 写回结果
# ----------------------------------------------------

step(s0,"选择寄存器")
step(s1,"第一步：载入与对齐")
step(s2,"第二步：位宽（128-bit = 4 × 32-bit）或（2 × 64-bit）")
step(s3,"第三步：逐 lane 浮点相乘：${vd}[i] = ${vs1}[i] × ${vs2}[i]")
step(s4,"第四步：写回结果")

text(vrf_title, 2.60, -0.28, "VRF（32 × 向量寄存器）", 14, #111827)
text(vrf_legend, 5.80, -0.28, "源寄存器: ${vs1}, ${vs2}    目标寄存器: ${vd}", 14, #0f172a)

group(reg_row, 2.50, -0.12, 10.40, 0.44, dotted)
pack_default(off)
nopack_prefix("rf_")

${topRowRects.join('\n')}

group(sel_box, ${selX}, ${selY}, ${selW}, ${selH}, dotted)
arrow(sel_to_zoom, ${arrowStartX}, ${arrowStartY}, ${arrowEndX}, ${arrowEndY}, 2.0, "", true, #111827, false, true)

appear(vrf_title, vrf_legend, reg_row, ${Array.from({length:32},(_,i)=>`rf_v${i}`).join(', ')}, sel_box, sel_to_zoom, s0)
blink(rf_v${idV1}, rf_v${idV2}, rf_v${idVd}, s0, 6, 450)

pack(${vs1}, ${vs2}, ${vd})

label(tag_${vs1}, 2.8, 1.5, "${vs1}")
label(tag_${vs2}, 2.8, 2.8, "${vs2}")
label(tag_${vd},  2.8, 4.2, "${vd}")

vec4(${vs1}, 4.0, 1.1, "${v1Init}", lightgray, x, 0.2)
vec4(${vs2}, 4.0, 2.4, "${v2Init}", teal,      x, 0.2)

disappear(vrf_title, vrf_legend, reg_row, ${Array.from({length:32},(_,i)=>`rf_v${i}`).join(', ')}, sel_box, sel_to_zoom, s1)
appear(tag_${vs1}, tag_${vs2}, ${vs1}, ${vs2}, ${vs1}__box, ${vs2}__box, s1)

label(dim, 4.8, 0.2, "向量位宽 128-bit（4 × 32-bit）/（2 × 64-bit）")
text(b0, 4.3, 0.60, "32/64b", 14)
text(b1, 5.5, 0.60, "32/64b", 14)
text(b2, 6.7, 0.60, "32/64b", 14)
text(b3, 7.95,0.60, "32/64b", 14)
appear(dim, b0, b1, b2, b3, s2)
blink(dim, s2, 4, 300)

vec4(${vd}, 4.0, 3.8, "", lightgray, x, 0.2, nobox)
line(l1, 3.6, 3.65, 8.8, 3.65, 3.3, black)
text(mul, 3.34, 3.5, "×", 40)
appear(tag_${vd}, ${vd}, l1, mul, s3)
blink(l1, mul, s3, 3, 240)

square(z0, 4.0, 3.8, "10.0", teal)
square(z1, 5.2, 3.8, "22.0", teal)
square(z2, 6.4, 3.8, "36.0", teal)
square(z3, 7.6, 3.8, "52.0", teal)
disappear(${vd}[0..3], s4)
appear(z0, z1, z2, z3, s4)
blink(z0, z1, z2, z3, s4, 2, 300)
`
}

registerHandler('rvv:vfmul.vv', rvvVfmulToDsl)