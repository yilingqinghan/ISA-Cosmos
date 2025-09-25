// 轻量日志工具（仅 DEBUG 打开时输出）
export const DEBUG_ON =
  (typeof localStorage !== 'undefined' && localStorage.getItem('DEBUG_DSL') === '1') ||
  (typeof window !== 'undefined' && (window as any).DEBUG_DSL === true);

type L = 'log' | 'info' | 'warn' | 'error' | 'debug';

function out(level: L, tag: string, ...args: any[]) {
  if (!DEBUG_ON) return;
  const fn = (console as any)[level] ?? console.log;
  fn.call(console, `%c[${tag}]`, 'color:#8b5cf6;font-weight:600', ...args);
}

export const dbg = {
  log: (...a: any[]) => out('log', 'DSL', ...a),
  info: (...a: any[]) => out('info', 'DSL', ...a),
  warn: (...a: any[]) => out('warn', 'DSL', ...a),
  err:  (...a: any[]) => out('error','DSL', ...a),
  raw:   (...a: any[]) => { if (DEBUG_ON) console.log(...a); },
};
