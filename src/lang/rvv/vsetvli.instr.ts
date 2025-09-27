// src/lang/rvv/vsetvli.ts
import type { AsmAst } from '../types'
import { registerHandler, registerInstr, registerUsage, registerMiniDoc } from '../registry'
import type { InstrSpec } from '../core'

// 1) 用法（供 Logs 打印）
registerUsage(
  'rvv.vsetvli.ri',
  'vsetvli.ri rd, rs1, vtypei  ; 设置 VL 和 VTYPE（VL=min(rs1, VLMAX)，VTYPE 由 imm 指定的 e[SEW], m[LMUL], ta/ma）'
)

// 简明文档（顶部 Usage 面板使用）
registerMiniDoc('rvv.vsetvli.ri', {
  usage: 'vsetvli.ri rd, rs1, imm；设置 VL 与 VTYPE（VL=min(rs1, VLMAX)）',
  scenarios: [
    '在矢量循环进入前设置向量长度',
    '根据数据大小切换 SEW/LMUL',
    '启用/关闭 tail/ mask 策略'
  ],
  notes: [
    'imm 的编码包含 SEW、LMUL、VTA、VMA 等字段（原型仅演示 e32/m1/ta/ma 的可视化）',
    'VL = min(rs1, VLMAX(SEW, LMUL))，不同 SEW/LMUL 下的 VLMAX 不同'
  ],
  exceptions: ['无（原型示意）']
})

// 2) 语法规格（供解析与操作数校验）
// 这里将 vsetvli 规范化为 form = "ri"（rd, rs1, imm），与你现有解析模型一致：opcode.form
const spec: InstrSpec = {
  opcode: 'vsetvli',
  forms: {
    ri: { operands: [
      { kind: 'xreg', role: 'rd'  },
      { kind: 'xreg', role: 'rs1' },
      { kind: 'vtypei',  role: 'vtypei' },
    ] }
  }
}
registerInstr('rvv', spec)

// === 可视化几何（用你现有 DSL 坐标系；这条指令偏“控制/配置”，不画向量寄存器，改画配置面板） ===
const BOX_W = 1.80
const BOX_H = 0.80

export function rvvVsetvliToDsl(ast: AsmAst): string {
  const [rdRaw, rs1Raw, immRaw] = ast.operands
  const rd  = (rdRaw  || 'x0').trim()
  const rs1 = (rs1Raw || 'x0').trim()
  const imm = (immRaw || 'e32m2').trim()

  // 朴素解析 imm 中的关键字（仅做展示用途）
  const sew  = /e(8|16|32|64)/i.exec(imm)?.[1] || '32'
  const lmul = /m(1|2|4|8)/i.exec(imm)?.[1] || '1'
  const ta   = /ta/i.test(imm) ? 'ta' : 'tu'
  const ma   = /ma/i.test(imm) ? 'ma' : 'mu'

  // VL 估算展示（真实计算较复杂：与 VLEN/SEW/LMUL 有关；这里仅作为 UI 提示）
  const vlmaxHint = (() => {
    const s = Number(sew) || 32
    const m = Number(lmul) || 1
    // 以 VLEN=128 的 4-lane@e32/m1 为参考：VLEN/SEW * (1/LMUL)
    const lanes = Math.floor((128 / s) * (1 / m))
    return Math.max(1, lanes)
  })()

  // 演示输入值（rs1）与计算结果（VL）之间的关系说明（纯展示）
  const rs1Show = `${rs1}`
  const vlExpr  = `VL = min(${rs1}, VLMAX=${vlmaxHint})`

  // --- DSL 叙事 ---
  return `# ----------------------------------------------------
# RVV vsetvli.ri：设置 VL 与 VTYPE（原型可视化）
# 叙事：
#   s0 概览：展示 rs1/imm 输入、VTYPE 字段、VL 计算关系
#   s1 写回：rd <- VL，并更新全局 VTYPE
# ----------------------------------------------------

step(s0,"设置向量环境")
step(s1,"写回与生效")

# ============ s0：输入与配置（左：输入；右：VTYPE 字段） ============
label(tag_op,  1.20, 0.30, "vsetvli.ri ${rd}, ${rs1}, ${imm}")
label(tag_l,   1.20, 0.70, "输入")
label(tag_r,   5.30, 0.70, "VTYPE 字段（imm）")

# 左侧 输入面板
group(g_in, 0.60, 0.95, ${BOX_W}, ${BOX_H}, solid)
text(in_rs1, 0.72, 1.10, "rs1 = ${rs1Show}", 14)
text(in_imm, 0.72, 1.45, "imm = ${imm}", 14)

# 右侧 VTYPE 面板
group(g_vtype, 4.60, 0.95, ${BOX_W}, ${BOX_H}, solid)
text(vt_sew,  4.72, 1.10, "SEW = ${sew}", 14)
text(vt_lmul, 4.72, 1.30, "LMUL = ${lmul}", 14)
text(vt_ta,   4.72, 1.50, "TA = ${ta}", 14)
text(vt_ma,   4.72, 1.70, "MA = ${ma}", 14)

# 中部 VL 计算提示
text(vl_hint, 2.80, 1.45, "${vlExpr}", 14, #0f172a)

# 箭头：输入 -> VTYPE/计算
arrow(a_in_vtype, 2.50, 1.35, 4.55, 1.35, 1.8, "", true, #0EA5E9, false, true)
arrow(a_in_vl,    2.00, 1.45, 2.70, 1.45, 1.8, "", true, #22d3ee, false, true)

appear(tag_op, tag_l, tag_r, g_in, in_rs1, in_imm, g_vtype, vt_sew, vt_lmul, vt_ta, vt_ma, vl_hint, a_in_vtype, a_in_vl, s0)
blink(vl_hint, s0, 3, 300)

# ============ s1：写回与生效（rd <- VL & 更新全局 VTYPE） ============
label(tag_apply, 1.20, 2.60, "生效：rd ← VL，更新全局 VTYPE")

# 结果面板（rd/VL）
group(g_res, 0.60, 2.85, ${BOX_W}, ${BOX_H}, solid)
text(out_rd,  0.72, 3.00, "rd = ${rd}", 14)
text(out_vl,  0.72, 3.35, "VL = ~${vlmaxHint}", 14)

# 全局状态面板（仅展示）
group(g_env, 4.60, 2.85, ${BOX_W}, ${BOX_H}, solid)
text(env_vtype, 4.72, 3.00, "VTYPE = e${sew}, m${lmul}, ${ta}, ${ma}", 14)
text(env_note,  4.72, 3.35, "（后续指令按该 SEW/LMUL 执行）", 12, #6b7280)

arrow(a_write, 2.50, 3.25, 4.55, 3.25, 1.8, "", true, #0EA5E9, false, true)

appear(tag_apply, g_res, out_rd, out_vl, g_env, env_vtype, env_note, a_write, s1)
blink(env_vtype, s1, 2, 320)
`
}

// 3) 注册到 dispatcher（和你现有 vadd 一样的方式）
registerHandler('rvv:vsetvli.ri', rvvVsetvliToDsl)