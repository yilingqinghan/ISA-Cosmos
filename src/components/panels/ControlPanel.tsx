
import React, { useContext, useState } from 'react'
import { AppCtx } from '../../context'
import { Button } from '../../ui/Button'
import { Select } from '../../ui/Select'

export default function ControlPanel(){
  const { sel, setSel, load } = useContext(AppCtx)
  const [busy,setBusy] = useState(false)
  async function onRun(){ setBusy(true); try{ await load(sel) } finally{ setBusy(false) } }
  return (
    <>
      <header style={{padding:'8px 12px', fontWeight:700}}>Controls</header>
      <div className='panel__body' style={{padding:12, display:'flex', flexDirection:'column', gap:10, overflow:'auto'}}>
        <div><div className='label-muted' style={{marginBottom:4}}>Architecture</div>
          <Select value={sel.arch} onChange={e=>setSel(s=>({...s, arch:e.target.value as any}))}>
            <option value='rvv'>RISC-V Vector (RVV)</option>
          </Select></div>
        <div><div className='label-muted' style={{marginBottom:4}}>Instruction</div>
          <Select value={sel.opcode} onChange={e=>setSel(s=>({...s, opcode:e.target.value as any}))}>
            <option value='vadd'>vadd</option><option value='vsub'>vsub</option>
          </Select></div>
        <div><div className='label-muted' style={{marginBottom:4}}>Form</div>
          <Select value={sel.form} onChange={e=>setSel(s=>({...s, form:e.target.value as any}))}>
            <option value='vv'>vv</option>
          </Select></div>
        <div style={{display:'flex', gap:8}}><Button onClick={onRun}>{busy?'加载中...':'Run ▶'}</Button></div>
        <p className='label-muted'>
          Run 后优先调用 <code>/api/dsl?arch=...&opcode=...&form=...</code>，失败回退到 <code>src/dsl/&lt;arch&gt;/&lt;opcode&gt;.&lt;form&gt;.dsl</code>。
        </p>
      </div>
    </>
  )
}
