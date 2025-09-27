import { dbg } from './debug';

type Q = { arch: 'rvv'; opcode: string; form: string };

// 只用绝对字面量 glob（Vite 规范），最稳妥
const localModules = import.meta.glob('/src/dsl/**/*.dsl', { as: 'raw', eager: true }) as Record<string, string>;

function charCodes(s: string, n = 16) {
  return Array.from(s.slice(0, n)).map((ch) => ch.charCodeAt(0));
}