# Dữ liệu {#sec:dl}

## Nguồn

RetailRocket Recommender System Dataset (Kaggle) gồm bốn tệp:

- `events.csv`: 2.756.101 sự kiện xem, thêm giỏ, mua của 1,4 triệu khách, từ 3/5 đến 18/9/2015;
- `item_properties_part1.csv`, `item_properties_part2.csv`: thuộc tính sản phẩm theo thời gian, đã ẩn danh;
- `category_tree.csv`: cây danh mục.

Producer phát lại sự kiện theo thời điểm gốc, mỗi ngày nén thành 30 giây, và sinh thêm 5 % người dùng mới (48.376 người, 138.137 sự kiện) để buộc hệ thống xử lý khởi đầu lạnh.

## Khảo sát dữ liệu

`notebooks/eda_retailrocket.ipynb` trình bày kết quả khảo sát dữ liệu gốc (@tab:eda, @fig:eda). Số liệu do `jobs/kiem_tra/eda.py` tính trên cụm ngày 16/11 từ các tệp CSV trên HDFS; job chỉ đưa về driver các bảng tổng hợp nhỏ.

Table: Khảo sát `events.csv` (tính trên cụm, `docs/bang_chung/cum/eda.json`) {#tab:eda w=58,42}
| Chỉ số | Giá trị |
|---|---|
| Sự kiện / người dùng / sản phẩm | 2.756.101 / 1.407.580 / 235.061 |
| Khoảng thời gian | 3/5 – 18/9/2015 (139 ngày), trung bình 19.828 sự kiện/ngày |
| Xem / thêm giỏ / mua | 96,7 % / 2,5 % / 0,8 % |
| Phễu người dùng: xem → thêm giỏ → mua | 1.404.179 → 37.722 (2,7 %) → 11.719 (0,83 %) |
| Mật độ ma trận người dùng × sản phẩm | 6,5 × 10^{−6} (2.145.179 cặp) |
| Người dùng chỉ có 1 sự kiện / dưới 3 sự kiện | 71,2 % / 85,8 % |
| Sự kiện mỗi người dùng: trung vị / p99 / lớn nhất | 1 / 13 / 7.757 |
| Sự kiện mỗi sản phẩm: trung vị / p99 / lớn nhất | 3 / 136 / 3.412 |
| Phần sự kiện của 1 % / 10 % sản phẩm phổ biến nhất | 22,9 % / 64,0 % |
| Dòng trùng hoàn toàn / nhấp lặp trong 5 giây | 460 / 11.759 |
| Bot (một giờ > 500 sự kiện) | 0; nhiều nhất 242 sự kiện trong một giờ |
| Thuộc tính sản phẩm / cây danh mục | 20,3 triệu dòng, 417.053 sản phẩm, 1.104 thuộc tính; 1.669 danh mục, 25 gốc |

![Sự kiện theo ngày, theo giờ UTC và phân bố số sự kiện của mỗi người dùng](hinh/c08_eda.png){#fig:eda w=16}

Các đặc điểm định hình thiết kế:

- **Cực thưa, phản hồi ngầm.** Mật độ chỉ 6,5 × 10^{−6}, và 96,7 % sự kiện là lượt xem. Vì vậy nhóm chọn ALS `implicitPrefs = true` với trọng số xem 1, thêm giỏ 3, mua 5. Sau khi lọc, ma trận huấn luyện có 746.350 cặp trên 179.999 người dùng × 126.230 sản phẩm, mật độ khoảng 3,3 × 10^{−5}.
- **Đa số khách chỉ ghé một lần.** 85,8 % người dùng có dưới 3 sự kiện. Lọc người dùng có ít nhất 3 tương tác (mục 3.10) giữ 179.999 người để huấn luyện; phần còn lại cần chiến lược khởi đầu lạnh.
- **Đuôi dài.** 10 % sản phẩm phổ biến nhất nhận 64 % sự kiện, còn một nửa số sản phẩm có không quá 3 sự kiện. Vì vậy phải đo độ phủ, độ mới lạ và thử giảm thiên lệch.
- **Nhịp ngày, nhịp tuần.** Giờ cao điểm (19–21 giờ UTC, khoảng 185 nghìn sự kiện mỗi giờ) gấp khoảng 11 lần giờ thấp điểm (9–11 giờ UTC). Thứ Ba đông nhất, thứ Bảy vắng nhất. Producer giữ nguyên thứ tự thời gian, nên luồng thịnh hành gặp đúng các đợt tăng giảm này.
- **Dữ liệu khá sạch.** Không có bot theo ngưỡng 500 sự kiện/giờ và không thiếu trường. Chỉ có 460 dòng trùng hoàn toàn và 11.759 lượt nhấp lặp trong 5 giây. Các bước khử trùng vẫn cần, vì việc phát lại dữ liệu qua Kafka sinh ra trùng lặp (mục sau).
- **Giá ẩn danh.** Thuộc tính 790 là giá đã ẩn danh, chỉ dùng để so sánh tương đối.

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

Ngày 16/11 job được chạy lại toàn bộ để dựng `_quarantine` (@tab:loai). Bronze khi đó có 8.198.159 dòng. Phần lớn là các bản phát lại dữ liệu khi chạy thử và tập demo: mỗi lần phát lại, sự kiện có offset Kafka mới, tức mã sự kiện mới, nên chỉ bước so nội dung bắt được.

Table: Số dòng bị loại theo lý do (`docs/bang_chung/cum/04_delta.txt`, mục F) {#tab:loai w=34,22,44}
| Nơi / `ly_do` | Số dòng | Ghi chú |
|---|---|---|
| `bronze.su_kien` | 8.198.159 | Tất cả sự kiện đã nạp, kể cả bản phát lại |
| `trung_noi_dung` | 5.304.360 | Bản phát lại và 460 dòng trùng có sẵn trong CSV; 475.531 người dùng |
| `nhap_lap_5_giay` | 11.312 | 0,39 % số dòng còn lại sau khi bỏ trùng; 7.901 người dùng |
| `thieu_truong`, `trung_ma_su_kien`, `bot`, `loai_su_kien_khong_dung` | 0 | Đúng như khảo sát |
| `_quarantine.tuong_tac` | 5.315.672 | Tổng các dòng bị loại |
| `silver.tuong_tac` | 2.882.484 | Xem 2.779.729, thêm giỏ 77.561, mua 25.194 |

Silver cộng quarantine bằng bronze, trừ 3 sự kiện mới nhất chưa được làm sạch vì DAG 1 đang tạm dừng. Bronze tăng từ 2,89 lên 8,20 triệu dòng mà silver gần như không đổi: 2.882.479 dòng ở phiên bản 0 (10/11), 2.882.484 dòng ở phiên bản hiện tại. Đây là bằng chứng ở quy mô thật rằng phát lại dữ liệu không làm sai silver. Chạy lại job cho cùng kết quả, vì cả hai bảng được ghi đè đúng các phân vùng ngày vừa tính.
