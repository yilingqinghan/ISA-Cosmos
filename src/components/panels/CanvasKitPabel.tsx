import { useState } from 'react'
import { KitStage } from '../../canvas-kit/KitStage'
import { FactorialScanDemo } from '../../demos/factorial-scan-demo'
import { Toolbar, ToolbarGroup } from '@ui/Toolbar'
import { Button } from '@ui/Button'
import { Select } from '@ui/Select'
import { useTimeline } from '../../canvas-kit/animation/useTimeline' // 仅为类型演示（若要外部控制）

export default function CanvasKitPanel() {
  const [zoom, setZoom] = useState(1)     // 0.5/0.75/1/1.25/1.5/2
  const [reset, setReset] = useState(0)
  // 你的全局播放控制也可以放这里；本示例动画内部用 useTimeline 自动播放

  return (
    <div className="canvas-root">
      <KitStage contentSize={{ width: 1200, height: 900 }} zoom={zoom} onResetSignal={reset}>
        <FactorialScanDemo />
      </KitStage>

      <div className="canvas-toolbar">
        <ToolbarGroup>
          <span className="label-muted">倍率</span>
          <Select value={String(zoom)} onChange={(e)=>setZoom(parseFloat(e.target.value))} className="select">
            <option value="0.5">50%</option>
            <option value="0.75">75%</option>
            <option value="1">100%</option>
            <option value="1.25">125%</option>
            <option value="1.5">150%</option>
            <option value="2">200%</option>
          </Select>
          <Button onClick={()=>setReset(s=>s+1)} className="btn">复位</Button>
        </ToolbarGroup>
      </div>
    </div>
  )
}
