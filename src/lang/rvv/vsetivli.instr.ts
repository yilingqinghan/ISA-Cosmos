// src/lang/rvv/vsetivli.ts
import type { AsmAst } from '../types'
import { registerHandler, registerInstr, registerUsage, registerMiniDoc } from '../registry'
import type { InstrSpec } from '../core'

// 1) 用法（用于 Logs）
registerUsage(
  'rvv.vsetivli.ui',
  'vsetivli rd, uimm, vtypei  ; 立即数 AVL：根据 vtypei 计算 VLMAX，vl = min(uimm, VLMAX)'
)

// 1.1) MiniDoc：用法说明 / 使用场景 / 注意 / 可能的异常
registerMiniDoc('rvv.vsetivli.ui', {
  usage:
    'VSETIVLI rd, uimm, vtypei\n' +
    '设置向量长度 vl（使用 5 位无符号立即数），并根据 vtypei 设置向量类型；rd≠x0 时把最终 vl 写回 rd。',
  scenarios: [
    '固定长度向量处理',
    '小向量操作优化',
  ],
  notes: [
    'uimm 范围为 0–31（5 位无符号）',
    'vl 的上限受 VLEN/SEW*LMUL 约束（这里以 VLEN=128 示意）',
    'vtypei 包含 SEW/LMUL 与尾掩码策略（ta/tu、ma/mu）',
  ],
  exceptions: [
    'vtypei 含保留值 → 非法指令异常（非法编码）',
  ],
})

// 2) 语法规格（解析与基本操作数校验）
//   这里把第二个操作数先标为 'imm'（全项目通用），范围 0..31 的检查在 DSL 生成时附加。
//   如果你在 RVV 校验器里有 'uimm5'，把下面的 {kind:'imm'} 改成 {kind:'uimm5'} 即可。
const spec: InstrSpec = {
  opcode: 'vsetivli',
  forms: {
    ui: { operands: [
      { kind:'xreg',   role:'rd'     },
      { kind:'imm',    role:'uimm5'  },
      { kind:'vtypei', role:'vtypei' },
    ] }
  }
}
registerInstr('rvv', spec)

// ======== 小工具：解析 vtypei 与计算 VLMAX ========

function parseVtypei(vt:string){
  // 允许：e32m2 / e16m4,ta / e64m1,tu,mu 等
  const m = vt.trim().match(/^e(8|16|32|64)m(1|2|4|8)(?:,(ta|tu))?(?:,(ma|mu))?$/i)
  if (!m) return { sew:'32', lmul:'1', ta:'ta', ma:'ma' }
  const [,sew,lmul,taRaw,maRaw] = m
  const ta = (taRaw||'ta').toLowerCase()
  const ma = (maRaw||'ma').toLowerCase()
  return { sew, lmul, ta, ma }
}

// 这里示意使用 VLEN=128；如果你在上下文里有全局 VLEN，可改成从 context 读取
const VLEN = 128
function vlmaxOf(sew:string, lmul:string){
  const SEW = parseInt(sew, 10)
  const LMUL = parseInt(lmul, 10)
  // 视觉/教学用途的近似：VLMAX = floor((VLEN/SEW) * LMUL)
  return Math.max(0, Math.floor((VLEN / SEW) * LMUL))
}

// ======== 3) DSL 渲染 ========

export function rvvVsetivliToDsl(ast: AsmAst): string {
  const [rdRaw, uimmRaw, vtRaw] = ast.operands
  const rd    = (rdRaw  || 't0').trim()
  const uimmS = (uimmRaw|| '16').trim()
  const vtypei = (vtRaw  || 'e32m1').trim()

  // uimm 范围保护（0..31）
  const uimm = Math.max(0, Math.min(31, parseInt(uimmS, 10) || 0))

  const { sew, lmul, ta, ma } = parseVtypei(vtypei)
  const VLMAX = vlmaxOf(sew, lmul)
  const VL    = Math.min(uimm, VLMAX)

  // 画面几何（与 vadd 保持风格一致）
  const xTitle = 2.4
  const xInfo  = 2.4
  const xEq    = 4.6

  return `# -----------------------------------------------
# RVV vsetivli：uimm AVL（VLEN=128 示意）
# s0：解析 vtypei，展示 VLEN/SEW/LMUL
# s1：计算 vl = min(uimm, VLMAX) 并写回 rd（若 rd≠x0）
# -----------------------------------------------

step(s0,"解析 vtypei 与可达上限")
step(s1,"计算 vl = min(uimm, VLMAX) 并写回 ${rd === 'x0' ? '(rd=x0 不写回)' : rd}")

# 顶部标题
text(title, ${xTitle}, -0.28, "VSETIVLI（立即数 AVL）", 14, #111827)

# vtypei 展示
label(tag_vtype, ${xInfo}, 0.20, "vtypei")
text(vtype_val, ${xInfo+0.6}, 0.20, "${vtypei}", 14, #0f172a)

# 计算 VLMAX
label(tag_vlen,  ${xInfo}, 0.60, "VLEN")
text(vlen_val,   ${xInfo+0.6}, 0.60, "${VLEN}", 14)
label(tag_sew,   ${xInfo}, 1.00, "SEW")
text(sew_val,    ${xInfo+0.6}, 1.00, "${sew}", 14)
label(tag_lmul,  ${xInfo}, 1.40, "LMUL")
text(lmul_val,   ${xInfo+0.6}, 1.40, "${lmul}", 14)

text(eq_vlmax, ${xEq}, 1.00, "VLMAX = floor((VLEN/SEW) × LMUL) = floor((${VLEN}/${sew}) × ${lmul}) = ${VLMAX}", 14)

# s0 出现
appear(title, tag_vtype, vtype_val, tag_vlen, vlen_val, tag_sew, sew_val, tag_lmul, lmul_val, eq_vlmax, s0)
blink(vtype_val, eq_vlmax, s0, 3, 320)

# s1：AVL 与 vl 计算
label(tag_rd,   ${xInfo}, 2.10, "rd")
text(rd_val,    ${xInfo+0.6}, 2.10, "${rd}", 14)

label(tag_uimm, ${xInfo}, 2.50, "uimm")
text(uimm_val,  ${xInfo+0.6}, 2.50, "${uimm}", 14)

text(eq_vl,     ${xEq},  2.50, "vl = min(uimm, VLMAX) = min(${uimm}, ${VLMAX}) = ${VL}", 16)

${rd.toLowerCase() === 'x0'
  ? `# rd = x0 不写回，仅展示结果`
  : `text(wb, ${xEq}, 3.10, "写回：${rd} ← ${VL}", 16, #111827)`}

appear(tag_rd, rd_val, tag_uimm, uimm_val, eq_vl, ${rd.toLowerCase()==='x0' ? '' : 'wb,'} s1)
blink(eq_vl, s1, 3, 300)
`
}

// 4) 注册 Handler（arch.opcode.form）
registerHandler('rvv.vsetivli.ui', rvvVsetivliToDsl)