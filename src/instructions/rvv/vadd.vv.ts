import type { InstructionModule } from '../types';
import { Timeline } from '../timeline';

const pxIn = (u:number)=>u; // 你的 parse/渲染用“英寸”为单位，这里保持同样的数值体系（CanvasKitPanel 里 PX 会 * 96）

export const vaddVV: InstructionModule = {
  id: 'rvv/vadd.vv',
  title: 'vadd.vv',
  sample: 'vadd.vv v0, v1, v2',
  meta: {
    usage: 'vadd.vv vd, vs1, vs2；向量加法：vd[i] = vs1[i] + vs2[i]',
    scenarios: ['向量数组加法', '并行数据处理', '科学计算'],
    notes: ['元素宽度由 vtype.vsew 决定', '支持掩码 vm', '目的寄存器 vd 可与源寄存器同名'],
    exceptions: ['无'],
  },
  build() {
    const shapes = [
      // 盒子（向量寄存器显示区域）
      { kind:'group', id:'v1__box', x:pxIn(1), y:pxIn(1), w:pxIn(4), h:pxIn(1) },
      { kind:'group', id:'v2__box', x:pxIn(1), y:pxIn(2.4), w:pxIn(4), h:pxIn(1) },
      { kind:'group', id:'v3__box', x:pxIn(8), y:pxIn(1.7), w:pxIn(4), h:pxIn(1) },
      // lanes（示意 4 lane）
      { kind:'rect', id:'v1[0]', x:1.1, y:1.1, w:0.8, h:0.8, color:'lightgray', text:'1' },
      { kind:'rect', id:'v1[1]', x:2.0, y:1.1, w:0.8, h:0.8, color:'lightgray', text:'2' },
      { kind:'rect', id:'v1[2]', x:2.9, y:1.1, w:0.8, h:0.8, color:'lightgray', text:'3' },
      { kind:'rect', id:'v1[3]', x:3.8, y:1.1, w:0.8, h:0.8, color:'lightgray', text:'4' },

      { kind:'rect', id:'v2[0]', x:1.1, y:2.5, w:0.8, h:0.8, color:'teal', text:'10' },
      { kind:'rect', id:'v2[1]', x:2.0, y:2.5, w:0.8, h:0.8, color:'teal', text:'11' },
      { kind:'rect', id:'v2[2]', x:2.9, y:2.5, w:0.8, h:0.8, color:'teal', text:'12' },
      { kind:'rect', id:'v2[3]', x:3.8, y:2.5, w:0.8, h:0.8, color:'teal', text:'13' },

      // ALU
      { kind:'rect', id:'alu', x:6, y:1.6, w:1.4, h:1.2, color:'#0EA5E9', text:'ALU' },

      // 目标 lane 占位（写回时出现）
      { kind:'rect', id:'v3[0]', x:8.1, y:1.8, w:0.8, h:0.8, color:'lightgray', text:'' },
      { kind:'rect', id:'v3[1]', x:9.0, y:1.8, w:0.8, h:0.8, color:'lightgray', text:'' },
      { kind:'rect', id:'v3[2]', x:9.9, y:1.8, w:0.8, h:0.8, color:'lightgray', text:'' },
      { kind:'rect', id:'v3[3]', x:10.8, y:1.8, w:0.8, h:0.8, color:'lightgray', text:'' },

      // 数据流箭头（示意）
      { kind:'arrow', id:'a_v1_alu', x1:4.6, y1:1.5, x2:6, y2:2.0, color:'#94a3b8', width:2 },
      { kind:'arrow', id:'a_v2_alu', x1:4.6, y1:2.9, x2:6, y2:2.1, color:'#94a3b8', width:2 },
      { kind:'arrow', id:'a_alu_v3', x1:7.4, y1:2.2, x2:8.1, y2:2.2, color:'#94a3b8', width:2 },
    ] as any;

    const tl = new Timeline()
      .step('s1', '读取源向量').appear('v1__box').appear('v2__box')
      .step('s2', '送入 ALU').appear('a_v1_alu').appear('a_v2_alu').blink('alu', 3, 240)
      .step('s3', '执行加法').blink('alu', 3, 240)
      .step('s4', '写回 v3').appear('a_alu_v3').appear('v3__box').appear('v3[0]').appear('v3[1]').appear('v3[2]').appear('v3[3]')
      .step('s5', '完成');

    // pack 合并 v1/v2/v3（十六进制模式下显示合并条）
    return tl.build(shapes, ['v1','v2','v3']);
  }
};