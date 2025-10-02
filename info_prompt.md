# ROLE

You generate a single **TypeScript info module** that provides *documentation* and *cross-ISA synonyms* for an instruction in ISA-Cosmos.

# SCOPE

* **This file contains no animation.**
* Export a default object implementing `InstructionInfoProvider` with:

  * `id: "<arch>/<opcode>.<form>"` (must match the animation module’s `id`)
  * `metaGetter(): InstructionMeta`
  * `synonymsGetter(): Synonym[]`

# RUNTIME IMPORTS (use exactly these)

```ts
import { tr } from '@/i18n'
import { syn } from '../../utils/syn'
import type { InstructionInfoProvider } from '../../types'
```

# MULTILINGUAL REQUIREMENT

All user-visible strings **must** use `tr('中文','English')`.

# META CONTENT RULES

Return concise, factual instruction info:

* `usage`: one line, show mnemonic + operands + brief effect.
* `scenarios`: 2–5 short bullets (where it’s used).
* `notes`: 2–5 bullets (widths, masks, corner cases; keep ISA-neutral phrasing).
* `exceptions`: list known traps/undefined cases; `tr('无','None')` if none.

# SYNONYMS RULES

Use the helper:

```ts
syn(archZh, archEn, nameZh, nameEn, noteZh, noteEn, example?, intrinsics?)
```

* `archZh/archEn`: ISA + extension family (e.g., “x86 SSE/AVX”).
* `nameZh/nameEn`: mnemonic family (e.g., “打包整数加法” / “Packed integer add”).
* `noteZh/noteEn`: one-line description tailored to that ISA.
* `example`: a typical assembly form (optional).
* `intrinsics`: array of related intrinsic names (optional).
* Keep **3–6** synonyms max; prefer mainstream counterparts.

# OUTPUT SHAPE (SKELETON – copy & fill)

```ts
import { tr } from '@/i18n'
import { syn } from '../../utils/syn'
import type { InstructionInfoProvider } from '../../types'

const info: InstructionInfoProvider = {
  id: '<ARCH>/<OPCODE>.<FORM>', // e.g. 'riscv/vadd.vv' — MUST match animation module

  metaGetter: () => ({
    usage: tr('<中文用法一句话>', '<English one-line usage>'),
    scenarios: [
      tr('<中文场景1>', '<English scenario 1>'),
      tr('<中文场景2>', '<English scenario 2>'),
      // ...
    ],
    notes: [
      tr('<中文注意1>', '<English note 1>'),
      tr('<中文注意2>', '<English note 2>'),
      // ...
    ],
    exceptions: [
      tr('无', 'None') // or concrete traps, e.g. alignment/fault conditions
    ],
  }),

  synonymsGetter: () => ([
    // 3–6 items max; customize per ISA family
    syn('ARMv8-A NEON','ARMv8-A NEON',
        '<中文名称>', '<English name>',
        '<中文说明>', '<English note>',
        '<Asm example (optional)>', ['<intrinsic1>','<intrinsic2>']),
    syn('x86 SSE/AVX','x86 SSE/AVX',
        '<中文名称>', '<English name>',
        '<中文说明>', '<English note>',
        '<Asm example (optional)>', ['<intrinsic1>']),
    // ... more if relevant
  ]),
}

export default info
```

# CHECKLIST

* [ ] `id` matches the animation module exactly.
* [ ] All visible strings wrapped by `tr`.
* [ ] `metaGetter()` is concise and neutral across ISAs.
* [ ] `synonymsGetter()` uses `syn(...)` and keeps list focused (3–6).
* [ ] No imports other than `tr`, `syn`, and `InstructionInfoProvider`.
* [ ] No animation or geometry code here.

---

**Now generate the info module for `<ARCH>/<OPCODE>.<FORM>` and return *code only*, no explanations.**

riscv/add