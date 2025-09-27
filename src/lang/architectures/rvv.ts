import type { ArchSpec, InstrSpec } from '../core'

const instrs: InstrSpec[] = [
  // 目前只演示 vadd（原型可继续往里加）
  { opcode: 'vadd', forms: {
    vv: { operands: [
      { kind:'vreg', role:'vd'  },
      { kind:'vreg', role:'vs1' },
      { kind:'vreg', role:'vs2' },
    ] }
  } },
  { opcode: 'vmul', forms: {
    vv: { operands: [
      { kind:'vreg', role:'vd'  },
      { kind:'vreg', role:'vs1' },
      { kind:'vreg', role:'vs2' },
    ] }
  } },
]

const isVReg = (s:string)=>/^v([0-9]|[12][0-9]|3[01])$/i.test(s)
const isXReg = (s:string)=>/^x([0-9]|[12][0-9]|3[01])$/i.test(s)
const isImm  = (s:string)=>/^-?\d+$/.test(s)

export const RVV: ArchSpec = {
  name: 'rvv',
  instrs,
  validateOperand(kind, token) {
    switch (kind) {
      case 'vreg': return isVReg(token) ? '' : `期望向量寄存器 v0..v31，收到 ${token}`
      case 'xreg': return isXReg(token) ? '' : `期望整型寄存器 x0..x31，收到 ${token}`
      case 'imm' : return isImm(token)  ? '' : `期望立即数，收到 ${token}`
      default: return ''
    }
  }
}
