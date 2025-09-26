// src/utils/dslMacros.ts
// 把 vec4 / square / appear(a,b,c,sX) / blink(a,b,c,sX,t,ms)
// / disappear(v0[0..3], sX) / pack_default / nopack_prefix
// 展开为底层原语（rect/label/text/group/line/arrow/step/...）

function explodeRange(token: string): string[] {
    // v0[0..3] / v10[1..4] / v2[0] / 普通 id
    const m = token.match(/^([A-Za-z_]\w*)\[(\d+)\.\.(\d+)\]$/)
    if (!m) return [token.trim()]
    const base = m[1], a = +m[2], b = +m[3]
    const out: string[] = []
    for (let i = a; i <= b; i++) out.push(`${base}[${i}]`)
    return out
  }
  
  function splitList(s: string): string[] {
    // 按逗号切，但允许空格
    return s.split(',').map(x => x.trim()).filter(Boolean)
  }
  
  export function expandDSL(src: string): string {
    const out: string[] = []
  
    const lines = src.split(/\r?\n/)
    for (let raw of lines) {
      const line = raw.trim()
      if (!line || line.startsWith('#')) { out.push(raw); continue }
  
      // square(id, x, y, "txt", color)
      let m = line.match(/^square\(\s*([A-Za-z_]\w*)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*"(.*)"\s*,\s*([#A-Za-z0-9_]+)\s*\)$/)
      if (m) {
        const [, id, x, y, text, color] = m
        out.push(`rect(${id}, 1, 1, ${x}, ${y}, "${text}", ${color})`)
        continue
      }
  
      // vec4(name, x, y, "a,b,c,d", color, x, gap, [nobox])
      m = line.match(/^vec4\(\s*([A-Za-z_]\w*)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*"(.*)"\s*,\s*([#A-Za-z0-9_]+)\s*,\s*x\s*,\s*([\d.]+)\s*(,\s*nobox\s*)?\)$/)
      if (m) {
        const [, name, xStr, yStr, csv, color, gapStr, nobox] = m
        const x = +xStr, y = +yStr, gap = +gapStr
        const vals = csv.split(',').map(s => s.trim())
        const w = 1, h = 1
        if (!nobox) {
          const totalW = vals.length * w + (vals.length - 1) * gap
          out.push(`group(${name}__box, ${x}, ${y - 0.2}, ${totalW}, ${h + 0.4}, dotted)`)
        }
        vals.forEach((v, i) => {
          const cx = x + i * (w + gap)
          const id = `${name}[${i}]`
          out.push(`rect(${id}, ${w}, ${h}, ${cx}, ${y}, "${v}", ${color})`)
        })
        continue
      }
  
      // appear(a,b,c, sX)
      m = line.match(/^appear\((.*)\)$/)
      if (m) {
        const args = splitList(m[1])
        const step = args.pop() as string
        const ids = args.flatMap(explodeRange)
        ids.forEach(id => out.push(`appear(${id}, ${step})`))
        continue
      }
  
      // disappear(a,b,c, sX)
      m = line.match(/^disappear\((.*)\)$/)
      if (m) {
        const args = splitList(m[1])
        const step = args.pop() as string
        const ids = args.flatMap(explodeRange)
        ids.forEach(id => out.push(`disappear(${id}, ${step})`))
        continue
      }
  
      // blink(a,b,c, sX, t, ms)
      m = line.match(/^blink\((.*)\)$/)
      if (m) {
        const args = splitList(m[1])
        // 最后三个分别是 step, times, interval
        const interval = args.pop()!
        const times = args.pop()!
        const step = args.pop()!
        const ids = args.flatMap(explodeRange)
        ids.forEach(id => out.push(`blink(${id}, ${step}, ${times}, ${interval})`))
        continue
      }
  
      // pack_default / nopack_prefix —— 当前引擎不需要显式展开，直接忽略或透传注释
      if (/^pack_default\(/.test(line) || /^nopack_prefix\(/.test(line)) {
        out.push(`# ${line}`) // 作为注释保留
        continue
      }
  
      // 其他语句（rect/label/text/group/line/arrow/step/pack/…）原样通过
      out.push(raw)
    }
  
    return out.join('\n')
  }
  