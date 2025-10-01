#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
arm_instr_names.py
从 ARM 文档站“按字母序的指令列表”页面抓【指令名（只名字）】并导出 txt/csv。
兼容：
- 旧 AArch32/ARMv7 列表（大量 a[title]）
- 新 AArch64 (DDI0602) 各分区列表（很多 <a> 没有 title，用链接文本/h标题提取）

依赖：
  pip install pyppeteer beautifulsoup4 lxml

示例（macOS Chrome 路径请按需修改）：
  python arm_instr_names.py --url "https://developer.arm.com/documentation/ddi0602/latest/Base-Instructions" \
    --out armv8_base --chrome "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
"""
import argparse, asyncio, csv, re
from bs4 import BeautifulSoup

UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123 Safari/537.36"

def clean(s: str) -> str:
    return re.sub(r"\s+", " ", (s or "").strip())

def looks_like_name(s: str) -> bool:
    if not s: return False
    s = s.strip()
    if len(s) > 100 or len(s) < 1: return False
    # 放宽：允许括号/逗号/斜线/空格；核心字母基本是大写
    core = re.sub(r"[0-9\s,\-\(\)\/\+_]", "", s)
    return bool(core) and core.upper() == core

async def render_and_get_html(url: str, chrome_path: str, timeout: int = 45) -> str:
    from pyppeteer import launch
    launch_kwargs = {"args": ["--no-sandbox"], "handleSIGINT": False, "handleSIGTERM": False, "handleSIGHUP": False}
    if chrome_path:
        launch_kwargs["executablePath"] = chrome_path  # 用本机 Chrome，避免下载
    browser = await launch(**launch_kwargs)
    try:
        page = await browser.newPage()
        await page.setUserAgent(UA)
        await page.goto(url, {"waitUntil": "networkidle2", "timeout": timeout * 1000})
        # DDI0406 旧页（a[title]），DDI0602 新页（列表/表格中的 a）
        try:
            await page.waitForSelector('a, h1, h2, h3', {"timeout": 15000})
        except Exception:
            pass
        return await page.content()
    finally:
        await browser.close()

def extract_names_from_html(html: str, base_url: str):
    soup = BeautifulSoup(html, "lxml")
    names = set()

    # 1) 旧页（如 DDI0406）：优先 a[title]
    for a in soup.select('a[title]'):
        t = clean(a.get("title"))
        if looks_like_name(t):
            names.add(t)

    # 2) 新页（如 DDI0602）：大量链接没有 title —— 抓 <a> 的**可见文本**
    #    常见结构：main/section/article 内的列表、表格
    for a in soup.select("main a, section a, article a, ul a, ol a, table a"):
        txt = clean(a.get_text(" "))
        if looks_like_name(txt):
            names.add(txt)

    # 3) 有些页是“每条指令一个详情页”，当前页只有标题
    for h in soup.select("main h1, main h2, article h1, article h2, h3"):
        txt = clean(h.get_text(" "))
        if looks_like_name(txt):
            names.add(txt)

    # 4) 轻度去噪：删常见非指令项
    bad = {"Contents", "Back to top", "Home", "Previous", "Next"}
    names = {n for n in names if n not in bad}

    # 5) 拆“BL, BLX (immediate)”之类
    split_out = set()
    for n in list(names):
        parts = [clean(p) for p in re.split(r"\s*,\s*", n) if p.strip()]
        if len(parts) > 1 and all(looks_like_name(p) for p in parts):
            split_out.update(parts)
        else:
            split_out.add(n)

    # 6) 排序
    return sorted(split_out, key=lambda x: (x.upper(), x))

def save(names, out_prefix):
    with open(out_prefix + ".txt", "w", encoding="utf-8") as f:
        for n in names: f.write(n + "\n")
    with open(out_prefix + ".csv", "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f); w.writerow(["name"])
        for n in names: w.writerow([n])

async def main_async(url: str, out_prefix: str, timeout: int, chrome_path: str):
    html = await render_and_get_html(url, chrome_path, timeout=timeout)
    names = extract_names_from_html(html, url)
    print(f"[info] got {len(names)} names")
    save(names, out_prefix)
    print(f"[ok] written:\n  - {out_prefix}.txt\n  - {out_prefix}.csv")

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--url", required=True)
    ap.add_argument("--out", default="arm_instr_names")
    ap.add_argument("--timeout", type=int, default=45)
    ap.add_argument("--chrome", default="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
                    help="本机 Chrome/Chromium 可执行路径")
    args = ap.parse_args()
    asyncio.run(main_async(args.url, args.out, args.timeout, args.chrome))

if __name__ == "__main__":
    main()

