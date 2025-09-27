你是“指令可视化 DSL 生成器”。我会给你指令信息，你需要产出一个 TypeScript 文件，把汇编 AST 转成我项目中的 DSL 字符串。请严格遵守下面的“输出要求”。你可以按照指令类型（算术/IO/内存/栈/跳转等）自由设计步骤数量与叙事风格，只要遵循 DSL 语法与坐标约束即可。

========================
【输入（请在心中读取并代入到输出）】

请完成rvv的vmul.vv

========================
【DSL 语法（必须遵循）】
1) step(id,"名称")
   - 定义一个步骤/场景，后续 appear/blink/disappear 使用该 stepId 控制出现/动画。
   - 步骤数量与名称完全由你决定：可以是 2 步、5 步、甚至更多。

2) label(id,x,y,"文字")
   - 小黑底圆角签，承载短文案（如寄存器名、提示字）。
   - x/y 为网格坐标（单位 u，前端 1u≈96px，AutoFit 会缩放）。

3) rect(id,w,h,x,y,"文字",color)
   - 实心矩形，可带内文。常用 color：lightgray / teal / black / #0EA5E9 / #22d3ee（或任意 HEX）。
   - 用于寄存器槽、内存槽、端口盒、栈帧块等。

4) group(id,x,y,w,h,dotted|solid)
   - 框选区域（常用 dotted），用于 VRF 顶行包围框、端口区域、栈帧边界等。

5) line(id,x1,y1,x2,y2,width,color)
   - 直线，常用于时间线/对齐线/总线辅助线。

6) arrow(id,x1,y1,x2,y2,width,"文字",above,color,start?,end?)
   - 箭头，默认只要 end=true 即可绘制终点箭头。
   - 文字可留空（""）；above 表示文字在上/下（true/false）。

7) appear(id[,id2...], stepId)
   - 在某步骤出现；可一次列出多个 id。

8) blink(id[,id2...], stepId, times, periodMs)
   - 在该步骤让元素闪烁（用于强调）。

9) disappear(id[,id2...], stepId)
   - 在某步骤消隐。

【坐标与可视范围】
- 坐标单位 u；1u≈96px；前端会自动等比缩放。
- 安全可视区域（建议）：x ∈ [2.0, 11.5]，y ∈ [-0.5, 5.0]。
- 建议在内容四周预留少量空间（~0.2–0.4u），避免贴边。

【ID 命名】
- 由字母/数字/下划线组成（如 rf_v0, port_in, sp_arrow, a_1）。
- 保证同一 DSL 文本中唯一。

【设计自由】
- 你可以根据指令类型自由设计叙事：算术可 s_载入→s_对齐→s_计算→s_写回；栈可 s_帧展开→sp 变化→读写回退；跳转可 s_pc 时间线→条件标注→目标高亮等。
- 步骤数量不设限；鼓励“让用户喜欢”的讲解动效（适度 blink、箭头引导、分组半透明）。
- 同一场景可使用多条 appear/blink/disappear 控制元素。

========================
【输出要求（非常重要）】
1) 只输出一个 TypeScript 代码块，顶部以“文件路径注释”开头：
   // src/lang/[arch]/[opcode].ts

2) 文件内必须：
   - import type { AsmAst } from '../types'
   - 导出 const USAGE = "[opcode].[form] vd, vs1, vs2  ; 简短中文语义"
     * 若该形态不是 3 操作数（例如内存或栈），请替换为准确格式，如：
       PUSH xN       /  POP xN
       CALL label    /  RET
       JMP label     /  BNE label, rs1, rs2
       LOAD vd, [addr] / STORE [addr], vs1
   - 导出函数：
     export function [arch][OpcodePascal]ToDsl(ast: AsmAst): string
     说明：
     * 从 ast.operands 里容错取出所需操作数（不足时给合理默认，如 vd=v0、vs1=v1、vs2=v2、sp=x2 等）。
     * 你可以在函数里生成演示值（例如 1,2,3 / 10,11,12），或画空槽结合箭头/说明。
     * 返回值是完整的多行 DSL 字符串（以 \n 连接）。
   - 允许在顶部定义布局常量（例如寄存器行/端口/栈帧的几何）、小工具函数（如寄存器索引转 x 坐标）。

3) 只用上述 DSL 原语；不要使用我未列出的指令（例如 text/vec4/square 若我未声明支持）。

4) 坐标数值请给出具体数字（不要写 TODO/占位），确保落在可视安全范围。

5) 不要修改其它文件，不要输出解释性文字。只产出一个 TS 文件代码块。

========================
【设计参考（不同指令家族的建议元素组合，仅供启发，不是硬性要求）】
- 向量算术（add/mul/and/xor/...）：
  * 顶部 VRF 32 寄存器行（可选），高亮用到的寄存器；箭头指向放大区；
  * 放大区三行：源/源/目的；横线 + 运算符（可用 label 写“×”“+”等）；写回目的；
- IO / 端口：
  * 左右各一个 group 作为 in/out 端口，端口框内用 rect 表示数据槽；中间用 arrow 表示数据流；
- 内存 LOAD/STORE：
  * 右侧画 memory 区域（group），地址/数据用 label/rect；LOAD 用箭头 memory→寄存器；STORE 相反；
- 栈 PUSH/POP/CALL/RET：
  * 底部画栈帧 group，多层 rect 叠放；SP（栈指针）用 label + arrow 表示移动方向；PUSH 增加一格，POP 减少一格；
  * CALL：把返回地址 rect 推入栈；RET：从栈顶弹出，箭头回到 PC；
- 跳转/条件分支：
  * 上方画 PC 时间线（line），当前 PC label；画条件 label（如 “rs1==rs2?”）；箭头指向目标 label 或保持不变；可用 dotted 表示未 taken 分支。

========================
【One-Shot 示例（算术类；但你在别的指令类型上可自由发挥步骤与布局）】
请先学习下面“示例代码”的结构风格与 DSL 用法，然后生成我在“输出目标”里要求的文件。

```ts
// src/lang/rvv/vadd.ts
import type { AsmAst } from '../types'

// 顶排 32 个寄存器的几何（单位：你的 DSL 坐标单位）
const REG_START_X = 2.60;     // v0 的 x
const REG_STEP    = 0.31;     // 相邻寄存器的间距
const REG_Y       = 0.00;     // 行 y
const REG_W       = 0.25;
const REG_H       = 0.25;

function vxToIndex(v: string): number {
  const m = v.trim().match(/^v(\d+)$/i)
  return m ? Math.max(0, Math.min(31, parseInt(m[1], 10))) : 0
}
function xi(i: number) { return +(REG_START_X + REG_STEP * i).toFixed(2) }

export function rvvVaddToDsl(ast: AsmAst): string {
  const [vdRaw, vs1Raw, vs2Raw] = ast.operands
  const vd  = (vdRaw || 'v0').trim()
  const vs1 = (vs1Raw || 'v1').trim()
  const vs2 = (vs2Raw || 'v2').trim()

  const idVd  = vxToIndex(vd)
  const idV1  = vxToIndex(vs1)
  const idV2  = vxToIndex(vs2)

  // --- 选择框覆盖最小到最大索引区间（可同时高亮 1~3 个，甚至将来更多） ---
  const lo = Math.min(idVd, idV1, idV2)
  const hi = Math.max(idVd, idV1, idV2)
  const selCount = hi - lo + 1
  const selX = +(xi(lo) - 0.10).toFixed(2)              // 与 vec4 的 box 规则一致：左右各留 0.1
  const selW = +(REG_STEP * selCount + 0.20).toFixed(2) // 宽度 = N * step + 0.2
  const selY = -0.04
  const selH =  0.38

  // 箭头：从选择框的中点指向放大区（6, 1）
  const arrowStartX = +(selX + selW / 2).toFixed(2)
  const arrowStartY =  0.45
  const arrowEndX   =  6.00
  const arrowEndY   =  1.00

  // 顶排 32 个小寄存器（v0..v31），源/目的寄存器着色 teal，其它 lightgray
  const topRowRects: string[] = []
  for (let i = 0; i < 32; i++) {
    const color =
      (i === idV1 || i === idV2 || i === idVd) ? 'teal' : 'lightgray'
    topRowRects.push(
      `rect(rf_v${i}, ${REG_W}, ${REG_H}, ${xi(i)}, ${REG_Y.toFixed(2)}, "v${i}", ${color})`
    )
  }

  const v1Init = '1,2,3,4'
  const v2Init = '10,11,12,13'

  return `# ----------------------------------------------------
# RVV vadd.vv：4-lane (VLEN=128, SEW=32)
# 叙事：
#   s0 顶部展示 VRF 的 32 个向量寄存器，明确源: ${vs1}/${vs2}，目标: ${vd}
#   s1 载入与对齐
#   s2 位宽解释
#   s3 逐 lane 相加
#   s4 写回结果
# ----------------------------------------------------

step(s0,"选择寄存器")
step(s1,"第一步：载入与对齐")
step(s2,"第二步：位宽（128-bit = 4 × 32-bit）")
step(s3,"第三步：逐 lane 相加：${vd}[i] = ${vs1}[i] + ${vs2}[i]")
step(s4,"第四步：写回结果")

# =============== s0：VRF 顶行（32 个寄存器，一排） ===============
text(vrf_title, 2.60, -0.28, "VRF（32 × 向量寄存器）", 14, #111827)
text(vrf_legend, 5.80, -0.28, "源寄存器: ${vs1}, ${vs2}    目标寄存器: ${vd}", 14, #0f172a)

group(reg_row, 2.50, -0.12, 10.40, 0.44, dotted)
pack_default(off)
nopack_prefix("rf_")

${topRowRects.join('\n')}

arrow(sel_to_zoom, ${arrowStartX}, ${arrowStartY}, ${arrowEndX}, ${arrowEndY}, 2.0, "", true, #111827, false, true)

appear(vrf_title, vrf_legend, reg_row, ${Array.from({length:32},(_,i)=>`rf_v${i}`).join(', ')},sel_box, sel_to_zoom, s0)

# 高亮“当前选择”的寄存器：源 + 目的（呼吸闪烁）
blink(rf_v${idV1}, rf_v${idV2}, rf_v${idVd}, s0, 6, 450)

# pack 白名单：只合并这三个向量（下方十六进制模式会用）
pack(${vs1}, ${vs2}, ${vd})

# =============== s1：载入与对齐（进入放大视图） ===============
label(tag_${vs1}, 2.8, 1.5, "${vs1}")
label(tag_${vs2}, 2.8, 2.8, "${vs2}")
label(tag_${vd},  2.8, 4.2, "${vd}")

vec4(${vs1}, 4.0, 1.1, "${v1Init}", lightgray, x, 0.2)
vec4(${vs2}, 4.0, 2.4, "${v2Init}", teal,      x, 0.2)

disappear(vrf_title, vrf_legend, reg_row, ${Array.from({length:32},(_,i)=>`rf_v${i}`).join(', ')}, sel_box, sel_to_zoom, s1)
appear(tag_${vs1}, tag_${vs2}, ${vs1}, ${vs2}, ${vs1}__box, ${vs2}__box, s1)

# =============== s2：位宽解释（128-bit = 4 × 32-bit） ===============
label(dim, 4.8, 0.2, "向量位宽 128-bit（4 × 32-bit）")
text(b0, 4.3, 0.60, "32b", 14)
text(b1, 5.5, 0.60, "32b", 14)
text(b2, 6.7, 0.60, "32b", 14)
text(b3, 7.95,0.60, "32b", 14)
appear(dim, b0, b1, b2, b3, s2)
blink(dim, s2, 4, 300)

# =============== s3：逐 lane 相加（自顶向下流动） ===============
vec4(${vd}, 4.0, 3.8, "", lightgray, x, 0.2, nobox)
line(l1, 3.6, 3.65, 8.8, 3.65, 3.3, black)
text(plus, 3.34, 3.5, "+", 40)
appear(tag_${vd}, ${vd}, l1, plus, s3)
blink(l1, plus, s3, 3, 240)

# =============== s4：写回结果（覆盖 ${vd} 空槽） ===============
square(z0, 4.0, 3.8, "11", teal)
square(z1, 5.2, 3.8, "13", teal)
square(z2, 6.4, 3.8, "15", teal)
square(z3, 7.6, 3.8, "17", teal)
disappear(${vd}[0..3], s4)
appear(z0, z1, z2, z3, s4)
blink(z0, z1, z2, z3, s4, 2, 300)
`
}
```

（示例结束。你在其它指令类型上可以自由发挥步骤数与布局，只要用到我列出的 DSL 原语并遵守坐标/ID 规则即可。）

========================
【输出目标】
	•	仅输出一个 TypeScript 代码块，路径注释必须是：// src/lang/[arch]/[opcode].ts
	•	导出 const USAGE 与导出函数 [arch][OpcodePascal]ToDsl(ast: AsmAst)
	•	其余自由发挥（步骤数量、元素组合、箭头/高亮/分组等）。