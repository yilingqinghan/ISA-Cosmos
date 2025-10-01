import React, { useEffect, useState } from 'react'
// 使用 Vite 的 BASE_URL（类型在某些项目中未声明，做一次容错）
const BASE = ((import.meta as any)?.env?.BASE_URL ?? '/') as string
const ICON_SRC = `https://yilingqinghan.github.io/ISA-Cosmos/favicon.png`
import { useApp } from '../../context'

export function LeftNotch({ inline = false }: { inline?: boolean }) {
  const base: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '6px 12px',
    border: '1px solid #e2e8f0',
    borderTop: 'none',
    borderRadius: '0 0 14px 14px',
    background: 'rgba(230,238,255,0.9)',
    backdropFilter: 'saturate(180%) blur(8px)',
    WebkitBackdropFilter: 'saturate(180%) blur(8px)',
    boxShadow: '0 8px 16px rgba(0,0,0,0.06)'
  }
  const floating: React.CSSProperties = { position: 'absolute', top: 0, left: 0, zIndex: 2, minWidth: '36%', justifyContent: 'flex-start', pointerEvents: 'auto' }
  const inlineStyle: React.CSSProperties = { position: 'static', minWidth: 'auto', justifyContent: 'flex-start', marginBottom: 8, pointerEvents: 'auto' }

  return (
    <div className="notch-left" style={{ ...(base as any), ...(inline ? inlineStyle : floating) }}>
      <a className="brand" href={BASE} title="回到首页" style={{display:'flex', alignItems:'center', gap:'10px', textDecoration:'none'}}>
        <img
          className="logo"
          src={ICON_SRC}
          alt="ISA Cosmos"
          style={{ display: 'block', width: '40px', height: '40px', borderRadius: '50%', background: 'white', padding: '4px', boxSizing: 'border-box' }}
        />
        <div className="brand-text" style={{display:'flex', flexDirection:'column', lineHeight:1}}>
          <div className="brand-title">ISA Cosmos</div>
          <div className="brand-sub">RISC-V · ARM · LoongArch</div>
        </div>
        <div
          className="brand-slogan"
          style={{
            fontFamily: "'Brush Script MT', 'Pacifico', 'Segoe Script', 'Comic Sans MS', cursive",
            fontSize: 16,
            lineHeight: 1,
            marginLeft: 6,
            opacity: 0.9,
            whiteSpace: 'nowrap',
            userSelect: 'none',
            letterSpacing: 0.2,
            display: 'flex',
            alignItems: 'center',
            height: '100%'
          }}
          title="Slogan"
        >
          ISA, easy to learn!
        </div>
      </a>
    </div>
  )
}

export function RightNotch({ inline = false }: { inline?: boolean }) {
  const { arch, setArch } = useApp()

  const [archOptions, setArchOptions] = useState<string[]>([])

  // Discover available architectures from the instruction registry
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const reg: any = await import('../../instructions/registry').catch(() => null)
        const instructionRegistry = reg?.instructionRegistry || {}
        const allKeys = Object.keys(instructionRegistry)
        const archKeyOf = (k: string) => {
          const i = k.lastIndexOf('/')
          return i > 0 ? k.slice(0, i) : k
        }
        const normalize = (a: string) => {
          if (a === 'rvv' || a.startsWith('riscv')) return 'riscv'
          if (a.startsWith('arm')) return 'arm'
          return a
        }
        const raw = Array.from(new Set(allKeys.map(archKeyOf)))
        const options = Array.from(new Set(raw.map(normalize)))
        // 只保留 RISC-V
        const filtered = options.includes('riscv') ? ['riscv'] : ['riscv']
        if (!cancelled) {
          setArchOptions(filtered)
          if (arch !== 'riscv') setArch('riscv')
        }
      } catch {
        if (!cancelled) setArchOptions(['riscv'])
      }
    })()
    return () => { cancelled = true }
  }, [])

  const humanizeArch = (a: string) => {
    if (a === 'riscv') return 'RISC-V'
    return a.toUpperCase()
  }

  const base: React.CSSProperties = {
    display:'flex', alignItems:'center', gap:'12px',
    padding:'6px 12px',
    border:'1px solid #e2e8f0', borderTop:'none',
    borderRadius:'0 0 14px 14px',
    background:'rgba(230,238,255,0.9)',
    backdropFilter:'saturate(180%) blur(8px)',
    WebkitBackdropFilter:'saturate(180%) blur(8px)',
    boxShadow:'0 8px 16px rgba(0,0,0,0.06)'
  }
  const floating: React.CSSProperties = {
    position:'absolute', top:0, right:0, zIndex:2,
    minWidth:'660px', width:'fit-content', justifyContent:'flex-end', pointerEvents:'auto'
  }
  const inlineStyle: React.CSSProperties = {
    position:'static', minWidth:'auto', justifyContent:'flex-end',
    marginBottom:8, pointerEvents:'auto'
  }

  return (
    <div className="notch-right" style={{ ...base, ...(inline ? inlineStyle : floating) }}>
      <div className="nav-controls" style={{display:'flex', alignItems:'center', gap:10}}>
        <label className="label">Architecture</label>
        <select className="select" value={arch} onChange={e=>setArch(e.target.value)}>
          {archOptions.map(opt => (
            <option key={opt} value={opt}>{humanizeArch(opt)}</option>
          ))}
        </select>

        <a className="nav-link" href="#" onClick={(e)=>e.preventDefault()} title="文档（即将上线）">Docs</a>
        <a className="nav-link" href="https://github.com/yilingqinghan/isa-cosmos" target="_blank" rel="noreferrer" title="在 GitHub 查看项目">GitHub</a>
        <button className="btn nav-cta" title="运行（Cmd/Ctrl + Enter）" onClick={()=>window.dispatchEvent(new CustomEvent('app/run'))}>运行 ⌘⏎</button>
      </div>
    </div>
  )
}