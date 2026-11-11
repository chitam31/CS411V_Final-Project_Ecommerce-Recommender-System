# Hiện thực hệ thống {#sec:impl}

Mã nguồn gồm khoảng 11.500 dòng: 38 tệp job và thư viện PySpark (5.000 dòng), 5 DAG Airflow cùng một mô-đun dùng chung, một ứng dụng web 18 tệp, các Kafka producer, 19 script vận hành, 14 tệp cấu hình Docker và Hadoop, và 13 tệp kiểm thử (Phụ lục A). Chương này đi theo trình tự của pipeline: hạ tầng, các job Spark, điều phối, ứng dụng web, pipeline A/B, khả năng tái lập và kiểm thử.

## Dựng hạ tầng (Docker) {#sec:impl-infra}

Mọi dịch vụ chạy trong container được định nghĩa bởi một tệp Docker Compose cho mỗi họ dịch vụ (@tab:compose). Các tệp giữ lại tên container, tên dự án và tên volume của các cụm trước đây của nhóm, nhờ vậy dữ liệu HDFS và các topic Kafka sẵn có được bảo toàn khi triển khai cấu hình mới.

Table: Các dự án Docker Compose và dịch vụ của chúng {#tab:compose w=26,24,50}
| Tệp compose | Dịch vụ | Ghi chú |
|---|---|---|
| `ha_tang/hadoop/docker-compose.yml` | `master` (NameNode), `worker` (DataNode) | Hadoop 3.5.0; NameNode trong mạng bridge, quảng bá 10.68.71.113:8020; DataNode quảng bá `NODE_IP`; heap 1 GB; mã băm cấu hình buộc tạo lại container |
| `ha_tang/spark/docker-compose-master.yml` | `spark-master` | Mạng host, `--host 10.68.71.113`; gắn `./jobs` tại `/opt/spark/jobs`; bộ nhớ tiến trình nền 512 MB; đồng thời chứa mọi driver |
| `ha_tang/spark/docker-compose-worker.yml` | `spark-worker` | Mạng host, `--host NODE_IP`, số lõi và bộ nhớ lấy từ danh bạ |
| `ha_tang/kafka/docker-compose.yml` | `kafka-server`, `kafka-ui` | Kafka 3.7.2 KRaft, quảng bá `PLAINTEXT://10.68.71.204:9092`, thư mục log trên một volume có tên |
| `ha_tang/airflow/docker-compose.yml` | `postgres`, `airflow-init`, `airflow-apiserver`, `airflow-scheduler`, `airflow-dag-processor` (+ `airflow-triggerer` tùy chọn) | Ảnh `bd03/airflow:3.3.1` bổ sung Docker CLI; gắn thư mục dự án và Docker socket; giao diện ở cổng 8088 |
| `ha_tang/web/docker-compose.yml` | `bd03-web` | Ảnh dựa trên `bd03/spark`, FastAPI ở cổng 8000, mạng host để Spark cục bộ của nó kết nối được tới các DataNode |

Dựng cụm gồm bốn bước, được ghi trong hướng dẫn triển khai (Phụ lục B):

1. Trên mọi máy Linux: cài ZeroTier, Docker và Git, cho phép lưu lượng vào trên giao diện ZeroTier, tắt chế độ tự ngủ.
2. Từ laptop: sinh cấu hình SSH, chép khóa, phân phối mã (`ssh_tat_ca.sh --tao-config`, `--chep-khoa`, `--dong-bo-ma`).
3. Trên mọi máy: chạy `khoi_dong_may.sh`, máy master trước.
4. Trên máy master: kiểm tra toàn cụm (`kiem_tra_cum.sh`: NameNode và DataNode, Spark worker, topic Kafka, JAR của Delta), rồi chạy pipeline đầu tiên bằng `chay_lan_dau.sh`.

`chay_lan_dau.sh` chạy pipeline đầu cuối đầu tiên qua tám bước có thể tiếp tục: (1) tạo các thư mục HDFS, kiểm tra các tệp CSV landing đã có và tạo các bảng Delta kèm thuộc tính (Change Data Feed cho nhật ký hiển thị, thiết lập lưu giữ); (2) nhập danh mục sản phẩm vào `silver.san_pham`; (3) nạp các sự kiện đã có trong Kafka vào bronze bằng một lượt chạy một lần (`availableNow`) của job nạp; (4) làm sạch bronze thành silver và tính thống kê sản phẩm cùng sản phẩm liên quan; (5) chuẩn bị ma trận, tinh chỉnh ALS trên lưới đầy đủ 27 tổ hợp và đánh giá; (6) sinh danh sách phục vụ, trộn và công bố; (7) mô phỏng lưu lượng A/B và tính kết quả; (8) đo OPTIMIZE và Z-ORDER trên một bảng bị phân mảnh thành 200 tệp. Sau một lần lỗi, script có thể tiếp tục từ một bước cho trước (`TU_BUOC=6 MA_CHAY=<mã lượt chạy>`), nhờ đó tránh được việc tinh chỉnh lại toàn bộ khi một DataNode bị treo trong lần chạy đầu trên cụm.

Các script vận hành, đều viết bằng Bash và dựa trên danh bạ cụm, được liệt kê ở @tab:scripts.

Table: Các script vận hành chính {#tab:scripts w=30,70}
| Script | Mục đích |
|---|---|
| `scripts/cum/khoi_dong_may.sh` | Nhận diện máy, sinh các tệp `.env`, khởi động dịch vụ theo vai trò; `--dung` để dừng |
| `scripts/cum/ssh_tat_ca.sh` | Chạy lệnh hoặc script trên mọi máy; sinh cấu hình SSH; phân phối mã có thử lại |
| `scripts/cum/kiem_tra_cum.sh` | Kiểm tra sức khỏe đầu cuối của HDFS, Spark, Kafka và thư viện Delta |
| `scripts/cum/do_mang.sh`, `cau_hinh_zerotier.sh` | Đo mọi cặp máy (đường trực tiếp hay qua relay); chặn các giao diện Docker trong ZeroTier |
| `scripts/cum/chep_du_lieu.sh` | Tải bộ dữ liệu Kaggle về laptop và chép lên máy master và máy Kafka |
| `scripts/cum/don_du_lieu.sh` | Xem trước và chỉ xóa các đường dẫn HDFS của đồ án trước một lần chạy lại sạch (phải gõ xác nhận) |
| `scripts/cum/tao_cau_hinh_airflow.sh` | Sinh tệp `.env` và tệp mật khẩu của Airflow |
| `scripts/cum/tinh_trang.sh` | Một màn hình trạng thái chỉ đọc: bộ nhớ, ứng dụng Spark đang chạy, DAG Airflow, lượt chạy và task |
| `scripts/chay_lan_dau.sh` | Pipeline đầu cuối đầu tiên qua 8 bước có thể tiếp tục |
| `scripts/luong.sh` | Khởi động, dừng và theo dõi ba job luồng |
| `scripts/trien_khai_lai.sh` | Đánh giá lại và triển khai lại một lượt chạy có sẵn mà không tinh chỉnh lại |
| `scripts/thu_nghiem_bo_sung.sh` | Quét tham số xếp hạng lại và mô phỏng A/B đủ cỡ mẫu |

## Các job Spark {#sec:impl-jobs}

### Thu nhận và làm sạch {#sec:impl-clean}

**Nhập danh mục (`nhap_danh_muc`).** Thuộc tính sản phẩm của RetailRocket là các bản ghi khóa – giá trị có dấu thời gian, chia thành hai tệp. Job giữ lại, cho mỗi sản phẩm, giá trị mới nhất của `categoryid`, `available` và thuộc tính `790` (giá tương đối), nối với cây danh mục để lấy danh mục cha, rồi ghi `silver.san_pham`.

**Nạp sự kiện (`nap_su_kien`, luồng).** Job đọc topic, phân tích JSON, bỏ các bản ghi thiếu người dùng, sản phẩm hoặc sự kiện, rồi ánh xạ sang lược đồ bronze của đặc tả (@tab:bang). Mã sự kiện `ma_su_kien` là giá trị băm SHA-256 của topic, phân vùng, offset và nội dung: nó duy nhất và tất định, nên một thông điệp được Kafka gửi lại hoặc đọc lại sau sự cố sẽ có cùng mã và bị loại ở phía sau. Vì RetailRocket không có phiên, mã phiên được suy ra từ người dùng và một khung thời gian 30 phút khi thông điệp không mang sẵn. Danh mục sản phẩm được thêm bằng phép nối trái với `silver.san_pham`. Các dòng được ghi bằng Parquet file sink, phân vùng theo ngày, checkpoint trên HDFS. Cùng job này còn chạy ở chế độ một lần (`--mot-lan`, kích hoạt `availableNow`) để nạp phần tồn đọng và báo số batch, số sự kiện.

**Bronze sang silver (`bronze_to_silver`).** Việc làm sạch áp dụng lần lượt các quy tắc ở @tab:lam-sach. Job chạy tăng dần: nó đọc mốc thời gian nạp của dòng cuối cùng đã xử lý từ `userMetadata` của commit silver gần nhất có mang mốc này, chọn các ngày nhận được dòng mới, tính lại toàn bộ các ngày đó và ghi đè đúng các phân vùng ấy bằng `replaceWhere`. Chạy hai lần cho ra cùng một bảng. Trước khi ghi, các dòng được phân vùng lại theo cột phân vùng, để mỗi ngày được ghi thành một tệp; nếu không, phép shuffle 64 phân vùng sẽ ghi tới 64 tệp tí hon cho mỗi ngày (@sec:issues).

Table: Các quy tắc làm sạch từ bronze sang silver {#tab:lam-sach w=24,38,38}
| Bước | Quy tắc | Lý do |
|---|---|---|
| Khử trùng lặp theo mã | `dropDuplicates(ma_su_kien)` | Kafka và file sink có thể gửi một thông điệp hai lần |
| Khử trùng lặp theo nội dung | cùng người dùng, sản phẩm, loại sự kiện và thời điểm (mili giây), làm **trước** bước lọc bot | Phát lại một giai đoạn lần nữa sẽ cho mỗi sự kiện gốc một mã mới (offset mới); thiếu bước này, số sự kiện mỗi giờ tăng gấp đôi và người dùng thật có 251–500 sự kiện mỗi giờ sẽ bị loại như bot |
| Lọc bot | loại mọi người dùng có ít nhất một giờ vượt **500 sự kiện** | Ngưỡng của đặc tả; bot làm méo độ phổ biến và ma trận |
| Chống nhấp lặp | bỏ một sự kiện cùng người dùng, sản phẩm và loại trong vòng **5 giây** sau sự kiện trước | Nhấp đúp và tải lại trang |
| Trọng số | xem = 1, thêm vào giỏ = 3, mua = 5; bỏ khỏi giỏ bị loại | Bỏ khỏi giỏ không phải tín hiệu quan tâm |

**Thống kê sản phẩm (`thong_ke_san_pham`).** Với mỗi sản phẩm, job đếm lượt xem, lượt thêm vào giỏ và lượt mua, tính điểm phổ biến, số lượt xem trong 24 giờ cuối của dữ liệu và số lượt xem trung bình mỗi cửa sổ 15 phút trong 24 giờ đó. Bảng này cung cấp dữ liệu cho hai baseline, các chiến lược khởi đầu lạnh và mẫu số của điểm thịnh hành.

**Sản phẩm liên quan (`san_pham_lien_quan`).** Lọc cộng tác sản phẩm – sản phẩm theo đồng xuất hiện: hai sản phẩm liên quan nếu cùng một người dùng tương tác với cả hai trong cùng một ngày, và độ tương tự của chúng là cosine ở @eq:cos, trong đó *n(i, j)* là số người dùng đã tương tác với cả hai sản phẩm. Dùng cosine thay cho số đếm thô ngăn các sản phẩm rất phổ biến xuất hiện trong mọi danh sách. Các cặp có ít hơn hai người dùng bị bỏ qua và mười sản phẩm tương tự nhất của mỗi sản phẩm được lưu lại; với sản phẩm không có danh sách, ứng dụng web hiển thị sản phẩm bán chạy cùng danh mục.

$$cos$$ {#eq:cos}

### Chia dữ liệu và huấn luyện {#sec:impl-train}

**Ma trận tương tác (`chuan_bi_ma_tran`).** Job đọc silver (loại các sự kiện do ứng dụng web sinh ra, để các thử nghiệm không ảnh hưởng đến đánh giá) và chia theo thời gian. Ngày cuối cùng trong silver là ngày kết thúc; ngày cắt sớm hơn ba mươi ngày. Các tương tác trước ngày cắt tạo thành tập huấn luyện (khoảng bốn tháng đầu); tháng còn lại là tập kiểm tra. Tập đáp án của một người dùng là tập sản phẩm người dùng đó tương tác trong tháng kiểm tra, giới hạn trong những người dùng và sản phẩm có mặt trong tập huấn luyện: người dùng và sản phẩm chưa từng thấy thuộc về khởi đầu lạnh và được xử lý bằng chiến lược riêng thay vì trộn vào các chỉ số xếp hạng. Điểm của mỗi cặp người dùng – sản phẩm là tổng trọng số các sự kiện của cặp đó với suy giảm hàm mũ theo thời gian (@eq:decay), trong đó Δ*d* là số ngày giữa sự kiện và ngày tham chiếu. Ngày tham chiếu là ngày cắt đối với tập huấn luyện và ngày kết thúc đối với tập kiểm tra, nên không có thông tin nào từ tương lai rò rỉ vào huấn luyện. Với *λ_d* = 0,01, một tương tác đã 70 ngày còn giữ khoảng một nửa trọng số (e^{−0,7} ≈ 0,50).

$$decay$$ {#eq:decay}

ALS cần mã số nguyên. Khớp lại `StringIndexer` mỗi ngày có thể khiến cùng một chỉ số ứng với hai người dùng khác nhau ở hai phiên bản của bảng đặc trưng, âm thầm phá hỏng mọi phép so sánh và tái lập. Vì vậy job nạp danh sách nhãn đã lưu và chỉ **thêm** nhãn mới vào cuối (`StringIndexerModel.from_labels`), nên chỉ số của một người dùng hay sản phẩm đã có không bao giờ đổi. Để giới hạn bộ nhớ (rủi ro "ALS hết bộ nhớ" của đặc tả), chỉ giữ người dùng có ít nhất ba tương tác huấn luyện. Bảng đặc trưng lưu `user_idx, item_idx, diem` cộng với cột `tap` (`train` hoặc `test`): nhờ vậy một phiên bản Delta duy nhất chứa đủ mọi thứ cần để chạy lại cả huấn luyện lẫn đánh giá. Siêu dữ liệu của commit ghi ngày cắt và ngày kết thúc, số tương tác tối thiểu và phiên bản của `silver.tuong_tac` và `silver.san_pham` đã đọc.

**Tinh chỉnh (`huan_luyen_als`).** Job huấn luyện ALS với `implicitPrefs = true`, `maxIter = 10`, `seed = 42` và `coldStartStrategy = "drop"` cho mọi tổ hợp của lưới: 27 tổ hợp (`rank` × `regParam` × `alpha`) cho báo cáo, hoặc 9 tổ hợp với α = 10 cho lượt chạy hằng đêm. Mỗi tổ hợp được đánh giá trên tháng kiểm tra và ghi thành một dòng của `gold.ket_qua_tuning` kèm mã lượt chạy, phiên bản đặc trưng, bốn chỉ số xếp hạng, độ phủ, độ mới lạ và thời gian huấn luyện. Mô hình có NDCG@10 cao nhất được chọn; khi bằng nhau thì ưu tiên rank nhỏ hơn rồi đến regParam lớn hơn (mô hình đơn giản hơn). Mô hình được chọn được lưu tại `/lake/models/als/<mã lượt chạy>`.

**Đánh giá và quyết định triển khai (`danh_gia`).** Job đánh giá tính lại đầy đủ các chỉ số cho mô hình được chọn và cho hai baseline bắt buộc: (1) mười sản phẩm có tổng điểm huấn luyện cao nhất, giống nhau cho mọi người dùng, và (2) mười sản phẩm bán chạy nhất của danh mục mà người dùng có điểm huấn luyện cao nhất, bổ sung bằng sản phẩm bán chạy toàn sàn khi danh mục có ít hơn mười sản phẩm. Job cũng đo hai biến thể xếp hạng lại β = 0,1 và 0,3, cấu hình phục vụ (@sec:impl-blend), phân bố độ phổ biến của từng danh sách, và khi phiên bản silver đứng sau bảng đặc trưng có cột giá, cả mô hình phiên bản 2 có lọc theo giá. Hai quyết định khác nhau được ghi vào `gold.lich_su_huan_luyen`:

- `dat_nguong`, tiêu chí nghiệm thu của đề bài (@eq:uplift);
- `cai_thien`, điều kiện rẽ nhánh của DAG hằng ngày: mô hình mới được triển khai nếu chưa có mô hình nào đang phục vụ, hoặc nếu NDCG@10 của nó không thấp hơn quá 1 % so với mô hình đang phục vụ. Dung sai này ngăn các danh sách đã công bố bị "đóng băng" chỉ vì NDCG dao động nhẹ giữa các đêm.

$$uplift$$ {#eq:uplift}

Job in kết quả thành một dòng JSON để toán tử rẽ nhánh của DAG đọc.

### Danh sách phục vụ, trộn gợi ý và khởi đầu lạnh {#sec:impl-blend}

**Mô hình phục vụ (`sinh_goi_y_toan_bo`).** Mô hình đánh giá chỉ học bốn tháng đầu; gợi ý hiển thị cho người dùng còn phải phản ánh tháng cuối. Vì vậy job khớp lại ALS với các siêu tham số đã chọn trên dữ liệu huấn luyện cộng kiểm tra. Để gộp hai tập mà không đọc lại silver, điểm huấn luyện (suy giảm tính đến ngày cắt *c*) được nhân với e^{−λ(e − c)} để trở thành điểm suy giảm tính đến ngày kết thúc *e*, như đẳng thức @eq:gop cho thấy. Gợi ý chỉ được sinh bằng `recommendForUserSubset` cho những người dùng hoạt động trong 30 ngày gần nhất và có ít nhất năm tương tác; đây là biện pháp giảm rủi ro "`recommendForAllUsers` quá chậm" của đặc tả; mọi người dùng khác đi theo một chiến lược khởi đầu lạnh.

$$gop$$ {#eq:gop}

Với mỗi người dùng, job lấy 200 ứng viên ALS và xếp hạng lại theo @eq:rerank, trong đó điểm ALS và độ mới lạ của sản phẩm (−log₂ của tỉ lệ người dùng đã tương tác với nó, tính trên ma trận dùng để khớp mô hình phục vụ) đều được chuẩn hóa min–max trong tập ứng viên của người dùng đó, với β = 1,0. Hai mươi ứng viên tốt nhất (bốn mươi đối với mô hình phiên bản 2, vì một số sẽ bị lọc sau) được giữ lại. Điểm ALS gốc vẫn nằm trong `diem_du_doan`; thứ tự mới nằm trong `xep_hang`. Lựa chọn 200 ứng viên và β = 1,0 đến từ phép quét ở @sec:res-coverage; đặt β = 0 trong cấu hình sẽ khôi phục thứ tự ALS thuần.

$$rerank$$ {#eq:rerank}

**Trộn gợi ý (`tron_goi_y`).** Danh sách cuối cùng của mỗi người dùng có hai mươi vị trí, tổ chức thành hai khối mười ô; ứng dụng web hiển thị khối đầu, nên tỉ lệ của từng nguồn được bảo đảm trong chính những gì người dùng nhìn thấy. @fig:mau-khoi trình bày các mẫu. Nhóm A nhận tám sản phẩm ALS và hai sản phẩm mới; nhóm B nhận năm sản phẩm ALS, ba sản phẩm thịnh hành ở các vị trí cố định và cùng hai sản phẩm mới đó. Vì sản phẩm mới chiếm cùng vị trí ở cả hai nhóm, khác biệt duy nhất giữa A và B là phần trộn thịnh hành. Khi một nguồn cạn, ô đó được lấp từ nguồn kế tiếp theo một thứ tự cố định, và một sản phẩm không bao giờ xuất hiện hai lần trong một danh sách. Nhóm được phân bằng hàm băm: người dùng thuộc nhóm A nếu tám chữ số thập lục phân đầu của MD5 mã người dùng tạo thành một số chẵn, ngược lại thuộc nhóm B. Hàm băm giống nhau trong job theo lô, ứng dụng web và bộ mô phỏng, nên một người dùng luôn rơi vào cùng một nhóm.

![Mẫu mười ô hiển thị của khối "Dành cho bạn" theo loại người dùng và nhóm A/B](hinh/f11_mau_khoi.png){#fig:mau-khoi w=15.5}

Ba chiến lược khởi đầu lạnh của đặc tả được hiện thực như ở @tab:cold-start. Mỗi chiến lược là một hàm Python thuần trong `jobs/common/tron.py`, được job theo lô và ứng dụng web cùng dùng và có kiểm thử đơn vị.

Table: Các chiến lược khởi đầu lạnh {#tab:cold-start w=20,48,32}
| Trường hợp | Chiến lược | Hiện thực |
|---|---|---|
| Người dùng hoàn toàn mới | Các sản phẩm thịnh hành nhất của cửa sổ 15 phút gần nhất | `danh_sach_nguoi_moi`; ứng dụng web dùng cho người dùng nó chưa biết |
| Người dùng có ít hơn 5 tương tác | Sản phẩm bán chạy của tối đa ba danh mục người dùng đã xem (xen kẽ), trộn 50/50 với thịnh hành theo mẫu d t d t d t d t d t | `tron_nguoi_it_tuong_tac`; ứng dụng web giữ tương tác của phiên mới trong bộ nhớ |
| Sản phẩm mới (chưa có trong mô hình ALS) | Các sản phẩm thuộc danh mục xuất hiện nhiều nhất trong top-20 ALS của người dùng mà chưa có nhân tố ALS, đặt ở 20 % cuối của mỗi khối (vị trí 9–10) | `item_moi_theo_danh_muc`, với phép nối `left_anti` trên nhân tố sản phẩm của mô hình |

Các ô thịnh hành được lấp từ cửa sổ gần nhất của `gold.thinh_hanh_15p`; khi bảng luồng chưa tồn tại, job quay về các sản phẩm được xem nhiều nhất trong 24 giờ cuối của dữ liệu. Lúc hiển thị, ứng dụng web thay các ô thịnh hành bằng cửa sổ mới nhất, giữ nguyên vị trí của chúng.

**Công bố (`ghi_gold`).** Các danh sách đã trộn được ghi vào `gold.goi_y_nguoi_dung` bằng MERGE với khóa (người dùng, thứ hạng) thay vì ghi đè bảng: dòng của những người dùng có trong lượt chạy mới được cập nhật hoặc chèn, các thứ hạng thừa của những người dùng đó (khi danh sách mới ngắn hơn) bị xóa qua mệnh đề `WHEN MATCHED AND s._xoa THEN DELETE`, và người dùng vắng mặt trong lượt chạy giữ danh sách cũ. DAG bảo trì xóa các danh sách được sinh trước lần triển khai gần nhất hơn bảy ngày, nên một người dùng vắng mặt trong các lượt chạy gần đây sẽ mất danh sách cũ trong khi bảng phục vụ không bao giờ rỗng (sự cố 28). Phiên bản mô hình (`als_<mã lượt chạy>` hoặc `als_v2_<mã lượt chạy>`) và thời điểm sinh được ghi kèm mỗi dòng.

### Mô hình phiên bản 2 và tiến hóa lược đồ {#sec:impl-v2}

Đặc tả yêu cầu một thay đổi lược đồ ở tuần 5: thêm giá sản phẩm và số sao đánh giá vào silver, rồi dựng mô hình phiên bản 2 dùng chúng làm ràng buộc. `tien_hoa_luoc_do` thực hiện qua ba bước: thêm `xep_hang_sao` vào `silver.san_pham`; chạy `ALTER TABLE … ADD COLUMNS (gia_san_pham DOUBLE, xep_hang_sao DOUBLE)` trên `silver.tuong_tac`, lệnh này chỉ commit siêu dữ liệu mới và không đụng đến các tệp dữ liệu; rồi điền hai cột bằng MERGE từ danh mục sản phẩm. Các phiên bản cũ vẫn đọc được với lược đồ bảy cột ban đầu; sau thay đổi, `bronze_to_silver` tự động thêm cả hai cột cho các dòng mới được xử lý. RetailRocket không có số sao đánh giá, nên `xep_hang_sao` là một **đại lượng thay thế**: tỉ lệ mua trên xem của sản phẩm, ánh xạ vào khoảng 1–5 theo thứ hạng phân vị. Báo cáo nêu rõ điều này ở mọi chỗ cột được dùng.

Khi phiên bản silver đứng sau bảng đặc trưng có cột giá, job đánh giá chuyển sang phiên bản 2 và đặt tên mô hình là `als_v2_<mã lượt chạy>`; đây là nơi duy nhất ra quyết định, các bước sau chỉ đọc tên này. Phiên bản 2 ước lượng khoảng giá của mỗi người dùng từ giá của các sản phẩm người dùng đó đã tương tác (@eq:tam-gia), dùng phân vị thay vì giá trị nhỏ nhất và lớn nhất, để một lần lỡ xem một sản phẩm rất đắt không làm khoảng giá mất ý nghĩa, rồi loại các ứng viên ALS nằm ngoài khoảng đó, giữ nguyên thứ tự và giữ lại sản phẩm không rõ giá. Nếu còn lại ít hơn mười ứng viên, các sản phẩm ngoài khoảng giá được nối vào cuối để khối không bao giờ có ô trống. Người dùng có ít hơn ba tương tác có giá thì không bị lọc. Cùng một hàm lọc được dùng cho đánh giá (top-20, lọc, cắt còn 10) và cho phục vụ.

$$tam_gia$$ {#eq:tam-gia}

### Xử lý luồng và dự đoán {#sec:impl-streaming}

@fig:streams trình bày chi tiết ba job Structured Streaming. Chúng được khởi động, dừng và theo dõi bằng `scripts/luong.sh`; script này nộp mỗi job ở chế độ tách rời với hồ sơ riêng và nhận diện job đang chạy theo tên ứng dụng qua API JSON của Spark Master; một job không bao giờ bị khởi động hai lần.

![Ba job Structured Streaming và ngân sách độ trễ của khối thịnh hành](hinh/f07_luong.png){#fig:streams w=15.8}

**Thịnh hành (`tinh_thinh_hanh`).** Job giữ lại sự kiện xem và thêm vào giỏ, áp dụng watermark 2 phút, gom theo cửa sổ 15 phút trượt mỗi phút và theo sản phẩm, rồi đếm cả hai loại sự kiện. Mỗi micro-batch (kích hoạt 20 giây, tối đa 200.000 bản ghi) được ghi qua `foreachBatch`: nối với mức bình thường của sản phẩm (số lượt xem trung bình mỗi cửa sổ 15 phút trong 24 giờ, lấy từ `gold.thong_ke_san_pham`), tính điểm theo @eq:trend và upsert vào `gold.thinh_hanh_15p` bằng MERGE với khóa là thời điểm bắt đầu cửa sổ, thời điểm kết thúc cửa sổ và sản phẩm. Chuẩn hóa theo mức thường ngày của sản phẩm cho phép một sản phẩm ít được xem nhưng đột nhiên thu hút sự chú ý lọt vào khối; hằng số 10 tránh chia cho số rất nhỏ. Trạng thái cửa sổ được giữ trong RocksDB thay vì trên heap của JVM, nhờ đó chỉ cần executor 1 GB.

$$trend$$ {#eq:trend}

Cửa sổ được tính trên `kafka_ts`, thời điểm broker nhận thông điệp, chứ không trên thời điểm gốc của sự kiện. Producer phát lại giữ dấu thời gian năm 2015 và nén một ngày thành 30 giây, trong khi ứng dụng web sinh sự kiện với dấu thời gian năm 2026; gom theo thời điểm gốc sẽ khiến chỉ một sự kiện web cũng đẩy watermark lên năm 2026 và biến mọi sự kiện phát lại thành "trễ". Thời gian của broker là một đồng hồ duy nhất chung cho cả hai nguồn, và cũng là đồng hồ đúng cho một khối "đang được quan tâm lúc này". Job bắt đầu từ offset mới nhất vì chỉ hoạt động hiện tại mới quan trọng.

**Lượt hiển thị (`ghi_hien_thi`).** Ứng dụng web không ghi lượt hiển thị vào Delta: mỗi lượt hiển thị sẽ là một commit và một tệp nhỏ. Ứng dụng công bố chúng vào Kafka, và job này tổng hợp mỗi micro-batch 30 giây theo mã hiển thị rồi upsert vào `gold.nhat_ky_hien_thi`: lượt hiển thị mới được chèn, còn phản hồi nhấp hoặc mua đặt cờ tương ứng của dòng đã có bằng phép OR logic, nên phát lại một batch không bao giờ đếm trùng. Bảng bật Change Data Feed từ phiên bản 0.

**Xử lý xung đột.** DAG bảo trì hằng đêm nén và dọn chính hai bảng gold mà các luồng cập nhật liên tục. Với điều khiển tương tranh lạc quan của Delta, giao dịch nào commit sau sẽ thất bại với một `Concurrent…Exception`; một lỗi không được xử lý trong `foreachBatch` sẽ dừng cả truy vấn luồng. Vì vậy cả hai luồng và job bảo trì đều bọc thao tác ghi trong một hàm thử lại, chạy lại câu lệnh tối đa năm lần với thời gian chờ tăng dần, nhưng chỉ với các ngoại lệ xung đột của Delta. Cách làm này an toàn vì một giao dịch bị từ chối chưa ghi gì, và mọi câu lệnh liên quan (một MERGE có khóa, một OPTIMIZE hay một DELETE) đều cho cùng kết quả khi lặp lại.

**Ngân sách độ trễ.** Một cú nhấp đến Kafka trong chưa đầy một giây. Truy vấn thịnh hành nhận nó ở lần kích hoạt kế tiếp (chậm nhất 20 giây sau), tổng hợp và MERGE trong một micro-batch, và ứng dụng web đọc cửa sổ mới nhất ở lần tải trang kế tiếp. Tổng thời gian nằm gọn trong mục tiêu 90 giây, còn dư cho một micro-batch chậm.

### Các tính năng Delta Lake trong thực tế {#sec:impl-delta}

@tab:delta ánh xạ từng yêu cầu Delta Lake của đặc tả (mục 3.7) sang cách hiện thực.

Table: Các yêu cầu Delta Lake và cách hiện thực {#tab:delta w=18,52,30}
| Yêu cầu | Hiện thực | Tệp |
|---|---|---|
| MERGE | Upsert danh sách gợi ý theo từng người dùng kèm xóa các thứ hạng thừa; upsert cửa sổ thịnh hành; upsert lượt hiển thị và phản hồi | `ml/ghi_gold.py`, `streaming/tinh_thinh_hanh.py`, `streaming/ghi_hien_thi.py` |
| Time travel | Mỗi lượt huấn luyện ghi phiên bản đặc trưng; DAG 5 chạy lại huấn luyện với `versionAsOf`; màn hình tái lập tổng hợp lại nhật ký hiển thị tại phiên bản đã ghi | `kiem_tra/tai_lap_huan_luyen.py`, `kiem_tra/tai_lap_ab.py`, web |
| Tiến hóa lược đồ | `ALTER TABLE ADD COLUMNS` rồi MERGE để điền; dòng mới tự có các cột; mô hình phiên bản 2 | `transform/tien_hoa_luoc_do.py`, `transform/bronze_to_silver.py`, `ml/tron_goi_y.py` |
| Change Data Feed | Bật cho nhật ký hiển thị ngay khi tạo; job A/B đọc `table_changes` từ phiên bản đã xử lý gần nhất và chỉ tính lại các ngày bị ảnh hưởng | `kiem_tra/khoi_tao_bang.py`, `transform/tinh_ket_qua_ab.py` |
| OPTIMIZE / Z-ORDER | `ZORDER BY (ma_nguoi_dung)` trên bảng gợi ý, đo trước và sau; nén hằng đêm sáu bảng | `bao_tri/do_zorder.py`, `bao_tri/toi_uu_delta.py` |
| Phân vùng | `silver.tuong_tac` theo ngày (bronze cũng vậy); mỗi ngày một tệp | `transform/bronze_to_silver.py`, `common/spark_utils.py` |
| Lưu giữ | 30 ngày cho tệp bị loại và 60 ngày cho nhật ký, để VACUUM hằng đêm không bao giờ phá time travel trong vòng một tháng | `common/spark_utils.py` (`tao_spark`) |

**Đo Z-ORDER (`do_zorder`).** Để tách tác dụng của việc gom cụm khỏi tác dụng của việc nén tệp, phép đo gồm ba pha trên một bản sao của bảng gợi ý: (1) bảng bị phân mảnh, mô phỏng nhiều ngày MERGE (200 tệp); (2) sau một lệnh OPTIMIZE thường chỉ nén tệp (kích thước đích 1 MB); (3) sau `OPTIMIZE … ZORDER BY (ma_nguoi_dung)`. Ở mỗi pha, job chạy ba mươi truy vấn tra cứu `WHERE ma_nguoi_dung = ?` cho các người dùng ngẫu nhiên và ghi lại số tệp phải đọc (từ chỉ số của truy vấn) và độ trễ. So pha 3 với pha 2 tách riêng được lợi ích của Z-ORDER; một phiên bản trước chỉ so trước và sau nên đã trộn lẫn hai tác dụng (@sec:issues).

## Điều phối với Airflow {#sec:impl-airflow}

Năm DAG hiện thực các luồng công việc của đặc tả (mục 3.9). @tab:dags tóm tắt các DAG; @fig:dag1 trình bày pipeline hằng ngày và @fig:dags trình bày bốn DAG còn lại.

Table: Các DAG Airflow {#tab:dags w=24,15,61}
| DAG | Lịch chạy | Nội dung |
|---|---|---|
| `kn_pipeline_hang_ngay` | 02:00 hằng ngày | Sensor chờ dữ liệu bronze mới → mã lượt chạy → làm sạch, thống kê, sản phẩm liên quan, ma trận, tinh chỉnh, đánh giá → rẽ nhánh: sinh, trộn và công bố, hoặc giữ mô hình cũ và cảnh báo. Tham số: lưới (`toi_thieu` / `day_du`), số tương tác tối thiểu |
| `kn_giam_sat_streaming` | mỗi 15 phút | Kiểm tra ứng dụng thịnh hành còn sống và bảng thịnh hành có cửa sổ kết thúc trong 15 phút gần nhất; nếu một trong hai kiểm tra thất bại thì khởi động lại luồng và ghi cảnh báo |
| `kn_tinh_ab` | hằng giờ | Đọc Change Data Feed của nhật ký hiển thị, tính lại các ngày bị ảnh hưởng, chạy kiểm định z và ghi `gold.ket_qua_ab` kèm phiên bản dữ liệu |
| `kn_bao_tri` | 04:00 hằng ngày | Xóa danh sách gợi ý sinh trước lần triển khai gần nhất hơn 7 ngày và cửa sổ thịnh hành cũ hơn 2 ngày, nén sáu bảng (Z-ORDER khi có ích), chạy VACUUM |
| `kn_tai_lap` | thủ công | Lấy `phien_ban_delta` (phiên bản đặc trưng) và `che_do` (mô hình đã chọn hoặc toàn lưới) từ cấu hình lượt chạy, chạy lại huấn luyện và đánh giá trên phiên bản đó rồi so với lịch sử; thất bại nếu độ lệch vượt 10^{−6} |

![Các DAG 2 đến 5: giám sát luồng, A/B hằng giờ, bảo trì hằng đêm và tái lập](hinh/f06_dag_khac.png){#fig:dags w=13.5}

Nhiều cơ chế giúp các DAG bền vững trên một cụm nhỏ:

- **Sensor không khởi động Spark.** Sensor so sánh, qua WebHDFS, thời điểm sửa đổi của thư mục `_spark_metadata` của bronze (được cập nhật sau mỗi batch file sink thành công) với thời điểm sửa đổi của `_delta_log` của silver (được cập nhật sau mỗi commit). Sensor chạy ở chế độ `reschedule`, nhả ô của mình giữa các lần kiểm tra cách nhau năm phút, và thất bại mềm sau sáu giờ, nên một đêm không có dữ liệu mới sẽ kết thúc bằng một lượt chạy bị bỏ qua chứ không phải một lỗi.
- **XCom mang kết quả.** Dòng stdout cuối cùng của mỗi task Spark là một đối tượng JSON; toán tử rẽ nhánh phân tích kết quả đánh giá, và mã lượt chạy do task đầu tiên tạo được truyền cho mọi task sau qua một template.
- **Thử lại và thời gian chờ tối đa.** Các task thử lại một lần; tinh chỉnh có thời gian chờ tối đa bốn giờ và cả DAG là tám giờ. Mọi job đều lũy đẳng, nên thử lại luôn an toàn.
- **Một ô pool duy nhất vào ban đêm.** Vì mọi driver chạy trên máy master, pool mặc định bị giới hạn một ô trong đêm, khi pipeline hằng ngày, job A/B hằng giờ và bảo trì có thể chồng lên nhau.
- **Cảnh báo.** Một hàm gọi lại khi lỗi ghi thêm một dòng vào `logs/canh_bao.log` và vào nhật ký task; DAG giám sát luồng dùng cùng tệp này.

Hai hành vi của Airflow 3 đã được rút ra trên cụm. Một DAG bị tạm dừng khi mới tạo, và một lượt chạy thủ công của DAG đang tạm dừng sẽ nằm mãi trong hàng đợi; vì vậy `kn_tai_lap` phải được bỏ tạm dừng dù không có lịch, nếu không nút "Chạy lại mô hình" của ứng dụng web sẽ không có tác dụng. Và khi bỏ tạm dừng một DAG có lịch, Airflow lập tức tạo một lượt chạy cho mốc lịch gần nhất trong quá khứ: bật ba DAG hằng đêm lúc 23:21 đã khởi động cả ba cùng lúc thay vì lúc 02:00 và 04:00.

## Ứng dụng web {#sec:impl-web}

Ứng dụng web đóng vai sàn thương mại, đúng như mục 3.8 của đặc tả yêu cầu, để có thể sinh lượt hiển thị và cú nhấp thật. Đây là một ứng dụng FastAPI với template Jinja2 và một ít JavaScript, chạy trên labsoe-18 (máy chủ đầu tiên, Ctam, được giữ làm dự phòng, sự cố 26). Ứng dụng đọc bảng Delta trực tiếp từ HDFS bằng một phiên Spark cục bộ (`local[2]`) trong chính tiến trình, không lấy lõi của cụm, và không ghi gì vào Delta: mọi sự kiện đều đi vào Kafka (@tab:web).

Table: Các màn hình và API của ứng dụng web {#tab:web w=20,45,35}
| Màn hình | Nội dung | API |
|---|---|---|
| Trang chủ (mô phỏng) | Chọn một người dùng trong danh sách hoặc gõ mã (đăng nhập mô phỏng), hoặc tạo người dùng hoàn toàn mới; hiển thị chiến lược, nhóm A/B của người dùng, mười sản phẩm "Dành cho bạn" kèm nguồn, và "Đang thịnh hành"; mỗi lần dựng trang đều ghi lượt hiển thị | `GET /api/goi-y/{user_id}`, `POST /api/hien-thi` |
| Trang sản phẩm | Chi tiết sản phẩm, sản phẩm liên quan, số đếm thịnh hành hiện tại của sản phẩm; các nút Xem, Thêm vào giỏ, Mua đẩy sự kiện vào Kafka | `POST /api/su-kien` |
| Bảng điều khiển A/B | CTR và tỉ lệ chuyển đổi theo nhóm, biểu đồ theo ngày, p-value, kiểm định gộp, cỡ mẫu cần thiết, tỉ lệ lưu lượng mô phỏng, kết luận | `GET /api/ab/ket-qua` |
| Chất lượng mô hình | Chỉ số theo phiên bản mô hình, so sánh với baseline và các biến thể xếp hạng lại, bảng tinh chỉnh, biểu đồ phân bố độ phổ biến | `GET /api/mo-hinh/chi-so` |
| Tái lập | Chọn một kết quả A/B trong quá khứ, xem phiên bản Delta của nó, chạy lại phép tổng hợp trên phiên bản đó và so cũ với mới; kích hoạt DAG 5 | `POST /api/tai-lap/{ngay}`, `POST /api/tai-lap-mo-hinh` |

Các endpoint phụ trả về sản phẩm thịnh hành (`/api/thinh-hanh`, và theo từng sản phẩm để đo độ trễ), danh sách người dùng mẫu cho phần minh họa và một endpoint kiểm tra sức khỏe cho biết chế độ dữ liệu và Kafka client đang dùng. Ứng dụng có hai chế độ dữ liệu: `delta`, mặc định, đọc từ cụm; `gia` phục vụ dữ liệu sinh sẵn để có thể phát triển giao diện mà không cần cụm.

**Một lớp hiển thị minh họa.** RetailRocket đã được ẩn danh: sản phẩm không có tên hay hình, danh mục là mã số, các thuộc tính khác đã bị băm. Để các trang đọc giống một sàn thương mại, một lớp hiển thị (`web/dich_vu/minh_hoa.py`) gán cho mỗi danh mục cấp hai của cây danh mục (con trực tiếp của một trong các gốc, tìm được bằng cách đi ngược lên trong `category_tree.csv`) một trong mười sáu ngành hàng minh họa (điện thoại, thời trang, đồ bếp, …), suy ra tên hiển thị từ ngành hàng và mã sản phẩm ("Tai nghe 102605"), định dạng thuộc tính giá đã ẩn danh thành giá tiền, và vẽ hình sản phẩm dưới dạng ảnh SVG ngay trên máy chủ: biểu tượng của ngành hàng trên một nền có sắc độ thay đổi theo mã sản phẩm. Địa chỉ của hình chứa ngành hàng (`/anh/<ngành hàng>/<mã>.svg`), nên thẻ sản phẩm và hình của nó luôn khớp nhau, kể cả khi trình duyệt còn giữ hình vẽ theo một cách ánh xạ cũ (sự cố 30). Cách ánh xạ là tất định, không cần Internet, và không đụng đến bảng, mô hình hay chỉ số nào. Mỗi hình đều có dòng chữ "ảnh minh họa", chân trang của mọi trang ghi rõ tên, ngành hàng và hình đều mang tính minh họa, và mã thật của sản phẩm và danh mục vẫn hiện trên mọi thẻ.

Người dùng hoàn toàn mới tạo trên trang chủ nhận mã `moi_<8 ký tự>` và chiến lược chỉ dùng thịnh hành. Cú nhấp của họ đi vào Kafka như mọi sự kiện khác, nhưng chỉ đến được silver ở lượt chạy đêm kế tiếp; để minh họa ngay tại chỗ chiến lược "ít hơn năm tương tác", ứng dụng giữ tương tác của phiên trong bộ nhớ và áp dụng cùng hàm trộn với job theo lô. Bộ nhớ này mất khi ứng dụng khởi động lại, đúng với bản chất của một phiên. Nút "Chạy lại mô hình" kích hoạt DAG 5 qua REST API của Airflow 3: ứng dụng lấy một JWT từ `/auth/token` bằng mật khẩu lưu trong `.env.rieng` của máy chủ rồi gửi một lượt chạy tới `/api/v2/dags/kn_tai_lap/dagRuns`.

## Thử nghiệm A/B và mô phỏng lưu lượng {#sec:impl-ab}

**Đơn vị và chỉ số.** Đơn vị thực nghiệm là một lượt hiển thị khối "Dành cho bạn" có chiến lược ALS; lượt hiển thị cho người dùng khởi đầu lạnh bị loại vì không thuộc thử nghiệm (cả hai nhóm nhận cùng danh sách khởi đầu lạnh). CTR là số lượt nhấp chia cho số lượt hiển thị, và tỉ lệ chuyển đổi là số lượt mua chia cho số lượt hiển thị. `tinh_ket_qua_ab` tính cả hai theo từng ngày và từng nhóm cùng kiểm định z hai tỉ lệ của @eq:z cho mỗi chỉ số; hai nhóm của một ngày dùng chung p-value và phiên bản dữ liệu. Bảng điều khiển bổ sung một kiểm định gộp trên toàn bộ thời kỳ và cỡ mẫu cần cho mỗi nhóm để phát hiện một mức tăng tương đối cho trước với α = 5 % và độ mạnh 80 % (@eq:n).

**Tính toán tăng dần với CDF.** Mỗi lượt chạy hằng giờ đọc `table_changes` của nhật ký hiển thị từ phiên bản mà lượt trước đã xử lý đến phiên bản hiện tại, gom các ngày của những dòng thay đổi và chỉ tính lại các ngày đó từ ảnh chụp tại phiên bản hiện tại; các dòng kết quả lưu phiên bản đó trong `phien_ban_delta_du_lieu`, nhờ vậy mọi dòng đều tái lập được.

**Lưu lượng mô phỏng.** Khách thật quá ít để kiểm định có độ mạnh, nên `mo_phong_hien_thi` sinh lượt hiển thị bằng một mô hình nhấp phụ thuộc vị trí (@eq:click): xác suất để ý ô *v* giảm theo *v*^{−η}, và xác suất sản phẩm phù hợp là 0,40 nếu sản phẩm thuộc tập đáp án của người dùng trong tháng kiểm tra và 0,03 nếu không. Một lượt nhấp dẫn đến mua hàng với xác suất 0,12. Mặc định không có phần thưởng nào cho sản phẩm thịnh hành, nên mô phỏng **không** giả định nhóm B tốt hơn. Mọi dòng mô phỏng có `nguon_traffic = "mo_phong"`, `gold.ket_qua_ab` lưu tỉ lệ lưu lượng mô phỏng, và bảng điều khiển hiển thị tỉ lệ này. Một tùy chọn giới hạn mô phỏng trong những người dùng có gợi ý ALS, điều cần thiết vì thử nghiệm A/B chỉ đếm lượt hiển thị ALS (@sec:res-ab).

$$click$$ {#eq:click}

Cách thứ hai, `producer/nguoi_dung_ao.py`, cho người dùng ảo đi qua ứng dụng web thật (web → Kafka → luồng hiển thị → CDF → job A/B). Xác suất nhấp của họ chỉ phụ thuộc vị trí, nên kết quả kỳ vọng là *không có khác biệt*: một thử nghiệm A/A kiểm tra rằng pipeline không báo ra những khác biệt giả.

## Khả năng tái lập {#sec:impl-repro}

Tái lập một thí nghiệm cần cùng dữ liệu, cùng mã nguồn và cùng tham số. Hệ thống ghi lại cả ba (@fig:repro):

- Mỗi dòng của `gold.lich_su_huan_luyen` lưu phiên bản đặc trưng, phiên bản silver, ngày cắt, các siêu tham số, `maxIter` và hạt giống ngẫu nhiên; commit của bảng đặc trưng lưu phiên bản danh mục sản phẩm và số tương tác tối thiểu.
- Mỗi dòng của `gold.ket_qua_ab` lưu phiên bản nhật ký hiển thị đã dùng để tính.
- Các thiết lập lưu giữ giữ cho mọi phiên bản trong 30 ngày gần nhất luôn sẵn sàng cho time travel.

**Tái lập một lượt huấn luyện (DAG 5).** `tai_lap_huan_luyen` đọc bảng đặc trưng với `VERSION AS OF v`, gọi đúng các hàm tinh chỉnh và đánh giá với các tham số đã ghi (cho riêng mô hình đã chọn hoặc cho toàn lưới) và so từng chỉ số với lịch sử. Kết quả so sánh được ghi vào `gold.ket_qua_tai_lap` và task thứ hai thất bại nếu độ lệch lớn nhất từ 10^{−6} trở lên. ALS trong Spark là tất định với cùng dữ liệu, tham số, số vòng lặp, hạt giống và số khối; một kiểm thử đơn vị huấn luyện hai lần và kiểm tra các chỉ số giống hệt nhau.

**Tái lập một kết quả A/B.** Màn hình tái lập và `tai_lap_ab` đọc nhật ký hiển thị tại phiên bản đã ghi, chạy lại hàm tổng hợp và so từng con số. Vì phép tính dùng số nguyên và công thức tất định, dung sai bằng không.

![Tái lập một thí nghiệm bằng time travel của Delta: lần đầu trên phiên bản đặc trưng 0 (10 tháng 11) và lần hai trên phiên bản 3, mô hình đang triển khai (11 tháng 11)](hinh/f09_tai_lap.png){#fig:repro w=15.8}

## Kiểm thử và bảo đảm chất lượng {#sec:impl-test}

Kho mã chứa 109 kiểm thử tự động (107 chạy trong môi trường chuẩn; hai bị bỏ qua khi chưa cài Airflow hoặc SciPy). Chúng chạy bằng `pytest` trên một phiên Spark cục bộ thật, nên kiểm tra đúng mã DataFrame chạy trên cụm (@tab:tests). Các script hạ tầng được kiểm thử bằng cách đặt các lệnh giả `ssh`, `docker`, `curl`, `getent` hoặc `ping` lên đầu `PATH` rồi kiểm tra script làm gì với chúng.

Table: Kiểm thử tự động theo lĩnh vực {#tab:tests w=27,8,65}
| Tệp kiểm thử | Số KT | Nội dung kiểm tra |
|---|---|---|
| `test_bronze_to_silver.py` | 7 | Ngưỡng lọc bot, chống nhấp lặp 5 giây, trọng số, làm sạch đầy đủ, khử trùng lặp khi phát lại, mỗi ngày một tệp |
| `test_ml.py` | 12 | Chia theo thời gian, suy giảm, indexer chỉ thêm nhãn, ALS thắng các baseline trên dữ liệu có cấu trúc, hai lần huấn luyện cho chỉ số giống hệt, lọc giá của v2, cấu hình phục vụ được thêm vào lưới |
| `test_chi_so.py` | 4 | Chỉ số xếp hạng so với `RankingMetrics` của Spark, độ phủ và độ mới lạ |
| `test_tron.py` | 11 | Mẫu A/B, phân nhóm ổn định, chiến lược khởi đầu lạnh, vị trí sản phẩm mới, xếp hạng lại, bù thịnh hành |
| `test_ab_va_tron.py`, `test_thong_ke.py` | 12 | Tổng hợp A/B, kiểm định z và cỡ mẫu so với giá trị tham chiếu, kiểm định bền vững theo cụm, bootstrap theo người dùng và hệ số thiết kế |
| `test_streaming.py` | 8 | Chuẩn hóa sự kiện, cửa sổ và watermark, điểm thịnh hành, tổng hợp lượt hiển thị, tóm tắt tiến độ chạy một lần |
| `test_web.py` | 12 | Mọi màn hình và API ở chế độ mô phỏng, Kafka client giả, hình minh họa luôn khớp ngành hàng trên thẻ, người dùng khởi đầu lạnh hiển thị ngoài thử nghiệm |
| `test_xuat_ket_qua.py`, `test_xung_dot_delta.py` | 9 | Xuất kết quả, A/B gộp, chỉ thử lại khi xung đột Delta, bảo trì giữ lần triển khai gần nhất |
| `test_thi_nghiem_bo_sung.py` | 11 | Các thí nghiệm bổ sung: chia validation theo ngày, tập đáp án giới hạn trong người dùng và sản phẩm huấn luyện, đọc indexer đã lưu mà không ghi, tính chỉ số cho nhiều kỳ trong một lượt, job A/B theo người dùng, ghép nguồn ứng viên và quy tắc chọn công bố trước, đồng xuất hiện chỉ từ dữ liệu huấn luyện |
| `test_ha_tang.py` | 23 | Lược đồ bảng, vai trò trong script khởi động, khởi động một vai trò và build ảnh, MTU của ZeroTier, dừng luồng kèm dừng driver, bỏ qua sensor cho lượt chạy thủ công, điều khiển SSH và phân phối mã (kể cả thử lại), đo mạng, lượt chạy đầu có thể tiếp tục, script chép và dọn dữ liệu, cấu hình Airflow, script trạng thái, cấu trúc DAG |

Mọi lỗi phát hiện trong quá trình phát triển hoặc trên cụm đều được viết một kiểm thử hồi quy trước khi sửa; @sec:issues liệt kê các lỗi đó.
