import { useState } from 'react'
import { classNames } from '@utils/classNames'
import { EditorPanel } from '@components/panels/EditorPanel'
import { ControlPanel } from '@components/panels/ControlPanel'
import { CanvasPanel } from '@components/panels/CanvasPanel'
import CanvasKitPanel from '@components/panels/CanvasKitPanel'
import { SplitLayout } from '@components/layout/SplitLayout'
import { parseInstruction } from '@utils/parse'
import { getArchitectures } from '@arch/index'
import { BuiltScene } from '@core/instructions/types'

export default function App() {
  const [asm, setAsm] = useState('vadd.vv v0, v1, v2')
  const [archId, setArchId] = useState('rvv')
  const [built, setBuilt] = useState<BuiltScene | null>(null)
  const [message, setMessage] = useState<string>('')

  const archs = getArchitectures()
  const selectedArch = archs.find(a => a.id === archId)!

  const onVisualize = (code: string) => {
    setMessage('')
    const parsed = (selectedArch.parse?.(code)) ?? parseInstruction(code, archId)
    if (!parsed) {
      setMessage('Could not parse instruction. Try e.g., "vadd.vv v0, v1, v2"')
      setBuilt(null)
      return
    }
    const vis = selectedArch.instructions.find(v => v.matches(parsed.mnemonic))
    if (!vis) {
      setMessage(`No visualizer for mnemonic "${parsed.mnemonic}" in ${selectedArch.name}`)
      setBuilt(null)
      return
    }
    const defaults = selectedArch.defaultOptions ?? {}
    const builtScene = vis.buildScene(parsed, defaults)
    setBuilt(builtScene)
  }

  return (
    <div className="app-root" style={{display:'grid', gridTemplateRows:'56px 1fr'}}>
      <TopBar />
      <SplitLayout
        columns={[28, 22, 50]}
        minPx={[260, 240, 300]}
      >
        <div className="panel panel--left">
          <EditorPanel
            code={asm}
            setCode={setAsm}
            onRun={() => onVisualize(asm)}
          />
        </div>

        <div className="panel panel--mid">
          <ControlPanel
            archId={archId}
            setArchId={setArchId}
            archs={archs}
            onVisualize={() => onVisualize(asm)}
          />
          {message && <div className="notice">{message}</div>}
        </div>

        <div className="panel panel--right">
        <CanvasKitPanel/>
        </div>
      </SplitLayout>
    </div>
  )
}

function TopBar() {
  return (
    <div style={{
      display:'flex', alignItems:'center', gap:16, padding:'0 16px', borderBottom:'1px solid var(--border)',
      background:'linear-gradient(180deg, #0e1621, #0d141c)'
    }}>
      <div style={{fontWeight:700, letterSpacing:0.3}}>Instruction Set Visualizer</div>
      <span style={{fontSize:13, color:'var(--muted)'}}>Canvas • React • TypeScript</span>
      <div style={{marginLeft:'auto', display:'flex', gap:12}}>
        <a target="_blank" href="https://rvv.org" rel="noreferrer">Docs</a>
        <a target="_blank" href="https://github.com" rel="noreferrer">GitHub</a>
      </div>
    </div>
  )
}
