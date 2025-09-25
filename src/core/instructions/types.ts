import type { Scene } from '@core/canvas/types'
import type { Animator } from '@core/canvas/animator'

export type InstructionCategory = 'memory' | 'computation' | 'control'

export interface ParsedInstruction {
  arch: string
  mnemonic: string
  form?: string
  operands: string[]
  raw: string
}

export interface VisualizerOptions {
  [k: string]: unknown
}

export interface BuiltScene {
  scene: Scene
  animator?: Animator
}

export interface InstructionVisualizer {
  kind: InstructionCategory
  matches(mnemonic: string): boolean
  buildScene(instr: ParsedInstruction, opts: VisualizerOptions): BuiltScene
}

export interface Architecture {
  id: string
  name: string
  instructions: InstructionVisualizer[]
  defaultOptions?: Record<string, unknown>
  parse?: (asm: string) => ParsedInstruction | null
}
