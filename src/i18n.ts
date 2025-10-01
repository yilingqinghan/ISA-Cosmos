// src/i18n.ts — 超轻量多语言，无需 Provider

import { useSyncExternalStore } from 'react'

export type Lang = 'zh' | 'en'
const KEY = 'isa.lang'

// 1) 全局状态（内存 + 本地存储）
let _lang: Lang = (() => {
  try {
    const saved = localStorage.getItem(KEY) as Lang | null
    if (saved === 'zh' || saved === 'en') return saved
  } catch {}
  // 默认：系统是中文就用中文，否则英文
  return (typeof navigator !== 'undefined' && navigator.language?.toLowerCase().startsWith('zh')) ? 'zh' : 'en'
})()

const listeners = new Set<() => void>()

function emit() { listeners.forEach(fn => fn()) }

// 2) 读/写接口
export function getLang(): Lang { return _lang }

export function setLang(next: Lang) {
  if (next === _lang) return
  _lang = next
  try { localStorage.setItem(KEY, next) } catch {}
  emit()
}

// 3) 组件订阅（无需 Provider）
export function useLang(): [Lang, (l: Lang) => void] {
  const subscribe = (fn: () => void) => { listeners.add(fn); return () => listeners.delete(fn) }
  const get = () => _lang
  const lang = useSyncExternalStore(subscribe, get, get)
  return [lang, setLang]
}

// 4) 极简翻译函数（内部就是三目）
// 在任何地方用 tr('中文', 'English') 即可（包括非 React 模块）
export function tr<T extends string | number>(zh: T, en: T): T {
  return (_lang === 'zh' ? zh : en)
}

// 5) 小工具：切换语言（可在按钮 onClick 里直接用）
export function toggleLang() { setLang(_lang === 'zh' ? 'en' : 'zh') }