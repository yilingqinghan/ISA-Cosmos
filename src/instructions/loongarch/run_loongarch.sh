#!/usr/bin/env bash
set -euo pipefail

PY=${PY:-python3}

# 1) 抓取（Base + LSX + LASX）
$PY loongarch_instr_names.py --what base --out-base loongarch_base \
  --base-url "https://docs.kernel.org/arch/loongarch/introduction.html" || true

# 回退尝试（若上一步失败）
if [ ! -s loongarch_base.txt ]; then
  echo "[info] retry base with kernel.org mirror (latest)"
  $PY loongarch_instr_names.py --what base --out-base loongarch_base \
    --base-url "https://www.kernel.org/doc/html/latest/arch/loongarch/introduction.html" || true
fi
if [ ! -s loongarch_base.txt ]; then
  echo "[info] retry base with kernel.org mirror (v6.6)"
  $PY loongarch_instr_names.py --what base --out-base loongarch_base \
    --base-url "https://www.kernel.org/doc/html/v6.6/arch/loongarch/introduction.html" || true
fi

$PY loongarch_instr_names.py --what lsx  --out-lsx  loongarch_lsx
$PY loongarch_instr_names.py --what lasx --out-lasx loongarch_lasx

# 2) 生成 .ts （重写）
$PY loongarch_make_docs.py --clean \
  --bucket loongarch=loongarch_base.txt \
  --bucket loongarch-lsx=loongarch_lsx.txt \
  --bucket loongarch-lasx=loongarch_lasx.txt

# 3) 打包
ZIP_NAME="loongarch_docs.zip"
rm -f "$ZIP_NAME"
zip -r "$ZIP_NAME" loongarch loongarch-lsx loongarch-lasx >/dev/null
echo "[ok] packed -> $ZIP_NAME"
