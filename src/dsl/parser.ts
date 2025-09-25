export type Command =
  | { t:'rect'; id:number; w:number; h:number; x:number; y:number; text:string; color:string }
  | { t:'line'; id:number; x:number; y:number; x2:number; y2:number; width:number; text?:string; above?:boolean; color?:string }
  | { t:'arrow'; id:number; x:number; y:number; x2:number; y2:number; width:number; text?:string; above?:boolean; color?:string; start?:boolean; end?:boolean }

export interface DSL { units: number; commands: Command[] }

export function parseDSL(src:string): DSL {
  const lines = src.split(/\r?\n/)
  const cmds: Command[] = []
  for (const raw of lines) {
    const line = raw.trim()
    if (!line || line.startsWith('#')) continue
    const m = /^(\w+)\((.*)\)\s*$/.exec(line)
    if (!m) continue
    const kind = m[1]; const args = splitCsv(m[2])
    try {
      if (kind==='rect') {
        const [id,w,h,x,y,text,color] = args
        cmds.push({ t:'rect', id:+id, w:+w, h:+h, x:+x, y:+y, text:unquote(text), color: color||'primary' })
      } else if (kind==='line') {
        const [id,x,y,x2,y2,width,label,above,color] = args
        cmds.push({ t:'line', id:+id, x:+x, y:+y, x2:+x2, y:+y2, width:+width, text:unquote(label||'')||undefined,
                    above: above ? /^true$/i.test(above) : undefined, color })
      } else if (kind==='arrow') {
        const [id,x,y,x2,y2,width,label,above,color,start,end] = args
        cmds.push({ t:'arrow', id:+id, x:+x, y:+y, x2:+x2, y:+y2, width:+width, text:unquote(label||'' )||undefined,
                    above: above ? /^true$/i.test(above) : undefined, color, start: toBool(start), end: toBool(end) })
      }
    } catch {}
  }
  return { units: 64, commands: cmds }
}
function toBool(s?:string){ return s ? /^true$/i.test(s) : undefined }
function unquote(s?:string){ if(!s) return ''; s=s.trim(); if(s.startsWith('"')||s.startsWith("'")) return JSON.parse(s); return s }
function splitCsv(s:string){
  const out:string[]=[]; let i=0, cur='', inQ=false, q='"'
  while(i<s.length){
    const ch=s[i++]
    if(inQ){ if(ch===q){ inQ=false } else if(ch==='\\' && s[i]===q){ cur+=q; i++ } else { cur+=ch } }
    else { if(ch===',' ){ out.push(cur.trim()); cur='' }
           else if(ch==='"' || ch==="'"){ inQ=true; q=ch }
           else { cur+=ch } }
  }
  out.push(cur.trim()); return out
}
