import { tr } from '@/i18n'
import { syn } from '../../utils/syn'
import type { InstructionInfoProvider } from '../../types'

const info: InstructionInfoProvider = {
  id: 'riscv/vadd.vv',
  metaGetter: () => ({
    usage: tr('vadd.vv vd, vs1, vs2；向量加法：vd[i] = vs1[i] + vs2[i]',
              'vadd.vv vd, vs1, vs2; Vector add: vd[i] = vs1[i] + vs2[i]'),
    scenarios: [
      tr('向量数组加法', 'Vector array addition'),
      tr('并行数据处理', 'Parallel data processing'),
      tr('科学计算',     'Scientific computing'),
    ],
    notes: [
      tr('元素宽度由 UI 的“元素位宽”决定', 'Element width follows UI "Element width"'),
      tr('支持掩码 vm（演示版未实现掩码绘制）', 'Mask vm supported (demo does not render mask)'),
      tr('目的寄存器 vd 可与源寄存器同名', 'Destination vd may equal a source'),
    ],
    exceptions: [ tr('无', 'None') ],
  }),
  synonymsGetter: () => ([
    syn('ARMv8-A NEON','ARMv8-A NEON','ADD（向量）','ADD (vector)',
        'A64 向量逐元素整数加法','A64 vector element-wise integer add',
        'ADD V0.4S, V1.4S, V2.4S',['vaddq_s32','vaddq_u8','vaddq_s16','vaddq_s64']),
    syn('x86 SSE/AVX','x86 SSE/AVX','PADDB/PADDW/PADDD/PADDQ','PADDB/PADDW/PADDD/PADDQ',
        '打包整数逐元素相加；AVX 为 VPADD*','Packed integer add; AVX uses VPADD*',
        '__m128i c = _mm_add_epi32(a,b);'),
    syn('MIPS MSA','MIPS MSA','ADDV.B/H/W/D','ADDV.B/H/W/D',
        'MSA 整数逐元素相加（非饱和）','MSA element-wise integer add (non-saturating)',
        '__m128i c = (__m128i)__msa_addv_w(a,b);'),
    syn('LoongArch LSX','LoongArch LSX','VADD.B/H/W/D','VADD.B/H/W/D',
        'LSX 128b 逐元素相加；亦有扩展位宽变体','LSX 128b element-wise add; width variants exist',
        '__m128i c = __lsx_vadd_w(a,b);'),
    syn('LoongArch LASX','LoongArch LASX','XVADD.B/H/W/D/Q','XVADD.B/H/W/D/Q',
        'LASX 256b 逐元素相加','LASX 256b element-wise add',
        '__m256i c = __lasx_xvadd_w(a,b);'),
  ]),
}

export default info