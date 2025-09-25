// src/context.tsx
import React, { createContext, useContext, useState } from 'react'

/** 数制：十进制 / 十六进制 / 二进制 */
export type NumBase = 'dec' | 'hex' | 'bin'

type Ctx = {
  arch: string; setArch: (v: string) => void
  opcode: string; setOpcode: (v: string) => void
  form: string; setForm: (v: string) => void
  logs: string[]; pushLog: (line: string) => void; clearLogs: () => void

  /** 新增：显示用数制（默认十进制） */
  base: NumBase; setBase: (b: NumBase) => void
  /** 新增：SEW 位宽（用于进制补零：8/16/32/64…；默认 32） */
  sew: number; setSew: (w: number) => void
}

const AppCtx = createContext<Ctx>(null as any)

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [arch, setArch] = useState('rvv')
  const [opcode, setOpcode] = useState('vadd')
  const [form, setForm] = useState('vv')
  const [logs, setLogs] = useState<string[]>([])
  const pushLog = (line: string) => setLogs(l => [...l, line])
  const clearLogs = () => setLogs([])

  // ===== 新增：数制 & 位宽 =====
  const [base, setBase] = useState<NumBase>('dec') // 'dec' | 'hex' | 'bin'
  const [sew, setSew] = useState<number>(32)       // 8/16/32/64...

  return (
    <AppCtx.Provider
      value={{
        arch, setArch,
        opcode, setOpcode,
        form, setForm,
        logs, pushLog, clearLogs,
        base, setBase,
        sew, setSew,
      }}
    >
      {children}
    </AppCtx.Provider>
  )
}

export const useApp = () => useContext(AppCtx)
