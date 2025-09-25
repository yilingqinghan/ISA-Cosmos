// src/canvas-kit/KitStage.tsx
import React, { useEffect, useRef, useState } from "react";
import { Stage, Layer, Group } from "react-konva";
import GridOverlay, { GridStyle } from "./components/GridOverlay";

type Props = {
  contentSize: { width: number; height: number };  // 世界内容边界（仅用于初始居中）
  zoom: number;                                    // 现有的缩放
  onResetSignal?: number;
  children: React.ReactNode;
  /** 新增：是否显示全屏坐标网格 */
  showGrid?: boolean;
  /** 新增：网格样式 */
  gridStyle?: GridStyle;
};

export function KitStage({
  contentSize,
  zoom,
  onResetSignal,
  children,
  showGrid = true,
  gridStyle,
}: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 300, h: 300 });

  // 你的平移状态（layer 的 x/y）
  const [pan, setPan] = useState({ x: 0, y: 0 });

  // 自适应容器
  useEffect(() => {
    const ro = new ResizeObserver(() => {
      if (!wrapRef.current) return;
      setSize({
        w: wrapRef.current.clientWidth,
        h: wrapRef.current.clientHeight,
      });
    });
    if (wrapRef.current) ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, []);

  // 复位：让内容大致居中（可按你的逻辑）
  useEffect(() => {
    if (!wrapRef.current) return;
    const cx = (size.w - contentSize.width * zoom) / 2;
    const cy = (size.h - contentSize.height * zoom) / 2;
    setPan({ x: cx, y: cy });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onResetSignal, size.w, size.h, zoom]);

  // 简单拖拽（如已有可忽略）
  const dragging = useRef(false);
  const last = useRef({ x: 0, y: 0 });
  const onDown = (e: any) => {
    dragging.current = true;
    last.current = e.evt ? { x: e.evt.clientX, y: e.evt.clientY } : { x: 0, y: 0 };
  };
  const onMove = (e: any) => {
    if (!dragging.current) return;
    const cur = e.evt ? { x: e.evt.clientX, y: e.evt.clientY } : { x: 0, y: 0 };
    setPan((p) => ({ x: p.x + (cur.x - last.current.x), y: p.y + (cur.y - last.current.y) }));
    last.current = cur;
  };
  const onUp = () => (dragging.current = false);

  return (
    <div ref={wrapRef} className="kitstage-wrap" style={{ width: "100%", height: "100%" }}>
      <Stage
        width={size.w}
        height={size.h}
        onMouseDown={onDown}
        onMouseMove={onMove}
        onMouseUp={onUp}
      >
        {/* 背景层：全屏网格（不依赖原点，整屏铺开） */}
        <Layer listening={false}>
          {showGrid && (
            <GridOverlay
              width={size.w}
              height={size.h}
              scale={zoom}
              offset={{ x: pan.x, y: pan.y }}
              style={gridStyle}
            />
          )}
        </Layer>

        {/* 内容层：带缩放/平移 */}
        <Layer x={pan.x} y={pan.y} scaleX={zoom} scaleY={zoom}>
          <Group>{children}</Group>
        </Layer>
      </Stage>
    </div>
  );
}

export default KitStage;
