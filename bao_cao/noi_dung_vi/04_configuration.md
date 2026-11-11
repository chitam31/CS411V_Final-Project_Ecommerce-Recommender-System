# Quản lý cấu hình {#sec:config}

Một cụm tám máy, năm loại dịch vụ và tám hồ sơ Spark có rất nhiều thiết lập phải khớp với nhau: địa chỉ IP mà DataNode quảng bá phải là địa chỉ client dùng, bộ nhớ một worker cung cấp phải lớn hơn bộ nhớ executor yêu cầu, và hệ số nhân bản của HDFS phải trùng với hệ số các job Spark dùng khi ghi. Những thiết lập được chép tay sẽ dần lệch nhau. Vì vậy đồ án suy mọi thiết lập từ một số ít nguồn, sinh tự động phần còn lại và giữ bí mật ngoài hệ thống quản lý phiên bản. @fig:config trình bày tổng quan.

![Phân phối mã và sinh cấu hình từ một tệp danh bạ cụm duy nhất](hinh/f10_cau_hinh.png){#fig:config w=15.8}

## Một tệp danh bạ cụm duy nhất

Tệp `cau_hinh/cum.env` là nguồn sự thật duy nhất về cấu trúc cụm. Mỗi máy là một dòng gồm năm trường: tên máy, IP ZeroTier, các vai trò cách nhau bằng dấu phẩy, số lõi Spark và bộ nhớ Spark:

```
MAY_1="labsoe-11|10.68.71.113|namenode,spark-master,airflow|0|0"
MAY_2="labsit12|10.68.71.198|datanode,spark-worker|8|3g"
MAY_3="labsit|10.68.71.204|datanode,spark-worker,kafka|6|2g"
MAY_4="labsit-may25|10.68.71.42|datanode,spark-worker|4|2g"
MAY_5="labsit-may26|10.68.71.90|datanode,spark-worker|8|3g"
MAY_6="labsoe-18|10.68.71.149|datanode,spark-worker,web|8|3g"
MAY_7="ctam|10.68.71.205|du-phong|0|0"            # dự phòng
TAI_KHOAN_SSH="labsoe-11=hduser labsit12=labsit12 labsit=labsit ..."   # tài khoản SSH theo máy
SPARK_MASTER_IP=10.68.71.113
HDFS_GOC=hdfs://10.68.71.113:8020
KAFKA_BROKER=10.68.71.204:9092
HE_SO_SAO_CHEP=2
LOI_LO=8
RAM_LO=2g
LOI_ALS=10
RAM_ALS=2g
```

Mọi script đều đọc tệp này: script khởi động dùng nó để quyết định máy nào chạy dịch vụ nào, script điều khiển SSH dùng nó để liệt kê máy và tài khoản, `submit.sh` dùng nó để tìm master và đặt hệ số nhân bản cho các lần ghi của Spark, và trình khởi chạy luồng dùng nó để tìm giao diện Spark Master. Chuyển một vai trò sang máy khác, đổi hệ số nhân bản hay đổi kích thước một worker chỉ cần sửa một dòng rồi chạy lại script khởi động trên các máy liên quan.

## Cấu hình dịch vụ được sinh tự động

`scripts/cum/khoi_dong_may.sh` chạy trên từng máy. Script tìm dòng của chính máy đó trong danh bạ bằng cách so các địa chỉ IPv4 của máy với các IP ZeroTier, đọc các vai trò, rồi ghi một tệp `.env` cho mỗi dự án Docker Compose (`ha_tang/hadoop/.env`, `ha_tang/spark/.env`, `ha_tang/kafka/.env`, `ha_tang/web/.env`). Các giá trị được sinh gồm IP ZeroTier của máy, số lõi và bộ nhớ của worker, địa chỉ master, hệ số nhân bản HDFS và URL của HDFS. Sau đó script khởi động các dịch vụ của từng vai trò bằng `docker compose up -d`, theo thứ tự phụ thuộc: NameNode, DataNode, Kafka, Spark Master, Spark Worker, Airflow, web. Trước khi khởi động, script kiểm tra không có container trùng tên nào thuộc về một dự án compose khác (tình huống đã gặp trên nhiều máy còn cụm cũ), và nếu có thì dừng lại kèm hướng dẫn thay vì tạo ra một container xung đột.

Hai chi tiết giúp việc sinh lại an toàn:

- **Mã băm cấu hình.** Docker Compose chỉ tạo lại container khi định nghĩa của nó thay đổi, không phải khi một tệp XML được gắn vào thay đổi. Vì vậy script tính mã băm của `ha_tang/hadoop/config/*.xml` và truyền nó dưới dạng biến môi trường (`CAU_HINH_HDFS`) vào các container Hadoop; sửa `hdfs-site.xml` làm mã băm thay đổi, và lần chạy kế tiếp sẽ tạo lại container với cấu hình mới.
- **Thiết lập riêng theo máy.** Một tệp `.env.rieng` (ví dụ mật khẩu Airflow mà ứng dụng web cần để kích hoạt DAG) được nối vào tệp `.env` đã sinh ở mỗi lần chạy, nên việc sinh lại không bao giờ làm mất một thiết lập thủ công.

Ảnh Spark `bd03/spark:3.5.3` chỉ được build khi chưa có (hoặc khi dùng `--build`). Ảnh này mở rộng `apache/spark:3.5.3` với NumPy (bắt buộc cho `pyspark.ml`) và các tệp JAR của Delta Lake 3.2.0 và bộ kết nối Kafka, để không job nào phải tải gói lúc nộp và các job chạy đồng thời không tranh chấp bộ đệm Ivy.

## Cấu hình ứng dụng

Thiết lập của chính ứng dụng (khác với hạ tầng) nằm trong `jobs/common/cau_hinh.py` và được mọi job, ứng dụng web và các kiểm thử nhập vào:

- **sổ đăng ký bảng**, ánh xạ mỗi tên bảng logic sang đường dẫn HDFS, cùng các đường dẫn checkpoint của các luồng;
- **trọng số sự kiện** (xem 1, thêm vào giỏ 3, mua 5), hằng số suy giảm theo thời gian λ = 0,01, cửa sổ khử trùng lặp 5 giây và ngưỡng bot 500 sự kiện mỗi giờ;
- **lưới ALS** (27 tổ hợp cho lưới đầy đủ, 9 cho lưới hằng đêm), ngưỡng đánh giá K = 10 và độ dài danh sách 20;
- tham số **xếp hạng lại** (200 ứng viên, β = 1,0) và các mẫu ô của thử nghiệm A/B;
- **thời gian lưu giữ của Delta**: `deletedFileRetentionDuration = 30 days` và `logRetentionDuration = 60 days`, áp dụng làm mặc định cho mọi bảng do các job tạo qua `spark.databricks.delta.properties.defaults.*`. VACUUM hằng đêm tôn trọng các thuộc tính này, nên time travel về bất kỳ phiên bản nào trong 30 ngày gần nhất vẫn khả thi.

Lược đồ của mọi bảng được khai báo một lần, dưới dạng chuỗi DDL trong `jobs/common/luoc_do.py`. Một hàm hỗ trợ tạo DataFrame từ các dòng Python theo DDL và ép số nguyên thành số thực cho các cột `DOUBLE`, sau khi một số đo được ghi dưới dạng số nguyên đã bị Spark từ chối (@sec:issues).

## Hồ sơ nộp job Spark

Các hồ sơ ở @tab:ho-so được định nghĩa trong một câu lệnh `case` của `submit.sh`. Các hồ sơ theo lô đọc số lõi và bộ nhớ từ danh bạ cụm (`LOI_LO`, `RAM_LO`, `LOI_ALS`, `RAM_ALS`), nên có thể đổi kích thước mà không sửa mã. Script cũng đặt các tùy chọn chung cho mọi job: phần mở rộng và catalog của Delta, múi giờ phiên UTC, `dfs.client.use.datanode.hostname`, hệ số nhân bản, thời gian chờ socket và các thiết lập thử lại, và `--py-files common.zip`. Riêng hồ sơ thịnh hành còn chuyển kho trạng thái sang RocksDB, để trạng thái của hàng chục nghìn cặp (cửa sổ, sản phẩm) nằm ngoài heap của JVM; thiết lập này được áp dụng ngay từ lần chạy đầu vì đổi bộ cung cấp kho trạng thái sẽ làm checkpoint hiện có không dùng được nữa.

## Cấu hình Airflow

Airflow được cấu hình bởi `ha_tang/airflow/docker-compose.yml`, một tệp `.env` được sinh và một tệp mật khẩu. `scripts/cum/tao_cau_hinh_airflow.sh` tạo `.env` từ một mẫu với khóa bí mật JWT và khóa Fernet ngẫu nhiên, GID của nhóm `docker` trên máy, đường dẫn tuyệt đối của dự án và UID của tài khoản sở hữu thư mục dự án (`AIRFLOW_UID`); script ghi mật khẩu quản trị vào `mat_khau.json` với quyền 600 và in ra một lần duy nhất. Các container chạy với UID đó và nhóm 0, đúng như tệp compose chính thức của Airflow khuyến nghị: với UID mặc định 50000 của ảnh, API server không mở được tệp mật khẩu (bộ quản lý xác thực mở tệp này ở chế độ ghi nối), và các task không ghi được `common.zip` vào thư mục dự án được gắn vào (@sec:issues).

Các số đo trên máy master dẫn đến một cấu hình tinh gọn dùng khoảng 0,9 GB thay vì gần 2 GB: một worker cho API server thay vì bốn, tối đa sáu task chạy đồng thời, một tiến trình phân tích DAG, và không có triggerer, vì không DAG nào dùng toán tử trì hoãn (có thể bật triggerer bằng một profile của compose). Pool mặc định được đặt một ô vào ban đêm để tại mỗi thời điểm có tối đa một driver theo lô trên máy master.

## Bí mật và tài khoản dùng chung

Các tài khoản phòng thí nghiệm được dùng chung với sinh viên khác, nên không có thông tin xác thực nào có thể vươn ra ngoài cụm được lưu trên máy phòng thí nghiệm. Token GitHub và khóa API Kaggle nằm trên laptop điều khiển: mã đến các máy bằng `git push` qua SSH, còn bộ dữ liệu được tải về laptop (`chep_du_lieu.sh`, script này truyền khóa cho `curl` qua đầu vào chuẩn để nó không bao giờ xuất hiện trên dòng lệnh) rồi chép lên bằng `scp`. Các tệp được sinh có chứa bí mật (`ha_tang/*/.env`, `.env.rieng`, `mat_khau.json`) đều có trong `.gitignore`.

## Phân phối mã

`scripts/cum/ssh_tat_ca.sh` điều khiển mọi máy từ laptop. Script sinh cấu hình SSH client từ danh bạ, chép khóa công khai, chạy một lệnh trên mọi máy lần lượt hoặc song song, chạy một script cục bộ trên từng máy qua đầu vào chuẩn, và với `--dong-bo-ma` thì phân phối mã đã commit. Để phân phối, script khởi tạo một kho Git trên từng máy nếu cần, đặt `receive.denyCurrentBranch = updateInstead` rồi push commit hiện tại. Git khi đó cập nhật cây làm việc trên máy đích, và từ chối nếu có tệp đã bị sửa tay ở đó, nên thay đổi cục bộ không bao giờ bị ghi đè âm thầm. Lệnh push được thử lại tối đa ba lần khi kết nối SSH bị ngắt, điều thường xảy ra khi cụm được vận hành từ ngoài khuôn viên trường (@sec:issues). Vì mã job được gắn vào container dưới dạng volume, phân phối mã mới không cần build lại ảnh; một job luồng đang chạy sẽ dùng mã mới ở lần khởi động lại kế tiếp.
