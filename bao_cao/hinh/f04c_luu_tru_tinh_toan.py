"""Hình: lakehouse tách hai tầng, LƯU TRỮ ở trên và TÍNH TOÁN ở dưới (slide 7, Hình 4.1 báo cáo), theo góp ý của
GVHD ngày 19/11/2026: tầng lưu trữ chỉ có Bronze, Silver, Gold; các bước chuyển đổi (bronze → silver, silver →
features, ... → gold) là job Spark nằm ở tầng dưới, đọc từ tầng trên rồi ghi lại tầng trên.

Tên bảng và job lấy đúng từ mã nguồn: jobs/common/cau_hinh.py (đường dẫn bảng), jobs/streaming/nap_su_kien.py,
tinh_thinh_hanh.py, ghi_hien_thi.py, jobs/transform/bronze_to_silver.py, jobs/ml/chuan_bi_ma_tran.py,
huan_luyen_als.py, danh_gia.py, sinh_goi_y_toan_bo.py, tron_goi_y.py, ghi_gold.py; lịch từ airflow/dags.

  python3 f04c_luu_tru_tinh_toan.py   # sinh f04c_luu_tru_tinh_toan_vi.{png,svg} và _en.{png,svg}
"""
from ve import BANG, So
from matplotlib.patches import FancyBboxPatch

T = {
    "vi": {
        "lt": "LƯU TRỮ\nHadoop HDFS\n+ Delta Lake 3.2\nchỉ giữ dữ liệu",
        "tt": "TÍNH TOÁN\nSpark 3.5.3\nđọc từ tầng trên,\nbiến đổi, ghi lại",
        "br": "Bronze\nbronze.su_kien\nsự kiện thô, Parquet\nchỉ ghi thêm, theo ngày",
        "sv": "Silver\nsilver.tuong_tac\ntương tác đã làm sạch\nDelta, theo ngày",
        "gd": "Gold\ngoi_y_nguoi_dung · thinh_hanh_15p\nnhat_ky_hien_thi · ket_qua_ab\nbảng phục vụ web, Delta (MERGE, CDF)",
        "lo": "Lô hằng đêm\nDAG kn_pipeline_\nhang_ngay, 02:00",
        "luong": "Luồng liên tục (Structured Streaming) đọc thẳng từ Kafka",
        "j1": "bronze_to_silver\nkhử trùng, lọc bot\ndòng loại → _quarantine",
        "j2": "chuan_bi_ma_tran\nđiểm có suy giảm\nchia train/test, indexer",
        "ft": "features\nma_tran_\ntuong_tac",
        "j3": "huan_luyen_als\n+ danh_gia\ntinh chỉnh, NDCG@10",
        "j4": "sinh_goi_y_toan_bo\ntron_goi_y\nghi_gold (MERGE)",
        "kf": "Kafka\n2 topic",
        "k1": "nap_su_kien\n15 s · Kafka → bronze",
        "k2": "tinh_thinh_hanh (20 s)\nghi_hien_thi (30 s)",
        "doc": "đọc", "ghi": "ghi",
        "khac": "Cùng mẫu đọc → biến đổi → ghi: thong_ke_san_pham, san_pham_lien_quan (silver → gold);\ntinh_ket_qua_ab mỗi giờ (gold → gold); toi_uu_delta 04:00 (OPTIMIZE, ZORDER, VACUUM).",
        "chu_thich": "Mọi bảng nằm dưới hdfs:///lakehouse/bd03_khuyen_nghi/. features và _quarantine là bảng trung gian của tầng tính toán, không phải một tầng lưu trữ.",
    },
    "en": {
        "lt": "STORAGE\nHadoop HDFS\n+ Delta Lake 3.2\nholds data only",
        "tt": "COMPUTE\nSpark 3.5.3\nreads the layer above,\ntransforms, writes back",
        "br": "Bronze\nbronze.su_kien\nraw events, Parquet\nappend-only, by day",
        "sv": "Silver\nsilver.tuong_tac\ncleaned interactions\nDelta, by day",
        "gd": "Gold\ngoi_y_nguoi_dung · thinh_hanh_15p\nnhat_ky_hien_thi · ket_qua_ab\ntables served to the web, Delta (MERGE, CDF)",
        "lo": "Nightly batch\nDAG kn_pipeline_\nhang_ngay, 02:00",
        "luong": "Continuous jobs (Structured Streaming) read straight from Kafka",
        "j1": "bronze_to_silver\ndedup, bot filter\nrejects → _quarantine",
        "j2": "chuan_bi_ma_tran\ndecayed scores\ntime split, indexers",
        "ft": "features\nma_tran_\ntuong_tac",
        "j3": "huan_luyen_als\n+ danh_gia\ntuning, NDCG@10",
        "j4": "sinh_goi_y_toan_bo\ntron_goi_y\nghi_gold (MERGE)",
        "kf": "Kafka\n2 topics",
        "k1": "nap_su_kien\n15 s · Kafka → bronze",
        "k2": "tinh_thinh_hanh (20 s)\nghi_hien_thi (30 s)",
        "doc": "read", "ghi": "write",
        "khac": "Same read → transform → write pattern: thong_ke_san_pham, san_pham_lien_quan (silver → gold);\ntinh_ket_qua_ab hourly (gold → gold); toi_uu_delta at 04:00 (OPTIMIZE, ZORDER, VACUUM).",
        "chu_thich": "All tables live under hdfs:///lakehouse/bd03_khuyen_nghi/. features and _quarantine are intermediate tables of the compute layer, not a storage layer.",
    },
}

CD = 5.9


def ve(nn):
    t = T[nn]
    s = So(7.4, 2.86)
    # ---------------------------------------------------------------- tầng lưu trữ
    s.ax.add_patch(FancyBboxPatch((0.08, 0.08), 7.24, 1.02, boxstyle="round,pad=0,rounding_size=0.035",
                                  fc=BANG["hdfs"][2], ec=BANG["hdfs"][1], lw=0.8, zorder=1))
    s.hop("lt", 0.12, 0.13, 1.06, 0.92, t["lt"], "hdfs", co=6.4, nghieng_dong=(3,))
    s.hop("br", 1.45, 0.17, 1.20, 0.82, t["br"], "bronze", co=CD, kieu="tru")
    s.hop("sv", 3.15, 0.17, 1.20, 0.82, t["sv"], "silver", co=CD, kieu="tru")
    s.hop("gd", 5.00, 0.17, 2.25, 0.82, t["gd"], "gold", co=CD, kieu="tru")

    # ---------------------------------------------------------------- tầng tính toán
    s.ax.add_patch(FancyBboxPatch((0.08, 1.16), 7.24, 1.42, boxstyle="round,pad=0,rounding_size=0.035",
                                  fc=BANG["spark"][2], ec=BANG["spark"][1], lw=0.8, zorder=1))
    s.hop("tt", 0.12, 1.21, 1.06, 1.32, t["tt"], "spark", co=6.4, nghieng_dong=(2, 3))
    s.chu(1.67, 1.59, t["lo"], co=5.5, nghieng=True, mau="#8A5A00")
    s.chu(4.10, 2.435, t["luong"], co=5.5, nghieng=True, mau="#2E7D32")

    # Lô: bronze → silver → features → gold, mỗi bước là một job đọc tầng trên và ghi lại tầng trên
    y, h = 1.36, 0.46
    s.hop("j1", 2.30, y, 1.00, h, t["j1"], "lo", co=5.6)
    s.hop("j2", 3.70, y, 0.86, h, t["j2"], "lo", co=5.6)
    s.hop("ft", 4.66, y + 0.02, 0.50, h - 0.04, t["ft"], "feat", co=5.3, kieu="tru", dam_dong_dau=True)
    s.hop("j3", 5.26, y, 0.78, h, t["j3"], "lo", co=5.6)
    s.hop("j4", 6.12, y, 0.92, h, t["j4"], "lo", co=5.4)
    # đọc (xuống) và ghi (lên) giữa hai tầng
    s.mui((2.52, 0.99), (2.52, y), nhan=t["doc"], co=5.3, vi_tri_nhan=0.55, lech_nhan=(-0.11, 0), nen_nhan=False)
    s.mui((3.22, y), (3.22, 0.99), nhan=t["ghi"], co=5.3, vi_tri_nhan=0.45, lech_nhan=(-0.1, 0), nen_nhan=False)
    s.mui((4.05, 0.99), (4.05, y), nhan=t["doc"], co=5.3, vi_tri_nhan=0.55, lech_nhan=(-0.11, 0), nen_nhan=False)
    s.mui("j2", "ft", "e", "w")
    s.mui("ft", "j3", "e", "w")
    s.mui("j3", "j4", "e", "w")
    s.mui((6.58, y), (6.58, 0.99), nhan=t["ghi"], co=5.3, vi_tri_nhan=0.45, lech_nhan=(-0.1, 0), nen_nhan=False)

    # Luồng: Kafka → bronze và Kafka → gold
    y2, h2 = 2.02, 0.36
    s.hop("kf", 1.30, y2 - 0.01, 0.52, h2 + 0.02, t["kf"], "kafka", co=5.5, kieu="tru")
    s.hop("k1", 1.92, y2, 1.08, h2, t["k1"], "luong", co=5.6)
    s.hop("k2", 6.12, y2, 1.10, h2, t["k2"], "luong", co=5.6)
    s.mui("kf", "k1", "e", "w", loai="luong")
    s.mui((2.10, y2), (2.10, 0.99), loai="luong")
    s.duong([(1.56, y2 + h2 + 0.01), (1.56, 2.50), (6.67, 2.50), (6.67, y2 + h2)], loai="luong")
    s.mui((7.14, y2), (7.14, 0.99), loai="luong")
    s.chu(4.53, 2.20, t["khac"], co=5.15, nghieng=True, mau="#5A4A2A")

    s.chu(3.70, 2.72, t["chu_thich"], co=5.5, nghieng=True, mau="#444444")
    s.luu("f04c_luu_tru_tinh_toan_%s.png" % nn)


if __name__ == "__main__":
    for nn in ("vi", "en"):
        ve(nn)
