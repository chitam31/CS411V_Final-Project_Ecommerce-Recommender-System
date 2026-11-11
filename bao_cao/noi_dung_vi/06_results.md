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
| Số cặp người dùng – sản phẩm huấn luyện / mật độ | 746.350 / khoảng 1,8 × 10^{−5} |
| Số cặp kiểm tra / số người dùng được đánh giá | 32.804 / 9.467 |
| Sản phẩm trong tập huấn luyện (mẫu số của độ phủ) / sản phẩm trong danh mục | 126.230 / 417.053 |
| Số tệp của `silver.tuong_tac` sau khi sửa lỗi tệp nhỏ | 140 (mỗi ngày một tệp) |

Ma trận cực kỳ thưa, và chỉ 9.467 trong 179.999 người dùng huấn luyện có tương tác kiểm tra với sản phẩm đã biết: phần lớn khách của RetailRocket chỉ xuất hiện trong một lượt truy cập ngắn. Điều này định hình mọi kết quả dưới đây: giá trị tuyệt đối của các chỉ số đều thấp với mọi phương pháp, và tập kiểm tra chứa nhiều sản phẩm hiếm gặp trong tập huấn luyện.

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

Chỉ nén tệp gần như không giúp gì: mỗi tệp đã nén vẫn chứa người dùng thuộc toàn bộ dải mã, nên thống kê min/max của mọi tệp phủ gần trọn miền giá trị và data skipping không loại được tệp nào. Z-ORDER đặt các dòng của cùng một người dùng cạnh nhau, thu hẹp khoảng min/max của mỗi tệp, và cho phép Delta bỏ qua tất cả trừ khoảng một tệp cho mỗi lần tra cứu. Độ trễ trung vị giảm từ 8.280 ms xuống 980 ms, **nhanh hơn 8,4 lần so với chỉ nén** và 11 lần so với bảng phân mảnh. Độ trễ tuyệt đối trên cụm thay đổi theo tải và theo Wi-Fi, nhưng số tệp phải đọc thì không, nên đó là con số đáng tin hơn.

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
