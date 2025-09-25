// src/components/layout/AppShell.tsx
import React from 'react'

type AppShellProps = {
  children: React.ReactNode
  title?: string
}

export default function AppShell({ children, title = 'Instruction Set Visualizer' }: AppShellProps) {
  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="container header-inner">
          <div className="brand">
            <div className="logo">ISA</div>
            <div className="brand-text">
              <div className="brand-title">{title}</div>
              <div className="brand-sub">Canvas · React · TypeScript</div>
            </div>
          </div>

          <nav className="nav">
            <a className="nav-item" href="#" onClick={(e)=>e.preventDefault()}>Tutorial</a>
            <a className="nav-item" href="#" onClick={(e)=>e.preventDefault()}>Board</a>
            <a className="nav-item" href="#" onClick={(e)=>e.preventDefault()}>Docs</a>
            <a className="nav-item" href="https://github.com/" target="_blank" rel="noreferrer">GitHub</a>
            <button className="btn nav-cta">Start</button>
          </nav>
        </div>
      </header>

      {/* 主体：留出 header 高度，令内容满屏可滚/可拉伸 */}
      <main className="app-main">
        <div className="container page-main">
          {children}
        </div>
      </main>
    </div>
  )
}
