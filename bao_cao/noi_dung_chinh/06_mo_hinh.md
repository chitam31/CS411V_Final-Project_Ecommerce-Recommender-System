# Mô hình học máy {#sec:ml}

## Đặc trưng và thuật toán

**Chia dữ liệu.** Chia theo thời gian, ngày cắt 19/8/2015:

- train: 4 tháng đầu, 179.999 người dùng có ít nhất 3 tương tác, 746.350 cặp;
- test: 30 ngày cuối, 9.467 người dùng có tương tác với sản phẩm đã biết;
- đáp án của mỗi người dùng: tập sản phẩm họ tương tác trong tháng cuối.

**Điểm tương tác.** Điểm mỗi cặp là tổng trọng số sự kiện (xem 1, thêm giỏ 3, mua 5) nhân hệ số suy giảm `exp(−0,01·Δngày)`. Ngày tham chiếu là ngày cắt, nên không có thông tin tương lai lọt vào train.

**Mô hình.** ALS `implicitPrefs = true` (@eq:als) coi điểm *r* là độ tin cậy *c = 1 + α·r* của sở thích nhị phân, khớp trên mọi ô kể cả ô trống. Khi đánh giá dùng `coldStartStrategy = "drop"`.

$$als$$ {#eq:als}

Chỉ số đánh giá: Precision@10, Recall@10, NDCG@10 (@eq:ndcg), MAP@10, khớp với `RankingMetrics` của Spark (có kiểm thử đối chiếu). Thêm hai chỉ số đo thiên lệch:

- độ phủ: tỷ lệ sản phẩm của catalog train xuất hiện trong ít nhất một danh sách;
- độ mới lạ: trung bình −log₂ tỷ lệ người dùng đã tương tác với sản phẩm được gợi ý.

$$ndcg$$ {#eq:ndcg}

## Tinh chỉnh và kết quả so với baseline

Lưới đầy đủ có 27 tổ hợp (rank ∈ {10, 30, 50}, regParam ∈ {0,01; 0,1; 1,0}, alpha ∈ {1; 10; 40}), mất 78 phút. NDCG@10 tăng theo rank và theo alpha. Tốt nhất là rank 50, regParam 1,0, alpha 40 với NDCG@10 = 0,0680 (@fig:tuning).

Một kỳ validation riêng (15 ngày đầu tháng test) chọn lại đúng cấu hình này. Như vậy việc chọn siêu tham số trên tháng test chỉ làm số liệu lạc quan không đáng kể.

![NDCG@10 trên lưới tinh chỉnh, mỗi rank một bản đồ nhiệt](hinh/c01_tuning.png){#fig:tuning w=14}

Table: So sánh trên tháng kiểm tra (9.467 người dùng, K = 10) {#tab:pp w=34,9,9,10,9,10,9,10}
| Phương pháp | P@10 | R@10 | NDCG@10 | MAP@10 | Độ phủ | Mới lạ | Số SP |
|---|---|---|---|---|---|---|---|
| Baseline 1: bán chạy toàn sàn | 0,0017 | 0,0066 | 0,0051 | 0,0036 | 0,01 % | 8,91 | 10 |
| Baseline 2: bán chạy trong danh mục | 0,0122 | 0,0706 | 0,0475 | 0,0352 | 5,28 % | 11,88 | 6.660 |
| ALS (rank 50, reg 1,0, α 40) | 0,0161 | 0,0921 | 0,0680 | 0,0531 | 3,44 % | 10,86 | 4.346 |
| **Phục vụ: ALS + xếp lại β = 1, 200 ứng viên** | **0,0182** | **0,1089** | **0,0865** | **0,0716** | **6,47 %** | 12,17 | 8.162 |

So với baseline 1, NDCG@10 của ALS cao hơn **1.237 %**, vượt xa ngưỡng 30 %; so với baseline 2 cao hơn 43 %. Mô hình phiên bản 2, sau schema evolution thêm giá vào silver, lọc ứng viên theo tầm giá quen thuộc của người dùng và tăng NDCG thêm 2,1 %. Chính DAG hằng đêm đã tự triển khai mô hình này.

## Thiên lệch độ phổ biến

Độ phủ 3,44 % dưới ngưỡng 10 % không do giới hạn cấu trúc: 10 ô × 9.467 người dùng trên 126.230 sản phẩm cho phép tới 75 %. Nguyên nhân là ALS dồn **99,2 %** số ô vào 10 % sản phẩm phổ biến nhất.

Biện pháp là xếp hạng lại: lấy dư 200 ứng viên, rồi xếp theo điểm ALS chuẩn hóa cộng β × độ mới lạ chuẩn hóa. Với β = 1, cả độ chính xác (NDCG +27 %) lẫn độ đa dạng (độ phủ +88 %, phần ô thuộc N1 còn 80,8 %) cùng tăng.

Không cấu hình nào đạt 10 %, vì phần lớn sản phẩm chỉ có một hai tương tác nên vector của chúng gần không. Thêm ba ô sản phẩm đồng xuất hiện (thử offline) đạt độ phủ 14,5 %.

## Phân tích lỗi

- **Độ phủ và độ mới lạ.** ALS thuần kém baseline 2: 3,44 % so với 5,28 %, và 10,86 so với 11,88. Lý do là thiên lệch nêu trên. Bản phục vụ có xếp lại đã vượt baseline 2 ở độ phủ.
- **Theo nhóm người dùng.** `jobs/kiem_tra/phan_tich_loi.py` tính NDCG@10 từng người trong 9.467 người dùng cho ALS và hai baseline, rồi gom theo ba trục: số tương tác train, độ phổ biến của sản phẩm kiểm tra, số danh mục đã xem (@tab:loi; bảng đầy đủ và biểu đồ ở báo cáo đầy đủ, mục 6.6). Kết quả chạy trên cụm ngày 16/11. Giả thuyết ban đầu là ALS thua baseline 2 ở người dùng ít tương tác và ở người dùng chỉ xem một danh mục.

Table: Phân tích lỗi rút gọn; "ALS thua" là tỷ lệ người dùng có NDCG của ALS thấp hơn baseline 2 {#tab:loi w=34,13,13,13,13,14}
| Nhóm | Người dùng | ALS | Baseline 2 | ALS thua | Cả hai = 0 |
|---|---|---|---|---|---|
| Tất cả | 9.467 | 0,0680 | 0,0475 | 3,9 % | 84,8 % |
| 3–4 tương tác train | 6.401 | 0,0727 | 0,0504 | 3,4 % | 85,7 % |
| ≥ 50 tương tác train | 126 | 0,0644 | 0,0499 | 13,5 % | 57,9 % |
| SP kiểm tra toàn đuôi dài | 3.865 | 0,0123 | 0,0080 | 1,3 % | 96,6 % |
| SP kiểm tra ≥ 50 % phổ biến | 5.061 | 0,1139 | 0,0802 | 5,6 % | 76,4 % |
| Xem 1 danh mục | 2.823 | 0,1228 | 0,0882 | 5,2 % | 76,7 % |
| Xem 4–7 danh mục | 1.743 | 0,0368 | 0,0252 | 2,8 % | 90,1 % |

Kết luận:

- **Hai giả thuyết ban đầu đều sai.** ALS hơn baseline 2 ở **mọi** nhóm, khoảng 30–45 % ở mọi mức số tương tác. Ở nhóm 3–4 tương tác (68 % người dùng), ALS hơn 44 %. Người chỉ xem một danh mục lại là trường hợp dễ nhất cho cả hai phương pháp; khó nhất là người trải trên 2–7 danh mục.
- **Nguồn lỗi chính là đuôi dài.** 41 % người dùng chỉ tương tác với sản phẩm đuôi dài trong tháng kiểm tra. Ở nhóm này NDCG của ALS chỉ bằng 1/9 nhóm "đầu", và 96,6 % người nhận 0 từ cả hai phương pháp. Điều này khớp với việc ALS dồn 99,2 % số ô vào 10 % sản phẩm phổ biến nhất.
- **Hướng cải thiện.** Cần nguồn ứng viên cho đuôi dài (đồng xuất hiện, nội dung), không phải tinh chỉnh thêm ALS.

- **Người dùng mới, sản phẩm mới.** ALS không chấm điểm được. Hệ thống dùng ba chiến lược khởi đầu lạnh (@tab:cs).

Table: Ba chiến lược khởi đầu lạnh {#tab:cs w=26,74}
| Trường hợp | Chiến lược |
|---|---|
| Người dùng mới hoàn toàn | Top thịnh hành 15 phút gần nhất |
| Người dùng < 5 tương tác | Bán chạy trong tối đa 3 danh mục đã xem, xen kẽ 50/50 với thịnh hành |
| Sản phẩm mới (không có trong ALS) | Sản phẩm mới cùng danh mục chính của người dùng, chèn vào 20 % vị trí cuối (ô 9–10) |

## Thử nghiệm A/B và tái lập

Nhóm A nhận ALS thuần; nhóm B nhận ALS trộn 30 % thịnh hành. Người dùng được phân nhóm bằng MD5 mã người dùng, nên ổn định qua các lần truy cập. Lưu lượng mô phỏng theo mô hình nhấp phụ thuộc vị trí và độ liên quan, cho 8.592 người dùng có danh sách ALS (@tab:ab).

Table: Kết quả A/B gộp 7 ngày (lưu lượng mô phỏng, không ưu đãi sản phẩm thịnh hành) {#tab:ab w=26,16,12,12,12,22}
| Nhóm | Hiển thị | Nhấp | CTR | Mua | p-value |
|---|---|---|---|---|---|
| A: ALS | 175.960 | 3.685 | 2,094 % | 412 | CTR: 0,015 |
| B: ALS + 30 % thịnh hành | 174.200 | 3.446 | 1,978 % | 417 | chuyển đổi: 0,75 |

Kết quả và cách đọc:

- **CTR.** z = −2,43, p = 0,015: B thấp hơn A khoảng 5,5 %. Mẫu đủ lớn so với cỡ mẫu cần 76.972 mỗi nhóm.
- **Kiểm định theo đơn vị người dùng.** Kết luận vẫn giữ: p = 0,037 với sai số chuẩn bền vững theo cụm, p = 0,029 với bootstrap.
- **Chuyển đổi.** Chưa đủ bằng chứng về khác biệt.
- **Phạm vi kết luận.** Kết luận chỉ đúng trong giả định của mô phỏng.

**Tái lập.** DAG 5 đọc `features.ma_tran_tuong_tac` với `VERSION AS OF`, huấn luyện và đánh giá lại, rồi so với lịch sử. Hai lần chạy (phiên bản 0 ngày 10/11, và mô hình đang phục vụ ở phiên bản 3 ngày 11/11) đều cho **độ lệch 0**. Đây là một kiểm thử có ý nghĩa, vì lúc đó silver đã đổi lược đồ và bronze đã nhận thêm 857 nghìn sự kiện.

Mỗi dòng `gold.ket_qua_ab` lưu phiên bản nhật ký đã đọc. Màn hình Tái lập tính lại đúng phiên bản đó, cũng cho độ lệch 0.
