# Sự cố vận hành và bài học kinh nghiệm {#sec:issues}

Một phần lớn công sức dành cho việc làm cho hệ thống chạy ổn định trên các máy phòng thí nghiệm dùng chung, ít bộ nhớ và nối với nhau qua Wi-Fi. Chương này ghi lại các vấn đề đã gặp, cách chẩn đoán và khắc phục, và những gì rút ra được. Mỗi bản sửa đều đi kèm một kiểm thử hồi quy khi vấn đề có thể tái hiện được ở máy cục bộ.

## Rà soát hạ tầng kế thừa {#sec:issues-review}

Trước khi viết mã mới, các kho mã sẵn có của nhóm (cụm Spark, Hadoop và Kafka trên Docker) được rà soát với mạng ZeroTier. @tab:ra-soat liệt kê các lỗi cấu hình tìm thấy. Nhiều lỗi trong số đó sẽ làm cụm nhiều máy hỏng theo những cách khó chẩn đoán, vì từng lỗi vẫn chạy được trên một máy.

Table: Các lỗi cấu hình tìm thấy trong cụm kế thừa {#tab:ra-soat w=4,26,36,34}
| # | Vị trí | Vấn đề | Cách sửa |
|---|---|---|---|
| 1 | Tệp compose của Spark worker | `--host 10.68.71.114` gán cứng cho mọi worker; địa chỉ này không thuộc máy nào | Mỗi worker quảng bá `NODE_IP` của chính nó lấy từ danh bạ |
| 2 | `hdfs-site.xml` của DataNode | `dfs.datanode.hostname` đặt là IP của master trên mọi DataNode: client tìm mọi khối trên máy master | Một tệp dùng chung với `${env.NODE_IP}` |
| 3 | Tệp compose của Kafka | Volume gắn tại `/var/lib/kafka/data` trong khi ảnh ghi vào `/tmp/kraft-combined-logs`: tạo lại container là mất mọi topic | `KAFKA_LOG_DIRS=/var/lib/kafka/data` |
| 4 | Tệp compose của Spark Master | Chỉ mở cổng 4041–4042: mỗi lúc chỉ một driver, nên ba luồng và một job theo lô không thể cùng tồn tại | Cổng 4041–4060 và 4140–4150, mỗi hồ sơ một cặp |
| 5 | `submit.sh` | `docker exec -it`: lỗi "the input device is not a TTY" khi Airflow gọi | `-i`, cộng thêm chế độ tách rời cho các luồng |
| 6 | `submit.sh` | `--packages io.delta…` ở mỗi lần nộp, không có bộ kết nối Kafka | JAR đóng sẵn vào ảnh `bd03/spark` |
| 7 | Ảnh `apache/spark:3.5.3` | Không có NumPy nên không nhập được `pyspark.ml` | Cài NumPy 1.24.4 vào ảnh |
| 8 | Các job học máy trước đây | `saveAsTable` khi không có metastore hay `fs.defaultFS`: bảng chỉ tồn tại trong một phiên, trên đĩa cục bộ | Gọi bảng theo đường dẫn HDFS (@sec:principles) |
| 9 | Job bronze trước đây | Tên cột tiếng Anh, không theo lược đồ của đặc tả | Lược đồ bronze mới trong thư mục mới, giữ dữ liệu cũ |
| 10 | Kho mã Hadoop bị trùng | Hai bộ dịch vụ giống hệt nhau với tên volume khác nhau | Một tệp compose, có tùy chọn dùng lại volume cũ |

## Các sự cố gặp trong phát triển và vận hành

@tab:loi liệt kê các sự cố gặp phải trong quá trình phát triển và vận hành đồ án, theo thứ tự xuất hiện. Sự cố 1–12 được phát hiện qua kiểm thử hoặc rà soát mã trước khi triển khai; sự cố 13–31 xuất hiện trên cụm.

Table: Các sự cố gặp trong phát triển và vận hành {#tab:loi w=4,46,50}
| # | Sự cố | Cách khắc phục |
|---|---|---|
| 1 | Một biểu thức Spark được tạo ở mức mô-đun trong job nạp: job chết ngay khi nhập vì chưa có SparkContext | Bọc trong một hàm được gọi lúc chạy |
| 2 | Dấu trừ một ngôi áp lên một cột đã đặt bí danh trong phép tính độ mới lạ làm sai tên cột | Đặt ngoặc trước khi đặt bí danh |
| 3 | Các Python worker không nhập được gói dùng chung | `PYTHONPATH` trong kiểm thử; `--py-files common.zip` trên cụm |
| 4 | Thư mục `airflow/` của dự án che mất gói `airflow` trong kiểm thử | Bỏ qua kiểm thử DAG khi chưa cài Airflow |
| 5 | Airflow 3.3 chuyển chỗ `DagBag` và bỏ phần tóm tắt timetable | Kiểm thử đọc trực tiếp `dag.schedule` |
| 6 | Dữ liệu thử ALS tổng hợp quá dễ: các baseline cũng đạt điểm tuyệt đối | Bốn cụm sở thích cộng nhiễu độ phổ biến |
| 7 | Một ô trong mẫu của nhóm B bị sai | Sửa mẫu và kiểm tra số ô thịnh hành |
| 8 | Hai ô nhập cùng tên trên trang chủ | Tách thành hai biểu mẫu |
| 9 | Hai job nộp cùng lúc có thể đọc phải `common.zip` đang ghi dở | Ghi ra tệp tạm rồi đổi tên nguyên tử |
| 10 | Thiếu mô hình phiên bản 2 (lọc giá) | Đã hiện thực (@sec:impl-v2) |
| 11 | DAG giám sát luồng ghi tệp cảnh báo vào một thư mục chưa tồn tại | Tạo thư mục trước |
| 12 | Script khởi động ghi đè `.env` của máy chủ web, làm mất mật khẩu Airflow | Tệp riêng theo máy `.env.rieng` được nối vào ở mỗi lần chạy |
| 13 | Địa chỉ RPC của NameNode là `0.0.0.0:8020` trong cấu hình dùng chung: DataNode tìm NameNode ở 0.0.0.0 | Quảng bá 10.68.71.113:8020, lắng nghe với `rpc-bind-host = 0.0.0.0` |
| 14 | Spark Master trong mạng bridge quảng bá `spark://0.0.0.0:7077` và từ chối các worker | Mạng host với `--host 10.68.71.113` |
| 15 | Sửa tệp XML HDFS được gắn vào không làm container được tạo lại | Truyền mã băm cấu hình qua một biến môi trường |
| 16 | Một job thất bại khi một DataNode bị treo hơn 60 giây: với nhân bản 1 không có bản sao nào khác, và cả bốn lần thử của task đều rơi vào cùng một máy | Nhân bản 2, thời gian chờ socket 180 giây, 8 lần thử cho mỗi task, script chạy lần đầu có thể tiếp tục |
| 17 | Hai máy cứ đi qua relay của ZeroTier dù LAN của chúng hoạt động; script đo phân loại nhầm một LAN chậm thành bị chặn | Chặn các giao diện Docker và Tailscale trong ZeroTier; so độ trễ ZeroTier với độ trễ LAN |
| 18 | Vấn đề tệp nhỏ ở silver: tới 64 tệp vài KB cho mỗi ngày (7.334 tệp cho 20.624 dòng mẫu); chuẩn bị ma trận mất 15 phút | Phân vùng lại theo cột phân vùng trước khi ghi: mỗi ngày một tệp (140 tệp cho 2,88 triệu dòng) |
| 19 | Ghi một giá trị trung bình kiểu số nguyên vào cột `DOUBLE` bị Spark từ chối | Ép số nguyên sang số thực theo DDL, cho mọi bảng |
| 20 | Phát lại dữ liệu lần hai sẽ làm hỏng silver: offset mới cho mã sự kiện mới, làm số đếm theo giờ tăng gấp đôi và biến người dùng thật thành bot | Khử trùng lặp theo nội dung trước bước lọc bot; tắt người dùng tổng hợp ở lần phát lại thứ hai |
| 21 | API server của Airflow khởi động lại liên tục: bộ quản lý xác thực mở tệp mật khẩu ở chế độ ghi nối, nhưng container chạy với UID 50000 | Chạy container với UID của chủ sở hữu dự án; tệp mật khẩu quyền 600 |
| 22 | Rủi ro thiết kế: bảo trì (OPTIMIZE/DELETE) và MERGE của luồng cùng ghi vào các bảng giống nhau; commit thứ hai thất bại và luồng dừng | Hàm thử lại cho ngoại lệ xung đột Delta trong cả hai luồng và job bảo trì |
| 23 | Lượt chạy hằng đêm không bao giờ thay được mô hình: lưới tối thiểu cố định alpha = 10 trong khi mô hình đang phục vụ dùng alpha = 40, nên tổ hợp tốt nhất của đêm luôn thua quá dung sai 1 %, kể cả với mô hình phiên bản 2 | Siêu tham số của mô hình đang phục vụ luôn được thêm vào lưới; một lượt chạy thủ công của DAG 1 có thể bỏ qua sensor dữ liệu |
| 24 | DAG A/B hằng giờ (thời gian chờ tối đa của lượt chạy 50 phút) thất bại hai lần khi task của nó chờ ô pool duy nhất đang bị pipeline hằng đêm giữ | Không mất dữ liệu: job tiếp tục từ phiên bản Change Data Feed đã xử lý gần nhất; ban ngày dùng hai ô |
| 25 | Ứng dụng web khởi động từ nhà bị treo khi đọc HDFS: mạng gia đình làm rơi các gói ZeroTier lớn (ping 1.300 byte qua được, ping 1.400 byte bị mất) | `ZT_MTU=1280` hạ MTU của giao diện ZeroTier trước khi dịch vụ khởi động |
| 26 | Máy chủ web đầu tiên (Ubuntu trong WSL2 trên laptop, 3,8 GB) sập hai lần khi build và khởi động container web vì Windows thiếu bộ nhớ; một lần sập làm hỏng ảnh nền trong bộ đệm | Vai trò web chuyển sang labsoe-18 trong LAN phòng thí nghiệm; `--chi=<vai trò>` khởi động một vai trò mà không tạo lại các dịch vụ khác của máy |
| 27 | Khởi động lại một luồng để lại một driver "xác sống": hủy ứng dụng qua Spark Master không dừng driver chế độ client, driver này về sau va với luồng mới trên cùng checkpoint và làm dừng cả hai luồng | `luong.sh dung` dừng luôn tiến trình driver; `khoi_dong` dọn driver còn sót trước; `trang_thai` cảnh báo |
| 28 | DAG bảo trì xóa các gợi ý cũ hơn *hôm nay* trừ 7 ngày, nên bảy ngày không có lần triển khai mới sẽ làm rỗng bảng phục vụ (đúng vào sáng hôm bảo vệ) | Mốc cắt nay là lần triển khai gần nhất trừ 7 ngày; chỉ xóa dòng của những người dùng vắng mặt trong các lần triển khai gần đây |
| 29 | Cả hai lần triển khai ngày 11 tháng 11 đều trộn danh sách khi producer đang dừng: cửa sổ thịnh hành mới nhất chỉ chứa một sản phẩm thử nghiệm, nên cả 265.043 danh sách lưu đều mang một sản phẩm thịnh hành duy nhất và các ô thịnh hành khác quay về sản phẩm bán chạy theo danh mục, đồng thời thổi phồng độ phủ đo được của bảng phục vụ | Khi cửa sổ mới nhất có ít hơn 30 sản phẩm, danh sách thịnh hành được bù bằng các sản phẩm xem nhiều nhất trong 24 giờ cuối, và job báo nguồn đã dùng; chạy lại trộn và công bố cho cùng mô hình |
| 30 | Sau khi thiết kế lại giao diện web, trình duyệt giữ bảng định kiểu cũ và các hình sản phẩm vẽ theo cách ánh xạ ngành hàng cũ, nên một số thẻ hiện hình quyển sách dưới tên "Tạ tay" | Tệp tĩnh được gọi kèm mã băm nội dung, và địa chỉ của mỗi hình chứa ngành hàng của nó, nên thẻ và hình không thể lệch nhau |
| 31 | Các thí nghiệm bổ sung ngày 11 tháng 11 chạy ngoài pool của Airflow. Hai thí nghiệm chồng lên nhau, rồi job A/B hằng giờ phải chờ executor đang bị lượt chạy validation giữ trong khi driver của nó chiếm bộ nhớ trên một máy master vốn đã phải dùng swap; SSH vào master hết thời gian chờ. Lượt chạy validation còn chậm hơn lần tinh chỉnh gốc năm đến sáu lần vì các bảng đáp án nhỏ dựng từ silver bị đẩy khỏi bộ nhớ đệm và bị tính lại từ HDFS ở mỗi phép đo | Dừng driver thừa và tạm dừng DAG A/B hằng giờ khi chạy thí nghiệm thủ công; mỗi lúc một job thủ công; gom tập đáp án về driver thành một bảng không mang lineage và chấm điểm mọi kỳ trong một lượt |

## Các sự cố tiêu biểu

### Một DataNode bị treo và hệ số nhân bản 1

Trong pipeline đầu tiên trên cụm, job thống kê sản phẩm thất bại với lỗi hết thời gian chờ socket khi đọc từ một DataNode. Dịch vụ ZeroTier của máy đó đã bị khởi động lại trong lúc job đang chạy, theo lời khuyên đưa ra khi chẩn đoán mạng, vốn đã giả định sai rằng việc khởi động lại không ảnh hưởng đến các job đang chạy. Với hệ số nhân bản 1, mọi khối của DataNode đó chỉ tồn tại ở đó; HDFS không có bản sao nào khác để đọc, và cả bốn lần thử của task Spark đều rơi vào cùng một máy. Cách khắc phục gồm bốn phần: hệ số nhân bản 2 cho HDFS và cho mọi lần ghi của Spark (dữ liệu chịu được việc mất một máy và có thể đọc ở chỗ khác), thời gian chờ socket 180 giây thay vì 60, tám lần thử cho mỗi task, và một script chạy lần đầu có thể tiếp tục từ bước bị lỗi mà không phải tinh chỉnh lại. Quy tắc được áp dụng từ đó rất đơn giản: không bao giờ khởi động lại dịch vụ mạng khi đang có job chạy.

### Đường mạng đi qua relay

Lần đo từng cặp máy đầu tiên cho thấy một số cặp liên lạc qua relay của ZeroTier, với độ trễ hàng trăm mili giây, dù các máy dùng chung một Wi-Fi. ZeroTier quảng bá mọi địa chỉ giao diện cục bộ làm đường đi ứng viên, kể cả các bridge của Docker, mà dải địa chỉ riêng chồng lấn nhau trên các máy khác nhau đã làm rối cơ chế dò đường. Một script nay thêm các giao diện Docker, bridge, veth và Tailscale vào `interfacePrefixBlacklist` của ZeroTier; sau đó 29 trên 30 cặp có hướng kết nối trực tiếp với tốc độ khoảng 3 MB/s, mức trần của Wi-Fi. Script đo cũng được sửa để so độ trễ ZeroTier với độ trễ LAN của chính cặp đó thay vì dùng một ngưỡng cố định.

### Vấn đề tệp nhỏ

Ghi silver bằng `partitionBy("ngay")` ngay sau một phép shuffle 64 phân vùng khiến mỗi task ghi một tệp cho mỗi ngày nó chứa: 7.334 tệp cho 20.624 dòng mẫu. Mỗi tệp tốn một lần tra cứu NameNode và một kết nối DataNode qua Wi-Fi, nên chuẩn bị ma trận mất 15 phút trên dữ liệu mẫu. Phân vùng lại theo cột phân vùng trước khi ghi cho ra mỗi ngày một tệp; trên dữ liệu thật, silver có 140 tệp cho 2,88 triệu dòng. Đây chính là áp lực lên NameNode đã khiến đồ án phân vùng theo ngày thay vì theo người dùng (@sec:data-model), được quan sát trực tiếp.

### Vận hành cụm từ ngoài khuôn viên trường

Từ nhà, kết nối SSH đến máy master bị treo ở bước trao đổi khóa (`expecting SSH2_MSG_KEX_ECDH_REPLY`) trong khi kết nối đến các máy khác vẫn được và ping gói lớn thất bại: một "hố đen" MTU trên đường đi đã làm rơi gói trao đổi khóa có kích thước lớn. Đi vòng qua một máy phòng thí nghiệm khác (`ProxyJump labsoe-18`) đã tránh được vấn đề. Các đường đi từ nhà cũng không ổn định: cùng một máy lúc vào được, lúc không, và bảy kết nối song song đều thất bại. Ba thay đổi giúp việc vận hành từ xa khả thi: mọi lệnh chạy lâu đều chạy trong `tmux` trên máy đích và ghi đầu ra vào tệp ở đó (một lần xuất kết quả truyền qua SSH đã bị mất khi kết nối rớt); việc phân phối mã thử lại `git push` khi có lỗi mạng; và một script trạng thái chỉ đọc (`tinh_trang.sh`) cho cái nhìn một màn hình về bộ nhớ, ứng dụng Spark và các lượt chạy Airflow mà không cần lồng dấu nháy. Chính hố đen này cũng ảnh hưởng máy chủ web đầu tiên: từ nhà, ping 1.300 byte đến master qua được còn ping 1.400 byte bị mất, nên việc đọc HDFS của ứng dụng web sẽ bị treo cho đến khi MTU của giao diện ZeroTier được hạ xuống 1.280 (sự cố 25). Máy chủ đó, Ubuntu trong WSL2 trên laptop điều khiển, sau đó sập hai lần vì thiếu bộ nhớ (sự cố 26), và ứng dụng web được chuyển sang labsoe-18, máy dùng chung LAN phòng thí nghiệm với các DataNode; từ ngoài trường, ứng dụng được mở qua một đường hầm SSH.

### Bộ nhớ trên máy master

Số đo trước khi bật Airflow cho thấy máy master chỉ còn 3,2 GB khả dụng, vì một máy chủ Cassandra không liên quan đến đồ án dùng 2,47 GB. Vì mọi driver PySpark chạy trên master (chế độ client), ba driver luồng (đo được khoảng 2,4 GB) và một driver theo lô không thể vừa cùng với Airflow. Ba biện pháp đã giải quyết: tạm dừng Cassandra trong thời gian làm đồ án với sự đồng ý của nhóm (dừng chứ không vô hiệu hóa, để có thể khởi động lại nguyên trạng); cấu hình Airflow tinh gọn khoảng 0,9 GB; và pool một ô để mỗi lúc có tối đa một driver theo lô. Phương án chuyển Airflow sang máy khác đã được cân nhắc và bị loại: driver vẫn phải nằm trên master vì các task nộp qua container Spark Master, và các máy worker chỉ còn dư khoảng 1 GB.

### Một pipeline hằng đêm không bao giờ triển khai

Lượt chạy theo lịch đầu tiên của DAG 1 trên dữ liệu thật (đêm 10 tháng 11) đã huấn luyện mô hình phiên bản 2 trên bảng silver đã tiến hóa rồi giữ mô hình cũ. Nguyên nhân là một lỗi thiết kế, không phải do dữ liệu. Lượt chạy hằng đêm dùng lưới tối thiểu, trong đó alpha cố định bằng 10 để tiết kiệm thời gian, trong khi mô hình đang phục vụ được chọn từ lưới đầy đủ với alpha = 40. Tổ hợp tốt nhất của đêm (rank 50, regParam 1,0, alpha 10) đạt NDCG@10 = 0,0574 so với 0,0680 của mô hình đang phục vụ, nên nhánh `giu_mo_hinh_cu` được chọn, và nhánh này sẽ được chọn mọi đêm bất kể dữ liệu thế nào, vì lưới hằng đêm không thể chứa cấu hình đang phục vụ. Dù vậy lượt chạy vẫn cho hai kết quả hữu ích: chín tổ hợp alpha = 10 tái tạo các giá trị trước đó đến bốn chữ số thập phân sau tiến hóa lược đồ và lần phát lại thứ hai gồm 857.072 sự kiện, xác nhận khử trùng lặp theo nội dung (sự cố 20) đã giữ silver nguyên vẹn; và ở cùng siêu tham số, bộ lọc giá của mô hình phiên bản 2 nâng NDCG@10 từ 0,0574 lên 0,0587 (+2,3 %) và độ phủ từ 2,49 % lên 2,70 %. Bản sửa (sự cố 23) thêm siêu tham số của mô hình đang phục vụ vào mọi lưới còn thiếu, để mô hình mới luôn được so với mô hình cũ ở cùng cấu hình cũng như ở các cấu hình mới. Hai lượt chạy kế tiếp xác nhận bản sửa: lượt theo lịch, được đánh thức lúc 05:22 bởi các cú nhấp web của phép thử vòng khép kín, và lượt thủ công lúc 06:09 đều thấy cấu hình được thêm vào là tốt nhất, bằng mô hình đang phục vụ, và đã triển khai mô hình phiên bản 2 (@sec:res-v2).

## Bài học kinh nghiệm

- **Đo trước khi định cỡ.** Mọi thiết lập bộ nhớ trong đồ án đều đến từ số đo trên chính các máy. Các ước lượng đưa ra trước khi đo (worker 8 GB, executor 3–4 GB) sẽ tạo ra một cụm mà không executor nào khởi động được.
- **Mặc định của hệ phân tán che giấu các giả định một máy.** Phần lớn lỗi kế thừa (máy gán cứng, địa chỉ quảng bá `0.0.0.0`, địa chỉ nội bộ của container) chạy được trên một máy và hỏng trên nhiều máy. Quảng bá IP mạng phủ ở mọi nơi và suy nó từ một danh bạ duy nhất đã loại bỏ cả một lớp lỗi.
- **Nhân bản không phải là tùy chọn trên phần cứng không tin cậy.** Hệ số nhân bản 1 tiết kiệm đĩa nhưng biến mọi trục trặc của một máy thành một job thất bại.
- **Tính lũy đẳng làm mọi thứ khác dễ hơn.** Vì mọi job đều chạy lại được an toàn, việc Airflow thử lại, các script có thể tiếp tục và việc chạy lại thủ công sau sự cố đều an toàn ngay từ thiết kế.
- **Tệp nhỏ là chi phí thật, không phải lời cảnh báo trong sách.** Phân vùng lại trước một lần ghi có phân vùng đã biến một bước 15 phút thành vài giây.
- **Tương tranh phải được thiết kế, không được mặc định.** Tương tranh lạc quan trong Delta là đúng nhưng từ chối các tiến trình ghi xung đột; các luồng chạy lâu cần thử lại tường minh khi bảo trì đụng đến cùng bảng.
- **Tái lập cần nhiều hơn time travel.** Nó còn cần tập đáp án nằm trong cùng phiên bản bảng, indexer ổn định, hạt giống cố định, tham số được ghi lại và thời gian lưu giữ dài hơn khoảng thời gian cần tái lập.
- **Mô hình đương nhiệm và mô hình thách đấu phải so được với nhau.** Một cổng triển khai tự động chỉ tốt bằng các ứng viên mà nó thấy: nếu lưới huấn luyện lại không tái tạo được cấu hình đang phục vụ, cổng sẽ âm thầm đóng băng mô hình.
- **Vận hành hệ thống từ xa theo kiểu bất đồng bộ.** Các lệnh sống lâu hơn một kết nối mạng thuộc về `tmux`, với đầu ra ghi vào tệp; một script trạng thái chỉ đọc mà không gây tác dụng phụ đáng được viết sớm.
