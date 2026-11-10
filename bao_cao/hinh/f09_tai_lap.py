"""Hình: tái lập thí nghiệm bằng time travel của Delta."""
from matplotlib.patches import Circle
from ve import MAU, So

s = So(7.4, 3.75)


def truc(y, ten, moc, mau):
    s.chu(0.12, y, ten, co=7.2, canh="left", dam=True)
    s.ax.plot([1.85, 7.2], [y, y], color="#777777", lw=1.2, zorder=2)
    s.ax.annotate("", xy=(7.28, y), xytext=(7.15, y), arrowprops=dict(arrowstyle="-|>", color="#777777", lw=1.2))
    for x, nhan, mo_ta in moc:
        s.ax.add_patch(Circle((x, y), 0.085, fc=mau, ec="#333333", lw=0.9, zorder=4))
        s.ax.text(x, y, nhan, fontsize=6.2, ha="center", va="center", zorder=5, fontweight="bold")
        s.ax.text(x, y + 0.2, mo_ta, fontsize=5.9, ha="center", va="top", zorder=5, color="#333333")


truc(0.45, "features.\nma_tran_tuong_tac", [
    (2.3, "v0", "10/11 ~08:00\nrun r20261110T075240\nfrom silver v0"),
    (6.3, "v1", "10/11 23:35, nightly DAG 1\nfrom silver v3 (price columns)\n→ model v2"),
], MAU["feat"])
truc(1.55, "silver.tuong_tac", [
    (2.3, "v0", "10/11 first load\n7 columns"),
    (4.05, "v1", "23:12 ALTER TABLE\nADD COLUMNS"),
    (4.95, "v2", "23:18 MERGE fills\nprice, stars"),
    (5.85, "v3", "23:21+ incremental\nbronze_to_silver"),
], MAU["silver"])

s.hop("ls", 0.12, 2.45, 2.3, 1.15, "gold.lich_su_huan_luyen\n(row of run r20261110T075240)\nphien_ban_features = 0,\nphien_ban_silver = 0, cut date,\nrank 50, reg 1.0, alpha 40,\nmaxIter 10, seed 42, metrics", MAU["gold"], co=6.3)
s.hop("dag", 2.75, 2.45, 2.15, 1.15, "DAG 5 kn_tai_lap\nconf {\"phien_ban_delta\": 0,\n\"che_do\": \"mo_hinh_chon\"}\nreads features VERSION AS OF 0\nre-runs tuning + evaluation\nwith the same library code", MAU["af"], co=6.3)
s.hop("kq", 5.2, 2.45, 2.08, 1.15, "gold.ket_qua_tai_lap\ntuning row: max dev. 0.000000\ntraining row: max dev. 0.000000\ntrung_khop = true\n(tolerance 1e-6)", MAU["gold"], co=6.3)
s.duong([(3.3, 2.45), (3.3, 0.22), (2.3, 0.22), (2.3, 0.36)], mau="#B04A4A", lw=1.1)
s.chu(3.62, 1.05, "time travel", co=6.4, mau="#B04A4A", dam=True)
s.mui("ls", "dag", "e", "w", nhan="parameters\n& expected\nmetrics", co=5.8, vi_tri_nhan=0.5, lech_nhan=(0, 0.33))
s.mui("dag", "kq", "e", "w")
s.chu(5.5, 2.17, "later versions do not affect the reproduction", co=6.2, nghieng=True, mau="#555555")
s.luu("f09_tai_lap.png")
