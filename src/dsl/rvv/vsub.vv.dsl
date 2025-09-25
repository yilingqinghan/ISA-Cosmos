
step(s1,"第一步：载入"); step(s2,"第二步：计算")
label(v1,0.6,0.2,"v1"); label(v2,0.6,1.8,"v2"); label(v0,0.6,3.4,"v0")
rect(x1,1,1,2.2,0.0,"9",lightgray); appear(x1,s1)
rect(y1,1,1,2.2,1.8,"4",teal);      appear(y1,s1)
arrow(a1,2.7,1.0,2.7,3.4,2.8,"",true,#0EA5E9,false,true); appear(a1,s2); blink(a1,s2,8,500)
rect(z1,1,1,2.2,3.4,"5",teal); appear(z1,s2)
