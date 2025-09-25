import React, { useMemo } from 'react'
import { Block } from '../canvas-kit/components/Block'
import { Arrow } from '../canvas-kit/components/Arrow'
import { StepLabel } from '../canvas-kit/components/StepLabel'
import { DottedGroup } from '../canvas-kit/components/DottedGroup'
import { CKTheme } from '../canvas-kit/theme'
import { useTimeline } from '../canvas-kit/animation/useTimeline'

export function FactorialScanDemo() {
  const lanes = 8
  const laneW = 64, laneH = 56, gap = 10
  const left = 140, top = 30

  const xs = useMemo(()=>Array.from({length:lanes}, (_,i)=>i+1),[])
  const shifted = useMemo(()=>[...xs.slice(1), 0], [xs])
  const prod = useMemo(()=>xs.map((v,i)=> v * (shifted[i] ?? 0)), [xs, shifted])

  // 时间轴：三步
  const tl = useTimeline([
    { name:'左移', ms:1200 },
    { name:'内积', ms:1200 },
    { name:'取偶索引', ms:900 },
  ], true)

  // 工具：画一行
  const rowY = (row: number) => top + row * 110
  const cellX = (i: number) => left + i * (laneW + gap)

  // Step 1：左移动画 —— 用 active 高亮逐格推进
  const step1Active = tl.idx === 0 ? Math.floor(tl.t01 * lanes) : -1

  // Step 2：内积 —— 虚线组与箭头
  const step2Active = tl.idx === 1 ? Math.floor(tl.t01 * lanes) : -1

  // Step 3：取偶索引 —— 只高亮 0,2,4,6
  const evenMask = (i: number) => (i % 2 === 0)

  return (
    <>
      {/* 左侧“第一轮/第一步/第二步/第三步” */}
      <StepLabel x={40} y={rowY(0)} text="第一轮"  w={64} h={28}/>
      <StepLabel x={72} y={rowY(1)} text="第一步"  w={64} h={24}/>
      <StepLabel x={72} y={rowY(2)} text="第二步"  w={64} h={24}/>
      <StepLabel x={72} y={rowY(3)} text="第三步"  w={64} h={24}/>

      {/* 原始行 */}
      {xs.map((v,i)=>(
        <Block key={'x'+i}
          x={cellX(i)} y={rowY(0)} w={laneW} h={laneH}
          text={String(v)} variant={i===0?'ghost':'primary'} active={i===step1Active}
        />
      ))}

      {/* Step1 左移行 + 组虚线 */}
      <DottedGroup x={cellX(0)-10} y={rowY(1)-10} w={(laneW+gap)*lanes- gap +20} h={laneH+20}/>
      {shifted.map((v,i)=>(
        <Block key={'s'+i}
          x={cellX(i)} y={rowY(1)} w={laneW} h={laneH}
          text={String(v)} variant={v===0?'dark':'primary'}
          active={i===step1Active}
        />
      ))}

      {/* Step2 内积：上一行 × 原始行（演示箭头下落、结果白框） */}
      {xs.map((v,i)=>(
        <React.Fragment key={'mul'+i}>
          {/* 上方源 */}
          <Block x={cellX(i)} y={rowY(2)} w={laneW} h={laneH} text={String(v)} variant="white" />
          {/* 垂直连线箭头 */}
          <Arrow x1={cellX(i)+laneW/2} y1={rowY(1)+laneH} x2={cellX(i)+laneW/2} y2={rowY(2)} color={CKTheme.color.primary} />
          {/* × 符号 */}
          {/* 结果框（虚线，逐步填充） */}
          <Block
            x={cellX(i)} y={rowY(3)} w={laneW} h={laneH}
            text={tl.idx>1 || (tl.idx===1 && i<=step2Active) ? String(prod[i]) : ''}
            variant={ i===step2Active ? 'primary' : 'dashed' }
            active={i===step2Active}
          />
          <Arrow x1={cellX(i)+laneW/2} y1={rowY(2)+laneH} x2={cellX(i)+laneW/3*1.0} y2={rowY(3)} color={CKTheme.color.dashed}/>
        </React.Fragment>
      ))}

      {/* Step3 取偶索引：偶数位保留为青绿，其余保持虚线 */}
      {xs.map((_,i)=>(
        <Block
          key={'even'+i}
          x={cellX(i)} y={rowY(3)} w={laneW} h={laneH}
          text={evenMask(i) ? String(prod[i]) : ''}
          variant={ evenMask(i) ? 'primary' : 'dashed' }
          active={ tl.idx===2 && evenMask(i) }
        />
      ))}
    </>
  )
}
