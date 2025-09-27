import React from 'react'
import { useApp } from '../../context'

export default function NavBar() {
  const { arch, setArch, opcode, setOpcode, form, setForm } = useApp()

  return (
    <header className="app-header">
      <div className="container header-inner">
        <div className="brand">
          <div className="logo" />
          <div className="brand-text">
            <div className="brand-title">ISA Cosmos♡</div>
            <div className="brand-sub">RISC-V · ARM · Loongarch</div>
          </div>
        </div>

        {/* 顶部选择区 */}
        <div className="nav-controls">
          <label className="label">Architecture</label>
          <select className="select" value={arch} onChange={e=>setArch(e.target.value)}>
            <option value="rvv">RISC-V Vector (RVV)</option>
            {/* 预留：Arm SVE、x86-AVX512… */}
          </select>

          <label className="label">Instruction</label>
          <select className="select" value={opcode} onChange={e=>setOpcode(e.target.value)}>
            <option value="vadd">vadd</option>
            <option value="vsub">vsub</option>
            {/* 预留更多 */}
          </select>

          <label className="label">Form</label>
          <select className="select" value={form} onChange={e=>setForm(e.target.value)}>
            <option value="vv">vv</option>
            <option value="vx">vx</option>
            {/* 预留更多 */}
          </select>

          <a className="nav-link" href="#" onClick={(e)=>e.preventDefault()}>Docs</a>
          <a className="nav-link" href="https://github.com" target="_blank" rel="noreferrer">GitHub</a>
          <button className="btn nav-cta" onClick={()=>window.dispatchEvent(new CustomEvent('app/run'))}>运行</button>
        </div>
      </div>
    </header>
  )
}
