import React, { useEffect, useMemo, useRef, useState } from 'react'
import { parseDSL, DSLDoc, DSLShape } from '../../utils/parse'
import { useApp } from '../../context'
import { Select } from "@ui/Select";
import { useFormat, fmt, formatStore } from '../../state/formatStore'
import { RightNotch } from '../nav/NavBar'

// ---- LocalStorage helpers for UI prefs ----
const PREFS_KEY = 'isaViz.canvas.prefs.v1'
const FORMAT_KEY = 'isaViz.format.v1'
function readJSON<T>(k:string): T | null {
  try { const raw = localStorage.getItem(k); return raw ? JSON.parse(raw) as T : null } catch { return null }
}
function writeJSON(k:string, v:any){ try { localStorage.setItem(k, JSON.stringify(v)) } catch {} }

// ---- Lane/Vec 结构 ----
type LaneRect = { id:string; x:number; y:number; w:number; h:number; text?:string; color?:string }
type VecGroup = { baseId:string; lanes: LaneRect[]; box?: {x:number;y:number;w:number;h:number} }

// 提取 lane 基名，如 v0[1] / v0_1 / v0-1 / v0.1 → v0
function laneBase(id: string): string | null {
  const m =
    id.match(/^([A-Za-z_]\w*)\[(\d+)\]$/) ||
    id.match(/^([A-Za-z_]\w*)[._-](\d+)$/);
  return m ? m[1] : null;
}

// ========== 变更 1：collectVecGroups 支持 allow 白名单（来自 DSL 的 pack(...)） ==========
function collectVecGroups(shapes: DSLShape[], allowSet = new Set<string>()): VecGroup[] {
  const map = new Map<string, VecGroup>()
  const boxes: Record<string, {x:number;y:number;w:number;h:number}> = {}

  // 1) 收集外框 __box
  for (const s of shapes) {
    if (s.kind === 'group' && /__box$/.test(s.id)) {
      const baseId = s.id.replace(/__box$/, '')
      boxes[baseId] = { x: s.x, y: s.y, w: s.w, h: s.h }
      if (!map.has(baseId)) map.set(baseId, { baseId, lanes: [], box: boxes[baseId] })
    }
  }

  // 2) 把每个 rect 归入 vec
  for (const s of shapes) {
    if (s.kind !== 'rect') continue;

    let baseId: string | null = null;

    // 显式命名：v1[0] / v1_0 / v1-0 / v1.0 都识别
    const m =
      s.id.match(/^([a-zA-Z_]\w*)\[(\d+)\]$/) ||
      s.id.match(/^([a-zA-Z_]\w*)[._-](\d+)$/);

    if (m && boxes[m[1]]) {
      // 有 __box → 直接按 box 归组
      baseId = m[1];
    } else if (m && allowSet.has(m[1])) {
      // 没有 __box，但在 pack 白名单 → 按名称归组（支持 nobox）
      baseId = m[1];
    } else {
      // 否则仅在几何上位于某个 __box 内时归组；没有 __box 一律不归组
      const cx = s.x + s.w / 2, cy = s.y + s.h / 2;
      for (const [bid, b] of Object.entries(boxes)) {
        if (cx >= b.x && cx <= b.x + b.w && cy >= b.y && cy <= b.y + b.h) { baseId = bid; break; }
      }
    }

    if (!baseId || (!boxes[baseId] && !allowSet.has(baseId))) continue; // 防止误并
    const g = map.get(baseId) ?? { baseId, lanes: [], box: boxes[baseId] };
    g.lanes.push({ id: s.id, x: s.x, y: s.y, w: s.w, h: s.h, text: s.text, color: s.color });
    map.set(baseId, g);
  }


  // 3) 排序输出
  const groups: VecGroup[] = []
  map.forEach((g) => {
    g.lanes.sort((a, b) => a.x - b.x)
    groups.push(g)
  })
  return groups
}

// 自适应字号
function fitFontSize(txt: string, widthPx: number, maxSize=28, pad=24) {
  const approxChar = 0.58;
  const need = txt.length * maxSize * approxChar + pad * 2
  if (need <= widthPx) return maxSize
  const s = Math.max(12, Math.floor((widthPx - pad*2) / (txt.length * approxChar)))
  return Math.min(maxSize, s)
}

const PX = (u: number) => u * 96
const COLOR: Record<string,string> = {
  lightgray:'#F4F6FA', teal:'#59E0D0', black:'#0B1220',
  '#0EA5E9':'#0EA5E9', '#22d3ee':'#22d3ee', '#111827':'#111827', '#94a3b8':'#94a3b8'
}


const col = (c?:string) => (c && COLOR[c]? COLOR[c] : (c || '#94a3b8'))

// —— Cross‑arch synonyms ——
export type SynItem = { arch: string; name: string; note?: string; example?: string }

// --- Safe DSL parse helpers ---
const EMPTY_DOC: DSLDoc = { steps: [], anims: [], shapes: [], packOn: [], packOff: [] }
function safeParseDSL(s?: string | null): DSLDoc {
  try { return s ? parseDSL(s) : EMPTY_DOC } catch { return EMPTY_DOC }
}

// ===== Lightweight SVG primitives to replace react-konva =====
const CANVAS_W = 1200;
const CANVAS_H = 900;

type GroupProps = {
  x?: number;
  y?: number;
  opacity?: number;
  listening?: boolean;
  children?: React.ReactNode;
};
function Group({ x = 0, y = 0, opacity = 1, listening = true, children }: GroupProps) {
  return (
    <g
      transform={`translate(${x},${y})`}
      opacity={opacity}
      pointerEvents={listening === false ? 'none' : undefined}
    >
      {children}
    </g>
  );
}

type RectProps = {
  x?: number;
  y?: number;
  width: number;
  height: number;
  cornerRadius?: number;
  fill?: string;
  stroke?: string;
  dash?: number[];
  opacity?: number;
  listening?: boolean;
  shadowBlur?: number;
  shadowColor?: string; // kept for API parity; color comes from filter
};
function Rect({
  x = 0,
  y = 0,
  width,
  height,
  cornerRadius = 0,
  fill,
  stroke,
  dash,
  opacity = 1,
  listening = true,
  shadowBlur,
}: RectProps) {
  const filter = shadowBlur ? 'url(#dropShadow)' : undefined;
  return (
    <rect
      x={x}
      y={y}
      width={width}
      height={height}
      rx={cornerRadius}
      ry={cornerRadius}
      fill={fill}
      stroke={stroke}
      strokeDasharray={dash ? dash.join(' ') : undefined}
      opacity={opacity}
      filter={filter}
      pointerEvents={listening === false ? 'none' : undefined}
    />
  );
}

type TextAlign = 'left' | 'center' | 'right';
type VAlign = 'top' | 'middle' | 'bottom';

type TextProps = {
  text: string | number;
  x: number;
  y: number;
  width?: number;
  height?: number;
  align?: TextAlign;
  verticalAlign?: VAlign;
  fontSize?: number;
  fill?: string;
  opacity?: number;
  listening?: boolean;
  fontFamily?: string;
};
function Text({
  text,
  x,
  y,
  width,
  height,
  align = 'left',
  verticalAlign = 'top',
  fontSize = 16,
  fill = '#0f172a',
  opacity = 1,
  listening = true,
  fontFamily,
}: TextProps) {
  let tx = x;
  let ty = y;
  let textAnchor: 'start' | 'middle' | 'end' = 'start';
  let dominantBaseline: string = 'text-before-edge';

  if (width != null) {
    if (align === 'center') {
      textAnchor = 'middle';
      tx = x + width / 2;
    } else if (align === 'right') {
      textAnchor = 'end';
      tx = x + width;
    }
  }
  if (height != null) {
    if (verticalAlign === 'middle') {
      dominantBaseline = 'middle';
      ty = y + height / 2;
    } else if (verticalAlign === 'bottom') {
      dominantBaseline = 'text-after-edge';
      ty = y + height;
    } else {
      dominantBaseline = 'text-before-edge';
    }
  }

  return (
    <text
      x={tx}
      y={ty}
      textAnchor={textAnchor}
      dominantBaseline={dominantBaseline}
      fontSize={fontSize}
      fill={fill}
      opacity={opacity}
      pointerEvents={listening === false ? 'none' : undefined}
      style={fontFamily ? { fontFamily } : undefined}
    >
      {String(text)}
    </text>
  );
}

type LineProps = {
  points?: number[]; // [x1,y1,x2,y2,...]
  x1?: number;
  y1?: number;
  x2?: number;
  y2?: number;
  stroke?: string;
  strokeWidth?: number;
  opacity?: number;
  listening?: boolean;
  closed?: boolean;
  fill?: string;
};
function Line({
  points,
  x1,
  y1,
  x2,
  y2,
  stroke = '#000',
  strokeWidth = 2,
  opacity = 1,
  listening = true,
  closed,
  fill,
}: LineProps) {
  const common = {
    stroke,
    strokeWidth,
    opacity,
    pointerEvents: listening === false ? 'none' : undefined,
  } as any;

  if (points && points.length >= 4) {
    const pts = points.reduce((acc: string[], v, i) => {
      if (i % 2 === 1) acc.push(`${points[i - 1]},${v}`);
      return acc;
    }, []).join(' ');
    if (closed) {
      return <polygon points={pts} fill={fill} {...common} />;
    }
    return <polyline points={pts} fill="none" {...common} />;
  }
  return <line x1={x1} y1={y1} x2={x2} y2={y2} {...common} />;
}

// 动画参数
const STEP_MS = 1600
const APPEAR_MS = 420
const DISAPPEAR_MS = 320
const BLINK_MIN = 0.55
const BLINK_MAX = 1.00

// 仅渲染一段 Text，跟随数制/位宽
function FmtText({
  value,
  x, y, width, height,
  align = 'center' as 'left'|'center'|'right',
  vAlign = 'middle' as 'top'|'middle'|'bottom',
  fontSize = 28,
  color = '#0B1220',
  fontFamily = "'Futura','STFangsong','PingFang SC','Microsoft YaHei',system-ui",
}: {
  value: string | number
  x: number; y: number; width: number; height: number
  align?: 'left'|'center'|'right'
  vAlign?: 'top'|'middle'|'bottom'
  fontSize?: number; color?: string
  fontFamily?: string
}) {
  const snap = useFormat()
  const txt = fmt(value, snap.base, snap.hexDigits)
  return (
    <Text
      text={txt}
      x={x} y={y} width={width} height={height}
      align={align} verticalAlign={vAlign}
      fontSize={fontSize} fill={color}
      listening={false}
      fontFamily={fontFamily}
    />
  )
}

function FlyItem({ id, title, icon, openId, setOpenId, children }: {
  id: string;
  title?: string;
  icon: React.ReactNode;
  openId: string | null;
  setOpenId: (v: string | null) => void;
  children: React.ReactNode;
}) {
  const open = openId === id;
  return (
    <div
      onMouseEnter={()=>setOpenId(id)}
      onMouseLeave={()=>setOpenId(null)}
      style={{ position:'relative' }}
    >
      <button title={title} className="btn icon" style={{width:36, height:36, minWidth:36, minHeight:36, borderRadius:8, display:'inline-flex', alignItems:'center', justifyContent:'center', border:'1px solid #e5e7eb', background:'#fff', boxShadow:'0 1px 2px rgba(0,0,0,0.06)', cursor:'pointer', padding:0}}>
        {icon}
      </button>
      <div
        style={{
          position:'absolute',
          left: 44 + 8,
          top: 0,
          zIndex: 20,
          background:'#ffffff',
          border:'1px solid #e5e7eb',
          borderRadius: 12,
          boxShadow:'0 10px 24px rgba(0,0,0,0.12), 0 2px 6px rgba(0,0,0,0.08)',
          padding:'8px 10px',
          display:'flex', alignItems:'center', gap:8,
          transform: open ? 'translateX(0)' : 'translateX(-6px)',
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
          transition:'opacity .16s ease, transform .16s ease'
        }}
      >
        {children}
      </div>
    </div>
  )
}

export default function CanvasKitPanel() {
  const [showGrid, setShowGrid] = useState(true);
  const { arch, opcode, form, pushLog, clearLogs, dslOverride, logs } = useApp()
  const [dsl, setDsl] = useState('')
  const [doc, setDoc] = useState<DSLDoc>({ steps:[], shapes:[], anims:[], packOn:[], packOff:[] })
  const [stepIdx, setStepIdx] = useState(0)
  const [zoom, setZoom] = useState(1)
  const [resetTick, setResetTick] = useState(0)
  const [synonyms, setSynonyms] = useState<SynItem[]>([])
  // —— Pan (drag to move) ——
  const [pan, setPan] = useState<{x:number;y:number}>({ x: 0, y: 0 })
  const panRef = useRef<{x:number;y:number}>({ x: 0, y: 0 })
  const dragRef = useRef<{active:boolean;sx:number;sy:number;px:number;py:number}>({ active:false, sx:0, sy:0, px:0, py:0 })
  const [isPanning, setIsPanning] = useState(false)
  const svgRef = useRef<SVGSVGElement|null>(null)
  // keep panRef in sync with state
  useEffect(()=>{ panRef.current = pan }, [pan])

  // reset pan when user triggers reset
  useEffect(()=>{ setPan({x:0,y:0}) }, [resetTick])
  // Convert screen delta (px) to user units in viewBox, considering zoom
  function pxToUser(dx:number, dy:number){
    const el = svgRef.current
    if (!el) return { ux: 0, uy: 0 }
    const rect = el.getBoundingClientRect()
    const ux = dx * (CANVAS_W / rect.width)   // ← 不再除以 zoom
    const uy = dy * (CANVAS_H / rect.height)  // ← 不再除以 zoom
    return { ux, uy }
  }

  // 将鼠标 client 坐标转换为用户坐标（考虑 viewBox、pan 与 zoom）
  function clientToUser(clientX:number, clientY:number){
    const el = svgRef.current
    if (!el) return { ux: 0, uy: 0 }
    const rect = el.getBoundingClientRect()
    // 把像素转换为 viewBox 下的用户单位（与 zoom 无关）
    const vx = (clientX - rect.left) * (CANVAS_W / rect.width)
    const vy = (clientY - rect.top)  * (CANVAS_H / rect.height)
    // 反变换：U = (V/zoom) - pan
    const ux = vx / zoom - panRef.current.x
    const uy = vy / zoom - panRef.current.y
    return { ux, uy }
  }

  const onPointerDown: React.PointerEventHandler<SVGSVGElement> = (e) => {
    // 只屏蔽右键
    if (e.button === 2) return
    try { (e.currentTarget as any).setPointerCapture?.(e.pointerId) } catch {}
    dragRef.current.active = true
    dragRef.current.sx = e.clientX
    dragRef.current.sy = e.clientY
    dragRef.current.px = panRef.current.x
    dragRef.current.py = panRef.current.y
    setIsPanning(true)
    e.preventDefault()
  }

  const onPointerMove: React.PointerEventHandler<SVGSVGElement> = (e) => {
    if (!dragRef.current.active) return
    const dx = e.clientX - dragRef.current.sx
    const dy = e.clientY - dragRef.current.sy
    const { ux, uy } = pxToUser(dx, dy)
    setPan({ x: dragRef.current.px + ux, y: dragRef.current.py + uy })
  }

  const endPan = (e?: React.PointerEvent<SVGSVGElement>) => {
    if (!dragRef.current.active) return
    dragRef.current.active = false
    setIsPanning(false)
    try { e?.currentTarget?.releasePointerCapture?.(e.pointerId) } catch {}
  }
  const onPointerUp: React.PointerEventHandler<SVGSVGElement> = (e) => { endPan(e) }
  const onPointerLeave: React.PointerEventHandler<SVGSVGElement> = (e) => { endPan(e) }

  // Ctrl/Cmd + 滚轮缩放（以鼠标位置为锚点）
  const onWheel: React.WheelEventHandler<SVGSVGElement> = (e) => {
    if (!(e.ctrlKey || e.metaKey)) return; // 仅在按下 Ctrl/Cmd 时拦截
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.1 : 1/1.1
    const zNew = Math.max(0.5, Math.min(2, +(zoom * factor).toFixed(4)))
    if (zNew === zoom) return

    // 计算鼠标对应的用户坐标（缩放锚点）
    const { ux, uy } = clientToUser(e.clientX, e.clientY)

    // 保持鼠标位置下的对象在屏幕不动：(U + panNew)*zNew = (U + panOld)*zOld
    const panNewX = ((ux + panRef.current.x) * zoom / zNew) - ux
    const panNewY = ((uy + panRef.current.y) * zoom / zNew) - uy

    setZoom(zNew)
    setPan({ x: panNewX, y: panNewY })
  }
  const fmtSnap = useFormat()
  useEffect(() => {
    if (!dslOverride) return
    // 如果提供的是对象文档，直接应用；否则走文本解析
    // @ts-ignore: 兼容 { doc } | { text }
    if (dslOverride.doc) {
      // @ts-ignore
      const next: DSLDoc = dslOverride.doc
      setDoc(next)
      // 尝试从多个来源读取同义指令（模块侧传入）：
      // 1) dslOverride.extras.synonyms（LeftPanel 透传）
      // 2) next.synonyms（模块直接挂到 doc 上）
      // 3) next.extras?.synonyms（某些模块可能把 extras 挂到 doc 内）
      // @ts-ignore
      const sx: SynItem[] = (dslOverride.extras?.synonyms as SynItem[])
        ?? ((next as any).synonyms as SynItem[])
        ?? ((next as any).extras?.synonyms as SynItem[])
        ?? []
      const arr = Array.isArray(sx) ? sx : []
      setSynonyms(arr)
      // 调试输出：观察来源与数量
      dbg('synonyms src =', {
        fromOverride: !!(dslOverride as any)?.extras?.synonyms,
        fromDoc: !!(next as any)?.synonyms,
        fromDocExtras: !!(next as any)?.extras?.synonyms,
        count: Array.isArray(sx) ? sx.length : 'not-array'
      })
      setStepIdx(0); stepStartRef.current = performance.now(); setResetTick(t=>t+1)
      return
    }
    // @ts-ignore
    setDsl(dslOverride.text ?? '')
    // 保留上一次的同义指令，避免“模块 → 文本覆盖”导致的闪断
  }, [dslOverride?.rev, arch, opcode, form])
  // --- Debug/log always on (expert mode) ---
  const debugOn = true
  const debug = true
  const dbg = (...args: any[]) => {
    if (!debugOn) return;
    const line = args.map((x)=> (typeof x === 'string' ? x : JSON.stringify(x))).join(' ')
    // 写入控制台 + 左侧 Logs 面板
    // 控制台带统一前缀便于过滤
    // 面板只收短文本，避免超长
    console.debug('[DSL]', ...args)
    try { pushLog(line.length > 400 ? line.slice(0, 400) + ' …' : line) } catch {}
  }

  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)
  const stepStartRef = useRef<number>(performance.now())
  const [clock, setClock] = useState(0)
  const [regWide, setRegWide] = useState(false)
  const [hotkeyOpen, setHotkeyOpen] = useState(true)
  const [toolbarVisible, setToolbarVisible] = useState(true)
  const [logsOpen, setLogsOpen] = useState(false)
  // 独立的“同义指令”浮动面板（可开关）
  const [synOpen, setSynOpen] = useState(true)
  // 当前展开的悬停抽屉 id（工具条 hover 时右侧拉出设置）
  const [flyOpenId, setFlyOpenId] = useState<string|null>(null)

  // Restore UI prefs on mount
  useEffect(()=>{
    const p = readJSON<any>(PREFS_KEY)
    if (p) {
      if (typeof p.showGrid === 'boolean') setShowGrid(!!p.showGrid)
      if (typeof p.speed === 'number') setSpeed(Math.max(0.25, Math.min(8, p.speed)))
      if (typeof p.zoom === 'number') setZoom(Math.max(0.5, Math.min(2, p.zoom)))
      if (typeof p.regWide === 'boolean') setRegWide(!!p.regWide)
      if (typeof p.toolbarVisible === 'boolean') setToolbarVisible(!!p.toolbarVisible)
      if (typeof p.hotkeyOpen === 'boolean') setHotkeyOpen(!!p.hotkeyOpen)
      // (debugOn is now a constant, ignore restore)
    }
    // restore format (base / hexDigits)
    const f = readJSON<any>(FORMAT_KEY)
    if (f) {
      if (f.base === 'dec' || f.base === 'hex') formatStore.setBase(f.base)
    }
  },[])

  // Persist UI prefs when changed (debounced)
  useEffect(()=>{
    const id = setTimeout(()=>{
      writeJSON(PREFS_KEY, {
        showGrid, speed, zoom, regWide, toolbarVisible, hotkeyOpen
      })
    }, 200)
    return ()=> clearTimeout(id)
  }, [showGrid, speed, zoom, regWide, toolbarVisible, hotkeyOpen])

  // Persist format (base/hexDigits) when changed
  useEffect(()=>{
    writeJSON(FORMAT_KEY, { base: fmtSnap.base, hexDigits: fmtSnap.hexDigits })
  }, [fmtSnap.base, fmtSnap.hexDigits])

  // ==== Icon button styles ====
  const iconBtn: React.CSSProperties = {
    width: 36, height: 36, minWidth: 36, minHeight: 36,
    borderRadius: 8,
    display: 'inline-flex',
    alignItems: 'center', justifyContent: 'center',
    border: '1px solid #e5e7eb',
    background: '#ffffff',
    boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
    cursor: 'pointer',
    fontSize: 12,
    padding: 0,
    flex: '0 0 auto'
  }

  useEffect(()=>{
    const d = safeParseDSL(dsl)
    setDoc(d); setStepIdx(0); stepStartRef.current = performance.now(); setResetTick(t=>t+1)
    dbg('parse done:', { steps: d.steps.length, shapes: d.shapes.length, anims: d.anims.length, packOn: d.packOn, packOff: d.packOff })
  },[dsl])

  const appearAt = useMemo(()=>{
    const m = new Map<string, number>()
    doc.anims.forEach(a=>{ if(a.kind==='appear') m.set(a.id, doc.steps.findIndex(s=>s.id===a.stepId)) })
    return m
  },[doc])
  const disappearAt = useMemo(()=>{
    const m = new Map<string, number>()
    doc.anims.forEach(a=>{ if(a.kind==='disappear') m.set(a.id, doc.steps.findIndex(s=>s.id===a.stepId)) })
    return m
  },[doc])
  const blinkMap = useMemo(()=>{
    const m = new Map<string, {step:number; times:number; interval:number}[]>()
    doc.anims.forEach(a=>{
      if(a.kind==='blink'){
        const st = doc.steps.findIndex(s=>s.id===a.stepId)
        const arr = m.get(a.id) ?? []
        arr.push({ step: st, times: a.times, interval: a.interval })
        m.set(a.id, arr)
      }
    })
    return m
  },[doc])

  // RAF（只在需要时运行）：播放中，或手动切换步骤后的短暂过渡期
  useEffect(() => {
    const TRANSITION_MS = Math.max(APPEAR_MS, DISAPPEAR_MS) + 50; // 过渡缓冲

    // 是否需要时钟驱动：播放中，或暂停但处于过渡时间窗
    const needClock = () => {
      if (playing) return true;
      const now = performance.now();
      return (now - stepStartRef.current) < TRANSITION_MS;
    };

    if (!doc.steps.length || !needClock()) return; // 不需要则不占用 rAF

    let raf = 0;
    const loop = (t: number) => {
      // 播放时推进步骤；暂停时只用于让过渡动画自然结束
      if (playing && doc.steps.length > 0) {
        const elapsed = (t - stepStartRef.current) * speed;
        const atLast = stepIdx >= doc.steps.length - 1;
        if (!atLast && elapsed >= STEP_MS) {
          setStepIdx((i) => {
            const n = Math.min(doc.steps.length - 1, i + 1);
            if (n !== i) stepStartRef.current = t;
            return n;
          });
        } else if (atLast) {
          // 到达最后一步后，等待转场结束即自动停止刷新，避免持续占用 GPU
          if (elapsed >= TRANSITION_MS) {
            setPlaying(false);
          }
        }
      }

      // 仅当仍然需要时钟时才触发重绘；否则停止 rAF，避免空转占用 GPU
      if (needClock()) {
        setClock(t);
        raf = requestAnimationFrame(loop);
      }
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [playing, speed, doc.steps.length, stepIdx]);

  const stepName = doc.steps[stepIdx]?.name ?? ''

  // ========== 变更 2：把 DSL 的 packOn 做成白名单，传给收集函数 ==========
  const allowSet = useMemo(() => {
    const set = new Set(doc.packOn ?? []);
    if (set.size === 0) {
      // 当 DSL 未显式 pack(...) 时，尝试自动推断：
      // 1) 只统计形如 base[idx] / base_idx / base-idx / base.idx 的 lane
      // 2) 跳过 VRF 顶排（以 rf_ 开头）
      const cnt = new Map<string, number>();
      for (const s of doc.shapes) {
        if (s.kind !== 'rect') continue;
        const base = laneBase(s.id);
        if (!base) continue;
        if (base.startsWith('rf_')) continue; // 不合并 VRF 顶行
        cnt.set(base, (cnt.get(base) || 0) + 1);
      }
      cnt.forEach((n, b) => { if (n >= 2) set.add(b); });
    }
    return set;
  }, [doc.packOn, doc.shapes]);
  useEffect(()=>{
    dbg('allowSet =', Array.from(allowSet))
  }, [allowSet])

  // 注意：用 allowSet 调 collectVecGroups
  const vecGroups = useMemo(() => collectVecGroups(doc.shapes, allowSet), [doc.shapes, allowSet]);
  useEffect(()=>{
    const summary = vecGroups.map(g => ({ base: g.baseId, lanes: g.lanes.map(l=>l.id) }))
    dbg('vecGroups =', summary)
  }, [vecGroups])

  // 过渡
  const elapsedInCurrentStep = () => (performance.now() - stepStartRef.current) * speed
  const appearAlpha = (id:string): number => {
    const ap = appearAt.has(id) ? appearAt.get(id)! : -1
    if (ap < 0) return 1
    if (stepIdx < ap) return 0
    if (stepIdx > ap) return 1
    const t = elapsedInCurrentStep()
    return Math.max(0, Math.min(1, t / APPEAR_MS))
  }
  const disappearAlpha = (id:string): number => {
    const dp = disappearAt.has(id) ? disappearAt.get(id)! : Infinity
    if (stepIdx < dp) return 1
    if (stepIdx > dp) return 0
    const t = elapsedInCurrentStep()
    return 1 - Math.max(0, Math.min(1, t / DISAPPEAR_MS))
  }
  const blinkAlpha = (id:string): number => {
    const cfgs = blinkMap.get(id)
    if (!cfgs || !cfgs.length) return 1
    const cfg = cfgs.find(c=>c.step===stepIdx)
    if (!cfg) return 1
    const elapsed = elapsedInCurrentStep()
    const total = cfg.times * cfg.interval
    if (elapsed >= total) return 1
    const local = (elapsed % cfg.interval) / cfg.interval
    const wave = 0.5 - 0.5 * Math.cos(local * Math.PI * 2)
    return BLINK_MIN + (BLINK_MAX - BLINK_MIN) * wave
  }
  const isVisibleLogical = (id:string) => {
    const ap = appearAt.has(id) ? appearAt.get(id)! : -1
    const dp = disappearAt.has(id) ? disappearAt.get(id)! : Infinity
    return stepIdx >= ap && stepIdx <= dp
  }
  const finalOpacity = (id:string): number => {
    if (!isVisibleLogical(id)) return 0
    const a = appearAlpha(id)
    const d = disappearAlpha(id)
    const b = blinkAlpha(id)
    return Math.max(0, Math.min(1, a * d * b))
  }

  // lane → vec
  const laneIdToVec = useMemo(()=>{
    const map = new Map<string,string>()
    vecGroups.forEach(g => g.lanes.forEach(l => map.set(l.id, g.baseId)))
    return map
  },[vecGroups])
  useEffect(()=>{ dbg('mode =', fmtSnap.base, 'hidden-lanes=', laneIdToVec.size) }, [fmtSnap.base, laneIdToVec])
  // ========== 全局快捷键 ==========
  useEffect(() => {
    const isTypingTarget = (el: EventTarget|null) => {
      if (!(el instanceof HTMLElement)) return false
      const tag = el.tagName.toLowerCase()
      const editable = el.getAttribute('contenteditable')
      return tag === 'input' || tag === 'textarea' || tag === 'select' || editable === 'true'
    }
    const onKey = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return
      switch (e.key) {
        case ' ': // 空格 播放/暂停
          e.preventDefault()
          setPlaying(p => { const np = !p; if (np) stepStartRef.current = performance.now(); return np })
          break
        case 'ArrowLeft': // 上一步
          e.preventDefault()
          setStepIdx(i => Math.max(0, i - 1))
          stepStartRef.current = performance.now()
          break
        case 'ArrowRight': // 下一步
          e.preventDefault()
          setStepIdx(i => Math.min((doc.steps.length || 1) - 1, i + 1))
          stepStartRef.current = performance.now()
          break
        case '+':
        case '=': // 放大
          setZoom(z => Math.min(2, +(z + 0.25).toFixed(2)))
          break
        case '-': // 缩小
          setZoom(z => Math.max(0.5, +(z - 0.25).toFixed(2)))
          break
        case 'g':
        case 'G': // 网格
          setShowGrid(s => !s)
          break
        case 'r':
        case 'R': // 复位
          setResetTick(t => t + 1)
          break
        case 't':
        case 'T': // 工具条显隐
          setToolbarVisible(v => !v)
          break
        case 'h':
        case 'H': // 快捷键帮助
          setHotkeyOpen(o => !o)
          break
        case 's':
        case 'S': // 同义指令面板开关
          e.preventDefault()
          setSynOpen(o => !o)
          break
        case '1': setSpeed(0.5); break
        case '2': setSpeed(1); break
        case '3': setSpeed(2); break
        case '4': setSpeed(4); break
        default: break
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [doc.steps.length])
  useEffect(()=>{
    if (!debugOn) return;
    // 找出所有 id 属于 v0 家族的 rect
    const v0lanes = doc.shapes.filter(s => s.kind === 'rect' && /^(v0(\[\d+\]|[._-]\d+))$/.test(s.id)).map(s=>s.id)
    const grouped = vecGroups.find(g=>g.baseId==='v0')
    dbg('v0 lanes =', v0lanes)
    dbg('v0 grouped?', !!grouped, grouped ? grouped.lanes.map(l=>l.id) : [])
    dbg('allowSet has v0?', (allowSet as Set<string>).has('v0'))
  }, [debugOn, doc.shapes, vecGroups, allowSet])

  const renderShape = (s: DSLShape) => {
    // 在十六进制模式下：凡是 id 属于允许合并(base 在 allowSet) 的 lane（vX[0]/vX_0/…），直接隐藏单 lane，
    // 不再依赖收集到的 vecGroups 映射，避免 nobox 时“没 box 不合并”的情况
    if (fmtSnap.base === 'hex' && s.kind === 'rect') {
      const baseName = laneBase(s.id || '')
      if (baseName && allowSet.has(baseName)) {
        if (debugOn) dbg('[HIDE]', s.id, 'base=', baseName)
        return null
      }
    }
    const op = finalOpacity(s.id)
    if (op <= 0) return null

    switch (s.kind) {
      case 'rect': {
        const W = PX(s.w), H = PX(s.h), X = PX(s.x), Y = PX(s.y)
        const corner = s.roundPx ?? Math.max(8, Math.min(18, Math.min(W, H) * 0.22)) // 动态圆角
        const font   = s.size    ?? Math.max(10, Math.min(32, Math.min(W, H) * 0.45)) // 动态字号
        return (
          <Group key={s.id} x={X} y={Y} opacity={op}>
            <Rect width={W} height={H} cornerRadius={corner} fill={col(s.color)} shadowBlur={14} shadowColor="#00000022" />
            { s.text ? (
              <FmtText
                value={s.text ?? ''}
                x={0} y={0} width={W} height={H}
                align="center" vAlign="middle"
                fontSize={font}
                color="#0B1220"
                fontFamily="'Futura','STFangsong','PingFang SC','Microsoft YaHei',system-ui"
              />
            ) : null}
          </Group>
        )
      }
      case 'label': {
        const X = PX(s.x), Y = PX(s.y)
        const H = 32, padX = 14
        const W = Math.max(48, (s.text?.length ?? 0) * 9 + padX * 2)
        return (
          <Group key={s.id} x={X} y={Y} opacity={op} listening={false}>
            <Rect width={W} height={H} cornerRadius={H/2} fill="#111827" opacity={0.78} />
            <FmtText
              value={s.text}
              x={0} y={0} width={W} height={H}
              align="center" vAlign="middle"
              fontSize={16}
              color="#fff"
              fontFamily="'Futura','STFangsong','PingFang SC','Microsoft YaHei',system-ui"
            />
          </Group>
        )
      }
      case 'text': {
        // 允许 text 形状带 w/h + 对齐，这样省略号能真正“居中”
        const X = PX(s.x), Y = PX(s.y)
        const W = s.w != null ? PX(s.w) : undefined
        const H = s.h != null ? PX(s.h) : undefined
        const fs = s.size ?? 16
        return (
          <Text
            key={s.id}
            x={X} y={Y} width={W} height={H}
            text={s.text}
            align={(s.align as any) || 'left'}
            verticalAlign={(s.vAlign as any) || 'top'}
            fontSize={fs}
            fill={s.color ?? '#0f172a'}
            listening={false}
            opacity={op}
            fontFamily="'Futura','STFangsong','PingFang SC','Microsoft YaHei',system-ui"
          />
        )
      }
      case 'group': {
        // hex 模式下隐藏 vec 的盒子（__box）
        if (fmtSnap.base === 'hex' && /__box$/.test(s.id)) return null
        const X = PX(s.x), Y = PX(s.y), W = PX(s.w), H = PX(s.h)
        return (
          <Rect
            key={s.id}
            x={X} y={Y} width={W} height={H}
            cornerRadius={18}
            stroke="#6B7280" dash={[10, 8]}
            opacity={0.35 * op}
            listening={false}
          />
        )
      }
      case 'line': {
        const pts = [PX(s.x1), PX(s.y1), PX(s.x2), PX(s.y2)]
        return <Line key={s.id} points={pts} stroke={col(s.color)} strokeWidth={s.width || 2} opacity={op}/>
      }
      case 'arrow': {
        const x1 = PX(s.x1), y1 = PX(s.y1), x2 = PX(s.x2), y2 = PX(s.y2)
        const w = s.width ?? 3
        const head = 10 + w*2
        const ang = Math.atan2(y2-y1, x2-x1)
        const hx = x2 - Math.cos(ang)*head
        const hy = y2 - Math.sin(ang)*head
        return (
          <Group key={s.id} opacity={op}>
            <Line points={[x1,y1,x2,y2]} stroke={col(s.color)} strokeWidth={w}/>
            <Line points={[
              x2, y2,
              hx - Math.sin(ang)*head*0.35, hy + Math.cos(ang)*head*0.35,
              hx + Math.sin(ang)*head*0.35, hy - Math.cos(ang)*head*0.35
            ]} closed fill={col(s.color)} />
          </Group>
        )
      }
      default: return null
    }
  }

  // 在十六进制模式下：把某个 vec 组渲染为“合并寄存器条”，并让单 lane 隐藏（见上面 renderShape）
  function renderCompactVec(g: VecGroup) {
    if (!g.lanes.length) return null

    // 盒子：优先用 __box；没有就用 lanes 的包围盒
    const box = g.box ?? (() => {
      const minX = Math.min(...g.lanes.map(l => l.x))
      const minY = Math.min(...g.lanes.map(l => l.y))
      const maxX = Math.max(...g.lanes.map(l => l.x + l.w))
      const maxY = Math.max(...g.lanes.map(l => l.y + l.h))
      return { x: minX, y: minY, w: maxX - minX, h: maxY - minY }
    })()

    const X = PX(box.x), Y = PX(box.y), W = PX(box.w), H = PX(box.h)

    // 0x0001 0002 0003 0004 → 0x0001000200030004
    const digits = fmtSnap.hexDigits
    const laneHex = g.lanes.map(l => fmt(l.text ?? '', 'hex', digits).replace(/^0x/i, ''))
    const merged = '0x' + laneHex.join('')

    // 透明度跟随 lanes（appear/disappear/blink）
    const laneOps = g.lanes.map(l => finalOpacity(l.id));
    const op = Math.max(...laneOps);
    
    // —— 调试日志 ——
    // 打印 base、step、box、合成的 hex 串、每个 lane 的不透明度以及最终 op
    if (debug) {
      // merged 变量在你函数上面已经算过：'0x' + laneHex.join('')
      // @ts-ignore
      console.info('[COMPACT]', {
        base: g.baseId,
        step: stepIdx,
        box,
        merged,
        laneIds: g.lanes.map(l => l.id),
        laneOps: laneOps.map(v => +v.toFixed(2)),
        op: +op.toFixed(2),
      });
    }
    
    if (op <= 0) return null;

    const fill = col(g.lanes[0].color || '#59E0D0')
    const fontSize = fitFontSize(merged, W, 28)

    return (
      <Group key={`${g.baseId}__compact`} x={X} y={Y} listening={false} opacity={op}>
        <Rect width={W} height={H} cornerRadius={20} fill={fill} shadowBlur={14} shadowColor="#00000022" />
        <Text
          text={merged}
          x={0} y={0} width={W} height={H}
          align="center" verticalAlign="middle"
          fontSize={fontSize} fill="#0B1220"
          listening={false}
          fontFamily="'Futura','STFangsong','PingFang SC','Microsoft YaHei',system-ui"
        />
      </Group>
    )
  }

  const Content = () => {
    const groups = doc.shapes.filter(s => s.kind==='group')
    const main   = doc.shapes.filter(s => s.kind==='rect' || s.kind==='line' || s.kind==='arrow')
    const deco   = doc.shapes.filter(s => s.kind==='label' || s.kind==='text')

    return (
      <Group x={48} y={48}>
        <Group listening={false}>{groups.map(renderShape)}</Group>
        <Group>{main.map(renderShape)}</Group>

        {/* 十六进制模式下渲染“合并寄存器条” */}
        {fmtSnap.base === 'hex' && (
          <Group listening={false}>
            {vecGroups.map(renderCompactVec)}
            {debug && vecGroups.map(g=>{
              const box = g.box ?? (() => {
                const minX = Math.min(...g.lanes.map(l => l.x));
                const minY = Math.min(...g.lanes.map(l => l.y));
                const maxX = Math.max(...g.lanes.map(l => l.x + l.w));
                const maxY = Math.max(...g.lanes.map(l => l.y + l.h));
                return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
              })();
              return (
                <Rect
                  key={`${g.baseId}__dbgbox`}
                  x={PX(box.x)} y={PX(box.y)} width={PX(box.w)} height={PX(box.h)}
                  stroke="#2563eb" dash={[6, 6]} opacity={0.35} cornerRadius={18}
                  listening={false}
                />
              );
            })}
          </Group>
        )}

        <Group listening={false}>{deco.map(renderShape)}</Group>
      </Group>
    )
  }

  return (
    <div className="canvas-root" style={{display:'flex', flexDirection:'column', height:'100%'}}>
      <div style={{position:'relative', flex:1, minHeight:0, overflow:'visible'}}>
        <div style={{position:'absolute', top:0, right:0, zIndex:12, pointerEvents:'auto'}}>
          <RightNotch />
        </div>
        {/* Step floating badge */}
        <div
          className="step-floating"
          style={{
            position:'absolute',
            left: 16,
            top: 12,
            zIndex: 11,
            background:'#1f2937',
            color:'#fff',
            borderRadius: 14,
            padding:'10px 16px',
            boxShadow:'0 8px 20px rgba(0,0,0,0.15), 0 2px 6px rgba(0,0,0,0.10)',
            border:'1px solid #0f172a1a',
            fontSize:14,
            lineHeight:1.2,
            whiteSpace:'nowrap',
            pointerEvents:'none'
          }}
        >
          <div>步骤：{Math.min(stepIdx+1, Math.max(1, doc.steps.length))}/{Math.max(doc.steps.length,1)} · {stepName || '—'}</div>
        </div>
        <div
          className="canvas-toolbar floating"
          style={{
            position: 'absolute',
            left: 12,
            top: 200,
            transform: toolbarVisible ? 'translate(0,0)' : 'translate(-8px,0)',
            transition: 'opacity .22s ease, transform .22s ease',
            opacity: toolbarVisible ? 1 : 0,
            pointerEvents: toolbarVisible ? 'auto' : 'none',
            zIndex: 10,
            width: 60,                 // 窄条
            maxWidth: 56,
            borderRadius: 16,
            background: '#ffffff',
            boxShadow: '0 10px 24px rgba(0,0,0,0.12), 0 2px 6px rgba(0,0,0,0.08)',
            border: '1px solid #e5e7eb',
            padding: 8,
            display: 'flex',
            flexDirection: 'column',   // 竖排
            alignItems: 'stretch',
            justifyContent: 'flex-start',
            gap: 8
          }}
        >
          {/* 播放/暂停：纯按钮，无抽屉 */}
          <button title={playing ? '暂停' : '播放'} className="btn icon" style={iconBtn} onClick={()=>{
            setPlaying(p=>{ const np = !p; if (np) stepStartRef.current = performance.now(); return np })
          }}>
            {/* 播放/暂停使用简洁 SVG 图标（非 emoji）*/}
            {playing ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#111827" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="6" y="5" width="4" height="14"/><rect x="14" y="5" width="4" height="14"/></svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="#111827" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>
            )}
          </button>

          {/* 上/下一步：纯按钮 */}
          <button title="上一步" className="btn icon" style={iconBtn} onClick={()=>{ setStepIdx(i=>Math.max(0,i-1)); stepStartRef.current = performance.now() }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#111827" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="15 18 9 12 15 6"></polyline></svg>
          </button>
          <button title="下一步" className="btn icon" style={iconBtn} onClick={()=>{ setStepIdx(i=>Math.min((doc.steps.length||1)-1,i+1)); stepStartRef.current = performance.now() }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#111827" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="9 18 15 12 9 6"></polyline></svg>
          </button>

          {/* 速度：悬停拉出 */}
          <FlyItem id="speed" title="播放速度" icon={
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#111827" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z"/></svg>
          } openId={flyOpenId} setOpenId={setFlyOpenId}>
            <span style={{fontSize:12, color:'#334155'}}>速度</span>
            <select className="select" value={String(speed)} onChange={(e)=>{ setSpeed(Number(e.currentTarget.value)); e.currentTarget.blur(); }} style={{height:28}}>
              <option value="0.5">0.5×</option><option value="1">1×</option><option value="2">2×</option><option value="4">4×</option>
            </select>
          </FlyItem>

          {/* 缩放：悬停拉出 */}
          <FlyItem id="zoom" title="缩放" icon={
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#111827" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          } openId={flyOpenId} setOpenId={setFlyOpenId}>
            <span style={{fontSize:12, color:'#334155'}}>缩放</span>
            <select className="select" value={String(zoom)} onChange={(e)=>{ setZoom(parseFloat(e.currentTarget.value)); e.currentTarget.blur(); }} style={{height:28}}>
              <option value="0.75">75%</option><option value="1">100%</option><option value="1.25">125%</option><option value="1.5">150%</option><option value="2">200%</option>
            </select>
          </FlyItem>

          {/* 复位 & 网格：纯按钮 */}
          <button title="复位" className="btn icon" style={iconBtn} onClick={()=>setResetTick(t=>t+1)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#111827" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-5H1"/></svg>
          </button>
          <button title="显示/隐藏网格" className="btn icon" style={iconBtn} onClick={()=>setShowGrid(s=>!s)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#111827" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18M15 3v18M3 9h18M3 15h18"/></svg>
          </button>

          {/* 数制：悬停拉出 */}
          <FlyItem id="radix" title="数制" icon={
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#111827" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="4" width="16" height="16" rx="2"/><text x="8" y="16" fontSize="8" fill="#111827">10</text></svg>
          } openId={flyOpenId} setOpenId={setFlyOpenId}>
            <span style={{fontSize:12, color:'#334155'}}>数制</span>
            <Select value={fmtSnap.base} onChange={(e)=>{ formatStore.setBase(e.target.value as any); (e.currentTarget as HTMLSelectElement).blur?.(); }} className="select">
              <option value="dec">10 进制</option>
              <option value="hex">16 进制</option>
            </Select>
          </FlyItem>

          {/* 同义指令面板：纯按钮 */}
          <button title="同义指令面板 (S)" className="btn icon" style={iconBtn} onClick={()=>setSynOpen(o=>!o)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#111827" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="6" width="18" height="12" rx="2"/><line x1="7" y1="10" x2="17" y2="10"/><line x1="7" y1="14" x2="13" y2="14"/></svg>
          </button>

          {/* 寄存器位宽：悬停拉出 */}
          <FlyItem id="regbits" title="寄存器位宽" icon={
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#111827" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="7" y="7" width="10" height="10" rx="2"/><path d="M3 7h4M3 11h4M3 15h4M17 7h4M17 11h4M17 15h4M7 3v4M11 3v4M15 3v4M7 17v4M11 17v4M15 17v4"/></svg>
          } openId={flyOpenId} setOpenId={setFlyOpenId}>
            <span style={{fontSize:12, color:'#334155'}}>寄存器</span>
            <select className="btn" value={String(localStorage.getItem('isa.vector.regBits')||'128')} onChange={(e)=>{ const v=Number(e.currentTarget.value); localStorage.setItem('isa.vector.regBits', String(v)); window.dispatchEvent(new CustomEvent('isa:vector-change', { detail: { regBits: v, elemBits: Number(localStorage.getItem('isa.vector.elemBits')||'32') } })); e.currentTarget.blur(); }} style={{height:28}}>
              {[64,128,256,512,1024].map(n=> <option key={n} value={n}>{n}</option>)}
            </select>
            <span style={{fontSize:12}}>bit</span>
          </FlyItem>

          {/* 元素位宽：悬停拉出 */}
          <FlyItem id="elembits" title="元素位宽" icon={
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#111827" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="8" height="8" rx="1"/><rect x="13" y="3" width="8" height="8" rx="1"/><rect x="3" y="13" width="8" height="8" rx="1"/><rect x="13" y="13" width="8" height="8" rx="1"/></svg>
          } openId={flyOpenId} setOpenId={setFlyOpenId}>
            <span style={{fontSize:12, color:'#334155'}}>元素</span>
            <select className="btn" value={String(localStorage.getItem('isa.vector.elemBits')||'32')} onChange={(e)=>{ const v=Number(e.currentTarget.value); localStorage.setItem('isa.vector.elemBits', String(v)); window.dispatchEvent(new CustomEvent('isa:vector-change', { detail: { regBits: Number(localStorage.getItem('isa.vector.regBits')||'128'), elemBits: v } })); e.currentTarget.blur(); }} style={{height:28}}>
              {[8,16,32,64].map(n=> <option key={n} value={n}>{n}</option>)}
            </select>
            <span style={{fontSize:12}}>bit</span>
          </FlyItem>

          {/* 收起工具条 */}
          <button title="收起工具条 (T)" className="btn icon" style={iconBtn} onClick={()=>setToolbarVisible(false)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#111827" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"></polyline></svg>
          </button>
        </div>
        {!toolbarVisible && (
          <button
            title="显示工具条 (T)"
            onClick={()=>setToolbarVisible(true)}
            style={{
              position:'absolute',
              left: 12,
              top: 120,
              zIndex: 10,
              height: 30,
              padding:'0 12px',
              borderRadius: 8,
              border:'1px solid #e5e7eb',
              background:'#ffffff',
              boxShadow:'0 4px 12px rgba(0,0,0,0.12)',
              fontSize:12,
              cursor:'pointer'
            }}
          >工具</button>
        )}
        <div
          className="hotkey-cheatsheet"
          style={{
            position:'absolute',
            left: 12,
            bottom: 12, // 避开底部 180px 日志
            zIndex: 9,
            background:'#ffffff',
            border:'1px solid #e5e7eb',
            borderRadius: 12,
            boxShadow:'0 8px 20px rgba(0,0,0,0.12)',
            overflow:'hidden',
            minWidth: 180,
            pointerEvents:'auto'
          }}
        >
          <div style={{display:'flex', alignItems:'center', height:30, padding:'0 8px', gap:8, borderBottom:'1px solid #eef2f7'}}>
            <div style={{fontSize:12, fontWeight:700, color:'#0f172a'}}>快捷键</div>
            <div style={{flex:1}} />
            <button
              title={hotkeyOpen ? '收起 (H)' : '展开 (H)'}
              onClick={()=>setHotkeyOpen(o=>!o)}
              style={{width:28, height:24, borderRadius:8, border:'1px solid #e5e7eb', background:'#fff', cursor:'pointer'}}
            >{hotkeyOpen ? '−' : '＋'}</button>
          </div>
          <div
            style={{
              overflow: 'hidden',
              maxHeight: hotkeyOpen ? 260 : 0,
              opacity: hotkeyOpen ? 1 : 0,
              transition: 'max-height .24s ease, opacity .2s ease, padding .24s ease',
              padding: hotkeyOpen ? '8px 10px' : '0 10px',
              fontSize: 12,
              color: '#334155'
            }}
          >
            <ul style={{listStyle:'none', padding:0, margin:0, display:'grid', gridTemplateColumns:'auto auto', columnGap:10, rowGap:6}}>
              <li><b>Space</b>&nbsp;&nbsp;&nbsp;播放/暂停</li>
              <li><b>←/→</b>&nbsp;&nbsp;&nbsp;上/下一步</li>
              <li><b>+/−</b>&nbsp;&nbsp;&nbsp;缩放</li>
              <li><b>1/2/3/4</b>&nbsp;&nbsp;&nbsp;0.5×/1×/2×/4×</li>
              <li><b>G</b>&nbsp;&nbsp;&nbsp;网格</li>
              <li><b>R</b>&nbsp;&nbsp;&nbsp;复位</li>
              <li><b>S</b>&nbsp;&nbsp;&nbsp;同义指令面板</li>
              <li><b>T</b>&nbsp;&nbsp;&nbsp;工具条显示/隐藏</li>
              <li><b>H</b>&nbsp;&nbsp;&nbsp;收起/展开本卡片</li>
              <li><b>Ctrl/⌘ + 滚轮</b>&nbsp;&nbsp;&nbsp;缩放画布</li>
            </ul>
          </div>
        </div>
        {/* 同义指令：独立浮动面板，固定在右侧，不随底部日志滚动 */}
        {synOpen && (
          <div
            style={{
              position:'absolute',
              right: 12,
              top: 200,
              zIndex: 9,
              width: 360,
              maxWidth: '32vw',
              maxHeight: 'calc(100% - 180px)',
              overflow: 'auto',
              background:'#ffffff',
              border:'1px solid #e5e7eb',
              borderRadius: 12,
              boxShadow:'0 10px 24px rgba(0,0,0,0.12), 0 2px 6px rgba(0,0,0,0.08)',
              padding:'8px 10px'
            }}
          >
            <div style={{display:'flex', alignItems:'center', gap:8, marginBottom:6}}>
              <div style={{fontSize:12, fontWeight:700, color:'#0f172a'}}>同义指令（跨架构）</div>
              <div style={{flex:1}} />
              <button
                title="关闭 (S)"
                onClick={()=>setSynOpen(false)}
                style={{width:24, height:24, borderRadius:8, border:'1px solid #e5e7eb', background:'#fff', cursor:'pointer'}}
              >×</button>
            </div>

            {(!synonyms || synonyms.length === 0) ? (
              <div style={{color:'#64748b', fontSize:12}}>暂无同义指令。指令模块可通过 dslOverride.extras.synonyms 传入。</div>
            ) : (
              <ul style={{listStyle:'none', padding:0, margin:0, display:'grid', gap:8}}>
                {synonyms.map((it, idx)=> (
                  <li key={idx} style={{border:'1px solid #e5e7eb', borderRadius:8, padding:'8px 10px', background:'#ffffff'}}>
                    <div style={{display:'flex', alignItems:'center', gap:8}}>
                      <span style={{fontWeight:700}}>{it.arch}</span>
                      <span style={{fontFamily:'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace', padding:'2px 6px', border:'1px solid #e5e7eb', borderRadius:999}}>{it.name}</span>
                    </div>
                    {it.note && <div style={{marginTop:6, color:'#475569'}}>{it.note}</div>}
                    {it.example && (
                      <pre style={{marginTop:6, background:'#f8fafc', border:'1px solid #e5e7eb', borderRadius:8, padding:'6px 8px', overflow:'auto'}}><code>{it.example}</code></pre>
                    )}
                  </li>
                ))}
              </ul>
            )}

            <div style={{marginTop:10, color:'#94a3b8', fontSize:11}}>注：为便于学习对比，此处列出大致等价的向量/并行指令，具体语义以各 ISA 文档为准。</div>
          </div>
        )}
        {/* SVG Stage (replaces KitStage) */}
        <svg
            ref={svgRef}
            className="svg-stage"
            width="100%"
            height="100%"
            viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`}
            xmlns="http://www.w3.org/2000/svg"
            style={{ display: 'block', cursor: isPanning ? 'grabbing' : 'grab', touchAction: 'none' }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerLeave={onPointerLeave}
            onWheel={onWheel}
          >
          <defs>
            {/* Grid patterns */}
            {(() => {
              const spacing = 0.2 * 96; // spacing in inches to px (same as PX)
              const majorEvery = 5;
              return (
                <>
                  <pattern id="gridMinor" width={spacing} height={spacing} patternUnits="userSpaceOnUse">
                  <path d={`M ${spacing} 0 H 0 V ${spacing}`} fill="none" stroke="#EEF2F7" strokeWidth={0.5} shapeRendering="crispEdges" />
                  </pattern>
                  <pattern id="gridMajor" width={spacing * majorEvery} height={spacing * majorEvery} patternUnits="userSpaceOnUse">
                    <rect width="100%" height="100%" fill="url(#gridMinor)" />
                    <path d={`M ${spacing * majorEvery} 0 H 0 V ${spacing * majorEvery}`} fill="none" stroke="#E5E7EB" strokeWidth={0.5} shapeRendering="crispEdges" />
                  </pattern>
                </>
              );
            })()}

            {/* Drop shadow filter (used when shadowBlur is set) */}
            <filter id="dropShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity="0.22" />
            </filter>

            {/* Optional arrow marker (not yet wired, kept for future) */}
            <marker id="arrow" orient="auto" markerWidth="12" markerHeight="12" refX="9" refY="6">
              <path d="M0,0 L0,12 L12,6 z" />
            </marker>
          </defs>

          {showGrid && <rect x={0} y={0} width={CANVAS_W} height={CANVAS_H} fill="url(#gridMajor)" />}

          {/* zoomed & panned content */}
          <g transform={`translate(${pan.x} ${pan.y}) scale(${zoom})`}>
            <Content />
          </g>
        </svg>
      </div>
      <div className="canvas-logs" style={{borderTop:'1px solid #e5e7eb', background:'#fff', height: logsOpen ? 180 : 36, transition:'height .18s ease'}}>
        <div style={{display:'flex', alignItems:'center', height:36, padding:'0 8px', gap:8}}>
          <div style={{fontSize:12, fontWeight:600, color:'#0f172a'}}>Logs</div>
          <div style={{flex:1}} />
          <button
            className="btn icon"
            title={logsOpen ? '收起日志' : '展开日志'}
            onClick={()=>setLogsOpen(o=>!o)}
            style={{width:28, height:24, borderRadius:8, padding:0, border:'1px solid #e5e7eb', background:'#fff'}}
          >
            {logsOpen ? (
              // chevron-down icon
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#111827" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            ) : (
              // chevron-up icon
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#111827" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="18 15 12 9 6 15"></polyline>
              </svg>
            )}
          </button>
          <button className="btn" onClick={()=>clearLogs()} style={{marginLeft:6}}>清空</button>
        </div>
        {logsOpen && (
          <div style={{display:'flex', height:224}}>
            <div style={{flex: 1, overflow:'auto', padding:'6px 10px'}}>
              {(!logs || logs.length===0) ? (
                <div style={{fontSize:12, color:'#64748b'}}>暂无日志。运行后会在此显示解析步骤 / 提示。</div>
              ) : (
                <ul style={{listStyle:'none', padding:0, margin:0, fontSize:12, color:'#334155'}}>
                  {logs.map((l, i)=>(
                    <li key={i} style={{display:'flex', gap:6, padding:'3px 0'}}>
                      <span style={{width:6, height:6, borderRadius:6, background:'#0ea5e9', marginTop:7}} />
                      <span style={{lineHeight:1.5}}>{l}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
        </div>
      </div>
    )
  }
