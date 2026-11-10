"""Biểu đồ số liệu cho báo cáo. Số liệu chép từ MO_HINH.md mục 12 (xuất bằng
jobs/kiem_tra/xuat_ket_qua.py trên cụm ngày 10/11/2026) và từ tinh_trang.sh."""
import math

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402
import numpy as np  # noqa: E402

plt.rcParams.update({"font.family": "Liberation Sans", "font.size": 8.5, "axes.titlesize": 9,
                     "axes.titleweight": "bold", "axes.spines.top": False, "axes.spines.right": False,
                     "savefig.dpi": 220, "savefig.bbox": "tight"})
XANH, CAM, XAM, LUC, DO = "#2F6DB5", "#E07B39", "#9A9A9A", "#4E9A4E", "#B04A4A"

# ---------------------------------------------------------------- C1 tuning
ndcg = {10: [[0.0158, 0.0213, 0.0228], [0.0148, 0.0221, 0.0233], [0.0121, 0.0234, 0.0241]],
        30: [[0.0252, 0.0396, 0.0493], [0.0250, 0.0409, 0.0490], [0.0227, 0.0454, 0.0505]],
        50: [[0.0313, 0.0526, 0.0668], [0.0328, 0.0531, 0.0662], [0.0309, 0.0574, 0.0680]]}
fig, axs = plt.subplots(1, 3, figsize=(7.2, 2.5), sharey=True)
for ax, r in zip(axs, (10, 30, 50)):
    m = np.array(ndcg[r])
    im = ax.imshow(m, cmap="YlGnBu", vmin=0.01, vmax=0.07)
    for i in range(3):
        for j in range(3):
            ax.text(j, i, "%.4f" % m[i, j], ha="center", va="center", fontsize=7.5,
                    color="white" if m[i, j] > 0.045 else "black",
                    fontweight="bold" if (r == 50 and i == 2 and j == 2) else "normal")
    ax.set_xticks(range(3), ["1", "10", "40"]); ax.set_yticks(range(3), ["0.01", "0.1", "1.0"])
    ax.set_xlabel("alpha"); ax.set_title("rank = %d" % r)
    for sp in ax.spines.values():
        sp.set_visible(False)
axs[0].set_ylabel("regParam")
cb = fig.colorbar(im, ax=axs, shrink=0.85, pad=0.02); cb.set_label("NDCG@10")
fig.savefig("c01_tuning.png"); plt.close(fig)

# ---------------------------------------------------------------- C2 phương pháp
ten = ["Baseline 1", "Baseline 2", "ALS", "Re-rank\nβ 0.1", "Re-rank\nβ 0.3", "Served\nβ 1.0, 200"]
nd = [0.0051, 0.0475, 0.0680, 0.0702, 0.0746, 0.0865]
cov = [0.01, 5.28, 3.44, 3.65, 4.14, 6.47]
fig, (a1, a2) = plt.subplots(1, 2, figsize=(7.2, 2.7))
mau = [XAM, XAM, XANH, XANH, XANH, CAM]
a1.bar(range(6), nd, color=mau); a1.set_xticks(range(6), ten, fontsize=6.4); a1.set_title("NDCG@10 (test month, 9,467 users)")
for i, v in enumerate(nd):
    a1.text(i, v + 0.0015, "%.4f" % v, ha="center", fontsize=6.6)
a2.bar(range(6), cov, color=mau); a2.set_xticks(range(6), ten, fontsize=6.4); a2.set_title("Coverage of train items (%)")
a2.axhline(10, color=DO, ls="--", lw=1); a2.text(5.4, 10.25, "target 10 %", color=DO, fontsize=6.8, ha="right")
for i, v in enumerate(cov):
    a2.text(i, v + 0.2, "%.2f" % v, ha="center", fontsize=6.6)
a2.set_ylim(0, 11.5)
fig.tight_layout(); fig.savefig("c02_phuong_phap.png"); plt.close(fig)

# ---------------------------------------------------------------- C3 phân phối độ phổ biến
nhom = ["N1 (top 10 %)", "N2", "N3", "N4", "N5–N10"]
dl = {"Baseline 1": [100, 0, 0, 0, 0], "Baseline 2": [86.5, 8.1, 2.6, 1.3, 1.4], "ALS": [99.2, 0.6, 0.1, 0.0, 0.1],
      "ALS + re-rank β = 0.3": [98.3, 1.3, 0.2, 0.1, 0.1], "Served (β = 1.0, 200)": [80.8, 11.2, 4.3, 2.0, 1.9]}
mau_n = ["#1F4E79", "#2E75B6", "#9DC3E6", "#F4B183", "#C55A11"]
fig, ax = plt.subplots(figsize=(7.2, 2.4))
y = np.arange(len(dl))[::-1]
trai = np.zeros(len(dl))
for k, n in enumerate(nhom):
    v = np.array([dl[m][k] for m in dl])
    ax.barh(y, v, left=trai, color=mau_n[k], label=n, height=0.6)
    trai += v
ax.set_yticks(y, list(dl.keys())); ax.set_xlim(0, 100); ax.set_xlabel("share of recommendation slots (%)")
ax.set_xlim(60, 100)
ax.legend(ncol=5, fontsize=6.6, loc="upper center", bbox_to_anchor=(0.5, 1.22), frameon=False)
fig.savefig("c03_pho_bien.png"); plt.close(fig)

# ---------------------------------------------------------------- C4 xếp lại
d50 = [(0, 3.44, 0.0680), (0.3, 4.14, 0.0746), (0.5, 4.65, 0.0797), (1.0, 5.67, 0.0854), (2.0, 6.30, 0.0683)]
d200 = [(0.5, 4.74, 0.0789), (1.0, 6.47, 0.0865), (2.0, 7.21, 0.0518)]
fig, ax = plt.subplots(figsize=(6.2, 3.0))
ax.plot([p[1] for p in d50], [p[2] for p in d50], "-o", color=XANH, label="50 candidates")
ax.plot([p[1] for p in d200], [p[2] for p in d200], "-s", color=CAM, label="200 candidates")
for b, c, n in d50:
    ax.annotate("β=%s" % b, (c, n), textcoords="offset points", xytext=(-4, 7), fontsize=6.6, color=XANH)
for b, c, n in d200:
    ax.annotate("β=%s" % b, (c, n), textcoords="offset points", xytext=(5, -10), fontsize=6.6, color=CAM)
ax.scatter([5.28], [0.0475], marker="^", color=XAM, zorder=3); ax.annotate("Baseline 2", (5.28, 0.0475), xytext=(6, -3), textcoords="offset points", fontsize=6.6, color="#555555")
ax.axvline(10, color=DO, ls="--", lw=1)
ax.annotate("served configuration", (6.47, 0.0865), xytext=(7.4, 0.090), fontsize=6.8, arrowprops=dict(arrowstyle="->", color="#333333", lw=0.8))
ax.set_xlabel("Coverage of train items (%)"); ax.set_ylabel("NDCG@10"); ax.set_xlim(3, 10.5); ax.set_ylim(0.04, 0.095)
ax.text(9.9, 0.042, "target 10 %", color=DO, fontsize=6.8, ha="right")
ax.legend(fontsize=7, frameon=False, loc="lower left")
fig.savefig("c04_xep_lai.png"); plt.close(fig)

# ---------------------------------------------------------------- C5 ZORDER
gd = ["Fragmented\n(200 files)", "OPTIMIZE only\n(67 files)", "OPTIMIZE ZORDER BY\nma_nguoi_dung (55 files)"]
med, p95, doc = [10793, 8280, 980], [13420, 9524, 1387], [200, 67, 1.07]
fig, ax = plt.subplots(figsize=(6.2, 2.6))
x = np.arange(3)
ax.bar(x - 0.18, med, 0.36, color=XANH, label="median"); ax.bar(x + 0.18, p95, 0.36, color="#9DC3E6", label="p95")
for i in range(3):
    ax.text(x[i] - 0.18, med[i] + 250, "{:,}".format(med[i]), ha="center", fontsize=6.6)
    ax.text(x[i], max(med[i], p95[i]) + 1300, "files read / query: %s" % doc[i], ha="center", fontsize=6.8, color=DO)
ax.set_xticks(x, gd, fontsize=7); ax.set_ylabel("latency of WHERE ma_nguoi_dung = ? (ms)"); ax.set_ylim(0, 16500)
ax.legend(frameon=False, fontsize=7)
fig.savefig("c05_zorder.png"); plt.close(fig)

# ---------------------------------------------------------------- C6 A/B
def kt(x, n):
    p = x / n
    return 100 * p, 100 * 1.96 * math.sqrt(p * (1 - p) / n)


ctr = [kt(3685, 175960), kt(3446, 174200)]
cvr = [kt(412, 175960), kt(417, 174200)]
fig, (a1, a2) = plt.subplots(1, 2, figsize=(6.6, 2.4))
for ax, d, t, p in ((a1, ctr, "CTR (%) · z = −2.43, p = 0.015", "%.3f"), (a2, cvr, "Conversion (%) · p = 0.75", "%.3f")):
    ax.bar([0, 1], [v[0] for v in d], yerr=[v[1] for v in d], color=[XANH, CAM], capsize=5, width=0.55)
    ax.set_xticks([0, 1], ["A: ALS only\n175,960 impr.", "B: ALS + 30 % trending\n174,200 impr."], fontsize=7)
    ax.set_title(t)
    for i, v in enumerate(d):
        ax.text(i, v[0] + v[1] * 1.3, p % v[0], ha="center", fontsize=7)
a1.set_ylim(1.7, 2.25); a2.set_ylim(0.15, 0.3)
fig.tight_layout(); fig.savefig("c06_ab.png"); plt.close(fig)

# ---------------------------------------------------------------- C7 RAM master
fig, ax = plt.subplots(figsize=(6.6, 2.3))
nhan = ["22:20 before\n(Cassandra running)", "23:18 Airflow + 3 streams\n+ reproduction job"]
thanh = [[("Cassandra (not ours)", 2.47, "#7F7F7F"), ("NameNode + Spark Master", 0.72, "#9DC3E6"), ("other OS processes", 0.41, "#D9D9D9")],
         [("Spark drivers: 3 streams + DAG 5", 3.56, XANH), ("Airflow (slim)", 0.89, "#F4B183"), ("NameNode", 0.22, "#9DC3E6"), ("other OS processes", 0.53, "#D9D9D9")]]
kha_dung = [3.2, 1.8]
for i, cac in enumerate(thanh):
    trai = 0
    for ten_c, v, m in cac:
        ax.barh(i, v, left=trai, color=m, height=0.5, edgecolor="white")
        if v > 0.8:
            ax.text(trai + v / 2, i, "%s\n%.2f GB" % (ten_c, v), ha="center", va="center", fontsize=6.2,
                    color="white" if m in (XANH, "#7F7F7F") else "black")
        trai += v
    ax.barh(i, kha_dung[i], left=trai, color="white", edgecolor=LUC, hatch="//", height=0.5)
    ax.text(trai + kha_dung[i] / 2, i, "available\n%.1f GB" % kha_dung[i], ha="center", va="center", fontsize=6.4, color=LUC)
ax.set_yticks([0, 1], nhan, fontsize=7); ax.set_xlim(0, 7.4); ax.set_xlabel("GB (master host, 7.4 GB total; remainder is cache and shared memory)")
ax.invert_yaxis()
from matplotlib.patches import Patch
ax.legend(handles=[Patch(color="#9DC3E6", label="NameNode (+ Spark Master at 22:20)"), Patch(color="#D9D9D9", label="other OS processes")],
          fontsize=6.4, frameon=False, loc="lower right", bbox_to_anchor=(1.0, 1.0), ncol=2)
fig.savefig("c07_ram_master.png"); plt.close(fig)
print("xong")
