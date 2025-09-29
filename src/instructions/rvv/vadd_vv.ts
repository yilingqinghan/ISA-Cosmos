import type { InstructionModule, BuildCtx } from '../types'
import { Timeline } from '../timeline'
import {
  inch as px,
  toNum,
  leftMid, rightMid, centerOf,
  arrowBetween,
  layoutRowInBox,
} from '../utils/geom'

const vaddVV: InstructionModule = {
  id: 'rvv/vadd.vv',
  title: 'vadd.vv',
  sample: 'vadd.vv v0, v1, v2',
  meta: {
    usage: 'vadd.vv vd, vs1, vs2；向量加法：vd[i] = vs1[i] + vs2[i]',
    scenarios: ['向量数组加法', '并行数据处理', '科学计算'],
    notes: ['元素宽度由 vtype.vsew 决定', '支持掩码 vm', '目的寄存器 vd 可与源寄存器同名'],
    exceptions: ['无']
  },
  build(ctx: BuildCtx) {
    const [vd = 'v0', vs1 = 'v1', vs2 = 'v2'] = ctx.operands || []
    const VL = ctx.env?.VL ?? 4

    const a0 = (ctx.values?.[vs1] ?? [1, 2, 3, 4]).slice(0, VL)
    const b0 = (ctx.values?.[vs2] ?? [10, 11, 12, 13]).slice(0, VL)
    const c0 = Array.from({ length: VL }, (_, i) => {
      const va = toNum(a0[i]); const vb = toNum(b0[i]); return va != null && vb != null ? va + vb : ''
    })

    // 盒子（英寸单位）
    const boxS1  = { x: px(1), y: px(1),   w: px(4), h: px(1) }
    const boxS2  = { x: px(1), y: px(2.4), w: px(4), h: px(1) }
    const boxDst = { x: px(8), y: px(1.7), w: px(4), h: px(1) }

    const shapes: any[] = [
      { kind: 'group', id: 's1__box',  ...boxS1 },
      { kind: 'group', id: 's2__box',  ...boxS2 },
      { kind: 'group', id: 'dst__box', ...boxDst },
    ]

    // 统一 lane 尺寸（英寸）
    const laneW = 0.8, laneH = 0.8

    // 等间距水平排布，垂直方向居中
    const s1Lanes  = layoutRowInBox(boxS1,  VL, laneW, laneH)
    const s2Lanes  = layoutRowInBox(boxS2,  VL, laneW, laneH)
    const dstLanes = layoutRowInBox(boxDst, VL, laneW, laneH)

    // s1 lanes
    for (let i = 0; i < VL; i++) shapes.push({
      kind:'rect', id:`s1[${i}]`, ...s1Lanes[i], color:'lightgray',
      text:String(a0[i] ?? ''), textAlign:'center', textBaseline:'middle'
    })
    // s2 lanes
    for (let i = 0; i < VL; i++) shapes.push({
      kind:'rect', id:`s2[${i}]`, ...s2Lanes[i], color:'teal',
      text:String(b0[i] ?? ''), textAlign:'center', textBaseline:'middle'
    })

    // ALU
    shapes.push({ kind:'rect', id:'alu', x: 6, y: 1.6, w: 1.4, h: 1.2, color:'#0EA5E9', text:'ALU' })

    // dst lanes
    for (let i = 0; i < VL; i++) shapes.push({
      kind:'rect', id:`dst[${i}]`, ...dstLanes[i], color:'lightgray',
      text:String(c0[i]), textAlign:'center', textBaseline:'middle'
    })

    // labels
    shapes.push(
      { kind:'label', id:'lbl_s1',  x:1, y:0.6, text:`vs1 = ${vs1}` },
      { kind:'label', id:'lbl_s2',  x:1, y:2.0, text:`vs2 = ${vs2}` },
      { kind:'label', id:'lbl_dst', x:8, y:1.2, text:`vd = ${vd}` },
    )

    // Arrows（借助锚点）
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
      .step('s3','执行加法').blink('alu',3,240)
      .step('s4','写回结果').appear('a_alu_dst').appear('dst__box').appear('lbl_dst').appear('dst[0]').appear('dst[1]').appear('dst[2]').appear('dst[3]')
      .step('s5','完成')

    const doc = tl.build(shapes, [vs1, vs2, vd])
    const synonyms = [
      { arch: 'ARM NEON', name: 'vaddq_s32',      note: '同宽度向量加法', example: 'int32x4_t c = vaddq_s32(a,b);' },
      { arch: 'x86 SSE/AVX', name: 'PADDD/VPADDD', note: '32位打包加',     example: '__m128i c = _mm_add_epi32(a,b);' },
    ]
    ;(doc as any).synonyms = synonyms
    return { doc, extras: { synonyms } }
  }
}

export { vaddVV }
export default vaddVV
