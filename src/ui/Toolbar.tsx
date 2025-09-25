import React from 'react'
export const Toolbar:React.FC<React.HTMLAttributes<HTMLDivElement>>=({children,...p})=>(<div {...p} style={{position:'absolute',top:8,right:8}}>{children}</div>)
export const ToolbarGroup:React.FC<React.HTMLAttributes<HTMLDivElement>>=({children,...p})=>(<div {...p} style={{display:'flex',gap:8,alignItems:'center',background:'rgba(255,255,255,.85)',border:'1px solid #e2e8f0',borderRadius:10,padding:'6px 8px'}}>{children}</div>)
