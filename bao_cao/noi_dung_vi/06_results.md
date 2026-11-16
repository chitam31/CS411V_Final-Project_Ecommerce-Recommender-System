# Kết quả thực nghiệm {#sec:results}

Mọi số liệu trong chương này được tạo ra trên cụm mô tả ở @sec:infra với dữ liệu RetailRocket thật, ngày 10 tháng 11 năm 2026, và được xuất từ các bảng gold bằng `jobs/kiem_tra/xuat_ket_qua.py`. Lượt chạy chính có mã `r20261110T075240`.

## Môi trường và bộ dữ liệu {#sec:res-env}

Pipeline đầu cuối đầu tiên (tám bước của `chay_lan_dau.sh`, lưới đầy đủ 27 tổ hợp) mất 2 giờ 8 phút trên năm worker với 34 lõi; riêng tinh chỉnh chiếm 78,4 phút. @tab:du-lieu tóm tắt dữ liệu ở từng giai đoạn.

Table: Khối lượng dữ liệu ở từng giai đoạn của pipeline {#tab:du-lieu w=55,45}
| Đại lượng | Giá trị |
|---|---|
| Sự kiện phát lại qua Kafka vào bronze | 2.894.238 (2.756.101 sự kiện gốc + 138.137 sự kiện của 48.376 người dùng mới tổng hợp, 4,8 %) |
| Số dòng trong `silver.tuong_tac` sau làm sạch | 2.882.479 trên 139 ngày |
| Ngày cắt / ngày kết thúc của tháng kiểm tra | 2015-08-19 / 2015-09-18 (30 ngày) |
| Người dùng giữ lại trong ma trận (≥ 3 tương tác huấn luyện) | 179.999 |
| Số cặp người dùng – sản phẩm huấn luyện / mật độ | 746.350 / khoảng 3,3 × 10^{−5} (trên 179.999 × 126.230) |
| Số cặp kiểm tra / số người dùng được đánh giá | 32.804 / 9.467 |
| Sản phẩm trong tập huấn luyện (mẫu số của độ phủ) / sản phẩm trong danh mục | 126.230 / 417.053 |
| Số tệp của `silver.tuong_tac` sau khi sửa lỗi tệp nhỏ | 140 (mỗi ngày một tệp) |

Ma trận cực kỳ thưa, và chỉ 9.467 trong 179.999 người dùng huấn luyện có tương tác kiểm tra với sản phẩm đã biết: phần lớn khách của RetailRocket chỉ xuất hiện trong một lượt truy cập ngắn. Điều này định hình mọi kết quả dưới đây: giá trị tuyệt đối của các chỉ số đều thấp với mọi phương pháp, và tập kiểm tra chứa nhiều sản phẩm hiếm gặp trong tập huấn luyện.

## Khảo sát và làm sạch dữ liệu {#sec:res-lam-sach}

**Khảo sát dữ liệu gốc.** `jobs/kiem_tra/eda.py` tính trên cụm, trực tiếp trên bốn tệp CSV gốc của Kaggle (chưa qua bronze, chưa có người dùng tổng hợp), các bảng sau:

- phân bố loại sự kiện và phễu xem → thêm giỏ → mua;
- số sự kiện theo ngày và theo giờ;
- phân bố hoạt động theo người dùng và theo sản phẩm (đuôi dài);
- dòng trùng, nhấp lặp trong 5 giây, người dùng giống bot, giá trị thiếu;
- độ phủ của thuộc tính danh mục và giá.

`notebooks/eda_retailrocket.ipynb` vẽ các bảng đó và tự rút ra hệ quả cho thiết kế từ chính số liệu: chọn ALS phản hồi ngầm, lọc ≥ 3 tương tác, cần khởi đầu lạnh, đo độ phủ và độ mới lạ, lọc bot, phân vùng theo ngày.

Job chạy trên cụm ngày 16 tháng 11 (`docs/bang_chung/cum/eda.json`). @tab:eda tóm tắt kết quả, @fig:eda vẽ ba phân bố chính; biểu đồ là sản phẩm của `bao_cao/hinh/bieu_do_cum.py`, đọc thẳng tệp JSON đó.

Table: Khảo sát `events.csv`, thuộc tính và cây danh mục (tính trên cụm, 16/11/2026) {#tab:eda w=58,42}
| Chỉ số | Giá trị |
|---|---|
| Sự kiện / người dùng / sản phẩm / giao dịch | 2.756.101 / 1.407.580 / 235.061 / 17.672 |
| Khoảng thời gian | 3/5 – 18/9/2015 (139 ngày); trung bình 19.828 sự kiện và 162 lượt mua mỗi ngày |
| Xem / thêm giỏ / mua | 2.664.312 (96,7 %) / 69.332 (2,5 %) / 22.457 (0,8 %) |
| Phễu người dùng: xem → thêm giỏ → mua | 1.404.179 → 37.722 (2,7 %) → 11.719 (0,83 %); 31 % người thêm giỏ đã mua |
| Mật độ ma trận người dùng × sản phẩm | 6,5 × 10^{−6} (2.145.179 cặp khác nhau) |
| Người dùng chỉ có 1 sự kiện / dưới 3 / từ 3 sự kiện | 1.001.560 (71,2 %) / 1.207.552 (85,8 %) / 200.028 (14,2 %) |
| Sự kiện mỗi người dùng: trung vị / p90 / p99 / lớn nhất | 1 / 3 / 13 / 7.757 |
| Sự kiện mỗi sản phẩm: trung vị / p90 / p99 / lớn nhất | 3 / 25 / 136 / 3.412 |
| Phần sự kiện của 1 % / 10 % sản phẩm phổ biến nhất | 22,9 % / 64,0 % |
| Giờ cao điểm / thấp điểm (UTC) | 20 giờ: 187.919 sự kiện / 10 giờ: 16.408 sự kiện (gấp 11,5 lần) |
| Ngày đông nhất / vắng nhất trong tuần | thứ Ba: 447.077 / thứ Bảy: 305.215 |
| Dòng trùng hoàn toàn / nhấp lặp trong 5 giây | 460 / 11.759 |
| Bot (một giờ > 500 sự kiện) | 0 người dùng; nhiều nhất 242 sự kiện trong một giờ |
| Mua thiếu mã giao dịch / không mua mà có mã / thiếu trường | 0 / 0 / 0 |
| Thuộc tính sản phẩm | 20.275.902 dòng, 417.053 sản phẩm, 1.104 thuộc tính; mọi sản phẩm có danh mục và thuộc tính 790; 49.815 sản phẩm có sự kiện nhưng không có thuộc tính |
| Cây danh mục | 1.669 danh mục, 25 gốc |

![Khảo sát `events.csv`: (a) sự kiện theo ngày, (b) theo giờ UTC, (c) phân bố số sự kiện của mỗi người dùng (trục log)](hinh/c08_eda.png){#fig:eda w=16}

Số liệu xác nhận các giả định thiết kế:

- **Phản hồi ngầm, cực thưa.** 96,7 % là lượt xem và mật độ 6,5 × 10^{−6}, nên chọn ALS phản hồi ngầm.
- **Lọc ≥ 3 tương tác bỏ đi phần lớn khách.** Lọc này loại 85,8 % người dùng, nên cần chiến lược khởi đầu lạnh cho phần còn lại.
- **Đuôi dài rõ.** 10 % sản phẩm nhận 64 % sự kiện, nên phải đo độ phủ và độ mới lạ.
- **Không có bot theo ngưỡng 500 sự kiện/giờ.** Người hoạt động mạnh nhất chỉ có 242 sự kiện trong một giờ. Bước lọc bot vẫn giữ làm hàng rào cho lưu lượng mô phỏng và lưu lượng web, nhưng không loại dòng nào của dữ liệu thật.
- **Biên độ ngày đêm khoảng 11 lần.** Producer giữ đúng thứ tự thời gian, nên luồng thịnh hành gặp đúng các đợt tăng giảm này.

**Thống kê làm sạch.** Ở lượt phát lại đầu tiên (10/11), bronze có 2.894.238 sự kiện: 2.756.101 sự kiện gốc và 138.137 sự kiện của người dùng mới tổng hợp. Silver giữ 2.882.479 dòng, tức 11.759 dòng (0,41 %) bị loại.

Từ ngày 15 tháng 11, mỗi dòng bị loại nằm trong `_quarantine.tuong_tac` kèm lý do, theo đúng thứ tự các bước của @tab:lam-sach. Ngày 16/11, job được chạy lại toàn bộ với `--toan-bo --chi-cach-ly` để dựng bảng này cho dữ liệu đã có (@tab:loai). Job xử lý 142 ngày và mất 28 phút trong khi ba luồng vẫn chạy.

Table: Số dòng bị loại theo lý do (16/11/2026, `docs/bang_chung/cum/03_quarantine.json` và mục F của `04_delta.txt`) {#tab:loai w=34,20,46}
| Nơi / `ly_do` | Số dòng | Ghi chú |
|---|---|---|
| `bronze.su_kien` | 8.198.159 | Mọi sự kiện đã nạp, gồm các lần phát lại |
| `thieu_truong` | 0 | |
| `trung_ma_su_kien` | 0 | Kafka và file sink không giao lại lô nào |
| `trung_noi_dung` | 5.304.360 | Các bản phát lại (mỗi lần có offset mới nên mã mới) và 460 dòng trùng có sẵn trong CSV; 475.531 người dùng |
| `bot` | 0 | Đúng như khảo sát |
| `nhap_lap_5_giay` | 11.312 | 0,39 % số dòng còn lại sau khi bỏ trùng; 7.901 người dùng |
| `loai_su_kien_khong_dung` | 0 | |
| `_quarantine.tuong_tac` (tổng) | 5.315.672 | 142 tệp, mỗi ngày một tệp |
| `silver.tuong_tac` | 2.882.484 | Xem 2.779.729, thêm giỏ 77.561, mua 25.194 |

Silver cộng quarantine bằng bronze, trừ 3 sự kiện đến sau lần làm sạch gần nhất (DAG 1 đang tạm dừng). Bronze tăng từ 2,89 lên 8,20 triệu dòng sau các lần phát lại khi chạy thử và tập demo, còn silver gần như không đổi: 2.882.479 dòng ở phiên bản 0, 2.882.484 dòng ở phiên bản hiện tại (mục C của `04_delta.txt`). Đây là kiểm chứng ở quy mô thật cho quyết định bỏ trùng theo nội dung trước khi lọc bot. Nếu thứ tự ngược lại, mỗi người dùng trong dữ liệu phát lại ba lần sẽ có số sự kiện mỗi giờ gấp ba, và người hoạt động mạnh (242 sự kiện/giờ) sẽ bị coi là bot.

## Tinh chỉnh siêu tham số {#sec:res-tuning}

@tab:tuning liệt kê 27 tổ hợp của lưới đầy đủ theo thứ tự chạy, và @fig:tuning trình bày NDCG@10 dưới dạng mỗi rank một bản đồ nhiệt. Mô hình được chọn là **rank = 50, regParam = 1,0, alpha = 40** (in đậm), với NDCG@10 = 0,0680. Huấn luyện cộng đánh giá mất khoảng 75 giây cho mỗi tổ hợp ở rank 10, 160 giây ở rank 30 và 290 giây ở rank 50.

Table: Kết quả tinh chỉnh của lượt chạy r20261110T075240 (27 tổ hợp, tháng kiểm tra) {#tab:tuning w=7,10,7,9,9,11,10,10,9,9}
| rank | regParam | alpha | P@10 | R@10 | NDCG@10 | MAP@10 | Độ phủ | Độ mới lạ | Giây |
|---|---|---|---|---|---|---|---|---|---|
| 10 | 0,01 | 1 | 0,0051 | 0,0217 | 0,0158 | 0,0111 | 0,0014 | 9,574 | 81,4 |
| 10 | 0,01 | 10 | 0,0063 | 0,0297 | 0,0213 | 0,0152 | 0,0031 | 9,782 | 74,6 |
| 10 | 0,01 | 40 | 0,0065 | 0,0331 | 0,0228 | 0,0163 | 0,0050 | 9,857 | 75,5 |
| 10 | 0,1 | 1 | 0,0049 | 0,0199 | 0,0148 | 0,0104 | 0,0021 | 10,087 | 73,1 |
| 10 | 0,1 | 10 | 0,0064 | 0,0308 | 0,0221 | 0,0159 | 0,0030 | 9,780 | 73,1 |
| 10 | 0,1 | 40 | 0,0065 | 0,0326 | 0,0233 | 0,0170 | 0,0051 | 9,872 | 72,3 |
| 10 | 1,0 | 1 | 0,0031 | 0,0154 | 0,0121 | 0,0095 | 0,0019 | 12,554 | 75,7 |
| 10 | 1,0 | 10 | 0,0067 | 0,0328 | 0,0234 | 0,0168 | 0,0038 | 10,029 | 79,7 |
| 10 | 1,0 | 40 | 0,0068 | 0,0344 | 0,0241 | 0,0174 | 0,0053 | 9,907 | 73,0 |
| 30 | 0,01 | 1 | 0,0076 | 0,0335 | 0,0252 | 0,0184 | 0,0045 | 9,999 | 169,3 |
| 30 | 0,01 | 10 | 0,0104 | 0,0547 | 0,0396 | 0,0295 | 0,0131 | 10,329 | 165,5 |
| 30 | 0,01 | 40 | 0,0120 | 0,0680 | 0,0493 | 0,0377 | 0,0198 | 10,470 | 165,7 |
| 30 | 0,1 | 1 | 0,0074 | 0,0335 | 0,0250 | 0,0182 | 0,0060 | 10,231 | 173,2 |
| 30 | 0,1 | 10 | 0,0107 | 0,0554 | 0,0409 | 0,0308 | 0,0130 | 10,348 | 153,4 |
| 30 | 0,1 | 40 | 0,0123 | 0,0685 | 0,0490 | 0,0371 | 0,0202 | 10,510 | 150,1 |
| 30 | 1,0 | 1 | 0,0057 | 0,0291 | 0,0227 | 0,0178 | 0,0059 | 12,259 | 168,7 |
| 30 | 1,0 | 10 | 0,0114 | 0,0588 | 0,0454 | 0,0352 | 0,0155 | 10,554 | 152,9 |
| 30 | 1,0 | 40 | 0,0126 | 0,0694 | 0,0505 | 0,0385 | 0,0209 | 10,562 | 152,9 |
| 50 | 0,01 | 1 | 0,0090 | 0,0419 | 0,0313 | 0,0231 | 0,0075 | 10,205 | 262,6 |
| 50 | 0,01 | 10 | 0,0129 | 0,0699 | 0,0526 | 0,0408 | 0,0217 | 10,591 | 259,6 |
| 50 | 0,01 | 40 | 0,0156 | 0,0906 | 0,0668 | 0,0524 | 0,0323 | 10,769 | 260,6 |
| 50 | 0,1 | 1 | 0,0093 | 0,0442 | 0,0328 | 0,0243 | 0,0098 | 10,381 | 274,2 |
| 50 | 0,1 | 10 | 0,0132 | 0,0706 | 0,0531 | 0,0410 | 0,0214 | 10,623 | 276,4 |
| 50 | 0,1 | 40 | 0,0157 | 0,0902 | 0,0662 | 0,0516 | 0,0331 | 10,800 | 290,5 |
| 50 | 1,0 | 1 | 0,0074 | 0,0391 | 0,0309 | 0,0247 | 0,0094 | 12,182 | 296,9 |
| 50 | 1,0 | 10 | 0,0139 | 0,0738 | 0,0574 | 0,0453 | 0,0249 | 10,824 | 245,1 |
| **50** | **1,0** | **40** | **0,0161** | **0,0921** | **0,0680** | **0,0531** | **0,0344** | **10,865** | **410,1** |

![NDCG@10 trên lưới tinh chỉnh, mỗi rank một bản đồ nhiệt](hinh/c01_tuning.png){#fig:tuning w=15.5}

Từ lưới tinh chỉnh rút ra ba nhận xét.

- **NDCG@10 tăng đơn điệu theo rank và theo alpha.** Giá trị tốt nhất của mỗi rank tăng từ 0,024 lên 0,050 rồi 0,068, và với rank và regParam cố định, alpha = 40 luôn tốt nhất. Với phản hồi ngầm, alpha lớn nâng độ tin cậy của các cặp quan sát được (nhất là lượt mua, trọng số 5) lên cao hơn hẳn các ô trống, nhờ đó mô hình rút được nhiều tín hiệu hơn từ dữ liệu rất thưa. Rank cao hơn cho mô hình năng lực biểu diễn các sở thích ngách hơn.
- **regParam ít ảnh hưởng khi alpha lớn, nhưng gây hại khi alpha nhỏ.** Ở rank 50 và alpha 40, ba giá trị cho 0,0668, 0,0662 và 0,0680. Ở alpha = 1, regParam = 1,0 cho NDCG thấp nhất ở mọi rank kèm độ mới lạ cao bất thường (12,2–12,6): các nhân tố bị co về gần không và gợi ý trở nên gần như là các sản phẩm hiếm ngẫu nhiên.
- **Điểm tối ưu nằm ở biên của lưới** đối với rank và alpha. Điểm tối ưu thật có thể nằm ngoài lưới; bước tiếp theo tự nhiên là thêm rank 100 và alpha 80. Chi phí tăng gần tuyến tính theo rank.

Siêu tham số được chọn ngay trên tháng kiểm tra, không có kỳ validation riêng (@sec:scope), nên các giá trị báo cáo hơi lạc quan. @sec:res-val lặp lại việc chọn với một kỳ validation riêng (15 ngày đầu của tháng kiểm tra) và báo cáo trên các ngày còn lại.

## ALS so với các baseline {#sec:res-baselines}

@tab:phuong-phap so sánh mô hình được chọn với hai baseline bắt buộc, hai biến thể xếp hạng lại do job đánh giá đo, và cấu hình được triển khai để phục vụ (@sec:impl-blend). @fig:phuong-phap vẽ NDCG@10 và độ phủ.

Table: So sánh các phương pháp trên tháng kiểm tra (9.467 người dùng, K = 10) {#tab:phuong-phap w=27,8,8,9,10,9,11,8,10}
| Phương pháp | P@10 | R@10 | NDCG@10 | MAP@10 | Độ phủ (train) | Độ phủ (danh mục) | Độ mới lạ | Số SP khác nhau |
|---|---|---|---|---|---|---|---|---|
| Baseline 1: bán chạy toàn sàn | 0,0017 | 0,0066 | 0,0051 | 0,0036 | 0,01 % | 0,002 % | 8,91 | 10 |
| Baseline 2: bán chạy trong danh mục của người dùng | 0,0122 | 0,0706 | 0,0475 | 0,0352 | 5,28 % | 1,60 % | 11,88 | 6.660 |
| ALS (rank 50, reg 1,0, alpha 40) | 0,0161 | 0,0921 | 0,0680 | 0,0531 | 3,44 % | 1,04 % | 10,86 | 4.346 |
| ALS + xếp hạng lại, β = 0,1 (50 ứng viên) | 0,0166 | 0,0952 | 0,0702 | 0,0549 | 3,65 % | 1,10 % | 10,93 | 4.607 |
| ALS + xếp hạng lại, β = 0,3 (50 ứng viên) | 0,0173 | 0,1001 | 0,0746 | 0,0589 | 4,14 % | 1,25 % | 11,09 | 5.221 |
| **Đang phục vụ: ALS + xếp hạng lại, β = 1,0, 200 ứng viên** | **0,0182** | **0,1089** | **0,0865** | **0,0716** | **6,47 %** | 1,96 % | 12,17 | 8.162 |

![NDCG@10 và độ phủ của các baseline, ALS và các biến thể xếp hạng lại](hinh/c02_phuong_phap.png){#fig:phuong-phap w=15.5}

- **Ngưỡng độ chính xác: đạt với khoảng cách lớn.** NDCG@10 của ALS gấp 13,4 lần baseline bán chạy toàn sàn, tức tăng **+1.237 %** so với yêu cầu +30 %. Danh sách bán chạy toàn sàn là một baseline yếu trên bộ dữ liệu này vì mười sản phẩm phổ biến nhất hiếm khi xuất hiện trong tháng kiểm tra của một người dùng cụ thể. Baseline theo danh mục mạnh hơn nhiều (0,0475): khách của RetailRocket có xu hướng ở lại trong một danh mục. ALS vẫn thắng baseline này **+43 %** về NDCG@10 và trên cả bốn chỉ số xếp hạng.
- **Ngưỡng độ phủ: chưa đạt.** ALS phủ 3,44 % sản phẩm huấn luyện, dưới mục tiêu 10 %; vì vậy `dat_nguong` là sai. Vì đây là lượt huấn luyện đầu tiên, `cai_thien` là đúng và mô hình được triển khai; hai cờ này được cố ý tách độc lập (@sec:impl-train). Đáng chú ý, baseline theo danh mục phủ nhiều sản phẩm hơn ALS (5,28 %), vì nó gợi ý sản phẩm bán chạy của nhiều danh mục khác nhau.
- **Cấu hình đang phục vụ** tốt hơn ALS thuần ở mọi cột: NDCG@10 +27 % (+1.601 % so với baseline 1) và độ phủ +88 %, vẫn dưới 10 %. Cùng các giá trị này được job đánh giá và phép quét xếp hạng lại dưới đây tính độc lập với nhau, qua đó kiểm chéo cả hai cách hiện thực.

## Thiên lệch độ phổ biến và độ phủ {#sec:res-coverage}

Đặc tả chấp nhận độ phủ dưới 10 % là kết quả hợp lệ *nếu có phân tích*: phải giải thích được nguyên nhân và thử ít nhất một phương pháp giảm thiên lệch. Mục này đáp ứng cả hai.

**Độ phủ thấp không phải là giới hạn cấu trúc.** Mười gợi ý cho mỗi người trong 9.467 người dùng kiểm tra cho 94.670 ô trên 126.230 sản phẩm, nên trần cấu trúc của độ phủ là 75 %. ALS chỉ dùng 4.346 sản phẩm khác nhau: số ô có đủ, nhưng chúng bị lấp bằng cùng những sản phẩm.

**Đó là thiên lệch độ phổ biến.** @fig:pho-bien cho thấy các ô gợi ý phân bố thế nào trên các nhóm độ phổ biến. ALS đặt **99,2 %** số ô vào N1, nhóm 10 % sản phẩm phổ biến nhất; danh sách bán chạy toàn sàn theo cách xây dựng đặt 100 % vào đó, và ngay cả baseline theo danh mục cũng đặt 86,5 %. Đây là hành vi điển hình của phân rã ma trận trên dữ liệu thưa: sản phẩm có ít tương tác nhận vector ẩn yếu (gần không), nên điểm của chúng hiếm khi lọt vào top 10 của một người dùng.

![Phân bố các ô gợi ý trên các nhóm độ phổ biến (N1 = 10 % sản phẩm phổ biến nhất)](hinh/c03_pho_bien.png){#fig:pho-bien w=15.5}

**Giảm thiên lệch bằng xếp hạng lại theo độ mới lạ.** Phép xếp hạng lại của @eq:rerank được quét theo β và theo kích thước tập ứng viên, trên cùng mô hình và cùng phiên bản đặc trưng (`jobs/kiem_tra/thu_xep_lai.py`). @tab:xep-lai và @fig:xep-lai trình bày kết quả.

Table: Quét tham số xếp hạng lại theo độ mới lạ (cùng mô hình và đặc trưng) {#tab:xep-lai w=10,10,10,10,11,10,12,12,15}
| Ứng viên | β | P@10 | R@10 | NDCG@10 | MAP@10 | Độ phủ | Số sản phẩm khác nhau | Tỉ lệ ô thuộc N1 |
|---|---|---|---|---|---|---|---|---|
| 50 | 0 (ALS thuần) | 0,0161 | 0,0921 | 0,0680 | 0,0531 | 3,44 % | 4.346 | 99,2 % |
| 50 | 0,3 | 0,0173 | 0,1001 | 0,0746 | 0,0589 | 4,14 % | 5.221 | 98,3 % |
| 50 | 0,5 | 0,0179 | 0,1037 | 0,0797 | 0,0642 | 4,65 % | 5.875 | 97,4 % |
| 50 | 1,0 | 0,0180 | 0,1067 | 0,0854 | 0,0709 | 5,67 % | 7.152 | 94,7 % |
| 50 | 2,0 | 0,0148 | 0,0892 | 0,0683 | 0,0557 | 6,30 % | 7.950 | 92,7 % |
| 200 | 0,5 | 0,0178 | 0,1037 | 0,0789 | 0,0633 | 4,74 % | 5.977 | 96,0 % |
| **200** | **1,0** | **0,0182** | **0,1089** | **0,0865** | **0,0716** | **6,47 %** | **8.162** | **80,8 %** |
| 200 | 2,0 | 0,0118 | 0,0753 | 0,0518 | 0,0402 | 7,21 % | 9.099 | 47,5 % |

![Đánh đổi giữa độ chính xác và độ phủ của phép xếp hạng lại theo độ mới lạ](hinh/c04_xep_lai.png){#fig:xep-lai w=13}

- **Đến β = 1,0, xếp hạng lại cải thiện đồng thời độ chính xác và độ đa dạng.** Với 200 ứng viên và β = 1,0, NDCG@10 tăng 27 %, độ phủ tăng 88 %, và tỉ lệ ô thuộc N1 giảm từ 99,2 % xuống 80,8 % (N2 11,2 %, N3 4,3 %, N4 2,0 %, N5–N10 1,9 %). Tháng kiểm tra của RetailRocket chứa nhiều sản phẩm hiếm gặp trong tập huấn luyện, nên đẩy các ứng viên ít phổ biến lên làm danh sách vừa đa dạng hơn vừa chính xác hơn.
- **Vượt quá mức đó, đánh đổi quen thuộc xuất hiện.** Ở β = 2,0 danh sách đa dạng hơn nhiều (N1 47,5 %, độ phủ 7,21 %) nhưng NDCG giảm 24 % so với ALS thuần, dù vẫn trên cả hai baseline.
- **Tập ứng viên lớn hơn chỉ có ích khi β đủ mạnh.** Với β nhỏ, các sản phẩm ngoài top 50 không bao giờ được đẩy lên; từ β = 1,0, tập 200 ứng viên cho kết quả tốt hơn rõ rệt.
- **Không cấu hình nào đạt độ phủ 10 %** (tối đa 7,21 %). Phần lớn trong 126.230 sản phẩm huấn luyện chỉ có một hai tương tác; vector của chúng gần không và chúng không bao giờ vào top 200 của bất kỳ người dùng nào. Vượt 10 % đòi hỏi những nguồn ứng viên khác ngoài ALS: ứng viên theo danh mục (riêng baseline theo danh mục đã đạt 5,28 %), sản phẩm mới (đã được bước trộn dành 20 % số ô hiển thị), hoặc một lưới lớn hơn (độ phủ tăng theo rank và alpha). @sec:res-nguon thử ý tưởng đầu tiên ở chế độ offline: ba ô đồng xuất hiện đạt 14,5 %.
- β và kích thước tập ứng viên được chọn trên tháng kiểm tra. @sec:res-val chọn lại β trên một kỳ validation riêng và thu được cùng giá trị β = 1,0; kích thước tập ứng viên chưa được xem xét lại.

**Độ phủ của các danh sách thực sự được phục vụ.** Độ phủ nêu trên là của các danh sách ALS top-10 cho 9.467 người dùng kiểm tra. Đo trên toàn bộ `gold.goi_y_nguoi_dung` sau khi triển khai cấu hình xếp hạng lại (mọi người dùng, cả hai mươi vị trí, mọi nguồn), hệ thống hiển thị 15.582 sản phẩm khác nhau (@tab:phu-phuc-vu), tức **12,3 %** sản phẩm huấn luyện (3,7 % danh mục). Con số này vượt 10 % nhưng đo một thứ khác: độ phủ của toàn hệ thống kể cả các khối không cá nhân hóa, chứ không phải độ phủ của mô hình mà ngưỡng của đặc tả nhắm tới. Vì vậy báo cáo nêu cả hai và không khẳng định ngưỡng của mô hình đã đạt. Tại thời điểm đo, luồng thịnh hành chưa được khởi động, nên các ô thịnh hành dùng danh sách dự phòng gồm 19 sản phẩm được xem nhiều nhất trong 24 giờ cuối; với cửa sổ thịnh hành trực tiếp, khối này thay đổi sau vài phút.

Table: Số sản phẩm khác nhau trong bảng gợi ý đang phục vụ, theo nguồn {#tab:phu-phuc-vu w=50,25,25}
| Nguồn | Số ô | Số sản phẩm khác nhau |
|---|---|---|
| Thịnh hành (dự phòng: xem nhiều nhất trong 24 giờ) | 2.599.964 | 19 |
| Bán chạy theo danh mục (người dùng ít tương tác) | 2.577.372 | 9.927 |
| ALS đã xếp hạng lại (8.592 người dùng hoạt động) | 123.524 | 8.612 |
| **Tổng (265.043 người dùng, 5.300.860 dòng)** | | **15.582** |

## Phân tích lỗi: khi nào ALS thua baseline {#sec:res-loi}

Trên toàn tập kiểm tra, ALS hơn cả hai baseline ở bốn chỉ số xếp hạng (@tab:phuong-phap). Có ba chỗ ALS kém hơn hoặc không áp dụng được.

**Độ phủ và độ mới lạ.** Baseline 2 (bán chạy trong danh mục người dùng xem nhiều nhất) có độ phủ 5,28 % và độ mới lạ 11,88, đều cao hơn ALS thuần (3,44 %; 10,86). Nguyên nhân là ALS phản hồi ngầm với alpha = 40 dồn 99,2 % số ô vào 10 % sản phẩm phổ biến nhất (@fig:pho-bien). Baseline 2 thì mặc nhiên trải gợi ý ra mọi danh mục mà người dùng đã xem. Xếp hạng lại theo độ mới lạ (@sec:res-coverage) đảo được thứ tự này: bản đang phục vụ đạt độ phủ 6,47 %, vượt baseline 2.

**Theo nhóm người dùng.** `jobs/kiem_tra/phan_tich_loi.py` tính NDCG@10 của từng người trong 9.467 người dùng kiểm tra cho ALS và hai baseline. Kết quả được gom theo ba trục:

- số tương tác trong train (3–4, 5–9, 10–19, 20–49, ≥ 50);
- mức phổ biến của các sản phẩm mà người dùng thật sự tương tác trong tháng kiểm tra;
- số danh mục người dùng đã xem.

Mỗi nhóm ghi tỷ lệ người dùng mà ALS thua baseline 2. Giả thuyết cần kiểm tra:

- ALS yếu ở người dùng ít tương tác, vì nhân tố ẩn của họ học từ rất ít dữ liệu.
- ALS yếu ở người dùng chỉ xem một danh mục, nơi baseline 2 vốn đã gần đúng.
- Khi sản phẩm cần đoán nằm ở đuôi dài, cả ba phương pháp đều gần 0.

Job chạy trên cụm ngày 16/11 cho mô hình `r20261111T190002` trên `features.ma_tran_tuong_tac` phiên bản 4 (`docs/bang_chung/cum/phan_tich_loi.json`). Kết quả ở @tab:phan-tich-loi và @fig:phan-tich-loi. "Phổ biến" nghĩa là thuộc 10 % sản phẩm có nhiều người tương tác nhất trong train.

Table: NDCG@10 theo nhóm người dùng; "thua" và "thắng" là tỷ lệ người dùng có NDCG của ALS thấp hơn hoặc cao hơn baseline 2 {#tab:phan-tich-loi w=24,10,11,11,11,11,11,11}
| Nhóm | Người dùng | ALS | Baseline 1 | Baseline 2 | ALS thua | ALS thắng | Cả hai = 0 |
|---|---|---|---|---|---|---|---|
| **Tất cả** | 9.467 | 0,0680 | 0,0051 | 0,0475 | 3,9 % | 9,0 % | 84,8 % |
| *Số tương tác train:* 3–4 | 6.401 | 0,0727 | 0,0043 | 0,0504 | 3,4 % | 8,5 % | 85,7 % |
| 5–9 | 1.945 | 0,0538 | 0,0040 | 0,0373 | 3,8 % | 7,7 % | 86,5 % |
| 10–19 | 680 | 0,0718 | 0,0093 | 0,0537 | 6,5 % | 12,9 % | 78,1 % |
| 20–49 | 315 | 0,0542 | 0,0049 | 0,0382 | 7,0 % | 11,4 % | 80,6 % |
| ≥ 50 | 126 | 0,0644 | 0,0389 | 0,0499 | 13,5 % | 27,8 % | 57,9 % |
| *SP kiểm tra:* đuôi dài (0 % phổ biến) | 3.865 | 0,0123 | 0,0000 | 0,0080 | 1,3 % | 1,9 % | 96,6 % |
| trộn | 541 | 0,0369 | 0,0021 | 0,0241 | 7,0 % | 13,9 % | 78,7 % |
| đầu (≥ 50 % phổ biến) | 5.061 | 0,1139 | 0,0093 | 0,0802 | 5,6 % | 13,9 % | 76,4 % |
| *Danh mục đã xem:* 1 | 2.823 | 0,1228 | 0,0060 | 0,0882 | 5,2 % | 14,1 % | 76,7 % |
| 2–3 | 4.287 | 0,0460 | 0,0038 | 0,0323 | 3,3 % | 6,2 % | 88,9 % |
| 4–7 | 1.743 | 0,0368 | 0,0040 | 0,0252 | 2,8 % | 5,7 % | 90,1 % |
| ≥ 8 | 492 | 0,0531 | 0,0160 | 0,0380 | 7,1 % | 15,0 % | 76,2 % |

![NDCG@10 của ALS và hai baseline theo (a) số tương tác train, (b) độ phổ biến của sản phẩm kiểm tra, (c) số danh mục đã xem](hinh/c09_phan_tich_loi.png){#fig:phan-tich-loi w=16}

Kết luận về ba giả thuyết:

- **Giả thuyết 1 sai.** ALS không thua ở người dùng ít tương tác. Nhóm 3–4 tương tác chiếm 68 % người dùng kiểm tra, và ở đó ALS hơn baseline 2 tới 44 %. Ở mọi nhóm số tương tác, ALS đều hơn baseline 2 khoảng 30–45 %. Tỷ lệ "ALS thua" tăng theo số tương tác (3,4 % lên 13,5 %), nhưng tỷ lệ "ALS thắng" tăng nhanh hơn (8,5 % lên 27,8 %): người dùng nhiều tương tác chỉ đơn giản là ít bị cả hai cùng bằng 0.
- **Giả thuyết 2 sai.** Người dùng chỉ xem một danh mục là trường hợp *dễ nhất* cho cả hai phương pháp: NDCG 0,1228 so với 0,0882, ALS hơn 39 %. Khó nhất là người dùng trải trên 2–7 danh mục: NDCG giảm còn 0,037–0,046 vì sở thích bị chia nhỏ.
- **Giả thuyết 3 đúng, và là nguồn lỗi chính.** 3.865 người dùng (41 %) chỉ tương tác với sản phẩm đuôi dài trong tháng kiểm tra. Ở nhóm này NDCG của ALS chỉ bằng 1/9 nhóm "đầu", và 96,6 % người dùng nhận 0 từ cả hai phương pháp. Kết quả này khớp với thiên lệch độ phổ biến ở @sec:res-coverage, khi ALS dồn 99,2 % số ô vào 10 % sản phẩm phổ biến nhất.

Tổng thể, ALS hơn baseline 2 ở **mọi** nhóm con, nên lợi thế của ALS không đến từ một nhóm đặc biệt. Giới hạn chính là độ thưa: 84,8 % người dùng kiểm tra nhận NDCG bằng 0 với cả hai phương pháp. Hướng cải thiện vì vậy là nguồn ứng viên cho đuôi dài (đồng xuất hiện, nội dung, @sec:res-coverage) chứ không phải tinh chỉnh thêm ALS.

**Người dùng mới và sản phẩm mới.** ALS không chấm điểm được người dùng hay sản phẩm không có trong train. Đó là giới hạn cấu trúc của phân rã ma trận, và hệ thống xử lý bằng ba chiến lược khởi đầu lạnh (@tab:cold-start).

## Mô hình phiên bản 2 (lọc theo khoảng giá) {#sec:res-v2}

Tiến hóa lược đồ chạy ngày 10 tháng 11 lúc 23:12–23:18: `silver.tuong_tac` chuyển từ phiên bản 0 lên phiên bản 2 (phiên bản 1 thêm hai cột, phiên bản 2 điền dữ liệu), trong khi phiên bản 0 vẫn đọc được với bảy cột ban đầu. DAG hằng ngày khởi động lúc 23:21 đã dựng lại đặc trưng từ bảng silver đã tiến hóa, điều này chuyển phần đánh giá sang mô hình phiên bản 2 với lưới chín tổ hợp.

Lượt chạy đêm đó giữ danh sách cũ vì lưới của nó không thể chứa cấu hình đang phục vụ (sự cố 23, @sec:issues). Bản sửa đến máy master lúc 03:50 ngày 11 tháng 11, và hai lượt chạy kế tiếp của DAG 1 đều triển khai mô hình phiên bản 2:

- **Lượt chạy theo lịch lúc 02:00** chờ ở sensor, và sensor thấy dữ liệu mới lúc 05:22: các cú nhấp của phép đo vòng khép kín (@sec:res-streaming) đã được ghi vào bronze. Sau đó toàn bộ pipeline chạy mà không cần can thiệp (làm sạch, ma trận, tinh chỉnh, đánh giá), và `ghi_gold` công bố mô hình phiên bản 2 lúc 06:07 (lượt chạy `r20261110T222242`, đặc trưng phiên bản 2). Như vậy một cú nhấp trên trang web đã đi qua cả hai đường của kiến trúc: đường luồng trong vòng một phút và đường theo lô vào một mô hình mới.
- **Một lượt chạy thủ công** (`bo_qua_cho_du_lieu`, xếp hàng lúc 04:05 sau lượt chạy theo lịch vì `max_active_runs = 1`) bắt đầu lúc 06:09 và kết thúc lúc 06:52 (lượt chạy `r20261110T230924`). Lượt này dựng lại đặc trưng từ silver phiên bản 10 (đặc trưng phiên bản 3), tinh chỉnh mười tổ hợp trong 20,7 phút (chín tổ hợp của lưới tối thiểu cộng với cấu hình đang phục vụ) và đánh giá tổ hợp tốt nhất, rank 50, regParam 1,0, alpha 40, với mô hình phiên bản 2. NDCG@10 = 0,0680 bằng mô hình đang phục vụ, nên `cai_thien` là đúng và danh sách được công bố lại với tên `als_v2_r20261110T230924`. @tab:v2 báo cáo lượt chạy này, lượt chạy mới nhất.

Table: Mô hình phiên bản 2 so với ALS thường trên cùng mô hình và phiên bản đặc trưng (lượt chạy r20261110T230924, 9.467 người dùng kiểm tra) {#tab:v2 w=24,8,8,12,11,10,10,17}
| Phương pháp | P@10 | R@10 | NDCG@10 | MAP@10 | Độ phủ | Độ mới lạ | Số SP khác nhau |
|---|---|---|---|---|---|---|---|
| ALS (thứ hạng của phiên bản 1) | 0,0161 | 0,0921 | 0,0680 | 0,0531 | 3,44 % | 10,86 | 4.346 |
| **Mô hình v2: ALS + lọc khoảng giá** | **0,0165** | **0,0943** | **0,0694** | **0,0541** | **3,72 %** | **10,91** | **4.699** |
| Thay đổi tương đối | +2,5 % | +2,4 % | +2,1 % | +1,9 % | +8,1 % | +0,4 % | +8,1 % |

- **Cổng triển khai hoạt động.** Khi cấu hình đang phục vụ có trong lưới, mô hình mới được so với mô hình cũ ở cùng siêu tham số, và pipeline hằng đêm có thể công bố trở lại. Tổ hợp được thêm vào là tốt nhất trong mười; chín tổ hợp alpha = 10 tái tạo đúng giá trị của đêm trước đến bốn chữ số thập phân (tốt nhất 0,0574).
- **Cùng dữ liệu, cùng mô hình.** Đặc trưng phiên bản 3 được dựng vào sáng hôm sau, khoảng 22 giờ sau phiên bản 0, từ một bảng silver đã qua tiến hóa lược đồ và một lần phát lại thứ hai gồm 857.072 sự kiện, vậy mà ALS thường cho đúng các con số của lượt chạy `r20261110T075240` (@tab:phuong-phap): 179.999 người dùng huấn luyện, 9.467 người dùng kiểm tra và NDCG@10 = 0,0680. Sự kiện phát lại bị loại bởi bước khử trùng lặp theo nội dung và sự kiện web bị loại khỏi ma trận, nên ma trận và phép chia không đổi và ALS có hạt giống cố định khớp ra cùng một mô hình; đây là một xác nhận độc lập về khả năng tái lập qua các phiên bản bảng, bổ sung cho kiểm thử time travel ở @sec:res-repro.
- **Bộ lọc giá giúp một chút.** Loại các ứng viên ngoài khoảng giá của người dùng và đẩy các sản phẩm trong khoảng giá kế tiếp lên làm mọi chỉ số độ chính xác tăng khoảng 2 % và độ phủ tăng 8 %, cùng mức tăng như trên mô hình alpha = 10 của đêm trước (+2,3 %). Tác dụng này nhỏ hơn một bậc so với xếp hạng lại theo độ mới lạ (+27 %), chưa được kiểm định ý nghĩa thống kê, và không thay đổi thiên lệch độ phổ biến (99,1 % số ô thuộc N1 so với 99,2 %).
- **Những gì được phục vụ.** Trong vận hành, mô hình phiên bản 2 là danh sách đã xếp hạng lại (200 ứng viên, β = 1,0, giữ bốn mươi sản phẩm) rồi qua bộ lọc giá trong `tron_goi_y`. Phần đánh giá đo bộ lọc trên danh sách ALS thường, và quy tắc triển khai tiếp tục so sánh ALS thường để các phiên bản kế tiếp nhau vẫn so được với nhau; tổ hợp xếp hạng lại cộng bộ lọc giá chưa được đo riêng.

Màn hình chất lượng mô hình của ứng dụng web (@fig:mo-hinh-web) cho thấy trạng thái sau triển khai: mô hình mới nhất và các chỉ số của nó, cùng lịch sử năm lần đánh giá ghi trong `gold.lich_su_huan_luyen`: lượt chạy đầu tiên và lần đánh giá lại với cấu hình phục vụ đã xếp hạng lại, lượt chạy đêm giữ mô hình cũ (`r20261110T162756`, NDCG@10 = 0,0574), và hai lượt chạy ngày 11 tháng 11 đã triển khai phiên bản 2.

![Màn hình chất lượng mô hình sau khi triển khai mô hình phiên bản 2: chỉ số của mọi phương pháp và lịch sử năm lần đánh giá (giờ UTC)](hinh/s04_mo_hinh_web.png){#fig:mo-hinh-web w=12.5}

**Bảng phục vụ sau triển khai.** Cả hai lần triển khai đều trộn danh sách khi producer đang dừng, nên cửa sổ thịnh hành mới nhất chỉ chứa sản phẩm thử nghiệm: mỗi danh sách lưu nhận một sản phẩm thịnh hành và các ô thịnh hành còn lại quay về sản phẩm bán chạy theo danh mục, khiến số sản phẩm khác nhau của bảng tăng vọt lên 22.011 (sự cố 29). Sau khi sửa, `tron_goi_y` và `ghi_gold` được chạy lại cho cùng mô hình lúc 10:15 (gold phiên bản 14; 5.264.440 dòng được cập nhật, 36.176 dòng được chèn). @tab:phu-phuc-vu-v2 so kết quả với bảng phiên bản 1 ở @tab:phu-phuc-vu: bộ lọc giá, áp dụng trên bốn mươi ứng viên đã xếp hạng lại, đưa thêm 7 % sản phẩm khác nhau vào các ô ALS, và toàn bảng phủ 16.001 sản phẩm, tức 12,7 % sản phẩm huấn luyện (3,8 % danh mục).

Table: Số sản phẩm khác nhau trong bảng phục vụ, phiên bản 1 (10 tháng 11) và phiên bản 2 (11 tháng 11) {#tab:phu-phuc-vu-v2 w=40,15,15,15,15}
| Nguồn | Số ô v1 | Số SP v1 | Số ô v2 | Số SP v2 |
|---|---|---|---|---|
| Thịnh hành (chủ yếu là xem nhiều nhất 24 giờ) | 2.599.964 | 19 | 2.600.580 | 19 |
| Bán chạy theo danh mục | 2.577.372 | 9.927 | 2.577.743 | 9.821 |
| ALS (8.592 người dùng hoạt động) | 123.524 | 8.612 | 122.293 | 9.237 |
| **Tổng (265.043 người dùng)** | **5.300.860** | **15.582** | **5.300.616** | **16.001** |

## Thử nghiệm A/B {#sec:res-ab}

**Một kiểm định đầu tiên thiếu độ mạnh.** Phép mô phỏng mặc định của lượt chạy đầu (5.000 người dùng lấy theo thứ tự băm, bảy ngày) chỉ tạo ra khoảng 3.000 lượt hiển thị ALS mỗi nhóm, vì chỉ khoảng 3 % người dùng có gợi ý ALS và kiểm định chỉ đếm lượt hiển thị ALS. Kiểm định gộp cho p = 0,77: mẫu nhỏ hơn khoảng 25 lần so với mức cần để phát hiện chênh lệch tương đối 10 %.

**Phép mô phỏng đầy đủ.** Phép mô phỏng được chạy lại cho toàn bộ 8.592 người dùng có danh sách ALS (tùy chọn `--chi-als`, hạt giống 7): 343.680 lượt hiển thị và 7.008 lượt nhấp trong bảy ngày. @tab:ab và @fig:ab trình bày kết quả gộp trên toàn bộ thời kỳ (Change Data Feed đến phiên bản dữ liệu 2), phân tích chính được định nghĩa trước khi nhìn dữ liệu.

Table: Kết quả A/B gộp trong bảy ngày (lưu lượng mô phỏng, không ưu đãi sản phẩm thịnh hành) {#tab:ab w=24,14,9,10,12,13,18}
| Nhóm | Lượt hiển thị | Lượt nhấp | CTR | Lượt mua | Chuyển đổi | p-value |
|---|---|---|---|---|---|---|
| A: chỉ ALS | 175.960 | 3.685 | 2,094 % | 412 | 0,234 % | CTR 0,015 |
| B: ALS + 30 % thịnh hành | 174.200 | 3.446 | 1,978 % | 417 | 0,239 % | chuyển đổi 0,75 |

![CTR và tỉ lệ chuyển đổi theo nhóm với khoảng tin cậy 95 %](hinh/c06_ab.png){#fig:ab w=14}

- **CTR:** z = −2,43, **p = 0,015**. Nhóm B có CTR thấp hơn nhóm A khoảng 5,5 % (tương đối), một chênh lệch có ý nghĩa ở mức 5 %. Cỡ mẫu cần để phát hiện mức tăng tương đối 10 % là 76.972 lượt hiển thị mỗi nhóm, nên mẫu là đủ.
- **Chuyển đổi:** p = 0,75; không thể khẳng định có khác biệt.
- **Các kiểm định theo ngày đều không có ý nghĩa** (p từ 0,07 đến 0,85): mỗi ngày có khoảng 25.000 lượt hiển thị mỗi nhóm, trong khi phát hiện chênh lệch 5,5 % cần khoảng 250.000. Biểu đồ theo ngày trên bảng điều khiển chỉ để theo dõi; rút kết luận từ nó sẽ là "nhìn trộm" và kiểm định bội.
- **Diễn giải.** Trong mô phỏng, xác suất nhấp phụ thuộc vào việc sản phẩm có thuộc những sản phẩm người dùng thực sự đã tương tác trong tháng kiểm tra hay không, và sản phẩm thịnh hành không được ưu đãi. Vì vậy thay 30 % ô ALS cá nhân hóa bằng sản phẩm thịnh hành chung chung (trong lượt chạy này là danh sách dự phòng, vì luồng thịnh hành chưa khởi động) làm giảm số ô phù hợp, và B thua A. Kết luận chỉ đúng trong các giả định của mô phỏng (100 % lưu lượng là mô phỏng và được gắn nhãn như vậy) và không phải bằng chứng về người mua thật. Một phân tích độ nhạy cho sản phẩm thịnh hành một mức ưu đãi về độ hấp dẫn (`--tang-thinh-hanh`) sẽ tìm ra mức mà tại đó B hòa A.
- **Đơn vị phân tích.** Các lượt hiển thị của cùng một người dùng tương quan với nhau, nên kiểm định z ở mức lượt hiển thị có thể cho p-value nhỏ hơn thực tế. Kiểm định z được giữ làm phân tích chính vì đặc tả yêu cầu, và @sec:res-ab-user lặp lại kiểm định với đơn vị là người dùng: kết luận vẫn giữ (p = 0,037 với sai số chuẩn bền vững theo cụm, p = 0,029 với bootstrap theo người dùng).
- Các con số này được đo trên danh sách trước khi triển khai xếp hạng lại (phiên bản 1 của bảng gợi ý).

Bảng điều khiển A/B của ứng dụng web đọc `gold.ket_qua_ab` và hiển thị kết quả gộp, kết luận và cỡ mẫu cần thiết, cùng tỉ lệ lưu lượng mô phỏng của từng nhóm và các đường CTR theo ngày (@fig:ab-web). Ảnh chụp được lấy ngày 11 tháng 11, sau khi việc chụp ảnh hệ thống đang chạy đã ghi 230 lượt hiển thị thật của người dùng ALS (180 ở nhóm A với 7 lượt nhấp, 50 ở nhóm B với 1 lượt nhấp). Vì vậy bảng điều khiển gộp tám ngày (176.140 so với 174.250 lượt hiển thị, p = 0,0135), trong khi phân tích chính ở @tab:ab giữ bảy ngày mô phỏng đến phiên bản dữ liệu 2 (p = 0,015); bước nhảy của nhóm A ngày 11 tháng 11 là nhiễu từ 180 lượt hiển thị. Trong bảy ngày mô phỏng, nhóm B nằm dưới nhóm A mọi ngày (từ 0,02 đến 0,22 điểm phần trăm), nhất quán với kiểm định gộp dù không ngày nào tự nó có ý nghĩa.

![Bảng điều khiển A/B của ứng dụng web ngày 11 tháng 11: kết quả gộp với p-value và kết luận (trên) và CTR theo ngày, gồm cả ngày đầu có lượt hiển thị web thật (dưới)](hinh/s03_ab_web.png){#fig:ab-web w=15}

## OPTIMIZE và Z-ORDER {#sec:res-zorder}

Truy vấn tra cứu theo người dùng `WHERE ma_nguoi_dung = ?` là truy vấn nóng của ứng dụng web. @tab:zorder và @fig:zorder trình bày phép đo ba pha trên bảng gợi ý 5,3 triệu dòng (30 lần tra cứu mỗi pha).

Table: Tra cứu theo người dùng trên gold.goi_y_nguoi_dung trước và sau tối ưu {#tab:zorder w=30,12,16,14,14,14}
| Pha | Số tệp của bảng | Số tệp đọc mỗi truy vấn | Trung bình (ms) | Trung vị (ms) | p95 (ms) |
|---|---|---|---|---|---|
| Phân mảnh (mô phỏng nhiều ngày MERGE) | 200 | 200 | 10.868 | 10.793 | 13.420 |
| Chỉ OPTIMIZE (nén, đích 1 MB) | 67 | 67 | 7.789 | 8.280 | 9.524 |
| OPTIMIZE ZORDER BY (ma_nguoi_dung) | 55 | 1,07 | 999 | 980 | 1.387 |

![Độ trễ và số tệp phải đọc cho mỗi lần tra cứu một người dùng ở ba pha](hinh/c05_zorder.png){#fig:zorder w=14}

Chỉ nén tệp gần như không giúp gì: mỗi tệp đã nén vẫn chứa người dùng thuộc toàn bộ dải mã, nên thống kê min/max của mọi tệp phủ gần trọn miền giá trị và data skipping không loại được tệp nào. Z-ORDER đặt các dòng của cùng một người dùng cạnh nhau, thu hẹp khoảng min/max của mỗi tệp, và cho phép Delta bỏ qua tất cả trừ khoảng một tệp cho mỗi lần tra cứu. Độ trễ trung vị giảm từ 8.280 ms xuống 980 ms, **nhanh hơn 8,4 lần so với chỉ nén** và 11 lần so với bảng phân mảnh. Độ trễ tuyệt đối trên cụm thay đổi theo tải và theo Wi-Fi, nhưng số tệp phải đọc thì không, nên đó là con số đáng tin hơn. Kết quả này chỉ đúng khi tệp đủ nhỏ: thí nghiệm giới hạn 1 MB mỗi tệp, còn OPTIMIZE hằng đêm của DAG 4 ban đầu dùng mặc định 1 GB và gộp cả bảng thành một tệp, làm mất tác dụng của Z-ORDER. Lỗi này được phát hiện và sửa ngày 16/11 (@sec:res-web).

## Khả năng tái lập {#sec:res-repro}

DAG 5 được kích hoạt ngày 10 tháng 11 lúc 23:13 với cấu hình `{"phien_ban_delta": 0, "che_do": "mo_hinh_chon"}`. DAG đọc `features.ma_tran_tuong_tac` ở phiên bản 0 (phiên bản dựng cho lượt chạy `r20261110T075240`), huấn luyện lại mô hình đã chọn với các siêu tham số đã ghi, đánh giá lại trên tập kiểm tra lưu trong cùng phiên bản và so kết quả với `gold.ket_qua_tuning` và `gold.lich_su_huan_luyen` (@tab:tai-lap).

Table: Tái lập bằng time travel: lượt chạy r20261110T075240 ngày 10 tháng 11 và mô hình đang triển khai r20261110T230924 ngày 11 tháng 11 {#tab:tai-lap w=30,34,12,12,12}
| So sánh | Khóa | Phiên bản Delta | Độ lệch lớn nhất | Khớp |
|---|---|---|---|---|
| Dòng tinh chỉnh | r20261110T075240, rank 50, reg 1,0, alpha 40 | 0 | 0,000000 | có |
| Huấn luyện và đánh giá | r20261110T075240 | 0 | 0,000000 | có |
| Dòng tinh chỉnh (11/11) | r20261110T230924, rank 50, reg 1,0, alpha 40 | 3 | 0,000000 | có |
| Huấn luyện và đánh giá, gồm bộ lọc v2 và cả hai baseline (11/11) | r20261110T230924 | 3 | 0,000000 | có |

Độ lệch bằng không đến sáu chữ số thập phân (dung sai 10^{−6}). Đây là một kiểm thử có ý nghĩa: trong lúc tái lập chạy, `silver.tuong_tac` đã lên phiên bản 2 qua tiến hóa lược đồ và bronze đã nhận thêm 857.000 sự kiện phát lại. Kết quả giống hệt vì job chỉ đọc phiên bản 0 của bảng đặc trưng, phiên bản chứa cả dữ liệu huấn luyện lẫn tập đáp án (@sec:impl-train), vì ALS dùng hạt giống cố định, và vì các indexer chỉ thêm nhãn bảo đảm chỉ số luôn ứng với cùng người dùng và sản phẩm ở mọi phiên bản.

Ngày 11 tháng 11, sau các thí nghiệm bổ sung, DAG 5 được kích hoạt lần thứ hai (từ nút *Trigger kn_tai_lap* của ứng dụng web, nút này gọi REST API của Airflow) cho mô hình thực sự đang triển khai, `als_v2_r20261110T230924` trên phiên bản đặc trưng 3. Lượt chạy mất khoảng 20 phút. Cả hai phép so sánh đều khớp với độ lệch đúng bằng 0, kể cả không làm tròn, và lần này phép so sánh bao gồm NDCG@10 của mô hình phiên bản 2 (bộ lọc giá) và của hai baseline. Như vậy bảo đảm của time travel đúng cho cả mô hình đang phục vụ lẫn thí nghiệm đầu tiên.

Màn hình tái lập của ứng dụng web đọc cùng bảng này (@fig:tai-lap-web; ảnh chụp trước lần chạy thứ hai). Màn hình hiển thị độ lệch lớn nhất không làm tròn: đúng bằng 0 cho dòng huấn luyện và 1,78 × 10^{−15} cho dòng tinh chỉnh, một khác biệt ở những bit cuối của một tổng số thực dấu phẩy động mà dung sai 10^{−6} được thiết kế để hấp thụ.

![Màn hình tái lập của ứng dụng web: các kết quả A/B có thể tính lại tại phiên bản dữ liệu đã ghi (trên) và hai phép so sánh của DAG 5 trên phiên bản đặc trưng 0 (dưới)](hinh/s02_tai_lap_web.png){#fig:tai-lap-web w=14.5}

## Các thí nghiệm bổ sung {#sec:res-extra}

Ba hạn chế của giao thức đánh giá được nêu ra trong lúc chuẩn bị bảo vệ: thử nghiệm A/B coi các lượt hiển thị là độc lập, siêu tham số và trọng số xếp hạng lại được chọn trên tháng kiểm tra, và mọi ứng viên của danh sách phục vụ đều đến từ ALS. Ngày 11 tháng 11, ba job chỉ đọc đã giải quyết các hạn chế này. Không job nào ghi bảng hay thay đổi hệ thống đang phục vụ, và tất cả đều đọc cùng các phiên bản Delta với kết quả chính (đặc trưng phiên bản 3, silver phiên bản 10, nhật ký hiển thị phiên bản 51).

### Kiểm định kết quả A/B theo đơn vị người dùng {#sec:res-ab-user}

`kiem_tra/bootstrap_ab.py` tổng hợp nhật ký hiển thị theo người dùng (cùng bộ lọc với bảng điều khiển: chỉ chiến lược ALS, chỉ lưu lượng mô phỏng) và lặp lại kiểm định với đơn vị là người dùng, theo hai cách: kiểm định z với sai số chuẩn bền vững theo cụm (phương pháp delta cho tỉ số của hai tổng, kèm hiệu chỉnh m/(m − 1)), và bootstrap lấy mẫu lại người dùng có hoàn lại trong mỗi nhóm 2.000 lần với hạt giống cố định. Hệ số thiết kế là tỉ số giữa phương sai bền vững theo cụm và phương sai nhị thức của kiểm định ở mức lượt hiển thị.

Table: Kết quả A/B với đơn vị là người dùng (8.592 người dùng mô phỏng, 350.160 lượt hiển thị) {#tab:ab-user w=20,16,16,16,32}
| Chỉ số | p mức lượt hiển thị | p bền vững theo cụm | p bootstrap theo người dùng | KTC 95 % bootstrap của chênh lệch tương đối B so với A; hệ số thiết kế |
|---|---|---|---|---|
| CTR (A 2,094 %, B 1,978 %, −5,5 %) | 0,015 | **0,037** | **0,029** | [−10,5 % ; −0,7 %]; 1,36 |
| Chuyển đổi (A 0,234 %, B 0,239 %) | 0,75 | 0,76 | 0,75 | [−10,6 % ; +17,4 %]; 1,05 |

Mỗi nhóm có khoảng 4.300 người dùng, mỗi người khoảng 41 lượt hiển thị. Hệ số thiết kế 1,36 của CTR nghĩa là kiểm định ở mức lượt hiển thị đánh giá thấp sai số chuẩn khoảng 17 % (√1,36 ≈ 1,17): trong mô phỏng, một người dùng có danh sách chứa sản phẩm thuộc chính tháng kiểm tra của họ sẽ nhấp ở mọi phiên, nên các lượt nhấp của một người dùng tương quan với nhau. Hiệu chỉnh này nâng p-value từ 0,015 lên 0,03–0,04, nhưng kết luận ở mức 5 % không đổi, và khoảng bootstrap của chênh lệch tương đối không chứa số không. Tỉ lệ chuyển đổi không có tương quan đáng kể (hệ số thiết kế 1,05) và không có khác biệt dưới cả ba kiểm định. Câu trả lời cho câu hỏi "B có làm giảm CTR không?" vì vậy giữ nguyên với đơn vị phân tích chặt chẽ hơn, vẫn trong các giả định của mô phỏng.

### Siêu tham số chọn trên một kỳ validation {#sec:res-val}

`kiem_tra/tuning_validation.py` lặp lại việc chọn với một giao thức sạch. Dữ liệu huấn luyện, hạt giống và maxIter là của mô hình đang triển khai (đặc trưng phiên bản 3, dựng từ silver phiên bản 10). Tháng kiểm tra (19 tháng 8 – 18 tháng 9 năm 2015) được chia theo ngày: 15 ngày đầu (19 tháng 8 – 2 tháng 9) tạo thành **kỳ validation** chỉ dùng để chọn, và 16 ngày còn lại (3–18 tháng 9) là **kỳ giữ lại** chỉ dùng để báo cáo. Trong 9.467 người dùng kiểm tra, 6.505 người hoạt động trong kỳ validation, 4.215 trong kỳ giữ lại và 1.253 trong cả hai; như ở phần đánh giá chính, chỉ người dùng và sản phẩm đã thấy trong huấn luyện mới được chấm điểm. Job cũng tính lại NDCG@10 trên toàn tháng kiểm tra, tái tạo @tab:tuning đến bốn chữ số thập phân và xác nhận các mô hình là giống hệt nhau.

Lượt chạy đầu, trên cả 27 tổ hợp, đã đo chín tổ hợp rank 10 và năm tổ hợp rank 30 trước khi bị dừng vì chạy chậm hơn lần tinh chỉnh gốc năm đến sáu lần (sự cố 31). Lượt chạy thứ hai đo ba tổ hợp rank 50, alpha 40, nhóm dẫn đầu ở mọi kỳ. Mười tổ hợp bị bỏ qua có điểm từ 0,023 đến 0,057 trên toàn tháng, thấp hơn nhiều so với nhóm rank 50, alpha 40 (0,066–0,068), và thứ tự các cấu hình gần như giống nhau ở hai kỳ (tương quan Spearman 0,995 trên 17 tổ hợp đã đo), nên chúng không thể làm thay đổi lựa chọn.

Table: NDCG@10 của 17 trong 27 tổ hợp trên kỳ validation, kỳ giữ lại và toàn tháng kiểm tra; tổ hợp được chọn trên validation in đậm {#tab:val w=12,15,12,21,20,20}
| rank | regParam | alpha | Validation (19/8 – 2/9) | Giữ lại (3–18/9) | Toàn tháng (@tab:tuning) |
|---|---|---|---|---|---|
| 10 | 0,01 | 1 | 0,0177 | 0,0135 | 0,0158 |
| 10 | 0,01 | 10 | 0,0241 | 0,0179 | 0,0213 |
| 10 | 0,01 | 40 | 0,0256 | 0,0188 | 0,0228 |
| 10 | 0,1 | 1 | 0,0172 | 0,0125 | 0,0148 |
| 10 | 0,1 | 10 | 0,0249 | 0,0188 | 0,0221 |
| 10 | 0,1 | 40 | 0,0264 | 0,0193 | 0,0233 |
| 10 | 1,0 | 1 | 0,0150 | 0,0124 | 0,0121 |
| 10 | 1,0 | 10 | 0,0264 | 0,0211 | 0,0234 |
| 10 | 1,0 | 40 | 0,0275 | 0,0196 | 0,0241 |
| 30 | 0,01 | 1 | 0,0284 | 0,0226 | 0,0252 |
| 30 | 0,01 | 10 | 0,0459 | 0,0348 | 0,0396 |
| 30 | 0,01 | 40 | 0,0568 | 0,0422 | 0,0493 |
| 30 | 0,1 | 1 | 0,0285 | 0,0227 | 0,0250 |
| 30 | 0,1 | 10 | 0,0476 | 0,0360 | 0,0409 |
| 50 | 0,01 | 40 | 0,0771 | 0,0581 | 0,0668 |
| 50 | 0,1 | 40 | 0,0763 | 0,0574 | 0,0662 |
| **50** | **1,0** | **40** | **0,0789** | **0,0579** | **0,0680** |

Sau đó trọng số xếp hạng lại β cũng được chọn trên kỳ validation, với mô hình đã chọn ở trên và cùng 200 ứng viên như trong vận hành (@tab:val-beta), và mọi phương pháp được chấm điểm trên kỳ giữ lại, kỳ không tham gia vào bất kỳ lựa chọn nào (@tab:val-kt).

Table: Trọng số xếp hạng lại theo độ mới lạ chọn trên kỳ validation (200 ứng viên ALS) {#tab:val-beta w=16,24,24,18,18}
| β | NDCG@10 validation | NDCG@10 giữ lại | Độ phủ kỳ giữ lại | Số sản phẩm |
|---|---|---|---|---|
| 0 (chỉ ALS) | 0,0789 | 0,0579 | 2,83 % | 3.568 |
| 0,25 | 0,0855 | 0,0630 | 3,24 % | 4.091 |
| 0,5 | 0,0919 | 0,0674 | 3,85 % | 4.856 |
| **1,0** | **0,1012** | **0,0742** | **5,27 %** | **6.649** |
| 1,5 | 0,0819 | 0,0576 | 5,97 % | 7.536 |
| 2,0 | 0,0630 | 0,0439 | 5,81 % | 7.336 |

Table: Các phương pháp trên kỳ giữ lại (3–18 tháng 9, 4.215 người dùng), mọi lựa chọn thực hiện trên kỳ validation {#tab:val-kt w=44,14,21,21}
| Phương pháp | NDCG@10 | So với baseline bán chạy | So với baseline danh mục |
|---|---|---|---|
| Baseline 1: bán chạy toàn sàn | 0,0049 | — | — |
| Baseline 2: bán chạy theo danh mục | 0,0413 | — | — |
| ALS chọn trên validation (rank 50, regParam 1,0, alpha 40) | 0,0579 | +1.086 % | +40 % |
| ALS sẽ được chọn nếu nhìn chính kỳ giữ lại (rank 50, regParam 0,01, alpha 40) | 0,0581 | +1.091 % | +41 % |
| ALS + xếp hạng lại theo độ mới lạ, β = 1,0 chọn trên validation | **0,0742** | +1.420 % | +80 % |

- **Giao thức sạch chọn đúng cấu hình đang triển khai.** Cả siêu tham số ALS (rank 50, regParam 1,0, alpha 40) lẫn trọng số xếp hạng lại β = 1,0 đều đứng đầu trên kỳ validation, đúng như trên toàn tháng; β = 1,0 cũng là giá trị tốt nhất trên kỳ giữ lại.
- **Mức lạc quan của giao thức chính là không đáng kể.** Tổ hợp sẽ được chọn nếu nhìn kỳ giữ lại chỉ tốt hơn 0,0002 (0,0581 so với 0,0579), chưa đến 0,5 % tương đối. Vì vậy việc chọn trên tháng kiểm tra không thổi phồng các chỉ số báo cáo ở mức đáng kể nào.
- **Giá trị tuyệt đối khác nhau giữa các kỳ, còn phép so sánh thì không.** Mọi phương pháp, kể cả các baseline, đều có điểm thấp hơn trên kỳ giữ lại, kỳ có người dùng xa thời gian huấn luyện hơn; NDCG thấp hơn 17–29 % so với kỳ validation ở mọi tổ hợp. So trên cùng một kỳ, ALS vẫn hơn hai baseline +1.086 % và +40 % (+1.237 % và +43 % trên toàn tháng), và xếp hạng lại cộng thêm 28 % cho ALS (27 % trên toàn tháng). Độ phủ kỳ giữ lại (5,27 %) thấp hơn con số toàn tháng (6,47 %) chỉ vì 4.215 người dùng nhận ít ô hơn 9.467 người dùng.

Do đó các kết quả của @sec:res-tuning, @sec:res-baselines và @sec:res-coverage không phải là sản phẩm của việc chọn trên tháng kiểm tra.

### Các nguồn ứng viên ngoài ALS {#sec:res-nguon}

Mọi sản phẩm của danh sách phục vụ đều đến từ ALS, đó là lý do xếp hạng lại dừng ở độ phủ 6,47 % (@sec:res-coverage). `kiem_tra/thu_nguon_ung_vien.py` bắt đầu từ chính danh sách phục vụ đó (ALS với xếp hạng lại theo độ mới lạ, β = 1,0 trên 200 ứng viên), giữ 10 − *c* − *d* ô đầu và dành các ô cuối cho hai nguồn không đi qua ALS, cả hai đều tính chỉ từ dữ liệu huấn luyện: *c* sản phẩm **đồng xuất hiện**, tức những sản phẩm thường được xem cùng ngày với mười sản phẩm huấn luyện có điểm cao nhất của người dùng, với độ tương tự cosine của khối sản phẩm liên quan (@eq:cos), và *d* sản phẩm **bán chạy theo danh mục** thuộc danh mục chính của người dùng (baseline 2). Sản phẩm đã có trong danh sách thì bỏ qua, và một ứng viên thiếu được thay bằng sản phẩm kế tiếp của danh sách phục vụ. Mười tổ hợp được chấm điểm với mô hình đang triển khai trên các kỳ của @sec:res-val. Quy tắc chọn được cố định trước khi chạy: độ phủ validation cao nhất trong các tổ hợp có NDCG@10 validation ít nhất bằng 95 % của danh sách phục vụ. Độ phủ không dùng tập đáp án, nên được báo cáo trên danh sách của cả 9.467 người dùng kiểm tra, đúng như 3,44 % và 6,47 % ở @sec:res-coverage; 8.673 người trong số này có ít nhất một ứng viên đồng xuất hiện. Lượt chạy mất 11 phút.

Table: Trộn ứng viên đồng xuất hiện và ứng viên theo danh mục vào các ô cuối của danh sách phục vụ (offline, mô hình đang triển khai, β = 1,0); tổ hợp được chọn trên validation in đậm {#tab:nguon w=11,12,10,12,11,12,11,10,11}
| Ô phục vụ giữ lại | Ô đồng xuất hiện | Ô danh mục | NDCG@10 validation | NDCG@10 giữ lại | NDCG@10 toàn tháng | Độ phủ | Số sản phẩm | Tỉ lệ ô thuộc N1 |
|---|---|---|---|---|---|---|---|---|
| 10 | 0 | 0 | 0,1012 | 0,0742 | 0,0865 | 6,47 % | 8.162 | 80,8 % |
| 9 | 1 | 0 | 0,1022 | 0,0753 | 0,0876 | 10,14 % | 12.805 | 78,2 % |
| 8 | 2 | 0 | 0,1034 | 0,0760 | 0,0886 | 12,68 % | 16.011 | 75,9 % |
| **7** | **3** | **0** | **0,1040** | **0,0764** | **0,0892** | **14,53 %** | **18.341** | **74,1 %** |
| 9 | 0 | 1 | 0,1009 | 0,0740 | 0,0863 | 6,44 % | 8.124 | 82,2 % |
| 8 | 0 | 2 | 0,1010 | 0,0737 | 0,0863 | 6,46 % | 8.151 | 83,3 % |
| 8 | 1 | 1 | 0,1024 | 0,0751 | 0,0877 | 10,09 % | 12.737 | 79,5 % |
| 7 | 2 | 1 | 0,1034 | 0,0762 | 0,0887 | 12,63 % | 15.939 | 77,4 % |
| 6 | 3 | 1 | 0,1041 | 0,0763 | 0,0892 | 14,44 % | 18.231 | 75,6 % |
| 6 | 2 | 2 | 0,1033 | 0,0756 | 0,0884 | 12,59 % | 15.891 | 78,6 % |

- **Ô đồng xuất hiện nâng đồng thời độ chính xác và độ phủ.** Mỗi ô trong ba ô đầu thêm từ 1,9 đến 3,7 điểm độ phủ (6,47 % → 10,14 % → 12,68 % → 14,53 %) và một chút NDCG@10 (0,0865 → 0,0892 trên toàn tháng, 0,0742 → 0,0764 trên các ngày giữ lại). Tổ hợp được chọn (bảy ô phục vụ và ba ô đồng xuất hiện) lần đầu tiên vượt mục tiêu độ phủ 10 %, với 18.341 sản phẩm khác nhau, trong khi tỉ lệ ô thuộc 10 % sản phẩm phổ biến nhất giảm từ 80,8 % xuống 74,1 %. Trên các ngày giữ lại, tổ hợp này tốt hơn baseline theo danh mục 85 % (0,0764 so với 0,0413) và gấp 15,7 lần baseline bán chạy.
- **Ô theo danh mục không thêm được gì.** Chỉ với sản phẩm bán chạy theo danh mục, độ phủ đứng ở 6,4–6,5 % và NDCG@10 giảm nhẹ: một nhúm sản phẩm bán chạy của mỗi danh mục bị lặp lại qua nhiều người dùng, nên chúng hầu như không mang thêm sản phẩm mới, và chúng thay chỗ những sản phẩm thường phù hợp hơn.
- **Điểm tối ưu nằm ở biên của khoảng đã thử.** Ba ô đồng xuất hiện là giá trị lớn nhất đã thử, nên bốn hoặc năm ô có thể nâng độ phủ thêm nữa; mức tăng NDCG chững lại sau hai ô.
- **Tổ hợp này chưa được triển khai.** Hệ thống phục vụ vẫn lấp các ô ALS chỉ từ ALS (6,47 %). Triển khai tổ hợp nghĩa là thêm một bước trong job trộn trước khi áp mẫu A/B; việc này không được làm khi chỉ còn một tuần trước buổi bảo vệ vì nó sẽ thay đổi danh sách phục vụ, thử nghiệm A/B và các ảnh chụp màn hình của báo cáo này. Vì vậy ngưỡng độ phủ của tiêu chí 2 đạt ở chế độ offline, trên cùng người dùng và cùng định nghĩa, nhưng chưa đạt trong vận hành.

## Điều phối: Deadline Alert và backfill {#sec:res-airflow}

Hai tính năng được thêm sau khi đối chiếu với đề cương: `sla` thay bằng Deadline Alert, và backfill. Cả hai được chạy thử trên chính Airflow 3.3.1, với đúng mô-đun `bd03_chung.py` của dự án, trước khi đưa lên cụm (`docs/bang_chung/kiem_chung_airflow_cuc_bo.md`).

- **Deadline Alert.** Một DAG thử đặt hạn 1 phút, còn task của nó ngủ 150 giây. Lượt chạy vào hàng đợi lúc 10:09:28, hạn chót là 10:10:28, và scheduler gọi `canh_bao_tre_han` lúc 10:10:29, khi task vẫn đang chạy. Dòng cảnh báo được ghi vào `logs/canh_bao.log`. SLA cũ của Airflow 2 chỉ được kiểm tra khi lượt chạy kết thúc, tức sau 150 giây.
- **Backfill DAG 3.** `airflow backfill create` cho năm giờ tạo năm lượt `backfill__`. Chỉ lượt 00:00 UTC truyền `--tu-ngay 2026-11-12` cho job, bốn lượt còn lại bị `cong_backfill` bỏ qua; lượt theo lịch vẫn chạy tăng dần, không tham số.

Bảy kiểm thử trong `tests/test_airflow_dags.py` nạp năm DAG thật bằng DagBag và kiểm tra:

- mỗi DAG có Deadline Alert đúng hạn và đúng callback;
- năm DAG tuần tự hóa được kèm deadline;
- retries và callback lỗi đúng như thiết kế;
- tham số backfill dựng đúng lệnh `spark-submit`.

Trên cụm, `airflow dags list-import-errors` không báo lỗi nào, và cả năm DAG đều nạp được Deadline Alert (@tab:dag-cum, `docs/bang_chung/cum/05_airflow.txt`, thu ngày 16/11).

Table: Năm DAG trên cụm: lịch, hạn chót, thử lại và các lượt chạy gần nhất {#tab:dag-cum w=22,12,10,8,48}
| DAG | Lịch | Hạn chót | Thử lại | Các lượt chạy gần nhất |
|---|---|---|---|---|
| `kn_pipeline_hang_ngay` | 02:00 | 420 phút | 1 | Tạm dừng có chủ đích tới khi nộp bài. Lượt 10/11 (thủ công) thành công trong 43 phút, lượt 11/11 thành công trong 58 phút và tự triển khai mô hình v2 |
| `kn_giam_sat_streaming` | 15 phút | 10 phút | 0 | Các lượt thành công, mỗi lượt khoảng 30 giây |
| `kn_tinh_ab` | mỗi giờ | 30 phút | 1 | 5/5 lượt gần nhất thành công, 17 giây – 6 phút |
| `kn_bao_tri` | 04:00 | 90 phút | 1 | 5/5 đêm 11–15/11 thành công, 6–10 phút |
| `kn_tai_lap` | thủ công | 180 phút | 0 | 3 lượt 10–12/11 thành công, 19 phút – 1 giờ 48 phút |

Hai quan sát vận hành từ cùng tệp:

- **Báo động khi không có lưu lượng.** Sáng 16/11, bộ phát dữ liệu tắt. Task `kiem_tra_du_lieu_15_phut` của DAG giám sát không thấy cửa sổ thịnh hành nào trong 15 phút gần nhất, nên ghi cảnh báo và gọi khởi động lại luồng ba lần liên tiếp (`logs/canh_bao.log`). Lệnh khởi động bỏ qua luồng đang chạy, nên luồng không bị gián đoạn: ứng dụng vẫn giữ nguyên mã sau 31,5 phút (`06_streaming.txt`). Cảnh báo đúng theo thiết kế nhưng là báo động giả khi không có sự kiện, ghi ở @sec:limits.
- **Lượt chạy treo của DAG 1.** Lượt `scheduled__2026-11-14T19:00` ở trạng thái `running` từ trưa 15/11, vì DAG đã được tạm dừng trong lúc lượt này đang chờ. Scheduler không lập lịch task cho DAG đang tạm dừng, nên lượt này đứng yên mà không chạy job nào. Lượt này phải được đánh dấu thất bại trước khi bật lại DAG 1 (`docs/TRIEN_KHAI_CUM.md`), để nó không chạy tiếp với dữ liệu cũ.

## Hiệu năng ứng dụng web {#sec:res-web}

Đề cương yêu cầu web phản hồi dưới 3 giây (mục A.8). Có hai cách đo:

- **Phía máy chủ.** Middleware ghi thời gian xử lý của mọi yêu cầu theo mẫu route; `GET /api/hieu-nang` trả trung vị, p95, giá trị lớn nhất và tỷ lệ dưới 3 giây.
- **Phía máy khách.** `scripts/do_do_tre_web.py` gọi lần lượt 20 lần mỗi nhóm yêu cầu đọc từ máy master: trang chủ, gợi ý của người dùng quen và người dùng mới, thịnh hành, trang sản phẩm, thịnh hành theo sản phẩm (không qua bộ đệm), ba trang báo cáo. Script không ghi lượt hiển thị nào, để không làm bẩn số liệu A/B.

Bộ đệm có hạn sống giữ phần lớn yêu cầu dưới vài chục mili giây (@tab:bo-dem).

Table: Hạn sống bộ đệm của ứng dụng web {#tab:bo-dem w=60,40}
| Dữ liệu | Hạn sống bộ đệm |
|---|---|
| Thịnh hành | 10 giây |
| Gợi ý theo người dùng | 30 giây |
| Bảng nhỏ | 60 giây |
| Bảng báo cáo chỉ đổi mỗi đêm (lịch sử huấn luyện, tinh chỉnh, số đo Z-ORDER) | 600 giây |
| Sản phẩm liên quan | 600 giây |
| Bảng lớn | 3.600 giây |

Yêu cầu đầu tiên sau khi bộ đệm hết hạn mới phải chạy một truy vấn Spark cục bộ. Truy vấn lấy gợi ý theo người dùng chính là truy vấn được đo Z-ORDER ở @tab:zorder.

**Lần đo đầu tiên (16/11, `docs/bang_chung/cum/07_do_tre_web.md`) phát hiện hai lỗi** mà kiểm thử cục bộ với kho dữ liệu giả không bắt được (@tab:web-truoc).

Table: Thời gian phản hồi đo từ máy master, 20 yêu cầu mỗi nhóm, trước khi sửa (16/11/2026) {#tab:web-truoc w=36,11,11,11,11,20}
| Nhóm yêu cầu | Lần đầu (ms) | Trung vị (ms) | p95 (ms) | Lớn nhất (ms) | Dưới 3 s |
|---|---|---|---|---|---|
| Trang chủ | 18 | 18 | 54 | 67 | 20/20 |
| `GET /api/goi-y/{user_id}`, người dùng quen | 528 | **8.907** | 10.154 | 10.424 | **1/20** |
| `GET /api/goi-y/{user_id}`, người dùng mới | 511 | 17 | 511 | 790 | 20/20 |
| `GET /api/thinh-hanh` | 14 | 16 | 22 | 24 | 20/20 |
| Trang sản phẩm | 3.847 | 409 | 3.847 | 3.886 | 18/20 |
| `GET /api/thinh-hanh/{id}` (không qua bộ đệm) | 272 | 410 | 818 | 819 | 20/20 |
| Bảng điều khiển A/B `/ab` | 2.669 | 21 | 34 | 2.669 | 20/20 |
| `GET /api/ab/ket-qua` | 17 | 18 | 44 | 56 | 20/20 |
| `/mo-hinh` | 8.698 | – | – | – | **1/20, 19 lỗi 500** |
| `GET /api/mo-hinh/chi-so`, `/tai-lap` | – | – | – | – | **20/20 lỗi 500** |

- **Lỗi 500 ở hai màn hình báo cáo.** `lich_su_mo_hinh` bỏ cột JSON thô ngay trên danh sách nằm trong bộ đệm 60 giây. Lần gọi đầu đúng, nhưng mọi lần gọi sau trong 60 giây gặp `KeyError`: tải lại `/mo-hinh`, gọi `/api/mo-hinh/chi-so` hay mở `/tai-lap` (dùng chung hàm này) đều lỗi. Trong kịch bản demo, `/tai-lap` được mở ngay sau `/mo-hinh`, nên chắc chắn đã gặp lỗi này. Sửa: chép từng dòng trước khi biến đổi; kiểm thử hồi quy gọi hàm ba lần liên tiếp trên cùng một bộ đệm.
- **Z-ORDER mất tác dụng trên bảng thật.** `OPTIMIZE ... ZORDER BY` hằng đêm của DAG 4 dùng cỡ tệp tối đa mặc định của Delta là 1 GB. Bảng gợi ý chỉ khoảng 38 MB, nên bị gộp thành **một tệp**: data skipping không loại được tệp nào, và mỗi lần tra một người dùng lại đọc cả 5,3 triệu dòng (trung vị 8,9 giây). Thí nghiệm ở @tab:zorder đặt cỡ tệp 1 MB nên không gặp hiện tượng này. Sửa: `toi_uu_delta.py` giới hạn 1 MB riêng cho bảng gợi ý (khoảng 40 tệp), như thí nghiệm; danh sách người dùng mẫu (quét cả bảng) giữ trong bộ đệm 1 giờ thay cho 60 giây.

**Đo lại sau khi sửa** (cùng ngày, `docs/bang_chung/cum/07b_do_tre_web_sau_sua.md`). Web được build lại với bản sửa, và bảng gợi ý được OPTIMIZE ZORDER lại với giới hạn 1 MB: từ 1 tệp thành 36 tệp. Kết quả ở @tab:web-sau.

Table: Thời gian phản hồi sau khi sửa, 20 yêu cầu mỗi nhóm (16/11/2026) {#tab:web-sau w=36,11,11,11,11,20}
| Nhóm yêu cầu | Lần đầu (ms) | Trung vị (ms) | p95 (ms) | Lớn nhất (ms) | Dưới 3 s |
|---|---|---|---|---|---|
| Trang chủ | 33 | 18 | 30 | 33 | 20/20 |
| `GET /api/goi-y/{user_id}`, người dùng quen | 426 | **28** | 531 | 586 | **20/20** |
| `GET /api/goi-y/{user_id}`, người dùng mới | 402 | 22 | 407 | 438 | 20/20 |
| `GET /api/thinh-hanh` | 49 | 21 | 48 | 49 | 20/20 |
| Trang sản phẩm | 2.586 | 338 | 2.586 | 3.448 | 19/20 |
| `GET /api/thinh-hanh/{id}` (không qua bộ đệm) | 409 | 319 | 414 | 432 | 20/20 |
| Bảng điều khiển A/B `/ab` | 2.433 | 15 | 68 | 2.433 | 20/20 |
| `GET /api/ab/ket-qua` | 20 | 16 | 43 | 46 | 20/20 |
| `/mo-hinh` | 8.529 | 28 | 58 | 8.529 | 19/20 |
| `GET /api/mo-hinh/chi-so` | 29 | 29 | 36 | 76 | **20/20** |
| `/tai-lap` | 2.663 | 22 | 47 | 2.663 | **20/20** |

Kết quả sau khi sửa:

- **Không còn lỗi.** Cả 220 yêu cầu thành công, 99,1 % dưới 3 giây, p95 toàn bộ 457 ms. Trước khi sửa, chỉ 161/220 yêu cầu thành công.
- **Gợi ý người dùng quen.** Lần đầu với mỗi người dùng (không trúng bộ đệm) còn khoảng 0,4–0,6 giây, so với 8,9–10,4 giây trước đó, tức nhanh khoảng 17 lần. Trung vị còn 28 ms vì các lần sau trúng bộ đệm. Đây là tác dụng Z-ORDER của @tab:zorder, nay có thật trên bảng phục vụ.
- **Hai yêu cầu còn trên 3 giây.** Cả hai đều là lần đầu sau khi web khởi động: `/mo-hinh` 8,5 giây (nạp nhật ký Delta của ba bảng) và một trang sản phẩm 3,4 giây. Phía máy chủ còn ghi `/api/nguoi-dung-mau` 19,4 giây, cũng ở lần đầu.

Vì vậy, sau lần đo này, web được bổ sung hai thay đổi. Hai thay đổi này chưa được đo lại trên cụm.

- **Làm nóng bộ đệm.** Ngay khi khởi động, một luồng nền chạy trước các truy vấn chậm đó.
- **Bộ đệm dài hơn.** Ba bảng chỉ đổi khi DAG hằng đêm chạy được giữ trong bộ đệm 10 phút thay cho 60 giây.

## Xử lý luồng và vận hành {#sec:res-streaming}

Ngày 10 tháng 11, ba job luồng được khởi động trên cụm và producer phát lại 48 ngày cuối của dữ liệu (1 tháng 8 đến 18 tháng 9 năm 2015) lần thứ hai: 857.072 sự kiện trong khoảng 24 phút. Nhờ khử trùng lặp theo nội dung (@tab:lam-sach), các bản trùng này không làm thay đổi silver. Phép kiểm tra mà DAG giám sát luồng dùng báo bảng thịnh hành đang hoạt động, với 2.203.504 dòng (cửa sổ, sản phẩm) có cửa sổ kết thúc trong 15 phút gần nhất. Với Airflow, ba driver luồng và một job tái lập chạy cùng lúc, máy master vẫn còn 1,8 GB bộ nhớ khả dụng (@fig:ram).

**Vòng khép kín và độ trễ.** Hai tiêu chí về luồng được đo ngày 11 tháng 11 trong khoảng 05:20–05:36 (giờ Việt Nam), khi ứng dụng web chạy trên labsoe-18 và producer đang dừng, để bảng thịnh hành chỉ thay đổi do phép thử. Những cú nhấp đầu tiên cũng đánh thức sensor của DAG hằng đêm, DAG này khởi động các job theo lô lúc 05:22 (@sec:res-v2): vì vậy phép đo thứ hai được thực hiện trong lúc tinh chỉnh ALS đang chạy trên cụm và driver của nó đang chạy trên máy master, tức 51 giây đo được là dưới tải theo lô chứ không phải trên một cụm nhàn rỗi. Cả hai phép đo dùng API công khai của ứng dụng web từ máy master (@tab:do-tre). Lần thử đầu gửi ba sự kiện *Thêm vào giỏ* cho sản phẩm 320844: chúng đến bronze khoảng mười giây sau khi broker nhận, nhưng khối thịnh hành không thay đổi trong 180 giây. Nhật ký cho thấy hai lượt chạy của cùng một truy vấn thịnh hành cùng ghi một tệp offset: lần khởi động lại luồng trước đó trong đêm đã hủy ứng dụng qua Spark Master nhưng để driver chế độ client còn sống, và sự kiện mới đầu tiên khiến driver cũ và driver mới va nhau trên checkpoint, làm cả hai dừng (sự cố 27). Sau khi sửa (dừng một luồng nay cũng dừng luôn tiến trình driver của nó), các luồng được khởi động lại. Ba cú nhấp trước đó khi ấy xuất hiện trong cửa sổ bắt đầu lúc 22:22 UTC: checkpoint đã giữ batch đã lập kế hoạch, và không mất gì. Phép đo thứ hai, trên sản phẩm 102605, thấy bảng thịnh hành được cập nhật **51 giây** sau ba cú nhấp, trong mục tiêu 90 giây; thời gian này gồm tối đa 20 giây chu kỳ kích hoạt, micro-batch (nối với thống kê sản phẩm và MERGE) và chu kỳ thăm dò 3 giây của script.

Table: Các phép đo vòng khép kín và độ trễ trên cụm (11 tháng 11 năm 2026) {#tab:do-tre w=34,22,44}
| Phép đo | Sản phẩm, người dùng | Kết quả |
|---|---|---|
| Kafka → bronze, ba sự kiện *Thêm vào giỏ* (`tim_su_kien_bronze.py`) | 320844, `demo_vong_kin` | 3 dòng trong bronze; 10,3–10,7 giây từ `kafka_ts` đến `_ingest_ts` |
| Cú nhấp → bảng thịnh hành được cập nhật (`demo_vong_khep_kin.py`, ba cú nhấp) | 102605, `demo_vong_kin` | **51 giây** (cửa sổ kết thúc 22:50 UTC); mục tiêu ≤ 90 giây |
| Phục hồi sau sự cố luồng | 320844 | ba cú nhấp của lần thử thất bại được tính trong cửa sổ 22:22–22:37 UTC sau khi khởi động lại |

**Khởi đầu lạnh trên hệ thống đang chạy.** Một người dùng tạo bằng nút *Người dùng mới (cold start)* nhận chiến lược `nguoi_moi`: cả mười ô "Dành cho bạn" đến từ cửa sổ thịnh hành mới nhất và trùng với khối thịnh hành bên dưới (@fig:cold-start-web). Mười lượt hiển thị được ghi vào nhật ký hiển thị, nhưng phép tính A/B bỏ qua chúng vì chỉ đếm người dùng có gợi ý ALS, và vì vậy trang ghi người dùng này là nằm ngoài thử nghiệm.

![Trang chủ của một người dùng tạo tại chỗ: chiến lược `nguoi_moi`, ngoài thử nghiệm A/B; các ô "Dành cho bạn" (trên) là các sản phẩm của khối thịnh hành (dưới)](hinh/s01_cold_start_web.png){#fig:cold-start-web w=14.5}

## Đối chiếu tiêu chí nghiệm thu {#sec:res-checklist}

@tab:ket-qua-nghiem-thu tóm tắt tình trạng của tám tiêu chí nghiệm thu ở @tab:nghiem-thu.

Table: Tình trạng các tiêu chí nghiệm thu {#tab:ket-qua-nghiem-thu w=5,28,24,43}
| # | Tiêu chí | Tình trạng | Bằng chứng |
|---|---|---|---|
| 1 | Bảng tinh chỉnh, ≥ 9 tổ hợp | Đạt | 27 tổ hợp kèm NDCG@10 (@tab:tuning); cùng lựa chọn trên một kỳ validation riêng (@tab:val) |
| 2 | ALS so với 2 baseline, 4 chỉ số + độ phủ + độ mới lạ | Đạt; ngưỡng độ phủ chỉ đạt ở chế độ offline, có phân tích | NDCG@10 +1.237 % so với baseline 1; độ phủ 3,44 % (6,47 % khi phục vụ), phân tích và xếp hạng lại ở @sec:res-coverage; 14,5 % với ba ô đồng xuất hiện, offline (@tab:nguon) |
| 3 | Ba chiến lược khởi đầu lạnh | Đạt: người dùng hoàn toàn mới được minh họa trực tiếp; hai chiến lược còn lại có kiểm thử đơn vị và được minh họa tại buổi bảo vệ | @tab:cold-start, @fig:cold-start-web |
| 4 | Thịnh hành cập nhật ≤ 90 giây sau một cú nhấp | Đạt | 51 giây từ ba cú nhấp đến bảng được cập nhật (@tab:do-tre) |
| 5 | Vòng khép kín web → Kafka → bronze → thịnh hành | Đạt | Sự kiện web có trong bronze 10,3 giây sau Kafka, trong bảng thịnh hành sau 51 giây (@tab:do-tre, @fig:loop) |
| 6 | Kết quả A/B có p-value và kết luận | Đạt | CTR p = 0,015 (B thấp hơn), chuyển đổi p = 0,75 (@tab:ab, @fig:ab-web); bootstrap theo người dùng p = 0,029 (@tab:ab-user) |
| 7 | Tái lập bằng `VERSION AS OF` | Đạt | Độ lệch 0,000000 trên phiên bản 0, và 0 cho mô hình đang triển khai trên phiên bản 3, kích hoạt từ web (@tab:tai-lap) |
| 8 | Số liệu OPTIMIZE/Z-ORDER cho truy vấn tra cứu theo người dùng | Đạt | Số tệp đọc 67 → 1,07, trung vị nhanh hơn 8,4 lần so với chỉ nén (@tab:zorder) |

**Danh sách cá nhân hóa trên hệ thống đang chạy.** @fig:trang-chu-a và @fig:trang-chu-b trình bày trang chủ của hai người dùng đang hoạt động sau khi triển khai mô hình phiên bản 2, chụp ngày 11 tháng 11 khi producer đang phát lại sự kiện để các cửa sổ thịnh hành đầy đủ. Cả hai trang đều ghi tên mô hình đã tạo ra danh sách (`als_v2_r20261110T230924`) và ghi mười lượt hiển thị. Tên sản phẩm, ngành hàng và hình đến từ lớp hiển thị minh họa ở @sec:impl-web; mã sản phẩm và mã danh mục dưới mỗi thẻ là mã thật. Người dùng nhóm A nhận tám sản phẩm ALS đã xếp hạng lại và lọc giá, tiếp theo là hai sản phẩm từ nguồn sản phẩm mới thuộc danh mục chính của người dùng. Người dùng nhóm B nhận năm sản phẩm ALS, cùng hai sản phẩm mới đó, và sản phẩm thịnh hành ở các vị trí 3, 6 và 8; ba ô này được lưu từ ban đêm nhưng được thay lúc yêu cầu bằng ba sản phẩm thịnh hành mới nhất, chính là các vị trí 1 đến 3 của khối thịnh hành bên dưới danh sách. Như vậy mẫu ở @fig:mau-khoi hiện ra ngay trên trang.

![Trang chủ của một người dùng nhóm A sau khi triển khai mô hình phiên bản 2 (11 tháng 11, producer đang chạy): tám sản phẩm ALS và hai sản phẩm mới thuộc danh mục chính của người dùng](hinh/s05a_trang_chu_a.png){#fig:trang-chu-a w=14.5}

![Trang chủ của một người dùng nhóm B: sản phẩm thịnh hành ở các vị trí 3, 6 và 8, được làm mới lúc yêu cầu bằng các vị trí 1–3 của khối thịnh hành (dưới)](hinh/s05b_trang_chu_b.png){#fig:trang-chu-b w=14.5}

Bấm vào một sản phẩm được gợi ý sẽ mở trang sản phẩm (@fig:san-pham-web): trang ghi lượt nhấp gắn với lượt hiển thị mà nó đến từ đó (`mh` trong địa chỉ, hiển thị là "đến từ impression"), để pipeline A/B có thể nối lượt nhấp với lượt hiển thị, và hiển thị dòng mới nhất của sản phẩm trong bảng thịnh hành cùng các sản phẩm liên quan từ `gold.san_pham_lien_quan`: những sản phẩm mà cùng người dùng đã tương tác trong cùng ngày, xếp theo độ tương tự cosine của số người dùng.

![Trang sản phẩm mở từ ô 6 của @fig:trang-chu-a: mã lượt hiển thị của cú nhấp, trạng thái trong bảng thịnh hành và các sản phẩm liên quan](hinh/s06_san_pham_web.png){#fig:san-pham-web w=14.5}


**Đối chiếu yêu cầu chung của đề cương.** @tab:yeu-cau-chung tóm tắt năm yêu cầu bắt buộc của mục A.6.

Table: Năm yêu cầu bắt buộc của mục A.6 đề cương {#tab:yeu-cau-chung w=8,30,62}
| Mục | Yêu cầu | Bằng chứng |
|---|---|---|
| A.6.1 | Job lô, mô hình MLlib, luồng chạy ≥ 30 phút khi demo | 8 bước của DAG 1; ALS (@tab:tuning); 3 luồng chạy liên tục từ 10 tháng 11 (thời gian chạy trên Spark UI, `06_streaming.txt`) |
| A.6.2 | MERGE INTO, DESCRIBE HISTORY, VERSION AS OF, OPTIMIZE có số trước/sau | @tab:delta; `scripts/demo/delta_sql.sh` (`04_delta.txt`); @tab:tai-lap; @tab:zorder |
| A.6.3 | Mọi bảng Delta trên HDFS, nộp `hdfs dfs -du -h /lakehouse/bd03_khuyen_nghi` | `docs/bang_chung/cum/01_hdfs_du_h.txt` |
| A.6.4 | ≥ 3 màn hình, ≥ 1 thao tác ghi ngược vào Delta | 5 màn hình (@tab:web); "Chạy lại" → `gold.ket_qua_tai_lap`; lượt hiển thị, nhấp, mua → MERGE `gold.nhat_ky_hien_thi` |
| A.6.5 | ≥ 3 DAG khác lịch, retries, sla, nhánh hoặc sensor | 5 DAG (@tab:dags); retries + callback; Deadline Alerts (@sec:res-airflow); BranchPythonOperator, PythonSensor, ShortCircuitOperator |
