
import React, { useContext, useState } from 'react'
import { AppCtx } from '../../context'
import { Button } from '../../ui/Button'
import { Select } from '../../ui/Select'

export default function ControlPanel(){
  const { sel, setSel, load } = useContext(AppCtx)
  const [busy,setBusy] = useState(false)

  async function onRun(){
    setBusy(true); try{ await load(sel) } finally{ setBusy(false) }
  }

  return (
    <>
      <header style={{padding:'8px 12px', fontWeight:700}}>Controls</header>
      <div className='panel__body' style={{padding:12, display:'flex', flexDirection:'column', gap:10}}>
        <div>
          <div className='label-muted' style={{marginBottom:4}}>Architecture</div>
          <Select value={sel.arch} onChange={e=>setSel(s=>({...s, arch:e.target.value as any}))}>
            <option value='rvv'>RISC-V Vector (RVV)</option>
          </Select>
        </div>
        <div>
          <div className='label-muted' style={{marginBottom:4}}>Instruction</div>
          <Select value={sel.opcode} onChange={e=>setSel(s=>({...s, opcode:e.target.value as any}))}>
            <option value='vadd'>vadd</option>
            <option value='vsub'>vsub</option>
            <option value='vmul'>vmul</option>
          </Select>
        </div>
        <div>
          <div className='label-muted' style={{marginBottom:4}}>Form</div>
          <Select value={sel.form} onChange={e=>setSel(s=>({...s, form:e.target.value as any}))}>
            <option value='vv'>vv</option>
            <option value='vx'>vx</option>
            <option value='vi'>vi</option>
          </Select>
        </div>
        <div style={{display:'flex', gap:8}}>
          <Button onClick={onRun}>{busy?'加载中...':'Run ▶'}</Button>
        </div>
        <p className='label-muted'>说明：点击 Run 后，前端会向 <code>/api/dsl?arch=...&opcode=...&form=...</code> 请求 DSL 文本（后端返回 JSON：{"{text, steps}"}），随后在右侧画布渲染，并按步骤自动播放。可在右上角控制“暂停/继续/上一步/下一步/速度/倍率”。</p>
      </div>
    </>
  )
}
