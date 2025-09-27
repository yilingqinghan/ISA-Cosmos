// src/lang/registry.ts
import type { AsmAst } from './types'
import type { InstrSpec } from './core'

type Handler = (ast: AsmAst) => string

const _handlers = new Map<string, Handler>()   // key: "arch:opcode.form"
const _usages   = new Map<string, string>()    // key: "arch.opcode.form"
const _instrs   = new Map<string, InstrSpec[]>() // arch -> InstrSpec[]

export function registerHandler(key: string, fn: Handler) {
  _handlers.set(key.toLowerCase(), fn)
}
export function registerUsage(key: string, usage: string) {
  _usages.set(key.toLowerCase(), usage)
}
export function registerInstr(arch: string, spec: InstrSpec) {
  arch = arch.toLowerCase()
  const arr = _instrs.get(arch) ?? []
  const exist = arr.find(i => i.opcode.toLowerCase() === spec.opcode.toLowerCase())
  if (exist) {
    for (const [form, fs] of Object.entries(spec.forms)) {
      exist.forms[form.toLowerCase()] = fs
    }
  } else {
    const forms: InstrSpec['forms'] = {}
    for (const [form, fs] of Object.entries(spec.forms)) {
      forms[form.toLowerCase()] = fs
    }
    arr.push({ opcode: spec.opcode, forms })
  }
  _instrs.set(arch, arr)
}

export function getHandler(ast: AsmAst) {
  return _handlers.get(`${ast.arch}:${ast.opcode}.${ast.form}`.toLowerCase())
}
export function getUsage(ast: AsmAst) {
  return _usages.get(`${ast.arch}.${ast.opcode}.${ast.form}`.toLowerCase())
}
export function getInstrs(arch: string) {
  return _instrs.get(arch.toLowerCase()) ?? []
}

// 供 LeftPanel 使用的精简文档类型
export type MiniDoc = {
usage: string;            // 一句话用法（必填）
scenarios?: string[];     // 使用场景
notes?: string[];         // 注意
exceptions?: string[];    // 可能的异常
}

const _miniDocs = new Map<string, MiniDoc>()  // key: "arch.opcode.form"

export function makeKey(k: string | AsmAst | {arch:string; opcode:string; form:string}) {
if (typeof k === 'string') return k.toLowerCase()
const a = (k as any).arch, o = (k as any).opcode, f = (k as any).form
return `${a}.${o}.${f}`.toLowerCase()
}

export function registerMiniDoc(key: string, doc: MiniDoc) {
_miniDocs.set(makeKey(key), doc)
}

export function miniDocOf(keyOrAst: string | AsmAst | {arch:string; opcode:string; form:string}) {
return _miniDocs.get(makeKey(keyOrAst))
}

// ⚠️ 不要在这里做 import.meta.glob —— 避免初始化期间触发自调用