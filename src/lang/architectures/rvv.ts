// src/lang/architectures/rvv.ts
import type { ArchSpec } from '../core'
import { getInstrs } from '../registry'

const isVReg = (s:string)=>/^v([0-9]|[12][0-9]|3[01])$/i.test(s)
const isXReg = (s:string)=>/^x([0-9]|[12][0-9]|3[01])$/i.test(s)
const isImm  = (s:string)=>/^-?\d+$/.test(s)
const isVTypeI = (s:string)=>{
  const re = /^e(8|16|32|64)m(1|2|4|8)(?:,(ta|tu))?(?:,(ma|mu))?$/i
  return re.test(s.trim())
}
export const RVV: ArchSpec = {
  name: 'rvv',
  get instrs() {                // ★ 懒取，保证自注册已完成时能拿到完整表
    return getInstrs('rvv')
  },
  validateOperand(kind, token) {
    switch (kind) {
      case 'vreg': return isVReg(token) ? '' : `期望向量寄存器 v0..v31，收到 ${token}`
      case 'xreg': return isXReg(token) ? '' : `期望整型寄存器 x0..x31，收到 ${token}`
      case 'imm' : return isImm(token)  ? '' : `期望立即数，收到 ${token}`
      case 'vtypei': return isVTypeI(token) ? '' : `期望 vtypei（如 e32m2 或 e16m4,ta,ma），收到 ${token}`
      default:       return ''
    }
  }
}