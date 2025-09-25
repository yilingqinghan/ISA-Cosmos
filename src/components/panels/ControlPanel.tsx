import { Architecture } from '@core/instructions/types'

export function ControlPanel({ archId, setArchId, archs, onVisualize }:{
  archId: string; setArchId:(v:string)=>void; archs: Architecture[]; onVisualize:()=>void
}){
  return (
    <div style={{display:'grid', gridTemplateRows:'auto 1fr', height:'100%'}}>
      <div style={{padding:'8px 10px', borderBottom:'1px solid var(--border)'}}>
        <div style={{display:'flex', alignItems:'center', gap:8}}>
          <strong>Controls</strong>
          <div style={{marginLeft:'auto'}}>
            <button className="btn" onClick={onVisualize}>Run ▶</button>
          </div>
        </div>
      </div>
      <div style={{padding:12, display:'grid', gap:12}}>
        <label style={{display:'grid', gap:6}}>
          <span style={{fontSize:12, color:'var(--muted)'}}>Architecture</span>
          <select
            value={archId}
            onChange={e => setArchId(e.target.value)}
            style={{
              background:'var(--panel)', color:'var(--text)', border:'1px solid var(--border)',
              borderRadius:8, padding:'8px 10px'
            }}
          >
            {archs.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </label>

        <div style={{fontSize:12, color:'var(--muted)'}}>
          Tip: Try <code>vadd.vv v0, v1, v2</code> then click Run.
        </div>
      </div>
    </div>
  )
}
