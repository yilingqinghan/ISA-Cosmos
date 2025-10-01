#!/usr/bin/env bash
set -euo pipefail

PY=${PY:-python3}

# 1) 抓取 Intel SDM Vol.2 A–Z（可加 --url-intel 多个候选；默认内置两条候选）
$PY x86_instr_names.py --mode intel --out x86_intel

# 2) (可选) 抓取 AMD APM Vol.4（需自备 URL 或 file://）
# $PY x86_instr_names.py --mode amd --out x86_amd --url-amd "file://$PWD/26568.pdf"
# $PY x86_instr_names.py --mode both --out x86 --url-amd "file://$PWD/26568.pdf"

# 3) 生成 .ts（重写）
$PY x86_make_docs.py --clean \
  --bucket x86=x86_intel.txt

# 4) 打包
ZIP_NAME="x86_docs.zip"
rm -f "$ZIP_NAME"
zip -r "$ZIP_NAME" x86 >/dev/null
echo "[ok] packed -> $ZIP_NAME"
