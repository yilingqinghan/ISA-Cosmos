import { useEffect, useState } from 'react'
import { BuiltScene } from '@core/instructions/types'
import StageView from '@core/konva/StageView'
import { Animator } from '@core/canvas/animator'
import { Toolbar, ToolbarGroup } from '@ui/Toolbar'
import { Button } from '@ui/Button'
import { Select } from '@ui/Select'

export function CanvasPanel({ built }:{ built: BuiltScene | null }) {
  const [paused, setPaused] = useState(false)
  const [speed, setSpeed] = useState(1)
  const [zoom, setZoom] = useState(1)          // 0.5 | 0.75 | 1 | 1.25 | 1.5 | 2
  const [resetSignal, setResetSignal] = useState(0)

  useEffect(() => {
    if (!built?.animator) return
    built.animator.setSpeed(1)
    setPaused(false)
    setSpeed(1)
    setZoom(1)
    setResetSignal(s => s + 1) // 新场景复位平移
  }, [built?.scene])

  const togglePlay = () => {
    const a = built?.animator as Animator | undefined
    if (!a) return
    setPaused(a.toggle())
  }
  const changeSpeed = (v: number) => {
    const a = built?.animator as Animator | undefined
    if (!a) return
    a.setSpeed(v)
    setSpeed(v)
  }

  return (
    <div className="canvas-root" style={{ position:'relative', height:'100%', minHeight:0, background:'transparent' }}>
      {built && <StageView built={built} zoom={zoom} onRequestReset={resetSignal} />}

      {/* 工具条：暂停/速度/倍率/复位（缩放仅离散值） */}
      <Toolbar>
        {built?.animator && (
          <ToolbarGroup>
            <Button onClick={togglePlay}>{paused ? '继续 ▶' : '暂停 ❚❚'}</Button>
            <span style={{fontSize:12, color:'var(--muted)'}}>速度</span>
            <Select value={String(speed)} onChange={(e)=>changeSpeed(parseFloat(e.target.value))}>
              <option value="0.5">0.5x</option>
              <option value="1">1x</option>
              <option value="2">2x</option>
              <option value="4">4x</option>
            </Select>
          </ToolbarGroup>
        )}

        <ToolbarGroup>
          <span style={{fontSize:12, color:'var(--muted)'}}>倍率</span>
          <Select value={String(zoom)} onChange={(e)=>setZoom(parseFloat(e.target.value))}>
            <option value="0.5">50%</option>
            <option value="0.75">75%</option>
            <option value="1">100%</option>
            <option value="1.25">125%</option>
            <option value="1.5">150%</option>
            <option value="2">200%</option>
          </Select>
          <Button onClick={()=>setResetSignal(s=>s+1)}>复位</Button>
        </ToolbarGroup>
      </Toolbar>
    </div>
  )
}
