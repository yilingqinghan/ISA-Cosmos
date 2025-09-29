import type { DSLDoc, DSLShape } from '../utils/parse'
type Step = { id: string; name: string }
type Anim =
 | { kind: 'appear'; id: string; stepId: string }
 | { kind: 'disappear'; id: string; stepId: string }
 | { kind: 'blink'; id: string; stepId: string; times: number; interval: number }
type FlowOpts = { id?: string; width?: number; color?: string; via?: [number,number][] }
type BlinkOpts = { times?: number; interval?: number }
type HighlightOpts = { color?: string; duration?: number }
let uid = 0; const genId = (p='s')=> `${p}_${(++uid).toString(36)}`
export class Timeline {
  private steps: Step[] = []; private anims: Anim[] = []; private cur?: Step; private spawned: DSLShape[] = []
  step(id:string, name:string){ const s={id,name}; this.steps.push(s); this.cur=s; return this }
  appear(id:string){ if(this.cur) this.anims.push({kind:'appear',id,stepId:this.cur.id}); return this }
  disappear(id:string){ if(this.cur) this.anims.push({kind:'disappear',id,stepId:this.cur.id}); return this }
  blink(id:string,times=3,interval=260){ if(this.cur) this.anims.push({kind:'blink',id,stepId:this.cur.id,times,interval}); return this }
  addShape(shape:DSLShape){ this.spawned.push(shape); return this }
  fadeIn(id:string){ return this.appear(id) } fadeOut(id:string){ return this.disappear(id) }
  flow(from:[number,number], to:[number,number], opts:FlowOpts={}){ const id=opts.id||genId('flow'); const [x1,y1]=from,[x2,y2]=to; this.spawned.push({kind:'arrow',id,x1,y1,x2,y2,width:opts.width??2,color:opts.color??'#94a3b8'} as any); return this.appear(id) }
  move(targetId:string, from:[number,number], to:[number,number], opts:FlowOpts&BlinkOpts={}){ const guideId=opts.id||genId('move'); const [x1,y1]=from,[x2,y2]=to; this.spawned.push({kind:'line',id:guideId,x1,y1,x2,y2,width:opts.width??2,color:opts.color??'#94a3b8',dash:[6,6]} as any); this.appear(guideId); return this.blink(targetId, opts.times??3, opts.interval??240) }
  highlight(id:string,{duration=720}:HighlightOpts={}){ const times=Math.max(1,Math.round(duration/240)); return this.blink(id,times,240) }
  typeText(id:string,text:string,at:[number,number]){ const [x,y]=at; this.spawned.push({kind:'label',id:id||genId('label'),x,y,text} as any); return this.appear(id) }
  loop(times=2){ if(!this.cur||times<=1) return this; const c=this.cur; const list=this.anims.filter(a=>a.stepId===c.id); for(let i=1;i<times;i++){ const st:{id:string;name:string}={id:`${c.id}_loop${i}`,name:c.name}; this.steps.push(st); list.forEach(a=>this.anims.push({...a, stepId:st.id})) } return this }
  build(shapes:DSLDoc['shapes'], packOn:string[]=[], packOff:string[]=[]):DSLDoc{ return { steps:this.steps, anims:this.anims, shapes:[...shapes, ...this.spawned], packOn, packOff } }
}
