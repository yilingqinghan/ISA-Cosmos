import { tr } from '@/i18n'
import { syn } from '../../utils/syn'
import type { InstructionInfoProvider } from '../../types'

const info: InstructionInfoProvider = {
  id: 'riscv/add',

  metaGetter: () => ({
    usage: tr('add rd, rs1, rs2 —— 将两个源寄存器相加并写入目标寄存器', 'add rd, rs1, rs2 — add two source registers and write result to destination'),
    scenarios: [
      tr('实现整数加法运算', 'Perform integer addition'),
      tr('常见于算术计算和地址生成', 'Commonly used in arithmetic and address generation'),
      tr('循环计数器和索引计算', 'Loop counters and index calculations'),
    ],
    notes: [
      tr('操作数和结果均为寄存器宽度的整数（通常为 XLEN 位）', 'Operands and result are integers with register width (typically XLEN bits)'),
      tr('结果可能发生溢出但不产生异常', 'Overflow is ignored and does not raise exceptions'),
      tr('立即数版本由 addi 指令提供', 'Immediate form is provided by addi'),
    ],
    exceptions: [
      tr('无', 'None')
    ],
  }),

  synonymsGetter: () => ([
    syn('x86 基础指令集','x86 Base ISA',
        '整数加法','Integer add',
        '对通用寄存器执行有符号或无符号加法','Performs signed/unsigned addition on general-purpose registers',
        'ADD EAX, EBX'),
    syn('ARM A32/T32','ARM A32/T32',
        '整数加法','Integer add',
        '执行两个寄存器或寄存器与立即数的加法','Adds two registers or register and immediate',
        'ADD R0, R1, R2'),
    syn('ARMv8-A A64','ARMv8-A A64',
        '64位加法','64-bit add',
        '对 64 位通用寄存器执行加法','Performs addition on 64-bit general-purpose registers',
        'ADD X0, X1, X2'),
    syn('MIPS 基础指令集','MIPS Base ISA',
        '寄存器加法','Register add',
        '寄存器到寄存器加法，不检测溢出','Adds two registers, ignoring overflow',
        'addu $t0, $t1, $t2'),
  ]),
}

export default info
