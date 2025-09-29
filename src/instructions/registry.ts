import { vaddVV } from './rvv/vadd_vv'

export const instructionRegistry: Record<string, any> = {
  'rvv/vadd.vv': vaddVV,
}

export const miniDocs: Record<string, any> = {
  'rvv/vadd.vv': vaddVV.meta,
  'rvv.vadd.vv': vaddVV.meta,
}

export const getInstrModule = (k: string) => instructionRegistry[k]
