# Xử lý Spark {#sec:spark}

## Các job

Table: Các job Spark chính {#tab:jobs w=26,10,64}
| Job | Loại | Việc làm |
|---|---|---|
| `streaming/nap_su_kien` | Luồng 15 s | Kafka → bronze. JSON → lược đồ đặc tả, `ma_su_kien` tất định, checkpoint HDFS |
| `streaming/tinh_thinh_hanh` | Luồng 20 s | Cửa sổ 15 phút trượt 1 phút, watermark 2 phút, `outputMode("update")` + `foreachBatch` MERGE; trạng thái trong RocksDB |
| `streaming/ghi_hien_thi` | Luồng 30 s | Lượt hiển thị, nhấp, mua → MERGE theo `ma_hien_thi` vào nhật ký hiển thị (CDF) |
| `transform/bronze_to_silver` | Lô | Làm sạch, `_quarantine`; tăng dần theo `_ingest_ts`, backfill `--tu-ngay/--den-ngay` |
| `ml/chuan_bi_ma_tran` | Lô | Chia theo thời gian, StringIndexer chỉ nối nhãn, suy giảm `exp(−0,01·Δngày)` |
| `ml/huan_luyen_als`, `ml/danh_gia` | Lô | Tinh chỉnh lưới, 4 chỉ số + độ phủ + độ mới lạ, 2 baseline, quyết định triển khai |
| `ml/sinh_goi_y_toan_bo`, `ml/tron_goi_y`, `ml/ghi_gold` | Lô | 200 ứng viên → xếp lại theo độ mới lạ → trộn A/B, khởi đầu lạnh → MERGE gold |
| `transform/tinh_ket_qua_ab` | Lô | Đọc CDF, tính lại các ngày đổi, kiểm định z hai tỷ lệ, ghi kèm phiên bản dữ liệu |
| `bao_tri/toi_uu_delta`, `do_zorder` | Lô | OPTIMIZE, ZORDER, VACUUM; đo trước/sau |

## Điểm kỹ thuật khó

- **Lũy đẳng ở mọi bước ghi.** Không bước nào ghi kiểu append trong pipeline hằng đêm:
  - silver và quarantine: `replaceWhere` theo ngày;
  - bảng tinh chỉnh và lịch sử: `replaceWhere ma_chay`;
  - gold: MERGE theo khóa.

  Retry của Airflow hay chạy lại DAG vì vậy không nhân đôi dữ liệu. Mốc tăng dần nằm trong `userMetadata` của commit Delta, nên không cần bảng trạng thái riêng.
- **Phát lại không làm sai silver.** Phát lại một đoạn dữ liệu lần hai thì mỗi sự kiện có offset mới, tức mã mới. Bỏ trùng theo nội dung **trước** khi lọc bot giữ silver không đổi; có kiểm thử hồi quy cho trường hợp này.
- **Tệp nhỏ.** Phép shuffle 64 phân vùng ghi tới 64 tệp mỗi ngày. Gom theo cột phân vùng trước khi ghi cho đúng một tệp mỗi ngày: silver còn 140 tệp, bước ghi từ 15 phút xuống vài giây.
- **Ghi đồng thời.** Luồng thịnh hành MERGE mỗi 20 giây, cùng lúc DAG bảo trì OPTIMIZE và VACUUM. Delta dùng tương tranh lạc quan; job tự thử lại khi gặp lỗi xung đột.
- **Driver trên máy 7 GB.** PySpark standalone không có cluster mode, nên mọi driver chạy trên master. Mỗi hồ sơ job có RAM driver riêng. Pipeline chỉ đưa về driver các bảng nhỏ có chủ đích:
  - danh sách ngày;
  - bảng novelty 126 nghìn sản phẩm (2–3 MB, broadcast);
  - đáp án của 9.467 người dùng.

  `docs/KIEN_TRUC.md` mục 9 liệt kê từng chỗ.

## Tối ưu hiệu năng có số liệu

**OPTIMIZE và Z-ORDER.** Truy vấn nóng của web là `WHERE ma_nguoi_dung = ?` trên bảng gợi ý 5,3 triệu dòng. Mỗi pha đo 30 lần tra cứu (@tab:zorder).

Table: Tra cứu gợi ý của một người dùng trước và sau tối ưu {#tab:zorder w=34,14,18,17,17}
| Pha | Tệp của bảng | Tệp đọc mỗi truy vấn | Trung vị (ms) | p95 (ms) |
|---|---|---|---|---|
| Phân mảnh (nhiều ngày MERGE) | 200 | 200 | 10.793 | 13.420 |
| Chỉ OPTIMIZE (gộp tệp) | 67 | 67 | 8.280 | 9.524 |
| OPTIMIZE ZORDER BY (ma_nguoi_dung) | 55 | 1,07 | 980 | 1.387 |

Chỉ gộp tệp gần như không giúp, vì mỗi tệp vẫn chứa người dùng thuộc toàn dải mã nên min/max của mọi tệp phủ trọn miền giá trị. Z-ORDER xếp các dòng cùng người dùng cạnh nhau, khoảng min/max của mỗi tệp hẹp lại, và data skipping chỉ còn mở khoảng 1 tệp: **nhanh hơn 8,4 lần** so với chỉ gộp tệp.

**Độ trễ luồng.** Đo trên cụm ngày 11/11 (@tab:dotre).

Table: Độ trễ luồng đo trên cụm (11/11/2026) {#tab:dotre w=60,40}
| Phép đo | Kết quả |
|---|---|
| Từ broker Kafka đến bronze | 10,3–10,7 giây |
| Từ cú nhấp trên web đến khi bảng thịnh hành cập nhật | **51 giây**, mục tiêu ≤ 90 giây, đo khi tinh chỉnh ALS đang chạy |

**Delta Lake trong thực tế.** `DESCRIBE HISTORY` của từng bảng cho thấy các thao tác:

- `STREAMING UPDATE` và `MERGE` của luồng;
- `WRITE` có `predicate` theo ngày của silver;
- `OPTIMIZE` có `zOrderBy`;
- `ADD COLUMNS` của schema evolution.

`scripts/demo/delta_sql.sh` chạy DESCRIBE HISTORY, VERSION AS OF và đếm commit theo thao tác bằng Spark local, không lấy lõi của cụm. Output nằm ở `docs/bang_chung/cum/04_delta.txt`.
