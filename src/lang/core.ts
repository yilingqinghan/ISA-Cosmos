export type Tok = { t: 'id'|'dot'|'comma'; v: string; i: number; j: number; line: number; col: number }
export type ParseError = { line: number; col: number; message: string }

export type OperandSpec =
  | { kind:'vreg', role?:string }
  | { kind:'xreg', role?:string }
  | { kind:'imm',  role?:string }
  | { kind:'label',role?:string }
  | { kind:'mem',  role?:string }

export type FormSpec = { operands: OperandSpec[] }
export type InstrSpec = { opcode: string; forms: Record<string, FormSpec> }

export type ArchSpec = {
  name: string
  // 验证某类操作数是否合法；返回错误消息或空串
  validateOperand: (kind: OperandSpec['kind'], token: string) => string | ''
  // 指令集合
  instrs: InstrSpec[]
}

export type Ast = {
  arch: string
  opcode: string
  form: string
  operands: string[]
  // 供特定指令使用的语义字段
  meta?: Record<string, any>
}

/* ----------------- 词法 ----------------- */
export function tokenize(src: string): { toks: Tok[], lines: string[] } {
  const lines = src.split(/\r?\n/)
  const toks: Tok[] = []
  for (let li=0; li<lines.length; li++) {
    let s = lines[li].replace(/#.*$/, '') // 去注释
    let col = 1
    while (s.length) {
      const m = /^\s+/.exec(s)
      if (m) { col += m[0].length; s = s.slice(m[0].length); continue }
      if (s[0] === '.') { toks.push({t:'dot', v:'.', i:0, j:0, line:li+1, col}); s=s.slice(1); col++; continue }
      if (s[0] === ',') { toks.push({t:'comma', v:',', i:0, j:0, line:li+1, col}); s=s.slice(1); col++; continue }
      const id = /^[_A-Za-z0-9]+/.exec(s)
      if (id) { toks.push({t:'id', v:id[0], i:0,j:0, line:li+1, col}); col+=id[0].length; s=s.slice(id[0].length); continue }
      break
    }
  }
  return { toks, lines }
}

/* ----------------- 语法/指令匹配 ----------------- */
export function parseOneLine(arch: ArchSpec, src: string): { ast?: Ast, errors: ParseError[] } {
  const { toks, lines } = tokenize(src)
  const errors: ParseError[] = []
  const firstLine = (lines.findIndex(l => l.replace(/#.*$/,'').trim().length>0) + 1) || 1

  // 形如： opcode . form  op1 , op2 , op3
  const ids = toks.filter(t=>t.t!=='comma' && t.t!=='dot')
  if (ids.length < 2) {
    return { errors: [{ line:firstLine, col:1, message:'缺少 opcode 或 .form，如：vadd.vv vd, vs1, vs2' }] }
  }
  const opcodeTok = ids[0]
  const dot = toks.find(t=>t.t==='dot' && t.line===opcodeTok.line)
  const formTok = ids[1]

  if (!dot || !formTok || formTok.line!==opcodeTok.line) {
    return { errors: [{ line: opcodeTok.line, col: opcodeTok.col + opcodeTok.v.length, message:'缺少 .form（例如 .vv）' }] }
  }
  const operands = ids.slice(2).map(t=>t.v)

  const spec = arch.instrs.find(i => i.opcode.toLowerCase() === opcodeTok.v.toLowerCase())
  if (!spec) {
    return { errors: [{ line: opcodeTok.line, col: opcodeTok.col, message:`未知指令 ${opcodeTok.v}` }] }
  }
  const form = spec.forms[formTok.v.toLowerCase()]
  if (!form) {
    return { errors: [{ line: formTok.line, col: formTok.col, message:`${spec.opcode} 不支持 .${formTok.v} 形式` }] }
  }
  if (operands.length !== form.operands.length) {
    return { errors: [{ line: formTok.line, col: formTok.col, message:`操作数数量错误：期望 ${form.operands.length} 个，实际 ${operands.length} 个` }] }
  }
  // 逐个操作数验证类型
  for (let k=0; k<form.operands.length; k++) {
    const want = form.operands[k].kind
    const got = operands[k]
    const bad = arch.validateOperand(want, got)
    if (bad) {
      const tok = ids[2+k]
      errors.push({ line: tok.line, col: tok.col, message: bad })
    }
  }
  if (errors.length) return { errors }

  const ast: Ast = {
    arch: arch.name,
    opcode: spec.opcode,
    form: formTok.v.toLowerCase(),
    operands
  }
  return { ast, errors: [] }
}
