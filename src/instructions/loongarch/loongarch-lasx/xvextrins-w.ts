你是一名前端工程师，任务是**生成一个 TypeScript 指令模块文件，用于在 SVG 画布上演示某条 ISA 指令的执行过程**。
 **只允许输出最终的文件内容**（一个 `.ts` 文件），**不要解释、不要注释、不要代码块标记**。

## 运行环境与约束

- 目标项目已提供以下导入（**需要/优先使用**）：

  ```ts
  import type { InstructionModule, BuildCtx } from '../../types'
  import { Timeline } from '../../timeline'
  import {
    inch as px, toNum,
    // 新接口（优先用）
    vectorSlotsFromEnv, layoutRowInBoxSquare, bitWidthRulerForBox,
    // 旧接口（可用、但能推导就别手写绝对坐标）
    leftMid, rightMid, centerOf,
    arrowBetween,
    layoutRowInBox,
  } from '../../utils/geom'
  ```

- **坐标单位用英寸**（渲染层会自动乘以 96 转 px）。

- 形状 DSL（可向 `shapes:any[]` 推入这些对象）：

  - `group`：`{ kind:'group', id, x, y, w, h }`
  - `rect`：`{ kind:'rect', id, x, y, w, h, color?, stroke?, strokeWidth?, text?, textAlign?, textBaseline?, size?, roundPx? }`
    - `size` 为字号（px），`roundPx` 为圆角（px），**请按方块边长自适应**。
  - `label`：`{ kind:'label', id, x, y, text }`
  - `arrow`：`{ kind:'arrow', id, x1, y1, x2, y2, color?, width? }`
  - `text`（可选，用于省略号/对齐微调）：`{ kind:'text', id, x, y, w?, h?, text, size?, color?, align?, vAlign? }`
     其中 `align: 'left'|'center'|'right'`，`vAlign: 'top'|'middle'|'bottom'`。

- **常用工具（必须优先用新接口）**：

  - `vectorSlotsFromEnv(env, { maxSlots, defaultRegBits, defaultElemBits })`
     → `{ regBits, elemBits, rawSlots, slots }`（`slots` 为显示上限裁剪值）。
  - `layoutRowInBoxSquare(box, n, laneScale, { gap })`
     → 返回 `{ side, gapX, lanes:[{x,y,w,h}...] }`，**保证 w==h 正方形**。
  - `bitWidthRulerForBox(box, regBits, idPrefix, scale, { elems })`
     → 生成“XXX-bit · YY elems”标尺三段件。
  - `px(u)`，`toNum(x)`：同原义。
  - `leftMid/rightMid/centerOf/arrowBetween/layoutRowInBox` 仍可用，但**当你能用上面新接口推导时，不要硬编码绝对坐标**。

- **ID 命名规范（保持一致，防冲突）**：

  - 盒子：`s1__box` / `s2__box` / `dst__box`；ALU：`alu`
  - lane：`s1[i]` / `s2[i]` / `dst[i]`
  - 省略号：`s1__ellipsis` / `s2__ellipsis` / `dst__ellipsis`
  - 箭头：`a_s1_alu` / `a_s2_alu` / `a_alu_dst`

- **时间线**（`Timeline`）：典型顺序【读取 → 送入 ALU → 执行 → 写回 → 完成】；
   用 `.appear(id)`、`.blink(id, times, ms)` 控制显隐与闪烁。**有省略号时请在读取阶段出现**。

## 数据与排布（新版强约束）

- **向量形态**：不要用固定 `VL`。请用

  ```ts
  const { regBits, elemBits, rawSlots, slots: N } =
    vectorSlotsFromEnv(ctx.env, { maxSlots: 8, defaultRegBits: 128, defaultElemBits: 32 })
  ```

  - **省略号与“九等分”规则**：

    ```ts
    const showEllipsis  = rawSlots > N
    const shownSlots    = showEllipsis ? N - 1 : N
    const slotsForLayout = showEllipsis ? shownSlots + 1 : shownSlots
    ```

    - **渲染元素**只画 `shownSlots` 个 lane；
    - **排布**要用 `slotsForLayout`（最后一格留给省略号），避免“省略号盖住最后一个元素”。
    - 三个盒子（s1/s2/dst）**都要放省略号**：用 `kind:'text'`，并传 `w/h + align:'center' + vAlign:'middle'`，才能真正居中。

- **布局**：用 `layoutRowInBoxSquare(box, slotsForLayout, 0.80, { gap })`，其中

  ```ts
  const dynGap = N >= 8 ? 0.10 : N >= 6 ? 0.14 : 0.18
  ```

  `side` 决定视觉基准。

- **字号与圆角自适应**（基于 `side`）：

  ```ts
  const textPx  = Math.max(12, Math.min(30, Math.round(s1Fit.side * 96 * 0.45)))
  const roundPx = Math.max(8,  Math.round(s1Fit.side * 96 * 0.22))
  ```

  绘制 `rect` 时请赋 `size:textPx, roundPx`，避免“被挤压后像圆形”。

- **值来源**：

  - 操作数：`const [vd='v0', vs1='v1', vs2='v2'] = ctx.operands || []`
  - 数组：`ctx.values?.[reg] ?? 默认数组`，并 `.slice(0, shownSlots)`
  - 逐元素运算时用 `toNum` 转数；无效值返回空串 `''`。

- **标尺**：`bitWidthRulerForBox(boxS1, regBits, 'ruler_s1', 0.5, { elems: rawSlots })`
   `bitWidthRulerForBox(boxDst, regBits, 'ruler_dst', 0.6, { elems: rawSlots })`

- **箭头**：可直接用盒子中心/左右边中点计算，也可用 `arrowBetween(...)`。
   注意通过 `dy1/dy2` 做轻微错位，避免两条线重叠。

## 时间线编排（带省略号）

- 读取：出现 `s1__box/s2__box`、源侧标尺、`lbl_s1/lbl_s2`，若有省略号再 `.appear('s1__ellipsis').appear('s2__ellipsis')`
- 送入 ALU：出现输入箭头，`blink('alu', 3, 240)`
- 执行：`blink('alu', 3, 240)`
- 写回：出现输出箭头、`dst__box`、目标侧标尺、`lbl_dst`、以及 `dst[i]`（可先显前 4，再循环显其余）；若有省略号 `.appear('dst__ellipsis')`
- 完成：收尾一步

## 输出结构

- `build()` 返回 `{ doc, extras? }`
  - `doc` 由 `tl.build(shapes, [关键寄存器顺序])` 生成
  - `extras.synonyms` 里放**跨架构同义指令**（数组项 `{ arch, name, note?, example? }`）。
     （UI 会固定位置展示，无需滚动。）

## 质量检查清单（请在生成时自检）

1. **是否使用 `vectorSlotsFromEnv`？**（不要写死 VL）
2. **是否按“显示 N-1、排布 N”的省略号规则**？s1/s2/dst 三处都有省略号？
3. **省略号使用 `kind:'text'` 并传 `w/h + align + vAlign`，真正居中？**
4. **`rect` 的 `size/roundPx` 随 `side` 自适应？**
5. **位宽标尺是否存在且 elems=rawSlots？**
6. **时间线步骤是否完整，且 ellipsis 在读取阶段出现？**
7. **未手写可推导的硬编码坐标**（能用工具函数就用工具函数）。
8. **extras.synonyms 已填好**。

------

## One-shot 示例（保持不变，仅作风格参考）

```typescript
import type { InstructionModule, BuildCtx } from '../types'
import { Timeline } from '../timeline'
import {
  inch as px,
  toNum,
  leftMid, rightMid, centerOf,
  arrowBetween,
  layoutRowInBox,
} from '../utils/geom'

const vaddVV: InstructionModule = {
  id: 'rvv/vadd.vv',
  title: 'vadd.vv',
  sample: 'vadd.vv v0, v1, v2',
  meta: {
    usage: '<<<USAGE>>>',
    scenarios: ['向量数组加法', '并行数据处理', '科学计算'],
    notes: ['元素宽度由 vtype.vsew 决定', '支持掩码 vm', '目的寄存器 vd 可与源寄存器同名'],
    exceptions: ['无']
  },
  build(ctx: BuildCtx) {
    const [vd = 'v0', vs1 = 'v1', vs2 = 'v2'] = ctx.operands || []
    const VL = ctx.env?.VL ?? 4

    const a0 = (ctx.values?.[vs1] ?? [1, 2, 3, 4]).slice(0, VL)
    const b0 = (ctx.values?.[vs2] ?? [10, 11, 12, 13]).slice(0, VL)
    const c0 = Array.from({ length: VL }, (_, i) => {
      const va = toNum(a0[i]); const vb = toNum(b0[i]); return va != null && vb != null ? va + vb : ''
    })

    const boxS1  = { x: px(1), y: px(1),   w: px(4), h: px(1) }
    const boxS2  = { x: px(1), y: px(2.4), w: px(4), h: px(1) }
    const boxDst = { x: px(8), y: px(1.7), w: px(4), h: px(1) }

    const shapes: any[] = [
      { kind: 'group', id: 's1__box',  ...boxS1 },
      { kind: 'group', id: 's2__box',  ...boxS2 },
      { kind: 'group', id: 'dst__box', ...boxDst },
    ]

    const laneW = 0.8, laneH = 0.8
    const s1Lanes  = layoutRowInBox(boxS1,  VL, laneW, laneH)
    const s2Lanes  = layoutRowInBox(boxS2,  VL, laneW, laneH)
    const dstLanes = layoutRowInBox(boxDst, VL, laneW, laneH)

    for (let i = 0; i < VL; i++) shapes.push({ kind:'rect', id:`s1[${i}]`, ...s1Lanes[i], color:'lightgray', text:String(a0[i] ?? ''), textAlign:'center', textBaseline:'middle' })
    for (let i = 0; i < VL; i++) shapes.push({ kind:'rect', id:`s2[${i}]`, ...s2Lanes[i], color:'teal',      text:String(b0[i] ?? ''), textAlign:'center', textBaseline:'middle' })

    shapes.push({ kind:'rect', id:'alu', x: 6, y: 1.6, w: 1.4, h: 1.2, color:'#0EA5E9', text:'ALU' })

    for (let i = 0; i < VL; i++) shapes.push({ kind:'rect', id:`dst[${i}]`, ...dstLanes[i], color:'lightgray', text:String(c0[i]), textAlign:'center', textBaseline:'middle' })

    shapes.push(
      { kind:'label', id:'lbl_s1',  x:1, y:0.6, text:`vs1 = ${vs1}` },
      { kind:'label', id:'lbl_s2',  x:1, y:2.0, text:`vs2 = ${vs2}` },
      { kind:'label', id:'lbl_dst', x:8, y:1.2, text:`vd = ${vd}` },
    )

    const s1R  = rightMid(shapes, 's1__box')
    const s2R  = rightMid(shapes, 's2__box')
    const aluL = leftMid(shapes,  'alu')
    const aluR = rightMid(shapes, 'alu')
    const dstL = leftMid(shapes,  'dst__box')

    shapes.push(arrowBetween(shapes, 'a_s1_alu', s1R, aluL, { dy1: -0.15, dy2: -0.15 }))
    shapes.push(arrowBetween(shapes, 'a_s2_alu', s2R, aluL, { dy1: +0.15, dy2: +0.15 }))
    shapes.push(arrowBetween(shapes, 'a_alu_dst', aluR, dstL))

    const tl = new Timeline()
      .step('s1','读取源向量').appear('s1__box').appear('s2__box').appear('lbl_s1').appear('lbl_s2')
      .step('s2','送入 ALU').appear('a_s1_alu').appear('a_s2_alu').blink('alu',3,240)
      .step('s3','执行加法').blink('alu',3,240)
      .step('s4','写回结果').appear('a_alu_dst').appear('dst__box').appear('lbl_dst').appear('dst[0]').appear('dst[1]').appear('dst[2]').appear('dst[3]')
      .step('s5','完成')

    const doc = tl.build(shapes, [vs1, vs2, vd])
    const synonyms = [
      { arch: 'ARM NEON',     name: 'vaddq_s32',     note: '同宽度向量加法', example: 'int32x4_t c = vaddq_s32(a,b);' },
      { arch: 'x86 SSE/AVX',  name: 'PADDD/VPADDD',  note: '32位打包加',     example: '__m128i c = _mm_add_epi32(a,b);' },
    ]
    ;(doc as any).synonyms = synonyms
    return { doc, extras: { synonyms } }
  }
}

export { vaddVV }
export default vaddVV
```

## 现在请生成一个**新指令文件**，遵循上面的结构与约束，并替换以下占位内容：

**要求**：

1. 输出**完整的 `.ts` 文件内容**；**不要**输出任何说明文字、注释、或 Markdown 代码块标记。

2. 你要完成的指令如下， 如有必要，请联网搜索其功能、用法等：

```
xvextrins.w```
