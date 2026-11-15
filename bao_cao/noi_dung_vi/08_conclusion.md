# Kết luận {#sec:conclusion}

## Tổng kết kết quả

Đồ án đã hoàn thành một hệ thống gợi ý trọn vẹn cho một sàn thương mại điện tử mô phỏng trên cụm sáu máy phòng thí nghiệm, bao phủ mọi thành phần của đặc tả: một Kafka producer phát lại sự kiện RetailRocket kèm người dùng mới tổng hợp; ba job Structured Streaming có checkpoint trên HDFS; một lakehouse Delta Lake gồm các lớp bronze, silver, features và gold, dùng MERGE, time travel, tiến hóa lược đồ, Change Data Feed, OPTIMIZE/Z-ORDER và phân vùng; một pipeline theo lô hằng đêm từ làm sạch đến công bố danh sách gợi ý; ALS cho phản hồi ngầm với lưới 27 tổ hợp, hai baseline, ba chiến lược khởi đầu lạnh và phiên bản 2 có lọc giá; một pipeline A/B gồm ghi lượt hiển thị, lưu lượng mô phỏng và kiểm định hai tỉ lệ; năm DAG Airflow; và một ứng dụng web có đủ năm màn hình theo yêu cầu. Hệ thống chạy trong các container Docker được cấu hình từ một tệp danh bạ cụm duy nhất và được bao phủ bởi 109 kiểm thử tự động.

Đối chiếu với các tiêu chí nghiệm thu, kết quả trên dữ liệu thật như sau:

- bảng tinh chỉnh gồm 27 tổ hợp; mô hình ALS tốt nhất đạt NDCG@10 = 0,0680, **+1.237 %** so với baseline bán chạy và +43 % so với baseline theo danh mục;
- độ phủ của mô hình là **3,44 %**, dưới mục tiêu 10 %; phân tích quy nguyên nhân cho thiên lệch độ phổ biến (99,2 % số ô thuộc 10 % sản phẩm phổ biến nhất) chứ không phải giới hạn cấu trúc, và phép xếp hạng lại theo độ mới lạ triển khai trong vận hành đồng thời nâng NDCG@10 lên 0,0865 và độ phủ lên 6,47 %; ở chế độ offline, dành ba ô cuối cho ứng viên đồng xuất hiện nâng độ phủ lên 14,5 %, vượt mục tiêu, và NDCG@10 lên 0,0892;
- sau tiến hóa lược đồ, lượt chạy hằng đêm theo lịch đã tự triển khai mô hình phiên bản 2; bộ lọc khoảng giá nâng NDCG@10 từ 0,0680 lên 0,0694 và độ phủ từ 3,44 % lên 3,72 %, một mức tăng nhỏ;
- thử nghiệm A/B mô phỏng với 350.160 lượt hiển thị cho thấy trộn 30 % sản phẩm thịnh hành làm CTR giảm từ 2,094 % xuống 1,978 % (p = 0,015), không có khác biệt về tỉ lệ chuyển đổi;
- Z-ORDER giảm số tệp phải đọc cho một lần tra cứu theo người dùng từ 67 xuống 1,07 và giảm độ trễ trung vị 8,4 lần so với chỉ nén tệp;
- DAG tái lập đã chạy lại thí nghiệm đã chọn trên phiên bản Delta 0 của bảng đặc trưng với độ lệch 0,000000, sau khi các bảng nguồn đã tiến hóa, và chạy lại mô hình đang triển khai trên phiên bản 3 với độ lệch 0;
- hai kiểm tra bổ sung xác nhận giao thức: chọn siêu tham số và β trên một kỳ validation riêng cho ra đúng cấu hình đang triển khai, cấu hình này vẫn hơn baseline theo danh mục +40 % (ALS) và +80 % (sau xếp hạng lại) trên các ngày giữ lại, với mức lạc quan chỉ 0,0002 về NDCG@10; và kiểm định chênh lệch A/B với đơn vị là người dùng cho p = 0,037 (bền vững theo cụm) và 0,029 (bootstrap).

Trên hệ thống đang chạy, một cú nhấp trên trang web đến bronze khoảng mười giây sau khi Kafka nhận và đến bảng thịnh hành sau 51 giây, trong mục tiêu 90 giây, và một người dùng tạo tại chỗ nhận đúng chiến lược dành cho người dùng hoàn toàn mới. Như vậy cả tám tiêu chí nghiệm thu đều đã được minh họa trên cụm; việc còn lại trước buổi bảo vệ là tập dượt đầy đủ kịch bản minh họa.

Ngày 15 tháng 11, sau khi đối chiếu toàn bộ với đề cương đồ án, nhóm bổ sung các mục còn thiếu của phần quy định chung:

- gốc hồ dữ liệu `/lakehouse/bd03_khuyen_nghi` và bảng `_quarantine` (A.4);
- minh chứng DESCRIBE HISTORY (A.6.2);
- thao tác ghi ngược trực tiếp từ web vào Delta (A.6.4);
- Deadline Alerts thay `sla` (A.6.5);
- backfill và đo độ trễ web (A.8);
- notebook EDA (A.5);
- khai báo sử dụng AI (A.9).

## Hạn chế

- **Độ phủ trong vận hành chưa đạt mục tiêu.** Không cấu hình ALS nào đạt độ phủ 10 %, vì phần lớn sản phẩm huấn luyện chỉ có một hai tương tác và vector ẩn yếu; danh sách đang phục vụ đạt 6,47 %. Tổ hợp đồng xuất hiện đạt 14,5 % mới chỉ được đánh giá ở chế độ offline.
- **Giao thức đánh giá.** Kết quả chính chọn siêu tham số, β và tập ứng viên trên tháng kiểm tra. Một kiểm tra trên kỳ validation riêng đã chọn cùng cấu hình với mức lạc quan không đáng kể, nhưng chỉ bao phủ 17 trong 27 tổ hợp, một phép chia duy nhất và chưa xét kích thước tập ứng viên.
- **Lưu lượng mô phỏng.** Kết luận A/B chỉ đúng trong các giả định của mô hình nhấp phụ thuộc vị trí, trong đó sản phẩm thịnh hành không được ưu đãi; nó không nói gì về người mua thật. Các lượt hiển thị của cùng một người dùng tương quan với nhau (hệ số thiết kế 1,36); các kiểm định theo người dùng vẫn giữ kết luận, với p-value khoảng 0,03 thay vì 0,015.
- **Thuộc tính thay thế.** Giá là giá trị tương đối đã ẩn danh và số sao là đại lượng thay thế suy từ tỉ lệ mua trên xem.
- **Điểm hỏng đơn lẻ.** NameNode, Spark Master, Kafka (một broker) và mọi driver chạy trên các máy đơn lẻ, và mọi driver dùng chung 7,4 GB của máy master.
- **Cá nhân hóa chỉ theo lô.** Danh sách cá nhân hóa thay đổi mỗi đêm một lần; chỉ khối thịnh hành và danh sách khởi đầu lạnh trong phiên phản ứng trong vài giây.

## Hướng phát triển

- **Triển khai các ô đồng xuất hiện**: thêm tổ hợp ở @sec:res-nguon (bảy ô phục vụ, ba ô đồng xuất hiện) vào job trộn trước bước áp mẫu A/B, thử bốn hoặc năm ô, và mở rộng lưới ALS (rank 100, alpha 80); sau đó lặp lại thử nghiệm A/B với danh sách mới.
- **Một giao thức validation đầy đủ**: cả 27 tổ hợp cộng rank 100 và alpha 80 trên kỳ validation, kích thước tập ứng viên, và nhiều phép chia cuốn chiếu thay vì một.
- **Phân tích độ nhạy của mô phỏng A/B** theo độ hấp dẫn của sản phẩm thịnh hành, để tìm điểm mà tại đó nhóm B hòa nhóm A, sau đó kiểm định trên lưu lượng thật nếu có thể.
- **Mô hình theo phiên và tăng dần**: bổ sung tương tác mới giữa các lượt chạy hằng đêm, hoặc một mô hình chuỗi cho các phiên ngắn, vốn chiếm đa số trong RetailRocket.
- **Tính sẵn sàng cao và năng lực**: một máy điều phối riêng cho Airflow và các driver theo lô, NameNode HDFS có tính sẵn sàng cao, và một cụm Kafka ba broker.
- **Giám sát**: xuất chỉ số của Spark, Kafka và Airflow sang một bảng điều khiển chuỗi thời gian và cảnh báo về độ trễ của luồng và độ mới của dữ liệu thay vì một tệp nhật ký.
