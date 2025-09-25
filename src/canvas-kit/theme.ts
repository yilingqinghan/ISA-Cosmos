export const CKTheme = {
  radius: 10,
  grid: { color: '#E6EBF2', spacing: 18, dotSize: 1, type: 'dots' as const },
  font: {
    en: 'Futura, "Futura PT", Avenir, "Helvetica Neue", Arial, sans-serif',
    zh: 'STFangsong, "华文仿宋", FangSong, "Songti SC", "Songti SC Regular", serif',
  },
  color: {
    text: '#0F172A', muted: '#6B7280',
    stroke: '#0F172A', dashed: '#94A3B8',
    primary: '#10BDB0', primaryBg: '#6FE7DA',
    whiteBg: '#FFFFFF', darkBg: '#0F172A', darkText: '#FFFFFF',
    overlayA: 'rgba(102, 204, 204, 0.18)',
  }
}
export type CKThemeType = typeof CKTheme
