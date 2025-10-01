#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
loongarch_instr_names.py
抓取 LoongArch 指令名清单（分开导出）：
- base : 来自 Linux Kernel 文档《Introduction to LoongArch》的 “List of Instructions”
- lsx  : 来自非官方 intrinsics 指南（/lsx/ 子页的 "Instruction: <mnemonic>"）
- lasx : 同上，/lasx/ 子页

输出：<out>.txt（每行一个指令名）与 <out>.csv（name 一列）

依赖：requests, beautifulsoup4, lxml, tqdm
pip install requests beautifulsoup4 lxml tqdm
"""
import argparse, re, csv, os, io
from urllib.parse import urljoin, urlparse
import requests
from bs4 import BeautifulSoup
from tqdm import tqdm
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

UA = {"User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Safari/537.36"}

def make_session():
    s = requests.Session()
    retries = Retry(total=5, backoff_factor=0.5,
                    status_forcelist=[429, 500, 502, 503, 504],
                    allowed_methods=["GET", "HEAD"])
    s.mount("https://", HTTPAdapter(max_retries=retries))
    s.headers.update(UA)
    return s

def fetch(url, timeout=30):
    # 支持 file://
    if url.startswith("file://"):
        p = urlparse(url)
        path = os.path.abspath(os.path.join(p.netloc, p.path))
        with open(path, "r", encoding="utf-8") as f:
            class _Resp: pass
            r = _Resp(); r.text = f.read(); return r
    s = make_session()
    r = s.get(url, timeout=timeout, allow_redirects=True)
    r.raise_for_status()
    return r

def dump_names(names, out_prefix):
    # 去重保序
    seen, ordered = set(), []
    for n in names:
        n = (n or "").strip()
        if not n or n in seen: 
            continue
        seen.add(n); ordered.append(n)
    # 写文件
    with open(out_prefix + ".txt", "w", encoding="utf-8") as f:
        for n in ordered:
            f.write(n + "\n")
    with open(out_prefix + ".csv", "w", encoding="utf-8", newline="") as f:
        w = csv.writer(f); w.writerow(["name"])
        for n in ordered: w.writerow([n])
    print(f"[ok] {out_prefix}: {len(ordered)} names -> {out_prefix}.txt / {out_prefix}.csv")

def extract_upper_tokens(blob: str):
    """
    提取像 VADD.B / ADD.W / BNE / TLBP 这种全大写/含点的助记符，并去掉明显的非指令词。
    """
    blob = re.sub(r'([A-Z][A-Z0-9.]+)\(([A-Z0-9.]+)\)', r'\1 \2', blob)  # TLBP(TLBSRCH) -> TLBP TLBSRCH
    cands = re.findall(r'\b[A-Z][A-Z0-9.]{1,}\b', blob)
    ban = {"List","Instructions","Overview","Arithmetic","Bit","Branch","Load","Store",
           "Atomic","Barrier","Special","Privileged","For","Only"}
    out = []
    for s in cands:
        if s.upper() == s and s not in ban and not s.isdigit():
            out.append(s)
    return out

def collect_loongarch_base(url):
    """
    从 Kernel 文档页面抓 “List of Instructions” 小节中的助记符。
    自动回退到 kernel.org 镜像路径以避免偶发 SSL/网络问题。
    """
    candidates = [url]
    if "docs.kernel.org" in url:
        candidates.append("https://www.kernel.org/doc/html/latest/arch/loongarch/introduction.html")
        candidates.append("https://www.kernel.org/doc/html/v6.6/arch/loongarch/introduction.html")

    last_err = None
    for u in candidates:
        try:
            html = fetch(u).text
            soup = BeautifulSoup(html, "lxml")
            header = None
            for tag in soup.find_all(["h2","h3","h4"]):
                t = tag.get_text(" ", strip=True)
                if "List of Instructions" in t or t.startswith("1.2.2"):
                    header = tag; break
            if not header:
                text = soup.get_text("\n", strip=True)
                return extract_upper_tokens(text)

            node = header.next_sibling
            texts, stop = [], {"h2","h3","h4"}
            while node:
                if getattr(node, "name", None) in stop:
                    break
                if hasattr(node, "get_text"):
                    texts.append(node.get_text(" ", strip=True))
                node = node.next_sibling
            blob = "\n".join(texts)
            return extract_upper_tokens(blob)
        except Exception as e:
            last_err = e
            continue
    raise last_err

def collect_intrinsics(root_url: str, subdir: str):
    """
    遍历非官方 intrinsics 指南主页，抓取 /lsx/ 或 /lasx/ 下所有页面，
    提取其中的 'Instruction: <mnemonic>' 字段（原站通常小写带点）。
    """
    base = root_url.rstrip("/") + "/"
    soup = BeautifulSoup(fetch(base).text, "lxml")

    page_urls = set()
    for a in soup.find_all("a", href=True):
        href = a["href"].lstrip("/")
        if href.startswith(subdir.rstrip("/") + "/"):
            page_urls.add(urljoin(base, href))

    names = []
    for u in tqdm(sorted(page_urls), desc=f"crawl {subdir}"):
        try:
            txt = fetch(u).text
        except Exception:
            continue
        for m in re.finditer(r'Instruction:\s*([a-z0-9_.]+)', txt, re.IGNORECASE):
            names.append(m.group(1))  # 保留小写+点
    # 去重保序
    seen, ordered = set(), []
    for n in names:
        if n not in seen:
            seen.add(n); ordered.append(n)
    return ordered

def main():
    p = argparse.ArgumentParser(description="LoongArch 指令名抓取（base / lsx / lasx）")
    p.add_argument("--base-url", default="https://docs.kernel.org/arch/loongarch/introduction.html")
    p.add_argument("--lsx-root", default="https://jia.je/unofficial-loongarch-intrinsics-guide/")
    p.add_argument("--lasx-root", default="https://jia.je/unofficial-loongarch-intrinsics-guide/")
    p.add_argument("--out-base", default="loongarch_base")
    p.add_argument("--out-lsx", default="loongarch_lsx")
    p.add_argument("--out-lasx", default="loongarch_lasx")
    p.add_argument("--what", choices=["base","lsx","lasx","all"], default="all",
                   help="抓取范围（默认 all）")
    args = p.parse_args()

    if args.what in ("base","all"):
        dump_names(collect_loongarch_base(args.base_url), args.out_base)
    if args.what in ("lsx","all"):
        dump_names(collect_intrinsics(args.lsx_root, "lsx"), args.out_lsx)
    if args.what in ("lasx","all"):
        dump_names(collect_intrinsics(args.lasx_root, "lasx"), args.out_lasx)

if __name__ == "__main__":
    main()
