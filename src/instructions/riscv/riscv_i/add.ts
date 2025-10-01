import type { InstructionModule, BuildCtx } from '../../types'
import { Timeline } from '../../timeline'
import {
  inch as px, toNum,
  vectorSlotsFromEnv, layoutRowInBoxSquare, bitWidthRulerForBox,
  leftMid, rightMid, centerOf,
  arrowBetween,
  layoutRowInBox,
} from '../../utils/geom'

const addScalarOrVector: InstructionModule = {
  id: 'riscv/add',
  title: 'add',
  sample: 'add x0, x1, x2',
  meta: {
    usage: 'add rd, rs1, rs2 ；整型寄存器加法：rd = rs1 + rs2（标量整数，位宽固定 32-bit；当使用向量寄存器时以向量方式展示）',
    scenarios: ['整数加法', '标量/向量演示', '教学与调试'],
    notes: ['标量整数 add 固定按 32-bit 元素展示（不可被用户覆盖）。当使用向量寄存器时，按 vector 环境展示。'],
    exceptions: ['溢出不演示']
  },
  build(ctx: BuildCtx) {
    const [rd = 'x0', rs1 = 'x1', rs2 = 'x2'] = ctx.operands || []

    // Determine whether this is scalar integer (x regs) or vector (v regs)
    const isVec = (s: string) => /^v\d+/.test(String(s))
    const isX = (s: string) => /^x\d+/.test(String(s))

    const treatingAsVector = isVec(rs1) || isVec(rs2) || isVec(rd)

    if (!treatingAsVector) {
      // Scalar integer rendering (force 32-bit element width)
      const elemBits = 32
      const regBits = ctx.env?.regBits ?? 64

      // For scalar view, present a single lane (no VL slicing allowed)
      const shownSlots = 1

      const boxS1 = { x: px(1), y: px(1), w: px(3.6), h: px(1.1) }
      const boxS2 = { x: px(1), y: px(2.6), w: px(3.6), h: px(1.1) }
      const boxDst = { x: px(7.6), y: px(1.85), w: px(3.6), h: px(1.1) }

      const s1Fit = layoutRowInBoxSquare(boxS1, shownSlots, 0.9, { gap: 0.12 })
      const s2Fit = layoutRowInBoxSquare(boxS2, shownSlots, 0.9, { gap: 0.12 })
      const dstFit = layoutRowInBoxSquare(boxDst, shownSlots, 0.9, { gap: 0.12 })

      const textPx = Math.max(12, Math.round(s1Fit.side * 96 * 0.5))
      const roundPx = Math.max(8, Math.round(s1Fit.side * 96 * 0.22))

      const defaultA = [1]
      const defaultB = [10]
      const aRaw = (ctx.values?.[rs1] ?? defaultA).slice(0, shownSlots)
      const bRaw = (ctx.values?.[rs2] ?? defaultB).slice(0, shownSlots)

      const cCalc = Array.from({ length: shownSlots }, (_, i) => {
        const va = toNum(aRaw[i]); const vb = toNum(bRaw[i])
        return va != null && vb != null ? va + vb : ''
      })

      const shapes: any[] = []
      shapes.push({ kind: 'group', id: 's1__box', ...boxS1 })
      shapes.push({ kind: 'group', id: 's2__box', ...boxS2 })
      shapes.push({ kind: 'group', id: 'dst__box', ...boxDst })

      // single lane
      const s1l = s1Fit.lanes[0]
      shapes.push({ kind: 'rect', id: `s1[0]`, x: s1l.x, y: s1l.y, w: s1l.w, h: s1l.h, color: 'lightgray', text: String(aRaw[0] ?? ''), size: textPx, roundPx })
      const s2l = s2Fit.lanes[0]
      shapes.push({ kind: 'rect', id: `s2[0]`, x: s2l.x, y: s2l.y, w: s2l.w, h: s2l.h, color: '#06b6d4', text: String(bRaw[0] ?? ''), size: textPx, roundPx })
      const dl = dstFit.lanes[0]
      shapes.push({ kind: 'rect', id: `dst[0]`, x: dl.x, y: dl.y, w: dl.w, h: dl.h, color: 'lightgray', text: String(cCalc[0] ?? ''), size: textPx, roundPx })

      shapes.push({ kind: 'label', id: `lbl_s1`, x: boxS1.x, y: boxS1.y - px(0.28), text: `${rs1}` })
      shapes.push({ kind: 'label', id: `lbl_s2`, x: boxS2.x, y: boxS2.y - px(0.28), text: `${rs2}` })
      shapes.push({ kind: 'label', id: `lbl_dst`, x: boxDst.x, y: boxDst.y - px(0.28), text: `${rd}` })

      bitWidthRulerForBox(boxS1, elemBits, 'ruler_s1', 0.5, { elems: 1 }).forEach((r: any) => shapes.push(r))
      bitWidthRulerForBox(boxDst, elemBits, 'ruler_dst', 0.6, { elems: 1 }).forEach((r: any) => shapes.push(r))

      const s1R = rightMid(shapes, 's1__box')
      const s2R = rightMid(shapes, 's2__box')
      const aluBox = { x: px(5.2), y: px(1.9), w: px(1.2), h: px(1.0) }
      shapes.push({ kind: 'rect', id: 'alu', x: aluBox.x, y: aluBox.y, w: aluBox.w, h: aluBox.h, color: '#0ea5e9', text: 'ALU', size: Math.max(12, Math.round(aluBox.h * 24)) })
      const aluL = leftMid(shapes, 'alu')
      const aluR = rightMid(shapes, 'alu')
      const dstL = leftMid(shapes, 'dst__box')

      shapes.push(arrowBetween(shapes, 'a_s1_alu', s1R, aluL, { dy1: -0.10, dy2: -0.06 }))
      shapes.push(arrowBetween(shapes, 'a_s2_alu', s2R, aluL, { dy1: +0.10, dy2: +0.06 }))
      shapes.push(arrowBetween(shapes, 'a_alu_dst', aluR, dstL, { dy1: 0, dy2: 0 }))

      const tl = new Timeline()
        .step('s1', '读取源寄存器').appear('s1__box').appear('s2__box').appear('lbl_s1').appear('lbl_s2')
        .step('s2', '送入 ALU').appear('a_s1_alu').appear('a_s2_alu').blink('alu', 3, 240)
        .step('s3', '执行加法').blink('alu', 3, 240)
        .step('s4', '写回寄存器').appear('a_alu_dst').appear('dst__box').appear('lbl_dst').appear('dst[0]')
        .step('s5', '完成')

      const doc = tl.build(shapes, [rs1, rs2, rd])
      const synonyms = [
        { arch: 'ARM', name: 'ADD', note: '同等标量加法', example: 'ADD r0, r1, r2' },
        { arch: 'x86', name: 'ADD', note: '整数加', example: 'add eax, ebx' },
      ]
      ;(doc as any).synonyms = synonyms
      return { doc, extras: { synonyms } }
    }

    // If any operand is a vector reg, keep the original vector rendering behavior
    const [rdv = 'v0', rs1v = 'v1', rs2v = 'v2'] = ctx.operands || []
    const { regBits, elemBits, rawSlots, slots: N } = vectorSlotsFromEnv(ctx.env, { maxSlots: 8, defaultRegBits: 64, defaultElemBits: 32 })

    const showEllipsis = rawSlots > N
    const shownSlots = showEllipsis ? N - 1 : N
    const slotsForLayout = showEllipsis ? shownSlots + 1 : shownSlots

    const dynGap = N >= 8 ? 0.10 : N >= 6 ? 0.14 : 0.18

    const boxS1 = { x: px(1), y: px(1), w: px(3.6), h: px(1.1) }
    const boxS2 = { x: px(1), y: px(2.6), w: px(3.6), h: px(1.1) }
    const boxDst = { x: px(7.6), y: px(1.85), w: px(3.6), h: px(1.1) }

    const s1Fit = layoutRowInBoxSquare(boxS1, slotsForLayout, 0.80, { gap: dynGap })
    const s2Fit = layoutRowInBoxSquare(boxS2, slotsForLayout, 0.80, { gap: dynGap })
    const dstFit = layoutRowInBoxSquare(boxDst, slotsForLayout, 0.80, { gap: dynGap })

    const textPx = Math.max(12, Math.min(30, Math.round(s1Fit.side * 96 * 0.45)))
    const roundPx = Math.max(8, Math.round(s1Fit.side * 96 * 0.22))

    const defaultA = Array.from({ length: Math.max(1, shownSlots) }, (_, i) => i + 1)
    const defaultB = Array.from({ length: Math.max(1, shownSlots) }, (_, i) => (i + 1) * 10)

    const aRaw = (ctx.values?.[rs1v] ?? defaultA).slice(0, shownSlots)
    const bRaw = (ctx.values?.[rs2v] ?? defaultB).slice(0, shownSlots)

    const cCalc = Array.from({ length: shownSlots }, (_, i) => {
      const va = toNum(aRaw[i]); const vb = toNum(bRaw[i])
      return va != null && vb != null ? va + vb : ''
    })

    const shapes: any[] = []

    shapes.push({ kind: 'group', id: 's1__box', ...boxS1 })
    shapes.push({ kind: 'group', id: 's2__box', ...boxS2 })
    shapes.push({ kind: 'group', id: 'dst__box', ...boxDst })

    for (let i = 0; i < shownSlots; i++) {
      const s1l = s1Fit.lanes[i]
      shapes.push({
        kind: 'rect', id: `s1[${i}]`, x: s1l.x, y: s1l.y, w: s1l.w, h: s1l.h,
        color: 'lightgray', text: String(aRaw[i] ?? ''), size: textPx, roundPx
      })
      const s2l = s2Fit.lanes[i]
      shapes.push({
        kind: 'rect', id: `s2[${i}]`, x: s2l.x, y: s2l.y, w: s2l.w, h: s2l.h,
        color: '#06b6d4', text: String(bRaw[i] ?? ''), size: textPx, roundPx
      })
    }

    if (showEllipsis) {
      const ellIndex = slotsForLayout - 1
      const e1 = s1Fit.lanes[ellIndex]
      shapes.push({ kind: 'text', id: 's1__ellipsis', x: e1.x, y: e1.y, w: e1.w, h: e1.h, text: '…', size: textPx, align: 'center', vAlign: 'middle' })
      const e2 = s2Fit.lanes[ellIndex]
      shapes.push({ kind: 'text', id: 's2__ellipsis', x: e2.x, y: e2.y, w: e2.w, h: e2.h, text: '…', size: textPx, align: 'center', vAlign: 'middle' })
    }

    for (let i = 0; i < shownSlots; i++) {
      const dl = dstFit.lanes[i]
      shapes.push({
        kind: 'rect', id: `dst[${i}]`, x: dl.x, y: dl.y, w: dl.w, h: dl.h,
        color: 'lightgray', text: String(cCalc[i] ?? ''), size: textPx, roundPx
      })
    }

    if (showEllipsis) {
      const dell = dstFit.lanes[slotsForLayout - 1]
      shapes.push({ kind: 'text', id: 'dst__ellipsis', x: dell.x, y: dell.y, w: dell.w, h: dell.h, text: '…', size: textPx, align: 'center', vAlign: 'middle' })
    }

    shapes.push({ kind: 'label', id: `lbl_s1`, x: boxS1.x, y: boxS1.y - px(0.28), text: `${rs1v}` })
    shapes.push({ kind: 'label', id: `lbl_s2`, x: boxS2.x, y: boxS2.y - px(0.28), text: `${rs2v}` })
    shapes.push({ kind: 'label', id: `lbl_dst`, x: boxDst.x, y: boxDst.y - px(0.28), text: `${rdv}` })

    bitWidthRulerForBox(boxS1, regBits, 'ruler_s1', 0.5, { elems: rawSlots }).forEach((r: any) => shapes.push(r))
    bitWidthRulerForBox(boxDst, regBits, 'ruler_dst', 0.6, { elems: rawSlots }).forEach((r: any) => shapes.push(r))

    const s1R = rightMid(shapes, 's1__box')
    const s2R = rightMid(shapes, 's2__box')
    const aluBox = { x: px(5.2), y: px(1.9), w: px(1.2), h: px(1.0) }
    shapes.push({ kind: 'rect', id: 'alu', x: aluBox.x, y: aluBox.y, w: aluBox.w, h: aluBox.h, color: '#0ea5e9', text: 'ALU', size: Math.max(12, Math.round(aluBox.h * 24)) })
    const aluL = leftMid(shapes, 'alu')
    const aluR = rightMid(shapes, 'alu')
    const dstL = leftMid(shapes, 'dst__box')

    shapes.push(arrowBetween(shapes, 'a_s1_alu', s1R, aluL, { dy1: -0.10, dy2: -0.06 }))
    shapes.push(arrowBetween(shapes, 'a_s2_alu', s2R, aluL, { dy1: +0.10, dy2: +0.06 }))
    shapes.push(arrowBetween(shapes, 'a_alu_dst', aluR, dstL, { dy1: 0, dy2: 0 }))

    const tl = new Timeline()
      .step('s1', '读取源寄存器').appear('s1__box').appear('s2__box').appear('lbl_s1').appear('lbl_s2')
    if (showEllipsis) tl.step('s1e', '省略号显示').appear('s1__ellipsis').appear('s2__ellipsis')
    tl.step('s2', '送入 ALU').appear('a_s1_alu').appear('a_s2_alu').blink('alu', 3, 240)
      .step('s3', '执行加法').blink('alu', 3, 240)
      .step('s4', '写回寄存器').appear('a_alu_dst').appear('dst__box').appear('lbl_dst')
    const initialShow = Math.min(4, shownSlots)
    for (let i = 0; i < initialShow; i++) tl.appear(`dst[${i}]`)
    for (let i = initialShow; i < shownSlots; i++) tl.appear(`dst[${i}]`)
    if (showEllipsis) tl.appear('dst__ellipsis')
    tl.step('s5', '完成')

    const doc = tl.build(shapes, [rs1v, rs2v, rdv])
    const synonyms = [
      { arch: 'ARM', name: 'ADD', note: '同等标量加法', example: 'ADD r0, r1, r2' },
      { arch: 'x86', name: 'ADD', note: '整数加', example: 'add eax, ebx' },
    ]
    ;(doc as any).synonyms = synonyms
    return { doc, extras: { synonyms } }
  }
}

export { addScalarOrVector }
export default addScalarOrVector