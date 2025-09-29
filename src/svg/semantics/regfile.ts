import type { DSLShape } from '../../utils/parse'
export function regfile(opts:{ id:string; x:number; y:number; lanes:number; w?:number; h?:number; gap?:number; title?:string; laneColor?:string; boxColor?:string; laneText?:(i:number)=>string }): DSLShape[]{
  const {id,x,y,lanes,w=4,h=1,gap=0.1,title,laneColor='lightgray',laneText}=opts
  const laneW=(w-gap*(lanes+1))/lanes, laneH=h-gap*2
  const shapes:DSLShape[]=[{kind:'group',id:`${id}__box`,x,y,w,h} as any]
  for(let i=0;i<lanes;i++){ const lx=x+gap+i*(laneW+gap), ly=y+gap; const laneId=`${id}[${i}]`; const text=laneText?laneText(i):''; shapes.push({kind:'rect',id:laneId,x:lx,y:ly,w:laneW,h:laneH,color:laneColor,text} as any) }
  if(title){ shapes.push({kind:'text',id:`${id}__title`,x:x+w/2,y:y-0.25,text:title,align:'center',size:16} as any) }
  return shapes
}
