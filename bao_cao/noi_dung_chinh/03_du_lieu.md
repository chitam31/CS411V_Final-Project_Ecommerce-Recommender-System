# Dữ liệu {#sec:dl}

## Nguồn

RetailRocket Recommender System Dataset (Kaggle) gồm bốn tệp:

- `events.csv`: 2.756.101 sự kiện xem, thêm giỏ, mua của 1,4 triệu khách, từ 3/5 đến 18/9/2015;
- `item_properties_part1.csv`, `item_properties_part2.csv`: thuộc tính sản phẩm theo thời gian, đã ẩn danh;
- `category_tree.csv`: cây danh mục.

Producer phát lại sự kiện theo thời điểm gốc, mỗi ngày nén thành 30 giây, và sinh thêm 5 % người dùng mới (48.376 người, 138.137 sự kiện) để buộc hệ thống xử lý khởi đầu lạnh.

## Khảo sát dữ liệu

`notebooks/eda_retailrocket.ipynb` khảo sát dữ liệu gốc. Số liệu do `jobs/kiem_tra/eda.py` tính trên cụm, chỉ đưa về driver các bảng tổng hợp nhỏ. Các đặc điểm sau định hình thiết kế:

- **Cực thưa.** Ma trận huấn luyện có 746.350 cặp trên 179.999 × 126.230, mật độ khoảng 1,8 × 10^{−5}. Đây là phản hồi ngầm, nên chọn ALS `implicitPrefs = true` với trọng số xem 1, thêm giỏ 3, mua 5.
- **Đa số khách chỉ ghé một lần.** Lọc người dùng có ít nhất 3 tương tác (mục 3.10) giữ 179.999 người để huấn luyện. Phần còn lại cần chiến lược khởi đầu lạnh.
- **Đuôi dài.** Chỉ 9.467 người dùng có tương tác kiểm tra với sản phẩm đã biết, và 10 % sản phẩm phổ biến nhất nhận gần như mọi sự kiện. Vì vậy phải đo độ phủ, độ mới lạ và thử giảm thiên lệch.
- **Trùng lặp, nhấp lặp, bot.** Có các nhóm này, nên cần ba bước khử trùng và một ngưỡng bot.
- **Giá ẩn danh.** Thuộc tính 790 là giá đã ẩn danh, chỉ dùng để so sánh tương đối.

> [!TODO] Chèn bảng tổng quan EDA (số sự kiện, người dùng, sản phẩm, tỷ lệ người dùng chỉ 1 sự kiện, phần sự kiện của 1 % sản phẩm phổ biến nhất, số bot, dòng trùng, nhấp lặp 5 giây) từ `docs/bang_chung/cum/eda.json`.

## Chất lượng và làm sạch

`transform/bronze_to_silver.py` áp dụng các bước ở @tab:lam-sach. Bước trước loại xong mới tới bước sau. Mỗi dòng bị loại được ghi vào `_quarantine.tuong_tac` kèm `ly_do` (mục A.4).

Table: Các bước làm sạch bronze → silver và lý do loại {#tab:lam-sach w=22,42,36}
| `ly_do` | Quy tắc | Lý do |
|---|---|---|
| `thieu_truong` | Thiếu người dùng, sản phẩm, thời điểm hoặc loại | Không dùng được |
| `trung_ma_su_kien` | Trùng `ma_su_kien` (SHA-256 của topic, phân vùng, offset, nội dung), giữ bản nạp sớm nhất | Kafka, file sink giao lại |
| `trung_noi_dung` | Trùng người dùng, sản phẩm, loại, thời điểm (mili giây) | Phát lại một đoạn lần hai sinh mã mới; phải bỏ trước khi lọc bot, nếu không người thật bị coi là bot |
| `bot` | Người dùng có một giờ > 500 sự kiện | Ngưỡng của đặc tả |
| `nhap_lap_5_giay` | Cùng người dùng, sản phẩm, loại trong 5 giây | Nhấp đúp, tải lại trang |
| `loai_su_kien_khong_dung` | Không có trọng số (bỏ khỏi giỏ) | Không phải tín hiệu quan tâm |

Bronze có 2.894.238 dòng, silver 2.882.479 dòng trên 139 ngày: **11.759 dòng (0,41 %)** bị loại. Silver và quarantine cộng lại bằng đúng bronze. Chạy lại job cho cùng kết quả, vì cả hai bảng được ghi đè đúng các phân vùng ngày vừa tính.

> [!TODO] Chèn số dòng bị loại theo từng `ly_do` (mục F của `docs/bang_chung/cum/04_delta.txt`).
