export const CKTheme = {
    radius: 10,
    grid: { color: '#E6EBF2', spacing: 18, dotSize: 1, type: 'dots' as const },
  
    // 画面配色（对齐你给的图）
    color: {
      text:       '#0F172A',
      muted:      '#6B7280',
      stroke:     '#0F172A',      // 深描边（白块的黑描边）
      dashed:     '#94A3B8',      // 虚线/辅助
      primary:    '#10BDB0',      // 青绿描边
      primaryBg:  '#6FE7DA',      // 青绿填充
      whiteBg:    '#FFFFFF',      // 白方块
      darkBg:     '#0F172A',      // 黑方块
      darkText:   '#FFFFFF',      // 黑底白字
      overlayA:   'rgba(102, 204, 204, 0.18)', // 组高亮浅青
    }
  }
  export type CKThemeType = typeof CKTheme
  