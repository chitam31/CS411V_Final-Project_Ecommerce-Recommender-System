# Đối chiếu yêu cầu đề tài 3 với mã nguồn

Ký hiệu trạng thái:

- **T** — có kiểm thử tự động chạy trên Spark local (`pytest`), đã qua.
- **M** — đã viết mã và kiểm tra cú pháp/logic, nhưng phần chạy thật cần Delta Lake hoặc cụm (chạy `scripts/kiem_tra_cuc_bo.sh` hoặc trên cụm để xác nhận).
- **C** — chỉ kiểm chứng được trên cụm 8 máy với dữ liệu thật.

## 3.1 Bối cảnh nghiệp vụ

| Yêu cầu | Hiện thực | TT |
|---|---|---|
| Khối "Dành cho bạn" trên trang chủ | `web/app.py` (`/`), `web/dich_vu/goi_y.py`, `gold.goi_y_nguoi_dung` | T |
| Khối "Sản phẩm liên quan" | `jobs/ml/san_pham_lien_quan.py`, `web/templates/san_pham.html` | T |
| Khối "Đang thịnh hành" cửa sổ 15 phút | `jobs/streaming/tinh_thinh_hanh.py` | T (nguồn tệp), C (Kafka) |
| Đo CTR bằng A/B, tái lập được | `jobs/transform/tinh_ket_qua_ab.py`, `jobs/kiem_tra/tai_lap_ab.py`, màn hình Tái lập | T (logic), M (time travel) |
| Cold start, implicit feedback, popularity bias | MO_HINH.md §1 | T |

## 3.2 Nguồn dữ liệu

| Yêu cầu | Hiện thực | TT |
|---|---|---|
| RetailRocket (sự kiện, thuộc tính, cây danh mục) | `scripts/tai_du_lieu.sh`, `jobs/transform/nhap_danh_muc.py` | C |
| Bộ phát Kafka theo timestamp gốc, 1 ngày = 30 giây | `producer/phat_lai_su_kien.py --giay-moi-ngay 30` | T (chế độ tệp), C (Kafka) |
| Thêm 5% người dùng mới hoàn toàn | `producer/phat_lai_su_kien.py --ty-le-nguoi-moi 0.05` (mã `moi_<n>`) | T |

## 3.3 Kiến trúc

Đủ mọi thành phần trong sơ đồ: Kafka → streaming → `gold.thinh_hanh_15p`; Kafka → `bronze.su_kien` → `silver.tuong_tac` → `features.ma_tran_tuong_tac` + `gold.thong_ke_san_pham` → ALS → `gold.goi_y_nguoi_dung` → web + A/B → `gold.nhat_ky_hien_thi` → `gold.ket_qua_ab`. Xem docs/KIEN_TRUC.md.

## 3.4 Đặc tả bảng

| Bảng | Cột của đặc tả | Cột thêm | Tệp | TT |
|---|---|---|---|---|
| bronze.su_kien | đủ 9 cột, phân vùng `ngay` | `ma_giao_dich, kafka_ts, _nguon, _ingest_ts, _schema_ver` | `streaming/nap_su_kien.py` | T |
| silver.tuong_tac | đủ 6 cột; khử trùng 5 giây; lọc bot > 500/giờ; trọng số 1/3/5 | `_nguon` | `transform/bronze_to_silver.py` | T |
| features.ma_tran_tuong_tac | `user_idx, item_idx, diem`; suy giảm λ = 0,01 | `tap` | `ml/chuan_bi_ma_tran.py` | T |
| gold.goi_y_nguoi_dung | đủ 7 cột, `xep_hang` 1..20, `nguon` ∈ {als, pho_bien_danh_muc, thinh_hanh} | — | `ml/tron_goi_y.py`, `ml/ghi_gold.py` | T (trộn), M (MERGE) |
| gold.thinh_hanh_15p | đủ 6 cột, công thức điểm đúng đề | — | `streaming/tinh_thinh_hanh.py` | T |
| gold.nhat_ky_hien_thi | đủ 8 cột | `nguon_traffic, chien_luoc` | `streaming/ghi_hien_thi.py` | T (gộp), M (MERGE) |
| gold.ket_qua_ab | đủ 9 cột | `p_value_chuyen_doi, ty_le_mo_phong` | `transform/tinh_ket_qua_ab.py` | T (tổng hợp), M (CDF) |

Lý do từng cột thêm: docs/KIEN_TRUC.md §5.

## 3.5 Job Spark

| Job | Yêu cầu | Hiện thực | TT |
|---|---|---|---|
| streaming/nap_su_kien.py | Kafka → bronze, checkpoint HDFS | `readStream.format("kafka")`, file sink Parquet `partitionBy("ngay")`, checkpoint `/lake/checkpoints/nap_su_kien_v2` | T (nguồn tệp), C |
| streaming/tinh_thinh_hanh.py | Cửa sổ trượt + watermark 2 phút; `outputMode("update")` + MERGE | `window(kafka_ts, "15 minutes", "1 minute")`, `withWatermark("kafka_ts", "2 minutes")`, `foreachBatch` + `MERGE` | T (cửa sổ, watermark), M (MERGE) |
| transform/bronze_to_silver.py | Khử trùng, lọc bot, gán trọng số | `loc_bot`, `khu_trung_lap`, `gan_trong_so`; tăng dần theo ngày, `replaceWhere` | T |
| ml/chuan_bi_ma_tran.py | StringIndexer (lưu index để tái sử dụng), suy giảm thời gian | Nối nhãn bằng `StringIndexerModel.from_labels`, lưu `/lake/models/*_indexer` | T |
| ml/huan_luyen_als.py | ALS implicit, tuning, top-20 bằng `recommendForAllUsers` | Tuning 27/9 tổ hợp; top-20 sinh ở `ml/sinh_goi_y_toan_bo.py` bằng `recommendForUserSubset` cho user hoạt động 30 ngày (phương án của chính mục 3.10) | T |
| ml/tron_goi_y.py | Trộn ALS + thịnh hành + phổ biến danh mục; cold start | Mẫu khối A/B, 3 chiến lược cold start, item mới 20% cuối, v2 lọc tầm giá | T |
| transform/tinh_ket_qua_ab.py | Tổng hợp impression log, z-test hai tỷ lệ | `common/ab.py`, `common/thong_ke.py`, đọc CDF | T (logic), M (CDF) |

Job bổ sung: `streaming/ghi_hien_thi.py`, `transform/nhap_danh_muc.py`, `transform/thong_ke_san_pham.py`, `transform/mo_phong_hien_thi.py`, `transform/tien_hoa_luoc_do.py`, `ml/danh_gia.py`, `ml/sinh_goi_y_toan_bo.py`, `ml/ghi_gold.py`, `ml/san_pham_lien_quan.py`, `bao_tri/*`, `kiem_tra/*`.

## 3.6 Mô hình

| Yêu cầu | Hiện thực | TT |
|---|---|---|
| ALS `implicitPrefs=true`, `coldStartStrategy="drop"` khi đánh giá | `common/als_lib.tao_als` | T |
| Tuning `rank × regParam × alpha`, tối thiểu 9 tổ hợp | `LUOI_DAY_DU` (27), `LUOI_TOI_THIEU` (9) | T, C (số liệu) |
| Chia theo thời gian: train 4 tháng, test tháng cuối; ground truth tháng cuối | `chia_theo_thoi_gian` (30 ngày cuối), `doc_features` | T |
| Precision/Recall/NDCG/MAP@10 | `common/chi_so.py` (đối chiếu `RankingMetrics`) | T |
| Coverage, Novelty | `common/als_lib.tinh_chi_so` | T |
| Baseline toàn sàn, baseline danh mục | `baseline_toan_san`, `baseline_danh_muc` | T |
| Ngưỡng NDCG ≥ +30% so với baseline bán chạy, Coverage ≥ 10% | `ml/danh_gia.py` → `dat_nguong` | T (công thức), C (kết quả) |
| Cold start: user mới → thịnh hành 15 phút | `danh_sach_nguoi_moi`, web | T |
| Cold start: user < 5 tương tác → bán chạy danh mục đã xem, 50/50 thịnh hành | `danh_sach_it_tuong_tac`, `tron_nguoi_it_tuong_tac`, bộ nhớ phiên của web | T |
| Cold start: item mới → chèn theo danh mục vào 20% vị trí cuối | `item_moi_theo_danh_muc`, mẫu `...mm` | T |

## 3.7 Delta Lake

| Yêu cầu | Hiện thực | TT |
|---|---|---|
| MERGE `gold.goi_y_nguoi_dung` theo user, không ghi đè toàn bảng | `ml/ghi_gold.py` (xóa thứ hạng thừa bằng cờ `_xoa`) | T (nguồn MERGE), M |
| MERGE `gold.thinh_hanh_15p` theo cửa sổ | `streaming/tinh_thinh_hanh.ghi_lo` | M |
| Time travel: ghi `phien_ban_delta` của features mỗi lần huấn luyện; chạy lại trên `VERSION AS OF`; màn hình "Tái lập" | `gold.lich_su_huan_luyen.phien_ban_features`, `kiem_tra/tai_lap_huan_luyen.py`, `web/templates/tai_lap.html` | T (tất định), M |
| Schema evolution tuần 5: `gia_san_pham`, `xep_hang_sao`; mô hình v2 lọc tầm giá | `transform/tien_hoa_luoc_do.py`, `common/tron.loc_theo_tam_gia`, `als_lib.loc_tam_gia_tren_test` | T (lọc), M (ALTER/MERGE) |
| Change Data Feed trên `gold.nhat_ky_hien_thi` | `kiem_tra/khoi_tao_bang.py`, `transform/tinh_ket_qua_ab.py` | M |
| OPTIMIZE / ZORDER BY (ma_nguoi_dung), đo trước/sau | `bao_tri/do_zorder.py`, `bao_tri/toi_uu_delta.py` | M, C (số liệu) |
| Partition silver theo `ngay`, giải thích không theo user | `bronze_to_silver.py`; docs/KIEN_TRUC.md §5 | T |

## 3.8 Web

| Màn hình | API | TT |
|---|---|---|
| Trang chủ (dropdown user, 10 món + thịnh hành, ghi impression mỗi lần render) | `GET /api/goi-y/{user_id}`, `POST /api/hien-thi` | T |
| Trang sản phẩm (liên quan; Xem / Thêm giỏ / Mua → Kafka) | `POST /api/su-kien` | T (giả lập Kafka), C |
| Bảng điều khiển A/B (CTR, chuyển đổi, biểu đồ theo ngày, p-value, kết luận) | `GET /api/ab/ket-qua` | T |
| Chất lượng mô hình (metric theo phiên bản, phân phối độ phổ biến) | `GET /api/mo-hinh/chi-so` | T |
| Tái lập thí nghiệm (chọn ngày → phiên bản Delta → Chạy lại → so sánh) | `POST /api/tai-lap/{ngay}` | T (giả lập), M |
| Phân nhóm hash ổn định: A = ALS thuần, B = ALS + 30% thịnh hành | `common/tron.chon_nhom`, `MAU_KHOI` | T |

## 3.9 Airflow

| DAG | Lịch | Cấu trúc | TT |
|---|---|---|---|
| kn_pipeline_hang_ngay | `0 2 * * *` | Sensor → bronze_to_silver → thong_ke_san_pham; chuan_bi_ma_tran → huan_luyen_als → danh_gia → Branch (sinh_goi_y_toan_bo → tron_goi_y → ghi_gold / giu_mo_hinh_cu → canh_bao) | T (DagBag, nhánh) |
| kn_giam_sat_streaming | `*/15 * * * *` | Job thịnh hành còn sống + có dữ liệu 15 phút qua | T |
| kn_tinh_ab | `0 * * * *` | CDF → tổng hợp → z-test → ghi kèm phiên bản | T |
| kn_bao_tri | `0 4 * * *` | OPTIMIZE + ZORDER + VACUUM + xóa gợi ý > 7 ngày | T |
| kn_tai_lap | thủ công | `phien_ban_delta` qua `dag_run.conf`, chạy lại, so với lịch sử | T |

## 3.10 Rủi ro và phương án

| Rủi ro | Phương án trong mã | TT |
|---|---|---|
| ALS OOM với 1,4 triệu user | `--min-tuong-tac 3`; `--so-khoi` (numBlocks); hồ sơ `als` riêng | T |
| Không đủ traffic cho A/B | `transform/mo_phong_hien_thi.py` (phụ thuộc vị trí + độ liên quan), nhãn `mo_phong`, `ty_le_mo_phong` trên web | T |
| `recommendForAllUsers` quá chậm | `recommendForUserSubset` cho user hoạt động 30 ngày, còn lại fallback danh mục | T |
| Coverage quá thấp | Phân tích phân phối độ phổ biến + re-ranking novelty (β = 0,1; 0,3) | T |

## 3.11 Danh mục nghiệm thu

Kịch bản và bằng chứng từng mục: docs/HUONG_DAN_DEMO.md. Cả 8 mục đều cần chạy trên cụm với dữ liệu thật (**C**) để có số liệu đưa vào báo cáo.
