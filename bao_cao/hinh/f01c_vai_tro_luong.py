"""Hình: kiến trúc theo vai trò và theo luồng (slide 5, Hình 2.1 báo cáo), sửa theo góp ý của GVHD ngày 19/11/2026.

Mỗi CỘT là một thành phần và ghi rõ nó làm gì (Kafka thu nhận, Spark tính toán, HDFS + Delta Lake lưu trữ,
web phục vụ); mỗi HÀNG là một luồng (thời gian thực, lô hằng đêm, phục vụ và phản hồi); dải dưới cùng là
Airflow, chỉ điều phối các job Spark. Tên job, bảng, topic và lịch lấy đúng từ mã nguồn:
jobs/streaming/*.py, jobs/transform/bronze_to_silver.py, jobs/ml/*.py, jobs/common/cau_hinh.py,
airflow/dags/kn_*.py, cau_hinh/cum.env.

  python3 f01c_vai_tro_luong.py      # sinh f01c_vai_tro_luong_vi.{png,svg} và f01c_vai_tro_luong_en.{png,svg}
"""
from ve import BANG, So
from matplotlib.patches import FancyBboxPatch

T = {
    "vi": {
        "cot": [
            ("xam", "Nguồn sự kiện", "SINH sự kiện đầu vào", "producer trên labsit"),
            ("kafka", "Kafka 3.7", "THU NHẬN, đệm sự kiện", "giữ thứ tự theo người dùng"),
            ("spark", "Spark 3.5.3", "TÍNH TOÁN: luồng, lô, ALS", "5 worker, 34 lõi"),
            ("hdfs", "Hadoop HDFS 3.5 + Delta 3.2", "LƯU TRỮ bảng và phiên bản", "5 DataNode, nhân bản 2"),
            ("web", "Web FastAPI", "PHỤC VỤ gợi ý", "ghi phản hồi, labsoe-18"),
        ],
        "hang": [("Luồng thời gian thực", "chạy liên tục, 15–30 s"),
                 ("Luồng lô", "hằng đêm, 02:00"),
                 ("Phục vụ và phản hồi", "khi người dùng mở trang")],
        "csv": "RetailRocket CSV\n2,76 tr sự kiện, 139 ngày",
        "prod": "Producer phát lại\n1 ngày = 30 s\n+5 % người dùng mới",
        "t1": "retailrocket-events\n3 phân vùng\nkhóa = người dùng",
        "t2": "hien-thi\nlượt hiển thị, nhấp, mua",
        "s1": "nap_su_kien  (15 s)\nKafka → bronze, gán mã sự kiện",
        "s2": "tinh_thinh_hanh  (20 s)\ncửa sổ 15 phút trượt 1 phút",
        "s3": "ghi_hien_thi  (30 s)\nnhật ký hiển thị cho A/B",
        "b1": "Job lô (Spark SQL + MLlib)\nbronze_to_silver → chuan_bi_ma_tran\n→ huan_luyen_als → ghi_gold",
        "d4": "bronze → silver\n→ features → gold",
        "doc": "đọc", "ghi": "ghi",
        "d5": "Bảng gold\nDelta, Z-ORDER",
        "user": "Người dùng\ntrình duyệt",
        "w1": "FastAPI web\nđọc gold, bộ đệm",
        "phan_hoi": "web gửi sự kiện xem, thêm giỏ, mua và lượt hiển thị về Kafka (vòng khép kín)",
        "af": "Airflow 3.3.1\nĐIỀU PHỐI\nkhông xử lý dữ liệu",
        "dag": [("kn_pipeline_hang_ngay", "02:00 · chạy toàn bộ luồng lô"),
                ("kn_giam_sat_streaming", "15 phút · khởi động lại thịnh hành"),
                ("kn_tinh_ab", "mỗi giờ · kiểm định A/B"),
                ("kn_bao_tri", "04:00 · tối ưu bảng Delta"),
                ("kn_tai_lap", "thủ công · tái lập (time travel)")],
        "submit": "spark-submit",
        "giam_sat": "kiểm tra, khởi động lại",
        "cg": [("mui", "luong", "Dữ liệu luồng"), ("mui", "du_lieu", "Dữ liệu lô (đọc / ghi)"),
               ("mui", "doc", "Đọc để phục vụ"), ("mui", "phan_hoi", "Sự kiện từ web về Kafka"),
               ("mui", "dieu_khien", "Điều khiển của Airflow")],
    },
    "en": {
        "cot": [
            ("xam", "Event sources", "PRODUCE input events", "producer on labsit"),
            ("kafka", "Kafka 3.7", "INGEST, buffer events", "keeps per-user order"),
            ("spark", "Spark 3.5.3", "COMPUTE: stream, batch, ALS", "5 workers, 34 cores"),
            ("hdfs", "Hadoop HDFS 3.5 + Delta 3.2", "STORE tables and versions", "5 DataNodes, replication 2"),
            ("web", "FastAPI web", "SERVE recommendations", "write feedback, labsoe-18"),
        ],
        "hang": [("Real-time flow", "continuous, 15–30 s"),
                 ("Batch flow", "nightly at 02:00"),
                 ("Serving and feedback", "when a user opens a page")],
        "csv": "RetailRocket CSV\n2.76 M events, 139 days",
        "prod": "Replay producer\n1 day = 30 s\n+5 % new users",
        "t1": "retailrocket-events\n3 partitions\nkey = user",
        "t2": "hien-thi\nimpressions, clicks, buys",
        "s1": "nap_su_kien  (15 s)\nKafka → bronze, assigns event id",
        "s2": "tinh_thinh_hanh  (20 s)\n15-min window sliding 1 min",
        "s3": "ghi_hien_thi  (30 s)\nimpression log for A/B",
        "b1": "Batch jobs (Spark SQL + MLlib)\nbronze_to_silver → chuan_bi_ma_tran\n→ huan_luyen_als → ghi_gold",
        "d4": "bronze → silver\n→ features → gold",
        "doc": "read", "ghi": "write",
        "d5": "Gold tables\nDelta, Z-ORDER",
        "user": "User\nbrowser",
        "w1": "FastAPI web\nreads gold, cache",
        "phan_hoi": "the web sends views, add-to-cart, purchases and impressions back to Kafka (closed loop)",
        "af": "Airflow 3.3.1\nORCHESTRATE\nprocesses no data",
        "dag": [("kn_pipeline_hang_ngay", "02:00 · runs the batch flow"),
                ("kn_giam_sat_streaming", "15 min · restarts trending stream"),
                ("kn_tinh_ab", "hourly · A/B test"),
                ("kn_bao_tri", "04:00 · Delta table upkeep"),
                ("kn_tai_lap", "manual · reproduce (time travel)")],
        "submit": "spark-submit",
        "giam_sat": "check, restart",
        "cg": [("mui", "luong", "Streaming data"), ("mui", "du_lieu", "Batch data (read / write)"),
               ("mui", "doc", "Read for serving"), ("mui", "phan_hoi", "Web events back to Kafka"),
               ("mui", "dieu_khien", "Airflow control")],
    },
}

# Cột: (x, rộng). Cột 0 là tiêu đề hàng.
COT = [(0.08, 0.98), (1.10, 1.02), (2.20, 0.96), (3.22, 1.62), (4.90, 1.40), (6.36, 0.96)]
# Hàng: (y, cao). Hàng 0 là tiêu đề cột.
HANG = [(0.08, 0.52), (0.66, 0.86), (1.58, 0.56), (2.20, 0.46)]
DAY = HANG[-1][0] + HANG[-1][1]   # đáy vùng lưới
CS, CD = 6.0, 5.8                 # cỡ chữ khối
SO_MAU = ["#2E7D32", "#333333", "#0E8088", "#1F5FAD"]   # màu số tròn theo màu mũi tên của luồng


def ve(ngon_ngu):
    t = T[ngon_ngu]
    s = So(7.4, 3.5)

    # Nền tô nhạt của từng cột công nghệ, từ tiêu đề cột đến đáy hàng ③
    for (x, w), (k, *_c) in zip(COT[1:], t["cot"]):
        s.ax.add_patch(FancyBboxPatch((x, 0.08), w, DAY - 0.08, boxstyle="round,pad=0,rounding_size=0.035",
                                      fc=BANG[k][2], ec=BANG[k][1], lw=0.7, zorder=1))
    # Tiêu đề cột: tên công nghệ và việc nó làm
    for (x, w), (k, ten, vai_tro, may) in zip(COT[1:], t["cot"]):
        s.hop("h_" + k, x + 0.04, 0.12, w - 0.08, 0.44, "%s\n%s\n%s" % (ten, vai_tro, may), k, co=6.3,
              nghieng_dong=(2,))
    # Đường ngăn hàng và tiêu đề hàng
    for y, _h in HANG[2:]:
        s.ax.plot([0.08, 7.32], [y - 0.03, y - 0.03], color="#9A9A9A", lw=0.6, ls=(0, (4, 3)), zorder=1.5)
    for i, ((y, h), (ten, nhip)) in enumerate(zip(HANG[1:], t["hang"])):
        s.hop("r%d" % i, 0.10, y + 0.04, 0.94, h - 0.08, "", "trang")
        cy = y + h / 2
        s.so_tron(0.57, cy - 0.12, str(i + 1), co=6.2, mau=SO_MAU[i])
        s.chu(0.57, cy + 0.01, ten, co=6.4, dam=True)
        s.chu(0.57, cy + 0.12, nhip, co=5.9, nghieng=True)

    # ---------------------------------------------------------------- ① luồng thời gian thực
    s.hop("prod", 1.15, 0.72, 0.92, 0.34, t["prod"], "xam", co=CD)
    s.hop("csv", 1.15, 1.13, 0.92, 0.32, t["csv"], "xam", co=CD)
    s.mui("csv", "prod", "n", "s")
    s.hop("t1", 2.24, 0.70, 0.88, 0.40, t["t1"], "kafka", co=5.6, kieu="tru")
    s.hop("t2", 2.24, 1.12, 0.88, 0.36, t["t2"], "kafka", co=5.6, kieu="tru")
    s.mui("prod", "t1", "e", "w", ta=0.40, tb=0.38, loai="luong")
    xs, ws = 3.36, 1.40
    for k, y in (("s1", 0.71), ("s2", 0.99), ("s3", 1.27)):
        s.hop(k, xs, y, ws, 0.24, t[k], "luong", co=CD)
    s.mui("t1", "s1", "e", "w", ta=0.30, tb=0.5, loai="luong")
    s.mui("t1", "s2", "e", "w", ta=0.70, tb=0.5, loai="luong")
    s.mui("t2", "s3", "e", "w", ta=0.55, tb=0.5, loai="luong")
    for k, y, ten, mau in (("d1", 0.71, "bronze.su_kien", "bronze"), ("d2", 0.99, "gold.thinh_hanh_15p", "gold"),
                           ("d3", 1.27, "gold.nhat_ky_hien_thi", "gold")):
        s.hop(k, 4.98, y - 0.01, 1.24, 0.27, ten, mau, co=CD, kieu="tru", dam_dong_dau=False)
    for a, b in (("s1", "d1"), ("s2", "d2"), ("s3", "d3")):
        s.mui(a, b, "e", "w", loai="luong")
    s.hop("user", 6.42, 0.72, 0.84, 0.34, t["user"], "trang", co=CD)

    # ---------------------------------------------------------------- ② luồng lô
    s.hop("b1", xs, 1.63, ws, 0.46, t["b1"], "spark", co=CD)
    s.hop("d4", 4.98, 1.62, 1.24, 0.48, t["d4"], "silver", co=CD, kieu="tru", dam_dong_dau=False)
    s.mui((4.98, 1.77), (4.76, 1.77), nhan=t["doc"], co=5.4, vi_tri_nhan=0.5, lech_nhan=(0, -0.055), nen_nhan=False)
    s.mui((4.76, 1.95), (4.98, 1.95), nhan=t["ghi"], co=5.4, vi_tri_nhan=0.5, lech_nhan=(0, 0.06), nen_nhan=False)

    # ---------------------------------------------------------------- ③ phục vụ và phản hồi
    s.hop("d5", 4.98, 2.23, 1.24, 0.33, t["d5"], "gold", co=CD, kieu="tru")
    s.hop("w1", 6.42, 2.23, 0.84, 0.33, t["w1"], "web", co=CD)
    s.mui("d5", "w1", "e", "w", loai="doc")
    s.mui("user", "w1", "s", "n", hai_chieu=True, loai="doc")
    # Vòng khép kín: web → Kafka (đi dưới đáy hàng ③, lên theo khe giữa cột nguồn và cột Kafka)
    s.duong([(6.84, 2.56), (6.84, 2.62), (2.16, 2.62), (2.16, 1.30), (2.24, 1.30)], loai="phan_hoi")
    s.duong([(2.16, 1.32), (2.16, 1.00), (2.24, 1.00)], loai="phan_hoi")
    s.chu(2.50, 2.62, t["phan_hoi"], co=5.5, nghieng=True, mau="#1F5FAD", nen=True, canh="left")
    s.so_tron(2.40, 2.62, "4", co=5.6, mau="#1F5FAD")

    # ---------------------------------------------------------------- Airflow: chỉ điều phối
    s.ax.add_patch(FancyBboxPatch((0.08, 2.74), 7.24, 0.44, boxstyle="round,pad=0,rounding_size=0.035",
                                  fc=BANG["af"][2], ec=BANG["af"][1], lw=0.7, zorder=1))
    s.hop("af", 0.10, 2.77, 0.94, 0.38, t["af"], "af", co=5.9)
    x = 1.12
    for ten, mo_ta in t["dag"]:
        s.hop("dag_" + ten, x, 2.80, 1.2, 0.32, "%s\n%s" % (ten, mo_ta), "trang", co=5.3, vien=BANG["af"][1])
        x += 1.24
    # spark-submit vào job lô, giám sát luồng
    s.duong([(4.30, 2.80), (4.30, 2.09)], loai="dieu_khien")
    s.chu(4.35, 2.47, t["submit"], co=5.3, nghieng=True, mau="#B85450", canh="left", nen=True)
    s.duong([(3.28, 2.80), (3.28, 1.45), (3.36, 1.45)], loai="dieu_khien")
    s.chu(3.33, 2.47, t["giam_sat"], co=5.3, nghieng=True, mau="#B85450", canh="left", nen=True)

    s.chu_giai(0.14, 3.21, t["cg"], cot=5, rong_cot=1.40, co=5.8, tieu_de=None, dong_cao=0.15)
    s.luu("f01c_vai_tro_luong_%s.png" % ngon_ngu)


if __name__ == "__main__":
    for nn in ("vi", "en"):
        ve(nn)
