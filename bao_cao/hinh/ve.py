"""ve.py - thư viện vẽ sơ đồ khối cho báo cáo (matplotlib, tọa độ tính bằng inch, trục y hướng xuống).

Mỗi sơ đồ là một script nhỏ gọi So(...).hop(...).mui(...).luu(...). Vẽ tay vị trí thay vì để
Graphviz tự xếp, vì sơ đồ kiến trúc nhiều tầng cần các tầng thẳng hàng để dễ đọc.
"""
import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402
from matplotlib.patches import Ellipse, FancyArrowPatch, FancyBboxPatch, Rectangle  # noqa: E402

# Phong cách hình học thuật: chữ có chân (metric Times, khớp thân báo cáo Times New Roman),
# nét mảnh đen, góc vuông, tô màu nhạt ít bão hòa (in đen trắng vẫn phân biệt được), mũi tên đồng nhất.
plt.rcParams["font.family"] = "serif"
plt.rcParams["font.serif"] = ["Liberation Serif", "DejaVu Serif"]
plt.rcParams["mathtext.fontset"] = "stix"
plt.rcParams["svg.fonttype"] = "none"

MAU = {
    "nguon": "#F2F2F2", "kafka": "#DCE5F0", "luong": "#E1ECDD", "bronze": "#EADBCB",
    "silver": "#E6E6E6", "feat": "#E2E1EE", "gold": "#F1E7C2", "lo": "#E8E2EC",
    "af": "#F0DEDC", "web": "#F2F2F2", "trang": "#FFFFFF", "xam": "#F5F5F5",
    "hdfs": "#FAF7F2", "spark": "#F5F8F4", "may": "#FAFAFA",
}
VIEN = "#1F1F1F"          # viền hộp
VIEN_NHOM = "#8C8C8C"     # viền khung nhóm
NET = 0.7                 # độ dày nét chuẩn (pt)
MAU_MUI = "#1F1F1F"
NHAN = "#8E2C2C"          # màu nhấn duy nhất (luồng điều khiển, ngưỡng)

# Màu cũ (bão hòa) → bảng màu học thuật; các script hình không phải sửa từng màu.
_DOI = {
    "#FFF4DE": "#F2F2F2", "#D9E8F8": "#DCE5F0", "#DCF0DC": "#E1ECDD", "#F2D3BC": "#EADBCB",
    "#E3E3F6": "#E2E1EE", "#F8E7A1": "#F1E7C2", "#EADCF1": "#E8E2EC", "#FBDADA": "#F0DEDC",
    "#FCEFE3": "#FAF7F2", "#E9F5E9": "#F5F8F4", "#F7F9FC": "#FAFAFA", "#F4F4F4": "#F5F5F5",
    "#FBF3D0": "#F6F0D8", "#F3D35B": "#E8D58F", "#E8EEF6": "#F0F3F7", "#FBFBF3": "#FAFAF7",
    "#9DC3E6": "#B7CCE4", "#F4B183": "#EDC9A8", "#A9D18E": "#C9DDBA", "#D5B8EA": "#D6CBE3",
    "#6E8BB0": VIEN_NHOM, "#D9A47E": VIEN_NHOM, "#7FB27F": VIEN_NHOM, "#A8A8A8": VIEN_NHOM,
    "#86B886": VIEN_NHOM, "#B48CC4": VIEN_NHOM, "#CC7777": VIEN_NHOM,
    "#B04A4A": NHAN, "#8A6D3B": "#5A5A5A", "#B8964E": "#5A5A5A", "#444444": MAU_MUI, "#4D4D4D": VIEN,
}


def chuan_mau(c):
    return _DOI.get(c.upper() if isinstance(c, str) else c, c) if isinstance(c, str) else c


class So:
    def __init__(self, rong, cao, dpi=220, y0=0.0):
        self.fig = plt.figure(figsize=(rong, cao), dpi=dpi)
        self.ax = self.fig.add_axes([0, 0, 1, 1])
        self.ax.set_xlim(0, rong)
        self.ax.set_ylim(cao + y0, y0)
        self.ax.axis("off")
        self.hops = {}

    # ------------------------------------------------------------------ khung nhóm
    def nhom(self, x, y, w, h, nhan, mau="#F5F5F5", vien=VIEN_NHOM, co=8.5, net="-"):
        mau, vien = chuan_mau(mau), chuan_mau(vien)
        self.ax.add_patch(Rectangle((x, y), w, h, fc=mau, ec=vien, lw=0.6, ls=net, zorder=1))
        if nhan:
            self.ax.text(x + 0.08, y + 0.07, nhan, ha="left", va="top", fontsize=co + 0.4,
                         fontweight="bold", color="#1A1A1A", zorder=6,
                         bbox=dict(boxstyle="square,pad=0.04", fc=mau, ec="none"))

    # ------------------------------------------------------------------ hộp
    def hop(self, ten, x, y, w, h, chu, mau="#FFFFFF", co=7.6, dam_dong_dau=True, kieu="tron",
            vien=VIEN, lw=NET, chu_mau="#000000", canh="center"):
        mau, vien = chuan_mau(mau), chuan_mau(vien)
        if kieu == "tru":  # hình trụ: topic, kho dữ liệu (trục y hướng xuống)
            e = 0.07
            from matplotlib.patches import Arc
            self.ax.add_patch(Ellipse((x + w / 2, y + h - e), w, 2 * e, fc=mau, ec="none", zorder=3))
            self.ax.add_patch(Rectangle((x, y + e), w, h - 2 * e, fc=mau, ec="none", zorder=3))
            self.ax.add_patch(Arc((x + w / 2, y + h - e), w, 2 * e, theta1=0, theta2=180, ec=vien, lw=lw, zorder=4))
            self.ax.plot([x, x], [y + e, y + h - e], color=vien, lw=lw, zorder=4)
            self.ax.plot([x + w, x + w], [y + e, y + h - e], color=vien, lw=lw, zorder=4)
            self.ax.add_patch(Ellipse((x + w / 2, y + e), w, 2 * e, fc=mau, ec=vien, lw=lw, zorder=5))
        else:
            r = {"tron": 0.02, "vuong": 0.0}.get(kieu, 0.02)
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
    def mui(self, a, b, tu="s", den="n", ta=0.5, tb=0.5, nhan=None, net="-", mau=MAU_MUI, cong=0.0,
            hai_chieu=False, co=6.6, vi_tri_nhan=0.5, lech_nhan=(0, 0), lw=NET, nen_nhan=True):
        mau = chuan_mau(mau)
        p = self.diem(a, tu, ta) if isinstance(a, str) else a
        q = self.diem(b, den, tb) if isinstance(b, str) else b
        kieu = "<|-|>" if hai_chieu else "-|>"
        self.ax.add_patch(FancyArrowPatch(p, q, arrowstyle=kieu, mutation_scale=6.5, color=mau, lw=lw, ls=net,
                                          connectionstyle="arc3,rad=%s" % cong, zorder=2.5,
                                          shrinkA=0, shrinkB=0))
        if nhan:
            mx = p[0] + (q[0] - p[0]) * vi_tri_nhan + lech_nhan[0]
            my = p[1] + (q[1] - p[1]) * vi_tri_nhan + lech_nhan[1]
            self.ax.text(mx, my, nhan, fontsize=co, ha="center", va="center", color="#1A1A1A", zorder=7,
                         fontstyle="italic",
                         bbox=dict(boxstyle="square,pad=0.1", fc="white", ec="none", alpha=0.95) if nen_nhan else None)
        return self

    def duong(self, diem_list, net="-", mau=MAU_MUI, mui_cuoi=True, lw=NET):
        """Đường gấp khúc qua các điểm, mũi tên ở đoạn cuối."""
        mau = chuan_mau(mau)
        xs, ys = zip(*diem_list)
        self.ax.plot(xs[:-1], ys[:-1], color=mau, lw=lw, ls=net, zorder=2.5)
        self.ax.add_patch(FancyArrowPatch(diem_list[-2], diem_list[-1], arrowstyle="-|>" if mui_cuoi else "-",
                                          mutation_scale=6.5, color=mau, lw=lw, ls=net, zorder=2.5,
                                          shrinkA=0, shrinkB=0))
        return self

    def chu(self, x, y, noi_dung, co=7, canh="center", dam=False, mau="#1A1A1A", nghieng=False):
        mau = chuan_mau(mau)
        self.ax.text(x, y, noi_dung, fontsize=co, ha=canh, va="center", color=mau,
                     fontweight="bold" if dam else "normal", fontstyle="italic" if nghieng else "normal", zorder=7)
        return self

    def luu(self, ten_tep):
        self.fig.savefig(ten_tep, dpi=self.fig.dpi, facecolor="white")
        plt.close(self.fig)
