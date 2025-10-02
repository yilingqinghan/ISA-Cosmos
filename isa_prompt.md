# ROLE

You generate a single **TypeScript animation module** for ISA-Cosmos.
It must compile and run inside the project without extra changes.

# SCOPE

* **You implement only animation** (shapes + timeline).
* Usage text / scenarios / notes / exceptions / synonyms live in a separate `*.info.ts` and are **not** included here.
* The module must follow the **vadd_vv.ts** pattern (compute layout, build shapes, define steps with `Timeline`, return `doc`).

# RUNTIME & IMPORTS

> All coordinates are in **inches** (the renderer converts to px).

# DSL SHAPES (WHAT YOU CAN EMIT)

* `group` `{ kind:'group', id, x, y, w, h }`
* `rect`  `{ kind:'rect', id, x, y, w, h, color?, text?, textAlign?, textBaseline?, size?, roundPx? }`
* `text`  `{ kind:'text', id, x, y, w?, h?, text, size?, color?, align?, vAlign? }`
* `label` `{ kind:'label', id, x, y, text }`
* `arrow` `{ kind:'arrow', id, x1, y1, x2, y2, width?, color? }`
* `line`  `{ kind:'line', id, points? | (x1,y1,x2,y2), width?, color?, dash? }`

# OPTIONAL FACTORIES (IF NEEDED)

You **may** also create shapes using these helpers; they all return `DSLShape[]` you can spread into `shapes`:

```ts
// Functional blocks / wiring / memory / IO / register-file
alu({id,x,y,w?,h?,label?,color?})
bus({id, points?:[number,number][], x1?,y1?,x2?,y2?, width?, color?, dashed?})
memory({id,x,y,w,h,cells?,kind?,label?,cellColor?})
port({id,x,y,label?,dir?/*'in'|'out'*/,color?})
regfile({id,x,y,lanes,w?,h?,gap?,title?,laneColor?,boxColor?,laneText?:(i)=>string})
```

> Import path depends on your repo layout; if available, import them and push returned arrays into `shapes`. Otherwise, draw with basic shapes.

# 🧪 INPUT CONTEXT

The `build(ctx: BuildCtx)` receives:

```ts
type BuildCtx = {
  arch: string; opcode: string; form: string;
  operands: string[];                // e.g., ['v3','v3','v2']
  env?: { VL?: number; SEW?: number };
  values?: Record<string, Array<number|string>>; // optional per-register lane values
}
```

* **Do not** validate syntax here; validators are external.
* Prefer `ctx.values[reg]` if present; else generate plausible demo values.
* Use `toNum(value)` before computing to coerce strings/hex/bin safely.

# 🧭 LAYOUT & ELLIPSIS POLICY

Use `vectorSlotsFromEnv(ctx.env, { maxSlots: 8, defaultRegBits: 128, defaultElemBits: 32 })` to get:

```ts
const { regBits, elemBits, rawSlots, slots /*=N*/ } = ...
```

* If `rawSlots > slots`: reserve the **last** cell for an `…` ellipsis.
* That means **show `N-1` elements**, but **layout uses `N` cells**:

  ```ts
  const showEllipsis = rawSlots > slots
  const shownSlots = showEllipsis ? slots - 1 : slots
  const slotsForLayout = showEllipsis ? shownSlots + 1 : shownSlots
  ```
* Place ellipsis as a large centered `'…'` `text` in the reserved cell for each box you render.

# 🧱 CANONICAL BOXES (RECOMMENDED)

For two-source ops (vector ALU style), use:

```ts
const boxS1  = { x: px(1), y: px(1.00), w: px(4), h: px(1) }
const boxS2  = { x: px(1), y: px(2.40), w: px(4), h: px(1) }
const boxDst = { x: px(8), y: px(1.70), w: px(4), h: px(1) }
```

Fit lanes as **squares** with mild gap:

```ts
const dynGap  = slots >= 8 ? 0.10 : slots >= 6 ? 0.14 : 0.18
const s1Fit   = layoutRowInBoxSquare(boxS1,  slotsForLayout, 0.80, { gap: dynGap })
const s2Fit   = layoutRowInBoxSquare(boxS2,  slotsForLayout, 0.80, { gap: dynGap })
const dstFit  = layoutRowInBoxSquare(boxDst, slotsForLayout, 0.80, { gap: dynGap })
```

Text size & corner radius scale with lane size (use this exact pattern):

```ts
const textPx  = Math.max(12, Math.min(30, Math.round(s1Fit.side * 96 * 0.45)))
const roundPx = Math.max(8,  Math.round(s1Fit.side * 96 * 0.22))
```

# TIMELINE API (ANIMATION)

Use `Timeline` and return `tl.build(shapes, packOn, packOff)`:

```ts
const tl = new Timeline()
  .step('s1', tr('读取源向量','Read source vectors'))
    .appear('s1__box').appear('s2__box').appear('lbl_s1').appear('lbl_s2')
    .appear('ruler_s1__l').appear('ruler_s1__r').appear('ruler_s1__t')
  .step('s2', tr('送入 ALU','Feed into ALU'))
    .appear('a_s1_alu').appear('a_s2_alu').blink('alu',3,240)
  .step('s3', tr('执行运算','Execute'))
    .blink('alu',3,240)
  .step('s4', tr('写回结果','Write back'))
    .appear('a_alu_dst').appear('dst__box')
    .appear('ruler_dst__l').appear('ruler_dst__r').appear('ruler_dst__t')
    .appear('lbl_dst')
  .step('s5', tr('完成','Done'))
```

Available helpers on `Timeline` (use as needed):

* `appear(id)`, `disappear(id)`, `blink(id, times?, interval?)`
* `flow(from:[x,y], to:[x,y], opts?)` → spawns an `arrow` and appears it
* `move(targetId, from, to, opts?)` → dashed guide + blink target
* `highlight(id, {duration})` → blink derived from duration
* `typeText(id, text, at:[x,y])` → spawn a label and appear
* `loop(times)` → repeat current step’s anims

# LOCALIZATION (MANDATORY)

All **visible strings** must use `tr('中文','English')`.
Examples:

* Step names (`Timeline.step(name)`)
* On-canvas unit labels like `ALU`, `MEM`, `IO`, `STACK`
* Any boxed captions you draw with `text` or `label`

# OUTPUT REQUIREMENTS

* Export a default **`InstructionModule`**:

  * `id`: `"arch/opcode.form"` (e.g., `'riscv/vadd.vv'`)
  * `title`: mnemonic (e.g., `'vadd.vv'`)
  * `sample`: minimal runnable example for the editor (e.g., `'vadd.vv v0, v1, v2'`)
  * `build(ctx: BuildCtx) { ... return doc }`
* **Do not** include meta/synonyms; they live in `*.info.ts`.
* **Do not** import React or the SVG primitive components; **only** build data shapes.

# REFERENCE SKELETON (COPY & EDIT)

> Replace opcode/form/semantics/boxes/steps to fit your instruction.

```ts
import type { InstructionModule, BuildCtx } from '../../types'
import { Timeline } from '../../timeline'
import { tr } from '@/i18n'
import { inch as px, toNum, vectorSlotsFromEnv, layoutRowInBoxSquare, bitWidthRulerForBox } from '../../utils/geom'

const vaddVV: InstructionModule = {
  id: 'riscv/vadd.vv',
  title: 'vadd.vv',
  sample: 'vadd.vv v0, v1, v2',
  build(ctx: BuildCtx) {
    const [vd = 'v0', vs1 = 'v1', vs2 = 'v2'] = ctx.operands || []

    // 1) Env → slots
    const { regBits, elemBits, rawSlots, slots: N } =
      vectorSlotsFromEnv(ctx.env, { maxSlots: 8, defaultRegBits: 128, defaultElemBits: 32 })

    // 2) Ellipsis: show N-1, layout uses N (reserve last cell for '…')
    const showEllipsis  = rawSlots > N
    const shownSlots    = showEllipsis ? N - 1 : N
    const slotsForLayout = showEllipsis ? shownSlots + 1 : shownSlots

    // 3) Values (Editor can inject) + element-wise semantics
    const a0 = (ctx.values?.[vs1] ?? [1,2,3,4,5,6,7,8]).slice(0, shownSlots)
    const b0 = (ctx.values?.[vs2] ?? [10,11,12,13,14,15,16,17]).slice(0, shownSlots)
    const c0 = Array.from({ length: shownSlots }, (_, i) => {
      const va = toNum(a0[i]); const vb = toNum(b0[i])
      return va != null && vb != null ? (va as number) + (vb as number) : ''
    })

    // 4) Boxes (inches; renderer converts to px)
    const boxS1  = { x: px(1), y: px(1.00), w: px(4), h: px(1) }
    const boxS2  = { x: px(1), y: px(2.40), w: px(4), h: px(1) }
    const boxDst = { x: px(8), y: px(1.70), w: px(4), h: px(1) }

    const shapes: any[] = [
      { kind: 'group', id: 's1__box',  ...boxS1 },
      { kind: 'group', id: 's2__box',  ...boxS2 },
      { kind: 'group', id: 'dst__box', ...boxDst },
    ]

    // 5) Fit (use slotsForLayout so last cell is reserved for ellipsis)
    const dynGap = N >= 8 ? 0.10 : N >= 6 ? 0.14 : 0.18
    const s1Fit  = layoutRowInBoxSquare(boxS1,  slotsForLayout, 0.80, { gap: dynGap })
    const s2Fit  = layoutRowInBoxSquare(boxS2,  slotsForLayout, 0.80, { gap: dynGap })
    const dstFit = layoutRowInBoxSquare(boxDst, slotsForLayout, 0.80, { gap: dynGap })

    // 6) Text size & corner radius derived from lane side
    const textPx  = Math.max(12, Math.min(30, Math.round(s1Fit.side * 96 * 0.45)))
    const roundPx = Math.max(8,  Math.round(s1Fit.side * 96 * 0.22))

    // 7) Lanes (square cells w==h)
    for (let i = 0; i < shownSlots; i++) {
      shapes.push({ kind:'rect', id:`s1[${i}]`, ...s1Fit.lanes[i],
        color:'lightgray', text:String(a0[i] ?? ''), textAlign:'center', textBaseline:'middle',
        size:textPx, roundPx })
    }
    for (let i = 0; i < shownSlots; i++) {
      shapes.push({ kind:'rect', id:`s2[${i}]`, ...s2Fit.lanes[i],
        color:'teal', text:String(b0[i] ?? ''), textAlign:'center', textBaseline:'middle',
        size:textPx, roundPx })
    }
    for (let i = 0; i < shownSlots; i++) {
      shapes.push({ kind:'rect', id:`dst[${i}]`, ...dstFit.lanes[i],
        color:'lightgray', text:String(c0[i]), textAlign:'center', textBaseline:'middle',
        size:textPx, roundPx })
    }

    // 8) ALU block label (localized)
    shapes.push({ kind: 'rect', id: 'alu', x: 6, y: 1.6, w: 1.4, h: 1.2, color: '#0EA5E9', text: tr('算术逻辑单元', 'ALU') })

    // 9) Bit-width rulers
    shapes.push(...bitWidthRulerForBox(boxS1,  regBits, 'ruler_s1', 0.5, { elems: rawSlots }))
    shapes.push(...bitWidthRulerForBox(boxDst, regBits, 'ruler_dst', 0.6, { elems: rawSlots }))

    // 10) Ellipsis marks (center of reserved cells)
    if (showEllipsis) {
      const putEll = (fit: {side:number; lanes:{x:number;y:number;w:number;h:number}[]}, id:string) => {
        const last = fit.lanes[fit.lanes.length - 1] // 预留给省略号的第 N 个格子
        shapes.push({
          kind:'text', id:`${id}__ellipsis`,
          x:last.x, y:last.y, w:last.w, h:last.h,           // 让渲染层可用宽高做真正的水平/垂直居中
          text:'…',
          size: Math.max(16, Math.round(fit.side * 96 * 0.55)),
          color:'#475569', align:'center', vAlign:'middle'
        })
      }
      putEll(s1Fit, 's1')
      putEll(s2Fit, 's2')
      putEll(dstFit, 'dst')
    }

    // 11) Arrows
    const s1R = { x: boxS1.x + boxS1.w, y: boxS1.y + boxS1.h / 2 }
    const s2R = { x: boxS2.x + boxS2.w, y: boxS2.y + boxS2.h / 2 }
    const aluL = { x: 6,               y: 1.6 + 1.2/2 }
    const aluR = { x: 6 + 1.4,         y: 1.6 + 1.2/2 }
    const dstL = { x: boxDst.x,        y: boxDst.y + boxDst.h / 2 }

    shapes.push({ kind: 'arrow', id: 'a_s1_alu',  x1: s1R.x, y1: s1R.y - 0.15, x2: aluL.x, y2: aluL.y - 0.15, color: '#94a3b8', width: 2 })
    shapes.push({ kind: 'arrow', id: 'a_s2_alu',  x1: s2R.x, y1: s2R.y + 0.15, x2: aluL.x, y2: aluL.y + 0.15, color: '#94a3b8', width: 2 })
    shapes.push({ kind: 'arrow', id: 'a_alu_dst', x1: aluR.x, y1: aluR.y,       x2: dstL.x, y2: dstL.y,       color: '#94a3b8', width: 2 })

    // 12) Labels (actual register names)
    shapes.push({ kind: 'label', id: 'lbl_s1',  x: 1, y: 0.60, text: `vs1 = ${vs1}` })
    shapes.push({ kind: 'label', id: 'lbl_s2',  x: 1, y: 2.00, text: `vs2 = ${vs2}` })
    shapes.push({ kind: 'label', id: 'lbl_dst', x: 8, y: 1.20, text: `vd = ${vd}` })

    // 13) Timeline steps (names localized via tr)
    const tl = new Timeline()
    .step('s1', tr('读取源向量', 'Read source vectors'))
    .appear('s1__box').appear('s2__box')
    .appear('lbl_s1').appear('lbl_s2')
    .appear('ruler_s1__l').appear('ruler_s1__r').appear('ruler_s1__t')

    if (showEllipsis) tl.appear('s1__ellipsis').appear('s2__ellipsis')

    tl.step('s2', tr('送入 ALU', 'Feed into ALU'))
    .appear('a_s1_alu').appear('a_s2_alu')
    .blink('alu', 3, 240)
    .step('s3', tr('执行加法', 'Execute addition'))
    .blink('alu', 3, 240)
    .step('s4', tr('写回结果', 'Write back'))
    .appear('a_alu_dst').appear('dst__box')
    .appear('ruler_dst__l').appear('ruler_dst__r').appear('ruler_dst__t')
    .appear('lbl_dst')
    .appear('dst[0]').appear('dst[1]').appear('dst[2]').appear('dst[3]')

    for (let i = 4; i < shownSlots; i++) tl.appear(`dst[${i}]`)
    if (showEllipsis) tl.appear('dst__ellipsis')

    tl.step('s5', tr('完成', 'Done'))
    
    // 14) Build & return
    const doc = tl.build(shapes, [vs1, vs2, vd])

    return doc
  }
}

export { vaddVV }
export default vaddVV
```

# CHECKLIST BEFORE YOU RETURN

* [ ] All visible text wrapped by `tr('中文','English')`.
* [ ] Ellipsis policy correct (reserve last cell in each box).
* [ ] Lanes are square; textPx/roundPx derived from lane side.
* [ ] Steps tell a story: prepare → transfer → execute → writeback → done.
* [ ] Uses inches (`px(...)`) everywhere; **no raw pixels**.
* [ ] Pure function; no React, no DOM, no side effects.
* [ ] If necessary, surf the Internet for full usage of the instuction.

Now Please give the following instruction's typescript and return code only, no explanations:

riscv/add
