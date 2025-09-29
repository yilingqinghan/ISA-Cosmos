import type { InstructionModule, BuildCtx } from '../types'
import { Timeline } from '../timeline'
import {
inch as px,
toNum,
leftMid, rightMid, centerOf,
arrowBetween,
layoutRowInBox,
} from '../utils/geom'

const vorVV: InstructionModule = {
id: 'rvv/vor.vv',
title: 'vor.vv',
sample: 'vor.vv v0, v1, v2',
meta: {
usage: 'VOR.VV vd, vs2, vs1[, vm]；向量-向量按位或：若 vm[i]=1 或省略，则 vd[i] = vs2[i] | vs1[i]；否则当 vd≠vs2 且 vd≠vs1 时保持 vd[i] 不变。',
scenarios: ['位掩码合并', '标志位设置', '位字段合并'],
notes: ['按位或操作，适用于任意元素宽度', '支持掩码 vm（掩码位为 1 时更新、否则按保持策略处理）'],
exceptions: ['无']
},
build(ctx: BuildCtx) {
const [vd = 'v0', vs2 = 'v1', vs1 = 'v2'] = ctx.operands || []
const VL = ctx.env?.VL ?? 4

const arrVs2 = (ctx.values?.[vs2] ?? [10, 11, 12, 13]).slice(0, VL)
const arrVs1 = (ctx.values?.[vs1] ?? [1, 2, 3, 4]).slice(0, VL)
const arrVd0 = (ctx.values?.[vd]  ?? [0, 0, 0, 0]).slice(0, VL)
const mask   = ctx.values?.vm ? (ctx.values?.vm).slice(0, VL) : null

const isMaskOn = (v:any) => {
  if (mask == null) return true
  if (v === true) return true
  if (typeof v === 'string') { const s=v.trim().toLowerCase(); if (s==='t'||s==='1') return true }
  const n = toNum(v); return n === 1
}

const sameVdVs2 = vd === vs2
const sameVdVs1 = vd === vs1

const out = Array.from({ length: VL }, (_, i) => {
  const a = toNum(arrVs2[i]); const b = toNum(arrVs1[i])
  if (isMaskOn(mask ? mask[i] : 1)) {
    if (a == null || b == null) return ''
    return (a | b)
  } else {
    // 掩码关闭：若 vd 与任一源相同，保持现有值也不会出错；若两者都不同，则保持原 vd
    return arrVd0[i]
  }
})

const boxS1  = { x: px(1), y: px(1),   w: px(4), h: px(1) }   // 上：vs1
const boxS2  = { x: px(1), y: px(2.4), w: px(4), h: px(1) }   // 下：vs2
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

for (let i = 0; i < VL; i++) shapes.push({ kind:'rect', id:`s1[${i}]`, ...s1Lanes[i], color:'lightgray', text:String(arrVs1[i] ?? ''), textAlign:'center', textBaseline:'middle' })
for (let i = 0; i < VL; i++) shapes.push({ kind:'rect', id:`s2[${i}]`, ...s2Lanes[i], color:'teal',      text:String(arrVs2[i] ?? ''), textAlign:'center', textBaseline:'middle' })

shapes.push({ kind:'rect', id:'alu', x: 6, y: 1.6, w: 1.4, h: 1.2, color:'#0EA5E9', text:'ALU' })

for (let i = 0; i < VL; i++) shapes.push({ kind:'rect', id:`dst[${i}]`, ...dstLanes[i], color:'lightgray', text:String(out[i]), textAlign:'center', textBaseline:'middle' })

shapes.push(
  { kind:'label', id:'lbl_s1',  x:1, y:0.6, text:`vs1 = ${vs1}` },
  { kind:'label', id:'lbl_s2',  x:1, y:2.0, text:`vs2 = ${vs2}` },
  { kind:'label', id:'lbl_dst', x:8, y:1.2, text:`vd = ${vd}` },
)
if (mask) {
  shapes.push({ kind:'label', id:'lbl_vm', x:5.1, y:1.0, text:'vm' })
}

const s1R  = rightMid(shapes, 's1__box')
const s2R  = rightMid(shapes, 's2__box')
const aluL = leftMid(shapes,  'alu')
const aluR = rightMid(shapes, 'alu')
const dstL = leftMid(shapes,  'dst__box')

shapes.push(arrowBetween(shapes, 'a_s1_alu', s1R, aluL, { dy1: -0.15, dy2: -0.15 }))
shapes.push(arrowBetween(shapes, 'a_s2_alu', s2R, aluL, { dy1: +0.15, dy2: +0.15 }))
shapes.push(arrowBetween(shapes, 'a_alu_dst', aluR, dstL))

const tl = new Timeline()
  .step('s1','读取源向量').appear('s1__box').appear('s2__box').appear('lbl_s1').appear('lbl_s2')
  .step('s2','送入 ALU').appear('a_s1_alu').appear('a_s2_alu').blink('alu',3,240)
  .step('s3','执行按位或').blink('alu',3,240)
  .step('s4','写回结果').appear('a_alu_dst').appear('dst__box').appear('lbl_dst').appear('dst[0]').appear('dst[1]').appear('dst[2]').appear('dst[3]')
  .step('s5','完成')

const doc = tl.build(shapes, [vs2, vs1, vd])
const synonyms = [
  { arch: 'ARM NEON',    name: 'vorrq_u32/vorrq_s32', note: '向量按位或', example: 'uint32x4_t c = vorrq_u32(a,b);' },
  { arch: 'x86 SSE/AVX', name: 'POR/VPOR',            note: '打包按位或', example: '__m128i c = _mm_or_si128(a,b);' },
]
;(doc as any).synonyms = synonyms
return { doc, extras: { synonyms } }

}
}

export { vorVV }
export default vorVV
