import type { InstructionModule, BuildCtx } from '../types'
import { Timeline } from '../timeline'
import {
inch as px,
toNum,
leftMid, rightMid, centerOf,
arrowBetween,
layoutRowInBox,
} from '../utils/geom'

const vse64V: InstructionModule = {
id: 'rvv/vse64.v',
title: 'vse64.v',
sample: 'vse64.v v1, (a0)',
meta: {
usage: 'vse64.v vs3, (rs1)[, vm]；向量步长存储64位：对每个元素 i，若 vm[i]=1 或省略掩码，则 M[rs1 + i*8][63:0] = vs3[i]，地址需8字节对齐（sumop 通常为 00000）',
scenarios: ['64位整数数组处理结果存储', '双精度浮点数处理结果存储', '高精度科学计算结果存储'],
notes: ['地址必须 8 字节对齐', '支持掩码 vm', 'sumop 通常为 00000'],
exceptions: ['地址访问异常', '地址不对齐异常']
},
build(ctx: BuildCtx) {
const [vs3 = 'v1', rs1 = 'a0'] = ctx.operands || []
const VL = ctx.env?.VL ?? 4
const vec = (ctx.values?.[vs3] ?? [1, 2, 3, 4]).slice(0, VL)
const baseRaw = ctx.values?.[rs1] ?? ctx.values?.base ?? 0x1000
const base = toNum(baseRaw) ?? 0x1000
const mask = (ctx.values?.vm ?? Array(VL).fill(1)).slice(0, VL).map(x => toNum(x) ? 1 : 0)
const addrs = Array.from({ length: VL }, (_, i) => base + i * 8)
const writeVal = (i: number) => (mask[i] ? String(toNum(vec[i]) ?? '') : '—')

const boxSrc = { x: px(1), y: px(1.2), w: px(4), h: px(1) }
const boxMem = { x: px(8), y: px(1.2), w: px(5), h: px(1) }

const shapes: any[] = [
  { kind: 'group', id: 's1__box', ...boxSrc },
  { kind: 'group', id: 'dst__box', ...boxMem },
]

const laneW = 0.9, laneH = 0.8
const sLanes = layoutRowInBox(boxSrc, VL, laneW, laneH)
const dLanes = layoutRowInBox(boxMem, VL, laneW, laneH)

for (let i = 0; i < VL; i++) {
  shapes.push({ kind: 'rect', id: `s1[${i}]`, ...sLanes[i], color: 'lightgray', text: String(vec[i] ?? ''), textAlign: 'center', textBaseline: 'middle' })
}
for (let i = 0; i < VL; i++) {
  shapes.push({ kind: 'rect', id: `dst[${i}]`, ...dLanes[i], color: 'lightgray', text: writeVal(i), textAlign: 'center', textBaseline: 'middle' })
  shapes.push({ kind: 'label', id: `addr[${i}]`, x: dLanes[i].x, y: dLanes[i].y - 0.25, text: '0x' + addrs[i].toString(16) })
}

shapes.push(
  { kind: 'rect', id: 'alu', x: 6, y: 1.3, w: 1.6, h: 1.0, color: '#0EA5E9', text: 'Store' },
  { kind: 'label', id: 'lbl_vs3', x: 1, y: 0.7, text: `vs3 = ${vs3}` },
  { kind: 'label', id: 'lbl_dst', x: 8, y: 0.7, text: `base = ${rs1} (8B aligned)` }
)

const sR = rightMid(shapes, 's1__box')
const aL = leftMid(shapes, 'alu')
const aR = rightMid(shapes, 'alu')
const dL = leftMid(shapes, 'dst__box')

shapes.push(
  arrowBetween(shapes, 'a_src_alu', sR, aL),
  arrowBetween(shapes, 'a_alu_mem', aR, dL)
)

const tl = new Timeline()
  .step('s1', '读取源向量与基址').appear('s1__box').appear('lbl_vs3').appear('lbl_dst')
  .step('s2', '送入存储单元').appear('a_src_alu').blink('alu', 2, 220)
  .step('s3', '执行存储').blink('alu', 3, 220)
  .step('s4', '写回内存').appear('a_alu_mem').appear('dst__box')
  .step('s5', '完成')

const doc = tl.build(shapes, [vs3, rs1])

const synonyms = [
  { arch: 'ARM NEON', name: 'vst1q_u64', note: '存储 2×64 位（或更宽向量分批）', example: 'vst1q_u64((uint64_t*)p, v);' },
  { arch: 'x86 SSE/AVX', name: 'VMOVDQU64', note: '64 位向量存到内存', example: '_mm256_storeu_si256((__m256i*)p, v);' },
]
;(doc as any).synonyms = synonyms

return { doc, extras: { synonyms } }

}
}

export { vse64V }
export default vse64V
