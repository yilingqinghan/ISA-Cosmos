import type { InstructionModule, BuildCtx } from '../types'
import { Timeline } from '../timeline'
import {
  inch as px, toNum,
  leftMid, rightMid,
  arrowBetween,
  vectorSlotsFromEnv, layoutRowInBoxFit, bitWidthRulerForBox
} from '../utils/geom'

// 小工具：把数字/十六进制等转 Number（保留你原有行为）
function toN(x:any){ return toNum(x) }

const vaddVV: InstructionModule = {
  id:'rvv/vadd.vv',
  title:'vadd.vv',
  sample:'vadd.vv v0, v1, v2',
  meta:{
    usage:'vadd.vv vd, vs1, vs2；向量加法：vd[i] = vs1[i] + vs2[i]',
    scenarios:['向量数组加法','并行数据处理','科学计算'],
    notes:['元素宽度由 UI 的“元素位宽”决定','支持掩码 vm（演示版未实现掩码绘制）','目的寄存器 vd 可与源寄存器同名'],
    exceptions:['无']
  },
  build(ctx:BuildCtx){
    const [vd='v0',vs1='v1',vs2='v2']=ctx.operands||[]

    // —— 通用：由 UI/env 计算“演示元素数”N（1~8）与位宽 —— 
    const { regBits, elemBits, slots: N } = vectorSlotsFromEnv(ctx.env, {
      maxSlots: 8, defaultRegBits: 128, defaultElemBits: 32
    })

    // values（可由 Editor 注入），按 N 裁剪
    const a0=(ctx.values?.[vs1]??[1,2,3,4,5,6,7,8]).slice(0,N)
    const b0=(ctx.values?.[vs2]??[10,11,12,13,14,15,16,17]).slice(0,N)
    const c0=Array.from({length:N},(_,i)=>{ const va=toN(a0[i]); const vb=toN(b0[i]); return va!=null&&vb!=null?va+vb:'' })

    // —— 角色化 ID，避免 vd == vs1 冲突 —— 
    const boxS1  = { x: px(1),  y: px(1),   w: px(4), h: px(1) }
    const boxS2  = { x: px(1),  y: px(2.4), w: px(4), h: px(1) }
    const boxDst = { x: px(8),  y: px(1.7), w: px(4), h: px(1) }

    const shapes:any[]=[
      {kind:'group',id:`s1__box`,  ...boxS1},
      {kind:'group',id:`s2__box`,  ...boxS2},
      {kind:'group',id:`dst__box`, ...boxDst},
    ]

    // lanes：自动等间距、垂直居中；lane 宽随 N 自适应
    const laneH = 0.8
    const s1Fit  = layoutRowInBoxFit(boxS1,  N, laneH)
    const s2Fit  = layoutRowInBoxFit(boxS2,  N, laneH)
    const dstFit = layoutRowInBoxFit(boxDst, N, laneH)

    for(let i=0;i<N;i++) shapes.push({kind:'rect',id:`s1[${i}]`,...s1Fit.lanes[i],color:'lightgray',text:String(a0[i]??''),textAlign:'center',textBaseline:'middle'})
    for(let i=0;i<N;i++) shapes.push({kind:'rect',id:`s2[${i}]`,...s2Fit.lanes[i],color:'teal',     text:String(b0[i]??''),textAlign:'center',textBaseline:'middle'})

    // ALU
    shapes.push({kind:'rect',id:'alu',x:6,y:1.6,w:1.4,h:1.2,color:'#0EA5E9',text:'ALU',textAlign:'center',textBaseline:'middle'})

    for(let i=0;i<N;i++) shapes.push({kind:'rect',id:`dst[${i}]`,...dstFit.lanes[i],color:'lightgray',text:String(c0[i]),textAlign:'center',textBaseline:'middle'})

    // 位宽标尺：源寄存器在 Step1 出现；目标寄存器在 Step4 出现
    const rulerS1  = bitWidthRulerForBox(boxS1,  regBits, 'ruler_s1')
    const rulerDst = bitWidthRulerForBox(boxDst, regBits, 'ruler_dst')
    shapes.push(...rulerS1, ...rulerDst)

    // flows：只定义，不在初始就显示；出现时机交给 timeline
    const s1R  = rightMid(shapes, 's1__box')
    const s2R  = rightMid(shapes, 's2__box')
    const aluL = leftMid(shapes,  'alu')
    const aluR = rightMid(shapes, 'alu')
    const dstL = leftMid(shapes,  'dst__box')

    shapes.push(arrowBetween(shapes,'a_s1_alu', s1R, aluL, { dy1:-0.15, dy2:-0.15 }))
    shapes.push(arrowBetween(shapes,'a_s2_alu', s2R, aluL, { dy1:+0.15, dy2:+0.15 }))
    shapes.push(arrowBetween(shapes,'a_alu_dst', aluR, dstL))

    // 标签（显示真实寄存器号）
    shapes.push(
      {kind:'label',id:`lbl_s1`, x:1, y:0.6, text:`vs1 = ${vs1}`},
      {kind:'label',id:`lbl_s2`, x:1, y:2.0, text:`vs2 = ${vs2}`},
      {kind:'label',id:`lbl_dst`,x:8, y:1.2, text:`vd = ${vd}`},
    )

    // —— Timeline：严格控制“线”的出现时机 —— 
    const tl = new Timeline()
      // Step 1：源寄存器 + 源标尺 + 标签
      .step('s1','读取源向量')
        .appear('s1__box').appear('s2__box')
        .appear('lbl_s1').appear('lbl_s2')
        .appear('ruler_s1__l').appear('ruler_s1__r').appear('ruler_s1__t')
      // Step 2：送入 ALU（此时才出现两条输入箭头）
      .step('s2','送入 ALU')
        .appear('a_s1_alu').appear('a_s2_alu')
        .blink('alu',3,240)
      // Step 3：执行加法（继续闪烁 ALU）
      .step('s3','执行加法')
        .blink('alu',3,240)
      // Step 4：写回（目标框 + 目标标尺 + 标签 + 输出箭头 + 结果 lanes）
      .step('s4','写回结果')
        .appear('a_alu_dst').appear('dst__box')
        .appear('ruler_dst__l').appear('ruler_dst__r').appear('ruler_dst__t')
        .appear('lbl_dst')
        // 先出现前 4 个，保证小屏也有节奏感
        .appear('dst[0]').appear('dst[1]').appear('dst[2]').appear('dst[3]')

    // 若 N>4，则把剩余 dst.append 到 step4（保持同一阶段出现）
    for (let i = 4; i < N; i++) tl.appear(`dst[${i}]`)

    tl.step('s5','完成')

    const doc = tl.build(shapes, [vs1, vs2, vd])

    const synonyms = [
      // ARMv8-A / NEON
      {
        arch: 'ARMv8-A NEON',
        name: 'ADD (vector)',
        note: 'A64 向量逐元素整数加法',
        example: 'ADD V0.4S, V1.4S, V2.4S   // 4×int32',
        intrinsics: ['vaddq_s32','vaddq_u8','vaddq_s16','vaddq_s64']
      },
    
      // x86 SSE / AVX
      {
        arch: 'x86 SSE/AVX',
        name: 'PADDB/PADDW/PADDD/PADDQ (VPADD*)',
        note: '打包整数逐元素相加；AVX 为 VPADD*',
        example: '__m128i c = _mm_add_epi32(a,b);   // PADDD',
      },
    
      // MIPS MSA
      {
        arch: 'MIPS MSA',
        name: 'ADDV.B/H/W/D',
        note: 'MSA 整数逐元素相加（非饱和）',
        example: '__m128i c = (__m128i)__msa_addv_w(a,b);'
      },
    
      // LoongArch LSX（128-bit）
      {
        arch: 'LoongArch LSX',
        name: 'VADD.B/H/W/D',
        note: 'LSX 128b 逐元素相加；亦有 vaddwev/vaddwod 扩展位宽变体',
        example: '__m128i c = __lsx_vadd_w(a,b);'
      },
    
      // LoongArch LASX（256-bit）
      {
        arch: 'LoongArch LASX',
        name: 'XVADD.B/H/W/D/Q',
        note: 'LASX 256b 逐元素相加',
        example: '__m256i c = __lasx_xvadd_w(a,b);'
      },
    ]
    return { doc, extras: { synonyms } }
  }
}

export { vaddVV }
export default vaddVV