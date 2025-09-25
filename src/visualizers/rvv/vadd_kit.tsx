// src/visualizers/rvv/vadd_kit.tsx
import React, { useMemo } from 'react'
import { KitStage } from '../../canvas-kit/KitStage'
import { Block } from '../../canvas-kit/components/Block'
import { Arrow } from '../../canvas-kit/components/Arrow'
import { StepLabel } from '../../canvas-kit/components/StepLabel'
import { DottedGroup } from '../../canvas-kit/components/DottedGroup'
import { CKTheme } from '../../canvas-kit/theme'
import { useTimeline } from '../../canvas-kit/animation/useTimeline'
import { Text as KText, Group } from 'react-konva'

// ---------- 可配置接口 ----------
export interface VaddOptions {
  vlen?: number        // 默认 128
  sew?: number         // 默认 16
  vd?: string          // 目标寄存器名，默认 v0
  vs1?: string         // 源寄存器1，默认 v1
  vs2?: string         // 源寄存器2，默认 v2
  values1?: number[]   // v1 的演示数据（可选）
  values2?: number[]   // v2 的演示数据（可选）
  zoom: number         // 外部离散倍率
  resetSignal?: number // 外部复位信号（数值变化即复位平移）
}

const hasCJK = (s?: string) => !!s && /[\u3400-\u9FFF]/.test(s)

// ---------- Host：包裹 KitStage，计算自适应尺寸 ----------
export function VaddRVVKitHost({
  vlen = 128, sew = 16, vd = 'v0', vs1 = 'v1', vs2 = 'v2',
  values1, values2, zoom, resetSignal
}: VaddOptions) {

  const lanes = Math.max(1, Math.floor(vlen / sew))

  // 版面尺寸（关键：contentWidth 按 lanes 线性增长，KitStage fit="width" 初始时会横向贴满）
  const laneW = 86, laneH = 64, gap = 14
  const left = 180, right = 140, top = 40, rowGap = 120
  const contentWidth  = left + right + lanes * laneW + (lanes - 1) * gap
  const contentHeight = top + rowGap * 3 + laneH + 60  // 3 行 + 说明

  return (
    <KitStage
      contentSize={{ width: contentWidth, height: contentHeight }}
      zoom={zoom}
      fit="width"
      onResetSignal={resetSignal}
    >
      <VaddScene
        lanes={lanes}
        laneW={laneW} laneH={laneH} gap={gap}
        left={left} top={top} rowGap={rowGap}
        regNames={{ vd, vs1, vs2 }}
        values1={values1} values2={values2}
        vlen={vlen} sew={sew}
      />
    </KitStage>
  )
}

// ---------- 具体场景渲染（布局 + 动画） ----------
function VaddScene(props: {
  lanes: number; laneW: number; laneH: number; gap: number
  left: number; top: number; rowGap: number
  regNames: { vd: string; vs1: string; vs2: string }
  values1?: number[]; values2?: number[]
  vlen: number; sew: number
}) {
  const { lanes, laneW, laneH, gap, left, top, rowGap, regNames, values1, values2, vlen, sew } = props
  const { vd, vs1, vs2 } = regNames

  // 数据：可传入演示数据，否则默认 v1=1..N，v2=10..，v0 初始 0
  const xs = useMemo(() => values1 ?? Array.from({ length: lanes }, (_, i) => i + 1), [lanes, values1])
  const ys = useMemo(() => values2 ?? Array.from({ length: lanes }, (_, i) => 10 + i), [lanes, values2])
  const sums = useMemo(() => xs.map((a, i) => a + (ys[i] ?? 0)), [xs, ys])

  // 时间轴：每个 lane 一步
  const steps = useMemo(() => Array.from({ length: lanes }, () => ({ name: 'lane', ms: 550 })), [lanes])
  const tl = useTimeline(steps.length ? steps : [{ name: 'idle', ms: 500 }], true)
  const active = Math.min(tl.idx, lanes - 1)

  // 工具函数：行/列坐标
  const rowY = (r: number) => top + r * rowGap
  const cellX = (i: number) => left + i * (laneW + gap)

  // 标题与描述（字体：中英自动）
  const title = `RVV vadd.vv ${vd}, ${vs1}, ${vs2}`
  const sub   = `Form: vv    Lanes: ${lanes} (VLEN=${vlen}, SEW=${sew})`
  const fontTitle = hasCJK(title) ? CKTheme.font.zh : CKTheme.font.en
  const fontSub   = hasCJK(sub)   ? CKTheme.font.zh : CKTheme.font.en

  return (
    <>
      <Group listening={false}>
        <KText x={left - 120} y={top - 24} text={title} fontFamily={fontTitle} fontSize={18} fill={CKTheme.color.text}/>
        <KText x={left - 120} y={top - 2}  text={sub}   fontFamily={fontSub}   fontSize={12} fill={CKTheme.color.muted}/>
      </Group>

      {/* 左侧标签 */}
      <StepLabel x={left - 150} y={rowY(0) - 6} text="v1"/>
      <StepLabel x={left - 150} y={rowY(1) - 6} text="v2"/>
      <StepLabel x={left - 150} y={rowY(2) - 6} text="v0"/>

      {/* v1 行 */}
      {xs.map((v, i) => (
        <Block
          key={'v1'+i}
          x={cellX(i)} y={rowY(0)} w={laneW} h={laneH}
          text={String(v)}
          variant="primary"
          active={i === active}
          fontSize={20}
        />
      ))}

      {/* v2 行（浅青虚线组背景以示配对） */}
      <DottedGroup x={cellX(0) - 12} y={rowY(1) - 12} w={(laneW + gap) * lanes - gap + 24} h={laneH + 24}/>
      {ys.map((v, i) => (
        <Block
          key={'v2'+i}
          x={cellX(i)} y={rowY(1)} w={laneW} h={laneH}
          text={String(v)}
          variant="primary"
          active={i === active}
          fontSize={20}
        />
      ))}

      {/* v0 行（随动画逐个填入） */}
      {Array.from({ length: lanes }).map((_, i) => (
        <Block
          key={'v0'+i}
          x={cellX(i)} y={rowY(2)} w={laneW} h={laneH}
          text={i <= active ? String(sums[i]) : ''}
          variant={i <= active ? 'primary' : 'dashed'}
          active={i === active}
          fontSize={20}
        />
      ))}

      {/* 动态箭头（只给当前 lane 画两条垂直箭头） */}
      <Arrow
        x1={cellX(active) + laneW/2} y1={rowY(0) + laneH}
        x2={cellX(active) + laneW/2} y2={rowY(2)}
        color={CKTheme.color.primary}
      />
      <Arrow
        x1={cellX(active) + laneW/2} y1={rowY(1) + laneH}
        x2={cellX(active) + laneW/2} y2={rowY(2)}
        color="#06b6d4"
      />
    </>
  )
}
