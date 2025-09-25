import { dbg } from './debug';

type Q = { arch: 'rvv'; opcode: string; form: string };

// 只用绝对字面量 glob（Vite 规范），最稳妥
const localModules = import.meta.glob('/src/dsl/**/*.dsl', { as: 'raw', eager: true }) as Record<string, string>;

function charCodes(s: string, n = 16) {
  return Array.from(s.slice(0, n)).map((ch) => ch.charCodeAt(0));
}

export async function fetchDSL({ arch, opcode, form }: Q): Promise<{ text: string; steps?: { id: string; name: string }[] }> {
  const key = `${arch}/${opcode}.${form}.dsl`;

  // 1) 本地优先
  const hit = Object.entries(localModules).find(([k]) => k.endsWith(key));
  if (hit) {
    const [path, textRaw] = hit;
    // 去掉 BOM
    const text = textRaw.replace(/^\uFEFF/, '');
    dbg.info('use local:', key, 'from', path);
    dbg.log('text length:', text.length, 'head:', JSON.stringify(text.slice(0, 80)));
    dbg.log('head charCodes:', charCodes(text).join(','));
    if (!text.trim()) dbg.warn('local text is EMPTY after trim!');
    return { text };
  }

  // 2) 远程（仅当本地无匹配时）
  try {
    const url = `/api/dsl?arch=${encodeURIComponent(arch)}&opcode=${encodeURIComponent(opcode)}&form=${encodeURIComponent(form)}`;
    const res = await fetch(url);
    dbg.info('try remote:', url, 'status=', res.status);
    if (res.ok) {
      const data = await res.json().catch(() => ({} as any));
      if (typeof data?.text === 'string') {
        const text = data.text.replace(/^\uFEFF/, '');
        dbg.info('use remote:', url, 'len=', text.length);
        dbg.log('remote head:', JSON.stringify(text.slice(0, 80)));
        return { text, steps: data.steps };
      }
    }
  } catch (e) {
    dbg.warn('remote error:', e);
  }

  // 3) 内置兜底，避免空白
  const builtin: Record<string, string> = {
    'rvv/vadd.vv.dsl': `
step(s1,"第一步：载入与对齐"); step(s2,"第二步：传输"); step(s3,"第三步：写回")
label(v1,0.6,0.2,"v1"); label(v2,0.6,1.8,"v2"); label(v0,0.6,3.4,"v0")
rect(x1,1,1,2.2,0.0,"1",lightgray); rect(x2,1,1,3.2,0.0,"2",lightgray); rect(x3,1,1,4.2,0.0,"3",lightgray)
group(g2,1.6,1.6,6.2,1.2,dotted)
rect(y1,1,1,2.2,1.8,"10",teal); rect(y2,1,1,3.2,1.8,"11",teal); rect(y3,1,1,4.2,1.8,"12",teal)
rect(z1,1,1,2.2,3.4,"",lightgray); rect(z2,1,1,3.2,3.4,"",lightgray); rect(z3,1,1,4.2,3.4,"",lightgray)
appear(v1,s1); appear(v2,s1); appear(v0,s1); appear(x1,s1); appear(x2,s1); appear(x3,s1); appear(g2,s1); appear(y1,s1); appear(y2,s1); appear(y3,s1)
arrow(a1,2.7,1.0,2.7,3.4,2.8,"",true,#0EA5E9,false,true); arrow(a2,3.7,1.0,3.7,3.4,2.8,"",true,#22d3ee,false,true)
appear(a1,s2); appear(a2,s2); blink(a1,s2,6,700); blink(a2,s2,6,700)
appear(z1,s3); appear(z2,s3); appear(z3,s3); disappear(a1,s3); disappear(a2,s3); disappear(g2,s3)
disappear(z3,s3); rect(z1f,1,1,2.2,3.4,"11",teal); appear(z1f,s3); rect(z2f,1,1,3.2,3.4,"13",teal); appear(z2f,s3)
`.replace(/^\uFEFF/, ''),
  };

  const k = `${arch}/${opcode}.${form}.dsl`;
  if (builtin[k]) {
    dbg.warn('use builtin fallback:', k);
    const text = builtin[k];
    dbg.log('builtin head:', JSON.stringify(text.slice(0, 80)));
    return { text };
  }

  const placeholder = `step(s1,"未找到 DSL: ${arch}/${opcode}.${form}")\nlabel(t,1,1,"${opcode}.${form}")`;
  dbg.warn('fallback to placeholder');
  return { text: placeholder };
}
