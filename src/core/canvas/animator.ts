import { Scene } from './types'

export class Animator {
  private t0: number | null = null
  private last: number = 0
  private speed: number
  private stepMs: number
  private update: (elapsed: number, scene: Scene) => void

  private paused = false
  private holdElapsed = 0  // 记录暂停时的累计时间

  constructor(update: (elapsed: number, scene: Scene) => void, fps = 60){
    this.update = update
    this.speed = 1
    this.stepMs = 1000 / fps
  }

  tick(now: number, scene: Scene){
    if (this.t0 == null) this.t0 = now

    if (this.paused) {
      // 暂停时维持最后一帧（可选：周期性重绘以适配某些浏览器清屏）
      if (now - this.last >= this.stepMs) {
        this.update(this.holdElapsed, scene)
        this.last = now
      }
      return
    }

    const elapsed = (now - this.t0) * this.speed
    this.holdElapsed = elapsed

    if (now - this.last >= this.stepMs){
      this.update(elapsed, scene)
      this.last = now
    }
  }

  /** 设置倍速（允许 0 表示“静止增量”，但推荐使用 pause/resume 控制） */
  setSpeed(mult: number){
    this.speed = Math.max(0, Math.min(4, mult))
  }

  pause(){ this.paused = true }
  resume(){ this.paused = false }
  toggle(){ this.paused = !this.paused; return this.paused }
  isPaused(){ return this.paused }
  getSpeed(){ return this.speed }
}
