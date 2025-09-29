import React from 'react';

const CANVAS_W = 1200, CANVAS_H = 900;

export function SvgStage({
  zoom = 1,
  showGrid = true,
  children,
}: { zoom?: number; showGrid?: boolean; children: React.ReactNode }) {
  const spacing = 0.2 * 96; // 和现有 PX 换算一致
  const majorEvery = 5;

  return (
    <svg width="100%" height="100%" viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id="gridMinor" width={spacing} height={spacing} patternUnits="userSpaceOnUse">
          <path d={`M ${spacing} 0 H 0 V ${spacing}`} fill="none" stroke="#EEF2F7" strokeWidth={0.5} shapeRendering="crispEdges"/>
        </pattern>
        <pattern id="gridMajor" width={spacing * majorEvery} height={spacing * majorEvery} patternUnits="userSpaceOnUse">
          <rect width="100%" height="100%" fill="url(#gridMinor)"/>
          <path d={`M ${spacing * majorEvery} 0 H 0 V ${spacing * majorEvery}`} fill="none" stroke="#E5E7EB" strokeWidth={0.5} shapeRendering="crispEdges"/>
        </pattern>
        <filter id="dropShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity="0.22"/>
        </filter>
        <marker id="arrow" orient="auto" markerWidth="12" markerHeight="12" refX="9" refY="6">
          <path d="M0,0 L0,12 L12,6 z"/>
        </marker>
      </defs>

      {showGrid && <rect x={0} y={0} width={CANVAS_W} height={CANVAS_H} fill="url(#gridMajor)"/>}
      <g transform={`scale(${zoom})`}>{children}</g>
    </svg>
  );
}