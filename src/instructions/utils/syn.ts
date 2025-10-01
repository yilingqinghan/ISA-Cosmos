import { tr } from '@/i18n'

export type Synonym = {
  arch: string
  name: string
  note?: string
  example?: string
  intrinsics?: string[]
}

export function syn(
  archZh: string, archEn: string,
  nameZh: string, nameEn: string,
  noteZh?: string, noteEn?: string,
  example?: string,
  intrinsics?: string[]
): Synonym {
  return {
    arch: tr(archZh, archEn),
    name: tr(nameZh, nameEn),
    note: (noteZh || noteEn) ? tr(noteZh ?? '', noteEn ?? '') : undefined,
    example,
    intrinsics
  }
}