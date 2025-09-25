import React, { useEffect, useMemo, useState } from 'react'
import KitStage from '../../canvas-kit/KitStage'
import { fetchDSL } from '../../utils/fetchDSL'
import { parseDSL, DSLDoc, DSLShape } from '../../utils/parse'
import { dbg, DEBUG_ON } from '../../utils/debug'
import { Group, Rect, Text, Line } from 'react-konva'

// 颜色表（可按需继续扩展）
const COLOR: Record<string, string> = {
  lightgray: '#F4F6FA',
  teal: '#59E0D0',
  black: '#0B1220',
  '#0EA5E9': '#0EA5E9',
  '#22d3ee': '#22d3ee',
}
const colorOf = (c?: string) => (c && COLOR[c] ? COLOR[c] : (c || '#E5E7EB'))

// —— 可见性与动画信息 —— //
function useVisibility(doc: DSLDoc, stepIdx: number) {
  const appearAt = new Map<string, number>()
  const disappearAt = new Map<string, number>()
  const blinkAt = new Map<string, { step: number; times: number; period: number }>()

  doc.anims.forEach(a => {
    if (a.kind === 'appear') appearAt.set(a.id, doc.steps.findIndex(s => s.id === a.stepId))
    if (a.kind === 'disappear') disappearAt.set(a.id, doc.steps.findIndex(s => s.id === a.stepId))
    if (a.kind === 'blink') {
      const s = doc.steps.findIndex(x => x.id === a.stepId)
      blinkAt.set(a.id, { step: s, times: a.times, period: a.period })
    }
  })

  const isVisible = (id: string) => {
    const ap = appearAt.has(id) ? appearAt.get(id)! : -1
    const dp = disappearAt.has(id) ? disappearAt.get(id)! : Infinity
    return stepIdx >= ap && stepIdx < dp
  }

  return { isVisible, blinkAt, appearAt }
}

export default function CanvasKitPanel() {
  // 你可以替换为来自 UI/Context 的选择
  const [arch] = useState<'rvv'>('rvv')
  const [opcode] = useState('vadd')
  const [form] = useState('vv')

  const [dsl, setDsl] = useState('')
  const [doc, setDoc] = useState<DSLDoc>({ steps: [], shapes: [], anims: [] })
  const [stepIdx, setStepIdx] = useState(0)

  // 画布控制
  const [zoom, setZoom] = useState(1)
  const [resetTick, setResetTick] = useState(0)
  const [blinkTick, setBlinkTick] = useState(0)

  // 加载 & 解析
  useEffect(() => {
    fetchDSL({ arch, opcode, form }).then(({ text }) => setDsl(text))
  }, [arch, opcode, form])

  useEffect(() => {
    const d = parseDSL(dsl)
    setDoc(d)
    setStepIdx(0)
    dbg.info('parsed:', { steps: d.steps.length, shapes: d.shapes.length, anims: d.anims.length })
  }, [dsl])

  const { isVisible, blinkAt, appearAt } = useVisibility(doc, stepIdx)

  // 闪烁（仅在当前步骤涉及的 id 上）
  useEffect(() => {
    const ids = Array.from(blinkAt.keys()).filter(id => blinkAt.get(id)!.step === stepIdx)
    if (!ids.length) return
    const period = Math.min(...ids.map(id => blinkAt.get(id)!.period))
    const t = setInterval(() => setBlinkTick(t => t + 1), Math.max(150, period / 2))
    return () => clearInterval(t)
  }, [blinkAt, stepIdx])

  // 控制条（右上角）
  const stepName = doc.steps[stepIdx]?.name ?? ''
  const CtrlBar = () => (
    <div className="canvas-toolbar nice-glass">
      <div className="chip step-chip">
        步骤：{Math.min(stepIdx + 1, Math.max(1, doc.steps.length))}/{Math.max(doc.steps.length, 1)} · {stepName || '—'}
      </div>
      <div className="spacer" />
      <button className="btn" onClick={() => setStepIdx(i => Math.max(0, i - 1))}>上一步</button>
      <button className="btn" onClick={() => setStepIdx(i => Math.min((doc?.steps.length || 1) - 1, i + 1))}>下一步</button>
      <select className="select" value={String(zoom)} onChange={e => setZoom(parseFloat(e.target.value))}>
        <option value="0.75">75%</option><option value="1">100%</option>
        <option value="1.25">125%</option><option value="1.5">150%</option><option value="2">200%</option>
      </select>
      <button className="btn" onClick={() => setResetTick(t => t + 1)}>复位</button>
    </div>
  )

  // —— Konva 渲染 —— //
  const renderShape = (s: DSLShape) => {
    if (!isVisible(s.id)) return null

    switch (s.kind) {
      case 'rect': {
        const W = s.w * 96, H = s.h * 96, X = s.x * 96, Y = s.y * 96
        const fontSize = 28
        const justAppeared = appearAt.get(s.id) === stepIdx
        const scale = justAppeared ? 1.035 : 1
        const shadow = justAppeared ? 18 : 12
        return (
          <Group key={s.id} x={X} y={Y} opacity={1} scaleX={scale} scaleY={scale}>
            <Rect width={W} height={H} cornerRadius={20} fill={colorOf(s.color)} shadowBlur={shadow} shadowColor="#00000022" />
            {s.text ? (
              <Text
                text={s.text}
                x={0}
                y={(H - fontSize) / 2}          // ★ 完全数值居中（避免字体基线差异）
                width={W}
                height={fontSize}
                align="center"
                fontSize={fontSize}
                fontStyle="600"
                listening={false}
                fill={COLOR.black}
                fontFamily="'Futura','STFangsong','PingFang SC','Microsoft YaHei',system-ui"
              />
            ) : null}
          </Group>
        )
      }
      case 'label': {
        const X = s.x * 96, Y = s.y * 96
        const padding = 12
        const textWidth = Math.max(40, s.text.length * 16)
        const W = textWidth + padding * 2, H = 32
        return (
          <Group key={s.id} x={X} y={Y}>
            <Rect width={W} height={H} cornerRadius={10} fill="#111827" opacity={0.72} />
            <Text
              text={s.text}
              x={padding}
              y={6}
              fill="#fff"
              fontSize={16}
              fontStyle="600"
              listening={false}
              fontFamily="'Futura','STFangsong','PingFang SC','Microsoft YaHei',system-ui"
            />
          </Group>
        )
      }
      case 'group': {
        const X = s.x * 96, Y = s.y * 96, W = s.w * 96, H = s.h * 96
        return (
          <Rect
            key={s.id}
            x={X}
            y={Y}
            width={W}
            height={H}
            cornerRadius={18}
            stroke="#6B7280"
            dash={[10, 8]}
            opacity={0.35}
            listening={false}
          />
        )
      }
      case 'line': {
        const pts = [s.x1, s.y1, s.x2, s.y2].map(v => v * 96)
        return <Line key={s.id} points={pts} stroke={colorOf(s.color)} strokeWidth={s.width || 2} />
      }
      case 'arrow': {
        const pts = [s.x1, s.y1, s.x2, s.y2].map(v => v * 96)
        const blink = blinkAt.get(s.id)
        const blinking = !!blink && blink.step === stepIdx
        const alpha = blinking ? (blinkTick % 2 === 0 ? 1 : 0.25) : 1
        const w = s.width || 3
        const head = 10 + w * 2
        const [x1, y1, x2, y2] = pts
        const angle = Math.atan2(y2 - y1, x2 - x1)
        const hx = x2 - Math.cos(angle) * head
        const hy = y2 - Math.sin(angle) * head
        return (
          <Group key={s.id} opacity={alpha}>
            <Line points={[x1, y1, x2, y2]} stroke={colorOf(s.color)} strokeWidth={w} />
            <Line
              points={[x2, y2, hx - Math.sin(angle) * head * 0.35, hy + Math.cos(angle) * head * 0.35, hx + Math.sin(angle) * head * 0.35, hy - Math.cos(angle) * head * 0.35]}
              closed
              fill={colorOf(s.color)}
            />
          </Group>
        )
      }
      default:
        return null
    }
  }

  // 一层 Layer 内分三个 Group（底/中/顶）
  const Content = () => {
    if (!doc?.shapes.length) {
      return DEBUG_ON ? (
        <Text text="(调试) 无可绘制图元：请检查解析日志。" x={24} y={24} fontSize={16} fill="#EF4444" />
      ) : null
    }
    const groups = doc.shapes.filter(s => s.kind === 'group')
    const main = doc.shapes.filter(s => s.kind === 'rect' || s.kind === 'line' || s.kind === 'arrow')
    const labels = doc.shapes.filter(s => s.kind === 'label')

    return (
      <>
        <Group listening={false}>{groups.map(renderShape)}</Group>
        <Group>{main.map(renderShape)}</Group>
        <Group listening={false}>{labels.map(renderShape)}</Group>
      </>
    )
  }

  return (
    <div className="canvas-root">
      <CtrlBar />
      <KitStage contentSize={{ width: 1600, height: 1000 }} zoom={zoom} onResetSignal={resetTick} pannable>
        {/* 内容整体可平移区域（留边距更通透） */}
        <Group x={96} y={72}>
          <Content />
        </Group>
      </KitStage>
    </div>
  )
}
