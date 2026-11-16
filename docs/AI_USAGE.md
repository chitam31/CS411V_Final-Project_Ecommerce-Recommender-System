# AI_USAGE.md — Khai báo sử dụng AI (mục A.9 đề cương)

Đề tài 3 `bd03_khuyen_nghi` — Hệ khuyến nghị sản phẩm cho sàn TMĐT. Học phần Dữ liệu lớn (CS411V), Trường Đại học Tân Tạo.

Mục A.9 của đề cương cho phép dùng mã do AI sinh nếu ghi rõ ba điều: prompt đã dùng, phần nào do AI sinh, phần nào nhóm sửa. Tài liệu này khai báo đầy đủ, đúng với lịch sử Git của repo.

## 1. Tóm tắt

| Mục | Khai báo |
|---|---|
| Công cụ | Claude (Anthropic): claude.ai Projects (hội thoại, soạn mã và tài liệu) và Claude Code (sửa mã trực tiếp trong repo, commit và push) |
| Thời gian | 09/11/2026 – 15/11/2026 |
| Vai trò của AI | Hướng dẫn kỹ thuật và **sinh gần như toàn bộ mã nguồn, cấu hình, kiểm thử, tài liệu, báo cáo, slide và kịch bản bảo vệ** |
| Vai trò của nhóm | Cung cấp đề cương, mã và cấu hình cụm cũ của nhóm; dựng và vận hành cụm 6 máy lab qua ZeroTier; chạy mọi job, DAG, luồng trên cụm thật; gửi log và ảnh lỗi để AI sửa; ra quyết định triển khai; kiểm chứng kết quả; trình bày và bảo vệ |
| Lịch sử Git | Commit do AI tạo có tác giả `Claude` và/hoặc dòng `Co-Authored-By: Claude ...`. Ngày 15/11/2026, trước các commit của đợt sửa theo đề cương: **83/87 commit có tác giả `Claude`, 84/87 commit có dòng `Co-Authored-By: Claude`**. Xem lại bằng `git shortlog -sn` và `git log --format='%an %(trailers:key=Co-Authored-By)'` |
| Nguồn số liệu | Mọi số liệu trong báo cáo, slide và README (số sự kiện, metric mô hình, A/B, Z-ORDER, độ trễ...) lấy từ các lần chạy thật trên cụm, in ra bởi job Spark (dòng JSON cuối), `jobs/kiem_tra/xuat_ket_qua.py` hoặc `scripts/thu_bang_chung.sh`. AI chỉ trình bày lại, không tạo số liệu |

## 2. Cách làm việc với AI

1. Nhóm đưa vào dự án Claude: đề cương (`ĐỀ TÀI 3_BIG DATA.pdf`, đề cương chi tiết học phần, sau đó `de_cuong_do_an_big_data.pdf`), giáo trình các môn liên quan, hai tệp `spark-cluster.zip` và `hadoop-cluster.zip`, địa chỉ các repo cũ của nhóm (`spark-cluster`, `hadoop-cluster`, `hadoop-custom`, `kafka-docker`) và ảnh chụp ZeroTier Central.
2. AI rà soát cấu hình cũ (NHAT_KY.md mục 2 liệt kê các lỗi tìm thấy), đề xuất kiến trúc, viết mã và tài liệu theo từng mục của đặc tả.
3. Nhóm chạy trên cụm thật. Lỗi (log Spark, Airflow, HDFS, ảnh màn hình) được gửi lại; AI chẩn đoán và sửa. 33 lỗi đã gặp và cách sửa được ghi trong NHAT_KY.md và mục "Sự cố" của báo cáo.
4. Từ 10/11/2026 AI làm việc trực tiếp trong repo qua Claude Code: commit, push lên GitHub. Nhóm đồng bộ mã sang các máy lab bằng `scripts/cum/ssh_tat_ca.sh --dong-bo-ma` (trên máy lab dùng chung không lưu token GitHub).

## 3. Prompt đã dùng

Các hội thoại đầy đủ được lưu trong dự án Claude "Big Data_Recomendation System" của nhóm; khi giảng viên yêu cầu, nhóm có thể xuất bản ghi hội thoại gốc. Bảng dưới ghi nội dung yêu cầu theo từng giai đoạn. Cột "Nguyên văn" đánh dấu câu được chép đúng chữ; các dòng còn lại là **tóm tắt** nội dung yêu cầu, không phải trích dẫn.

| Ngày | Yêu cầu gửi cho AI | Nguyên văn? | AI tạo ra |
|---|---|---|---|
| 09/11 | Đọc đề tài 3 và đề cương học phần, đọc repo cụm cũ của nhóm, xây dựng toàn bộ đồ án chạy phân tán trên 6 máy lab + 2 máy cá nhân qua ZeroTier, đúng đặc tả 3.1–3.11 | Tóm tắt | Kiến trúc, `jobs/`, `producer/`, `web/`, `airflow/dags/`, `ha_tang/`, `scripts/`, `tests/`, `docs/`, `MO_HINH.md`, `NHAT_KY.md` (gói `BD03_Thanh_pham_v1.x`) |
| 10/11 | Đưa dự án lên repo GitHub riêng; điều khiển cả cụm từ laptop qua SSH; sửa lỗi khi chạy thật (DataNode, Spark Master, Wi-Fi chặn client-to-client, safe mode, tệp nhỏ...) | Tóm tắt | `scripts/cum/*.sh`, các bản sửa ghi trong NHAT_KY.md |
| 10/11 | Chạy dữ liệu thật RetailRocket đủ 8 bước, phân tích kết quả, bổ sung thí nghiệm re-ranking và A/B đủ mẫu; dựng Airflow trên master RAM 7,4 GB | Tóm tắt | `jobs/kiem_tra/*`, `MO_HINH.md` mục 12, cấu hình Airflow gọn |
| 10–11/11 | Viết báo cáo cuối kỳ (Word + PDF), hình, công thức; slide bảo vệ; bộ câu hỏi – đáp | Tóm tắt | `bao_cao/` (trình dựng docx, nội dung, hình), `bao_cao/slide/`, `bao_cao/hoi_dap/` |
| 11/11 | Chuyển web khỏi máy Ctam sang máy lab khác; thiết kế lại giao diện web | Tóm tắt | `ha_tang/web/`, `web/templates/`, `web/static/` |
| 11/11 | Thí nghiệm bổ sung: giai đoạn validation cho tuning, A/B mức người dùng, nguồn ứng viên ngoài ALS | Tóm tắt | `jobs/kiem_tra/tuning_validation.py`, `bootstrap_ab.py`, `thu_nguon_ung_vien.py` |
| 11/11 | Báo cáo bản tiếng Việt | Tóm tắt | `bao_cao/noi_dung_vi/` |
| 14/11 | "script md cho dễ thực hiện đi Thầy" | Nguyên văn | `bao_cao/kich_ban/KICH_BAN_DEMO_19_11.md` |
| 14/11 | "mỗi nhóm được khoảng 20 phút, demo trước phần slide và buổi học có học ở phòng lab" | Nguyên văn | Kịch bản demo 10 phút |
| 14/11 | "Bây giờ việc demo sẽ chỉ làm theo md của Thầy và hiện em muốn Thầy viết 1 file word tiếng Việt cho các phần nội dung cần thiết trình bày trong buổi thuyết trình sau khi demo ạ Thầy, thuyết trình trong vòng 20 phút nhé Thầy ơi, file phải cover hết các vấn đề trọng tâm của đồ án nên trình bày cho Thầy Dũng ạ" | Nguyên văn | `BD03_Noi_dung_thuyet_trinh_19_11.docx` |
| 14/11 | "em muốn kịch bản thuyết trình chi tiết hơn do Thầy Dũng mới nói là không giới hạn thời gian thuyết trình, miễn sao làm rõ cả đồ án là được ạ Thầy" | Nguyên văn | `BD03_Kich_ban_thuyet_trinh_chi_tiet_19_11.docx` |
| 14/11 | "còn nội dung nào thiếu chưa trình bày cho Thầy Dũng chưa ạ Thầy" | Nguyên văn | Các phần bổ sung 1–6 của kịch bản thuyết trình |
| 15/11 | "Thầy hãy đọc thật kỹ xem toàn bộ đồ án hiện tại Thầy làm đã đáp ứng được file đề cương đồ án này chưa ạ Thầy, em cần check thật kỹ tất cả mọi thứ để đảm bảo đồ án đạt điểm cao nhất có thể ạ Thầy" | Nguyên văn | Bảng đối chiếu với đề cương (docs/DOI_CHIEU_YEU_CAU.md, Phần A và C) |
| 15/11 | "Bây giờ Thầy hãy sửa toàn bộ đồ án để có thể đáp ứng tất cả yêu cầu hiện còn sai thiếu ạ (trừ phần A.2 Nhóm và vai trò ra). thầy phải sửa toàn bộ luôn nha Thầy" | Nguyên văn | Đợt sửa theo đề cương, xem mục 4 |

## 4. Phần do AI sinh

| Phần | Do AI sinh | Ghi chú |
|---|---|---|
| `jobs/` (PySpark: streaming, transform, ml, bảo trì, kiểm tra) | Toàn bộ | Phát triển từ job bronze cũ của nhóm (`nap_su_kien_bronze.py`) |
| `airflow/dags/` (5 DAG) | Toàn bộ | |
| `web/` (FastAPI, Jinja2, giao diện) | Toàn bộ | Chart.js 4.6.1 trong `web/static/vendor/` là thư viện mã nguồn mở (giấy phép MIT), không do AI viết |
| `producer/` | Toàn bộ | |
| `ha_tang/` (Docker compose, Dockerfile, submit.sh) | Toàn bộ, trên nền cấu hình cũ của nhóm | Giữ tên container, volume, cổng của repo cũ |
| `scripts/` | Toàn bộ | |
| `tests/` | Toàn bộ | |
| `docs/`, `README.md`, `MO_HINH.md`, `NHAT_KY.md`, `notebooks/` | Toàn bộ | NHAT_KY ghi lại kết quả các lần chạy do nhóm thực hiện |
| `bao_cao/` (báo cáo, hình, slide, hỏi – đáp, kịch bản) | Toàn bộ | Ảnh chụp màn hình web, Spark UI, Airflow lấy từ hệ thống thật |
| Đợt sửa theo đề cương ngày 15/11 | Toàn bộ | Gốc `/lakehouse/bd03_khuyen_nghi` + script chuyển, `_quarantine` và thống kê làm sạch, Deadline Alerts thay `sla`, backfill DAG 1/DAG 3, Chart.js, đo độ trễ web, ghi ngược Delta trực tiếp từ web, script demo Delta SQL và cây HDFS, script thu bằng chứng, notebook EDA, `conf/`, tài liệu này |

## 5. Phần nhóm thực hiện và chỉnh sửa

Những việc dưới đây do nhóm làm. Phần lớn không nằm trong commit vì đó là vận hành trên các máy lab. Vai trò theo mục A.2: Lê Chí Tâm là ML Engineer và DevOps/Orchestration; Lê Nguyễn Quốc Anh là Web Developer và Data Engineer (bảng phân công ở mục 10 báo cáo chính).

- Hạ tầng gốc trước khi dùng AI: repo cụm `spark-cluster`, `hadoop-cluster`, `hadoop-custom`, `kafka-docker` và job bronze ban đầu. AI rà soát và sửa trên nền này (Lê Nguyễn Quốc Anh).
- Mạng ZeroTier cho 6 máy lab và máy cá nhân; xin và phối hợp với phòng lab để dùng máy, chặn card Docker trong ZeroTier, xử lý máy ngủ (Lê Nguyễn Quốc Anh).
- Tải dữ liệu RetailRocket bằng khóa Kaggle trên laptop (khóa không để trên máy lab dùng chung) và chép sang cụm (Lê Nguyễn Quốc Anh).
- Chạy toàn bộ pipeline, 3 luồng streaming, Airflow, web, bộ phát Kafka trên cụm thật; chụp màn hình, gửi log lỗi; kiểm tra web và DAG tái lập (Lê Chí Tâm).
- Quyết định triển khai: chuyển web khỏi máy Ctam sang labsoe-18, tạm dừng Cassandra ngoài dự án trên master để đủ RAM, chọn máy chạy từng vai trò (cả nhóm).
- Commit của nhóm trong repo: đưa dự án lên thư mục gốc và cố định LF (10/11), mẫu bìa báo cáo TTU (11/11), sửa tên thành viên và tiêu đề README (11/11) (Lê Chí Tâm).
- Duyệt và yêu cầu sửa các bản nháp tài liệu, kịch bản demo và thuyết trình (Lê Chí Tâm).

Những phần thành viên tự sửa trực tiếp trên mã hoặc tài liệu (đối chiếu được trong lịch sử Git):

| Thành viên | Tệp / phần đã tự sửa | Nội dung chỉnh sửa |
|---|---|---|
| Lê Chí Tâm | Cả repo, `.gitattributes` (`221db2d`, 10/11) | Đưa dự án lên thư mục gốc, cố định LF cho tệp văn bản |
| Lê Chí Tâm | Báo cáo tiếng Anh, `bao_cao/hinh/` (`c850448`, 11/11) | Mẫu bìa báo cáo TTU |
| Lê Chí Tâm | `README.md` (`3f37e24`, `1a2b245` ngày 11/11; `38fc8db` ngày 15/11) | Sửa tên thành viên, tiêu đề; bỏ ghi chú về dữ liệu thí nghiệm |
| Lê Chí Tâm | Kết quả thí nghiệm, nay ở `docs/ket_qua_cum/` (`0bfc438`, 13/11) | Thêm kết quả thí nghiệm bổ sung chạy trên cụm (tuning, bootstrap A/B, chẩn đoán) |

## 6. Kiểm chứng phần do AI sinh

- 143 kiểm thử pytest chạy trên Spark local thật và Airflow 3.3.1 thật: `pytest` (Spark, web) và `tests/test_airflow_dags.py` (cần `requirements-airflow.txt`).
- Pipeline chạy thật trên cụm, kết quả ghi ở NHAT_KY.md và các tệp trong `docs/bang_chung/`.
- Tái lập bằng time travel: DAG `kn_tai_lap` cho metric trùng khớp với lịch sử ở hai phiên bản đặc trưng (độ lệch 0).
- Deadline Alert và backfill được thử trên Airflow 3.3.1 thật trước khi đưa lên cụm: `docs/bang_chung/kiem_chung_airflow_cuc_bo.md`.

## 7. Giải thích mã khi bảo vệ

Mục A.9 yêu cầu nhóm giải thích được mọi dòng mã. Tài liệu hỗ trợ:

- `docs/KIEN_TRUC.md`: kiến trúc, đặc tả bảng, lý do từng quyết định thiết kế.
- `MO_HINH.md`: thẻ mô hình và cơ sở lý thuyết.
- Docstring và chú thích tiếng Việt ở đầu mỗi job, DAG và script.
- `docs/CHUAN_BI_BAO_VE.md` và `bao_cao/hoi_dap/`: câu hỏi phản biện kèm đáp án (gồm các câu mẫu mục C.5).
