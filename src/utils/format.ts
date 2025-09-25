// src/utils/format.ts
export type NumBase = 'dec' | 'hex' | 'bin';

export function isNumericLike(s: string | number): boolean {
  if (typeof s === 'number') return Number.isFinite(s);
  const t = String(s).trim();
  if (!t) return false;
  // 允许已有 0x/0b 前缀
  if (/^0x[0-9a-f]+$/i.test(t)) return true;
  if (/^0b[01]+$/i.test(t)) return true;
  return /^-?\d+$/i.test(t);
}

export function toNumber(s: string | number): number | null {
  if (typeof s === 'number') return s;
  const t = String(s).trim();
  if (/^0x[0-9a-f]+$/i.test(t)) return parseInt(t, 16);
  if (/^0b[01]+$/i.test(t)) return parseInt(t.slice(2), 2);
  if (/^-?\d+$/i.test(t)) return parseInt(t, 10);
  return null;
}

export function fmtLane(v: string | number, base: NumBase, sew: number): string {
  // sew: 8/16/32/64... 用于补零宽度
  const n = toNumber(v);
  if (n === null || !Number.isFinite(n)) return String(v);

  if (base === 'dec') return String(n);

  if (base === 'hex') {
    const width = Math.max(1, Math.ceil(sew / 4)); // 每4bit 1个16进制
    const hex = (n >>> 0).toString(16).toUpperCase().padStart(width, '0');
    return '0x' + hex;
  }

  // bin
  const bits = Math.max(1, sew);
  const bin = (n >>> 0).toString(2).padStart(bits, '0');
  return '0b' + bin;
}

/** vec 的逗号串："1,2,3,4" -> ["1","2","3","4"] */
export function splitVecPayload(s: string): string[] {
  return String(s)
    .split(',')
    .map(x => x.trim())
    .filter(Boolean);
}

/** 把一个 vec 的 lane 序列拼成“128b/64b…”的大串（仅 hex/bin 有意义） */
export function aggregateVec(lanes: (string | number)[], base: NumBase, sew: number): string {
  if (base === 'dec') return lanes.map(x => fmtLane(x, base, sew)).join(',');
  const parts = lanes.map(x => fmtLane(x, base, sew).replace(/^0x|^0b/i, ''));
  const head = base === 'hex' ? '0x' : '0b';
  return head + parts.join('');
}
