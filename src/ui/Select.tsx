import { SelectHTMLAttributes } from 'react'

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  const { style, ...rest } = props
  return (
    <select
      {...rest}
      style={{
        background:'var(--panel)',
        color:'var(--text)',
        border:'1px solid var(--border)',
        borderRadius:8,
        padding:'4px 8px',
        ...style,
      }}
    />
  )
}
