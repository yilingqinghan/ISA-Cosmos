import { ParsedInstruction } from '@core/instructions/types'

// Minimal parser for patterns like: vadd.vv v0, v1, v2
export function parseInstruction(src: string, arch: string): ParsedInstruction | null {
  const raw = src.trim()
  if (!raw) return null
  const parts = raw.split(/\s+/)
  const head = parts[0] || ''
  const m = /([a-z0-9]+)(?:\.([a-z0-9]+))?/i.exec(head)
  if (!m) return null
  const mnemonic = m[1].toLowerCase()
  const form = m[2]?.toLowerCase()
  const operandStr = raw.slice(head.length).trim()
  const operands = operandStr ? operandStr.split(',').map(s => s.trim()) : []
  return { arch, mnemonic, form, operands, raw }
}
