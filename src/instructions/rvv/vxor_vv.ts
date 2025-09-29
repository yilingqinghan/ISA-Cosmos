import type { InstructionModule, BuildCtx } from '../types'
import { Timeline } from '../timeline'
import {
    inch as px,
    toNum,
    leftMid, rightMid, centerOf,
    arrowBetween,
    layoutRowInBox,
} from '../utils/geom'

const vxorVV: InstructionModule = {
    id: 'rvv/vxor.vv',
    title: 'vxor.vv',
    sample: 'vxor.vv v0, v1, v2',
    meta: {
        usage: 'VXOR.VV vd, vs2, vs1[, vm]；向量-向量按位异或：对每个元素 i，若 vm[i]=1 或未提供 vm，则 vd[i] = vs2[i] ^ vs1[i]；否则若 vd≠vs2 且 vd≠vs1，则保持 vd[i] 不变。',
        scenarios: ['数据加密', '校验和计算', '位翻转操作'],
        notes: ['按位异或操作，适用于任意元素宽度', '支持掩码 vm'],
        exceptions: ['无']
    },
    build(ctx: BuildCtx) {
        const [vd = 'v0', vs2 = 'v1', vs1 = 'v2', vm = undefined as any] = ctx.operands || []
        const VL = ctx.env?.VL ?? 4

        const s2Vals = (ctx.values?.[vs2] ?? [10, 11, 12, 13]).slice(0, VL)
        const s1Vals = (ctx.values?.[vs1] ?? [1, 2, 3, 4]).slice(0, VL)
        const dstInit = (ctx.values?.[vd] ?? Array(VL).fill('')).slice(0, VL)
        const maskArr = vm ? (ctx.values?.[vm] ?? Array(VL).fill(1)) : Array(VL).fill(1)

        const outVals = Array.from({ length: VL }, (_, i) => {
            const m = toNum(maskArr[i])
            const a = toNum(s2Vals[i])
            const b = toNum(s1Vals[i])
            if (m === null || m === 0) {
                const keep = toNum(dstInit[i])
                return keep != null ? keep : ''
            }
            if (a == null || b == null) return ''
            return (a ^ b).toString()
        })

        const boxS2 = { x: px(1), y: px(1), w: px(4), h: px(1) }
        const boxS1 = { x: px(1), y: px(2.4), w: px(4), h: px(1) }
        const boxDst = { x: px(8), y: px(1.7), w: px(4), h: px(1) }

        const shapes: any[] = [
            { kind: 'group', id: 's2__box', ...boxS2 },
            { kind: 'group', id: 's1__box', ...boxS1 },
            { kind: 'group', id: 'dst__box', ...boxDst },
        ]

        const laneW = 0.8, laneH = 0.8
        const s2Lanes = layoutRowInBox(boxS2, VL, laneW, laneH)
        const s1Lanes = layoutRowInBox(boxS1, VL, laneW, laneH)
        const dstLanes = layoutRowInBox(boxDst, VL, laneW, laneH)

        for (let i = 0; i < VL; i++) shapes.push({ kind: 'rect', id: `s2[${i}]`, ...s2Lanes[i], color: 'teal', text: String(s2Vals[i] ?? ''), textAlign: 'center', textBaseline: 'middle' })
        for (let i = 0; i < VL; i++) shapes.push({ kind: 'rect', id: `s1[${i}]`, ...s1Lanes[i], color: 'lightgray', text: String(s1Vals[i] ?? ''), textAlign: 'center', textBaseline: 'middle' })

        shapes.push({ kind: 'rect', id: 'alu', x: 6, y: 1.6, w: 1.4, h: 1.2, color: '#0EA5E9', text: 'ALU' })

        for (let i = 0; i < VL; i++) shapes.push({ kind: 'rect', id: `dst[${i}]`, ...dstLanes[i], color: 'lightgray', text: String(outVals[i]), textAlign: 'center', textBaseline: 'middle' })

        shapes.push(
            { kind: 'label', id: 'lbl_s2', x: 1, y: 0.6, text: `vs2 = ${vs2}` },
            { kind: 'label', id: 'lbl_s1', x: 1, y: 2.0, text: `vs1 = ${vs1}` },
            { kind: 'label', id: 'lbl_dst', x: 8, y: 1.2, text: `vd = ${vd}` },
        )
        if (vm) { shapes.push({ kind: 'label', id: 'lbl_vm', x: 1, y: 3.2, text: `vm = ${vm}` }) }

        const s2R = rightMid(shapes, 's2__box')
        const s1R = rightMid(shapes, 's1__box')
        const aluL = leftMid(shapes, 'alu')
        const aluR = rightMid(shapes, 'alu')
        const dstL = leftMid(shapes, 'dst__box')

        shapes.push(arrowBetween(shapes, 'a_s2_alu', s2R, aluL, { dy1: -0.15, dy2: -0.15 }))
        shapes.push(arrowBetween(shapes, 'a_s1_alu', s1R, aluL, { dy1: +0.15, dy2: +0.15 }))
        shapes.push(arrowBetween(shapes, 'a_alu_dst', aluR, dstL))

        const tl = new Timeline()
            .step('s1', '读取源向量').appear('s2__box').appear('s1__box').appear('lbl_s2').appear('lbl_s1')
            .step('s2', '送入 ALU').appear('a_s2_alu').appear('a_s1_alu').blink('alu', 3, 240)
            .step('s3', '执行异或').blink('alu', 3, 240)
            .step('s4', '写回结果').appear('a_alu_dst').appear('dst__box').appear('lbl_dst').appear('dst[0]').appear('dst[1]').appear('dst[2]').appear('dst[3]')
            .step('s5', '完成')

        const doc = tl.build(shapes, [vs2, vs1, vd])
        const synonyms = [
            { arch: 'ARM NEON', name: 'veorq_u32', note: '按位异或', example: 'uint32x4_t c = veorq_u32(a,b);' },
            { arch: 'x86 SSE/AVX', name: 'PXOR/VPXOR', note: '按位异或', example: '__m128i c = _mm_xor_si128(a,b);' },
        ]
            ; (doc as any).synonyms = synonyms
        return { doc, extras: { synonyms } }

    }
}

export { vxorVV }
export default vxorVV
