import type { InstructionModule, BuildCtx } from '../types'
import { Timeline } from '../timeline'

const px = (u:number)=>u // inches; panel multiplies by 96
function toNum(x:any){ if(x==null) return null; if(typeof x==='number') return x; const s=String(x).trim(); if(/^0x/i.test(s)){ const v=parseInt(s.replace(/^0x/i,''),16); return Number.isFinite(v)?v:null } const v=Number(s); return Number.isFinite(v)?v:null }

const vaddVV: InstructionModule = {
  id:'rvv/vadd.vv',
  title:'vadd.vv',
  sample:'vadd.vv v0, v1, v2',
  meta:{
    usage:'vadd.vv vd, vs1, vs2；向量加法：vd[i] = vs1[i] + vs2[i]',
    scenarios:['向量数组加法','并行数据处理','科学计算'],
    notes:['元素宽度由 vtype.vsew 决定','支持掩码 vm','目的寄存器 vd 可与源寄存器同名'],
    exceptions:['无']
  },
  build(ctx:BuildCtx){
    const [vd='v0',vs1='v1',vs2='v2']=ctx.operands||[]; const VL=ctx.env?.VL??4

    // values (可由 Editor 注入），默认演示值
    const a0=(ctx.values?.[vs1]??[1,2,3,4]).slice(0,VL)
    const b0=(ctx.values?.[vs2]??[10,11,12,13]).slice(0,VL)
    const c0=Array.from({length:VL},(_,i)=>{ const va=toNum(a0[i]); const vb=toNum(b0[i]); return va!=null&&vb!=null?va+vb:'' })

    // —— 重要：使用“角色前缀”的 ID，避免 vd==vs1 时出现 ID 冲突 ——
    // 左侧源向量：s1/s2；右侧目的：dst
    const shapes:any[]=[
      // boxes
      {kind:'group',id:`s1__box`,x:px(1),y:px(1),w:px(4),h:px(1)},
      {kind:'group',id:`s2__box`,x:px(1),y:px(2.4),w:px(4),h:px(1)},
      {kind:'group',id:`dst__box`,x:px(8),y:px(1.7),w:px(4),h:px(1)},

      // lanes（固定渲染 4 个演示位；后续可改为按 VL 动态生成）
      {kind:'rect',id:`s1[0]`,x:1.1,y:1.1,w:0.8,h:0.8,color:'lightgray',text:String(a0[0]??'')},
      {kind:'rect',id:`s1[1]`,x:2.0,y:1.1,w:0.8,h:0.8,color:'lightgray',text:String(a0[1]??'')},
      {kind:'rect',id:`s1[2]`,x:2.9,y:1.1,w:0.8,h:0.8,color:'lightgray',text:String(a0[2]??'')},
      {kind:'rect',id:`s1[3]`,x:3.8,y:1.1,w:0.8,h:0.8,color:'lightgray',text:String(a0[3]??'')},

      {kind:'rect',id:`s2[0]`,x:1.1,y:2.5,w:0.8,h:0.8,color:'teal',text:String(b0[0]??'')},
      {kind:'rect',id:`s2[1]`,x:2.0,y:2.5,w:0.8,h:0.8,color:'teal',text:String(b0[1]??'')},
      {kind:'rect',id:`s2[2]`,x:2.9,y:2.5,w:0.8,h:0.8,color:'teal',text:String(b0[2]??'')},
      {kind:'rect',id:`s2[3]`,x:3.8,y:2.5,w:0.8,h:0.8,color:'teal',text:String(b0[3]??'')},

      // ALU
      {kind:'rect',id:'alu',x:6,y:1.6,w:1.4,h:1.2,color:'#0EA5E9',text:'ALU'},

      // dst lanes（写回时出现）
      {kind:'rect',id:`dst[0]`,x:8.1,y:1.8,w:0.8,h:0.8,color:'lightgray',text:String(c0[0])},
      {kind:'rect',id:`dst[1]`,x:9.0,y:1.8,w:0.8,h:0.8,color:'lightgray',text:String(c0[1])},
      {kind:'rect',id:`dst[2]`,x:9.9,y:1.8,w:0.8,h:0.8,color:'lightgray',text:String(c0[2])},
      {kind:'rect',id:`dst[3]`,x:10.8,y:1.8,w:0.8,h:0.8,color:'lightgray',text:String(c0[3])},

      // flows（角色化 ID）
      {kind:'arrow',id:`a_s1_alu`,x1:4.6,y1:1.5,x2:6,y2:2.0,color:'#94a3b8',width:2},
      {kind:'arrow',id:`a_s2_alu`,x1:4.6,y1:2.9,x2:6,y2:2.1,color:'#94a3b8',width:2},
      {kind:'arrow',id:`a_alu_dst`,x1:7.4,y1:2.2,x2:8.1,y2:2.2,color:'#94a3b8',width:2},

      // labels（显示真实寄存器号）
      {kind:'label',id:`lbl_s1`,x:1,y:0.6,text:`vs1 = ${vs1}`},
      {kind:'label',id:`lbl_s2`,x:1,y:2.0,text:`vs2 = ${vs2}`},
      {kind:'label',id:`lbl_dst`,x:8,y:1.2,text:`vd = ${vd}`},
    ]

    const tl = new Timeline()
      .step('s1','读取源向量').appear('s1__box').appear('s2__box').appear('lbl_s1').appear('lbl_s2')
      .step('s2','送入 ALU').appear('a_s1_alu').appear('a_s2_alu').blink('alu',3,240)
      .step('s3','执行加法').blink('alu',3,240)
      .step('s4','写回结果').appear('a_alu_dst').appear('dst__box').appear('lbl_dst').appear('dst[0]').appear('dst[1]').appear('dst[2]').appear('dst[3]')
      .step('s5','完成')

    const doc = tl.build(shapes, [vs1, vs2, vd])
    const synonyms = [
      { arch: 'ARM NEON', name: 'vaddq_s32', note: '同宽度向量加法', example: 'int32x4_t c = vaddq_s32(a,b);' },
      { arch: 'x86 SSE/AVX', name: 'PADDD/VPADDD', note: '32位打包加', example: '__m128i c = _mm_add_epi32(a,b);' },
    ]
    ;(doc as any).synonyms = synonyms
    return { doc, extras: { synonyms } }
  }
}

export { vaddVV }
export default vaddVV
