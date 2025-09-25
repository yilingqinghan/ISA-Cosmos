import React from 'react'
import { Rect as KRect } from 'react-konva'
import { CKTheme } from '../theme'

export interface DottedGroupProps {
  x: number; y: number; w: number; h: number; radius?: number
}
export function DottedGroup({ x,y,w,h, radius=CKTheme.radius }: DottedGroupProps) {
  return (
    <>
      <KRect x={x} y={y} width={w} height={h} cornerRadius={radius} fill={CKTheme.color.overlayA} listening={false}/>
      <KRect x={x} y={y} width={w} height={h} cornerRadius={radius} stroke={CKTheme.color.dashed} dash={[6,6]} listening={false}/>
    </>
  )
}
