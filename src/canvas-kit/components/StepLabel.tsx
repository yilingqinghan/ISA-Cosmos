
import React from 'react'
import { Rect as KRect, Text as KText, Group } from 'react-konva'
import { CKTheme } from '../theme'
const hasCJK=(s?:string)=>!!s && /[\u3400-\u9FFF]/.test(s)
export default function StepLabel({x,y,text,w=70,h=32}:{x:number;y:number;text:string;w?:number;h?:number}){
  const fontFamily = hasCJK(text) ? CKTheme.font.zh : CKTheme.font.en
  return <Group listening={false}>
    <KRect x={x} y={y} width={w} height={h} cornerRadius={10} fill={CKTheme.color.muted2}/>
    <KText x={x} y={y} width={w} height={h} text={text} align="center" verticalAlign="middle"
           fill="#ffffff" fontSize={14} fontFamily={fontFamily}/>
  </Group>
}
