# Extension Guide

This codebase is designed to be extended with new architectures and instructions.

## Key Interfaces

```ts
// src/core/instructions/types.ts
export type InstructionCategory = 'memory' | 'computation' | 'control';

export interface ParsedInstruction {
  arch: string;
  mnemonic: string;
  form?: string;
  operands: string[];
  raw: string;
}

export interface VisualizerOptions {
  // free-form: sizes, colors, arch knobs (e.g., vlen, sew, lmul)
  [k: string]: unknown;
}

export interface BuiltScene {
  scene: import('@core/canvas/types').Scene;
  animator?: import('@core/canvas/animator').Animator;
}

export interface InstructionVisualizer {
  kind: InstructionCategory;
  matches(mnemonic: string): boolean;
  buildScene(instr: ParsedInstruction, opts: VisualizerOptions): BuiltScene;
}

export interface Architecture {
  id: string;                    // 'rvv', 'x86', 'arm64', ...
  name: string;
  instructions: InstructionVisualizer[];
  defaultOptions?: Record<string, unknown>;
  parse?: (asm: string) => ParsedInstruction | null;  // override parser per-arch if needed
}
```

## Add a New Architecture

1. Create a folder under `src/core/arch/<your-arch>/`.
2. Export an `Architecture` object from `index.ts`.
3. Hook it into the registry in `src/core/arch/index.ts`.

## Add an Instruction Visualizer

1. Create `<instr>.ts` in your arch folder.
2. Implement `InstructionVisualizer` with `matches` and `buildScene`.
3. Construct primitives with helpers from `@core/canvas/elements`.
4. Return a `BuiltScene` with a `scene` and optional `animator`.

## Animation

- Use `Animator` to create frame-based animations. The animator receives a callback per tick and can mutate element properties (e.g., highlight lane i).
- See `src/core/arch/rvv/vadd.ts`.

## Categories

Use `kind: 'memory' | 'computation' | 'control'` to classify instructions so UI can group/filter them.
