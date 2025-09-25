import { useState } from 'react'
import { Toolbar, ToolbarGroup } from '@ui/Toolbar'
import { Button } from '@ui/Button'
import { Select } from '@ui/Select'
import { VaddRVVKitHost } from '@/visualizers/rvv/vadd_kit'   // ★ 新增导入

export default function CanvasKitPanel() {
  const [zoom, setZoom] = useState(1)
  const [reset, setReset] = useState(0)

  // 可从你的“中间控件面板”读取 vlen/sew，这里先给默认值
  const vlen = 128, sew = 16

  return (
    <div className="canvas-root">
      <VaddRVVKitHost zoom={zoom} resetSignal={reset} vlen={vlen} sew={sew} vd="v0" vs1="v1" vs2="v2" />
      <div className="canvas-toolbar">
        <ToolbarGroup>
          <span className="label-muted">倍率</span>
          <Select value={String(zoom)} onChange={(e)=>setZoom(parseFloat(e.target.value))} className="select">
            <option value="0.5">50%</option><option value="0.75">75%</option>
            <option value="1">100%</option><option value="1.25">125%</option>
            <option value="1.5">150%</option><option value="2">200%</option>
          </Select>
          <Button onClick={()=>setReset(s=>s+1)} className="btn">复位</Button>
        </ToolbarGroup>
      </div>
    </div>
  )
}
