import { Scene, SceneEl, GridOptions } from './types'
import { Animator } from './animator'

export class CanvasEngine {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private scene: Scene = { elements: [], bg: 'transparent' }
  private raf: number | null = null
  private animator: Animator | null = null

  // 记录基础变换（自适应得到的居中/缩放）
  private baseScale = 1
  private baseOx = 0
  private baseOy = 0

  // 用户交互相机（在基础变换上叠加）
  private user = { scale: 1, x: 0, y: 0 }
  private scaleMin = 0.25
  private scaleMax = 6

  constructor(canvas: HTMLCanvasElement){
    const ctx = canvas.getContext('2d')
    if(!ctx) throw new Error('Canvas 2D context not available')
    this.canvas = canvas
    this.ctx = ctx
    this.resize()
  }

  resize(){
    const dpr = Math.max(1, window.devicePixelRatio || 1)
    const { clientWidth:w, clientHeight:h } = this.canvas
    this.canvas.width = Math.max(1, Math.floor(w*dpr))
    this.canvas.height = Math.max(1, Math.floor(h*dpr))
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    this.draw()
  }

  setScene(scene: Scene){
    this.scene = scene
    this.draw()
  }

  setAnimator(anim: Animator | null){
    this.animator = anim
  }

  start(){
    if (this.raf) return
    const loop = (t: number) => {
      this.animator?.tick(t, this.scene)
      this.draw()
      this.raf = window.requestAnimationFrame(loop)
    }
    this.raf = window.requestAnimationFrame(loop)
  }

  stop(){
    if (this.raf) {
      window.cancelAnimationFrame(this.raf)
      this.raf = null
    }
  }

  clear(){
    this.stop()
    this.scene = { elements: [], bg: 'transparent' }
    this.draw()
  }

  /** ======== 交互 API ======== */

  resetView(){
    this.user = { scale: 1, x: 0, y: 0 }
    this.draw()
  }

  setZoom(scale: number){
    this.user.scale = clamp(scale, this.scaleMin, this.scaleMax)
    this.draw()
  }

  getZoom(){ return this.user.scale }

  pan(dx: number, dy: number){
    this.user.x += dx
    this.user.y += dy
    this.draw()
  }

  /** 以指针点为中心缩放（client 坐标） */
  zoomAt(clientX: number, clientY: number, factor: number){
    const rect = this.canvas.getBoundingClientRect()
    const cx = clientX - rect.left
    const cy = clientY - rect.top

    // 变更前，把指针下的场景点算出来
    const scenePt = this.clientToScene(cx, cy)

    // 应用缩放
    const next = clamp(this.user.scale * factor, this.scaleMin, this.scaleMax)
    this.user.scale = next

    // 调整平移，使指针下的场景点保持在同一屏幕位置
    const sx = this.sceneToClientX(scenePt.x)
    const sy = this.sceneToClientY(scenePt.y)
    this.user.x += cx - sx
    this.user.y += cy - sy

    this.draw()
  }

  /** client -> scene （基于最近一帧的变换） */
  private clientToScene(cx: number, cy: number){
    const x = (cx - this.baseOx - this.user.x) / (this.baseScale * this.user.scale)
    const y = (cy - this.baseOy - this.user.y) / (this.baseScale * this.user.scale)
    return { x, y }
  }
  private sceneToClientX(x: number){
    return this.baseOx + this.user.x + x * (this.baseScale * this.user.scale)
  }
  private sceneToClientY(y: number){
    return this.baseOy + this.user.y + y * (this.baseScale * this.user.scale)
  }

  /** ======== 渲染 ======== */

  private draw(){
    const ctx = this.ctx
    const { width, height } = this.canvas

    // 清屏
    ctx.save()
    ctx.setTransform(1,0,0,1,0,0)
    ctx.clearRect(0, 0, width, height)
    ctx.restore()

    // 背景交给 scene.bg（透明即可与页面无缝）
    const bg = this.scene.bg ?? 'transparent'
    if (bg !== 'transparent') {
      ctx.fillStyle = bg
      ctx.fillRect(0,0,width,height)
    }

    // 计算基础变换（自适应）
    const cw = this.canvas.clientWidth
    const ch = this.canvas.clientHeight
    const logicalW = this.scene.size?.width ?? cw
    const logicalH = this.scene.size?.height ?? ch
    const pad = this.scene.padding ?? 24
    const fit = this.scene.fit ?? 'contain'

    const sx = (cw - pad*2) / logicalW
    const sy = (ch - pad*2) / logicalH
    this.baseScale = fit === 'contain' ? Math.min(sx, sy) : fit === 'cover' ? Math.max(sx, sy) : 1
    this.baseOx = (cw - logicalW * this.baseScale) / 2
    this.baseOy = (ch - logicalH * this.baseScale) / 2

    // 叠加用户相机
    ctx.save()
    ctx.translate(this.baseOx + this.user.x, this.baseOy + this.user.y)
    ctx.scale(this.baseScale * this.user.scale, this.baseScale * this.user.scale)

    // 网格（在场景坐标里绘制）
    if (this.scene.grid?.enabled) {
      this.drawGrid(this.scene.grid, logicalW, logicalH)
    }

    // 元素
    for (const el of this.scene.elements) {
      if (el.visible === false) continue
      ctx.globalAlpha = el.opacity ?? 1
      switch (el.type) {
        case 'rect': this.drawRect(el); break
        case 'line': this.drawLine(el); break
        case 'arrow': this.drawArrow(el); break
        case 'text': this.drawText(el); break
      }
      ctx.globalAlpha = 1
    }

    ctx.restore()
  }

  private drawGrid(g: GridOptions, w: number, h: number){
    const spacing = g.spacing ?? 24
    const color = g.color ?? '#e2e8f0'
    const type = g.type ?? 'dots'
    const ctx = this.ctx
    if (type === 'dots') {
      const r = (g.dotSize ?? 1.5)
      ctx.fillStyle = color
      ctx.globalAlpha = 0.8
      for (let x=0; x<=w; x+=spacing){
        for (let y=0; y<=h; y+=spacing){
          ctx.beginPath()
          ctx.arc(x, y, r, 0, Math.PI*2)
          ctx.fill()
        }
      }
      ctx.globalAlpha = 1
    } else {
      ctx.strokeStyle = color
      ctx.lineWidth = g.lineWidth ?? 1
      ctx.globalAlpha = 0.6
      for (let x=0; x<=w; x+=spacing){
        ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,h); ctx.stroke()
      }
      for (let y=0; y<=h; y+=spacing){
        ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(w,y); ctx.stroke()
      }
      ctx.globalAlpha = 1
    }
  }

  private drawRect(el: SceneEl){
    if (el.type !== 'rect') return
    const ctx = this.ctx
    const r = el.radius ?? 8
    ctx.beginPath()
    roundedRectPath(ctx, el.x, el.y, el.w, el.h, r)
    if (el.shadow) {
      ctx.save()
      ctx.shadowColor = 'rgba(0,0,0,0.12)'
      ctx.shadowBlur = 12
      ctx.shadowOffsetY = 4
      ctx.fillStyle = el.fill || '#ffffff'
      ctx.fill()
      ctx.restore()
    } else if (el.fill) {
      ctx.fillStyle = el.fill
      ctx.fill()
    }
    if (el.stroke) {
      ctx.strokeStyle = el.stroke
      ctx.lineWidth = el.strokeWidth ?? 1
      ctx.stroke()
    }
  }

  private drawLine(el: SceneEl){
    if (el.type !== 'line') return
    const ctx = this.ctx
    ctx.beginPath()
    ctx.moveTo(el.x1, el.y1)
    ctx.lineTo(el.x2, el.y2)
    ctx.lineWidth = el.strokeWidth ?? 2
    ctx.strokeStyle = el.stroke || '#94a3b8'
    // @ts-ignore
    if ((el as any).dash) ctx.setLineDash((el as any).dash)
    ctx.stroke()
    ctx.setLineDash([])
  }

  private drawArrow(el: SceneEl){
    if (el.type !== 'arrow') return
    const ctx = this.ctx
    const { x1, y1, x2, y2 } = el
    const dx = x2 - x1, dy = y2 - y1
    const len = Math.hypot(dx, dy) || 1
    const ux = dx / len, uy = dy / len
    const head = 10
    ctx.beginPath()
    ctx.moveTo(x1, y1)
    ctx.lineTo(x2 - ux*head, y2 - uy*head)
    ctx.lineWidth = el.strokeWidth ?? 2
    ctx.strokeStyle = el.stroke || '#2563eb'
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(x2, y2)
    ctx.lineTo(x2 - ux*head - uy*4, y2 - uy*head + ux*4)
    ctx.lineTo(x2 - ux*head + uy*4, y2 - uy*head - ux*4)
    ctx.closePath()
    ctx.fillStyle = el.stroke || '#2563eb'
    ctx.fill()
  }

  private drawText(el: SceneEl){
    if (el.type !== 'text') return
    const ctx = this.ctx
    ctx.font = el.font || '12px Inter, sans-serif'
    ctx.textAlign = el.align || 'left'
    ctx.textBaseline = el.baseline || 'alphabetic'
    ctx.fillStyle = el.color || '#0f172a'
    ctx.fillText(el.text, el.x, el.y)
  }
}

function roundedRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number){
  const rr = Math.min(r, w/2, h/2)
  ctx.moveTo(x+rr, y)
  ctx.arcTo(x+w, y, x+w, y+h, rr)
  ctx.arcTo(x+w, y+h, x, y+h, rr)
  ctx.arcTo(x, y+h, x, y, rr)
  ctx.arcTo(x, y, x+w, y, rr)
  ctx.closePath()
}

function clamp(x: number, a: number, b: number){ return Math.min(b, Math.max(a, x)) }
