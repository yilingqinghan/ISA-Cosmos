import React from 'react'
const ICON_SRC = '/favicon.png' // 放在 public 根目录，亦可替换为 '/favicon.png'
import { useApp } from '../../context'

export default function NavBar() {
  const { arch, setArch, opcode, setOpcode, form, setForm } = useApp()

  return (
    <header className="app-header" style={{position:'sticky', top:0, zIndex:30, backdropFilter:'saturate(180%) blur(8px)', WebkitBackdropFilter:'saturate(180%) blur(8px)', background:'rgba(255,255,255,0.7)', borderBottom:'1px solid #e2e8f0'}}>
      <div
        className="header-inner"
        style={{
          display: 'flex',
          alignItems: 'stretch',
          justifyContent: 'space-between',
          padding: 0,           // 让两侧贴边
          margin: 0,
          width: '100%'
        }}
      >
        {/* 左侧刘海（仅放网站图标与标题） */}
        <div
          className="notch-left"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '6px 12px',
            border: '1px solid #e2e8f0',
            borderTop: 'none',
            borderRadius: '0 0 14px 14px', // 底部圆角，顶部与窗口齐平
            background: 'rgba(255,255,255,0.9)',
            backdropFilter: 'saturate(180%) blur(8px)',
            WebkitBackdropFilter: 'saturate(180%) blur(8px)',
            boxShadow: '0 8px 16px rgba(0,0,0,0.06)',
            // 贴左边
            marginLeft: 0,
            minWidth: '36%',
            justifyContent: 'flex-start'
          }}
        >
          <a className="brand" href="/" title="回到首页" style={{display:'flex', alignItems:'center', gap:'10px', textDecoration:'none'}}>
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
            <div className="brand-text" style={{display:'flex', flexDirection:'column', lineHeight:1}}>
              <div className="brand-title">ISA Cosmos</div>
              <div className="brand-sub">RISC-V · ARM · LoongArch</div>
            </div>
          </a>
        </div>

        {/* 右侧刘海（其余控件全部在右边） */}
        <div
          className="notch-right"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '6px 12px',
            border: '1px solid #e2e8f0',
            borderTop: 'none',
            borderRadius: '0 0 14px 14px',
            background: 'rgba(255,255,255,0.9)',
            backdropFilter: 'saturate(180%) blur(8px)',
            WebkitBackdropFilter: 'saturate(180%) blur(8px)',
            boxShadow: '0 8px 16px rgba(0,0,0,0.06)',
            // 贴右边
            marginRight: 0,
            minWidth: '40%',
            justifyContent: 'flex-end'
          }}
        >
          {/* 顶部选择区 */}
          <div className="nav-controls" style={{display:'flex', alignItems:'center', gap:'10px'}}>
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
      </div>
    </header>
  )
}
