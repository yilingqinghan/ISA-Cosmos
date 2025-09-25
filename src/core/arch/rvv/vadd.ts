import { InstructionVisualizer, BuiltScene, VisualizerOptions, ParsedInstruction } from '@core/instructions/types'
import { Scene } from '@core/canvas/types'
import { rect, text, arrow } from '@core/canvas/elements'
import { Animator } from '@core/canvas/animator'

export const vadd: InstructionVisualizer = {
  kind: 'computation',
  matches: (m) => m === 'vadd',
  buildScene(instr: ParsedInstruction, opts: VisualizerOptions): BuiltScene {
    const vlen = Number(opts['vlen'] ?? 128)
    const sew = Number(opts['sew'] ?? 16)
    const lanes = Math.max(1, Math.floor(vlen / sew))
    const form = instr.form || 'vv'
    const [vd, vs1, vs2] = instr.operands

    // ↓↓↓ 缩小逻辑尺寸 + 提高控件尺寸 ==> 默认显示更大
    const logicalWidth  = 1200   // ↑ 场景更大
    const logicalHeight = 640
    const padding = 24
    const laneAreaW = logicalWidth - padding*2 - 80
    const laneW = Math.max(64, Math.floor(laneAreaW / lanes))
    const laneH = 56
    const regH  = laneH + 68
    // 文本字号/箭头线宽也相应加大，例如 15px / 3px
    

    const yBase = 100
    const gapY = 120
    const leftX = padding + 40
    const outX = padding + 40

    const scene: Scene = {
      bg: 'transparent',
      size: { width: logicalWidth, height: logicalHeight },
      fit: 'contain',
      padding,
      grid: { enabled:true, mode:'stage', type:'dots', spacing:16, color:'#e5e7eb', dotSize:1 },
      elements: []
    }

    scene.elements.push(
      text({ x: padding, y: 30, text: `RVV ${instr.raw}`, color: '#0f172a', font: '18px Inter, sans-serif' }),
      text({ x: padding, y: 54, text: `Form: ${form}   Lanes: ${lanes} (VLEN=${vlen}, SEW=${sew})`, color:'#475569', font:'13px Inter, sans-serif' }),
    )

    function reg(x: number, y: number, name: string, values: number[]){
      scene.elements.push(rect({ x, y, w: laneW*lanes, h: regH, radius:12, fill:'#ffffff', stroke:'#cbd5e1', strokeWidth:1 }))
      scene.elements.push(text({ x: x, y: y-10, text: name, color:'#0f172a', font:'14px Inter, sans-serif' }))
      for (let i=0;i<lanes;i++){
        const vx = x + i*laneW
        const vy = y + 40
        scene.elements.push(rect({ id:`lane-${name}-${i}`, x: vx+6, y: vy, w: laneW-12, h: laneH, radius:10, fill:'#ffffff', stroke:'#cbd5e1', strokeWidth:1 }))
        scene.elements.push(text({ id:`val-${name}-${i}`, x: vx+laneW/2, y: vy+laneH/2+5, text: String(values[i] ?? 0), color:'#0f172a', font:'15px Inter, sans-serif', align:'center', baseline:'middle' }))
      }
    }

    const aVals = Array.from({length: lanes}, (_,i)=> i+1)
    const bVals = Array.from({length: lanes}, (_,i)=> 10+i)
    const outVals = aVals.map((a,i)=> a + (bVals[i] ?? 0))

    reg(leftX, yBase, vs1 || 'v1', aVals)
    reg(leftX, yBase + gapY, vs2 || 'v2', bVals)
    const outY = yBase + gapY*2
    reg(outX, outY, vd || 'v0', Array(lanes).fill(0))

    for (let i=0;i<lanes;i++){
      const sx = outX + i*laneW + laneW/2
      const s1y = yBase + 40 + laneH
      const s2y = yBase + gapY + 40 + laneH
      const dy = outY + 40
      scene.elements.push(arrow({ x1:sx, y1:s1y+10, x2:sx, y2:dy-10, stroke:'#2563eb', strokeWidth:3 }))
      scene.elements.push(arrow({ x1:sx, y1:s2y+10, x2:sx, y2:dy-10, stroke:'#06b6d4', strokeWidth:3 }))
    }

    const animator = new Animator((elapsed, sc) => {
      const step = Math.floor(elapsed / 600) % (lanes + 2)

      for (let i=0;i<lanes;i++){
        const ids = [`lane-${vs1 || 'v1'}-${i}`, `lane-${vs2 || 'v2'}-${i}`, `lane-${vd || 'v0'}-${i}`]
        for (const id of ids){
          const el = sc.elements.find(e => (e as any).id === id)
          if (el && el.type === 'rect'){
            el.stroke = '#cbd5e1'; el.fill = '#ffffff'; el.shadow = false
          }
        }
        const outText = sc.elements.find(e => (e as any).id === `val-${vd || 'v0'}-${i}`)
        if (outText && outText.type === 'text'){ outText.text = '' }
      }

      if (step < lanes) {
        const i = step
        const a = sc.elements.find(e => (e as any).id === `lane-${vs1 || 'v1'}-${i}`)
        const b = sc.elements.find(e => (e as any).id === `lane-${vs2 || 'v2'}-${i}`)
        const o = sc.elements.find(e => (e as any).id === `lane-${vd || 'v0'}-${i}`)
        if (a && a.type==='rect'){ a.stroke = '#2563eb'; a.shadow = true }
        if (b && b.type==='rect'){ b.stroke = '#06b6d4'; b.shadow = true }
        if (o && o.type==='rect'){ o.stroke = '#16a34a'; o.shadow = true }
        const outText = sc.elements.find(e => (e as any).id === `val-${vd || 'v0'}-${i}`)
        if (outText && outText.type==='text'){ outText.text = String(outVals[i] ?? 0) }
      } else {
        for (let i=0;i<lanes;i++){
          const o = sc.elements.find(e => (e as any).id === `lane-${vd || 'v0'}-${i}`)
          if (o && o.type==='rect'){ o.stroke = '#16a34a'; o.shadow = (Math.floor(elapsed/220)%2===0) }
        }
      }
    }, 60)

    return { scene, animator }
  }
}
