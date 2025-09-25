
export async function fetchDSL({arch, opcode, form}:{arch:'rvv'; opcode:string; form:string}){
  const url = `/api/dsl?arch=${encodeURIComponent(arch)}&opcode=${encodeURIComponent(opcode)}&form=${encodeURIComponent(form)}`
  try{
    const res = await fetch(url)
    if(res.ok){
      return await res.json()  // 约定返回 {text:string, steps?:[{id,name}]}
    }
  }catch{}
  // 本地演示用 Fallback（与后端对齐的 JSON 结构）
  const text = `
# RVV vadd.vv 演示 DSL（单位 1=72px）
step(s1,"第一步：载入与对齐")
label(v1,1.6,0.2,"v1")
label(v2,1.6,1.8,"v2")
label(v0,1.6,3.4,"v0")
rect(x1,1,1,2.2,0.0,"1",lightgray)
rect(x2,1,1,3.2,0.0,"2",lightgray)
rect(x3,1,1,4.2,0.0,"3",lightgray)
group(g2,2.2,1.6,5.5,1.2,dotted)
rect(y1,1,1,2.2,1.8,"10",teal)
rect(y2,1,1,3.2,1.8,"11",teal)
rect(y3,1,1,4.2,1.8,"12",teal)
appear(x1,s1); appear(x2,s1); appear(x3,s1); appear(y1,s1); appear(y2,s1); appear(y3,s1)

step(s2,"第二步：传输")
arrow(a1,2.7,1.0,2.7,3.4,2.2,"",true,#10BDB0,false,true)
arrow(a2,3.7,2.8,3.7,3.4,2.2,"",true,#06b6d4,false,true)
blink(a1,s2,3,700); blink(a2,s2,3,700)

step(s3,"第三步：写回")
rect(z1,1,1,2.2,3.4,"11",teal)
rect(z2,1,1,3.2,3.4,"13",teal)
rect(z3,1,1,4.2,3.4,"",lightgray)
appear(z1,s3); appear(z2,s3); appear(z3,s3)
`
  const steps = [
    {id:'s1', name:'第一步：载入与对齐'},
    {id:'s2', name:'第二步：传输'},
    {id:'s3', name:'第三步：写回'},
  ]
  return { text, steps }
}
