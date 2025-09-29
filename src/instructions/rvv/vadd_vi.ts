import type { InstructionModule, BuildCtx } from '../types'
import { Timeline } from '../timeline'
import {
inch as px,
toNum,
leftMid, rightMid, centerOf,
arrowBetween,
layoutRowInBox,
} from '../utils/geom'

const vaddVI: InstructionModule = {
id: 'rvv/vadd.vi',
title: 'vadd.vi',
sample: 'vadd.vi v0, v1, 5',
meta: {
usage: 'VADD.VI vd, vs2, imm[, vm]；向量-立即数加法：对每个元素 i，若 vm[i]=1 或未提供掩码，则 vd[i] = vs2[i] + sign_extend(imm[4:0])；否则若 vd≠vs2，vd[i] 保持不变。',
scenarios: ['向量偏移计算', '向量常数加法', '数组元素偏移'],
notes: ['立即数范围 -16..+15，按 SEW 符号扩展', '支持掩码 vm；省略等价于全 1', '目的寄存器 vd 可与源寄存器 vs2 同名'],
exceptions: ['无']
},
build(ctx: BuildCtx) {
const [vd = 'v0', vs2 = 'v1', immStr = '0', vm = ''] = ctx.operands || []
const VL = ctx.env?.VL ?? 4

const immRaw = toNum(immStr)
const imm5 = immRaw == null ? 0 : ((immRaw & 0x1f) | ((immRaw & 0x10) ? ~0x1f : 0)) // sign-extend 5-bit
const s2 = (ctx.values?.[vs2] ?? [10, 11, 12, 13]).slice(0, VL)
const vdInit = (ctx.values?.[vd] ?? ['', '', '', '']).slice(0, VL)
const mask = (ctx.values?.[vm] ?? Array(VL).fill(1)).slice(0, VL).map(x => Number(toNum(x) ?? 1) ? 1 : 0)

const out = Array.from({ length: VL }, (_, i) => {
  const a = toNum(s2[i])
  const d0 = toNum(vdInit[i])
  if (mask[i]) {
    return a != null ? String(a + imm5) : ''
  } else {
    if (vd === vs2) return String(a ?? '')
    return d0 != null ? String(d0) : ''
  }
})

const boxS2  = { x: px(1),  y: px(1.2), w: px(4), h: px(1) }
const boxDst = { x: px(8),  y: px(1.2), w: px(4), h: px(1) }
const shapes: any[] = [
  { kind: 'group', id: 's2__box',  ...boxS2 },
  { kind: 'group', id: 'dst__box', ...boxDst },
]

const laneW = 0.8, laneH = 0.8
const s2Lanes  = layoutRowInBox(boxS2,  VL, laneW, laneH)
const dstLanes = layoutRowInBox(boxDst, VL, laneW, laneH)

for (let i = 0; i < VL; i++) shapes.push({ kind: 'rect', id: `s2[${i}]`,  ...s2Lanes[i],  color: 'teal',      text: String(s2[i] ?? ''),  textAlign: 'center', textBaseline: 'middle' })
for (let i = 0; i < VL; i++) shapes.push({ kind: 'rect', id: `dst[${i}]`, ...dstLanes[i], color: 'lightgray', text: String(out[i]),       textAlign: 'center', textBaseline: 'middle' })

shapes.push({ kind: 'rect', id: 'alu', x: 6, y: 1.3, w: 1.4, h: 0.9, color: '#0EA5E9', text: 'ALU' })

shapes.push(
  { kind: 'label', id: 'lbl_s2',  x: 1,  y: 0.8, text: `vs2 = ${vs2}` },
  { kind: 'label', id: 'lbl_dst', x: 8,  y: 0.8, text: `vd = ${vd}` },
  { kind: 'label', id: 'lbl_imm', x: 6,  y: 0.6, text: `imm = ${imm5}` },
  ...(vm ? [{ kind: 'label', id: 'lbl_vm', x: 1, y: 2.4, text: `vm = ${vm} (1 执行)` }] : [])
)

const s2R  = rightMid(shapes, 's2__box')
const aluL = leftMid(shapes,  'alu')
const aluR = rightMid(shapes, 'alu')
const dstL = leftMid(shapes,  'dst__box')

shapes.push(arrowBetween(shapes, 'a_s2_alu',  s2R, aluL, { dy1: +0.00, dy2: +0.00 }))
shapes.push(arrowBetween(shapes, 'a_alu_dst', aluR, dstL))

const tl = new Timeline()
  .step('s1', '读取源向量与立即数').appear('s2__box').appear('lbl_s2').appear('lbl_imm').appear('lbl_vm')
  .step('s2', '送入 ALU').appear('a_s2_alu').blink('alu', 2, 220)
  .step('s3', '执行加法（逐元素 + imm）').blink('alu', 2, 220)
  .step('s4', '写回结果').appear('dst__box').appear('lbl_dst').appear('a_alu_dst').appear('dst[0]').appear('dst[1]').appear('dst[2]').appear('dst[3]')
  .step('s5', '完成')

const doc = tl.build(shapes, [vs2, vd])
const synonyms = [
  { arch: 'ARM NEON',    name: 'vaddq_n_s32',      note: '向量 + 标量（常数）', example: 'int32x4_t c = vaddq_n_s32(a, 5);' },
  { arch: 'x86 SSE/AVX', name: 'PADDD + set1',     note: '向量 + 常数广播',     example: '__m128i c = _mm_add_epi32(a, _mm_set1_epi32(5));' },
]
;(doc as any).synonyms = synonyms
return { doc, extras: { synonyms } }

}
}

export { vaddVI }
export default vaddVI
