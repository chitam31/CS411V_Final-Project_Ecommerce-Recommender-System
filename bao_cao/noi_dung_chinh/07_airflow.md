# Điều phối Airflow {#sec:af}

## Sơ đồ DAG

Table: Năm DAG (Airflow 3.3.1, mọi task Spark gọi `submit.sh` bằng BashOperator) {#tab:dag w=24,13,13,50}
| DAG | Lịch | Deadline | Nội dung |
|---|---|---|---|
| `kn_pipeline_hang_ngay` | 02:00 hằng ngày | 7 giờ | Sensor chờ dữ liệu mới → làm sạch → thống kê → ma trận → tinh chỉnh → đánh giá → **BranchPythonOperator**: triển khai hoặc giữ mô hình cũ + cảnh báo |
| `kn_giam_sat_streaming` | mỗi 15 phút | 10 phút | Kiểm tra luồng thịnh hành còn sống và có cửa sổ 15 phút gần nhất; hỏng thì tự khởi động lại (`trigger_rule = one_failed`) |
| `kn_tinh_ab` | mỗi giờ | 30 phút | CDF → tổng hợp → kiểm định z → MERGE `gold.ket_qua_ab`; **ShortCircuitOperator** cho backfill |
| `kn_bao_tri` | 04:00 hằng ngày | 90 phút | Xóa gợi ý cũ → OPTIMIZE / ZORDER → VACUUM |
| `kn_tai_lap` | thủ công | 3 giờ | Nhận `phien_ban_delta` qua `dag_run.conf`, chạy lại huấn luyện trên `VERSION AS OF`, so với lịch sử |

![DAG pipeline hằng ngày; hồ sơ tài nguyên của mỗi task Spark ghi trong ngoặc vuông](hinh/f05b_dag1_ngang.png){#fig:dag1 w=16}

## Xử lý lỗi

- **Thử lại và cảnh báo.**
  - `retries = 1`, cách nhau 5 phút;
  - `on_failure_callback` ghi `logs/canh_bao.log`;
  - `execution_timeout` 4 giờ cho bước tinh chỉnh, `dagrun_timeout` cho từng DAG.

  Mọi bước ghi đều lũy đẳng (@sec:spark), nên thử lại luôn an toàn: DAG hỏng ở task 3/5 thì chạy lại không nhân đôi dữ liệu.
- **Sensor không chiếm chỗ.** Sensor chạy `mode = "reschedule"`, so thời điểm sửa của `_spark_metadata` bronze với `_delta_log` silver qua WebHDFS, nên không khởi động Spark. Đặt `soft_fail` để một đêm không có dữ liệu kết thúc bằng lượt bỏ qua, không phải lỗi.
- **Nhánh giữ mô hình cũ.** Nếu NDCG của mô hình mới không đạt mức của mô hình đang phục vụ (dung sai 1 %), gold không đổi và DAG ghi cảnh báo.
- **SLA bằng Deadline Alerts.** Airflow 3.0 đã gỡ `sla`; bản 3.1 thay bằng Deadline Alerts. Mỗi DAG đặt `deadline = han_chot(phút)`, tính từ lúc lượt chạy vào hàng đợi. Quá hạn mà chưa xong, scheduler gọi callback **ngay lúc đó**, trong khi SLA cũ chỉ được kiểm tra khi lượt chạy kết thúc. Thử trên Airflow 3.3.1 thật với hạn 1 phút: callback chạy sau 61 giây, khi task vẫn đang chạy.

## Backfill

- **DAG 1.** Trigger với cấu hình `{"tu_ngay": "2015-09-10", "den_ngay": "2015-09-12"}`. `bronze_to_silver` tính lại đúng các phân vùng đó (cả silver và quarantine), bỏ qua sensor, **không đổi mốc tăng dần**: commit ghi `{"backfill": …}` thay cho mốc. Các bước sau chạy như thường lệ.
- **DAG 3.** Dùng lệnh chuẩn `airflow backfill create --dag-id kn_tinh_ab --from-date … --to-date … --reprocess-behavior completed`. Mỗi ngày có 24 lượt chạy. Cổng `cong_backfill` cho lượt 00:00 UTC tính lại cả ngày đó, 23 lượt còn lại bị bỏ qua. MERGE theo (ngày, nhóm) nên không nhân đôi. Đã thử trên Airflow thật: 5 lượt backfill, đúng 1 lượt chạy job với `--tu-ngay`.
