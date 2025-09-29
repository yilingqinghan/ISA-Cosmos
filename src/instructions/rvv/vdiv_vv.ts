import type { InstructionModule, BuildCtx } from '../types'
import { Timeline } from '../timeline'
import {
inch as px,
toNum,
leftMid, rightMid, centerOf,
arrowBetween,
layoutRowInBox,
} from '../utils/geom'

const vdivVV: InstructionModule = {
id: 'rvv/vdiv.vv',
title: 'vdiv.vv',
sample: 'vdiv.vv v0, v2, v1',
meta: {
usage: 'VDIV.VV vd, vs2, vs1[, vm]；向量-向量除法：对每个元素 i，若 vm[i]=1 或未提供 vm，则 vd[i] = vs2[i] / vs1[i]；若 vs1[i]=0，vd[i] 置为全1（按元素位宽）；否则当该元素未参与运算且 vd 与任一源不同名时，保持原值不变。',
scenarios: ['向量元素间的除法', '数组元素除法计算', '向量并行计算'],
notes: ['支持有符号与无符号除法（依具体 vtype/数据解释）', '除零返回全1（按 RISC-V 语义）', '可选掩码 vm，vm[i]=1 的元素参与除法'],
exceptions: ['无（除零按语义返回全1）']
},
build(ctx: BuildCtx) {
const [vd = 'v0', vs2 = 'v2', vs1 = 'v1', vmReg] = ctx.operands || []
const VL = ctx.env?.VL ?? 4

const s2 = (ctx.values?.[vs2] ?? [10, 11, 12, 13]).slice(0, VL)
const s1 = (ctx.values?.[vs1] ?? [1, 2, 3, 4]).slice(0, VL)
const dstOld = (ctx.values?.[vd]  ?? Array.from({length:VL}, (_,i)=>'')).slice(0, VL)
const vm = vmReg ? (ctx.values?.[vmReg] ?? Array.from({length:VL},()=>1)).slice(0,VL) : Array.from({length:VL},()=>1)

function allOnes(): number { return -1 }

const out = Array.from({ length: VL }, (_, i) => {
  const m = toNum(vm[i])
  const a = toNum(s2[i])
  const b = toNum(s1[i])
  const oldv = toNum(dstOld[i])
  if (m === 1 || m === null) {
    if (b === 0) return allOnes()
    if (a != null && b != null) return Math.trunc(a / b)
    return ''
  } else {
    if (vd !== vs2 && vd !== vs1) return oldv ?? ''
    return '' // 别名情形下由后续写回覆盖/或保持空展示
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

for (let i = 0; i < VL; i++) shapes.push({ kind:'rect', id:`s2[${i}]`, ...s2Lanes[i], color:'teal',      text:String(s2[i] ?? ''), textAlign:'center', textBaseline:'middle' })
for (let i = 0; i < VL; i++) shapes.push({ kind:'rect', id:`s1[${i}]`, ...s1Lanes[i], color:'lightgray', text:String(s1[i] ?? ''), textAlign:'center', textBaseline:'middle' })

shapes.push({ kind:'rect', id:'alu', x: 6, y: 1.6, w: 1.4, h: 1.2, color:'#0EA5E9', text:'ALU' })

for (let i = 0; i < VL; i++) shapes.push({ kind:'rect', id:`dst[${i}]`, ...dstLanes[i], color:'lightgray', text:String(out[i]), textAlign:'center', textBaseline:'middle' })

shapes.push(
  { kind:'label', id:'lbl_s2',  x:1, y:0.6, text:`vs2 = ${vs2}` },
  { kind:'label', id:'lbl_s1',  x:1, y:2.0, text:`vs1 = ${vs1}` },
  { kind:'label', id:'lbl_dst', x:8, y:1.2, text:`vd = ${vd}` },
)
if (vmReg) shapes.push({ kind:'label', id:'lbl_vm', x:1, y:3.35, text:`vm = ${vmReg}` })

const s2R  = rightMid(shapes, 's2__box')
const s1R  = rightMid(shapes, 's1__box')
const aluL = leftMid(shapes,  'alu')
const aluR = rightMid(shapes, 'alu')
const dstL = leftMid(shapes,  'dst__box')

shapes.push(arrowBetween(shapes, 'a_s2_alu', s2R, aluL, { dy1: -0.15, dy2: -0.15 }))
shapes.push(arrowBetween(shapes, 'a_s1_alu', s1R, aluL, { dy1: +0.15, dy2: +0.15 }))
shapes.push(arrowBetween(shapes, 'a_alu_dst', aluR, dstL))

const tl = new Timeline()
  .step('s1','读取源向量').appear('s2__box').appear('s1__box').appear('lbl_s2').appear('lbl_s1').appear('lbl_vm')
  .step('s2','送入 ALU').appear('a_s2_alu').appear('a_s1_alu').blink('alu',3,200)
  .step('s3','执行除法').blink('alu',3,220)
  .step('s4','写回结果').appear('a_alu_dst').appear('dst__box').appear('lbl_dst')
  .step('s5','完成').appear('dst[0]').appear('dst[1]').appear('dst[2]').appear('dst[3]')

const doc = tl.build(shapes, [vs2, vs1, vd, vmReg].filter(Boolean) as string[])
const synonyms = [
  { arch: 'ARM NEON', name: 'vdivq_f32/vdivq_f64', note: '浮点向量除法对等操作', example: 'float32x4_t c = vdivq_f32(a,b);' }
]
;(doc as any).synonyms = synonyms
return { doc, extras: { synonyms } }

}
}

export { vdivVV }
export default vdivVV
