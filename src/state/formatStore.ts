// src/state/formatStore.ts
import { useSyncExternalStore } from 'react'

export type NumBase = 'dec' | 'hex'

type Snap = { base: NumBase; hexDigits: number }

let snap: Snap = { base: 'dec', hexDigits: 4 }  // 默认 4 位 → 0x0001
const subs = new Set<() => void>()
const emit = () => subs.forEach(fn => fn())

export const formatStore = {
  getSnapshot(): Snap { return snap },
  subscribe(cb: () => void) { subs.add(cb); return () => subs.delete(cb) },
  setBase(base: NumBase) { if (snap.base !== base) { snap = { ...snap, base }; emit() } },
  setHexDigits(n: number) { if (snap.hexDigits !== n) { snap = { ...snap, hexDigits: n }; emit() } },
}

export function useFormat() {
  const get = () => formatStore.getSnapshot()
  const sub = (cb: () => void) => formatStore.subscribe(cb)
  return useSyncExternalStore(sub, get, get)
}

// 轻量格式化：仅十进制/十六进制
export function fmt(raw: string | number, base: NumBase, hexDigits: number) {
  const t = String(raw ?? '').trim()
  if (!/^(-?\d+|0x[0-9a-f]+)$/i.test(t)) return String(raw)  // 非数字/已经是其它格式则原样返回
  let n: number
  if (/^0x/i.test(t)) n = parseInt(t, 16)
  else n = parseInt(t, 10)

  if (base === 'dec') return String(n)
  // hex：按 hexDigits 位补零（不足补，多则不截断，让它自然变长）
  const hex = (n >>> 0).toString(16).toUpperCase()
  const padded = hex.length >= hexDigits ? hex : hex.padStart(hexDigits, '0')
  return '0x' + padded
}
