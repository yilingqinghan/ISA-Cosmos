
import React from 'react'
import { Rect as KRect } from 'react-konva'
import { CKTheme } from '../theme'
export default function DottedGroup({x,y,w,h,radius=CKTheme.radius}:{x:number;y:number;w:number;h:number;radius?:number}){
  return <>
    <KRect x={x} y={y} width={w} height={h} cornerRadius={radius} fill={CKTheme.color.overlayA}/>
    <KRect x={x} y={y} width={w} height={h} cornerRadius={radius} stroke={CKTheme.color.dashed} dash={[6,6]}/>
  </>
}
