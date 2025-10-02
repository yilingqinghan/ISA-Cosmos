import type { InstructionModule, BuildCtx } from '../../types'
import { Timeline } from '../../timeline'
import { tr } from '@/i18n'
import { inch as px, toNum, vectorSlotsFromEnv, layoutRowInBoxSquare, bitWidthRulerForBox } from '../../utils/geom'

const add: InstructionModule = {
  id: 'riscv/add',
  title: 'add',
  sample: 'add x3, x1, x2',
  build(ctx: BuildCtx) {
    const [rd = 'x3', rs1 = 'x1', rs2 = 'x2'] = ctx.operands || []

    // 1) Env → slots (scalar add: default 32-bit word → 1 slot)
    const { regBits, elemBits, rawSlots, slots: N } =
      vectorSlotsFromEnv(ctx.env, { maxSlots: 8, defaultRegBits: 32, defaultElemBits: 32 })

    // 2) Ellipsis handling
    const showEllipsis   = rawSlots > N
    const shownSlots     = showEllipsis ? N - 1 : N
    const slotsForLayout = showEllipsis ? shownSlots + 1 : shownSlots

    // 3) Values & element-wise semantics (scalar = 1 lane)
    const a0 = (ctx.values?.[rs1] ?? [5]).slice(0, shownSlots)
    const b0 = (ctx.values?.[rs2] ?? [12]).slice(0, shownSlots)
    const c0 = Array.from({ length: shownSlots }, (_, i) => {
      const va = toNum(a0[i]); const vb = toNum(b0[i])
      return va != null && vb != null ? (va as number) + (vb as number) : ''
    })

    // 4) Canonical boxes
    const boxS1  = { x: px(1), y: px(1.00), w: px(4), h: px(1) }
    const boxS2  = { x: px(1), y: px(2.40), w: px(4), h: px(1) }
    const boxDst = { x: px(8), y: px(1.70), w: px(4), h: px(1) }

    const shapes: any[] = [
      { kind: 'group', id: 's1__box',  ...boxS1 },
      { kind: 'group', id: 's2__box',  ...boxS2 },
      { kind: 'group', id: 'dst__box', ...boxDst },
    ]

    // 5) Fit
    const dynGap  = N >= 8 ? 0.10 : N >= 6 ? 0.14 : 0.18
    const s1Fit   = layoutRowInBoxSquare(boxS1,  slotsForLayout, 0.80, { gap: dynGap })
    const s2Fit   = layoutRowInBoxSquare(boxS2,  slotsForLayout, 0.80, { gap: dynGap })
    const dstFit  = layoutRowInBoxSquare(boxDst, slotsForLayout, 0.80, { gap: dynGap })

    // 6) Text size & corner radius
    const textPx  = Math.max(12, Math.min(30, Math.round(s1Fit.side * 96 * 0.45)))
    const roundPx = Math.max(8,  Math.round(s1Fit.side * 96 * 0.22))

    // 7) Lanes
    for (let i = 0; i < shownSlots; i++) {
      shapes.push({ kind:'rect', id:`s1[${i}]`, ...s1Fit.lanes[i],
        color:'#E5E7EB', text:String(a0[i] ?? ''), textAlign:'center', textBaseline:'middle',
        size:textPx, roundPx })
    }
    for (let i = 0; i < shownSlots; i++) {
      shapes.push({ kind:'rect', id:`s2[${i}]`, ...s2Fit.lanes[i],
        color:'#93C5FD', text:String(b0[i] ?? ''), textAlign:'center', textBaseline:'middle',
        size:textPx, roundPx })
    }
    for (let i = 0; i < shownSlots; i++) {
      shapes.push({ kind:'rect', id:`dst[${i}]`, ...dstFit.lanes[i],
        color:'#E5E7EB', text:String(c0[i]), textAlign:'center', textBaseline:'middle',
        size:textPx, roundPx })
    }

    // 8) ALU block
    shapes.push({ kind:'rect', id:'alu', x:px(6), y:px(1.6), w:px(1.4), h:px(1.2), color:'#0EA5E9', text:tr('算术逻辑单元','ALU') })

    // 9) Bit-width rulers
    shapes.push(...bitWidthRulerForBox(boxS1,  regBits, 'ruler_s1', 0.5, { elems: rawSlots }))
    shapes.push(...bitWidthRulerForBox(boxDst, regBits, 'ruler_dst', 0.6, { elems: rawSlots }))

    // 10) Ellipsis marks
    if (showEllipsis) {
      const putEll = (fit: {side:number; lanes:{x:number;y:number;w:number;h:number}[]}, id:string) => {
        const last = fit.lanes[fit.lanes.length - 1]
        shapes.push({
          kind:'text', id:`${id}__ellipsis`,
          x:last.x, y:last.y, w:last.w, h:last.h,
          text:'…', size: Math.max(16, Math.round(fit.side * 96 * 0.55)),
          color:'#475569', align:'center', vAlign:'middle'
        })
      }
      putEll(s1Fit, 's1')
      putEll(s2Fit, 's2')
      putEll(dstFit, 'dst')
    }

    // 11) Arrows
    const s1R  = { x: boxS1.x + boxS1.w, y: boxS1.y + boxS1.h / 2 }
    const s2R  = { x: boxS2.x + boxS2.w, y: boxS2.y + boxS2.h / 2 }
    const aluL = { x: px(6), y: px(1.6) + px(1.2) / 2 }
    const aluR = { x: px(6) + px(1.4), y: px(1.6) + px(1.2) / 2 }
    const dstL = { x: boxDst.x, y: boxDst.y + boxDst.h / 2 }

    shapes.push({ kind:'arrow', id:'a_s1_alu',  x1:s1R.x, y1:s1R.y - 0.15, x2:aluL.x, y2:aluL.y - 0.15, color:'#94a3b8', width:2 })
    shapes.push({ kind:'arrow', id:'a_s2_alu',  x1:s2R.x, y1:s2R.y + 0.15, x2:aluL.x, y2:aluL.y + 0.15, color:'#94a3b8', width:2 })
    shapes.push({ kind:'arrow', id:'a_alu_dst', x1:aluR.x, y1:aluR.y,       x2:dstL.x, y2:dstL.y,       color:'#94a3b8', width:2 })

    // 12) Labels
    shapes.push({ kind:'label', id:'lbl_s1',  x:px(1), y:px(0.60), text:`rs1 = ${rs1}` })
    shapes.push({ kind:'label', id:'lbl_s2',  x:px(1), y:px(2.00), text:`rs2 = ${rs2}` })
    shapes.push({ kind:'label', id:'lbl_dst', x:px(8), y:px(1.20), text:`rd = ${rd}` })

    // 13) Timeline
    const tl = new Timeline()
      .step('s1', tr('读取源寄存器','Read source registers'))
        .appear('s1__box').appear('s2__box')
        .appear('lbl_s1').appear('lbl_s2')
        .appear('ruler_s1__l').appear('ruler_s1__r').appear('ruler_s1__t')
    if (showEllipsis) tl.appear('s1__ellipsis').appear('s2__ellipsis')

    tl.step('s2', tr('送入 ALU','Feed into ALU'))
        .appear('a_s1_alu').appear('a_s2_alu')
        .blink('alu',3,240)
      .step('s3', tr('执行加法','Execute addition'))
        .blink('alu',3,240)
      .step('s4', tr('写回结果','Write back'))
        .appear('a_alu_dst').appear('dst__box')
        .appear('ruler_dst__l').appear('ruler_dst__r').appear('ruler_dst__t')
        .appear('lbl_dst')
    for (let i = 0; i < shownSlots; i++) tl.appear(`dst[${i}]`)
    if (showEllipsis) tl.appear('dst__ellipsis')
    tl.step('s5', tr('完成','Done'))

    // 14) Build & return
    const doc = tl.build(shapes, [rs1, rs2, rd])
    return doc
  }
}

export { add }
export default add
