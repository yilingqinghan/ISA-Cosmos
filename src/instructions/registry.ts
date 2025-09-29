import type { InstructionModule } from './types';
import { vaddVV } from './rvv/vadd.vv';

export const instructionRegistry: Record<string, InstructionModule> = {
  'rvv/vadd.vv': vaddVV,
};