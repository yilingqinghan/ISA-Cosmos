import React from 'react'
const ICON_SRC = '/favicon.png' // 放在 public 根目录，亦可替换为 '/favicon.png'
import { useApp } from '../../context'

export default function NavBar() {
  const { arch, setArch, opcode, setOpcode, form, setForm } = useApp()

  return (
    <header className="app-header" style={{position:'sticky', top:0, zIndex:30, backdropFilter:'saturate(180%) blur(8px)', WebkitBackdropFilter:'saturate(180%) blur(8px)', background:'rgba(255,255,255,0.7)', borderBottom:'1px solid #e2e8f0', boxShadow: '0 2px 6px rgba(0,0,0,0.08)', backgroundImage: 'linear-gradient(to bottom, rgba(255,255,255,0.9), rgba(255,255,255,0.7))'}}>
      <div className="container header-inner">
        <a className="brand" href="/" title="回到首页">
          <img
            className="logo"
            src={ICON_SRC}
            alt="ISA Cosmos"
            style={{
              display: 'block',
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: 'white',
              padding: '4px',
              boxSizing: 'border-box'
            }}
          />
          <div className="brand-text">
            <div className="brand-title">ISA Cosmos</div>
            <div className="brand-sub">RISC-V · ARM · LoongArch</div>
          </div>
        </a>

        {/* 顶部选择区 */}
        <div className="nav-controls">
          <label className="label">Architecture</label>
          <select className="select" value={arch} onChange={e=>setArch(e.target.value)}>
            <option value="rvv">RISC-V Vector (RVV)</option>
            {/* 预留：Arm SVE、x86-AVX512… */}
          </select>

          <a className="nav-link" href="#" onClick={(e)=>e.preventDefault()} aria-label="文档（即将上线）" title="文档（即将上线）">Docs</a>
          <a className="nav-link" href="https://github.com/yilingqinghan/isa-cosmos" target="_blank" rel="noreferrer" aria-label="在 GitHub 查看项目" title="在 GitHub 查看项目">GitHub</a>
          <button className="btn nav-cta" title="运行（Cmd/Ctrl + Enter）" onClick={()=>window.dispatchEvent(new CustomEvent('app/run'))}>运行 ⌘⏎</button>
        </div>
      </div>
    </header>
  )
}
