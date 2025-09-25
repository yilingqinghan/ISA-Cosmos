import { ReactNode } from 'react'

export function Toolbar({ children }:{ children: ReactNode }) {
  return (
    <div
      className="canvas-toolbar"
      style={{
        position:'absolute',
        top:8, right:8,
        display:'flex', gap:8, alignItems:'center',
        background:'rgba(255,255,255,0.85)',
        backdropFilter:'blur(6px)',
        border:'1px solid var(--border)',
        borderRadius:10, padding:'6px 8px',
        zIndex: 5
      }}
    >
      {children}
    </div>
  )
}

export function ToolbarGroup({ children }:{ children: ReactNode }) {
  return <div style={{display:'flex', gap:8, alignItems:'center'}}>{children}</div>
}
