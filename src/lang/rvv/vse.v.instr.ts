// src/lang/rvv/vse.ts
import type { AsmAst } from '../types'
import { registerHandler, registerInstr, registerUsage, registerMiniDoc } from '../registry'
import type { InstrSpec } from '../core'

registerUsage('rvv.vse.v', 'vse.v vs3, (rs1)  ; 向量存储：Mem[rs1 + i*EEW/8] = vs3[i]')

registerMiniDoc('rvv.vse.v', {
  usage: 'vse.v vs3, (rs1)[, vm] ；向量存储：Mem[rs1 + i*EEW/8] = vs3[i]',
  scenarios: ['向量数据存储', '计算结果输出', '数组写入'],
  notes: ['EEW 为有效元素宽度（8/16/32/64）', '存储元素数量由 vl 决定'],
  exceptions: ['地址未对齐可能引发异常']
})

const spec: InstrSpec = {
  opcode: 'vse',
  forms: {
    v: { operands: [
      { kind:'vreg', role:'vs3' },
      { kind:'xreg', role:'rs1' },
    ] }
  }
}
registerInstr('rvv', spec)

function unparen(s:string){ const t=s.trim(); return t.startsWith('(')&&t.endsWith(')') ? t.slice(1,-1) : t }
function vname(s:string){ return s.trim().replace(/\.t$/i,'') }

export function rvvVseToDsl(ast: AsmAst): string {
  const [vs3Raw, rs1Raw] = ast.operands || []
  const vs3 = vname(vs3Raw || 'v0')
  const rs1 = unparen(rs1Raw || 'x0')

  const vInit = '10,11,12,13'

  return `
step(s0,"载入与对齐")
step(s1,"写入内存")

label(tag_vs3, 2.6, 1.5, "${vs3}")
label(tag_mem, 2.55, 3.2, "Mem[${rs1}]")

group(mem_box, 3.8, 3.1, 5.2, 1.1, dotted)

vec4(${vs3}, 4.0, 1.8, "${vInit}", teal, x, 0.2)

rect(m0, 1.0, 0.60, 4.0, 3.6, "", lightgray)
rect(m1, 1.0, 0.60, 5.2, 3.6, "", lightgray)
rect(m2, 1.0, 0.60, 6.4, 3.6, "", lightgray)
rect(m3, 1.0, 0.60, 7.6, 3.6, "", lightgray)

arrow(a0, 4.5, 2.2, 4.5, 3.6, 2.0, "", true, #0EA5E9, false, true)
arrow(a1, 5.7, 2.2, 5.7, 3.6, 2.0, "", true, #0EA5E9, false, true)
arrow(a2, 6.9, 2.2, 6.9, 3.6, 2.0, "", true, #0EA5E9, false, true)
arrow(a3, 8.1, 2.2, 8.1, 3.6, 2.0, "", true, #0EA5E9, false, true)

appear(tag_vs3, tag_mem, mem_box, ${vs3}, ${vs3}__box, s0)

appear(a0, a1, a2, a3, m0, m1, m2, m3, s1)
blink(a0, a1, a2, a3, s1, 4, 320)
`
}

registerHandler('rvv:vse.v', rvvVseToDsl)

