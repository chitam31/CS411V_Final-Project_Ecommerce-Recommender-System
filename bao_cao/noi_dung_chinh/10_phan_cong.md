# Phân công công việc và đóng góp {#sec:pc}

Table: Phân công vai trò và đóng góp {#tab:pc w=24,26,50}
| Thành viên | Vai trò | Đóng góp chính |
|---|---|---|
| Lê Chí Tâm (2302220) | ML Engineer, DevOps/Orchestration | Vận hành cụm: chạy pipeline, thí nghiệm mô hình (tuning, A/B), ba luồng streaming, năm DAG Airflow và web trên cụm thật; thu bằng chứng, gửi log lỗi. Tài liệu: duyệt báo cáo, slide, kịch bản; trình bày và điều khiển demo |
| Lê Nguyễn Quốc Anh (2302283) | Web Developer, Data Engineer | Hạ tầng cụm gốc (Spark, Hadoop, Kafka), mạng ZeroTier cho sáu máy lab, phối hợp phòng lab, chọn máy cho từng vai trò. Dữ liệu: tải RetailRocket bằng khóa Kaggle trên laptop, job bronze ban đầu, kiểm tra dữ liệu |

Mỗi thành viên chịu trách nhiệm giải thích phần mã thuộc vai trò của mình: Tâm phụ trách `jobs/ml/`, `jobs/kiem_tra/`, `jobs/bao_tri/`, `airflow/dags/`, `ha_tang/`, `scripts/cum/`; Quốc Anh phụ trách `producer/`, `jobs/streaming/`, `jobs/transform/`, `web/`. Phần lớn mã do AI sinh theo yêu cầu của nhóm nên phần lớn commit mang tên Claude; việc vận hành trên cụm không nằm trong commit. Khai báo chi tiết ở `docs/AI_USAGE.md`.
