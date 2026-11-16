# !Tóm tắt

Báo cáo trình bày **bd03_khuyen_nghi**, hệ thống gợi ý sản phẩm cho một sàn thương mại điện tử mô phỏng (Đề tài 3, học phần Dữ liệu lớn CS411V). Hệ thống phục vụ ba khối:

- "Dành cho bạn" (cá nhân hóa);
- "Sản phẩm liên quan";
- "Đang thịnh hành", cập nhật trong 90 giây.

Mỗi kết quả thử nghiệm A/B đều tái lập được bằng time travel của Delta Lake.

**Nền tảng.** Hệ thống chạy trên sáu máy phòng lab nối qua ZeroTier, gồm:

- HDFS 3.5 (5 DataNode, nhân bản 2), Spark 3.5.3 standalone (34 lõi), Kafka 3.7.2 KRaft, Delta Lake 3.2;
- Airflow 3.3.1 với 5 DAG;
- ứng dụng web FastAPI + Jinja2 + Chart.js.

Dữ liệu RetailRocket (2,76 triệu sự kiện, 4,5 tháng) được phát lại vào Kafka, mỗi ngày dữ liệu nén thành 30 giây.

**Kết quả trên dữ liệu thật.**

Table: - {w=62,38}
| Kết quả | Số liệu |
|---|---|
| ALS phản hồi ngầm tốt nhất (rank 50, regParam 1,0, alpha 40) | NDCG@10 = 0,0680 |
| So với baseline bán chạy toàn sàn / theo danh mục | cao hơn 1.237 % / 43 % |
| Độ phủ ALS thuần, có phân tích nguyên nhân | 3,44 % |
| Bản phục vụ: xếp hạng lại theo độ mới lạ | NDCG@10 0,0865, độ phủ 6,47 % |
| A/B: trộn 30 % sản phẩm thịnh hành | CTR giảm từ 2,094 % xuống 1,978 % (p = 0,015) |
| Z-ORDER theo người dùng, tra cứu gợi ý | trung vị 8,3 s → 0,98 s |
| Tái lập một lượt huấn luyện bằng `VERSION AS OF` | độ lệch 0 |

Hệ thống đáp ứng năm yêu cầu bắt buộc của đề cương:

- gốc `hdfs:///lakehouse/bd03_khuyen_nghi/` có `_quarantine`;
- MERGE, DESCRIBE HISTORY, VERSION AS OF, OPTIMIZE có số đo;
- web ghi ngược vào Delta;
- Airflow có retries, Deadline Alerts thay `sla`, nhánh rẽ và sensor;
- backfill.

Bản đầy đủ (120 trang, `BD03_Bao_cao_He_thong_goi_y.pdf`) là phụ lục kỹ thuật của bản chính này.

**Từ khóa:** hệ thống gợi ý, ALS phản hồi ngầm, Spark, Structured Streaming, Kafka, Delta Lake, lakehouse, Airflow, A/B, tái lập.
