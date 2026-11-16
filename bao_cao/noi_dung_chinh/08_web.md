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

Bộ đệm có hạn sống (@tab:bo-dem) giữ phần lớn yêu cầu ở mức mili giây. Lần đầu sau khi bộ đệm hết hạn mới chạy truy vấn Spark cục bộ. Truy vấn gợi ý theo người dùng là truy vấn được đo Z-ORDER ở @tab:zorder.

Table: Hạn sống bộ đệm của web {#tab:bo-dem w=60,40}
| Dữ liệu | Hạn sống |
|---|---|
| Thịnh hành | 10 giây |
| Gợi ý theo người dùng | 30 giây |
| Bảng nhỏ | 60 giây |
| Bảng báo cáo chỉ đổi mỗi đêm | 600 giây |
| Sản phẩm liên quan | 600 giây |
| Bảng lớn | 3.600 giây |

`scripts/do_do_tre_web.py` đo từ máy khách 20 lần mỗi nhóm yêu cầu đọc; script không ghi lượt hiển thị để không làm bẩn số liệu A/B.

**Lần đo trên cụm ngày 16/11 phát hiện hai lỗi** mà kiểm thử với kho dữ liệu giả không bắt được (`docs/bang_chung/cum/07_do_tre_web.md`):

- **Gợi ý cho người dùng quen chậm:** trung vị 8,9 giây, chỉ 1/20 yêu cầu dưới 3 giây. Nguyên nhân là OPTIMIZE ZORDER hằng đêm dùng cỡ tệp mặc định 1 GB, gộp bảng gợi ý (38 MB) thành một tệp; data skipping không loại được tệp nào, nên mỗi lần tra một người dùng phải đọc cả bảng. Thí nghiệm ở @tab:zorder đặt cỡ tệp 1 MB nên không gặp hiện tượng này. Sửa: DAG 4 giới hạn 1 MB cho riêng bảng này.
- **`/mo-hinh`, `/api/mo-hinh/chi-so`, `/tai-lap` lỗi 500** nếu gọi lại trong 60 giây: một hàm bỏ cột ngay trên dữ liệu nằm trong bộ đệm. Sửa: chép trước khi biến đổi, kèm kiểm thử hồi quy.

Sau khi sửa và OPTIMIZE lại bảng gợi ý (1 tệp → 36 tệp), lần đo lại cùng ngày cho kết quả ở @tab:web.

Table: Thời gian phản hồi trước và sau khi sửa, 20 yêu cầu mỗi nhóm (16/11/2026) {#tab:web w=34,26,40}
| Nhóm yêu cầu | Trước: trung vị, dưới 3 s | Sau: lần đầu / trung vị / p95, dưới 3 s |
|---|---|---|
| Gợi ý, người dùng quen | 8.907 ms, 1/20 | 426 / 28 / 531 ms, **20/20** |
| Gợi ý, người dùng mới | 17 ms, 20/20 | 402 / 22 / 407 ms, 20/20 |
| Trang chủ, thịnh hành, `/api/ab/ket-qua` | 16–18 ms, 20/20 | 16–21 ms, 20/20 |
| Trang sản phẩm | 409 ms, 18/20 | 2.586 / 338 / 2.586 ms, 19/20 |
| `/mo-hinh` | 19/20 lỗi 500 | 8.529 / 28 / 58 ms, 19/20 |
| `/api/mo-hinh/chi-so`, `/tai-lap` | 20/20 lỗi 500 | trung vị 22–29 ms, **20/20** |
| **Toàn bộ 220 yêu cầu** | 161 thành công | **220 thành công, 99,1 % dưới 3 s, p95 457 ms** |

Hai yêu cầu còn trên 3 giây đều là lần đầu sau khi web khởi động: `/mo-hinh` 8,5 giây, một trang sản phẩm 3,4 giây. Sau lần đo này, web chạy trước các truy vấn chậm đó trong một luồng nền lúc khởi động, và giữ ba bảng báo cáo (chỉ đổi mỗi đêm) trong bộ đệm 10 phút. Hai thay đổi này chưa được đo lại trên cụm.
