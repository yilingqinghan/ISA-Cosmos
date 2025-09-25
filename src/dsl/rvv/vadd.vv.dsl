# ----------------------------------------------------
# RVV vadd.vv：4-lane (VLEN=128, SEW=32)
# 叙事：
#   s0 顶部展示 VRF 的 32 个向量寄存器，明确源: v1/v2，目标: v0
#   s1 载入与对齐
#   s2 位宽解释
#   s3 逐 lane 相加
#   s4 写回结果
# ----------------------------------------------------

step(s0,"选择寄存器：VRF 顶行 32 个寄存器（源: v1、v2；目标: v0）")
step(s1,"第一步：载入与对齐")
step(s2,"第二步：位宽（128-bit = 4 × 32-bit）")
step(s3,"第三步：逐 lane 相加：v0[i] = v1[i] + v2[i]")
step(s4,"第四步：写回结果")

# =============== s0：VRF 顶行（32 个寄存器，一排） ===============
# 提示标题与说明（不遮盖主画布）
text(vrf_title, 2.60, -0.28, "VRF（32 × 向量寄存器）", 14, #111827)
text(vrf_legend, 5.80, -0.28, "源寄存器: v1, v2    目标寄存器: v0", 14, #0f172a)

# 行对齐辅助（淡虚线）
group(reg_row, 2.50, -0.12, 10.40, 0.44, dotted)

# 小寄存器尺寸与间距：w=0.25, h=0.25, step=0.31（含 0.06 间距），32×0.31≈9.92 可完整放下
# v0..v31
rect(rf_v0, 0.25, 0.25, 2.60, 0.00, "v0", teal)          # 目标：高亮
rect(rf_v1, 0.25, 0.25, 2.91, 0.00, "v1", teal)          # 源：高亮
rect(rf_v2, 0.25, 0.25, 3.22, 0.00, "v2", teal)          # 源：高亮
rect(rf_v3, 0.25, 0.25, 3.53, 0.00, "v3", lightgray)
rect(rf_v4, 0.25, 0.25, 3.84, 0.00, "v4", lightgray)
rect(rf_v5, 0.25, 0.25, 4.15, 0.00, "v5", lightgray)
rect(rf_v6, 0.25, 0.25, 4.46, 0.00, "v6", lightgray)
rect(rf_v7, 0.25, 0.25, 4.77, 0.00, "v7", lightgray)
rect(rf_v8, 0.25, 0.25, 5.08, 0.00, "v8", lightgray)
rect(rf_v9, 0.25, 0.25, 5.39, 0.00, "v9", lightgray)
rect(rf_v10,0.25, 0.25, 5.70, 0.00, "v10", lightgray)
rect(rf_v11,0.25, 0.25, 6.01, 0.00, "v11", lightgray)
rect(rf_v12,0.25, 0.25, 6.32, 0.00, "v12", lightgray)
rect(rf_v13,0.25, 0.25, 6.63, 0.00, "v13", lightgray)
rect(rf_v14,0.25, 0.25, 6.94, 0.00, "v14", lightgray)
rect(rf_v15,0.25, 0.25, 7.25, 0.00, "v15", lightgray)
rect(rf_v16,0.25, 0.25, 7.56, 0.00, "v16", lightgray)
rect(rf_v17,0.25, 0.25, 7.87, 0.00, "v17", lightgray)
rect(rf_v18,0.25, 0.25, 8.18, 0.00, "v18", lightgray)
rect(rf_v19,0.25, 0.25, 8.49, 0.00, "v19", lightgray)
rect(rf_v20,0.25, 0.25, 8.80, 0.00, "v20", lightgray)
rect(rf_v21,0.25, 0.25, 9.11, 0.00, "v21", lightgray)
rect(rf_v22,0.25, 0.25, 9.42, 0.00, "v22", lightgray)
rect(rf_v23,0.25, 0.25, 9.73, 0.00, "v23", lightgray)
rect(rf_v24,0.25, 0.25, 10.04,0.00, "v24", lightgray)
rect(rf_v25,0.25, 0.25, 10.35,0.00, "v25", lightgray)
rect(rf_v26,0.25, 0.25, 10.66,0.00, "v26", lightgray)
rect(rf_v27,0.25, 0.25, 10.97,0.00, "v27", lightgray)
rect(rf_v28,0.25, 0.25, 11.28,0.00, "v28", lightgray)
rect(rf_v29,0.25, 0.25, 11.59,0.00, "v29", lightgray)
rect(rf_v30,0.25, 0.25, 11.90,0.00, "v30", lightgray)
rect(rf_v31,0.25, 0.25, 12.21,0.00, "v31", lightgray)

# 从选中框指向下方放大区
arrow(sel_to_zoom, 3.05, 0.45, 6.00, 1, 2.0, "", true, #111827, false, true)

# 顶排出现 + 三个关键寄存器“呼吸”高亮
appear(vrf_title, vrf_legend, reg_row,
       rf_v0, rf_v1, rf_v2, rf_v3, rf_v4, rf_v5, rf_v6, rf_v7, rf_v8, rf_v9, rf_v10, rf_v11, rf_v12, rf_v13,
       rf_v14, rf_v15, rf_v16, rf_v17, rf_v18, rf_v19, rf_v20, rf_v21, rf_v22, rf_v23, rf_v24, rf_v25, rf_v26, rf_v27, rf_v28, rf_v29, rf_v30, rf_v31,
       sel_box, sel_to_zoom, s0)

blink(rf_v0, rf_v1, rf_v2, s0, 6, 450)

# =============== s1：载入与对齐（进入放大视图） ===============
# 行标签（仅用于视觉提示）
label(tag_v1, 2.8, 1.5, "v1")
label(tag_v2, 2.8, 2.8, "v2")
label(tag_v0, 2.8, 4.2, "v0")

# 放大后的 4-lane 内容
vec4(v1, 4.0, 1.1, "1,2,3,4",        lightgray, x, 0.2)
vec4(v2, 4.0, 2.4, "10,11,12,13",    teal,      x, 0.2)

# 顶排淡出，放大区淡入
disappear(vrf_title, vrf_legend, reg_row, rf_v0, rf_v1, rf_v2, rf_v3, rf_v4, rf_v5, rf_v6, rf_v7, rf_v8, rf_v9, rf_v10, rf_v11, rf_v12, rf_v13, rf_v14, rf_v15, rf_v16, rf_v17, rf_v18, rf_v19, rf_v20, rf_v21, rf_v22, rf_v23, rf_v24, rf_v25, rf_v26, rf_v27, rf_v28, rf_v29, rf_v30, rf_v31, sel_box, sel_to_zoom, s1)
appear(tag_v1, tag_v2, v1, v2, v1__box, v2__box, s1)

# =============== s2：位宽解释（128-bit = 4 × 32-bit） ===============
label(dim_text, 4.8, 0.2, "向量位宽 128-bit（4 × 32-bit）")

text(b0, 4.3, 0.60, "32b", 14)
text(b1, 5.5, 0.60, "32b", 14)
text(b2, 6.7, 0.60, "32b", 14)
text(b3, 7.95,0.60, "32b", 14)

appear(dim, dim_text, b0, b1, b2, b3, s2)
disappear(, s2)
blink(dim, dim_text, s2, 4, 300)

# =============== s3：逐 lane 相加（自顶向下流动） ===============
vec4(v0, 4.0, 3.8, "", lightgray, x, 0.2, nobox)

line(l1, 3.6, 3.65, 8.8, 3.65, 3.3, black)
text(plus, 3.34, 3.5, "+", 40)

appear(tag_v0, v0, l1, plus, s3)
blink(l1, plus, s3, 3, 240)

# =============== s4：写回结果（覆盖 v0 空槽） ===============
square(z0, 4.0, 3.8, "11", teal)
square(z1, 5.2, 3.8, "13", teal)
square(z2, 6.4, 3.8, "15", teal)
square(z3, 7.6, 3.8, "17", teal)

disappear(dim, dim_text, b0, b1, b2, b3, s4)
disappear(v0[0..3], s4)
appear(z0, z1, z2, z3, s4)
blink(z0, z1, z2, z3, s4, 2, 300)
