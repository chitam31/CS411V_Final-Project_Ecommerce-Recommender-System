# Giới thiệu {#sec:intro}

## Tổng quan đồ án {#sec:overview}

Các sàn thương mại điện tử bán nhiều sản phẩm hơn rất nhiều so với những gì một khách truy cập có thể tự duyệt hết. Một sàn có 1,4 triệu khách truy cập và 235.000 sản phẩm, đúng như kịch bản của đồ án này, không thể chỉ trông vào ô tìm kiếm và menu danh mục: phần lớn sản phẩm sẽ không bao giờ được nhìn thấy nếu cửa hàng không đưa chúng đến đúng người vào đúng lúc. Hệ thống gợi ý lấp khoảng trống đó. Chúng biến dấu vết nhấp chuột của khách thành các danh sách sản phẩm đã xếp hạng mà mỗi khách nhiều khả năng sẽ muốn, và là một trong những đòn bẩy doanh thu chính của thương mại điện tử.

Đề bài (Đề tài 3, mã đồ án `bd03_khuyen_nghi`) yêu cầu xây dựng một hệ thống gợi ý cho một sàn như vậy, dựng trên các công cụ dữ liệu lớn và được đánh giá chặt chẽ như một hệ thống công nghiệp. Sàn cần bốn thứ:

- khối **"Dành cho bạn"** cá nhân hóa trên trang chủ;
- khối **"Sản phẩm liên quan"** trên mỗi trang sản phẩm;
- khối **"Đang thịnh hành"** theo sát hoạt động theo thời gian thực (cửa sổ 15 phút);
- cách **đo xem chiến lược gợi ý nào mang lại nhiều lượt nhấp hơn** bằng thử nghiệm A/B, và **tái lập** được kết quả của bất kỳ thí nghiệm nào trong quá khứ khi có nghi vấn.

Ba khó khăn làm cho bài toán sát thực tế. Dữ liệu là **phản hồi ngầm**: cửa hàng chỉ ghi lại sự kiện xem, thêm vào giỏ và mua, không bao giờ có điểm đánh giá tường minh, nên mô hình phải suy ra sở thích từ hành vi. **Khởi đầu lạnh** xuất hiện khắp nơi: khách mới hoàn toàn không có lịch sử, đa số khách chỉ có vài sự kiện, và sản phẩm mới chưa từng được nhấp. Cuối cùng, **thiên lệch độ phổ biến** đẩy lọc cộng tác về phía cùng một nhóm sản phẩm bán chạy cho mọi người, gây hại cho cả khả năng khám phá lẫn doanh số của phần đuôi dài.

Đồ án dùng bộ dữ liệu công khai **RetailRocket Recommender System Dataset** [14]: 2,76 triệu sự kiện (`view`, `addtocart`, `transaction`) của khoảng 1,4 triệu khách truy cập trong 4,5 tháng (tháng 5 đến tháng 9 năm 2015), kèm các thuộc tính sản phẩm có dấu thời gian và một cây danh mục. Vì một tệp tĩnh không thể kiểm tra được một hệ thống luồng, một producer phát lại các sự kiện vào Kafka theo đúng thứ tự gốc, nén một ngày thành 30 giây, và thêm 5 % sự kiện của người dùng mới tổng hợp để các nhánh khởi đầu lạnh được chạy thật.

Kết quả là một pipeline hoàn chỉnh, trình bày ở @fig:arch, trải từ thu nhận dữ liệu, xử lý luồng và xử lý theo lô, một lakehouse Delta Lake trên HDFS, huấn luyện và đánh giá mô hình, một ứng dụng web đóng vai sàn thương mại, đến điều phối luồng công việc bằng Airflow. Toàn bộ chạy trên một cụm sáu máy phòng thí nghiệm, mỗi máy 7 GB RAM, một ràng buộc đã định hình nhiều quyết định thiết kế.

## Mục tiêu {#sec:objectives}

Các mục tiêu bám theo đặc tả của đề bài (mục 3.1 đến 3.11) và chia thành năm nhóm.

**O1 – Nền tảng dữ liệu.** Xây dựng lakehouse gồm các lớp bronze, silver, features và gold trên HDFS và Delta Lake, nạp từ Kafka; giữ đúng lược đồ bảng của đặc tả (mục 3.4); dùng MERGE, time travel, tiến hóa lược đồ, Change Data Feed, OPTIMIZE/Z-ORDER và phân vùng ở những chỗ đặc tả yêu cầu (mục 3.7).

**O2 – Xử lý luồng.** Nạp luồng sự kiện vào bronze với checkpoint trên HDFS, và duy trì bảng thịnh hành với cửa sổ trượt 15 phút, bước trượt 1 phút và watermark 2 phút, ghi bằng `outputMode("update")` và MERGE, đủ nhanh để một cú nhấp trên web xuất hiện trong khối thịnh hành trong vòng 90 giây.

**O3 – Mô hình gợi ý.** Huấn luyện ALS với `implicitPrefs = true` trên ma trận tương tác có suy giảm theo thời gian; tinh chỉnh ít nhất 9 tổ hợp của `rank ∈ {10, 30, 50}`, `regParam ∈ {0.01, 0.1, 1.0}`, `alpha ∈ {1, 10, 40}`; chia dữ liệu theo thời gian (bốn tháng đầu để huấn luyện, tháng cuối để kiểm tra); báo cáo Precision@10, Recall@10, NDCG@10, MAP@10, độ phủ và độ mới lạ; so sánh với hai baseline; hiện thực ba chiến lược khởi đầu lạnh; và bổ sung mô hình phiên bản 2 dùng cột giá được thêm bằng tiến hóa lược đồ.

**O4 – Thực nghiệm.** Phân người dùng vào nhóm A (ALS thuần) và nhóm B (ALS trộn 30 % sản phẩm thịnh hành) bằng một hàm băm ổn định; ghi lại mọi lượt hiển thị; tính CTR và tỉ lệ chuyển đổi của từng nhóm bằng kiểm định z hai tỉ lệ; và bảo đảm mọi kết quả đều tái lập được từ đúng phiên bản Delta của dữ liệu đã dùng để tính.

**O5 – Vận hành.** Điều phối hệ thống bằng năm DAG Airflow (pipeline hằng ngày, giám sát luồng, tính A/B hằng giờ, bảo trì hằng đêm, tái lập thủ công), và cung cấp một ứng dụng web năm màn hình: trang chủ, trang sản phẩm, bảng điều khiển A/B, chất lượng mô hình và tái lập thí nghiệm.

@tab:nghiem-thu liệt kê các tiêu chí nghiệm thu đo được. Hai ngưỡng của mô hình lấy nguyên văn từ đặc tả: NDCG@10 của ALS phải cao hơn baseline bán chạy ít nhất 30 %, và độ phủ danh mục phải đạt ít nhất 10 %.

Table: Danh mục nghiệm thu của đề bài (mục 3.11) {#tab:nghiem-thu w=6,58,36}
| # | Tiêu chí | Nơi trình bày trong báo cáo |
|---|---|---|
| 1 | Bảng tinh chỉnh với ít nhất 9 tổ hợp ALS và NDCG@10 | @sec:res-tuning |
| 2 | ALS so với 2 baseline trên 4 chỉ số xếp hạng cùng độ phủ và độ mới lạ | @sec:res-baselines |
| 3 | 3 chiến lược khởi đầu lạnh hoạt động, minh họa bằng một người dùng tạo tại chỗ | @sec:impl-blend, @sec:res-checklist |
| 4 | Khối thịnh hành cập nhật trong vòng 90 giây sau một cú nhấp trên web | @sec:impl-streaming, @sec:res-streaming |
| 5 | Vòng khép kín: một cú nhấp trên web đến được Kafka, bronze và bảng thịnh hành | @sec:flow, @sec:res-streaming |
| 6 | Kết quả A/B có p-value và kết luận thống kê | @sec:res-ab |
| 7 | Minh họa tái lập bằng `VERSION AS OF` cho ra cùng chỉ số | @sec:res-repro |
| 8 | Số liệu OPTIMIZE/Z-ORDER cho truy vấn tra cứu danh sách gợi ý của một người dùng | @sec:res-zorder |

## Phạm vi {#sec:scope}

**Trong phạm vi.** Đồ án bao trọn đường đi từ sự kiện thô đến gợi ý hiển thị trên trang web: Kafka producer, ba job luồng, pipeline theo lô (làm sạch, thống kê, sản phẩm liên quan, chuẩn bị ma trận, tinh chỉnh, đánh giá, sinh danh sách phục vụ, trộn, công bố), pipeline A/B (ghi lượt hiển thị, lưu lượng mô phỏng, tổng hợp và kiểm định), bảo trì Delta Lake, năm DAG Airflow, ứng dụng web, các script triển khai cụm, và bộ kiểm thử tự động gồm 139 kiểm thử chạy trên một phiên Spark cục bộ.

**Ngoài phạm vi.** Đồ án không xử lý tài khoản người dùng, thanh toán hay trình biên tập danh mục sản phẩm; ứng dụng web chỉ mô phỏng các trang mua sắm cần thiết để sinh sự kiện và lượt hiển thị sát thực tế. Không thử các mô hình gợi ý học sâu hay cập nhật mô hình trực tuyến (tăng dần): ALS được huấn luyện lại theo lô mỗi đêm, đúng như đặc tả yêu cầu. Không dùng dịch vụ đám mây nào; toàn bộ hệ thống chạy trên các máy phòng thí nghiệm.

**Giả định và ràng buộc.**

- *Dữ liệu.* Thuộc tính sản phẩm của RetailRocket đã được ẩn danh. Thuộc tính `790`, thường được dùng làm giá, là một số đã biến đổi và chỉ có ý nghĩa khi so sánh tương đối; bộ dữ liệu không có số sao đánh giá, nên cột `xep_hang_sao` thêm bằng tiến hóa lược đồ là một đại lượng thay thế tính từ tỉ lệ mua trên xem (@sec:impl-v2).
- *Lưu lượng.* Không có đủ khách thật để thử nghiệm A/B đạt độ mạnh thống kê, nên phần lớn lượt hiển thị được mô phỏng bằng một mô hình nhấp phụ thuộc vị trí, như đặc tả cho phép (mục 3.10). Mọi dòng mô phỏng đều được gắn nhãn và bảng điều khiển hiển thị tỉ lệ mô phỏng.
- *Phần cứng.* Sáu máy phòng thí nghiệm dùng chung, mỗi máy 12 lõi logic và 7 GB RAM, trong đó một máy còn chạy phần mềm của nhóm khác; mạng Wi-Fi giữa các máy; không có quyền quản trị ngoài những gì phòng thí nghiệm cho phép. Mọi thiết lập bộ nhớ đều được định cỡ từ số đo trên chính các máy này (@sec:infra).
- *Giao thức đánh giá.* Siêu tham số được chọn ngay trên tháng kiểm tra, không có kỳ validation riêng. Cách làm này phổ biến trong bài tập học phần nhưng làm các chỉ số báo cáo hơi lạc quan; báo cáo nêu rõ điều này ở những chỗ quan trọng (@sec:res-tuning), và @sec:res-val lặp lại việc chọn trên một kỳ validation riêng: kết quả chọn đúng cấu hình cũ, mức lạc quan không đáng kể.

## Bố cục báo cáo

@sec:background tóm tắt các lý thuyết mà hệ thống dựa vào: ALS cho phản hồi ngầm, các chỉ số xếp hạng, lakehouse và Delta Lake, Spark và Structured Streaming, Kafka, HDFS, Airflow và thử nghiệm có đối chứng. @sec:architecture trình bày kiến trúc: nguyên tắc thiết kế, thiết kế tổng thể, hạ tầng cụm máy, đường đi của tác vụ và dữ liệu qua pipeline, và mô hình dữ liệu. @sec:config giải thích cách quản lý cấu hình từ một tệp danh bạ cụm duy nhất. @sec:impl mô tả phần hiện thực hạ tầng, từng job Spark, các DAG Airflow, ứng dụng web, pipeline A/B và bộ kiểm thử. @sec:results báo cáo kết quả thực nghiệm trên dữ liệu thật, đối chiếu với các tiêu chí nghiệm thu. @sec:issues ghi lại các sự cố gặp phải khi chạy trên cụm phòng thí nghiệm dùng chung và các bài học rút ra. @sec:conclusion kết luận và nêu hướng phát triển. Các phụ lục trình bày cấu trúc kho mã, sổ tay vận hành, kịch bản minh họa và ma trận truy vết từng yêu cầu.
