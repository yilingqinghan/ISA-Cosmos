// src/canvas-kit/components/Block.tsx
import React, { useMemo } from 'react';
import { Group, Rect, Text } from 'react-konva';
import { useApp } from '@/context';
import { fmtLane, isNumericLike } from '@/utils/format';

type Props = {
  id?: string;
  x: number; y: number;
  w: number; h: number;
  text?: string | number;
  fill?: string;
  stroke?: string;
  radius?: number;
};

/** 估算等宽字体的字符宽度比例（用于自适应字号） */
const CHAR_RATIO = 0.62;

export default function Block({
  id, x, y, w, h, text = '', fill = '#ECF0F5', stroke = '#1F2937', radius = 12,
}: Props) {
  const { base, sew } = useApp();

  const display = useMemo(() => {
    if (isNumericLike(text)) return fmtLane(text, base, sew);
    return String(text);
  }, [text, base, sew]);

  // 自适应字体大小（留一些 padding）
  const innerW = (w - 0.18) * 100;         // 你的世界坐标 -> 像素换算里，保持比例即可
  const baseFont = 20;                      // 默认字号
  let fontSize = baseFont;
  const need = display.length * baseFont * CHAR_RATIO;
  if (need > innerW) fontSize = Math.max(12, (innerW / (display.length * CHAR_RATIO)));

  return (
    <Group x={x * 100} y={y * 100} id={id}>
      <Rect
        width={w * 100}
        height={h * 100}
        fill={fill}
        stroke={stroke}
        cornerRadius={radius}
        shadowBlur={12}
        shadowColor="rgba(0,0,0,0.08)"
      />
      <Text
        text={display}
        width={w * 100}
        height={h * 100}
        fontSize={fontSize}
        fontFamily={'SFMono, ui-monospace, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace'}
        align="center"
        verticalAlign="middle"
        fill="#0F172A"
      />
    </Group>
  );
}
