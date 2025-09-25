import React, { useMemo } from 'react'
import { Block } from '../canvas-kit/components/Block'
import { Arrow } from '../canvas-kit/components/Arrow'
import { StepLabel } from '../canvas-kit/components/StepLabel'
import { DottedGroup } from '../canvas-kit/components/DottedGroup'
import { CKTheme } from '../canvas-kit/theme'
import { useTimeline } from '../canvas-kit/animation/useTimeline'

export function FactorialScanDemo() {
  const lanes = 8
  // ★ 更大的默认尺寸
  const laneW = 86, laneH = 72, gap = 14
  const left = 180, top = 40

  const xs = useMemo(()=>Array.from({length:lanes}, (_,i)=>i+1),[])
  const shifted = useMemo(()=>[...xs.slice(1), 0], [xs])
  const prod = useMemo(()=>xs.map((v,i)=> v * (shifted[i] ?? 0)), [xs, shifted])
  const tl = useTimeline([{name:'左移',ms:1200},{name:'内积',ms:1200},{name:'取偶索引',ms:900}], true)

  const rowY = (row: number) => top + row * 120
  const cellX = (i: number) => left + i * (laneW + gap)

  const step1Active = tl.idx === 0 ? Math.floor(tl.t01 * lanes) : -1
  const step2Active = tl.idx === 1 ? Math.floor(tl.t01 * lanes) : -1
  const evenMask = (i: number) => (i % 2 === 0)

  return (
    <>
      <StepLabel x={40} y={rowY(0)} text="第一轮"/>
      <StepLabel x={80} y={rowY(1)} text="第一步"/>
      <StepLabel x={80} y={rowY(2)} text="第二步"/>
      <StepLabel x={80} y={rowY(3)} text="第三步"/>

      {xs.map((v,i)=>(
        <Block key={'x'+i} x={cellX(i)} y={rowY(0)} w={laneW} h={laneH}
          text={String(v)} variant={i===0?'ghost':'primary'} active={i===step1Active} fontSize={20}/>
      ))}

      <DottedGroup x={cellX(0)-12} y={rowY(1)-12} w={(laneW+gap)*lanes - gap + 24} h={laneH+24}/>
      {shifted.map((v,i)=>(
        <Block key={'s'+i} x={cellX(i)} y={rowY(1)} w={laneW} h={laneH}
          text={String(v)} variant={v===0?'dark':'primary'} active={i===step1Active} fontSize={20}/>
      ))}

      {xs.map((v,i)=>(
        <React.Fragment key={'mul'+i}>
          <Block x={cellX(i)} y={rowY(2)} w={laneW} h={laneH} text={String(v)} variant="white" fontSize={18}/>
          <Arrow x1={cellX(i)+laneW/2} y1={rowY(1)+laneH} x2={cellX(i)+laneW/2} y2={rowY(2)} color={CKTheme.color.primary}/>
          <Block
            x={cellX(i)} y={rowY(3)} w={laneW} h={laneH}
            text={tl.idx>1 || (tl.idx===1 && i<=step2Active) ? String(prod[i]) : ''}
            variant={ i===step2Active ? 'primary' : 'dashed' }
            active={i===step2Active} fontSize={18}
          />
        </React.Fragment>
      ))}

      {xs.map((_,i)=>(
        <Block key={'even'+i} x={cellX(i)} y={rowY(3)} w={laneW} h={laneH}
          text={evenMask(i) ? String(prod[i]) : ''} variant={ evenMask(i) ? 'primary' : 'dashed' }
          active={ tl.idx===2 && evenMask(i) } fontSize={18}
        />
      ))}
    </>
  )
}
