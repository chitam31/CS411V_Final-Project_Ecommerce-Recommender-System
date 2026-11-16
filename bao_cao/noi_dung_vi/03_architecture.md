# Kiến trúc hệ thống {#sec:architecture}

## Nguyên tắc thiết kế {#sec:principles}

Sáu nguyên tắc định hướng kiến trúc. Chúng lặp lại trong suốt phần hiện thực và giải thích phần lớn các lựa chọn được mô tả về sau.

1. **Tái sử dụng cụm máy sẵn có của nhóm thay vì dựng lại.** Nhóm đã có các cụm Hadoop, Spark và Kafka chạy bằng Docker từ các bài tập trước. Đồ án giữ nguyên phiên bản phần mềm (Spark 3.5.3, Hadoop 3.5.0, Kafka 3.7.2), tên container, tên dự án compose, volume và cổng, chỉ sửa các lỗi cấu hình phát hiện được khi rà soát (@sec:issues-review).
2. **Gọi bảng theo đường dẫn, không theo tên.** Cụm Spark standalone không có Hive Metastore, nên một tên như `silver.tuong_tac` không tồn tại qua các phiên Spark. Tên bảng logic chỉ là khóa trong một sổ đăng ký (`jobs/common/cau_hinh.py`) ánh xạ mỗi tên sang một đường dẫn HDFS; các câu lệnh SQL gọi bảng bằng đường dẫn, dưới dạng `delta.<đường dẫn>` với đường dẫn `hdfs://10.68.71.113:8020/lake/silver/tuong_tac` đặt trong dấu nháy.
3. **Mọi job đều lũy đẳng.** Chạy lại một job cho ra cùng kết quả: bronze sang silver ghi đè đúng các phân vùng ngày bị ảnh hưởng bằng `replaceWhere`, các bảng gold được ghi bằng MERGE hoặc ghi đè toàn bộ với các bảng trung gian. Nhờ vậy Airflow có thể thử lại bất kỳ task nào một cách an toàn.
4. **Mọi commit đều mang siêu dữ liệu.** Trường `userMetadata` của mỗi commit Delta ghi mã lượt chạy, ngày cắt và phiên bản của các bảng nguồn. Đây là cầu nối giữa một kết quả và chính xác dữ liệu đã tạo ra nó, và là nền tảng của khả năng tái lập.
5. **Mỗi phần logic chỉ có một cách hiện thực.** Trộn gợi ý, tổng hợp A/B, các chỉ số và kiểm định thống kê nằm trong gói dùng chung `jobs/common/` và được dùng bởi các job theo lô, ứng dụng web, các job tái lập và các kiểm thử. Vì thế một lần tái lập chắc chắn dùng đúng công thức của lần chạy gốc.
6. **Một job báo kết quả ở dòng cuối của đầu ra chuẩn, dưới dạng JSON.** Airflow đọc dòng này qua XCom để rẽ nhánh, và con người đọc nó trong nhật ký.

## Thiết kế tổng thể {#sec:hld}

![Kiến trúc tổng thể của hệ thống, tổ chức thành sáu lớp](hinh/f01_tong_the.png){#fig:arch w=15.8 h=19}

@fig:arch trình bày hệ thống gồm sáu lớp. Dữ liệu đi vào từ các tệp RetailRocket, từ producer phát lại và từ người mua trên ứng dụng web. Kafka tách các nguồn này khỏi phần xử lý. Ba job Structured Streaming luôn chạy tiêu thụ các topic: một job đưa sự kiện thô vào bronze, một job duy trì điểm thịnh hành trong gold, một job ghi lượt hiển thị vào gold. Lakehouse trên HDFS chứa các lớp bronze, silver, features và gold cùng các mô hình đã huấn luyện. Một pipeline theo lô chạy hằng đêm chuyển bronze thành silver, dựng ma trận tương tác, tinh chỉnh và đánh giá ALS, rồi công bố các danh sách gợi ý đã trộn; các job hằng giờ và hằng đêm tính kết quả A/B và bảo trì các bảng Delta. Airflow lập lịch toàn bộ công việc theo lô, còn ứng dụng web FastAPI đọc các bảng gold để dựng trang, trong khi mọi cú nhấp mà nó ghi nhận lại chảy ngược về Kafka.

@tab:thanh-phan liệt kê các thành phần, công nghệ và phiên bản của từng thành phần cùng vai trò của nó. Mọi phiên bản đều được cố định trong ảnh Docker để mọi máy chạy đúng cùng một phần mềm.

Table: Các thành phần của hệ thống {#tab:thanh-phan w=19,24,57}
| Lớp | Công nghệ | Vai trò trong hệ thống |
|---|---|---|
| Nguồn | Bộ dữ liệu RetailRocket (Kaggle) | 2,76 triệu sự kiện, thuộc tính sản phẩm theo thời gian, cây danh mục; tải về laptop điều khiển rồi chép lên cụm |
| Nguồn | Producer Python (`kafka-python`) | Phát lại `events.csv` theo thứ tự thời gian, 1 ngày = 30 giây, thêm 5 % người dùng mới |
| Thu nhận | Apache Kafka 3.7.2, KRaft | Topic `retailrocket-events` và `hien-thi`, mỗi topic 3 phân vùng, broker trên labsit |
| Xử lý luồng | Spark 3.5.3 Structured Streaming | `nap_su_kien`, `tinh_thinh_hanh`, `ghi_hien_thi` với checkpoint trên HDFS |
| Lưu trữ | HDFS 3.5.0 | 1 NameNode, 5 DataNode, nhân bản 2; lưu mọi bảng, checkpoint và mô hình |
| Định dạng bảng | Delta Lake 3.2.0 | Bảng ACID với MERGE, time travel, tiến hóa lược đồ, CDF, OPTIMIZE/Z-ORDER |
| Theo lô và học máy | Spark 3.5.3 + MLlib | Làm sạch, thống kê, chuẩn bị ma trận, tinh chỉnh và đánh giá ALS, sinh danh sách phục vụ |
| Điều phối | Apache Airflow 3.3.1, LocalExecutor, PostgreSQL 16 | 5 DAG; các task gọi `submit.sh`, script này chạy `spark-submit` trong container Spark Master |
| Phục vụ | FastAPI + Jinja2 + Spark cục bộ | 5 màn hình và một API JSON; đọc Delta trực tiếp từ HDFS, ghi sự kiện vào Kafka |
| Hạ tầng | Docker Compose, ZeroTier, Bash | Mỗi dịch vụ một tệp compose; các script sinh cấu hình và điều khiển mọi máy qua SSH |

## Hạ tầng cụm máy {#sec:infra}

### Máy và vai trò

Cụm gồm sáu máy phòng thí nghiệm, một trong số đó còn chạy ứng dụng web, tất cả là thành viên của mạng ZeroTier `ttunet` (@fig:cluster). Mỗi máy phòng thí nghiệm có 12 lõi logic và 7 GB RAM, khiến bộ nhớ chứ không phải CPU là ràng buộc then chốt. Vai trò được gán trong một tệp danh bạ duy nhất, `cau_hinh/cum.env` (@sec:config), tóm tắt ở @tab:may.

![Triển khai vật lý: máy, container, cổng và tài nguyên](hinh/f02_cum.png){#fig:cluster w=15.8}

Table: Các máy của cụm và vai trò {#tab:may w=17,15,40,14,14}
| Máy | IP ZeroTier | Vai trò và container | Lõi Spark | Bộ nhớ Spark |
|---|---|---|---|---|
| labsoe-11 | 10.68.71.113 | NameNode, Spark Master, mọi driver Spark, Airflow | – | – |
| labsit12 | 10.68.71.198 | DataNode, Spark Worker | 8 | 3 GB |
| labsit | 10.68.71.204 | DataNode, Spark Worker, broker và giao diện Kafka, producer phát lại | 6 | 2 GB |
| labsit-may25 | 10.68.71.42 | DataNode, Spark Worker (dùng chung với dịch vụ của nhóm khác) | 4 | 2 GB |
| labsit-may26 | 10.68.71.90 | DataNode, Spark Worker (dùng chung với Airflow worker của nhóm khác) | 8 | 3 GB |
| labsoe-18 | 10.68.71.149 | DataNode, Spark Worker, ứng dụng web (FastAPI với Spark cục bộ), máy trung gian SSH | 8 | 3 GB |

Bộ nhớ được định cỡ từ số đo lấy bằng `scripts/cum/khao_sat_may.sh` ngày 10 tháng 11 năm 2026 theo một quy tắc đơn giản: dành khoảng 2 GB cho Ubuntu và giao diện đồ họa, 1 GB cho DataNode và bộ nhớ của mọi dịch vụ khác trên máy, phần còn lại cho Spark worker. Executor của các job theo lô dùng 2 GB, nên một worker phải cung cấp ít nhất 2 GB, nếu không sẽ không bao giờ nhận được executor. Các máy dùng chung với nhóm khác được cấp ít hơn. Tổng các worker là **34 lõi và 13 GB bộ nhớ executor**.

### Mạng

ZeroTier tạo một mạng lớp 2 ảo (10.68.71.0/24) phủ lên mạng vật lý mà mỗi máy đang dùng; trong phòng thí nghiệm đó là Wi-Fi LabSoe (192.168.80.0/24). Mọi dịch vụ đều quảng bá địa chỉ ZeroTier của mình: Spark worker khởi động với `--host $NODE_IP` ở chế độ mạng host để executor trên máy khác kết nối được; DataNode đặt `dfs.datanode.hostname` là IP ZeroTier và client đặt `dfs.client.use.datanode.hostname = true`, để driver, executor và ứng dụng web nối tới DataNode bằng địa chỉ ZeroTier thay vì địa chỉ nội bộ của container; NameNode quảng bá `10.68.71.113:8020` trong khi lắng nghe ở `0.0.0.0` bên trong container dùng mạng bridge.

ZeroTier nối hai máy hoặc *trực tiếp* (ngang hàng qua mạng LAN) hoặc qua *trạm chuyển tiếp* (relay). Đường đi qua relay có độ trễ cao hơn và thông lượng thấp hơn. Một script (`do_mang.sh`) đo mọi cặp máy, so sánh thời gian khứ hồi qua ZeroTier với thời gian khứ hồi qua LAN và báo cặp nào đang đi qua relay. Kết quả cho thấy các giao diện mạng của Docker và Tailscale làm rối cơ chế dò đường của ZeroTier; đưa các giao diện này vào danh sách chặn trong `local.conf` của ZeroTier đã đưa 29 trên 30 cặp có hướng về kết nối trực tiếp với tốc độ khoảng 3 MB/s, mức trần của Wi-Fi (@sec:issues).

### Hồ sơ tài nguyên Spark

Trên cụm standalone, ứng dụng đến trước sẽ lấy mọi lõi đang rảnh nếu không đặt `spark.cores.max`. Vì vậy mọi job đều được nộp qua một script duy nhất, `ha_tang/spark/submit.sh`, kèm một *hồ sơ* cố định số lõi, bộ nhớ executor và driver, số phân vùng shuffle và các cổng của driver (@tab:ho-so). Mỗi hồ sơ có cổng driver và block manager riêng (4041–4060) và cổng giao diện riêng (4140–4150), để tối đa mười driver chạy cạnh nhau trong cùng một container mà không xung đột cổng.

Table: Các hồ sơ nộp job Spark (ha_tang/spark/submit.sh) {#tab:ho-so w=15,31,12,10,11,10,11}
| Hồ sơ | Dùng cho | cores.max | Lõi / executor | Bộ nhớ executor | Bộ nhớ driver | Shuffle |
|---|---|---|---|---|---|---|
| `nap` | luồng nạp sự kiện (luôn chạy) | 1 | 1 | 768 MB | 512 MB | 4 |
| `thinh_hanh` | luồng thịnh hành, kho trạng thái RocksDB | 2 | 2 | 1 GB | 768 MB | 8 |
| `hien_thi` | luồng lượt hiển thị | 1 | 1 | 768 MB | 640 MB | 4 |
| `lo` | các job theo lô thông thường | 8 | 2 | 2 GB | 1 GB | 64 |
| `als` | tinh chỉnh, đánh giá, sinh danh sách phục vụ | 10 | 2 | 2 GB | 1,5 GB | 64 |
| `bao_tri` | OPTIMIZE, Z-ORDER, VACUUM | 4 | 2 | 1,5 GB | 1 GB | 32 |
| `tai_lap` | DAG tái lập | 10 | 2 | 2 GB | 1,5 GB | 64 |
| `nhanh` | kiểm tra nhỏ và xuất dữ liệu | 2 | 1 | 768 MB | 640 MB | 8 |

Ba luồng giữ cố định bốn lõi; ba mươi lõi còn lại dành cho các job theo lô. Các thiết lập chung thêm vào mọi hồ sơ đến từ các sự cố trên cụm: thời gian chờ socket của client HDFS 180 giây, tối đa tám lần thử cho một task, thời gian chờ mạng 300 giây và số lần thử lại shuffle dài hơn, để một liên kết Wi-Fi chậm hoặc một DataNode bị treo trong chốc lát không làm hỏng cả job.

### Bộ nhớ của máy master

Vì driver PySpark chạy ở chế độ client bên trong container `spark-master`, máy master gánh NameNode, Spark Master, Airflow và *mọi* driver. @fig:ram trình bày hai lần đo. Trước khi triển khai, một máy chủ Cassandra không liên quan đến đồ án chiếm 2,47 GB, chỉ còn 3,2 GB khả dụng: đủ cho Airflow và một job theo lô nhưng không đủ cho ba driver luồng. Với sự đồng ý của nhóm, dịch vụ này được tạm dừng trong thời gian làm đồ án (dừng chứ không vô hiệu hóa). Với Airflow ở cấu hình tinh gọn (khoảng 0,9 GB), ba driver luồng và một job tái lập chạy cùng lúc, vẫn còn 1,8 GB khả dụng. Một pool Airflow chỉ có một ô bảo đảm tại mỗi thời điểm có tối đa một driver theo lô.

![Bộ nhớ của máy master trước khi triển khai và khi mọi dịch vụ đang chạy](hinh/c07_ram_master.png){#fig:ram w=15}

## Định tuyến tác vụ và luồng dữ liệu qua pipeline {#sec:flow}

Dữ liệu đi theo ba đường với độ trễ rất khác nhau: **đường luồng** (vài giây), **đường theo lô** (hằng đêm) và **đường phục vụ** cùng vòng khép kín quay về Kafka. Mục này mô tả từng đường, rồi đến cách một job Spark được định tuyến từ Airflow tới các executor.

### Đường luồng

Producer phát lại trên máy Kafka và ứng dụng web công bố các thông điệp JSON vào topic `retailrocket-events`, với khóa là mã khách truy cập. Mỗi thông điệp giữ năm trường của dữ liệu gốc (thời điểm, khách, sự kiện, sản phẩm, giao dịch) cộng thêm trường `nguon` (`phat_lai` cho sự kiện phát lại, `nguoi_moi` cho người dùng mới tổng hợp, `web` cho cú nhấp trên ứng dụng web). Hai job luồng đọc cùng topic này một cách **độc lập**:

- `nap_su_kien` (kích hoạt mỗi 15 giây) chuyển mỗi thông điệp sang lược đồ bronze, bổ sung danh mục sản phẩm và ghi nối dưới dạng Parquet phân vùng theo ngày;
- `tinh_thinh_hanh` (kích hoạt mỗi 20 giây) đếm lượt xem và lượt thêm vào giỏ của từng sản phẩm trên các cửa sổ trượt và upsert điểm vào `gold.thinh_hanh_15p`.

Vì job thịnh hành không đợi bronze, độ trễ của khối thịnh hành không bao gồm độ trễ ghi bronze. Lượt hiển thị và cú nhấp đi vào topic `hien-thi`, được `ghi_hien_thi` (kích hoạt mỗi 30 giây) tiêu thụ và upsert vào nhật ký hiển thị. @sec:impl-streaming trình bày chi tiết ba job.

### Đường theo lô

DAG hằng ngày (@fig:dag1) bắt đầu bằng một sensor kiểm tra, qua WebHDFS và không cần khởi động Spark, xem bronze đã nhận được một batch mới hơn commit silver gần nhất hay chưa. Sau đó DAG tạo mã lượt chạy, làm sạch bronze thành silver, tính thống kê sản phẩm và sản phẩm liên quan, chuẩn bị ma trận tương tác, tinh chỉnh ALS, đánh giá rồi rẽ nhánh: nếu mô hình mới ít nhất tốt bằng mô hình đang phục vụ (trong dung sai 1 %), DAG sinh danh sách phục vụ, trộn và công bố bằng MERGE; nếu không, DAG giữ danh sách hiện tại và phát cảnh báo. Mỗi khối trong @fig:dag1 ghi trong ngoặc vuông hồ sơ Spark mà task đó dùng.

![DAG pipeline hằng ngày kn_pipeline_hang_ngay; hồ sơ của mỗi task Spark ghi trong ngoặc vuông](hinh/f05_dag1.png){#fig:dag1 w=10.6}

### Đường phục vụ và vòng khép kín

Ứng dụng web đọc các bảng gold bằng một phiên Spark cục bộ (`local[2]`) và không bao giờ ghi vào Delta (@fig:loop). Khi dựng trang chủ, ứng dụng xác định nhóm A/B của người dùng, đọc danh sách của người dùng từ `gold.goi_y_nguoi_dung`, thay các ô thịnh hành bằng cửa sổ thịnh hành mới nhất, và công bố một thông điệp hiển thị cho mỗi ô được hiển thị vào `hien-thi`. Khi người dùng bấm *Xem*, *Thêm vào giỏ* hoặc *Mua* trên trang sản phẩm, ứng dụng công bố sự kiện vào `retailrocket-events` và một thông điệp nhấp hoặc mua vào `hien-thi`. Sự kiện đến bảng thịnh hành sau một hoặc hai micro-batch và đến bronze trong vòng 15 giây; nó ảnh hưởng đến mô hình cá nhân hóa ở lượt chạy đêm kế tiếp. Nhật ký hiển thị, có bật Change Data Feed, cung cấp dữ liệu cho job A/B hằng giờ mà bảng điều khiển hiển thị kết quả; màn hình tái lập tổng hợp lại nhật ký hiển thị tại đúng phiên bản được ghi kèm mỗi kết quả.

![Vòng khép kín giữa ứng dụng web, Kafka, các job luồng và pipeline A/B](hinh/f08_vong_khep_kin.png){#fig:loop w=15.8}

### Định tuyến một job Spark {#sec:routing}

Mọi job Spark, dù khởi động bởi Airflow, bởi một script hay bằng tay, đều đi theo cùng một đường (@fig:route):

1. Task Airflow (một `BashOperator`) chạy `ha_tang/spark/submit.sh <hồ sơ> <job> [tham số]`. Script đóng gói `jobs/common/` thành `common.zip`, ghi ra một tệp tạm rồi đổi tên một cách nguyên tử, để hai job nộp cùng lúc không bao giờ đọc phải một tệp nén đang ghi dở. Thư mục dự án là cùng một thư mục trên máy chủ, được gắn tại `/opt/bd03` trong các container Airflow và tại `/opt/spark/jobs` trong container Spark, nên Spark thấy ngay tệp nén.
2. Script gọi `docker exec spark-master spark-submit …` qua Docker socket được gắn vào các container Airflow. Vì vậy Airflow chạy trên cùng máy với container Spark Master.
3. Driver khởi động bên trong container `spark-master` ở chế độ client, quảng bá `spark.driver.host = 10.68.71.113` và các cổng của hồ sơ.
4. Driver đăng ký với Standalone Master ở cổng 7077.
5. Master khởi động executor trên các worker trong giới hạn `spark.cores.max` và bộ nhớ executor của hồ sơ.
6. Executor kết nối ngược về driver để nhận task và trả kết quả.
7. Executor và driver đọc, ghi các bảng Delta trên HDFS: siêu dữ liệu từ NameNode, các khối từ DataNode theo địa chỉ ZeroTier.
8. Job in kết quả thành một dòng JSON; `BashOperator` đẩy dòng cuối của đầu ra chuẩn vào XCom, nơi một toán tử rẽ nhánh hoặc một task sau đọc nó.

Các job luồng dùng cùng đường đi nhưng với `CHAY_NEN=1`, khi đó driver chạy tách rời (`docker exec -d`) và nhật ký của nó được chuyển vào một tệp trong container.

![Đường đi của một job Spark từ task Airflow đến các executor và HDFS](hinh/f03_dinh_tuyen_job.png){#fig:route w=15.8}

## Tổ chức data lake và mô hình dữ liệu {#sec:data-model}

### Tổ chức trên HDFS

Mọi dữ liệu lưu lâu dài nằm dưới gốc theo quy ước mục A.4 của đề cương, `hdfs:///lakehouse/bd03_khuyen_nghi/`:

```
/lakehouse/bd03_khuyen_nghi
├── landing/retailrocket/        tệp CSV gốc
├── bronze/su_kien/              Parquet, ngay=YYYY-MM-DD/, _spark_metadata (append-only)
├── silver/tuong_tac/            Delta, phân vùng theo ngay
├── silver/san_pham/             Delta
├── features/ma_tran_tuong_tac/  Delta
├── gold/<bảng>/                 Delta (12 bảng)
├── checkpoints/<luồng>/         checkpoint của Structured Streaming
├── models/
│   ├── user_indexer/            StringIndexerModel, nhãn chỉ được thêm vào
│   ├── item_indexer/            StringIndexerModel, nhãn chỉ được thêm vào
│   ├── als/<run_id>/            mô hình tốt nhất khi tinh chỉnh (khớp trên train)
│   └── als/<run_id>_phuc_vu/    mô hình phục vụ (khớp lại trên train + test)
└── _quarantine/tuong_tac/       Delta, theo ngay: mọi dòng bị loại khỏi silver + lý do
```
Từ 9 đến 15 tháng 11, hồ dữ liệu nằm ở `/lake`, với bronze ở `/lake/bronze/su_kien_v2` vì thư mục bronze cũ của nhóm có lược đồ khác. Ngày 15 tháng 11, khi đối chiếu với đề cương, nhóm chuyển sang gốc chuẩn bằng `scripts/cum/chuyen_lakehouse.sh`. Việc chuyển chỉ dùng `hdfs dfs -mv`, tức là đổi tên trên NameNode, không chép lại khối dữ liệu nào:

- Bảng Delta lưu đường dẫn tương đối của tệp dữ liệu trong `_delta_log`, nên lịch sử phiên bản và `VERSION AS OF` vẫn còn nguyên sau khi chuyển.
- Checkpoint streaming chỉ lưu offset Kafka và trạng thái RocksDB theo đường dẫn tương đối.
- Riêng file sink Parquet của bronze ghi đường dẫn tuyệt đối của từng tệp vào `_spark_metadata`, nên script viết lại tiền tố đường dẫn trong các tệp đó.

Quy trình chuyển, gồm cả việc luồng chạy tiếp không xử lý lại lô cũ và hoàn tác, được kiểm thử với Spark thật (`tests/test_chuyen_lakehouse.py`).

### Lược đồ bảng

Đồ án giữ mọi cột của đặc tả (mục 3.4) với đúng tên và kiểu, và chỉ thêm cột khi phần hiện thực cần. @tab:bang tóm tắt các bảng; các cột thêm được liệt kê riêng kèm lý do.

Table: Các bảng chính, định dạng và khóa {#tab:bang w=23,13,34,30}
| Bảng | Định dạng | Cột (theo đặc tả) | Cột thêm và lý do |
|---|---|---|---|
| `bronze.su_kien` | Parquet, theo `ngay` | `ma_su_kien, thoi_diem, ma_nguoi_dung, ma_phien, ma_san_pham, loai_su_kien, ma_danh_muc, thiet_bi, ngay` | `ma_giao_dich` (mã giao dịch), `kafka_ts` (thời gian broker, dùng cho thịnh hành và đo độ trễ), `_nguon` (nguồn), `_ingest_ts` (mốc xử lý tăng dần), `_schema_ver` |
| `_quarantine.tuong_tac` | Delta, theo `ngay` | (mục A.4: bản ghi lỗi bị loại khỏi silver) | Mọi cột của bronze + `ly_do` + `_cach_ly_luc` |
| `silver.tuong_tac` | Delta, theo `ngay` | `ma_nguoi_dung, ma_san_pham, thoi_diem, loai_su_kien, trong_so, ngay` | `_nguon` (để loại cú nhấp web khỏi train/test); `gia_san_pham, xep_hang_sao` sau tiến hóa lược đồ |
| `silver.san_pham` | Delta | (không có trong đặc tả) | `ma_san_pham, ma_danh_muc, danh_muc_cha, gia_san_pham, con_hang`; cần cho danh mục, baseline 2, khởi đầu lạnh và sản phẩm mới |
| `features.ma_tran_tuong_tac` | Delta | `user_idx, item_idx, diem` | `tap` (`train`/`test`), để một phiên bản chứa đủ mọi thứ cần cho việc chạy lại huấn luyện *và* đánh giá |
| `gold.goi_y_nguoi_dung` | Delta, Z-ORDER theo người dùng | `ma_nguoi_dung, xep_hang (1..20), ma_san_pham, diem_du_doan, nguon, phien_ban_mo_hinh, sinh_luc` | – (MERGE theo người dùng và thứ hạng) |
| `gold.thinh_hanh_15p` | Delta | `cua_so_bat_dau, cua_so_ket_thuc, ma_san_pham, so_luot_xem, so_luot_them_gio, diem_thinh_hanh` | – (MERGE theo cửa sổ và sản phẩm) |
| `gold.nhat_ky_hien_thi` | Delta, bật CDF | `ma_hien_thi, ma_nguoi_dung, nhom_ab, vi_tri, ma_san_pham, thoi_diem_hien_thi, da_click, da_mua` | `nguon_traffic` (web hay mô phỏng, theo yêu cầu mục 3.10), `chien_luoc` (chỉ lượt hiển thị ALS mới vào thử nghiệm A/B) |
| `gold.ket_qua_ab` | Delta | `ngay, nhom_ab, so_hien_thi, so_click, so_mua, ctr, ty_le_chuyen_doi, p_value, phien_ban_delta_du_lieu` | `p_value_chuyen_doi` (tỉ lệ thứ hai), `ty_le_mo_phong` (tỉ lệ lưu lượng mô phỏng) |

Sáu bảng gold nữa phục vụ đánh giá và phần minh họa nghiệm thu: `thong_ke_san_pham` (số đếm theo sản phẩm và giá trị trung bình 24 giờ dùng trong điểm thịnh hành), `san_pham_lien_quan` (sản phẩm liên quan), `ket_qua_tuning` (mỗi tổ hợp siêu tham số một dòng), `lich_su_huan_luyen` (mỗi lần đánh giá một dòng với chỉ số, baseline, quyết định và một cột chi tiết JSON), `ket_qua_tai_lap` (các so sánh tái lập) và `do_hieu_nang_zorder` (số đo Z-ORDER). Hai bảng trung gian chuyển dữ liệu giữa các job phục vụ.

### Vì sao silver phân vùng theo ngày mà không theo người dùng

Đặc tả yêu cầu giải thích vì sao `silver.tuong_tac` không phân vùng theo `ma_nguoi_dung`. Với 1,4 triệu người dùng, phân vùng theo người dùng sẽ tạo 1,4 triệu thư mục, mỗi thư mục chứa vài chục byte (trung bình chưa đến hai sự kiện mỗi người dùng). NameNode tốn khoảng 150 byte heap cho mỗi tệp và thư mục, nhật ký Delta sẽ phình theo số tệp, và mỗi lần quét toàn bộ sẽ phải mở hàng triệu tệp tí hon. Phân vùng theo ngày cho khoảng 140 phân vùng có kích thước hợp lý, và mọi job theo lô đều lọc theo khoảng ngày (xử lý tăng dần theo ngày và phép chia train/test theo thời gian), nên việc cắt tỉa phân vùng theo `ngay` thực sự hữu ích. Truy vấn nóng theo từng người dùng của ứng dụng web được phục vụ từ bảng gold, được gom cụm bằng Z-ORDER theo người dùng (@sec:res-zorder), chứ không bằng phân vùng.

### Dòng dữ liệu

@fig:lineage lần theo từng bảng đến job ghi nó và các job đọc nó; các cạnh được lấy từ các lời gọi đọc, ghi trong `jobs/`. Cạnh liền mang dữ liệu chính, cạnh đứt là một lần đọc phụ (một thuộc tính, một phiên bản hoặc một mô hình). Các job luồng được đánh dấu ⟳ và tô màu. Các bảng có viền đậm cung cấp dữ liệu cho các khối hiển thị với người dùng của ứng dụng web (*Dành cho bạn*, *Đang thịnh hành*, *Sản phẩm liên quan*) và cho thử nghiệm A/B. Có hai chi tiết dễ bỏ sót: mô hình phục vụ `<run>_phuc_vu` được `sinh_goi_y_toan_bo` khớp từ các tham số do `danh_gia` ghi lại, không phải do job tinh chỉnh, và `ghi_gold` ghi ngược vào `gold.lich_su_huan_luyen` để đánh dấu lượt chạy đã được triển khai.

![Dòng dữ liệu cấp bảng: job (khối chữ nhật) và bảng (hình trụ)](hinh/f04_dong_du_lieu.png){#fig:lineage w=16 h=22.5}
