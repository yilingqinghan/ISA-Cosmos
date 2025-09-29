import type { DSLDoc } from '../utils/parse';

type Step = { id: string; name: string };
type Anim =
  | { kind:'appear'|'disappear'; id:string; stepId:string }
  | { kind:'blink'; id:string; stepId:string; times:number; interval:number };

export class Timeline {
  private steps: Step[] = [];
  private anims: Anim[] = [];
  private cur?: Step;

  step(id: string, name: string) { const s = { id, name }; this.steps.push(s); this.cur = s; return this; }
  appear(id: string) { if (this.cur) this.anims.push({ kind:'appear', id, stepId:this.cur.id }); return this; }
  disappear(id: string) { if (this.cur) this.anims.push({ kind:'disappear', id, stepId:this.cur.id }); return this; }
  blink(id: string, times=3, interval=260) { if (this.cur) this.anims.push({ kind:'blink', id, stepId:this.cur.id, times, interval }); return this; }

  build(shapes: DSLDoc['shapes'], packOn: string[] = [], packOff: string[] = []) : DSLDoc {
    return { steps: this.steps, anims: this.anims, shapes, packOn, packOff };
  }
}