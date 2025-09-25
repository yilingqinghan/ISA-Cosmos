
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { fetchDSL } from './utils/fetchDSL'

export type Selection = { arch:'rvv'; opcode:'vadd'|'vsub'|'vmul'; form:'vv'|'vx'|'vi' }
export type StepMeta  = { id: string; name: string }

type Ctx = {
  sel: Selection
  setSel: React.Dispatch<React.SetStateAction<Selection>>
  dsl: string
  steps: StepMeta[]
  load: (s?: Selection) => Promise<void>
  controls: { speed: number; playing: boolean }
  setControls: React.Dispatch<React.SetStateAction<{ speed: number; playing: boolean }>>,
}

export const AppCtx = React.createContext<Ctx>({
  sel: { arch:'rvv', opcode:'vadd', form:'vv' },
  setSel: () => {},
  dsl: '',
  steps: [],
  load: async () => {},
  controls: { speed: 1, playing: true },
  setControls: () => {},
})

export function AppProvider({children}:{children:React.ReactNode}){
  const [sel,setSel] = useState<Selection>({arch:'rvv', opcode:'vadd', form:'vv'})
  const [dsl,setDsl] = useState<string>('')
  const [steps,setSteps] = useState<StepMeta[]>([])
  const [controls,setControls] = useState({ speed:1, playing:true })

  const load = useCallback(async (s:Selection=sel)=>{
    const got = await fetchDSL(s)
    setDsl(got.text); setSteps(got.steps ?? [])
  }, [sel])

  useEffect(()=>{ void load(sel) }, [])

  const value = useMemo<Ctx>(()=>({ sel, setSel, dsl, steps, load, controls, setControls }), [sel,dsl,steps,load,controls])
  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>
}
