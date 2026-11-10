"""ve.py - thư viện vẽ sơ đồ khối cho báo cáo (matplotlib, tọa độ tính bằng inch, trục y hướng xuống).

Mỗi sơ đồ là một script nhỏ gọi So(...).hop(...).mui(...).luu(...). Vẽ tay vị trí thay vì để
Graphviz tự xếp, vì sơ đồ kiến trúc nhiều tầng cần các tầng thẳng hàng để dễ đọc.
"""
import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402
from matplotlib.patches import Ellipse, FancyArrowPatch, FancyBboxPatch, Rectangle  # noqa: E402

plt.rcParams["font.family"] = "Liberation Sans"
plt.rcParams["svg.fonttype"] = "none"

MAU = {
    "nguon": "#FFF4DE", "kafka": "#D9E8F8", "luong": "#DCF0DC", "bronze": "#F2D3BC",
    "silver": "#E6E6E6", "feat": "#E3E3F6", "gold": "#F8E7A1", "lo": "#EADCF1",
    "af": "#FBDADA", "web": "#FFF4DE", "trang": "#FFFFFF", "xam": "#F4F4F4",
    "hdfs": "#FCEFE3", "spark": "#E9F5E9", "may": "#F7F9FC",
}
VIEN = "#4D4D4D"


class So:
    def __init__(self, rong, cao, dpi=220, y0=0.0):
        self.fig = plt.figure(figsize=(rong, cao), dpi=dpi)
        self.ax = self.fig.add_axes([0, 0, 1, 1])
        self.ax.set_xlim(0, rong)
        self.ax.set_ylim(cao + y0, y0)
        self.ax.axis("off")
        self.hops = {}

    # ------------------------------------------------------------------ khung nhóm
    def nhom(self, x, y, w, h, nhan, mau="#F4F4F4", vien="#A8A8A8", co=8.5, net="-"):
        self.ax.add_patch(FancyBboxPatch((x, y), w, h, boxstyle="round,pad=0,rounding_size=0.08",
                                         fc=mau, ec=vien, lw=0.9, ls=net, zorder=1))
        if nhan:
            self.ax.text(x + 0.08, y + 0.06, nhan, ha="left", va="top", fontsize=co,
                         fontweight="bold", color="#333333", zorder=6,
                         bbox=dict(boxstyle="square,pad=0.03", fc=mau, ec="none"))

    # ------------------------------------------------------------------ hộp
    def hop(self, ten, x, y, w, h, chu, mau="#FFFFFF", co=7.6, dam_dong_dau=True, kieu="tron",
            vien=VIEN, lw=0.9, chu_mau="#111111", canh="center"):
        if kieu == "tru":  # hình trụ: topic, kho dữ liệu (trục y hướng xuống)
            e = 0.09
            from matplotlib.patches import Arc
            self.ax.add_patch(Ellipse((x + w / 2, y + h - e), w, 2 * e, fc=mau, ec="none", zorder=3))
            self.ax.add_patch(Rectangle((x, y + e), w, h - 2 * e, fc=mau, ec="none", zorder=3))
            self.ax.add_patch(Arc((x + w / 2, y + h - e), w, 2 * e, theta1=0, theta2=180, ec=vien, lw=lw, zorder=4))
            self.ax.plot([x, x], [y + e, y + h - e], color=vien, lw=lw, zorder=4)
            self.ax.plot([x + w, x + w], [y + e, y + h - e], color=vien, lw=lw, zorder=4)
            self.ax.add_patch(Ellipse((x + w / 2, y + e), w, 2 * e, fc=mau, ec=vien, lw=lw, zorder=5))
        else:
            r = {"tron": 0.06, "vuong": 0.0}.get(kieu, 0.06)
            self.ax.add_patch(FancyBboxPatch((x, y), w, h, boxstyle="round,pad=0,rounding_size=%s" % r,
                                             fc=mau, ec=vien, lw=lw, zorder=3))
        dong = chu.split("\n")
        tx = x + w / 2 if canh == "center" else x + 0.07
        cy = y + h / 2 + (0.04 if kieu == "tru" else 0)
        buoc = co / 72 * 1.28
        y0 = cy - buoc * (len(dong) - 1) / 2
        for i, d in enumerate(dong):
            self.ax.text(tx, y0 + i * buoc, d, ha=canh if canh != "center" else "center", va="center",
                         fontsize=co, color=chu_mau,
                         fontweight="bold" if (i == 0 and dam_dong_dau) else "normal", zorder=6)
        self.hops[ten] = (x, y, w, h)
        return self

    def diem(self, ten, phia="s", t=0.5):
        x, y, w, h = self.hops[ten]
        return {"n": (x + w * t, y), "s": (x + w * t, y + h), "w": (x, y + h * t), "e": (x + w, y + h * t)}[phia]

    # ------------------------------------------------------------------ mũi tên
    def mui(self, a, b, tu="s", den="n", ta=0.5, tb=0.5, nhan=None, net="-", mau="#444444", cong=0.0,
            hai_chieu=False, co=6.6, vi_tri_nhan=0.5, lech_nhan=(0, 0), lw=0.9, nen_nhan=True):
        p = self.diem(a, tu, ta) if isinstance(a, str) else a
        q = self.diem(b, den, tb) if isinstance(b, str) else b
        kieu = "<|-|>" if hai_chieu else "-|>"
        self.ax.add_patch(FancyArrowPatch(p, q, arrowstyle=kieu, mutation_scale=7, color=mau, lw=lw, ls=net,
                                          connectionstyle="arc3,rad=%s" % cong, zorder=2.5,
                                          shrinkA=0, shrinkB=0))
        if nhan:
            mx = p[0] + (q[0] - p[0]) * vi_tri_nhan + lech_nhan[0]
            my = p[1] + (q[1] - p[1]) * vi_tri_nhan + lech_nhan[1]
            self.ax.text(mx, my, nhan, fontsize=co, ha="center", va="center", color="#222222", zorder=7,
                         bbox=dict(boxstyle="round,pad=0.12", fc="white", ec="none", alpha=0.9) if nen_nhan else None)
        return self

    def duong(self, diem_list, net="-", mau="#444444", mui_cuoi=True, lw=0.9):
        """Đường gấp khúc qua các điểm, mũi tên ở đoạn cuối."""
        xs, ys = zip(*diem_list)
        self.ax.plot(xs[:-1], ys[:-1], color=mau, lw=lw, ls=net, zorder=2.5)
        self.ax.add_patch(FancyArrowPatch(diem_list[-2], diem_list[-1], arrowstyle="-|>" if mui_cuoi else "-",
                                          mutation_scale=7, color=mau, lw=lw, ls=net, zorder=2.5,
                                          shrinkA=0, shrinkB=0))
        return self

    def chu(self, x, y, noi_dung, co=7, canh="center", dam=False, mau="#222222", nghieng=False):
        self.ax.text(x, y, noi_dung, fontsize=co, ha=canh, va="center", color=mau,
                     fontweight="bold" if dam else "normal", fontstyle="italic" if nghieng else "normal", zorder=7)
        return self

    def luu(self, ten_tep):
        self.fig.savefig(ten_tep, dpi=self.fig.dpi, facecolor="white")
        plt.close(self.fig)
