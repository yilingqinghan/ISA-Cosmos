import React, { useRef, useState, useEffect, useMemo } from 'react'
import { useApp } from '../../context'
import Editor, { OnMount } from '@monaco-editor/react'
import { LeftNotch } from '../nav/NavBar'



export default function LeftPanel() {
  const { arch, pushLog, setDslOverride, vectorEnv } = useApp()
  const [code, setCode] = useState(`vadd.vv v0, v1, v2
vmul.vv v3, v4, v5
vsetvli.ri x1, x10, e32m2
`)
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor|null>(null)
  const monacoRef = useRef<typeof monaco|null>(null)
  const widgets = useRef<monaco.editor.IContentWidget[]>([])
  const decoIds = useRef<string[]>([])
  const runFocusDecoIds = useRef<string[]>([])
  const runExecDecoIds = useRef<string[]>([])
  const inlineIssueRef = useRef<HTMLDivElement|null>(null)
  const inlineIssueLine = useRef<number>(0)
  const inlineIssueDisposables = useRef<any[]>([])

  const [doc, setDoc] = useState<{ usage?: string; scenarios?: string[]; notes?: string[]; exceptions?: string[] }>({})
  const [editorTheme, setEditorTheme] = useState<'isa-light' | 'solarized-light' | 'solarized-dark' | 'vs-dark'>(()=> {
    try { return (localStorage.getItem('isa.editorTheme') as any) || 'isa-light' } catch { return 'isa-light' }
  })
  const [editorFont, setEditorFont] = useState<'Fira'|'JetBrains'|'System'>(()=> {
    try { return (localStorage.getItem('isa.editorFont') as any) || 'Fira' } catch { return 'Fira' }
  })
  const [editorFontSize, setEditorFontSize] = useState(()=>{
    try { const v = parseInt(localStorage.getItem('isa.editorFontSize')||''); return Number.isFinite(v) ? v : 13 } catch { return 13 }
  })
  const [editorControlsHidden, setEditorControlsHidden] = useState(()=>{
    try {
      const v = localStorage.getItem('isa.editorControlsHidden');
      return v ? v === '1' : true; // 默认隐藏
    } catch { return true }
  })
  const [activeKey, setActiveKey] = useState<string|null>(null)

  const count = (arr?: string[]) => arr?.length ?? 0

  const pillStyle: React.CSSProperties = {
    fontSize:10,
    padding:'1px 6px',
    borderRadius:999,
    background:'#0f172a0d',
    border:'1px solid #cbd5e1'
  }

  function computeFontFamily(font: 'Fira'|'JetBrains'|'System') {
    return font === 'Fira'
      ? `'Fira Code','JetBrains Mono','SFMono-Regular','Menlo','Consolas','Liberation Mono','ui-monospace',monospace`
      : font === 'JetBrains'
      ? `'JetBrains Mono','Fira Code','SFMono-Regular','Menlo','Consolas','Liberation Mono','ui-monospace',monospace`
      : `'SFMono-Regular','Menlo','Consolas','Liberation Mono','ui-monospace',monospace`
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

  // 指令目录：异步从注册表动态加载
  const [catalog, setCatalog] = useState<{arch:string; items:{arch:string; opcode:string; form:string; sample:string}[]}[]>([])
  useEffect(()=>{
    let cancelled = false
    ;(async()=>{
      try {
        // 动态加载新注册表（不存在时自动回退为空）
        const modPath = '../../instructions/registry' as string
        // @ts-ignore
        const reg: any = await import(/* @vite-ignore */ modPath).catch(()=>null)
        const instructionRegistry = reg?.instructionRegistry || {}
        const arches = ['rvv']
        const cat = arches.map(archName => {
          const keys = Object.keys(instructionRegistry).filter(k => k.startsWith(archName + '/'))
          const items = keys.map(k => {
            const name = k.slice(archName.length + 1)
            const [opcode, form] = name.split('.')
            const mod = instructionRegistry[k]
            const sample: string = mod?.sample || `${opcode}.${form} v0, v1, v2`
            return { arch: archName, opcode, form, sample }
          })
          return { arch: archName, items }
        })
        if (!cancelled) setCatalog(cat)
      } catch {
        if (!cancelled) setCatalog([])
      }
    })()
    return ()=>{ cancelled = true }
  }, [])

  const clearDiagnostics = ()=>{
    const ed = editorRef.current, m = monacoRef.current
    if (!ed || !m) return
    const model = ed.getModel()
    if (model) m.editor.setModelMarkers(model, 'isa', [])
    widgets.current.forEach(w=>ed.removeContentWidget(w))
    widgets.current = []
    if (decoIds.current.length) { ed.deltaDecorations(decoIds.current, []); decoIds.current=[] }
    if (runFocusDecoIds.current.length) { ed.deltaDecorations(runFocusDecoIds.current, []); runFocusDecoIds.current = [] }
    if (runExecDecoIds.current.length) { ed.deltaDecorations(runExecDecoIds.current, []); runExecDecoIds.current = [] }
    removeInlineIssue()
  }
  function removeInlineIssue() {
    const ed = editorRef.current
    const el = inlineIssueRef.current
    if (ed && el) {
      try { ed.getDomNode()?.removeChild(el) } catch {}
    }
    inlineIssueRef.current = null
    inlineIssueLine.current = 0
    inlineIssueDisposables.current.forEach(d=>{ try { d.dispose?.() } catch {} })
    inlineIssueDisposables.current = []
  }

  function positionInlineIssue() {
    const ed = editorRef.current
    const el = inlineIssueRef.current
    if (!ed || !el || !inlineIssueLine.current) return
    const line = inlineIssueLine.current
    const topForLine = (ed as any).getTopForLineNumber(line) as number
    const scrollTop = (ed as any).getScrollTop() as number
    const lineHeight = (ed as any).getOption?.((window as any).monaco.editor.EditorOption.lineHeight) ?? 20
    const top = Math.round(topForLine - scrollTop + (lineHeight - el.offsetHeight) / 2)
    el.style.top = `${Math.max(top, 0)}px`
    el.style.right = '8px'
  }

  function placeInlineIssue(line:number, message:string, tone:'warn'|'error'='warn') {
    const ed = editorRef.current
    if (!ed) return
    // ensure editor root is positioning context
    ed.getDomNode()?.classList.add('isa-inline-issue-root')
    removeInlineIssue()

    const el = document.createElement('div')
    el.className = `inline-issue ${tone==='error'?'inline-issue--error':'inline-issue--warn'}`
    el.textContent = message
    el.style.position = 'absolute'
    el.style.pointerEvents = 'none'
    el.style.whiteSpace = 'nowrap'
    el.style.zIndex = '50'
    inlineIssueRef.current = el
    inlineIssueLine.current = line
    ed.getDomNode()?.appendChild(el)

    // initial pos + follow scroll/resize
    positionInlineIssue()
    inlineIssueDisposables.current.push((ed as any).onDidScrollChange?.(()=>positionInlineIssue()))
    inlineIssueDisposables.current.push((ed as any).onDidLayoutChange?.(()=>positionInlineIssue()))
  }

  type IDError = { line:number; col:number; message:string }
  const showDiagnostics = (errs: IDError[])=>{
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

  // 以“警告”样式提示（例如：未找到指令模块）
  const showWarning = (line: number, col: number, message: string) => {
    const ed = editorRef.current, m = monacoRef.current
    if (!ed || !m) return
    const model = ed.getModel(); if (!model) return

    // 仍然打 Warning marker（用于 hover & 概览尺子）
    m.editor.setModelMarkers(model, 'isa', [{
      startLineNumber: line, startColumn: col,
      endLineNumber: line, endColumn: col + 1,
      severity: m.MarkerSeverity.Warning, message
    }])

    // Xcode 风格：当前行右侧内联提示（非弹框）
    placeInlineIssue(line, message, 'warn')
  }

  // 给“正在执行”的行加上醒目的装饰（不改变选区）
  function markExecutingLine(line: number) {
    const ed = editorRef.current, m = monacoRef.current
    const model = ed?.getModel()
    if (!ed || !m || !model) return
    runExecDecoIds.current = ed.deltaDecorations(runExecDecoIds.current, [
      { range: new m.Range(line, 1, line, 1), options: { isWholeLine: true, className: 'run-exec-line', linesDecorationsClassName: 'run-exec-leftbar' } }
    ])
    ed.revealLineInCenter(line)
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
    m.editor.defineTheme('isa-light', {
      base: 'vs',
      inherit: true,
      rules: [],
      colors: {
        'editor.background': '#FBFCFD',
        'editorLineNumber.foreground': '#94a3b8',
        'editorLineNumber.activeForeground': '#0f172a',
        'editorGutter.background': '#F8FAFC',
        'editor.lineHighlightBackground': '#e0f2fe',
        'editor.lineHighlightBorder': '#bae6fd',
        'editor.selectionBackground': '#93c5fd66',
        'editor.inactiveSelectionBackground': '#93c5fd33',
        'editorIndentGuide.background': '#e2e8f0',
        'editorIndentGuide.activeBackground': '#94a3b8',
        'scrollbarSlider.background': '#cbd5e180',
        'scrollbarSlider.hoverBackground': '#cbd5e1aa',
        'scrollbarSlider.activeBackground': '#94a3b8aa',
        'editorCursor.foreground': '#0f172a'
      }
    })
    m.editor.defineTheme('solarized-light', { base: 'vs', inherit: true, rules: [], colors: {
      'editor.background': '#fdf6e3','editor.foreground': '#657b83','editor.lineHighlightBackground': '#eee8d5','editorLineNumber.foreground': '#93a1a1','editorLineNumber.activeForeground': '#586e75','editorGutter.background': '#fdf6e3','editor.selectionBackground': '#eee8d599','editor.inactiveSelectionBackground': '#eee8d566','editorIndentGuide.background': '#eee8d5','editorIndentGuide.activeBackground': '#93a1a1','scrollbarSlider.background': '#93a1a180','scrollbarSlider.hoverBackground': '#93a1a1aa','scrollbarSlider.activeBackground': '#657b83aa','editorCursor.foreground': '#268bd2'
    } })
    m.editor.defineTheme('solarized-dark', { base: 'vs-dark', inherit: true, rules: [], colors: {
      'editor.background': '#002b36','editor.foreground': '#93a1a1','editor.lineHighlightBackground': '#073642','editorLineNumber.foreground': '#586e75','editorLineNumber.activeForeground': '#93a1a1','editorGutter.background': '#002b36','editor.selectionBackground': '#07364299','editor.inactiveSelectionBackground': '#07364266','editorIndentGuide.background': '#073642','editorIndentGuide.activeBackground': '#586e75','scrollbarSlider.background': '#586e7580','scrollbarSlider.hoverBackground': '#586e75aa','scrollbarSlider.activeBackground': '#93a1a1aa','editorCursor.foreground': '#268bd2'
    } })
    m.editor.setTheme(editorTheme)
    ed.updateOptions({
      glyphMargin:true,
      lineDecorationsWidth:14,
      padding:{top:6,bottom:6},
      bracketPairColorization: { enabled: true },
      guides: { bracketPairs: true, indentation: true },
      renderWhitespace: 'selection',
      renderLineHighlight: 'all',
      smoothScrolling: true,
      cursorSmoothCaretAnimation: 'on',
      fontLigatures: true,
      mouseWheelZoom: true,
      rulers: [80],
      fontFamily: computeFontFamily(editorFont),
      fontSize: editorFontSize,
    })
  }
  useEffect(()=>{
    const ed = editorRef.current
    const m = monacoRef.current as any
    if (!ed) return
    ed.updateOptions({ fontFamily: computeFontFamily(editorFont), fontSize: editorFontSize })
    try { m?.editor?.remeasureFonts?.() } catch {}
  }, [editorFont, editorFontSize])

  useEffect(()=>{
    const m = monacoRef.current
    if (m) { try { m.editor.setTheme(editorTheme) } catch {} }
  }, [editorTheme])

  // 将设置持久化到浏览器
  useEffect(()=>{ try { localStorage.setItem('isa.editorTheme', editorTheme) } catch {} }, [editorTheme])
  useEffect(()=>{ try { localStorage.setItem('isa.editorFont', editorFont) } catch {} }, [editorFont])
  useEffect(()=>{ try { localStorage.setItem('isa.editorFontSize', String(editorFontSize)) } catch {} }, [editorFontSize])
  useEffect(()=>{ try { localStorage.setItem('isa.editorControlsHidden', editorControlsHidden ? '1' : '0') } catch {} }, [editorControlsHidden])

  useEffect(()=>{
    // 全局引入等宽字体（仅注入一次）
    if (document.getElementById('isa-fonts')) return
    const style = document.createElement('style')
    style.id = 'isa-fonts'
    style.textContent = `
      /* 按需加载 Fira Code / JetBrains Mono（配合 computeFontFamily 使用） */
      @import url('https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;500;600&family=JetBrains+Mono:wght@400;500;600&display=swap');
    `
    document.head.appendChild(style)
  }, [])

  useEffect(() => {
    if (document.getElementById('isa-monaco-style')) return
    const style = document.createElement('style')
    style.id = 'isa-monaco-style'
    style.textContent = `
    /* 当前将要执行：蓝条 + 淡蓝底（由 highlightLine 设置） */
    .monaco-editor .run-focus-line { background: rgba(14,165,233,0.12); }
    .monaco-editor .run-focus-leftbar { background: #38bdf8; width: 3px; }
    /* 正在执行：绿条 + 淡绿底（由 markExecutingLine 设置） */
    .monaco-editor .run-exec-line { background: rgba(34,197,94,0.14); }
    .monaco-editor .run-exec-leftbar { background: #22c55e; width: 3px; }
    /* 错误气泡的基础样式（你已有），这里微调一点阴影/圆角以显得更高级 */
    .err-bubble { background:#fff; border:1px solid #fecaca; color:#991b1b; padding:4px 8px; border-radius:6px; box-shadow:0 2px 6px rgba(0,0,0,0.06); font-size:12px; }
    .warn-bubble { background:#fffbeb; border:1px solid #facc15; color:#854d0e; padding:4px 8px; border-radius:6px; box-shadow:0 2px 6px rgba(0,0,0,0.06); font-size:12px; }
    /* glyph 红点在 Monaco 左侧栏已经启用，这里不强行覆盖 */
    /* 主题色圆形按钮（按钮自身着色）*/
    .theme-btn {
      width: 18px; height: 18px; border-radius: 999px; padding: 0 !important;
      border: 1px solid rgba(0,0,0,0.28); display: inline-flex; align-items: center; justify-content: center;
      min-width: 18px; /* 覆盖 .btn 的最小宽度 */
    }
    .theme-btn.active { outline: 2px solid #2563eb; outline-offset: 1px; }
    /* 左侧指令目录：悬停/点击“抽出”动画与分隔线 */
    .left-catalog .catalog-scroll ul li.catalog-item {
      position: relative;
      transition: transform 160ms ease, background-color 160ms ease, box-shadow 160ms ease, border-color 160ms ease;
      border: 1px solid transparent;
    }
    .left-catalog .catalog-scroll ul li.catalog-item:hover {
      transform: translateX(6px);
      background: #f1f5f9; /* slate-100 */
      box-shadow: 0 2px 8px rgba(0,0,0,0.06);
      border-color: #cbd5e1; /* slate-300 */
    }
    .left-catalog .catalog-scroll ul li.catalog-item.active {
      transform: translateX(8px);
      background: #e0f2fe; /* sky-100 */
      border-color: #7dd3fc; /* sky-300 */
      box-shadow: 0 2px 10px rgba(14,165,233,0.18);
    }
    .left-catalog .catalog-scroll ul li.catalog-item::before {
      content: '';
      position: absolute;
      left: 0; top: 8px; bottom: 8px;
      width: 3px; border-radius: 3px;
      background: transparent;
      transition: background-color 160ms ease, transform 160ms ease;
      transform: scaleY(0.5);
    }
    .left-catalog .catalog-scroll ul li.catalog-item:hover::before,
    .left-catalog .catalog-scroll ul li.catalog-item.active::before {
      background: #38bdf8; /* sky-400 */
      transform: scaleY(1);
    }
    /* 分界线：每个指令项之间的细分隔线（不影响第一个） */
    .left-catalog ul li + li { border-top: 1px dashed #e5e7eb; }
    .isa-inline-issue-root { position: relative; }
    .inline-issue { font-size:12px; padding:1px 8px; border-radius:6px; box-shadow:0 1px 3px rgba(0,0,0,0.06); }
    .inline-issue--warn { background:#fffbeb; border:1px solid #facc15; color:#854d0e; }
    .inline-issue--error { background:#fff5f5; border:1px solid #fda4af; color:#be123c; }
    `
    document.head.appendChild(style)
  }, [])

  // 轻量语法解析：`opcode.form [operands]`，从 UI 的 arch 推导架构
  function parseLineToAst(arch: string, lineText: string) {
    const m = lineText.match(/^([A-Za-z0-9_]+)\.([A-Za-z0-9_]+)\s*(.*)$/)
    if (!m) {
      const dotIdx = lineText.indexOf('.')
      const col = dotIdx > 0 ? dotIdx + 1 : Math.max(1, lineText.length)
      const err: IDError = { line: 1, col, message: '缺少 opcode.form 或格式不正确' }
      throw err
    }
    const opcode = m[1]
    const form = m[2]
    const operands = m[3] ? m[3].split(',').map(s=>s.trim()).filter(Boolean) : []
    return { arch, opcode, form, operands }
  }
  function parseInlinePayload(rawLine: string): { env?: any; values?: Record<string, any[]> } {
    // 优先匹配 // { ... }，其次匹配行尾 { ... }
    const m = rawLine.match(/\/\/\s*(\{[\s\S]*\})\s*$/) || rawLine.match(/(\{[\s\S]*\})\s*$/)
    if (!m) return {}
    try {
      const obj = JSON.parse(m[1])
      const env = obj?.env && typeof obj.env === 'object' ? obj.env : undefined
      const values = obj?.values && typeof obj.values === 'object' ? obj.values : undefined
      return { env, values }
    } catch { return {} }
  }
  // —— 优先走“指令模块 → DSLDoc”，找不到模块时回退到老的文本 DSL ——
  async function buildDocViaModule(ast: any, payload?: { env?: any; values?: Record<string, any[]> }) {
    try {
      const modName = '../../instructions/registry' as string
      // @ts-ignore: 动态导入——模块不存在时将被捕获
      const reg: any = await (import(/* @vite-ignore */ modName).catch(() => null))
      if (!reg) return null

      const key = `${ast.arch}/${ast.opcode}.${ast.form}`
      const getInstrModule = (reg as any).getInstrModule
      let mod = typeof getInstrModule === 'function' ? getInstrModule(key) : undefined
      if (!mod && (reg as any).instructionRegistry) {
        mod = (reg as any).instructionRegistry[key]
      }
      if (!mod || typeof mod.build !== 'function') return null
      // 读取 UI 工具条持久化的位宽（没有就走默认）
      const uiRegBits  = Number(localStorage.getItem('isa.vector.regBits')  || 128)
      const uiElemBits = Number(localStorage.getItem('isa.vector.elemBits') || 32)
      // —— 组装 BuildCtx ——（类型约束在 src/instructions/types.ts 已定义）
      const ctx = {
        arch: ast.arch,
        opcode: ast.opcode,
        form: ast.form,
        operands: ast.operands || [],            // ← 从 Editor 传入的寄存器号等
        env: {
          // 通用键（首选）
          regBits: uiRegBits,
          elemBits: uiElemBits,
          // 兼容旧模块（比如早期 RVV 写法）
          VLEN: uiRegBits,
          SEW:  uiElemBits,
          ...(payload?.env || {}),
        },
        values: payload?.values || undefined,    // ← 行内 JSON 里可传各寄存器 lane 值
      }

      const built = await mod.build(ctx)
      // 模块可能直接返回 DSLDoc，或返回 { doc: DSLDoc, extras?: any }
      let doc: any = null
      let extras: any = undefined
      if (built && typeof built === 'object' && 'doc' in built) {
        doc = (built as any).doc
        extras = (built as any).extras
      } else {
        doc = built
      }
      if (!doc) return null
      return { doc, extras }
    } catch {
      return null
    }
  }

  // 从指令模块或注册表里读取迷你文档（Usage/Notes）
  async function loadMiniDoc(ast: {arch:string; opcode:string; form:string}) {
    try {
      const modName = '../../instructions/registry' as string
      // @ts-ignore
      const reg: any = await import(/* @vite-ignore */ modName).catch(()=>null)
      if (!reg) return null
      const key1 = `${ast.arch}/${ast.opcode}.${ast.form}`
      const key2 = `${ast.arch}.${ast.opcode}.${ast.form}` // 兼容你以前的 key 书写
      const getInstrModule = (reg as any).getInstrModule
      let mod = typeof getInstrModule === 'function' ? getInstrModule(key1) : undefined
      if (!mod && (reg as any).instructionRegistry) {
        mod = (reg as any).instructionRegistry[key1]
      }
      const meta = mod?.meta || (reg as any).miniDocs?.[key2] || (reg as any).miniDocs?.[key1]
      if (!meta) return null
      const { usage, scenarios, notes, exceptions } = meta
      return { usage: usage||'', scenarios: scenarios||[], notes: notes||[], exceptions: exceptions||[] }
    } catch {
      return null
    }
  }

  const handleRun = async ()=>{
    clearDiagnostics()
    const ed = editorRef.current, m = monacoRef.current
    const model = ed?.getModel()
    if (!ed || !m || !model) return
    const pos = ed.getPosition() || { lineNumber: 1, column: 1 }
    const lineNo = pos.lineNumber
    const raw = model.getLineContent(lineNo)
    const lineText = raw.trim()
    const payload = parseInlinePayload(raw)  // ← 新增

    // 空行/注释：不解析，直接跳到下一条有效指令
    if (!lineText || /^(\/\/|#|;)/.test(lineText)) {
      const next = nextMeaningfulLine(lineNo)
      highlightLine(next)
      pushLog('↷ 跳过空行/注释，已定位到下一行')
      setDslOverride(null as any)
      return
    }

    // 使用轻量解析器获取 opcode.form
    let ast: any
    try {
      ast = parseLineToAst(arch, lineText)
    } catch (e:any) {
      const err = e as IDError
      showDiagnostics([{ line: lineNo, col: err?.col || 1, message: err?.message || '语法错误' }])
      highlightLine(lineNo)
      setDslOverride(null as any)
      return
    }
    // 使用指令集校验器（LeftPanel 不做通用校验）
    try {
      // 动态导入注册表入口（不存在时静默忽略）
      const reg: any = await import(/* @vite-ignore */ '../../instructions/registry').catch(()=>null)
      const validateWithRegistry = reg?.validateWithRegistry
      if (typeof validateWithRegistry === 'function') {
        const verrs = validateWithRegistry(ast) || []
        if (verrs.length) {
          showDiagnostics(verrs.map((e:any)=>({ line: lineNo, col: e.col ?? 1, message: e.message })))
          highlightLine(lineNo)
          setDslOverride({ text: '', rev: Date.now() } as any)  // 防崩
          return
        }
      }
    } catch {}
    // 仅支持模块渲染；找不到模块则提示
    let usedModule = false
    try {
      const out = await buildDocViaModule(ast, payload)
      if (out) {
        setDslOverride({ doc: out.doc, extras: out.extras, rev: Date.now() } as any)
        usedModule = true
        pushLog(`✅ 模块渲染：${ast.opcode}.${ast.form}`)
        // 加载指令元信息 Usage/Notes 等
        const meta = await loadMiniDoc(ast)
        if (meta) setDoc(meta)
        else setDoc({ usage:'', scenarios:[], notes:[], exceptions:[] })
      }
    } catch {}

    if (!usedModule) {
      pushLog(`非法指令或还未受支持ฅ^•ﻌ•^ฅ：${ast.opcode}.${ast.form}`)
      setDslOverride({ text: '', rev: Date.now() } as any)
      setDoc({ usage:'', scenarios:[], notes:[], exceptions:[] })
      // 在当前行给出“警告”提示
      showWarning(lineNo, 1, `非法指令或还未受支持：${ast.opcode}.${ast.form}`)
      highlightLine(lineNo)
      return
    }

    markExecutingLine(lineNo)

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

  // removed dynamic rows; use fixed template rows below

  return (
    <div className="left-panel" style={{ display:'flex', flexDirection:'column', height:'100%', minHeight:0 }}>
      {/* 顶部内联的左侧刘海（不重叠） */}
      <LeftNotch inline />

      {/* 主体区域占满剩余空间，不与刘海重叠 */}
      <div className="left-root" style={{ display:'grid', gridTemplateColumns:'minmax(0,1fr) 120px', gap:8, flex:'1 1 auto', minHeight:0, minWidth:0 }}>
        {/* 主列：编辑器 + Usage */}
        <div className="left-main" style={{flex:1, minWidth:0, display:'grid', gridTemplateRows: 'minmax(180px,1.4fr) minmax(120px,0.8fr)', gap:8, minHeight:0, overflow:'hidden'}}>
          {/* 上：编辑器 */}
          <div className="left-top nice-card" style={{display:'flex', flexDirection:'column', minHeight:120, minWidth:0, overflow:'hidden'}}>
            <div className="panel-toolbar">
              <div className="panel-title">Editor</div>
              <div className="grow" />
              {editorControlsHidden ? (
                <>
                  <button title="显示编辑器设置" className="btn" onClick={()=>setEditorControlsHidden(false)}>⋯</button>
                  <button className="btn" onClick={handleRun}>Run</button>
                </>
              ) : (
                <>
                  <button
                    title="浅色 (Isa)"
                    className={`btn theme-btn ${editorTheme==='isa-light'?'active':''}`}
                    onClick={()=>setEditorTheme('isa-light')}
                    aria-label="Isa Light"
                    style={{background:'#FBFCFD', borderColor:'#94a3b8'}}
                  />
                  <button
                    title="Solarized Light"
                    className={`btn theme-btn ${editorTheme==='solarized-light'?'active':''}`}
                    onClick={()=>setEditorTheme('solarized-light')}
                    aria-label="Solarized Light"
                    style={{background:'#fdf6e3', borderColor:'#d9cbb2'}}
                  />
                  <button
                    title="Solarized Dark"
                    className={`btn theme-btn ${editorTheme==='solarized-dark'?'active':''}`}
                    onClick={()=>setEditorTheme('solarized-dark')}
                    aria-label="Solarized Dark"
                    style={{background:'#002b36', borderColor:'#0b3942'}}
                  />
                  <button
                    title="VS Dark"
                    className={`btn theme-btn ${editorTheme==='vs-dark'?'active':''}`}
                    onClick={()=>setEditorTheme('vs-dark')}
                    aria-label="VS Dark"
                    style={{background:'#1e1e1e', borderColor:'#3a3a3a'}}
                  />
                  <span style={{width:6}} />
                  <select aria-label="选择字体" className="btn" value={editorFont} onChange={(e)=>setEditorFont(e.target.value as any)} style={{padding:'2px 8px'}}>
                    <option value="Fira">Fira Code</option>
                    <option value="JetBrains">JetBrains Mono</option>
                    <option value="System">系统等宽</option>
                  </select>
                  <span style={{width:6}} />
                  <button title="字号变小" className="btn" onClick={()=>setEditorFontSize(s=>Math.max(10, s-1))}>－</button>
                  <button title="字号变大" className="btn" onClick={()=>setEditorFontSize(s=>Math.min(22, s+1))}>＋</button>
                  <button title="重置为默认设置" className="btn" onClick={()=>{ setEditorTheme('isa-light'); setEditorFont('Fira'); setEditorFontSize(13); }}>↺</button>
                  <span style={{width:6}} />
                  <button title="隐藏编辑器设置" className="btn" onClick={()=>setEditorControlsHidden(true)}>—</button>
                  <button className="btn" onClick={handleRun}>Run</button>
                </>
              )}
            </div>
            <div className="editor-wrap" style={{flex:1, minHeight:0, minWidth:0, overflow:'hidden'}}>
              <Editor height="100%" defaultLanguage="asm" value={code}
                      onChange={v=>setCode(v??'')} onMount={onMount}
                      theme={editorTheme}
                      options={{
                        minimap: { enabled: false },
                        automaticLayout: true,
                        fontSize: editorFontSize,
                        fontFamily: computeFontFamily(editorFont),
                      }} />
            </div>
          </div>

          <div className="left-mid nice-card" style={{display:'flex', flexDirection:'column', minHeight:120, minWidth:0, overflow:'hidden'}}>
            <div className="panel-toolbar">
              <div className="panel-title">Usage</div>
              <div className="grow" />
            </div>
            <div className="usage-wrap" style={{padding:'8px 10px', overflow:'auto', flex:1, minHeight:0, fontSize:12}}>
              <div className="usage-all" style={{display:'grid', gridTemplateColumns:'1.2fr 1fr 1fr', gap:10}}>
                <div style={{display:'none', marginTop:8, color:'#64748b', fontSize:12}} aria-hidden="true">
                  提示：我们不检查语法正确性，请自行保证语法正确！
                </div>
                <div style={{gridColumn:'1 / -1', padding:8, border:'1px solid #e2e8f0', borderRadius:8, background:'#f8fafc'}}>
                  <div style={{fontSize:11, fontWeight:600, color:'#0f172a', marginBottom:6}}>说明</div>
                  {doc.usage ? <p style={{lineHeight:1.6, margin:0}}>{doc.usage}</p> : <p className="muted" style={{margin:0}}>无</p>}
                </div>
                <div style={{padding:8, border:'1px solid #e2e8f0', borderRadius:8}}>
                  <div style={{display:'flex', alignItems:'center', gap:8, marginBottom:6}}>
                    <div style={{fontSize:11, fontWeight:600, color:'#0f172a'}}>场景</div>
                    <span style={pillStyle}>{count(doc.scenarios)}</span>
                  </div>
                  <FancyList items={doc.scenarios} icon="💡" empty="暂无典型场景" />
                </div>
                <div style={{padding:8, border:'1px solid #e2e8f0', borderRadius:8}}>
                  <div style={{display:'flex', alignItems:'center', gap:8, marginBottom:6}}>
                    <div style={{fontSize:11, fontWeight:600, color:'#0f172a'}}>注意</div>
                    <span style={pillStyle}>{count(doc.notes)}</span>
                  </div>
                  <FancyList items={doc.notes} icon="⚠️" empty="暂无注意事项" tone="warn" />
                </div>
                <div style={{padding:8, border:'1px solid #e2e8f0', borderRadius:8}}>
                  <div style={{display:'flex', alignItems:'center', gap:8, marginBottom:6}}>
                    <div style={{fontSize:11, fontWeight:600, color:'#0f172a'}}>异常</div>
                    <span style={pillStyle}>{count(doc.exceptions)}</span>
                  </div>
                  <FancyList items={doc.exceptions} icon="⛔" empty="暂无已知异常" tone="danger" />
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* 右侧：指令目录（可独立滚动） */}
        <aside className="left-catalog nice-card" style={{display:'flex', flexDirection:'column', overflow:'hidden', minWidth:0}}>
          <div className="panel-toolbar">
            <div className="panel-title">指令目录</div>
            <div className="grow" />
          </div>
          <div className="catalog-scroll" style={{overflow:'auto', padding:'6px 8px', height:'calc(100% - 40px)'}}>
            {catalog.map(group => (
              <div key={group.arch} style={{marginBottom:12}}>
                <div style={{fontSize:12, fontWeight:700, color:'#0f172a', margin:'6px 0'}}>{group.arch.toUpperCase()}</div>
                <ul style={{listStyle:'none', padding:0, margin:0}}>
                  {group.items.map(it => {
                    const keyStr = `${it.arch}:${it.opcode}.${it.form}`
                    return (
                      <li
                        key={keyStr}
                        className={`catalog-item ${activeKey===keyStr ? 'active' : ''}`}
                        style={{display:'flex', alignItems:'center', gap:8, padding:'6px 6px', borderRadius:6, cursor:'pointer', fontSize:12}}
                        onClick={() => { setCode(it.sample); setActiveKey(keyStr); }}
                      >
                        <span style={{fontFamily:'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace', fontSize:12}}>
                          {it.opcode}.{it.form}
                        </span>
                      </li>
                    )
                  })}
                </ul>
              </div>
            ))}
          </div>
        </aside>
      </div>
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
