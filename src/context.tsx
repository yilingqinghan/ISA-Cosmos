import React, { createContext, useContext, useEffect, useState } from 'react'

export type NumBase = 'dec' | 'hex' | 'bin'
export type DslOverride = { text: string; rev: number } | null

type Ctx = {
  arch: string; setArch: (v: string) => void
  opcode: string; setOpcode: (v: string) => void
  form: string; setForm: (v: string) => void

  logs: string[]; pushLog: (line: string) => void; clearLogs: () => void

  base: NumBase; setBase: (b: NumBase) => void
  sew: number; setSew: (w: number) => void

  /** 新增：左侧编辑器覆盖右侧画布的 DSL */
  dslOverride: DslOverride
  setDslOverride: (d: DslOverride) => void
}

const AppCtx = createContext<Ctx>(null as any)

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [arch, setArch] = useState('rvv')
  const [opcode, setOpcode] = useState('vadd')
  const [form, setForm] = useState('vv')

  const [logs, setLogs] = useState<string[]>([])
  const pushLog = (line: string) => setLogs((l) => [...l, line])
  const clearLogs = () => setLogs([])

  const [base, setBase] = useState<NumBase>('dec')
  const [sew, setSew] = useState<number>(32)

  // NEW: DSL 覆盖（text + rev 用来强制触发更新）
  const [dslOverride, setDslOverride] = useState<DslOverride>(null)

  // 当切换架构/指令/形式时，清空覆盖，回到内置 DSL
  useEffect(() => { setDslOverride(null) }, [arch, opcode, form])

  return (
    <AppCtx.Provider
      value={{
        arch, setArch,
        opcode, setOpcode,
        form, setForm,
        logs, pushLog, clearLogs,
        base, setBase,
        sew, setSew,
        dslOverride, setDslOverride,
      }}
    >
      {children}
    </AppCtx.Provider>
  )
}

export const useApp = () => useContext(AppCtx)
