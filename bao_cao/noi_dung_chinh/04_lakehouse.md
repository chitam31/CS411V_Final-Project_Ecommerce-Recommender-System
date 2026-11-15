# Thiết kế lakehouse {#sec:lake}

## Cây thư mục trên HDFS

Gốc đúng quy ước mục A.4: `hdfs:///lakehouse/bd03_khuyen_nghi/`.

```
/lakehouse/bd03_khuyen_nghi
├── landing/retailrocket/        CSV gốc
├── bronze/su_kien/              Parquet, ngay=…/, append-only (+ _spark_metadata)
├── silver/{tuong_tac,san_pham}/ Delta; tuong_tac phân vùng theo ngay
├── features/ma_tran_tuong_tac/  Delta (cột tap = train/test)
├── gold/<12 bảng>/              Delta
├── models/                      StringIndexer, als/<ma_chay>, als/<ma_chay>_phuc_vu
├── checkpoints/<luồng>/         offset Kafka, trạng thái RocksDB
└── _quarantine/tuong_tac/       Delta, theo ngay: dòng bị loại + ly_do
```

Mọi bảng được gọi theo đường dẫn: cụm standalone không có Hive Metastore. Tên logic như `silver.tuong_tac` ánh xạ sang đường dẫn trong `jobs/common/cau_hinh.py`. Output `hdfs dfs -du -h /lakehouse/bd03_khuyen_nghi` (A.6.3) nằm ở `docs/bang_chung/cum/01_hdfs_du_h.txt`.

**Chuyển gốc ngày 15/11.** Trước ngày này hồ dữ liệu nằm ở `/lake`. `scripts/cum/chuyen_lakehouse.sh` dời từng bảng bằng `hdfs dfs -mv`, tức chỉ đổi tên trên NameNode, không chép lại khối dữ liệu nào:

- Bảng Delta lưu đường dẫn tương đối, nên lịch sử phiên bản và `VERSION AS OF` còn nguyên.
- Riêng file sink của bronze ghi đường dẫn tuyệt đối vào `_spark_metadata`, nên script viết lại các tệp đó.
- Có hoàn tác. `submit.sh` không nộp job khi dữ liệu còn ở gốc cũ.
- Toàn bộ quy trình được kiểm thử với Spark thật: dời, đọc lại, luồng chạy tiếp không xử lý lại, hoàn tác.

## Lược đồ bronze, silver, gold

Table: Bảng chính (giữ đúng tên và kiểu cột của đặc tả 3.4; cột thêm có lý do) {#tab:bang w=24,14,62}
| Bảng | Định dạng | Nội dung, cột thêm |
|---|---|---|
| `bronze.su_kien` | Parquet, theo `ngay` | 9 cột đặc tả + `ma_giao_dich`, `kafka_ts` (thịnh hành, đo độ trễ), `_nguon`, `_ingest_ts` (mốc tăng dần) |
| `silver.tuong_tac` | Delta, theo `ngay` | 6 cột đặc tả + `_nguon`; `gia_san_pham`, `xep_hang_sao` sau schema evolution |
| `_quarantine.tuong_tac` | Delta, theo `ngay` | Cột bronze + `ly_do`, `_cach_ly_luc` |
| `features.ma_tran_tuong_tac` | Delta | `user_idx, item_idx, diem` + `tap`: một phiên bản chứa đủ train và đáp án để tái lập |
| `gold.goi_y_nguoi_dung` | Delta, Z-ORDER theo người dùng | top-20 mỗi người, MERGE theo (người dùng, thứ hạng) |
| `gold.thinh_hanh_15p` | Delta | MERGE theo (cửa sổ, sản phẩm) mỗi 20 giây |
| `gold.nhat_ky_hien_thi` | Delta, bật CDF | + `nguon_traffic` (web/mô phỏng), `chien_luoc` |
| `gold.ket_qua_ab` | Delta | + `p_value_chuyen_doi`, `ty_le_mo_phong`, `phien_ban_delta_du_lieu` |

## Chiến lược phân vùng

`bronze`, `silver.tuong_tac` và `_quarantine` phân vùng theo `ngay`, khoảng 140 phân vùng. Mọi job lô đọc theo khoảng ngày:

- tính tăng dần các ngày mới;
- chia train/test theo ngày cắt;
- backfill;
- ghi đè đúng phân vùng bằng `replaceWhere`.

**Không phân vùng theo `ma_nguoi_dung`.** 1,4 triệu người dùng sẽ thành hàng triệu thư mục và tệp vài chục byte. NameNode phải giữ metadata của từng tệp, nhật ký Delta phình to, và mỗi lần quét phải mở hàng triệu tệp. Trên dữ liệu mẫu, ghi phân vùng không gom tệp đã sinh 7.334 tệp cho 20.624 dòng. Sau khi gom theo phân vùng trước khi ghi, silver thật chỉ có 140 tệp.

Truy vấn nóng theo một người dùng được giải bằng Z-ORDER trên bảng gold (@sec:spark), không bằng phân vùng.

**Giữ lịch sử để tái lập.** Mọi bảng giữ tệp cũ 30 ngày và nhật ký 60 ngày, nên VACUUM hằng đêm không phá `VERSION AS OF` của thí nghiệm trong vòng một tháng.
