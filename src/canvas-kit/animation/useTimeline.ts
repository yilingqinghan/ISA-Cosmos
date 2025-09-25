import { useEffect, useRef, useState } from 'react'

export interface TLStep { name: string; ms: number }
export interface Timeline {
  play(): void; pause(): void; toggle(): void
  setSpeed(mult: number): void
  goto(idx: number): void
  readonly idx: number          // 当前步骤索引
  readonly t01: number          // 当前步骤 0..1 进度
  readonly playing: boolean
  readonly speed: number
}

export function useTimeline(steps: TLStep[], autoPlay = true): Timeline {
  const [idx, setIdx] = useState(0)
  const [t01, setT01] = useState(0)
  const [playing, setPlaying] = useState(autoPlay)
  const [speed, setSpeed] = useState(1)

  const ref = useRef({ start: 0, last: 0 })
  useEffect(() => {
    let raf = 0
    const tick = (ts: number) => {
      if (!playing) { raf = requestAnimationFrame(tick); return }
      const now = ts
      if (!ref.current.start) { ref.current.start = now; ref.current.last = now }
      const dt = (now - ref.current.last) * speed
      ref.current.last = now

      const dur = steps[idx].ms
      const next = Math.min(1, t01 + dt / dur)
      setT01(next)

      if (next >= 1) {
        if (idx < steps.length - 1) {
          setIdx(idx + 1); setT01(0); ref.current.start = now
        } else {
          setPlaying(false)  // 结束停止
        }
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [idx, playing, speed, steps, t01])

  return {
    play(){ setPlaying(true) },
    pause(){ setPlaying(false) },
    toggle(){ setPlaying(p => !p) },
    setSpeed(mult:number){ setSpeed(Math.max(0.25, Math.min(4, mult))) },
    goto(i:number){ setIdx(Math.max(0, Math.min(steps.length-1, i))); setT01(0); },
    get idx(){ return idx }, get t01(){ return t01 }, get playing(){ return playing }, get speed(){ return speed }
  }
}
