#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
x86_instr_names.py
从官方/权威 PDF 抽取 x86 指令【名字清单】（只名字，不含语义）。
- Intel: SDM Volume 2 A–Z（合卷 PDF）
- AMD  : AMD64 APM Volume 4（可选补充；含 AMD 扩展）

输出：<out>.txt（每行一个指令名）与 <out>.csv（第一列 name）

依赖：requests, pdfminer.six
pip install requests pdfminer.six
"""
import argparse, io, os, re, csv
from urllib.parse import urlparse
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
from pdfminer.high_level import extract_text

UA = {"User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Safari/537.36"}

def make_session():
    s = requests.Session()
    retries = Retry(total=5, backoff_factor=0.5,
                    status_forcelist=[429, 500, 502, 503, 504],
                    allowed_methods=["GET", "HEAD"])
    s.mount("https://", HTTPAdapter(max_retries=retries))
    s.headers.update(UA)
    return s

def fetch_bytes(url, timeout=120):
    # 支持 file://path.pdf
    if url.startswith("file://"):
        p = urlparse(url)
        path = os.path.abspath(os.path.join(p.netloc, p.path))
        with open(path, "rb") as f:
            return f.read()
    s = make_session()
    r = s.get(url, timeout=timeout, allow_redirects=True)
    r.raise_for_status()
    return r.content

def dump_names(names, out_prefix):
    # 去重保序
    seen, ordered = set(), []
    for n in names:
        n = (n or "").strip()
        if not n or n in seen:
            continue
        seen.add(n); ordered.append(n)
    with open(out_prefix + ".txt", "w", encoding="utf-8") as f:
        for n in ordered:
            f.write(n + "\n")
    with open(out_prefix + ".csv", "w", encoding="utf-8", newline="") as f:
        w = csv.writer(f); w.writerow(["name"])
        for n in ordered: w.writerow([n])
    print(f"[ok] {out_prefix}: {len(ordered)} names -> {out_prefix}.txt / {out_prefix}.csv")

def parse_pdf_for_mnemonics(pdf_bytes: bytes):
    """
    从 SDM/APM PDF 文本中提取标题行里的指令名。
    典型格式：ADD — Add / VADDPD — Add Packed Double-Precision Floating-Point Values
    兼容分隔符：hyphen-minus(-), en/em dash(– —)
    """
    text = extract_text(io.BytesIO(pdf_bytes)) or ""
    names = []
    dash = r"[\-–—]"  # -, en dash, em dash
    # 允许 . + / _ 等，处理 3DNow!/SSE 扩展类（如 PFRCP, SHA1RNDS4, VPCMPGTQ, VPTERNLOGD）
    pat = re.compile(rf"^([A-Z]{{2,}}[A-Z0-9\.\+/_-]*)\s+{dash}\s+", re.MULTILINE)
    for m in pat.finditer(text):
        cand = m.group(1).strip().rstrip('/')
        # 排除明显非助记符（例如章节抬头 ALL/INDEX 等，这里要求至少含两位字母且全大写）
        if cand and cand.upper() == cand and len(re.sub(r'[^A-Z]', '', cand)) >= 2:
            names.append(cand)
    # 去重保序
    seen, ordered = set(), []
    for n in names:
        if n not in seen:
            seen.add(n); ordered.append(n)
    return ordered

def collect_intel(candidate_urls: list[str]):
    last_err = None
    for url in candidate_urls:
        try:
            print(f"[fetch] Intel SDM: {url}")
            data = fetch_bytes(url)
            return parse_pdf_for_mnemonics(data)
        except Exception as e:
            last_err = e
            continue
    raise last_err if last_err else RuntimeError("No Intel SDM PDF fetched")

def collect_amd(url: str):
    data = fetch_bytes(url)
    return parse_pdf_for_mnemonics(data)

def main():
    ap = argparse.ArgumentParser(description="x86 指令名抓取（Intel/AMD）")
    ap.add_argument("--mode", choices=["intel","amd","both"], default="intel")
    ap.add_argument("--out", default="x86_names", help="输出前缀（默认 x86_names）")
    # 预置若干 Intel SDM Vol.2 A–Z 合卷 PDF 链接（任一可用即可）
    ap.add_argument("--url-intel", action="append",
                    help="Intel SDM Vol.2 A–Z PDF；可多次传入；也支持 file://path.pdf")
    # AMD APM Vol.4（可选，可能变更频繁，推荐自己给 URL 或用 file://）
    ap.add_argument("--url-amd", help="AMD64 APM Vol.4 PDF；支持 file://path.pdf")
    args = ap.parse_args()

    intel_defaults = [
        "https://cdrdv2-public.intel.com/835757/325383-sdm-vol-2abcd.pdf",
        "https://cdrdv2-public.intel.com/812389/325383-sdm-vol-2abcd.pdf",
    ]
    urls_intel = args.url_intel if args.url_intel else intel_defaults

    if args.mode in ("intel","both"):
        names_i = collect_intel(urls_intel)
        dump_names(names_i, args.out if args.mode=="intel" else args.out+"_intel")
    if args.mode in ("amd","both"):
        if not args.url_amd:
            raise SystemExit("--mode amd/both 需要提供 --url-amd（或使用 file://本地PDF）")
        names_a = collect_amd(args.url_amd)
        dump_names(names_a, args.out if args.mode=="amd" else args.out+"_amd")

    if args.mode == "both":
        # 合并一个总表
        merged = []
        for fn in (args.out+"_intel.txt", args.out+"_amd.txt"):
            if os.path.exists(fn):
                with open(fn, "r", encoding="utf-8") as f:
                    merged += [line.strip() for line in f if line.strip()]
        # 去重保序
        seen, ordered = set(), []
        for n in merged:
            if n not in seen:
                seen.add(n); ordered.append(n)
        with open(args.out + "_all.txt", "w", encoding="utf-8") as f:
            f.write("\n".join(ordered) + ("\n" if ordered else ""))
        print(f"[ok] merged -> {args.out}_all.txt")

if __name__ == "__main__":
    main()
