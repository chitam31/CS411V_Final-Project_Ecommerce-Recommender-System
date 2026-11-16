# @A Khai báo sử dụng AI {#sec:ai}

Nội dung đầy đủ ở `docs/AI_USAGE.md` (mục A.9 của đề cương).

**Công cụ, thời gian, phạm vi.** Nhóm dùng Claude (Anthropic), qua claude.ai Projects và Claude Code, từ 9 đến 15/11/2026. AI sinh gần như toàn bộ:

- mã nguồn, cấu hình, kiểm thử;
- tài liệu, báo cáo, slide, kịch bản bảo vệ.

Commit do AI tạo có tác giả `Claude` hoặc dòng `Co-Authored-By: Claude`.

**Phần nhóm thực hiện.**

- Cung cấp đề cương, mã và cấu hình cụm cũ của nhóm.
- Dựng ZeroTier và vận hành 6 máy lab.
- Tải dữ liệu bằng khóa Kaggle trên laptop.
- Chạy mọi job, luồng, DAG trên cụm; gửi log lỗi để AI sửa.
- Ra quyết định triển khai.
- Kiểm chứng kết quả, chụp màn hình, bảo vệ.

Mọi con số trong báo cáo đến từ lần chạy thật trên cụm. Danh sách yêu cầu đã gửi cho AI (nguyên văn hoặc tóm tắt, có đánh dấu) nằm ở `docs/AI_USAGE.md` mục 3.

# @B Hướng dẫn dựng lại hệ thống {#sec:dung-lai}

Chi tiết từng máy ở `docs/TRIEN_KHAI_CUM.md`; ánh xạ cấu trúc repo theo mục A.5 ở `README.md` mục 2.1.

```
# laptop (Git Bash): SSH tới 6 máy, đẩy mã, bật dịch vụ theo vai trò của từng máy
bash scripts/cum/ssh_tat_ca.sh --tao-config > ~/.ssh/config && bash scripts/cum/ssh_tat_ca.sh --chep-khoa
bash scripts/cum/ssh_tat_ca.sh --dong-bo-ma
bash scripts/cum/ssh_tat_ca.sh "cd ~/bd03_khuyen_nghi && bash scripts/cum/khoi_dong_may.sh"
bash scripts/cum/chep_du_lieu.sh                 # tải RetailRocket bằng khóa Kaggle của laptop
# master: CSV lên HDFS, rồi toàn bộ pipeline theo thứ tự DAG 1
bash scripts/tai_du_lieu.sh && bash scripts/chay_lan_dau.sh
bash scripts/luong.sh khoi_dong tat_ca           # 3 luồng streaming
# labsit: tạo topic, phát lại sự kiện
bash scripts/tao_topic.sh && python3 producer/phat_lai_su_kien.py --tep ~/du_lieu/retailrocket/events.csv
# kiểm tra và thu bằng chứng
bash scripts/cum/kiem_tra_cum.sh && bash scripts/thu_bang_chung.sh
```

Kiểm thử: `pytest` (141 kiểm thử, gồm 8 kiểm thử DAG cần `requirements-airflow.txt`).
