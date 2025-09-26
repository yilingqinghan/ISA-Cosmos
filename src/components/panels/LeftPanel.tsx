import React, { useRef, useState, useEffect } from 'react'
import { useApp } from '../../context'
import Editor, { OnMount } from '@monaco-editor/react'
import { parseAsm, type ParseError } from '../../lang'
import { astToDsl } from '../../lang/toDsl'

export default function LeftPanel() {
  const { arch, logs, pushLog, setDslOverride } = useApp()
  const [code, setCode] = useState(`vadd.vv v0, v1, v2`)
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor|null>(null)
  const monacoRef = useRef<typeof monaco|null>(null)
  const widgets = useRef<monaco.editor.IContentWidget[]>([])
  const decoIds = useRef<string[]>([])

  const clearDiagnostics = ()=>{
    const ed = editorRef.current, m = monacoRef.current
    if (!ed || !m) return
    const model = ed.getModel()
    if (model) m.editor.setModelMarkers(model, 'isa', [])
    widgets.current.forEach(w=>ed.removeContentWidget(w))
    widgets.current = []
    if (decoIds.current.length) { ed.deltaDecorations(decoIds.current, []); decoIds.current=[] }
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

  const onMount:OnMount = (ed, m)=>{
    pushLog('Editor ready ✔')
    editorRef.current = ed; monacoRef.current = m
    ed.updateOptions({ glyphMargin:true, lineDecorationsWidth:14, padding:{top:6,bottom:6} })
  }

  const handleRun = ()=>{
    clearDiagnostics()
    const { ast, errors } = parseAsm(arch, editorRef.current?.getValue() || '')
    if (errors.length) {
      showDiagnostics(errors)
      setDslOverride(null)
      pushLog(`❌ 语法/语义错误：${errors[0].message}`)
      return
    }
    // 通过：把 AST 转为 DSL，交给右侧画布（rev 避免“同值不更新”）
    const dsl = astToDsl(ast!)
    setDslOverride({ text: dsl, rev: Date.now() })
    pushLog(`✅ 已解析：${ast!.opcode}.${ast!.form} ${ast!.operands.join(', ')}`)
  }

  // 顶部导航的 Run 也可以触发
  useEffect(()=>{
    const h = ()=>handleRun()
    window.addEventListener('app/run', h)
    return ()=>window.removeEventListener('app/run', h)
  },[])

  return (
    <div className="left-root">
      {/* 上：编辑器 */}
      <div className="left-top nice-card">
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

      {/* 下：日志/提示 */}
      <div className="left-bottom nice-card">
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
  )
}
