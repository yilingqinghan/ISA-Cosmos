// src/lang/autoreg.ts
// 只负责把所有 *.instr.ts 拉进来触发 register*，不要导出任何东西
const _mods = import.meta.glob('./**/*.instr.ts', { eager: true })

// （可选调试）
// console.debug('[autoreg] loaded:', Object.keys(_mods))