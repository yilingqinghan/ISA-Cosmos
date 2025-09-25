
import React from 'react'
import { Rect as KRect, Text as KText } from 'react-konva'
import { CKTheme } from '../theme'
const hasCJK=(s?:string)=>!!s && /[\u3400-\u9FFF]/.test(s)
export default function StepLabel({x,y,text,w=70,h=30}:{x:number;y:number;text:string;w?:number;h?:number}){
  const fontFamily = hasCJK(text) ? CKTheme.font.zh : CKTheme.font.en
  return <>
    <KRect x={x} y={y} width={w} height={h} cornerRadius={6} fill={CKTheme.color.darkBg}/>
    <KText x={x} y={y} width={w} height={h} text={text} align="center" verticalAlign="middle" fill={CKTheme.color.darkText}
           fontSize={14} fontFamily={fontFamily}/>
  </>
}
