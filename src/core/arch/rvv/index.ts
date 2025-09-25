import { Architecture } from '@core/instructions/types'
import { vadd } from './vadd'

export const rvv: Architecture = {
  id: 'rvv',
  name: 'RISC-V Vector (RVV)',
  instructions: [ vadd ],
  defaultOptions: {
    vlen: 128,  // bits
    sew: 16,    // bits per element
    lmul: 1,
  },
  parse: (asm) => {
    // could implement RVV-specific nuances here; fallback to global parser otherwise
    const raw = asm.trim()
    if (!raw) return null
    const parts = raw.split(/\s+/)
    const head = parts[0] || ''
    const m = /([a-z0-9]+)(?:\.([a-z0-9]+))?/i.exec(head)
    if (!m) return null
    const mnemonic = m[1].toLowerCase()
    const form = m[2]?.toLowerCase()
    const operandStr = raw.slice(head.length).trim()
    const operands = operandStr ? operandStr.split(',').map(s => s.trim()) : []
    return { arch:'rvv', mnemonic, form, operands, raw }
  }
}
