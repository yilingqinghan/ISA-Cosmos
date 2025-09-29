import type { InstructionSetValidator, ValidationError } from '../types'

const inRange = (n:number, lo:number, hi:number)=> n>=lo && n<=hi

// 返回：true=合法，false=匹配但越界，null=不匹配（交给其它规则/忽略）
const checks = {
  v:  (s:string) => { const m = /^v(\d{1,2})$/.exec(s);  if (!m) return null; return inRange(+m[1],0,31) },
  x:  (s:string) => { const m = /^x(\d{1,2})$/.exec(s);  if (!m) return null; return inRange(+m[1],0,31) },
  t:  (s:string) => { const m = /^t(\d)$/.exec(s);       if (!m) return null; return inRange(+m[1],0,6)  },
  a:  (s:string) => { const m = /^a([0-7])$/.exec(s);    if (!m) return null; return true },
  s:  (s:string) => { const m = /^s(\d{1,2})$/.exec(s);  if (!m) return null; return inRange(+m[1],0,11) },
  // 可选：浮点 ABI
  f:  (s:string) => { const m = /^f(\d{1,2})$/.exec(s);  if (!m) return null; return inRange(+m[1],0,31) },
  ft: (s:string) => { const m = /^ft(\d{1,2})$/.exec(s); if (!m) return null; return inRange(+m[1],0,11) },
  fs: (s:string) => { const m = /^fs(\d{1,2})$/.exec(s); if (!m) return null; return inRange(+m[1],0,11) },
  fa: (s:string) => { const m = /^fa([0-7])$/.exec(s);   if (!m) return null; return true },
  named: (s:string) => (['zero','ra','sp','gp','tp','fp'].includes(s) ? true : null),
}

export const rvvValidator: InstructionSetValidator = {
  arch: 'rvv',  // 你的面板 arch 是 'rvv'，这里就挂在 rvv 下面
  validate(ast): ValidationError[] {
    const errs: ValidationError[] = []
    const ops = ast?.operands || []
    for (const op of ops) {
      const s = String(op).trim()
      let judged: boolean | null = null
      for (const k of Object.keys(checks) as (keyof typeof checks)[]) {
        const r = checks[k](s)
        if (r !== null) { judged = r; break }
      }
      if (judged === false) errs.push({ message: `寄存器越界：${s}` })
      // judged === null 表示不是寄存器（可能是立即数/标记），不报错
    }
    return errs
  }
}

export default rvvValidator