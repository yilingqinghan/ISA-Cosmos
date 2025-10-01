import type { InstructionModule, BuildCtx } from '../../types'
import { Timeline } from '../../timeline'
import { tr } from '@/i18n'
import { syn } from '../../utils/syn'
import {
  inch as px, toNum,
  vectorSlotsFromEnv, layoutRowInBoxSquare, bitWidthRulerForBox
} from '../../utils/geom'

const vaddVV: InstructionModule = {
  id: 'riscv/vadd.vv',
  title: 'vadd.vv',
  sample: 'vadd.vv v0, v1, v2',
  meta: {
    usage: tr('vadd.vv vd, vs1, vs2；向量加法：vd[i] = vs1[i] + vs2[i]', 'vadd.vv vd, vs1, vs2; Vector add: vd[i] = vs1[i] + vs2[i]'),
    scenarios: [
      tr('向量数组加法', 'Vector array addition'),
      tr('并行数据处理', 'Parallel data processing'),
      tr('科学计算', 'Scientific computing')
    ],
    notes: [
      tr('元素宽度由 UI 的“元素位宽”决定', 'Element width follows UI "Element width"'),
      tr('支持掩码 vm（演示版未实现掩码绘制）', 'Mask vm supported (demo does not render mask)'),
      tr('目的寄存器 vd 可与源寄存器同名', 'Destination vd may equal a source')
    ],
    exceptions: [ tr('无', 'None') ]
  },
  build(ctx: BuildCtx) {
    const [vd = 'v0', vs1 = 'v1', vs2 = 'v2'] = ctx.operands || []

    // —— 从通用 env 计算 
    const { regBits, elemBits, rawSlots, slots: N } =
      vectorSlotsFromEnv(ctx.env, { maxSlots: 8, defaultRegBits: 128, defaultElemBits: 32 })

    // 超出上限则预留“一个格子”给省略号：显示 N-1 个元素，但**排布用 N 个格子**
    const showEllipsis  = rawSlots > N
    const shownSlots    = showEllipsis ? N - 1 : N
    const slotsForLayout = showEllipsis ? shownSlots + 1 : shownSlots

    // values（可由 Editor 注入），默认演示值
    const a0 = (ctx.values?.[vs1] ?? [1,2,3,4,5,6,7,8]).slice(0, shownSlots)
    const b0 = (ctx.values?.[vs2] ?? [10,11,12,13,14,15,16,17]).slice(0, shownSlots)
    const c0 = Array.from({ length: shownSlots }, (_, i) => {
      const va = toNum(a0[i]); const vb = toNum(b0[i])
      return va != null && vb != null ? (va as number) + (vb as number) : ''
    })

    // —— 框体 ——（注意：尺寸固定为“英寸”，渲染层会换算为 px）
    const boxS1  = { x: px(1), y: px(1.00), w: px(4), h: px(1) }
    const boxS2  = { x: px(1), y: px(2.40), w: px(4), h: px(1) }
    const boxDst = { x: px(8), y: px(1.70), w: px(4), h: px(1) }

    const shapes: any[] = [
      { kind: 'group', id: 's1__box',  ...boxS1 },
      { kind: 'group', id: 's2__box',  ...boxS2 },
      { kind: 'group', id: 'dst__box', ...boxDst },
    ]

    // —— 自适应排布（注意：这里用 slotsForLayout，这样最后一个格子是给省略号的）——
    const dynGap = N >= 8 ? 0.10 : N >= 6 ? 0.14 : 0.18
    const s1Fit  = layoutRowInBoxSquare(boxS1,  slotsForLayout, 0.80, { gap: dynGap })
    const s2Fit  = layoutRowInBoxSquare(boxS2,  slotsForLayout, 0.80, { gap: dynGap })
    const dstFit = layoutRowInBoxSquare(boxDst, slotsForLayout, 0.80, { gap: dynGap })

    // 动态字号与圆角（以方块边长为基准）
    const textPx  = Math.max(12, Math.min(30, Math.round(s1Fit.side * 96 * 0.45)))
    const roundPx = Math.max(8,  Math.round(s1Fit.side * 96 * 0.22))

    // —— 源/目标 lane（严格保持 w==h 正方形）——
    for (let i = 0; i < shownSlots; i++) {
      shapes.push({ kind:'rect', id:`s1[${i}]`, ...s1Fit.lanes[i],
        color:'lightgray', text:String(a0[i] ?? ''), textAlign:'center', textBaseline:'middle',
        size:textPx, roundPx })
    }
    for (let i = 0; i < shownSlots; i++) {
      shapes.push({ kind:'rect', id:`s2[${i}]`, ...s2Fit.lanes[i],
        color:'teal', text:String(b0[i] ?? ''), textAlign:'center', textBaseline:'middle',
        size:textPx, roundPx })
    }
    for (let i = 0; i < shownSlots; i++) {
      shapes.push({ kind:'rect', id:`dst[${i}]`, ...dstFit.lanes[i],
        color:'lightgray', text:String(c0[i]), textAlign:'center', textBaseline:'middle',
        size:textPx, roundPx })
    }

    // ALU
    shapes.push({ kind: 'rect', id: 'alu', x: 6, y: 1.6, w: 1.4, h: 1.2, color: '#0EA5E9', text: tr('ALU', 'ALU') })

    // —— 位宽标尺（文本无底色，且与总元素数并排显示：256-bit · 32 elems） ——
    shapes.push(...bitWidthRulerForBox(boxS1,  regBits, 'ruler_s1', 0.5, { elems: rawSlots }))
    shapes.push(...bitWidthRulerForBox(boxDst, regBits, 'ruler_dst', 0.6, { elems: rawSlots }))

    // —— 省略号（放在“最后一个格子”的正中；三个框都要有）——
    if (showEllipsis) {
      const putEll = (fit: {side:number; lanes:{x:number;y:number;w:number;h:number}[]}, id:string) => {
        const last = fit.lanes[fit.lanes.length - 1] // 预留给省略号的第 N 个格子
        shapes.push({
          kind:'text', id:`${id}__ellipsis`,
          x:last.x, y:last.y, w:last.w, h:last.h,           // 让渲染层可用宽高做真正的水平/垂直居中
          text:'…',
          size: Math.max(16, Math.round(fit.side * 96 * 0.55)),
          color:'#475569', align:'center', vAlign:'middle'
        })
      }
      putEll(s1Fit, 's1')
      putEll(s2Fit, 's2')   // ← 之前缺失的 vs2 省略号
      putEll(dstFit, 'dst')
    }

    // —— 箭头（从各组框的水平中心射向 ALU；从 ALU 射向目标框）——
    const s1R = { x: boxS1.x + boxS1.w, y: boxS1.y + boxS1.h / 2 }
    const s2R = { x: boxS2.x + boxS2.w, y: boxS2.y + boxS2.h / 2 }
    const aluL = { x: 6,               y: 1.6 + 1.2/2 }
    const aluR = { x: 6 + 1.4,         y: 1.6 + 1.2/2 }
    const dstL = { x: boxDst.x,        y: boxDst.y + boxDst.h / 2 }

    shapes.push({ kind: 'arrow', id: 'a_s1_alu',  x1: s1R.x, y1: s1R.y - 0.15, x2: aluL.x, y2: aluL.y - 0.15, color: '#94a3b8', width: 2 })
    shapes.push({ kind: 'arrow', id: 'a_s2_alu',  x1: s2R.x, y1: s2R.y + 0.15, x2: aluL.x, y2: aluL.y + 0.15, color: '#94a3b8', width: 2 })
    shapes.push({ kind: 'arrow', id: 'a_alu_dst', x1: aluR.x, y1: aluR.y,       x2: dstL.x, y2: dstL.y,       color: '#94a3b8', width: 2 })

    // —— 标签（显示真实寄存器号）——
    shapes.push({ kind: 'label', id: 'lbl_s1',  x: 1, y: 0.60, text: `vs1 = ${vs1}` })
    shapes.push({ kind: 'label', id: 'lbl_s2',  x: 1, y: 2.00, text: `vs2 = ${vs2}` })
    shapes.push({ kind: 'label', id: 'lbl_dst', x: 8, y: 1.20, text: `vd = ${vd}` })

    // —— Timeline ——（补上 s2 的省略号；去掉不存在的 __count）
    const tl = new Timeline()
    .step('s1', tr('读取源向量', 'Read source vectors'))
    .appear('s1__box').appear('s2__box')
    .appear('lbl_s1').appear('lbl_s2')
    .appear('ruler_s1__l').appear('ruler_s1__r').appear('ruler_s1__t')

    if (showEllipsis) tl.appear('s1__ellipsis').appear('s2__ellipsis')

    tl.step('s2', tr('送入 ALU', 'Feed into ALU'))
    .appear('a_s1_alu').appear('a_s2_alu')
    .blink('alu', 3, 240)
    .step('s3', tr('执行加法', 'Execute addition'))
    .blink('alu', 3, 240)
    .step('s4', tr('写回结果', 'Write back'))
    .appear('a_alu_dst').appear('dst__box')
    .appear('ruler_dst__l').appear('ruler_dst__r').appear('ruler_dst__t')
    .appear('lbl_dst')
    .appear('dst[0]').appear('dst[1]').appear('dst[2]').appear('dst[3]')

    for (let i = 4; i < shownSlots; i++) tl.appear(`dst[${i}]`)
    if (showEllipsis) tl.appear('dst__ellipsis')

    tl.step('s5', tr('完成', 'Done'))
    
    const doc = tl.build(shapes, [vs1, vs2, vd])

    const makeSynonyms = () => [
      syn('ARMv8-A NEON','ARMv8-A NEON','ADD（向量）','ADD (vector)',
          'A64 向量逐元素整数加法','A64 vector element-wise integer add',
          'ADD V0.4S, V1.4S, V2.4S',['vaddq_s32','vaddq_u8','vaddq_s16','vaddq_s64']),
      syn('x86 SSE/AVX','x86 SSE/AVX','PADDB/PADDW/PADDD/PADDQ','PADDB/PADDW/PADDD/PADDQ',
          '打包整数逐元素相加；AVX 为 VPADD*','Packed integer add; AVX uses VPADD*',
          '__m128i c = _mm_add_epi32(a,b);'),
      syn('MIPS MSA','MIPS MSA','ADDV.B/H/W/D','ADDV.B/H/W/D',
          'MSA 整数逐元素相加（非饱和）','MSA element-wise integer add (non-saturating)',
          '__m128i c = (__m128i)__msa_addv_w(a,b);'),
      syn('LoongArch LSX','LoongArch LSX','VADD.B/H/W/D','VADD.B/H/W/D',
          'LSX 128b 逐元素相加；亦有扩展位宽变体','LSX 128b element-wise add; width variants exist',
          '__m128i c = __lsx_vadd_w(a,b);'),
      syn('LoongArch LASX','LoongArch LASX','XVADD.B/H/W/D/Q','XVADD.B/H/W/D/Q',
          'LASX 256b 逐元素相加','LASX 256b element-wise add',
          '__m256i c = __lasx_xvadd_w(a,b);'),
    ]

    // 动态属性：读取 doc.synonyms 时才根据当前语言计算 —— 无需强制重跑
    Object.defineProperty(doc as any, 'synonyms', {
      configurable: true,
      get: makeSynonyms,
    })
    return doc
  }
}

export { vaddVV }
export default vaddVV