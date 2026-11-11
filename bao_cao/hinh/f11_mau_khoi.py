"""Hình: mẫu 10 ô hiển thị của khối 'Dành cho bạn' theo chiến lược và nhóm A/B."""
from matplotlib.patches import FancyBboxPatch
from ve import So, chuan_mau

MAU_O = {"a": ("#9DC3E6", "ALS (re-ranked)"), "t": ("#F4B183", "trending (15-min window)"),
         "m": ("#A9D18E", "new item, user's main category"), "d": ("#D5B8EA", "best seller in a viewed category")}
hang = [
    ("Group A: ALS only (active user, ≥ 5 interactions)", "aaaaaaaamm"),
    ("Group B: ALS + 30 % trending (active user)", "aataatatmm"),
    ("Few interactions (< 5): 50/50 categories / trending", "dtdtdtdtdt"),
    ("Brand-new user: trending only", "tttttttttt"),
]
s = So(7.4, 2.85)
for r, (nhan, mau) in enumerate(hang):
    y = 0.2 + r * 0.55
    s.chu(0.1, y + 0.2, nhan, co=6.9, canh="left", dam=(r < 2))
    for k, c in enumerate(mau):
        x = 3.05 + k * 0.42
        s.ax.add_patch(FancyBboxPatch((x, y), 0.36, 0.4, boxstyle="square,pad=0",
                                      fc=chuan_mau(MAU_O[c][0]), ec="#1F1F1F", lw=0.6, zorder=3))
        s.ax.text(x + 0.18, y + 0.2, c, fontsize=7.2, ha="center", va="center", zorder=4, fontstyle="italic")
for k in range(10):
    s.chu(3.05 + k * 0.42 + 0.18, 0.08, str(k + 1), co=6.2, mau="#333333")
x = 0.1
for c in "atmd":
    s.ax.add_patch(FancyBboxPatch((x, 2.5), 0.2, 0.2, boxstyle="square,pad=0",
                                  fc=chuan_mau(MAU_O[c][0]), ec="#1F1F1F", lw=0.6, zorder=3))
    s.chu(x + 0.1, 2.6, c, co=6.6, nghieng=True)
    s.chu(x + 0.28, 2.6, MAU_O[c][1], co=6.3, canh="left")
    x += 1.85
s.luu("f11_mau_khoi.png")
