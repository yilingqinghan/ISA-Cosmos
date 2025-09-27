import React, { useRef, useState, useEffect, useMemo } from 'react'
import { useApp } from '../../context'
import Editor, { OnMount } from '@monaco-editor/react'
import { parseAsm, type ParseError } from '../../lang'
import { getUsage, getInstrs } from '../../lang/registry'
import { usageOf } from '../../lang/help'
import { astToDsl } from '../../lang/toDSL'

export default function LeftPanel() {
  const { arch, logs, pushLog, setDslOverride } = useApp()
  const [code, setCode] = useState(`vadd.vv v0, v1, v2
vmul.vv v3, v4, v5
vsetvli.ri x1, x10, e32m2
`)
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor|null>(null)
  const monacoRef = useRef<typeof monaco|null>(null)
  const widgets = useRef<monaco.editor.IContentWidget[]>([])
  const decoIds = useRef<string[]>([])
  const runFocusDecoIds = useRef<string[]>([])

  const [doc, setDoc] = useState<{ usage?: string; scenarios?: string[]; notes?: string[]; exceptions?: string[] }>({})

  const count = (arr?: string[]) => arr?.length ?? 0

  const pillStyle: React.CSSProperties = {
    fontSize:11,
    padding:'1px 6px',
    borderRadius:999,
    background:'#0f172a0d',
    border:'1px solid #cbd5e1'
  }

  // 生成演示代码：opcode.form + 占位操作数（根据 operands 类型/role）
  function buildSample(op: string, form: string, operands?: {kind:string; role?:string}[]) {
    const picks: Record<string, string> = { vd:'v0', vs1:'v1', vs2:'v2' }
    const seq = { v:3, x:0, f:0 }
    const parts: string[] = []
    for (const o of (operands ?? [])) {
      if (o.kind === 'vreg') {
        const byRole = o.role ? picks[o.role] : undefined
        if (byRole) { parts.push(byRole) }
        else { parts.push(`v${seq.v++}`) }
      } else if (o.kind === 'xreg') {
        parts.push(`x${seq.x++}`)
      } else if (o.kind === 'freg') {
        parts.push(`f${seq.f++}`)
      } else if (o.kind === 'imm') {
        parts.push(`0`)
      } else {
        parts.push(o.role || o.kind)
      }
    }
    const args = parts.join(', ')
    return `${op}.${form}${args ? ' ' + args : ''}`
  }

  // 当前所有架构的指令目录（按需可扩展到从后端/注册表获取架构列表）
  const ARCHES = useMemo(() => ['rvv'], [])
  const catalog = useMemo(() => {
    return ARCHES.map(archName => {
      const specs = getInstrs(archName) || []
      const items = specs.flatMap(sp => {
        return Object.entries(sp.forms || {}).map(([form, fs]: any) => ({
          arch: archName,
          opcode: sp.opcode,
          form,
          sample: buildSample(sp.opcode, form, fs?.operands),
        }))
      })
      return { arch: archName, items }
    })
  }, [ARCHES])

  const clearDiagnostics = ()=>{
    const ed = editorRef.current, m = monacoRef.current
    if (!ed || !m) return
    const model = ed.getModel()
    if (model) m.editor.setModelMarkers(model, 'isa', [])
    widgets.current.forEach(w=>ed.removeContentWidget(w))
    widgets.current = []
    if (decoIds.current.length) { ed.deltaDecorations(decoIds.current, []); decoIds.current=[] }
    if (runFocusDecoIds.current.length) { ed.deltaDecorations(runFocusDecoIds.current, []); runFocusDecoIds.current = [] }
  }

  const showDiagnostics = (errs: ParseError[])=>{
    const ed = editorRef.current, m = monacoRef.current
    if (!ed || !m) return
    const model = ed.getModel(); if (!model) return

    // 1) markers（hover 会显示）
    m.editor.setModelMarkers(model, 'isa', errs.map(e=>({
      startLineNumber:e.line, startColumn:e.col,
      endLineNumber:e.line, endColumn:e.col+1,
      severity:m.MarkerSeverity.Error, message:e.message
    })))

    // 2) 行首 glyph 红点 + 3) 行尾气泡
    const decos: monaco.editor.IModelDeltaDecoration[] = []
    errs.forEach((e,idx)=>{
      decos.push({ range: new m.Range(e.line,1,e.line,1), options:{ isWholeLine:true, glyphMarginClassName:'err-glyph' } })
      const id = `err-${Date.now()}-${idx}`
      const node = document.createElement('div')
      node.className = 'err-bubble'
      node.textContent = e.message
      const w: monaco.editor.IContentWidget = {
        getId: ()=>id,
        getDomNode: ()=>node,
        getPosition: ()=>({
          position: { lineNumber:e.line, column:model.getLineMaxColumn(e.line) },
          preference: [m.editor.ContentWidgetPositionPreference.EXACT]
        })
      }
      ed.addContentWidget(w)
      widgets.current.push(w)
    })
    decoIds.current = ed.deltaDecorations(decoIds.current, decos)
  }

  // 找到从某行之后的下一条“有效指令行”（跳过空行和注释）
  function nextMeaningfulLine(startLine: number) {
    const ed = editorRef.current
    const model = ed?.getModel()
    if (!model) return startLine
    const total = model.getLineCount()
    for (let l = startLine + 1; l <= total; l++) {
      const t = model.getLineContent(l).trim()
      if (t && !/^(\/\/|#|;)/.test(t)) return l
    }
    return Math.min(total, startLine + 1)
  }
  // 选中并“高亮”某一整行（用选择区+可选行装饰）
  function highlightLine(line: number) {
    const ed = editorRef.current, m = monacoRef.current
    const model = ed?.getModel()
    if (!ed || !m || !model) return
    const maxCol = model.getLineMaxColumn(line)
    ed.setSelection(new m.Selection(line, 1, line, maxCol))
    ed.revealLineInCenter(line)
    runFocusDecoIds.current = ed.deltaDecorations(runFocusDecoIds.current, [
      { range: new m.Range(line, 1, line, 1), options: { isWholeLine: true, className: 'run-focus-line' } }
    ])
  }

  const onMount:OnMount = (ed, m)=>{
    pushLog('Editor ready ✔')
    editorRef.current = ed; monacoRef.current = m
    ed.updateOptions({ glyphMargin:true, lineDecorationsWidth:14, padding:{top:6,bottom:6} })
  }

  const handleRun = ()=>{
    clearDiagnostics()
    const ed = editorRef.current, m = monacoRef.current
    const model = ed?.getModel()
    if (!ed || !m || !model) return
    const pos = ed.getPosition() || { lineNumber: 1, column: 1 }
    const lineNo = pos.lineNumber
    const raw = model.getLineContent(lineNo)
    const lineText = raw.trim()
  
    // 空行/注释：不解析，直接跳到下一条有效指令
    if (!lineText || /^(\/\/|#|;)/.test(lineText)) {
      const next = nextMeaningfulLine(lineNo)
      highlightLine(next)
      pushLog('↷ 跳过空行/注释，已定位到下一行')
      setDslOverride(null)
      return
    }
  
    const { ast, errors } = parseAsm(arch, lineText)
    if (errors.length) {
      const mapped = errors.map(e => ({ ...e, line: lineNo + (e.line - 1) }))
      showDiagnostics(mapped)
      setDslOverride(null)
      pushLog(`❌ 第 ${lineNo}:${errors[0].col} 行：${errors[0].message}`)
      highlightLine(lineNo)
      return
    }
  
    // 仅播放当前行
    const dsl = astToDsl(ast!)
    setDslOverride({ text: dsl, rev: Date.now() })
    pushLog(`✅ 已解析：${ast!.opcode}.${ast!.form} ${ast!.operands.join(', ')}`)
  
    // 用法/说明（延续原单条逻辑）
    let info: any = null
    try {
      info = (usageOf as any)(ast!) ?? (usageOf as any)(ast!.arch, ast!.opcode, ast!.form)
    } catch {}
    const usageText = getUsage(ast!) || info?.usage || info?.desc || ''
    setDoc({
      usage: usageText,
      scenarios: info?.scenarios || info?.scenario || [],
      notes: info?.notes || info?.notice || info?.attentions || [],
      exceptions: info?.exceptions || info?.exception || [],
    })
    const u = getUsage(ast!)
    if (u) pushLog(`ℹ️ 用法：${u}`)
  
    // 自动跳到下一条有效指令并高亮
    const next = nextMeaningfulLine(lineNo)
    highlightLine(next)
  }

  // 顶部导航的 Run 也可以触发
  useEffect(()=>{
    const h = ()=>handleRun()
    window.addEventListener('app/run', h)
    return ()=>window.removeEventListener('app/run', h)
  },[])

  return (
    <div className="left-root" style={{display:'grid', gridTemplateColumns:'minmax(0,1fr) 120px', gap:8, height:'100%'}}>
      {/* 主列：编辑器 + Usage + Logs */}
      <div className="left-main" style={{flex:1, minWidth:0, display:'flex', flexDirection:'column', gap:8}}>
        {/* 上：编辑器 */}
        <div className="left-top nice-card" style={{height:'40%'}}>
          <div className="panel-toolbar">
            <div className="panel-title">Editor</div>
            <div className="grow" />
            <button className="btn" onClick={handleRun}>Run</button>
          </div>
          <div className="editor-wrap">
            <Editor height="100%" defaultLanguage="asm" value={code}
                    onChange={v=>setCode(v??'')} onMount={onMount}
                    options={{ minimap:{enabled:false}, automaticLayout:true, fontSize:13,
                      fontFamily:`'Fira Code','JetBrains Mono',monospace`, theme:'vs-light' }} />
          </div>
        </div>

        <div className="left-mid nice-card" style={{height:'40%', minHeight: 160}}>
          <div className="panel-toolbar">
            <div className="panel-title">Usage</div>
            <div className="grow" />
          </div>
          <div className="usage-wrap" style={{padding:'8px 10px', overflow:'auto', height:'calc(100% - 40px)'}}>
            <div className="usage-all" style={{display:'grid', gridTemplateColumns:'1.2fr 1fr 1fr', gap:10}}>
              <div style={{gridColumn:'1 / -1', padding:8, border:'1px solid #e2e8f0', borderRadius:8, background:'#f8fafc'}}>
                <div style={{fontSize:12, fontWeight:600, color:'#0f172a', marginBottom:6}}>说明</div>
                {doc.usage ? <p style={{lineHeight:1.6, margin:0}}>{doc.usage}</p> : <p className="muted" style={{margin:0}}>无</p>}
              </div>
              <div style={{padding:8, border:'1px solid #e2e8f0', borderRadius:8}}>
                <div style={{display:'flex', alignItems:'center', gap:8, marginBottom:6}}>
                  <div style={{fontSize:12, fontWeight:600, color:'#0f172a'}}>场景</div>
                  <span style={pillStyle}>{count(doc.scenarios)}</span>
                </div>
                <FancyList items={doc.scenarios} icon="💡" empty="暂无典型场景" />
              </div>
              <div style={{padding:8, border:'1px solid #e2e8f0', borderRadius:8}}>
                <div style={{display:'flex', alignItems:'center', gap:8, marginBottom:6}}>
                  <div style={{fontSize:12, fontWeight:600, color:'#0f172a'}}>注意</div>
                  <span style={pillStyle}>{count(doc.notes)}</span>
                </div>
                <FancyList items={doc.notes} icon="⚠️" empty="暂无注意事项" tone="warn" />
              </div>
              <div style={{padding:8, border:'1px solid #e2e8f0', borderRadius:8}}>
                <div style={{display:'flex', alignItems:'center', gap:8, marginBottom:6}}>
                  <div style={{fontSize:12, fontWeight:600, color:'#0f172a'}}>异常</div>
                  <span style={pillStyle}>{count(doc.exceptions)}</span>
                </div>
                <FancyList items={doc.exceptions} icon="⛔" empty="暂无已知异常" tone="danger" />
              </div>
            </div>
          </div>
        </div>

        {/* 下：日志/提示 */}
        <div className="left-bottom nice-card" style={{height:'20%', minHeight: 120}}>
          <div className="panel-toolbar">
            <div className="panel-title">Logs</div>
            <div className="grow" />
            <button className="btn" onClick={()=>window.localStorage.DEBUG_DSL='1'}>Enable DSL Debug</button>
          </div>
          <div className="log-wrap">
            {logs.length === 0 ? (
              <div className="log-empty">暂无日志。运行后会在此显示解析步骤 / 提示。</div>
            ) : (
              <ul className="log-list">
                {logs.map((l, i)=>(
                  <li key={i}><span className="dot" />{l}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* 右侧：指令目录（可独立滚动） */}
      <aside className="left-catalog nice-card" style={{display:'flex', flexDirection:'column', overflow:'hidden'}}>
        <div className="panel-toolbar">
          <div className="panel-title">指令目录</div>
          <div className="grow" />
        </div>
        <div className="catalog-scroll" style={{overflow:'auto', padding:'6px 8px', height:'calc(100% - 40px)'}}>
          {catalog.map(group => (
            <div key={group.arch} style={{marginBottom:12}}>
              <div style={{fontSize:12, fontWeight:700, color:'#0f172a', margin:'6px 0'}}>{group.arch.toUpperCase()}</div>
              <ul style={{listStyle:'none', padding:0, margin:0}}>
                {group.items.map(it => (
                  <li key={`${it.arch}:${it.opcode}.${it.form}`} style={{display:'flex', alignItems:'center', gap:8, padding:'4px 4px', borderRadius:6, cursor:'pointer', fontSize:12}}
                      onClick={()=>setCode(it.sample)}
                  >
                    <span style={{fontFamily:'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace', fontSize:12}}>
                      {it.opcode}.{it.form}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </aside>
    </div>
  )
}

function Section({title, children}:{title:string; children:React.ReactNode}){
  return (
    <div style={{marginBottom:10}}>
      <div style={{fontSize:12, fontWeight:600, color:'#0f172a', margin:'6px 0'}}>{title}</div>
      {children}
    </div>
  )
}
function List({items}:{items?:string[]}) {
  if (!items || items.length===0) return <p className="muted">无</p>
  return <ul style={{paddingLeft:18, margin:'4px 0'}}>{items.map((s,i)=><li key={i}>{s}</li>)}</ul>
}

function FancyList({items, icon, empty, tone}:{items?:string[]; icon:string; empty?:string; tone?:'base'|'warn'|'danger'}) {
  const bg = tone==='warn' ? 'rgba(245, 158, 11, 0.10)' : tone==='danger' ? 'rgba(239, 68, 68, 0.10)' : 'rgba(59, 130, 246, 0.08)'
  const border = tone==='warn' ? 'rgba(245, 158, 11, 0.35)' : tone==='danger' ? 'rgba(239, 68, 68, 0.35)' : 'rgba(59, 130, 246, 0.35)'
  if (!items || items.length===0) return <p className="muted">{empty || '无'}</p>
  return (
    <ul style={{listStyle:'none', padding:0, margin:0, display:'grid', gap:8}}>
      {items.map((s,i)=>(
        <li key={i} style={{display:'flex', gap:8, padding:'8px 10px', borderRadius:8, background:bg, border:`1px solid ${border}`}}>
          <span style={{flex:'0 0 auto'}}>{icon}</span>
          <div style={{lineHeight:1.55}}>{s}</div>
        </li>
      ))}
    </ul>
  )
}
