# Đánh giá tổng thể, hạn chế và hướng phát triển {#sec:dg}

## Đánh giá theo tiêu chí nghiệm thu

Table: Tình trạng các tiêu chí (đặc tả 3.11 và đề cương A.6) {#tab:nt w=7,43,50}
| # | Tiêu chí | Tình trạng, bằng chứng |
|---|---|---|
| 1 | Bảng tinh chỉnh ≥ 9 tổ hợp, NDCG@10 | Đạt: 27 tổ hợp (@fig:tuning) |
| 2 | ALS so với 2 baseline, 4 chỉ số + độ phủ + độ mới lạ | Đạt: NDCG +1.237 %. Độ phủ 6,47 % khi phục vụ, dưới 10 % nhưng có phân tích và biện pháp (@tab:pp) |
| 3 | Ba chiến lược khởi đầu lạnh, demo người dùng mới | Đạt (@tab:cs) |
| 4–5 | Thịnh hành ≤ 90 giây; vòng web → Kafka → bronze → thịnh hành | Đạt: 51 giây (@tab:dotre) |
| 6 | A/B có p-value và kết luận | Đạt: p = 0,015 (@tab:ab) |
| 7 | Tái lập bằng VERSION AS OF cho cùng chỉ số | Đạt: độ lệch 0, hai lần |
| 8 | Số liệu OPTIMIZE/ZORDER | Đạt: 8,3 s → 0,98 s (@tab:zorder) |
| A.6.1 | Job lô, MLlib, luồng chạy ≥ 30 phút | Đạt: 3 luồng chạy liên tục |
| A.6.2 | MERGE, DESCRIBE HISTORY, VERSION AS OF, OPTIMIZE | Đạt: `04_delta.txt` |
| A.6.3 | Bảng trên HDFS + `du -h` | Đạt: `01_hdfs_du_h.txt` |
| A.6.4 | ≥ 3 màn hình, ghi ngược Delta | Đạt: 5 màn hình, 2 đường ghi |
| A.6.5 | ≥ 3 DAG, retries, sla, nhánh/sensor | Đạt: 5 DAG, Deadline Alerts |

## Hạn chế

- **Độ phủ chưa đạt 10 % khi phục vụ.** Đạt 14,5 % chỉ ở thử nghiệm offline có thêm ô đồng xuất hiện.
- **A/B dựa trên lưu lượng mô phỏng.** Kết luận chỉ đúng trong giả định của mô hình nhấp.
- **Giá và số sao là đại lượng thay thế.** Thuộc tính 790 đã ẩn danh; số sao tính từ tỷ lệ mua trên xem.
- **Máy master là điểm yếu.** Master chỉ có 7,4 GB RAM và giữ driver của mọi job. Cụm phụ thuộc mạng Wi-Fi của phòng lab, nhiều lúc ZeroTier phải đi đường chuyển tiếp.
- **Kiểm thử web dùng kho dữ liệu giả.** Hai lỗi chỉ lộ ra khi đo trên cụm (@sec:web). Đã sửa, nhưng lớp truy cập Delta của web vẫn chưa có kiểm thử tự động trên Spark kèm Delta.
- **Báo động giả khi không có lưu lượng.** Bộ phát tắt thì DAG giám sát không thấy cửa sổ thịnh hành mới, nên ghi cảnh báo và gọi khởi động lại luồng; luồng đang chạy được giữ nguyên.
- **Bảng novelty nằm trên driver.** Bảng được broadcast, và sẽ không đủ chỗ khi số sản phẩm tăng 100 lần.

## Hướng phát triển

- Chạy driver ở cluster mode (YARN hoặc Kubernetes), tách khỏi máy master.
- Thay bảng novelty bằng broadcast join DataFrame.
- Đưa bảng gợi ý ra kho key–value cho web.
- Thử BPR, item-kNN, MinHash/LSH cho sản phẩm đuôi dài, và đưa nguồn ứng viên đồng xuất hiện vào phục vụ.
- Thêm phân vùng Kafka.
- Chạy A/B với lưu lượng thật.
