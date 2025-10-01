import type { InstructionModule, InstructionMeta, InstructionSetValidator } from './types'

// 自动加载本目录下所有 .ts（包含模块与校验器）
const modules = import.meta.glob('./**/*.ts', { eager: true }) as Record<string, any>

export const instructionRegistry: Record<string, InstructionModule> = {}
export const miniDocs: Record<string, InstructionMeta> = {}
const validators: InstructionSetValidator[] = []

// ===== 新增：用于目录分组的轻量类型 =====
export interface CatalogItem {
  id: string            // 完整 id，例如 'riscv/v/vadd.vv' 或 'rvv/vadd.vv'
  opcode: string
  form: string
  sample: string
}

export interface CatalogGroup {
  arch: string          // 归一化的架构键：'riscv' | 'arm' | 其它
  ext: string           // 子扩展键：如 'i'、'v'、'sve'、'neon'、'core'
  title: string         // 可直接展示的组名（ext 大写或特例）
  items: CatalogItem[]
}

// 保留源码路径的索引，便于按目录分组
type ModuleMeta = { path: string; mod: InstructionModule }
const moduleMetas: ModuleMeta[] = []

function isModule(x: any): x is InstructionModule {
  return x && typeof x === 'object' && typeof x.id === 'string' && typeof x.build === 'function'
}
function isValidator(x: any): x is InstructionSetValidator {
  return x && typeof x === 'object' && typeof x.arch === 'string' && typeof x.validate === 'function'
}

for (const p in modules) {
  const mod = modules[p]
  const candidates: any[] = []
  if (isModule(mod?.default)) candidates.push(mod.default)
  for (const k of Object.keys(mod)) {
    if (k === 'default') continue
    const v = (mod as any)[k]
    if (isModule(v) || isValidator(v)) candidates.push(v)
  }
  for (const c of candidates) {
    if (isModule(c)) {
      instructionRegistry[c.id] = c
      moduleMetas.push({ path: p.replace(/^\.\//, ''), mod: c }) // 记录源码路径
      if (c.meta) {
        miniDocs[c.id] = c.meta
        miniDocs[c.id.replace('/', '.')] = c.meta // 兼容旧键
      }
    } else if (isValidator(c)) {
      validators.push(c)
    }
  }
}

export const getInstrModule = (k: string) => instructionRegistry[k]

// 供 LeftPanel 调用：按 arch 找到对应校验器并汇总错误
export function validateWithRegistry(ast: { arch: string; opcode: string; form: string; operands: string[] }) {
  const errs = validators.filter(v => v.arch === ast.arch).flatMap(v => v.validate(ast))
  return errs
}

// ===== 新增：目录分组逻辑 =====

// 归一化架构：把 rvv / riscv* 统一成 'riscv'；arm* 统一成 'arm'
function normalizeArch(a: string): string {
  if (a === 'rvv' || a.startsWith('riscv')) return 'riscv'
  if (a.startsWith('arm')) return 'arm'
  return a
}

// 从“源码路径 + 模块 id”推断 arch/ext
// 支持：rvv/..., riscv_v/..., riscv/v/..., riscv/i/..., arm/sve/..., arm_neon/...
function detectArchExt(path: string, id: string): { arch: string; ext: string } {
  const p = path.replace(/^\.\//, '') // like 'riscv/v/vadd_vv.ts'
  // 优先从路径判断
  if (p.startsWith('rvv/')) return { arch: 'riscv', ext: 'v' }
  if (p.startsWith('riscv_v/')) return { arch: 'riscv', ext: 'v' }
  if (p.startsWith('riscv_')) {
    const part = p.split('/')[0].split('_')[1] || 'core'
    return { arch: 'riscv', ext: part }
  }
  if (p.startsWith('riscv/')) {
    const segs = p.split('/')
    return { arch: 'riscv', ext: segs[1] || 'core' }
  }
  if (p.startsWith('arm/')) {
    const segs = p.split('/')
    return { arch: 'arm', ext: segs[1] || 'core' }
  }
  if (p.startsWith('arm_')) {
    const part = p.split('/')[0].split('_')[1] || 'core'
    return { arch: 'arm', ext: part }
  }
  // 回退：从 id 猜
  const idArch = id.includes('/') ? id.split('/')[0] : id
  return { arch: normalizeArch(idArch), ext: 'core' }
}

function parseOpcodeForm(id: string): { opcode: string; form: string } {
  const name = id.includes('/') ? id.split('/').pop()! : id
  const [opcode, form = ''] = name.split('.')
  return { opcode, form }
}

function titleOfExt(arch: string, ext: string): string {
  // 你可以在这里精细化映射，比如 'i' -> 'Base-I', 'm' -> 'Mul/Div' 等
  if (arch === 'riscv') return ext.toUpperCase()
  if (arch === 'arm') return ext.toUpperCase()
  return ext.toUpperCase()
}

// 核心：获取“某个架构”的目录树（分子扩展）
export function getCatalogByArch(archInput: string): CatalogGroup[] {
  const arch = normalizeArch(archInput)
  const groups = new Map<string, CatalogGroup>()

  for (const meta of moduleMetas) {
    const { arch: a, ext } = detectArchExt(meta.path, meta.mod.id)
    if (normalizeArch(a) !== arch) continue

    const { opcode, form } = parseOpcodeForm(meta.mod.id)
    const sample = meta.mod.sample || `${opcode}${form ? '.' + form : ''} v0, v1, v2`

    const key = `${arch}::${ext}`
    if (!groups.has(key)) {
      groups.set(key, { arch, ext, title: titleOfExt(arch, ext), items: [] })
    }
    groups.get(key)!.items.push({
      id: meta.mod.id,
      opcode,
      form,
      sample,
    })
  }

  // 排序：组按 ext 名字母序，组内 items 按 opcode+form
  const out = Array.from(groups.values())
  out.sort((a, b) => a.ext.localeCompare(b.ext))
  out.forEach(g => g.items.sort((a, b) => (a.opcode + '.' + a.form).localeCompare(b.opcode + '.' + b.form)))
  return out
}

// 获取所有可用架构键（用于 NavBar 下拉）
export function getAvailableArchKeys(): string[] {
  const keys = new Set<string>()
  for (const meta of moduleMetas) {
    const { arch } = detectArchExt(meta.path, meta.mod.id)
    keys.add(normalizeArch(arch))
  }
  return Array.from(keys).sort()
}