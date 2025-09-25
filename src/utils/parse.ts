import { dbg, DEBUG_ON } from './debug';

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

const toNum = (s:string)=> Number(String(s).trim());
const unq = (s:string)=> String(s).trim().replace(/^"|"$|^'|'$/g,'');

// —— 语句分割 —— //
function splitStatements(src:string): string[] {
  const out:string[] = [];
  let buf = '';
  let quote: '"' | "'" | null = null;
  let atLineStart = true;

  src = src.replace(/^\uFEFF/, ''); // 去 BOM
  const push = () => { const s = buf.trim(); if (s) out.push(s); buf=''; };

  for (let i=0;i<src.length;i++){
    const ch = src[i];

    // 兼容 \r\n / \r / \n
    if (ch === '\r'){
      if (src[i+1] === '\n') i++;
      if (!quote) { push(); atLineStart = true; continue; }
      buf += '\n'; atLineStart = true; continue;
    }
    if (ch === '\n'){
      if (!quote) { push(); atLineStart = true; continue; }
      buf += ch; atLineStart = true; continue;
    }

    // 行首注释（避免把 #0EA5E9 误当注释）
    if (!quote && atLineStart){
      if (ch === '#'){
        while (i<src.length && src[i] !== '\n' && src[i] !== '\r') i++;
        i--; atLineStart = true; continue;
      }
      if (ch === '/' && src[i+1] === '/'){
        while (i<src.length && src[i] !== '\n' && src[i] !== '\r') i++;
        i--; atLineStart = true; continue;
      }
    }

    // 引号开关
    if (ch === '"' || ch === "'"){
      if (quote === ch) quote = null;
      else if (!quote) quote = ch;
      buf += ch; atLineStart = false; continue;
    }

    // 语句结束：分号（引号外）
    if (ch === ';' && !quote){ push(); atLineStart = false; continue; }

    buf += ch;
    if (ch !== ' ' && ch !== '\t') atLineStart = false;
  }
  push();

  if (DEBUG_ON) {
    dbg.info('splitStatements -> count:', out.length);
    out.slice(0, 20).forEach((s, i) => dbg.log(`stmt[${i}]`, JSON.stringify(s)));
  }
  return out;
}

// —— 参数拆分 —— //
function splitArgs(argstr:string): string[] {
  const out:string[] = [];
  let buf = '';
  let quote: '"' | "'" | null = null;
  for (let i=0;i<argstr.length;i++){
    const ch = argstr[i];
    if (ch === '"' || ch === "'"){
      if (quote === ch) quote = null;
      else if (!quote) quote = ch;
      buf += ch; continue;
    }
    if (ch === ',' && !quote){ out.push(buf.trim()); buf=''; continue; }
    buf += ch;
  }
  if (buf.trim()) out.push(buf.trim());
  return out;
}

// —— 主解析 —— //
export function parseDSL(src:string): DSLDoc{
  const shapes:DSLShape[]=[]; const anims:DSLAnim[]=[]; const steps:Step[]=[];
  if (!src || !src.trim()) { dbg.warn('parseDSL: empty src'); return { shapes, steps, anims }; }

  const stmts = splitStatements(src);
  const re = /^(\w+)\s*\((.*)\)$/; // ★ 正确写法：不要过度转义

  for (let i=0;i<stmts.length;i++){
    const stmt = stmts[i].trim();
    const m = re.exec(stmt);
    if (!m) { dbg.warn('NO MATCH stmt', i, JSON.stringify(stmt.slice(0, 120))); continue; }
    const fn = m[1]; const args = splitArgs(m[2]);

    try{
      if(fn==='rect'){ const [id,w,h,x,y,text,color]=args;
        shapes.push({kind:'rect', id, w:toNum(w), h:toNum(h), x:toNum(x), y:toNum(y), text: text? unq(text): undefined, color: color? unq(color): undefined});
      }else if(fn==='line'){ const [id,x1,y1,x2,y2,width,label,above,color]=args;
        shapes.push({kind:'line', id, x1:toNum(x1), y1:toNum(y1), x2:toNum(x2), y2:toNum(y2), width: width? toNum(width): undefined, label: label? unq(label): undefined, above: above==='true', color: color? unq(color): undefined});
      }else if(fn==='arrow'){ const [id,x1,y1,x2,y2,width,label,above,color,st,en]=args;
        shapes.push({kind:'arrow', id, x1:toNum(x1), y1:toNum(y1), x2:toNum(x2), y2:toNum(y2), width: width? toNum(width): undefined, label: label? unq(label): undefined, above: above==='true', color: color? unq(color): undefined, start: st==='true', end: en==='false'? false : true });
      }else if(fn==='label'){ const [id,x,y,text]=args;
        shapes.push({kind:'label', id, x:toNum(x), y:toNum(y), text: unq(text)});
      }else if(fn==='group'){ const [id,x,y,w,h,style]=args;
        shapes.push({kind:'group', id, x:toNum(x), y:toNum(y), w:toNum(w), h:toNum(h), style: style? (unq(style) as any): 'dotted'});
      }else if(fn==='step'){ const [id,name]=args;
        steps.push({id, name: unq(name)});
      }else if(fn==='appear'){ const [id,stepId]=args;
        anims.push({kind:'appear', id, stepId});
      }else if(fn==='disappear'){ const [id,stepId]=args;
        anims.push({kind:'disappear', id, stepId});
      }else if(fn==='blink'){ const [id,stepId,times,period]=args;
        anims.push({kind:'blink', id, stepId, times: times? toNum(times):3, period: period? toNum(period):600});
      }else{
        dbg.warn('UNKNOWN fn', fn, 'stmt=', JSON.stringify(stmt));
      }
      if (DEBUG_ON) dbg.log(`OK fn=${fn} args=${args.length}`, args);
    }catch(e){
      dbg.err('parse error at stmt', i, 'fn=', fn, e);
    }
  }

  if (DEBUG_ON) {
    const byKind: Record<string, number> = {};
    shapes.forEach(s => byKind[s.kind] = (byKind[s.kind] ?? 0) + 1);
    dbg.info('summary:', { steps: steps.length, shapes: shapes.length, anims: anims.length, byKind });
  }
  return { shapes, steps, anims };
}
