# Giới thiệu bài toán và mục tiêu {#sec:gt}

Ban sản phẩm của một sàn thương mại điện tử (1,4 triệu người dùng, 235.000 sản phẩm) cần bốn thứ:

- gợi ý cá nhân hóa trên trang chủ;
- gợi ý sản phẩm liên quan trên trang chi tiết;
- khối "Đang thịnh hành" cửa sổ 15 phút;
- một cách đo khối nào cho tỷ lệ nhấp (CTR) cao hơn, bằng thử nghiệm A/B tái lập được khi bị chất vấn.

Bài toán có ba thách thức:

- **Phản hồi ngầm.** Chỉ có sự kiện xem, thêm giỏ, mua; không có điểm đánh giá.
- **Khởi đầu lạnh.** Có người dùng mới hoàn toàn, người dùng ít tương tác và sản phẩm mới.
- **Thiên lệch độ phổ biến.** Mô hình dễ chỉ gợi ý hàng bán chạy.

Các mục tiêu đo được lấy từ đặc tả đề tài (mục 3.6, 3.11) và đề cương chung (mục A.6), ghi ở @tab:muc-tieu.

Table: Mục tiêu và tiêu chí đo {#tab:muc-tieu w=22,48,30}
| Nhóm | Tiêu chí | Kết quả (chương) |
|---|---|---|
| Mô hình | ALS implicit, tinh chỉnh ≥ 9 tổ hợp; NDCG@10 hơn baseline bán chạy ≥ 30 %; độ phủ ≥ 10 % | NDCG +1.237 %; độ phủ 6,47 % khi phục vụ, có phân tích (@sec:ml) |
| Khởi đầu lạnh | 3 chiến lược: người mới, < 5 tương tác, sản phẩm mới | Đạt (@sec:ml) |
| Luồng | Thịnh hành cập nhật ≤ 90 giây sau cú nhấp; vòng web → Kafka → bronze → thịnh hành | 51 giây (@sec:spark) |
| Thực nghiệm | A/B có p-value và kết luận; tái lập bằng `VERSION AS OF` | p = 0,015; độ lệch 0 (@sec:ml) |
| Lakehouse | MERGE, DESCRIBE HISTORY, time travel, schema evolution, CDF, OPTIMIZE/Z-ORDER có số đo | Đạt (@sec:lake, @sec:spark) |
| Điều phối | ≥ 3 DAG khác lịch, retries, sla, nhánh/sensor, backfill | 5 DAG, Deadline Alerts (@sec:af) |
| Web | ≥ 3 màn hình, ghi ngược Delta, phản hồi < 3 s | 5 màn hình, 2 đường ghi ngược (@sec:web) |

**Phạm vi.**

- Không làm tài khoản người dùng, thanh toán hay mô hình học sâu.
- ALS được huấn luyện lại theo lô mỗi đêm.
- Lưu lượng A/B phần lớn là mô phỏng, theo mô hình nhấp phụ thuộc vị trí như đặc tả cho phép (mục 3.10). Mọi dòng mô phỏng đều gắn nhãn `nguon_traffic`.
