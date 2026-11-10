# NHAT_KY.md — Nhật ký thực hiện đề tài 3 (bd03_khuyen_nghi)

Nhật ký ghi lại những gì đã làm, những lỗi đã tìm thấy và cách sửa, các quyết định thiết kế và **trạng thái kiểm chứng thật** của từng phần. Phần cuối (mục 7) là bảng để nhóm ghi tiếp kết quả các lần chạy trên cụm.

Mã nguồn và tài liệu trong đợt 09–10/11/2026 được soạn với sự hỗ trợ của trợ lý AI Claude (Anthropic) trong vai trò giảng viên hướng dẫn; nhóm chịu trách nhiệm chạy, kiểm chứng và báo cáo kết quả.

---

## 1. Thông tin chung

| Mục | Nội dung |
|---|---|
| Mã đề tài | `bd03_khuyen_nghi` — Hệ khuyến nghị sản phẩm cho sàn TMĐT |
| Học phần | Dữ liệu lớn — chương trình Thạc sĩ KHMT, Trường ĐH Tân Tạo |
| Dữ liệu | RetailRocket Recommender System Dataset |
| Cụm | 6 máy lab + 2 máy cá nhân, ZeroTier `ttunet` (`633e31d8a29b038c`) |
| Phiên bản | Spark 3.5.3, Delta 3.2.0, Hadoop 3.5.0, Kafka 3.7.2 (KRaft), Airflow 3.3.1, Python 3.11 (Airflow), FastAPI |
| Repo | https://github.com/chitam31/CS411V_Final-Project_Ecommerce-Recommender-System |

---

## 2. Rà soát hạ tầng và mã cũ của nhóm (09/11/2026)

Đã đọc: repo `Leezya/spark-cluster`, `Leezya/hadoop-cluster`, `Leezya/hadoop-custom`, `Leezya/kafka-docker`, hai tệp `spark-cluster.zip`, `hadoop-cluster.zip` do nhóm gửi, ảnh chụp ZeroTier Central (8 máy). Các điểm dưới đây đều đã đối chiếu trực tiếp với tệp cấu hình.

| # | Vị trí | Vấn đề | Hậu quả | Đã sửa ở |
|---|---|---|---|---|
| 1 | `spark-cluster/docker-compose-worker.yml` | `--host 10.68.71.114` ghi cứng, mọi worker dùng chung tệp; IP này **không thuộc máy nào** trong ZeroTier | Worker quảng bá sai địa chỉ, driver không nối được executor | `ha_tang/spark/docker-compose-worker.yml` đọc `NODE_IP`, `SO_LOI`, `BO_NHO` từ `.env` sinh theo `cau_hinh/cum.env` |
| 2 | `hadoop-cluster/config/hdfs-site.xml.worker` | `dfs.datanode.hostname = 10.68.71.113` (IP của master) cho mọi DataNode | Client luôn tìm block ở máy master; đọc/ghi lỗi hoặc treo | `ha_tang/hadoop/config/hdfs-site.xml` dùng `${env.NODE_IP}`; một tệp chung cho NameNode và DataNode |
| 3 | `kafka-docker/docker-compose.yml` | Volume gắn `/var/lib/kafka/data` nhưng ảnh `apache/kafka` mặc định ghi log vào `/tmp/kraft-combined-logs` | Tạo lại container là mất dữ liệu topic | Thêm `KAFKA_LOG_DIRS=/var/lib/kafka/data` |
| 4 | `spark-cluster/docker-compose-master.yml` | Chỉ mở cổng 4041–4042 | Chỉ một driver chạy được tại một thời điểm; ba luồng streaming + job lô không thể chạy cùng lúc | Mở 4041–4060 (driver, block manager) và 4140–4150 (UI); mỗi hồ sơ job một cổng |
| 5 | `spark-cluster/submit.sh` | `docker exec -it` | Lỗi "the input device is not a TTY" khi Airflow gọi | `ha_tang/spark/submit.sh` dùng `-i`, có chế độ chạy nền cho streaming |
| 6 | `spark-cluster/submit.sh` | `--packages io.delta...` mỗi lần nộp, không có gói Kafka | Cần Internet mỗi lần chạy, tranh khóa ivy khi nhiều job; job đọc Kafka phải tự thêm gói | Ảnh `bd03/spark:3.5.3` chứa sẵn jar Delta và Kafka connector |
| 7 | Ảnh `apache/spark:3.5.3` | Không có numpy | `pyspark.ml` (ALS, StringIndexer) không import được | `ha_tang/spark/Dockerfile` cài `numpy==1.24.4` |
| 8 | `spark-cluster.zip`: `chuan_bi_ma_tran.py`, `huan_luyen_als.py` | `saveAsTable(...)` / `spark.table(...)` trong khi cụm **không có Hive Metastore** và Spark không cấu hình `fs.defaultFS` | Bảng chỉ tồn tại trong phiên; dữ liệu ghi vào `spark-warehouse` trên đĩa cục bộ của từng container thay vì HDFS | Mọi bảng truy cập theo đường dẫn HDFS (`common/cau_hinh._BANG`, `sql_bang`) |
| 9 | `nap_su_kien_bronze.py` (repo) | Bronze giữ tên cột gốc tiếng Anh | Không khớp đặc tả 3.4 | `streaming/nap_su_kien.py` ánh xạ sang lược đồ tiếng Việt, ghi thư mục mới `bronze/su_kien_v2` (giữ nguyên dữ liệu cũ) |
| 10 | `hadoop-custom` | Giống hệt `hadoop-cluster` | Dễ chạy nhầm hai bộ volume khác tên | Dùng một bộ compose; hỗ trợ `COMPOSE_PROJECT_NAME=hadoop-custom` nếu máy đang dùng volume cũ |

Những gì **giữ lại** từ mã cũ: phiên bản phần mềm, tên container, tên project compose và volume, cổng; topic `retailrocket-events` và 5 trường gốc của thông điệp; ý tưởng StringIndexer nối nhãn trong `chuan_bi_ma_tran.py` cũ (quan trọng cho tái lập).

---

## 3. Nhật ký thực hiện

### 09/11/2026

- Đọc đề tài 3 (6 trang), đề cương học phần, các giáo trình liên quan (Recommendation System, Mining Massive Datasets, Cloud Computing for Data Engineering, Hệ phân tán, CS411).
- Rà soát hạ tầng cũ (mục 2). Lập danh bạ 8 máy `cau_hinh/cum.env` theo ảnh ZeroTier Central.
- Dựng khung dự án: `jobs/common` (cấu hình, lược đồ, tiện ích Delta, metric, kiểm định, trộn), hạ tầng Docker cho 5 thành phần, script khởi động theo vai trò từng máy và kiểm tra cụm.
- Viết các job streaming (nạp bronze, thịnh hành, nhật ký hiển thị) và transform (danh mục, bronze→silver, thống kê sản phẩm, A/B, mô phỏng traffic, schema evolution).
- Viết các job học máy: ma trận, tuning, đánh giá, sinh gợi ý toàn bộ, trộn, ghi gold, sản phẩm liên quan; job bảo trì và tái lập.
- Viết web 5 màn hình, 5 DAG Airflow, bộ phát Kafka, người dùng ảo.
- Viết kiểm thử pytest; chạy và sửa lỗi (mục 4).
- Tạo repo riêng `chitam31/CS411V_Final-Project_Ecommerce-Recommender-System` (private) qua trình duyệt của học viên.

### 10/11/2026

- Thêm `scripts/kiem_tra_cuc_bo.sh`: chạy toàn bộ pipeline trên một máy với Delta thật và dữ liệu mẫu.
- `kiem_tra/tai_lap_ab.py`: `--ngay` mặc định là ngày mới nhất có kết quả A/B.
- Rà soát lại toàn bộ đề tài và phát hiện **thiếu mô hình v2** ("mô hình v2 dùng thêm ràng buộc lọc theo tầm giá", mục 3.7): trước đó mới thêm cột, chưa có mô hình. Đã bổ sung: tầm giá theo phân vị của user, lọc ứng viên ALS khi phục vụ và khi đánh giá, tên phiên bản `als_v2_<ma_chay>`, dòng v2 trên màn hình Chất lượng mô hình, so v2 khi tái lập; thêm 5 kiểm thử.
- Sửa DAG 2: tạo thư mục `logs` trước khi ghi cảnh báo.
- Sửa `khoi_dong_may.sh`: cấu hình riêng của máy (mật khẩu Airflow cho web...) đặt trong `.env.rieng`, không bị mất khi script sinh lại `.env`.
- Viết tài liệu: README, MO_HINH, NHAT_KY, docs/KIEN_TRUC, docs/TRIEN_KHAI_CUM, docs/HUONG_DAN_DEMO, docs/DOI_CHIEU_YEU_CAU, models/README; requirements, .gitignore, pytest.ini.
- Chạy lại toàn bộ kiểm thử: **58 đạt, 1 bỏ qua** (môi trường PySpark; test cần Airflow) và **8/8 đạt** trong môi trường Airflow 3.3.1.
- Học viên push mã lên GitHub từ máy Windows (`eabaa14`), rồi sửa hai lỗi khi đóng gói (`221db2d`): dự án bị lồng trong thư mục con `bd03_khuyen_nghi/` (đã đưa lên gốc bằng `git mv`, giữ lịch sử), và thêm `.gitattributes` cố định LF để script `.sh` và `cum.env` không bị đổi sang CRLF khi lấy ra trên Windows. Kiểm tra: không còn tệp CRLF trong index; `git diff -M --shortstat` chỉ có đổi chỗ và 8 dòng của `.gitattributes`.
- Cài Claude GitHub App cho riêng repo này. Bản clone từ GitHub trùng khớp 100% với bản đã kiểm thử; chạy lại pytest trên bản clone: 58 đạt, 1 bỏ qua.
- `khoi_dong_may.sh` chỉ build ảnh `bd03/spark` khi máy chưa có (tùy chọn `--build` để buộc build lại). Trước đó mỗi lần chạy đều build lại và tải lại jar từ Maven, nên máy lab không ra Internet thì không bật được worker. Thêm hướng dẫn `docker save` / `docker load` để chép ảnh từ master sang worker (docs/TRIEN_KHAI_CUM.md, mục 2.1) và một kiểm thử. Toàn bộ: **59 đạt, 1 bỏ qua** (PySpark), **9/9 đạt** (Airflow).
- Thêm `scripts/cum/ssh_tat_ca.sh`: điều khiển cả cụm từ máy cá nhân qua SSH (Git Bash trên Windows hoặc bash trên Linux) — sinh `~/.ssh/config` từ `cum.env`, chép khóa công khai, chạy lệnh lần lượt hoặc song song theo vai trò hay tên máy. Hướng dẫn ở docs/TRIEN_KHAI_CUM.md, mục 1.5; thêm một kiểm thử dùng lệnh `ssh` giả.
- Cả 6 máy lab đã cài `openssh-server` và `tmux`, mở cổng 22 trên giao diện ZeroTier. Tài khoản: labsoe-11 `hduser`, labsit12 `labsit12`, labsit / labsit-may25 / labsit-may26 `labsit`, labsoe-18 `labsoe-18` (khai báo ở `TAI_KHOAN_SSH` trong `cum.env`; `--tao-config` tự điền). labsit-may26 chạy Ubuntu 24.04, 5 máy còn lại Ubuntu 22.04.
- Lỗi khi điều khiển từ Windows: gõ `bash ...` trong PowerShell gọi WSL (chưa cài) thay vì Git Bash, và `>>` của PowerShell 5.1 ghi `~/.ssh/config` theo UTF-16. Sửa hướng dẫn: dùng cửa sổ Git Bash, ghi đè cấu hình bằng `>`.
- Laptop Windows `Whitehathacker` (ZeroTier `354f36a46a`) chưa thuộc mạng (`ACCESS_DENIED`; máy Ctam là một bản cài Linux khác, có mã riêng). Đã duyệt trên ZeroTier Central, nhận IP `10.68.71.182`, thêm vào danh bạ là `MAY_9` (vai trò `may-demo`). Chép khóa SSH sang 6 máy thành công; `ssh_tat_ca.sh hostname` in đúng tên từng máy (labsit → `labsit-ASUS`, labsit-may25 → `LabSit25`, labsit-may26 → `LabSit26`), tức IP trong danh bạ khớp máy thật.
- Thêm `--chay-tep` cho `ssh_tat_ca.sh` (gửi script cục bộ sang máy đích qua stdin, máy đích chưa cần có repo) và `scripts/cum/khao_sat_may.sh` (lõi, RAM, đĩa, Docker, quyền Docker, container và volume của cụm cũ, đồng bộ giờ, Java, repo).
- **Khảo sát 6 máy** (`khao_sat_may.sh`): đều 12 lõi, **7 GB RAM**, đĩa trống 325–387 GB, Docker 29.x, đồng hồ đã đồng bộ, chưa máy nào có repo. Ubuntu 22.04 (labsit-may26: 24.04). Phát hiện:
  - RAM thật nhỏ hơn nhiều so với cấu hình ước lượng (worker 8 GB, executor 3–4 GB): nếu chạy sẽ treo vì không worker nào nhận executor. Đã cỡ lại: worker 3 GB (labsit12, labsit-may26, labsoe-18) và 2 GB (labsit, labsit-may25); executor 2 GB; driver 512 MB–1,5 GB; NameNode/DataNode heap 1 GB; Spark daemon 512 MB; luồng thịnh hành dùng RocksDB state store.
  - Volume HDFS của labsit12, labsit-may25, labsit-may26 tên `hadoop-custom_worker_data` (từng chạy từ thư mục `hadoop-custom`): thêm `DU_AN_HADOOP` để dùng lại đúng volume. labsoe-18 chưa từng là DataNode.
  - labsoe-11 đang chạy cả DataNode cũ: khuyên dừng để nhường RAM cho driver và Airflow.
  - labsit-may25 chạy ứng dụng `coffeehouse-face` (PostgreSQL, MySQL, RabbitMQ), labsit-may26 chạy `airflow-worker-kafka` của nhóm khác: không động vào; labsit-may25 chỉ giao 2 GB cho Spark.
  - Tài khoản `labsit` trên máy labsit chưa có quyền Docker.
- `khoi_dong_may.sh` kiểm tra container cũ trùng tên thuộc project compose khác và dừng sớm kèm hướng dẫn. `ssh_tat_ca.sh --dong-bo-ma`: đẩy mã từ laptop sang 6 máy bằng `git push` qua SSH (`receive.denyCurrentBranch=updateInstead`), máy lab không cần token GitHub; có kiểm thử trên repo tạm, gồm cả trường hợp máy đích có tệp sửa tay (phải từ chối, không ghi đè).
- 10:45: labsoe-11 mất kết nối (ping không trả lời) trong khi 5 máy còn lại vẫn thông, nghi máy tự ngủ. Thêm hướng dẫn tắt chế độ ngủ (`systemctl mask sleep.target ...`, docs/TRIEN_KHAI_CUM.md mục 1.2b). `khoi_dong_may.sh --in-thu` giờ cũng báo trước container trùng tên (chỉ đọc).
- 10:55: đồng bộ mã lên 5 worker thành công (`c6574b2`); chạy thử `khoi_dong_may.sh` trên labsit12, labsit-may25, labsit-may26, labsoe-18 không có xung đột (HDFS `hadoop-custom`, Spark `spark-cluster` khớp). SSH thỉnh thoảng timeout ở lần nối đầu sau khi để yên (ZeroTier đi qua relay, ping 160–420 ms): tăng `ConnectTimeout` lên 20 giây, `ConnectionAttempts=3`. Lệnh cấp quyền Docker cho labsit chưa chạy được vì timeout.
- 11:10: bật thật 5 worker (ảnh `bd03/spark:3.5.3` build trên từng máy); Kafka tạo lại với volume mới (tin nhắn cũ trong topic không giữ được vì bản cũ ghi vào thư mục tạm), tạo topic `retailrocket-events`, `hien-thi` (3 phân vùng). Tắt chế độ ngủ trên cả 6 máy. Bật master: NameNode tạo lại với volume metadata cũ, Spark Master chạy ảnh mới.
- 11:20: `kiem_tra_cum.sh` báo 0 DataNode, 0 worker: lỗi 13 và 14 (mục 4). `zerotier-cli peers` trên labsoe-11: chỉ labsoe-18 nối thẳng (DIRECT qua LAN 192.168.80.x); labsit12, labsit, labsit-may25, labsit-may26 và laptop đều RELAY (độ trễ tới hơn 1 giây). Hai phòng lab nhiều khả năng ở hai mạng con không nối thẳng được: rủi ro lớn về tốc độ HDFS và Spark, cần xử lý trước khi chạy dữ liệu thật.
- 11:35: chẩn đoán mạng. Cả 6 máy đều nối **Wi-Fi** (`wlo1`), cổng dây `enp44s0` không cắm cáp; tường lửa ufw tắt trên cả 6 máy (không phải nguyên nhân). Hai máy phòng labsoe (`192.168.80.x`) ping thấy nhau; bốn máy phòng labsit (`172.16.99–104.x`) không ping được bất kỳ máy nào khác, kể cả máy cùng phòng: Wi-Fi phòng labsit chặn các máy nói chuyện với nhau (client isolation), nên ZeroTier chỉ còn đường RELAY. Cụm vẫn chạy đủ 5 DataNode và 5 worker nhưng mọi trao đổi giữa các máy labsit, và giữa chúng với master, đều đi vòng qua Internet. Hướng xử lý: cắm cáp mạng; hoặc đưa cả 6 máy vào cùng mạng Wi-Fi cho phép các máy thấy nhau (như mạng của phòng labsoe); hoặc dùng một router/điểm phát Wi-Fi riêng cho cụm. Cả ba cách đều không phải sửa cấu hình cụm vì IP ZeroTier giữ nguyên.
- 11:42: **job Delta đầu tiên chạy thật trên cụm**: `kiem_tra/khoi_tao_bang.py` (hồ sơ `nhanh`) tạo 8 bảng Delta trên HDFS trong 42 giây (gồm cả khởi động driver và executor). Lần đầu kiểm chứng được ảnh `bd03/spark` (jar Delta 3.2.0), ghi HDFS qua ZeroTier và driver chạy trong container `spark-master` hoạt động cùng nhau. Wi-Fi: phòng labsoe dùng mạng `LabSoe` (cho các máy thấy nhau), phòng labsit dùng `TTU Open` (chặn); từ phòng labsit không bắt được `LabSoe`, nên phương án đổi mạng Wi-Fi không dùng được.

---

## 4. Lỗi tìm thấy khi phát triển và cách sửa

| # | Lỗi | Phát hiện nhờ | Sửa |
|---|---|---|---|
| 1 | `F.create_map(F.lit(...))` đặt ở mức module trong `nap_su_kien.py` | Test import job khi chưa có SparkContext | Bọc trong hàm `_anh_xa_loai()` gọi lúc chạy. Trên cụm lỗi này làm job chết ngay khi import |
| 2 | `-F.log2(...).alias("nov")`: dấu trừ áp lên Column đã alias, tên cột sai | Test novelty | `(-F.log2(...)).alias("nov")` |
| 3 | Python worker của Spark không import được `common` khi chạy test | Lỗi `ModuleNotFoundError` trong UDF/RDD | `conftest.py` đặt biến môi trường `PYTHONPATH`; trên cụm dùng `--py-files common.zip` |
| 4 | Thư mục `airflow/` của dự án bị Python coi là namespace package `airflow` | Test DAG trong venv không có Airflow | `pytest.importorskip("airflow.sdk")` |
| 5 | Airflow 3.3.1: `DagBag` chuyển sang `airflow.dag_processing.dagbag`, bỏ `include_examples`; timetable không còn `summary` | Test DagBag | Test kiểm tra `dag.schedule`; compose đặt `PYTHONPATH` tới thư mục DAG |
| 6 | Dữ liệu test ALS quá dễ, baseline cũng đạt điểm tối đa | Test so ALS với baseline | Dữ liệu 4 cụm sở thích + nhiễu phổ biến |
| 7 | Mẫu khối nhóm B gõ sai một ô | Test đếm 3 ô thịnh hành trong 10 ô đầu | Sửa `MAU_KHOI["B"] = "aataatatmm"` |
| 8 | Trang chủ có hai ô nhập cùng tên `u` | Test web | Tách hai form |
| 9 | Hai job nộp cùng lúc có thể đọc `common.zip` đang ghi dở | Rà soát DAG chạy song song | Ghi tệp tạm rồi `os.replace` (nguyên tử) |
| 10 | Thiếu mô hình v2 lọc tầm giá | Rà soát lại đề tài ngày 10/11 | Mục 3 |
| 11 | DAG 2 ghi `logs/canh_bao.log` khi thư mục chưa tồn tại | Rà soát khi viết tài liệu | `mkdir -p` trước khi ghi |
| 12 | `khoi_dong_may.sh` ghi đè `.env` của web, mất `AIRFLOW_PASS` | Rà soát khi viết hướng dẫn triển khai | Cơ chế `.env.rieng` |
| 13 | `hdfs-site.xml` dùng chung để `dfs.namenode.rpc-address = 0.0.0.0:8020`: DataNode đi tìm NameNode tại 0.0.0.0 | Log DataNode khi bật cụm thật 10/11 | Quảng bá `10.68.71.113:8020`, lắng nghe bằng `rpc-bind-host = 0.0.0.0` (tương tự cho HTTP) |
| 14 | Spark Master mạng bridge với `--host 0.0.0.0` tự quảng bá `spark://0.0.0.0:7077`, worker bị từ chối | Log Spark worker khi bật cụm thật 10/11 | Master chạy `network_mode: host`, `--host 10.68.71.113` |
| 15 | Đổi nội dung XML cấu hình HDFS nhưng compose không tạo lại container | Khi sửa lỗi 13 | Đưa mã băm `config/*.xml` vào biến môi trường container (`CAU_HINH_HDFS`) |

---

## 5. Quyết định thiết kế

| Quyết định | Lý do | Phương án đã cân nhắc |
|---|---|---|
| Bảng truy cập theo đường dẫn, không dùng tên trong catalog | Không có Hive Metastore; thêm metastore là thêm một dịch vụ phải vận hành | Dựng Hive Metastore + PostgreSQL |
| Bronze Parquet, silver/gold Delta | Bronze chỉ ghi nối; giữ tương thích job cũ; Delta cần cho MERGE, time travel, CDF ở tầng sau | Bronze cũng Delta |
| Luồng thịnh hành đọc thẳng Kafka và gom theo `kafka_ts` | Độ trễ thấp hơn đọc qua bronze; tránh watermark bị sự kiện 2026 của web đẩy vượt sự kiện phát lại 2015 | Gom theo thời điểm gốc; đọc nối tiếp từ bronze |
| Web đẩy impression vào Kafka, job riêng MERGE theo lô | Tránh mỗi impression một commit Delta và vô số tệp nhỏ | Web ghi thẳng Delta |
| Cột `tap` trong features | Một phiên bản Delta phải đủ cho cả huấn luyện và đánh giá khi tái lập | Ground truth ở bảng riêng |
| Fit lại mô hình phục vụ trên train + test | Mô hình đánh giá không biết tháng cuối | Phục vụ bằng mô hình đánh giá |
| Mẫu khối cố định cho A/B | Bảo đảm đúng 30% thịnh hành trên 10 ô người dùng thấy; khác biệt A/B chỉ nằm ở phần trộn | Trộn theo tỷ lệ ngẫu nhiên |
| Logic dùng chung trong `jobs/common` | Job, web, tái lập và test cùng một công thức | Mỗi nơi tự viết |
| Airflow `LocalExecutor` | Task chỉ là `spark-submit` chờ kết quả; việc nặng nằm trên Spark | CeleryExecutor như giáo trình (mục 10.3) |
| Giữ lịch sử Delta 30 ngày | VACUUM hằng đêm với mặc định 7 ngày sẽ xóa phiên bản cần tái lập | Mặc định |
| `recommendForUserSubset` cho user hoạt động 30 ngày | Phương án chính thức của mục 3.10 | `recommendForAllUsers` |

---

## 6. Trạng thái kiểm chứng và giới hạn của môi trường phát triển

**Đã kiểm chứng (pytest, Spark local 3.5.3 thật):** làm sạch dữ liệu, trọng số, suy giảm thời gian, chia train/test, StringIndexer nối nhãn, ALS và tính tất định theo hạt giống, 4 metric (đối chiếu `RankingMetrics`), coverage, novelty, 2 baseline, phân phối độ phổ biến, công thức gộp mô hình phục vụ, nguồn MERGE của `ghi_gold`, sản phẩm liên quan, trộn A/B và 3 chiến lược cold start, mô hình v2, Structured Streaming cửa sổ trượt + watermark (nguồn tệp), gộp nhật ký hiển thị, z-test, tổng hợp A/B, mô phỏng click, web 5 màn hình (chế độ giả lập), 5 DAG (DagBag, lịch, nhánh), cấu hình hạ tầng (compose, danh bạ, script).

**Chưa kiểm chứng được trong môi trường phát triển:**

1. **Các lệnh Delta Lake chạy thật** (MERGE, `versionAsOf`, CDF, `ALTER TABLE ADD COLUMNS`, OPTIMIZE ZORDER, VACUUM, `DESCRIBE HISTORY`): môi trường phát triển chặn Maven Central nên không tải được `delta-spark_2.12-3.2.0.jar` và `delta-storage-3.2.0.jar`. Cú pháp theo tài liệu Delta 3.2. Cách kiểm chứng: `bash scripts/kiem_tra_cuc_bo.sh` trên bất kỳ máy nào có Internet (khoảng 10–15 phút).
2. **Cụm 8 máy:** phiên làm việc không được liên kết với máy trong phòng lab và các trang quản trị cụm (`10.68.71.x`) không mở được từ trình duyệt của học viên lúc làm việc, nên chưa thao tác trực tiếp trên máy nào. Toàn bộ thao tác trên cụm được viết thành script và hướng dẫn từng máy (docs/TRIEN_KHAI_CUM.md).
3. **Số liệu thật:** chưa có. Tài liệu không chứa con số thí nghiệm nào.
4. **Đẩy mã lên GitHub:** đã xong ngày 10/11/2026 (mục 3). Học viên cài Claude GitHub App với quyền chỉ trên repo này, nên các bản sửa sau được đẩy trực tiếp.

---

## 7. Việc còn lại cho nhóm

- [ ] Sửa `so_loi`, `bo_nho` trong `cau_hinh/cum.env` theo `nproc`, `free -g` của từng máy.
- [x] Push mã lên repo của nhóm (10/11/2026); mọi máy `git clone` cùng một bản.
- [ ] Chạy `scripts/kiem_tra_cuc_bo.sh` trên một máy có Internet (xác nhận phần Delta).
- [ ] Triển khai 8 máy theo docs/TRIEN_KHAI_CUM.md; `kiem_tra_cum.sh` không còn `DONG`.
- [ ] Tải dữ liệu, chạy bộ phát, `chay_lan_dau.sh` với lưới 27 tổ hợp.
- [ ] Chạy `tien_hoa_luoc_do.py` rồi pipeline lần hai (mô hình v2).
- [ ] Chạy DAG 5, `do_zorder.py`; bật lịch 4 DAG còn lại.
- [ ] Điền số liệu vào MO_HINH.md mục 12 và bảng dưới đây; chụp màn hình cho báo cáo.
- [ ] Tập dượt kịch bản docs/HUONG_DAN_DEMO.md.

### Bảng ghi các lần chạy trên cụm

| Ngày | Người chạy | Lệnh / DAG | `ma_chay` | Phiên bản features | Thời gian | Kết quả chính | Ghi chú |
|---|---|---|---|---|---|---|---|
| | | | | | | | |
| | | | | | | | |
| | | | | | | | |
