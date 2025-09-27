export type AsmArch = 'rvv' | 'arm-sve' | 'x86-avx' // 先有 rvv
export type AsmForm = 'vv' | 'vx' | 'vi'            // 先支持你需要的
export interface AsmAst {
  arch: AsmArch
  opcode: string       // vadd / vsub / vmul ...
  form: AsmForm        // vv/vx/vi
  operands: string[]   // 解析后的操作数，去空格：["v0","v1","v2"]
  line: number         // 报错定位
  col: number
}