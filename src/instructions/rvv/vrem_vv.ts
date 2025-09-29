import type { InstructionModule, BuildCtx } from '../types'
import { Timeline } from '../timeline'
import {
inch as px,
toNum,
leftMid, rightMid, centerOf,
arrowBetween,
layoutRowInBox,
} from '../utils/geom'

const vremVV: InstructionModule = {
id: 'rvv/vrem.vv',
title: 'vrem.vv',
sample: 'vrem.vv v0, v1, v2',
meta: {
usage: 'VREM.VV vd, vs2, vs1[, vm]；向量-向量取模：当掩码 vm[i]=1 或省略时，vd[i] = (vs2[i] % vs1[i])；若 vs1[i]=0，则 vd[i]=vs2[i]；当 vm[i]=0 且 vd≠vs2≠vs1 时，vd[i] 保持不变。',
scenarios: ['向量元素间的取模', '数组元素取模计算', '哈希函数计算'],
notes: ['支持有符号和无符号取模（按 RISC-V 语义实现）', '除零时返回被除数', '可选掩码 vm（形如 v0.t）'],
exceptions: ['无（除零时返回被除数）']
},
build(ctx: BuildCtx) {
const [vd = 'v0', vs2 = 'v1', vs1 = 'v2', vmArg] = ctx.operands || []
const VL = ctx.env?.VL ?? 4

const dividend = (ctx.values?.[vs2] ?? [10, 11, 12, 13]).slice(0, VL)
const divisor  = (ctx.values?.[vs1] ?? [1, 2, 3, 4]).slice(0, VL)
const oldDst   = (ctx.values?.[vd]  ?? Array(VL).fill('')).slice(0, VL)

let maskArr: (number|boolean|string)[] | undefined
if (vmArg) {
  const base = vmArg.includes('.') ? vmArg.split('.')[0] : vmArg
  maskArr = (ctx.values?.[vmArg] || ctx.values?.[base])?.slice(0, VL)
}
const isMaskedOn = (i:number) => {
  if (!vmArg) return true
  const v = maskArr?.[i]
  if (v === undefined) return false
  if (typeof v === 'boolean') return v
  const n = toNum(v)
  return n != null ? n !== 0 : String(v).toLowerCase() === 't' || String(v) === '1'
}

const c0 = Array.from({ length: VL }, (_, i) => {
  if (isMaskedOn(i)) {
    const a = toNum(dividend[i])
    const b = toNum(divisor[i])
    if (a == null || b == null) return ''
    if (b === 0) return a
    return (a as number) % (b as number)
  } else {
    if (vd !== vs2 && vd !== vs1) return oldDst[i] ?? ''
    return ''
  }
})

const boxS2  = { x: px(1), y: px(1),   w: px(4), h: px(1) }
const boxS1  = { x: px(1), y: px(2.4), w: px(4), h: px(1) }
const boxDst = { x: px(8), y: px(1.7), w: px(4), h: px(1) }

const shapes: any[] = [
  { kind: 'group', id: 's2__box',  ...boxS2 },
  { kind: 'group', id: 's1__box',  ...boxS1 },
  { kind: 'group', id: 'dst__box', ...boxDst },
]

const laneW = 0.8, laneH = 0.8
const s2Lanes  = layoutRowInBox(boxS2,  VL, laneW, laneH)
const s1Lanes  = layoutRowInBox(boxS1,  VL, laneW, laneH)
const dstLanes = layoutRowInBox(boxDst, VL, laneW, laneH)

for (let i = 0; i < VL; i++) shapes.push({ kind:'rect', id:`s2[${i}]`, ...s2Lanes[i], color:'teal',      text:String(dividend[i] ?? ''), textAlign:'center', textBaseline:'middle' })
for (let i = 0; i < VL; i++) shapes.push({ kind:'rect', id:`s1[${i}]`, ...s1Lanes[i], color:'lightgray', text:String(divisor[i]  ?? ''), textAlign:'center', textBaseline:'middle' })

shapes.push({ kind:'rect', id:'alu', x: 6, y: 1.6, w: 1.4, h: 1.2, color:'#0EA5E9', text:'ALU' })

for (let i = 0; i < VL; i++) shapes.push({ kind:'rect', id:`dst[${i}]`, ...dstLanes[i], color:'lightgray', text:String(c0[i]), textAlign:'center', textBaseline:'middle' })

shapes.push(
  { kind:'label', id:'lbl_s2',  x:1, y:0.6, text:`vs2 = ${vs2}` },
  { kind:'label', id:'lbl_s1',  x:1, y:2.0, text:`vs1 = ${vs1}` },
  { kind:'label', id:'lbl_dst', x:8, y:1.2, text:`vd = ${vd}` },
)
if (vmArg) {
  shapes.push({ kind:'label', id:'lbl_vm', x:1, y:3.3, text:`vm = ${vmArg}` })
}

const s2R  = rightMid(shapes, 's2__box')
const s1R  = rightMid(shapes, 's1__box')
const aluL = leftMid(shapes,  'alu')
const aluR = rightMid(shapes, 'alu')
const dstL = leftMid(shapes,  'dst__box')

shapes.push(arrowBetween(shapes, 'a_s2_alu', s2R, aluL, { dy1: -0.15, dy2: -0.15 }))
shapes.push(arrowBetween(shapes, 'a_s1_alu', s1R, aluL, { dy1: +0.15, dy2: +0.15 }))
shapes.push(arrowBetween(shapes, 'a_alu_dst', aluR, dstL))

const tl = new Timeline()
  .step('s1','读取源向量').appear('s2__box').appear('s1__box').appear('lbl_s2').appear('lbl_s1')
  .step('s2','送入 ALU').appear('a_s2_alu').appear('a_s1_alu').blink('alu',3,240)
  .step('s3','执行取模').blink('alu',3,240)
  .step('s4','写回结果').appear('a_alu_dst').appear('dst__box').appear('lbl_dst')
  .step('s5','完成').appear('dst[0]').appear('dst[1]').appear('dst[2]').appear('dst[3]')

const doc = tl.build(shapes, [vs2, vs1, vd])
const synonyms: any[] = []
;(doc as any).synonyms = synonyms
return { doc, extras: { synonyms } }

}
}

export { vremVV }
export default vremVV
