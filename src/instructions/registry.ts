import type { InstructionModule, InstructionMeta } from './types'
const modules = import.meta.glob('./**/*.ts', { eager: true }) as Record<string, any>
export const instructionRegistry: Record<string, InstructionModule> = {}
export const miniDocs: Record<string, InstructionMeta> = {}
function isModule(x:any): x is InstructionModule { return x && typeof x==='object' && typeof x.id==='string' && typeof x.build==='function' }
for (const p in modules) {
  const mod = modules[p]; const cand:any[]=[];
  if (isModule(mod?.default)) cand.push(mod.default);
  for (const k of Object.keys(mod)) { if (k==='default') continue; const v=mod[k]; if (isModule(v)) cand.push(v) }
  for (const m of cand) { instructionRegistry[m.id]=m; if (m.meta){ miniDocs[m.id]=m.meta; miniDocs[m.id.replace('/', '.')]=m.meta } }
}
export const getInstrModule = (k:string)=> instructionRegistry[k]
