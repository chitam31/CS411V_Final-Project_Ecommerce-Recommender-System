# bd03_khuyen_nghi — Hệ khuyến nghị sản phẩm cho sàn thương mại điện tử

Đề tài 3, học phần **Dữ liệu lớn (Big Data)** — chương trình Thạc sĩ Khoa học Máy tính, Trường Đại học Tân Tạo.

**Trọng tâm kỹ thuật:** MLlib ALS (implicit feedback) + kết hợp batch và streaming + thí nghiệm A/B tái lập được bằng Delta Lake time travel.

**Dữ liệu:** RetailRocket Recommender System Dataset (Kaggle): khoảng 2,7 triệu sự kiện `view / addtocart / transaction` của 1,4 triệu khách trong 4,5 tháng, 235.000 sản phẩm.

**Hạ tầng:** 6 máy phòng lab và 2 máy cá nhân, nối với nhau qua ZeroTier (mạng `ttunet`, `633e31d8a29b038c`). Dự án dùng tiếp cụm hiện có của nhóm: Spark 3.5.3 standalone, HDFS 3.5.0 và Kafka 3.7.2 KRaft, tất cả chạy bằng Docker.

---

## 1. Kiến trúc tổng quan

```
                       ┌──────────── labsit 10.68.71.204 ────────────┐
 producer/phat_lai ──► │ Kafka: retailrocket-events   hien-thi       │ ◄── web (Thêm giỏ / impression)
 (1 ngày = 30 giây,    └──────┬─────────────────────────┬────────────┘
  +5% user mới)               │                         │
             ┌────────────────┼──────────────┐          │
             ▼                ▼              │          ▼
  [streaming/nap_su_kien] [streaming/tinh_thinh_hanh]  [streaming/ghi_hien_thi]
             │                │ cửa sổ 15p/1p, watermark 2p        │ MERGE theo lô
             ▼                ▼ update + MERGE                     ▼
     bronze.su_kien    gold.thinh_hanh_15p              gold.nhat_ky_hien_thi (CDF)
       (Parquet)                                                   │
             │ transform/bronze_to_silver (khử trùng 5s, lọc bot)  │ transform/tinh_ket_qua_ab
             ▼                                                     ▼ (đọc CDF, z-test)
     silver.tuong_tac ──► gold.thong_ke_san_pham         gold.ket_qua_ab (+ phiên bản Delta)
             │
             ▼ ml/chuan_bi_ma_tran (StringIndexer nối nhãn, suy giảm thời gian)
     features.ma_tran_tuong_tac ──► [ALS tuning 27/9 tổ hợp] ──► danh_gia (2 baseline, coverage, novelty)
                                                                        │ NDCG có cải thiện?
                                       sinh_goi_y_toan_bo ◄── có ───────┤
                                               │                        └── không ──► giữ mô hình cũ + cảnh báo
                                               ▼
                         tron_goi_y (A/B, cold start, item mới, v2 lọc tầm giá) ──► ghi_gold (MERGE theo user)
                                                                                         │
                                                                                         ▼
                                                     gold.goi_y_nguoi_dung (ZORDER BY ma_nguoi_dung)
                                                                                         │
                                         Web giả lập sàn TMĐT (labsoe-18 10.68.71.149:8000) ◄─┘
```

Mọi bảng nằm trên HDFS `hdfs://10.68.71.113:8020/lake/...`. Bronze là Parquet; silver, features và gold là Delta Lake 3.2.0. Năm DAG Airflow 3.3.1 trên máy master điều phối các job lô. Chi tiết ở [docs/KIEN_TRUC.md](docs/KIEN_TRUC.md).

### Phân vai 8 máy

| Máy | IP ZeroTier | Vai trò trong đề tài 3 |
|---|---|---|
| labsoe-11 | 10.68.71.113 | HDFS NameNode, Spark Master, Airflow (cổng 8088) |
| labsit12 | 10.68.71.198 | DataNode + Spark Worker |
| labsit | 10.68.71.204 | DataNode + Spark Worker + **Kafka** (bộ phát chạy ở đây) |
| labsit-may25 | 10.68.71.42 | DataNode + Spark Worker |
| labsit-may26 | 10.68.71.90 | DataNode + Spark Worker |
| labsoe-18 | 10.68.71.149 | DataNode + Spark Worker + **web** giả lập sàn TMĐT (cổng 8000) |
| Ctam (WSL2 trong laptop) | 10.68.71.205 | Dự phòng (chạy web đến 11/11, xem TRIEN_KHAI_CUM mục 5) |
| Máy Windows cá nhân | 10.68.71.59 | Máy trình chiếu: trình duyệt mở web và các trang giám sát |

Danh bạ này là nguồn sự thật duy nhất, nằm ở [cau_hinh/cum.env](cau_hinh/cum.env). Tài nguyên đã đo trên máy thật (10/11/2026): mỗi máy lab 12 lõi, 7 GB RAM; RAM giao cho Spark ở từng worker được tính theo số đo đó (docs/TRIEN_KHAI_CUM.md, mục 1.4). Laptop điều khiển `whitehathacker` (10.68.71.182) cũng có trong danh bạ.

---

## 2. Cấu trúc thư mục

```
bd03_khuyen_nghi/
├── README.md               Tệp này
├── MO_HINH.md              Thẻ mô hình: dữ liệu, ALS, metric, baseline, cold start, v2, A/B
├── NHAT_KY.md              Nhật ký thực hiện, lỗi đã sửa, trạng thái kiểm chứng
├── requirements.txt        Thư viện Python (job chạy cục bộ, web, producer, test)
├── requirements-airflow.txt  Chỉ cần khi muốn chạy test DAG ngoài container
├── pytest.ini
├── cau_hinh/cum.env        Danh bạ 8 máy (IP, vai trò, lõi, RAM)
├── jobs/                   Toàn bộ job PySpark, nộp bằng ha_tang/spark/submit.sh
│   ├── common/             Thư viện dùng chung (đóng gói thành common.zip gửi executor)
│   ├── streaming/          nap_su_kien, tinh_thinh_hanh, ghi_hien_thi
│   ├── transform/          nhap_danh_muc, bronze_to_silver, thong_ke_san_pham,
│   │                       tinh_ket_qua_ab, mo_phong_hien_thi, tien_hoa_luoc_do
│   ├── ml/                 chuan_bi_ma_tran, huan_luyen_als, danh_gia, sinh_goi_y_toan_bo,
│   │                       tron_goi_y, ghi_gold, san_pham_lien_quan
│   ├── bao_tri/            toi_uu_delta (OPTIMIZE/ZORDER/VACUUM), do_zorder (đo trước/sau)
│   └── kiem_tra/           khoi_tao_bang, tai_lap_huan_luyen, tai_lap_ab, kiem_tra_thinh_hanh, ...
├── producer/               Bộ phát Kafka (phat_lai_su_kien.py) và người dùng ảo (nguoi_dung_ao.py)
├── web/                    FastAPI + Jinja2: 5 màn hình và API theo mục 3.8
├── airflow/dags/           5 DAG theo mục 3.9
├── ha_tang/                Docker compose cho Hadoop, Spark, Kafka, Airflow, Web
├── scripts/                Khởi động từng máy, điều khiển cụm qua SSH, kiểm tra cụm, chạy lần đầu, demo
├── tests/                  109 kiểm thử pytest, chạy trên Spark local thật
├── docs/                   KIEN_TRUC, TRIEN_KHAI_CUM, HUONG_DAN_DEMO, DOI_CHIEU_YEU_CAU
└── models/                 Ghi chú về mô hình (mô hình thật nằm trên HDFS /lake/models)
```

---

## 3. Bắt đầu nhanh

### 3.1. Chạy kiểm thử trên một máy bất kỳ (không cần cụm)

Cần Python 3.10–3.11 và Java 17.

```bash
python3 -m venv .venv && . .venv/bin/activate
pip install -r requirements.txt
pytest                      # 61 test chạy trên Spark local; test DAG tự bỏ qua nếu thiếu Airflow
```

Test DAG Airflow (tùy chọn, nên dùng venv riêng vì Airflow kéo nhiều thư viện):

```bash
python3 -m venv .venv-airflow && . .venv-airflow/bin/activate
pip install -r requirements-airflow.txt
pytest tests/test_ha_tang.py
```

### 3.2. Xem giao diện web với dữ liệu giả lập

```bash
cd web
WEB_CHE_DO=gia PYTHONPATH=../jobs uvicorn app:app --port 8000
# mở http://localhost:8000
```

Chế độ `gia` chỉ để xem giao diện: mọi con số trên màn hình là dữ liệu giả lập, không phải kết quả thí nghiệm.

### 3.3. Chạy toàn bộ pipeline trên một máy với Delta thật

```bash
bash scripts/kiem_tra_cuc_bo.sh
```

Script sinh một bộ dữ liệu nhỏ đúng định dạng RetailRocket ([scripts/tao_du_lieu_mau.py](scripts/tao_du_lieu_mau.py)), rồi chạy lần lượt mọi job với Spark local, Delta Lake thật và nguồn luồng đọc từ tệp thay cho Kafka. Script cần tải Delta qua `--packages` (Internet tới Maven Central), hoặc đặt sẵn `DELTA_JARS=/duong/delta-spark_2.12-3.2.0.jar,/duong/delta-storage-3.2.0.jar`.

### 3.4. Triển khai trên cụm 8 máy

Tóm tắt (chi tiết từng máy ở [docs/TRIEN_KHAI_CUM.md](docs/TRIEN_KHAI_CUM.md)):

```bash
# Từ laptop điều khiển (Git Bash), sau khi cài SSH theo docs/TRIEN_KHAI_CUM.md mục 1.5:
bash scripts/cum/ssh_tat_ca.sh --dong-bo-ma                                        # đẩy mã sang 6 máy
bash scripts/cum/ssh_tat_ca.sh "cd ~/bd03_khuyen_nghi && bash scripts/cum/khoi_dong_may.sh"   # bật theo vai trò

# Từ bất kỳ máy nào: kiểm tra toàn cụm
bash scripts/cum/kiem_tra_cum.sh

# Trên laptop: tải RetailRocket bằng khóa Kaggle của laptop, chép sang master và máy Kafka
bash scripts/cum/chep_du_lieu.sh
# Trên máy master (labsoe-11), lần đầu:
bash scripts/tai_du_lieu.sh                        # ~/du_lieu/retailrocket -> HDFS /lake/landing
# Trên máy Kafka (labsit):
bash scripts/tao_topic.sh
python3 producer/phat_lai_su_kien.py --tep ~/du_lieu/retailrocket/events.csv &
# Trên máy master:
bash scripts/chay_lan_dau.sh                       # toàn bộ pipeline theo thứ tự của DAG 1
bash scripts/luong.sh khoi_dong tat_ca             # 3 luồng streaming chạy liên tục
```

Sau đó Airflow (http://10.68.71.113:8088) chạy DAG hằng đêm, web ở http://10.68.71.149:8000 (ngoài trường: `ssh -N -L 8001:localhost:8000 labsoe-18`, rồi mở http://localhost:8001).

---

## 4. Ánh xạ nhanh tới đặc tả đề tài

| Mục đề tài | Hiện thực |
|---|---|
| 3.4 Đặc tả bảng | `jobs/common/luoc_do.py`, `jobs/common/cau_hinh.py`; cột bổ sung giải thích trong docs/KIEN_TRUC.md |
| 3.5 Job Spark | 6 job bắt buộc + các job phụ trợ trong `jobs/` |
| 3.6 Mô hình | `jobs/common/als_lib.py`, `jobs/ml/*`; xem MO_HINH.md |
| Cold start (chấm riêng) | `jobs/common/tron.py`, `jobs/ml/tron_goi_y.py`, `web/dich_vu/goi_y.py` |
| 3.7 Delta Lake | MERGE (`ghi_gold`, `tinh_thinh_hanh`, `ghi_hien_thi`), time travel (`kiem_tra/tai_lap_*`), schema evolution (`tien_hoa_luoc_do`), CDF (`tinh_ket_qua_ab`), ZORDER (`bao_tri/*`), partition (`bronze_to_silver`) |
| 3.8 Web | `web/` — 5 màn hình, API đúng tên trong đề |
| 3.9 Airflow | `airflow/dags/` — 5 DAG đúng lịch và đúng nhánh |
| 3.10 Rủi ro | lọc user ≥ 3 tương tác, `numBlocks`, traffic mô phỏng có gắn nhãn, chỉ sinh cho user hoạt động 30 ngày, re-ranking novelty |
| 3.11 Nghiệm thu | Kịch bản từng mục ở [docs/HUONG_DAN_DEMO.md](docs/HUONG_DAN_DEMO.md) |

Bảng đối chiếu đầy đủ từng yêu cầu: [docs/DOI_CHIEU_YEU_CAU.md](docs/DOI_CHIEU_YEU_CAU.md).

---

## 5. Trạng thái kiểm chứng (cập nhật 10/11/2026)

| Hạng mục | Trạng thái |
|---|---|
| Logic làm sạch, trọng số, suy giảm thời gian, chia train/test | Đã kiểm thử tự động trên Spark local |
| ALS, 4 metric (đối chiếu `RankingMetrics` của Spark), coverage, novelty, 2 baseline, tính tất định theo hạt giống | Đã kiểm thử tự động |
| Trộn A/B, 3 chiến lược cold start, item mới, mô hình v2 lọc tầm giá | Đã kiểm thử tự động |
| Structured Streaming cửa sổ trượt + watermark (nguồn tệp) | Đã kiểm thử tự động |
| z-test hai tỷ lệ, tổng hợp A/B, mô phỏng click theo vị trí | Đã kiểm thử tự động |
| Web: 5 màn hình và API | Đã kiểm thử bằng TestClient ở chế độ giả lập |
| 5 DAG Airflow 3.3.1: nạp được, đúng lịch, đúng nhánh | Đã kiểm thử bằng DagBag |
| Delta Lake chạy thật trên cụm | Đã chạy `kiem_tra/khoi_tao_bang.py` trên cụm 10/11/2026: tạo 8 bảng Delta trên HDFS (42 giây). MERGE, VERSION AS OF, CDF, ALTER TABLE, OPTIMIZE ZORDER, VACUUM chưa chạy: sẽ kiểm chứng khi chạy pipeline với dữ liệu thật |
| Hạ tầng cụm | Đã bật 10/11/2026: 5 DataNode (1,93 TB trống), 5 Spark worker (34 lõi, 13 GB RAM), Kafka 2 topic. Mạng Wi-Fi phòng labsit chặn các máy nói chuyện trực tiếp nên ZeroTier đi đường chuyển tiếp, xem NHAT_KY.md |
| Toàn bộ pipeline với số liệu thật của RetailRocket | **Chưa chạy.** Nhóm chạy theo docs/TRIEN_KHAI_CUM.md và điền kết quả vào NHAT_KY.md |

Tài liệu này không chứa số liệu thí nghiệm nào. Mọi con số (NDCG, coverage, p-value, thời gian ZORDER...) phải lấy từ lần chạy thật trên cụm.

---

## 6. Tài liệu

- [MO_HINH.md](MO_HINH.md) — thẻ mô hình và cơ sở lý thuyết
- [NHAT_KY.md](NHAT_KY.md) — nhật ký thực hiện
- [docs/KIEN_TRUC.md](docs/KIEN_TRUC.md) — kiến trúc, đặc tả bảng, quyết định thiết kế
- [docs/TRIEN_KHAI_CUM.md](docs/TRIEN_KHAI_CUM.md) — triển khai từng máy trong 8 máy
- [docs/HUONG_DAN_DEMO.md](docs/HUONG_DAN_DEMO.md) — kịch bản bảo vệ theo danh mục nghiệm thu 3.11
- [docs/DOI_CHIEU_YEU_CAU.md](docs/DOI_CHIEU_YEU_CAU.md) — đối chiếu từng yêu cầu của đề tài
- [models/README.md](models/README.md) — nơi lưu và cách lấy mô hình

## 7. Nhóm thực hiện

Học viên Lê Chí Tâm và các thành viên nhóm đề tài 3. Repo cũ của nhóm (`spark-cluster`, `hadoop-cluster`, `kafka-docker`) vẫn tương thích: dự án giữ nguyên tên container, tên volume và cổng, chỉ sửa các lỗi cấu hình ghi ở NHAT_KY.md.
