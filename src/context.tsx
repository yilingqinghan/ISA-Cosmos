import React, { createContext, useContext, useState } from 'react'

type Ctx = {
  arch: string; setArch: (v:string)=>void
  opcode: string; setOpcode: (v:string)=>void
  form: string; setForm: (v:string)=>void
  logs: string[]; pushLog: (line:string)=>void; clearLogs: ()=>void
}
const AppCtx = createContext<Ctx>(null as any)

export const AppProvider: React.FC<{children:React.ReactNode}> = ({children})=>{
  const [arch, setArch] = useState('rvv')
  const [opcode, setOpcode] = useState('vadd')
  const [form, setForm] = useState('vv')
  const [logs, setLogs] = useState<string[]>([])
  const pushLog = (line: string)=> setLogs(l=>[...l, line])
  const clearLogs = ()=> setLogs([])

  return (
    <AppCtx.Provider value={{ arch, setArch, opcode, setOpcode, form, setForm, logs, pushLog, clearLogs }}>
      {children}
    </AppCtx.Provider>
  )
}
export const useApp = ()=> useContext(AppCtx)
