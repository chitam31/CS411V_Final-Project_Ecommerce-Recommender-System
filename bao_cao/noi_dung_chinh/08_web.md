# Ứng dụng web {#sec:web}

## Màn hình và API

Table: Năm màn hình và API {#tab:web w=20,52,28}
| Màn hình | Nội dung | API |
|---|---|---|
| Trang chủ | Chọn hoặc tạo người dùng; 10 ô "Dành cho bạn" kèm nguồn, nhóm A/B; khối thịnh hành; mỗi lần dựng trang ghi lượt hiển thị | `GET /api/goi-y/{user_id}`, `POST /api/hien-thi` |
| Sản phẩm | Chi tiết, sản phẩm liên quan, số đếm thịnh hành; nút Xem / Thêm giỏ / Mua đẩy sự kiện vào Kafka | `POST /api/su-kien` |
| Bảng điều khiển A/B | CTR, chuyển đổi theo nhóm, biểu đồ theo ngày (Chart.js), p-value, cỡ mẫu cần, kết luận | `GET /api/ab/ket-qua` |
| Chất lượng mô hình | Chỉ số theo phiên bản, so với baseline, bảng tinh chỉnh, phân bố độ phổ biến | `GET /api/mo-hinh/chi-so` |
| Tái lập | Chọn kết quả A/B cũ → chạy lại trên `VERSION AS OF` → so cũ/mới; kích hoạt DAG 5 | `POST /api/tai-lap/{ngay}` |

**Ghi ngược vào Delta (A.6.4).**

- **Trực tiếp.** "Chạy lại" ghi một dòng `loai = 'ab_web'` vào `gold.ket_qua_tai_lap` bằng chính phiên Spark + Delta của web. Phép ghi chạy nền nên không làm chậm phản hồi.
- **Qua Kafka.** Lượt hiển thị, nhấp, mua đi vào topic `hien-thi`; luồng `ghi_hien_thi` MERGE vào `gold.nhat_ky_hien_thi`.

Lúc demo, `scripts/demo/delta_sql.sh demo <người dùng>` truy vấn hai bảng này để xác nhận dòng vừa ghi.

## Hiệu năng

Middleware đo thời gian xử lý mọi yêu cầu theo mẫu route. Mỗi phản hồi có header `X-Thoi-Gian-Xu-Ly-Ms`, và `GET /api/hieu-nang` trả trung vị, p95, tỷ lệ dưới 3 giây.

Bộ đệm có hạn sống (@tab:bo-dem) giữ phần lớn yêu cầu ở mức mili giây. Lần đầu sau khi bộ đệm hết hạn mới chạy truy vấn Spark cục bộ. Truy vấn gợi ý theo người dùng là truy vấn đã tối ưu bằng Z-ORDER (trung vị 0,98 giây, @tab:zorder).

Table: Hạn sống bộ đệm của web {#tab:bo-dem w=60,40}
| Dữ liệu | Hạn sống |
|---|---|
| Thịnh hành | 10 giây |
| Gợi ý theo người dùng | 30 giây |
| Bảng nhỏ | 60 giây |
| Sản phẩm liên quan | 600 giây |
| Bảng lớn | 3.600 giây |

`scripts/do_do_tre_web.py` đo từ máy khách 20 lần mỗi nhóm yêu cầu đọc; script không ghi lượt hiển thị để không làm bẩn số liệu A/B.

> [!TODO] Chèn bảng thời gian phản hồi (lần đầu, trung vị, p95, lớn nhất, tỷ lệ dưới 3 s) từ `docs/bang_chung/cum/07_do_tre_web.md`.
