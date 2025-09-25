import React, { useRef, useState } from 'react'
import Editor from '@monaco-editor/react'
import { useApp } from '../../context'

export default function LeftPanel() {
  const { logs, pushLog } = useApp()
  const [code, setCode] = useState<string>(`# RVV playground
# 未来可在这里写一段向量汇编，再在右侧播放
vadd.vv v0, v1, v2
`)

  const onMount = () => {
    pushLog('Editor ready ✔')
  }

  const handleRun = () => {
    pushLog('Run clicked. (在顶部导航也可触发)')
    // 未来接：解析 code → 调后端 → 返回 DSL → 右侧渲染
  }

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
          <Editor
            height="100%"
            defaultLanguage="asm"
            value={code}
            onChange={(v)=>setCode(v ?? '')}
            onMount={onMount}
            options={{
              minimap: { enabled: false },
              fontFamily: `'Fira Code','JetBrains Mono','SFMono-Regular',Consolas,Monaco,monospace`,
              fontSize: 13,
              lineNumbers: 'on',
              scrollBeyondLastLine: false,
              automaticLayout: true,
              tabSize: 2,
              theme: 'vs-light'
            }}
          />
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
