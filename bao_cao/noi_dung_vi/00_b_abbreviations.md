# !Danh mục từ viết tắt

Table: - {w=18,82}
| Viết tắt | Ý nghĩa |
|---|---|
| ACID | Atomicity, Consistency, Isolation, Durability (tính nguyên tử, nhất quán, cô lập, bền vững) |
| ALS | Alternating Least Squares (bình phương tối thiểu luân phiên) |
| AP / MAP | Average Precision / Mean Average Precision (độ chính xác trung bình / trung bình của độ chính xác trung bình) |
| API | Application Programming Interface (giao diện lập trình ứng dụng) |
| CDF | Change Data Feed (luồng thay đổi dữ liệu của Delta Lake) |
| CTR | Click-Through Rate (tỉ lệ nhấp) |
| DAG | Directed Acyclic Graph (đồ thị có hướng không chu trình, một luồng công việc của Airflow) |
| DCG / NDCG | (Normalised) Discounted Cumulative Gain (lợi ích tích lũy có chiết khấu, đã chuẩn hóa) |
| DXA | Một phần hai mươi điểm in (đơn vị bố cục của Word) |
| HDFS | Hadoop Distributed File System (hệ thống tệp phân tán Hadoop) |
| JVM | Java Virtual Machine (máy ảo Java) |
| KRaft | Kafka Raft metadata mode (Kafka không cần ZooKeeper) |
| MLlib | Thư viện học máy của Spark |
| MTU | Maximum Transmission Unit (kích thước gói truyền tối đa) |
| OOM | Out Of Memory (hết bộ nhớ) |
| P@K / R@K | Precision / Recall tại ngưỡng K (độ chính xác / độ bao phủ ở K vị trí đầu) |
| RAM | Random Access Memory (bộ nhớ truy cập ngẫu nhiên) |
| RPC | Remote Procedure Call (lời gọi thủ tục từ xa) |
| SSH | Secure Shell |
| UI | User Interface (giao diện người dùng) |
| XCom | Giá trị trao đổi giữa các task của Airflow |

# !Quy ước đặt tên

Đề bài quy định tên bảng, cột và job bằng tiếng Việt không dấu, và phần hiện thực giữ nguyên các tên này để mọi thành phần đều truy ngược được về đề bài. Bảng dưới đây giải nghĩa các định danh xuất hiện nhiều nhất trong báo cáo.

Table: - {w=32,68}
| Định danh | Ý nghĩa |
|---|---|
| `su_kien` | sự kiện (luồng nhấp chuột thô) |
| `tuong_tac` | tương tác (sự kiện đã làm sạch, có trọng số) |
| `san_pham` | sản phẩm (danh mục hàng hóa) |
| `ma_tran_tuong_tac` | ma trận tương tác người dùng – sản phẩm (đầu vào của ALS) |
| `goi_y_nguoi_dung` | danh sách gợi ý cho từng người dùng |
| `thinh_hanh_15p` | điểm thịnh hành theo cửa sổ 15 phút |
| `nhat_ky_hien_thi` | nhật ký hiển thị |
| `ket_qua_ab` | kết quả thử nghiệm A/B |
| `thong_ke_san_pham` | thống kê sản phẩm |
| `san_pham_lien_quan` | sản phẩm liên quan |
| `ket_qua_tuning`, `lich_su_huan_luyen` | kết quả tinh chỉnh, lịch sử huấn luyện |
| `ket_qua_tai_lap` | kết quả tái lập |
| `ma_nguoi_dung`, `ma_san_pham`, `ma_danh_muc` | mã người dùng, mã sản phẩm, mã danh mục |
| `thoi_diem`, `ngay` | thời điểm, ngày (cột phân vùng) |
| `loai_su_kien`: `xem`, `them_gio`, `mua`, `bo_gio` | loại sự kiện: xem, thêm vào giỏ, mua, bỏ khỏi giỏ |
| `trong_so`, `diem` | trọng số, điểm (đã suy giảm) |
| `xep_hang`, `diem_du_doan`, `nguon` | thứ hạng, điểm dự đoán, nguồn của một gợi ý |
| `nhom_ab`, `vi_tri`, `da_click`, `da_mua` | nhóm A/B, vị trí ô, đã nhấp, đã mua |
| `phien_ban_delta`, `ma_chay` | phiên bản bảng Delta, mã lượt chạy |
| `nap_su_kien`, `tinh_thinh_hanh`, `ghi_hien_thi` | các job luồng: nạp sự kiện, tính thịnh hành, ghi lượt hiển thị |
| `chuan_bi_ma_tran`, `huan_luyen_als`, `danh_gia` | chuẩn bị ma trận, huấn luyện ALS, đánh giá |
| `sinh_goi_y_toan_bo`, `tron_goi_y`, `ghi_gold` | sinh gợi ý, trộn gợi ý, công bố vào gold |
| `tinh_ket_qua_ab`, `tai_lap`, `bao_tri` | tính kết quả A/B, tái lập, bảo trì |
| `kn_*` | tiền tố của các DAG Airflow (*khuyến nghị*) |

Các thuật ngữ kỹ thuật phổ biến (ví dụ *time travel*, *watermark*, *micro-batch*, *checkpoint*, *baseline*) được giữ nguyên tiếng Anh khi không có từ tiếng Việt tương đương thông dụng; lần xuất hiện đầu tiên có giải thích. Chữ trong các hình giữ nguyên tiếng Anh để khớp với mã nguồn và nhật ký hệ thống.
