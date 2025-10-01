#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
x86_make_docs.py
从指令清单生成目录树：
- 需要 template.md（最后一个```代码块会被替换为指令名）
- --bucket EXT=FILE 可多次传；EXT 是输出目录名（如 x86）
- 生成 <规范化指令名>.ts；支持 --clean 全量重写
"""
import argparse, re, shutil
from pathlib import Path

TEMPLATE = Path("template.md")

def load_template() -> str:
    if not TEMPLATE.exists():
        raise FileNotFoundError("未找到 template.md")
    return TEMPLATE.read_text(encoding="utf-8")

def replace_last_codeblock(md: str, payload: str) -> str:
    fence = "```"
    idxs = [m.start() for m in re.finditer(re.escape(fence), md)]
    if len(idxs) < 2:
        return md.rstrip() + f"\n\n```\n{payload}\n```\n"
    start, end = idxs[-2], idxs[-1]
    nl = md.find("\n", start)
    if nl == -1 or nl >= end:
        return md[:start] + f"```\n{payload}\n```" + md[end+len(fence):]
    head, tail = md[:nl+1], md[end:]
    return head + payload + tail

def norm_filename(name: str) -> str:
    s = name.lower()
    s = re.sub(r"[^a-z0-9]+", "-", s)
    s = re.sub(r"-{2,}", "-", s).strip("-")
    return s or "instr"

def read_list(path: Path) -> list[str]:
    seen, out = set(), []
    for line in path.read_text(encoding="utf-8").splitlines():
        n = line.strip()
        if not n or n in seen:
            continue
        seen.add(n); out.append(n)
    return out

def write_one(dir_path: Path, instr_name: str, tpl: str):
    fn = norm_filename(instr_name) + ".ts"
    content = replace_last_codeblock(tpl, instr_name)
    (dir_path / fn).write_text(content, encoding="utf-8")

def main():
    ap = argparse.ArgumentParser(description="按扩展生成 <指令名>.ts 文件（x86）")
    ap.add_argument("--bucket", action="append", required=True, metavar="EXT=FILE",
                    help="扩展=清单文件，例如 x86=x86_intel.txt")
    ap.add_argument("--out-root", default=".", help="输出根目录（默认当前目录）")
    ap.add_argument("--clean", action="store_true", help="生成前先删除对应 EXT 目录（重写）")
    args = ap.parse_args()

    out_root = Path(args.out_root)
    out_root.mkdir(parents=True, exist_ok=True)
    tpl = load_template()

    total = 0
    for spec in args.bucket:
        if "=" not in spec:
            raise ValueError(f"--bucket 格式错误：{spec}（应为 EXT=FILE）")
        ext, file_path = [x.strip() for x in spec.split("=", 1)]
        if not ext:
            raise ValueError("扩展名为空")
        in_file = Path(file_path)
        if not in_file.exists():
            raise FileNotFoundError(f"找不到清单文件：{in_file}")

        out_dir = out_root / ext
        if args.clean and out_dir.exists():
            shutil.rmtree(out_dir)
        out_dir.mkdir(parents=True, exist_ok=True)

        names = read_list(in_file)
        for n in names:
            write_one(out_dir, n, tpl)
            total += 1
        print(f"[ok] {ext}: {len(names)} files -> {out_dir}")

    print(f"[done] total files: {total}")

if __name__ == "__main__":
    main()
