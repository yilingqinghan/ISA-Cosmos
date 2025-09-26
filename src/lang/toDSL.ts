import type { Ast } from './index'

const xs = (i: number)=> (2.2 + (i-1))  // 统一栅格
const v1Val = (i:number)=> `${i}`       // demo：v1=1..N
const v2Val = (i:number)=> `${10+i-1}`  // demo：v2=10..N
const sum   = (i:number)=> `${Number(v1Val(i))+Number(v2Val(i))}`

export function astToDsl(ast: Ast, lanes=3): string {
  if (ast.arch==='rvv' && ast.opcode==='vadd' && ast.form==='vv') {
    const [vd, vs1, vs2] = ast.operands
    const L:string[] = []
    L.push(`step(s1,"第一步：载入与对齐")`)
    L.push(`step(s2,"第二步：传输")`)
    L.push(`step(s3,"第三步：写回")`)
    L.push(`label(lbl_${vs1},0.6,0.2,"${vs1}")`)
    L.push(`label(lbl_${vs2},0.6,1.8,"${vs2}")`)
    L.push(`label(lbl_${vd},0.6,3.4,"${vd}")`)
    for (let i=1;i<=lanes;i++) L.push(`rect(${vs1}_${i},1,1,${xs(i)},0.0,"${v1Val(i)}",lightgray)`)
    L.push(`group(g2,1.6,1.6,${(lanes+.6)},1.2,dotted)`)
    for (let i=1;i<=lanes;i++) L.push(`rect(${vs2}_${i},1,1,${xs(i)},1.8,"${v2Val(i)}",teal)`)
    for (let i=1;i<=lanes;i++) L.push(`rect(${vd}_${i},1,1,${xs(i)},3.4,"",lightgray)`)
    L.push(`appear(lbl_${vs1},s1); appear(lbl_${vs2},s1); appear(lbl_${vd},s1); appear(g2,s1)`)
    for (let i=1;i<=lanes;i++) L.push(`appear(${vs1}_${i},s1); appear(${vs2}_${i},s1); appear(${vd}_${i},s1)`)
    for (let i=1;i<=lanes;i++) {
      const x = xs(i)+0.5
      L.push(`arrow(a_${i},${x},1.0,${x},3.4,2.5,"",true,#22d3ee,false,true); appear(a_${i},s2); blink(a_${i},s2,4,700)`)
    }
    for (let i=1;i<=lanes;i++) {
      L.push(`disappear(a_${i},s3); disappear(${vd}_${i},s3); rect(${vd}_${i}_f,1,1,${xs(i)},3.4,"${sum(i)}",teal); appear(${vd}_${i}_f,s3)`)
    }
    L.push(`disappear(g2,s3)`)
    return L.join('\n')
  }
  // 其他指令在此扩展
  return `step(s1,"暂不支持该指令");`
}
