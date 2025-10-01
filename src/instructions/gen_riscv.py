#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import argparse
import os
import re
import sys
from pathlib import Path
from typing import Iterable, Tuple, Dict, Set

CLASS_RE = re.compile(r"^INSN_CLASS_[A-Z0-9_]+$")
MNEM_RE = re.compile(r"^[a-z0-9_.]+$")

def parse_args():
    p = argparse.ArgumentParser(
        description="Generate per-instruction .ts files grouped by RISC-V classes."
    )
    p.add_argument(
        "-t", "--template", required=True, help="Path to template.md used for each file."
    )
    p.add_argument(
        "-o", "--outdir", default="riscv_out", help="Root output directory (default: riscv_out)."
    )
    p.add_argument(
        "--include-vendor",
        action="store_true",
        help="Include vendor-specific classes (INSN_CLASS_X*). Default is to exclude.",
    )
    p.add_argument(
        "input",
        nargs="?",
        help="Input file containing lines like 'INSN_CLASS_V: vadd.vv vadd.vx ...'. If omitted, read from stdin.",
    )
    return p.parse_args()

def class_to_bucket(insn_class: str) -> str:
    """
    INSN_CLASS_D_AND_ZFA -> riscv_d
    INSN_CLASS_SMCTR_OR_SSCTR -> riscv_smctr
    INSN_CLASS_V -> riscv_v
    """
    assert insn_class.startswith("INSN_CLASS_")
    body = insn_class[len("INSN_CLASS_") :]
    # 取第一个分量（AND/OR 之前）
    body = body.split("_AND_")[0].split("_OR_")[0]
    return f"riscv_{body.lower()}"

def iter_pairs(lines: Iterable[str]) -> Iterable[Tuple[str, str]]:
    """
    从输入行中产出 (class, mnemonic) 对。
    行格式类似：
    INSN_CLASS_V: vadd.vv vadd.vx ...
    只解析一行内的助记符（与示例一致）。
    """
    for raw in lines:
        line = raw.strip()
        if not line:
            continue
        # 把冒号变空格后分词
        line = line.replace(":", " ")
        toks = line.split()
        if not toks:
            continue
        insn_class = toks[0]
        if not CLASS_RE.match(insn_class):
            continue
        for tok in toks[1:]:
            if MNEM_RE.match(tok):
                yield insn_class, tok

def fill_template_last_code_fence(template_text: str, mnemonic: str) -> str:
    """
    寻找最后一对 ``` 代码块，把中间替换为仅包含 mnemonic 的一行。
    若不存在成对 fence，则在末尾追加：
        ```
        <mnemonic>
        ```
    """
    lines = template_text.splitlines()
    fence_idxs = [i for i, ln in enumerate(lines) if ln.strip() == "```"]
    if len(fence_idxs) >= 2:
        start = fence_idxs[-2]
        end = fence_idxs[-1]
        # 重新拼接：start 之前 + start行(```) + mnemonic + end行及之后
        before = lines[: start + 1]          # 含起始 ```
        after = lines[end:]                  # 含结束 ```
        return "\n".join(before + [mnemonic] + after) + ("\n" if template_text.endswith("\n") else "")
    else:
        # 追加一个新的代码块
        suffix = ("\n" if (len(lines) > 0 and not template_text.endswith("\n")) else "")
        block = f"```\n{mnemonic}\n```\n"
        return template_text + suffix + block

def main():
    args = parse_args()
    tpl_path = Path(args.template)
    if not tpl_path.is_file():
        sys.exit(f"Template not found: {tpl_path}")

    out_root = Path(args.outdir)
    out_root.mkdir(parents=True, exist_ok=True)

    # 读模板
    template_text = tpl_path.read_text(encoding="utf-8")

    # 读输入
    if args.input:
        in_lines = Path(args.input).read_text(encoding="utf-8").splitlines()
    else:
        in_lines = sys.stdin.read().splitlines()

    # 去重：按 (bucket, filename) 去重
    seen: Set[Tuple[str, str]] = set()

    # 统计（可选）
    counts: Dict[str, int] = {}

    for insn_class, mnemonic in iter_pairs(in_lines):
        # 过滤厂商类（INSN_CLASS_X...）
        if not args.include_vendor and insn_class.startswith("INSN_CLASS_X"):
            continue

        bucket = class_to_bucket(insn_class)
        out_dir = out_root / bucket
        out_dir.mkdir(parents=True, exist_ok=True)

        filename = mnemonic.replace(".", "_") + ".ts"  # vadd.vv -> vadd_vv.ts
        key = (bucket, filename)
        if key in seen:
            continue
        seen.add(key)

        # 生成文件内容：模板的最后一个 ``` 代码块里填入原始助记符（带点）
        content = fill_template_last_code_fence(template_text, mnemonic)

        (out_dir / filename).write_text(content, encoding="utf-8")

        counts[bucket] = counts.get(bucket, 0) + 1

    # 简要统计输出
    print(f"Done. Output root: {out_root}")
    if counts:
        width = max(len(k) for k in counts)
        for k in sorted(counts):
            print(f"{k.ljust(width)} : {counts[k]}")

if __name__ == "__main__":
    main()