// src/canvas-kit/components/GridOverlay.tsx
import React, { useMemo } from "react";
import { Group, Line } from "react-konva";

export type GridStyle = {
  /** 网格的世界坐标间距（以你 DSL 的“1 格”为单位） */
  spacing?: number;       // default 0.6
  /** 每隔多少条次网格画一条主网格（0 或 1 表示全是主网格） */
  majorEvery?: number;    // default 4
  /** 线宽（像素） */
  strokeWidth?: number;   // default 1
  /** 次网格颜色（淡） */
  color?: string;         // default #E5E7EB
  /** 主网格颜色（稍深） */
  majorColor?: string;    // default #CBD5E1
};

type Props = {
  width: number;
  height: number;
  /** 等同于你的 zoom（stage/layer scale） */
  scale: number;
  /** 等同于你的平移（layer x/y）——世界(0,0)映射到屏幕的位置 */
  offset: { x: number; y: number };
  style?: GridStyle;
};

const defaults: Required<GridStyle> = {
  spacing: 0.6,
  majorEvery: 4,
  strokeWidth: 1,
  color: "#E5E7EB",
  majorColor: "#CBD5E1",
};

export default function GridOverlay({
  width,
  height,
  scale,
  offset,
  style,
}: Props) {
  const s = { ...defaults, ...(style || {}) };

  const { vLines, hLines } = useMemo(() => {
    // 屏幕 -> 世界的可视范围
    const leftW = (-offset.x) / scale;
    const topW = (-offset.y) / scale;
    const rightW = leftW + width / scale;
    const bottomW = topW + height / scale;

    // 适配过密的情况：屏幕上两条线的像素间距 < 10px 时自动增大步长
    let worldStep = s.spacing;
    let pxStep = worldStep * scale;
    if (pxStep < 10) {
      const mult = Math.ceil(10 / pxStep);
      worldStep *= mult;
      pxStep *= mult;
    }

    const startX = Math.floor(leftW / worldStep) * worldStep;
    const startY = Math.floor(topW / worldStep) * worldStep;

    const v: { x: number; major: boolean }[] = [];
    for (let x = startX; x <= rightW + 1e-6; x += worldStep) {
      const idx = Math.round(x / s.spacing);              // 用原 spacing 判定“第几条”
      const major =
        s.majorEvery <= 1 ? true : (idx % s.majorEvery === 0);
      v.push({ x: x * scale + offset.x, major });
    }

    const h: { y: number; major: boolean }[] = [];
    for (let y = startY; y <= bottomW + 1e-6; y += worldStep) {
      const idx = Math.round(y / s.spacing);
      const major =
        s.majorEvery <= 1 ? true : (idx % s.majorEvery === 0);
      h.push({ y: y * scale + offset.y, major });
    }

    return { vLines: v, hLines: h };
  }, [width, height, scale, offset.x, offset.y, s.spacing, s.majorEvery]);

  return (
    <Group listening={false}>
      {vLines.map((l, i) => (
        <Line
          key={`v${i}`}
          points={[l.x, 0, l.x, height]}
          stroke={l.major ? s.majorColor : s.color}
          strokeWidth={s.strokeWidth}
          perfectDrawEnabled={false}
        />
      ))}
      {hLines.map((l, i) => (
        <Line
          key={`h${i}`}
          points={[0, l.y, width, l.y]}
          stroke={l.major ? s.majorColor : s.color}
          strokeWidth={s.strokeWidth}
          perfectDrawEnabled={false}
        />
      ))}
    </Group>
  );
}
