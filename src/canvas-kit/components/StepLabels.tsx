import React from 'react'
import { Rect as KRect, Text as KText, Group } from 'react-konva'
import { CKTheme } from '../theme'

export function StepLabel({ x, y, text, w=64, h=28 }: { x:number; y:number; text:string; w?:number; h?:number }) {
  return (
    <Group listening={false}>
      <KRect x={x} y={y} width={w} height={h} cornerRadius={6} fill={CKTheme.color.darkBg}/>
      <KText
        x={x} y={y} width={w} height={h}
        text={text}
        align="center" verticalAlign="middle"
        fill={CKTheme.color.darkText}
        fontSize={13} fontFamily="Inter, ui-sans-serif"
      />
    </Group>
  )
}
