import { useRef } from 'react'

export function EditorPanel({ code, setCode, onRun }:{ code:string; setCode:(v:string)=>void; onRun:()=>void }) {
  const ref = useRef<HTMLTextAreaElement | null>(null)

  return (
    <div style={{display:'grid', gridTemplateRows:'36px 1fr', height:'100%'}}>
      <div style={{display:'flex', alignItems:'center', gap:8, padding:'8px 10px', borderBottom:'1px solid var(--border)'}}>
        <div style={{fontWeight:600}}>Instruction</div>
        <div style={{marginLeft:'auto', display:'flex', gap:8}}>
          <button className="btn" onClick={onRun}>Visualize ▶</button>
        </div>
      </div>
      <textarea
        ref={ref}
        value={code}
        onChange={(e)=>setCode(e.target.value)}
        spellCheck={false}
        style={{
          width:'100%', height:'100%', resize:'none', outline:'none', border:'0',
          background:'var(--panel)', color:'var(--text)', padding:12, fontFamily:'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
          fontSize:14, lineHeight:1.6
        }}
        placeholder='Example: vadd.vv v0, v1, v2'
      />
    </div>
  )
}
