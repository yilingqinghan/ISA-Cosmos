
export type FetchParams = {
  arch: string; opcode: string; form: string;
  vd: string; vs1: string; vs2: string;
  vlen: number; sew: number;
}
export type ServerDoc = {
  dsl?: string
  doc?: any               // 直接返回已解析的 DSLDoc 也支持
  stepMap?: Record<string, number> // id -> stepIndex
  steps?: number          // 总步骤数（可选；若无则取 stepMap 的 max+1）
}

export async function fetchDSL(p: FetchParams): Promise<ServerDoc> {
  const q = new URLSearchParams({
    arch: p.arch, opcode: p.opcode, form: p.form,
    vd: p.vd, vs1: p.vs1, vs2: p.vs2,
    vlen: String(p.vlen), sew: String(p.sew),
  }).toString()

  const url = `/api/visualize?${q}`
  try {
    const res = await fetch(url, { method: 'GET' })
    if (!res.ok) throw new Error(String(res.status))
    const contentType = res.headers.get('content-type') || ''
    if (contentType.includes('application/json')) return await res.json()
    const text = await res.text()
    return { dsl: text }
  } catch (err) {
    // 本地开发兜底：返回 demo DSL（不阻塞前端开发）
    const demo = `# demo dsl fallback
label(v1,1.6,0.2,"v1")
label(v2,1.6,1.8,"v2")
label(v0,1.6,3.4,"v0")
group(g,2.2,1.6,7.5,1.2,dotted)
rect(x1,1,1,2.2,0.0,"1",lightgray)
rect(x2,1,1,3.2,0.0,"2",lightgray)
rect(y1,1,1,2.2,1.8,"10",teal)
rect(z1,1,1,2.2,3.4,"",lightgray)
arrow(a1,2.7,1.0,2.7,3.4,2.2,"",true,#10BDB0,false,true)
# 步骤定义：id -> step
step(x1,0)
step(y1,0)
step(z1,1)
step(a1,1)`
    return { dsl: demo, steps: 2 }
  }
}
