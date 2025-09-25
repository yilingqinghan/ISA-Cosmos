import { Architecture } from '@core/instructions/types'
import { rvv } from './rvv'

const ARCHS: Architecture[] = [
  rvv,
]

export function getArchitectures(){ return ARCHS }
