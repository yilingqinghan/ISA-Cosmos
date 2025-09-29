import type { InstructionModule, BuildCtx } from '../types'
import { Timeline } from '../timeline'
import {
inch as px,
toNum,
leftMid, rightMid, centerOf,
arrowBetween,
layoutRowInBox,
} from '../utils/geom'

const vandVV: InstructionModule = {
id: 'rvv/vand.vv',
title: 'vand.vv',
sample: 'vand.vv v0, v1, v2',
meta: {
usage: 'VAND.VV vd, vs2, vs1[, vm]；向量-向量按位与：对于每个元素 i，若 vm[i]=1 或未提供 vm，则 vd[i] = vs2[i] & vs1[i]；否则若 vd≠vs2 且 vd≠vs1，则保持 vd[i] 不变。',
scenarios: ['位掩码操作', '数据过滤', '位字段提取'],
notes: ['按位与操作，适用于任意元素宽度', '支持不同元素宽度和掩码操作', '支持 vm 掩码'],
exceptions: ['无']
},
build(ctx: BuildCtx) {
const [vd = 'v0', vs2 = 'v1', vs1 = 'v2', vmOpt] = ctx.operands || []
const VL = ctx.env?.VL ?? 4

const a0 = (ctx.values?.[vs2] ?? [1, 0xffff, 0x1234, 0b1111]).slice(0, VL)
const b0 = (ctx.values?.[vs1] ?? [0xffffffff, 0x00ff, 0b1010, 8]).slice(0, VL)
const vdBase = (ctx.values?.[vd] ?? Array(VL).fill('')).slice(0, VL)

let vmName: string | undefined
if (vmOpt) {
  const m = String(vmOpt)
  vmName = m.includes('.') ? m.split('.')[0] : m
}
const vmArr: any[] | undefined = vmName ? (ctx.values?.[vmName] || []) : undefined

const c0 = Array.from({ length: VL }, (_, i) => {
  const active = !vmArr ? true : !!vmArr[i]
  if (active) {
    const v2n = toNum(a0[i]); const v1n = toNum(b0[i])
    return v2n != null && v1n != null ? (v2n & v1n) : ''
  } else {
    if (vd !== vs2 && vd !== vs1) return vdBase[i]
    return ''
  }
})

const boxS1  = { x: px(1), y: px(1),   w: px(4), h: px(1) }   // 显示为 vs1（上）
const boxS2  = { x: px(1), y: px(2.4), w: px(4), h: px(1) }   // 显示为 vs2（下）
const boxDst = { x: px(8), y: px(1.7), w: px(4), h: px(1) }

const shapes: any[] = [
  { kind: 'group', id: 's1__box',  ...boxS1 },
  { kind: 'group', id: 's2__box',  ...boxS2 },
  { kind: 'group', id: 'dst__box', ...boxDst },
]

const laneW = 0.8, laneH = 0.8
const s1Lanes  = layoutRowInBox(boxS1,  VL, laneW, laneH)
const s2Lanes  = layoutRowInBox(boxS2,  VL, laneW, laneH)
const dstLanes = layoutRowInBox(boxDst, VL, laneW, laneH)

for (let i = 0; i < VL; i++) shapes.push({ kind:'rect', id:`s1[${i}]`, ...s1Lanes[i], color:'lightgray', text:String(b0[i] ?? ''), textAlign:'center', textBaseline:'middle' })
for (let i = 0; i < VL; i++) shapes.push({ kind:'rect', id:`s2[${i}]`, ...s2Lanes[i], color:'teal',      text:String(a0[i] ?? ''), textAlign:'center', textBaseline:'middle' })

shapes.push({ kind:'rect', id:'alu', x: 6, y: 1.6, w: 1.4, h: 1.2, color:'#0EA5E9', text:'AND' })

for (let i = 0; i < VL; i++) shapes.push({ kind:'rect', id:`dst[${i}]`, ...dstLanes[i], color:'lightgray', text:String(c0[i]), textAlign:'center', textBaseline:'middle' })

shapes.push(
  { kind:'label', id:'lbl_s1',  x:1, y:0.6, text:`vs1 = ${vs1}` },
  { kind:'label', id:'lbl_s2',  x:1, y:2.0, text:`vs2 = ${vs2}` },
  { kind:'label', id:'lbl_dst', x:8, y:1.2, text:`vd = ${vd}` },
  ...(vmName ? [{ kind:'label', id:'lbl_vm', x:1, y:3.2, text:`vm = ${vmOpt}` }] : [])
)

const s1R  = rightMid(shapes, 's1__box')
const s2R  = rightMid(shapes, 's2__box')
const aluL = leftMid(shapes,  'alu')
const aluR = rightMid(shapes, 'alu')
const dstL = leftMid(shapes,  'dst__box')

shapes.push(arrowBetween(shapes, 'a_s1_alu', s1R, aluL, { dy1: -0.15, dy2: -0.15 }))
shapes.push(arrowBetween(shapes, 'a_s2_alu', s2R, aluL, { dy1: +0.15, dy2: +0.15 }))
shapes.push(arrowBetween(shapes, 'a_alu_dst', aluR, dstL))

const tl = new Timeline()
  .step('s1','读取源向量').appear('s1__box').appear('s2__box').appear('lbl_s1').appear('lbl_s2').appear(vmName?'lbl_vm':'')
  .step('s2','送入 ALU').appear('a_s1_alu').appear('a_s2_alu').blink('alu',3,240)
  .step('s3','执行按位与').blink('alu',3,240)
  .step('s4','写回结果').appear('a_alu_dst').appear('dst__box').appear('lbl_dst')
  .step('s5','完成').appear('dst[0]').appear('dst[1]').appear('dst[2]').appear('dst[3]')

const doc = tl.build(shapes, [vs2, vs1, vd])
const synonyms = [
  { arch: 'ARM NEON',    name: 'vandq_u32',   note: '向量按位与', example: 'uint32x4_t c = vandq_u32(a, b);' },
  { arch: 'x86 SSE/AVX', name: 'PAND/VPAND',  note: '打包按位与', example: '__m128i c = _mm_and_si128(a, b);' },
]
;(doc as any).synonyms = synonyms
return { doc, extras: { synonyms } }

}
}

export { vandVV }
export default vandVV
