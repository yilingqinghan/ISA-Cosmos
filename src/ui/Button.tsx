
import React from 'react'
export const Button:React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>>=({className='',...p})=>(
  <button {...p} className={'btn '+className}>{p.children}</button>
)
