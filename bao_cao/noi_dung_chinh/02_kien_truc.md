# Kiến trúc hệ thống {#sec:kt}

## Sơ đồ tổng thể

![Kiến trúc tổng thể theo sáu lớp: nguồn, thu nhận, xử lý luồng, lakehouse, theo lô và học máy, phục vụ](hinh/f01b_kien_truc_ngang.png){#fig:kt w=16}

Hệ thống có sáu lớp (@fig:kt):

1. **Nguồn.** Dữ liệu vào từ tệp RetailRocket, từ producer phát lại và từ người mua trên web.
2. **Thu nhận.** Kafka tách nguồn khỏi xử lý.
3. **Xử lý luồng.** Ba job Structured Streaming chạy liên tục: nạp sự kiện vào bronze, tính điểm thịnh hành vào gold, ghi lượt hiển thị vào gold.
4. **Lakehouse.** Hồ dữ liệu trên HDFS và Delta Lake chứa bronze, silver, features, gold, models, checkpoints và `_quarantine`.
5. **Theo lô và học máy.** Pipeline hằng đêm làm sạch, dựng ma trận, tinh chỉnh ALS, đánh giá, rồi công bố danh sách gợi ý bằng MERGE.
6. **Phục vụ.** Ứng dụng web đọc Delta, ghi sự kiện về Kafka, khép kín vòng dữ liệu. Airflow điều phối mọi job lô.

## Lựa chọn công nghệ và lý do

Table: Thành phần, phiên bản và lý do chọn {#tab:tp w=18,22,60}
| Lớp | Công nghệ | Lý do |
|---|---|---|
| Thu nhận | Kafka 3.7.2 KRaft, 2 topic × 3 phân vùng | Khóa thông điệp là mã người dùng, nên sự kiện của một người giữ thứ tự; consumer đọc lại được sau sự cố |
| Xử lý | Spark 3.5.3 standalone + MLlib | Một engine cho cả luồng, lô và ALS; standalone được đề cương cho phép (A.3), nhẹ hơn YARN trên máy 7 GB |
| Định dạng bảng | Delta Lake 3.2.0 | ACID, MERGE, time travel cho tái lập, CDF cho A/B tăng dần, Z-ORDER cho truy vấn theo người dùng |
| Lưu trữ | HDFS 3.5.0, nhân bản 2 | Tận dụng đĩa 5 máy; nhân bản 2 vì một máy lab có thể treo bất kỳ lúc nào |
| Điều phối | Airflow 3.3.1, LocalExecutor | Task chỉ là lệnh `spark-submit` chờ kết quả; một máy là đủ |
| Phục vụ | FastAPI + Jinja2 + Chart.js, Spark `local[2]` | Đọc Delta trực tiếp; truy vấn theo người dùng là đúng truy vấn được tối ưu bằng Z-ORDER |
| Hạ tầng | Docker Compose, ZeroTier, Bash | Mỗi vai trò một tệp compose; mọi cấu hình sinh từ một danh bạ `cau_hinh/cum.env` |

## Triển khai vật lý

Table: Phân vai các máy {#tab:may w=20,18,62}
| Máy | IP ZeroTier | Vai trò |
|---|---|---|
| labsoe-11 | 10.68.71.113 | NameNode, Spark Master, Airflow, driver của mọi job |
| labsit12, labsit-may25, labsit-may26 | .198, .42, .90 | DataNode + Spark Worker |
| labsit | .204 | DataNode + Worker + Kafka + producer |
| labsoe-18 | .149 | DataNode + Worker + web |

Mỗi máy lab có 12 lõi và 7 GB RAM. Mọi thiết lập bộ nhớ được định cỡ từ số đo thật, và mỗi hồ sơ job (luồng, lô, ALS, bảo trì) có giới hạn lõi riêng để các job chạy song song được.

Mã đến các máy bằng `git push` qua SSH (`ssh_tat_ca.sh --dong-bo-ma`). Máy lab dùng chung không giữ token GitHub hay khóa Kaggle.
