
import React from 'react'
export default function EditorPanel(){
  return (
    <div className="panel panel--left">
      <header style={{padding:'8px 12px', fontWeight:700}}>Instruction</header>
      <div className="panel__body" style={{padding:'12px'}}>
        <p className="label-muted">从中间面板选择架构和指令，然后点击 <b>Run</b>。</p>
        <p className="label-muted">DSL 在后端生成；前端仅负责渲染与播放控制。</p>
      </div>
    </div>
  )
}
