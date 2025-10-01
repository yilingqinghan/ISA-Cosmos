#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
arm_make_docs.py
从指令名清单批量生成文档树：
- 当前目录必须存在 template.md
- 为每个 bucket（指令集扩展名）新建同名目录（例：armv8）
- 目录下为清单里的每条指令生成 <规范化指令名>.ts
- 文件内容 = template.md，但把“最后一个```代码块```”中的内容替换为【原始指令名】

用法示例见文末。
"""
import argparse
import re
from pathlib import Path

TEMPLATE_FILE = Path("template.md")

def load_template() -> str:
    if not TEMPLATE_FILE.exists():
        raise FileNotFoundError("未找到 template.md（请将模板放在当前目录）")
    return TEMPLATE_FILE.read_text(encoding="utf-8")

def replace_last_codeblock_content(md: str, new_content: str) -> str:
    """
    把 md 中“最后一个三引号代码块”的内容替换为 new_content。
    代码块形式：```[可选lang]\\n ... \\n```
    若模板无代码块，则在末尾补一个。
    """
    fence = "```"
    idxs = [m.start() for m in re.finditer(re.escape(fence), md)]
    if len(idxs) < 2:
        # 模板没有完整 fence：在末尾追加一个
        return md.rstrip() + f"\n\n```\n{new_content}\n```\n"

    # 取最后一对 fence
    start = idxs[-2]
    end = idxs[-1]

    # 找到最后一段 fence 的起始换行（跳过可选语言标记）
    nl = md.find("\n", start)
    if nl == -1 or nl >= end:
        # 结构异常：直接替换两个 fence 之间
        return md[:start] + f"```\n{new_content}\n```" + md[end+len(fence):]

    # head: 从文首到代码块首行末尾；tail: 从收尾 fence 开始到文末
    head = md[:nl+1]
    tail = md[end:]
    return head + new_content + tail

def norm_filename(name: str) -> str:
    """
    指令名 -> 文件名（小写，仅字母数字和连字符）：
      - 转小写
      - 非字母数字替换为 '-'
      - 连续 '-' 折叠；去掉首尾 '-'
    """
    s = name.lower()
    s = re.sub(r"[^a-z0-9]+", "-", s)
    s = re.sub(r"-{2,}", "-", s).strip("-")
    return s or "instr"

def read_names(path: Path) -> list[str]:
    seen = set()
    out = []
    for line in path.read_text(encoding="utf-8").splitlines():
        name = line.strip()
        if not name or name in seen:
            continue
        seen.add(name)
        out.append(name)
    return out

def write_one(dir_path: Path, instr_name: str, tpl: str):
    # 文件名要求：指令名.ts（用规范化后的指令名）
    fn = norm_filename(instr_name) + ".ts.txt"
    dst = dir_path / fn
    content = replace_last_codeblock_content(tpl, instr_name)  # 代码块里写“原始指令名”（保持大小写/括号等）
    dst.write_text(content, encoding="utf-8")

def main():
    ap = argparse.ArgumentParser(description="从指令清单生成 <指令名>.ts（按扩展名分目录）")
    ap.add_argument(
        "--bucket",
        action="append",
        required=True,
        metavar="EXT=FILE",
        help="指令集扩展=清单文件路径，如 armv8=armv8_base.txt；可多次传"
    )
    ap.add_argument("--out-root", default=".", help="输出根目录（默认当前目录）")
    args = ap.parse_args()

    out_root = Path(args.out_root)
    out_root.mkdir(parents=True, exist_ok=True)

    tpl = load_template()
    total = 0

    for spec in args.bucket:
        if "=" not in spec:
            raise ValueError(f"--bucket 参数格式错误：{spec}（应为 EXT=FILE）")
        ext, file_path = spec.split("=", 1)
        ext = ext.strip()
        file_path = Path(file_path.strip())
        if not ext:
            raise ValueError(f"扩展名为空：{spec}")
        if not file_path.exists():
            raise FileNotFoundError(f"找不到清单文件：{file_path}")

        names = read_names(file_path)
        out_dir = out_root / ext
        out_dir.mkdir(parents=True, exist_ok=True)

        for name in names:
            write_one(out_dir, name, tpl)
            total += 1

        print(f"[ok] {ext}: {len(names)} files -> {out_dir}")

    print(f"[done] total files: {total}")

if __name__ == "__main__":
    main()

