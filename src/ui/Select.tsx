
import React from 'react'
export const Select:React.FC<React.SelectHTMLAttributes<HTMLSelectElement>>=({className='',...p})=>(
  <select {...p} className={'select '+className}>{p.children}</select>
)
