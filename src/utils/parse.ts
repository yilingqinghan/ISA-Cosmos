export type DSLShape =
  | { kind:'rect'; id:string; w:number; h:number; x:number; y:number; text?:string; color?:string }
  | { kind:'line'; id:string; x1:number; y1:number; x2:number; y2:number; width?:number; label?:string; above?:boolean; color?:string }
  | { kind:'arrow'; id:string; x1:number; y1:number; x2:number; y2:number; width?:number; label?:string; above?:boolean; color?:string; start?:boolean; end?:boolean }
  | { kind:'label'; id:string; x:number; y:number; text:string }
  | { kind:'group'; id:string; x:number; y:number; w:number; h:number; style?:'dotted'|'solid' }

export type Step = { id:string; name:string }
export type AnimAppear    = { kind:'appear';    id:string; stepId:string }
export type AnimDisappear = { kind:'disappear'; id:string; stepId:string }
export type AnimBlink     = { kind:'blink';     id:string; stepId:string; times:number; period:number }
export type DSLAnim = AnimAppear | AnimDisappear | AnimBlink

export interface DSLDoc { shapes: DSLShape[]; steps: Step[]; anims: DSLAnim[] }

function num(v:string){ return Number(v.trim()) }
function str(v:string){ return v.trim().replace(/^\"|\"$/g,'').replace(/^'|'$/g,'') }

export function parseDSL(src:string):DSLDoc{
  const shapes:DSLShape[]=[]; const anims:DSLAnim[]=[]; const steps:Step[]=[]
  const lines=src.split(/\r?\n/)
  for(const raw of lines){
    const line=raw.trim()
    if(!line || line.startsWith('#')) continue
    const m=/^(\w+)\((.*)\)$/.exec(line); if(!m) continue
    const fn=m[1]; const args=m[2].split(',').map(s=>s.trim())
    try{
      if(fn==='rect'){
        const [id,w,h,x,y,text,color]=args
        shapes.push({kind:'rect', id, w:num(w), h:num(h), x:num(x), y:num(y), text: text? str(text): undefined, color: color? str(color): undefined})
      }else if(fn==='line'){
        const [id,x1,y1,x2,y2,width,label,above,color]=args
        shapes.push({kind:'line', id, x1:num(x1), y1:num(y1), x2:num(x2), y2:num(y2), width: width? num(width): undefined, label: label? str(label): undefined, above: above==='true', color: color? str(color): undefined})
      }else if(fn==='arrow'){
        const [id,x1,y1,x2,y2,width,label,above,color,st,en]=args
        shapes.push({kind:'arrow', id, x1:num(x1), y1:num(y1), x2:num(x2), y2:num(y2), width: width? num(width): undefined, label: label? str(label): undefined, above: above==='true', color: color? str(color): undefined, start: st==='true', end: en==='false'? false : true })
      }else if(fn==='label'){
        const [id,x,y,text]=args; shapes.push({kind:'label', id, x:num(x), y:num(y), text:str(text)})
      }else if(fn==='group'){
        const [id,x,y,w,h,style]=args; shapes.push({kind:'group', id, x:num(x), y:num(y), w:num(w), h:num(h), style: style? (str(style) as any): 'dotted'})
      }else if(fn==='step'){
        const [id,name]=args; steps.push({id, name: str(name)})
      }else if(fn==='appear'){
        const [id,stepId]=args; anims.push({kind:'appear', id, stepId})
      }else if(fn==='disappear'){
        const [id,stepId]=args; anims.push({kind:'disappear', id, stepId})
      }else if(fn==='blink'){
        const [id,stepId,times,period]=args; anims.push({kind:'blink', id, stepId, times: times? num(times):3, period: period? num(period):600})
      }
    }catch{}
  }
  return { shapes, steps, anims }
}