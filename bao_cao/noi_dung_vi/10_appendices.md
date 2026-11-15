# @A Cấu trúc kho mã {#sec:app-repo}

Kho mã được tổ chức theo thành phần. Tài liệu tiếng Việt đi kèm mã nguồn: thẻ mô hình (`MO_HINH.md`), nhật ký đồ án ghi mọi sự cố (`NHAT_KY.md`), kiến trúc (`docs/KIEN_TRUC.md`), hướng dẫn triển khai (`docs/TRIEN_KHAI_CUM.md`), hướng dẫn minh họa (`docs/HUONG_DAN_DEMO.md`) và bảng đối chiếu yêu cầu (`docs/DOI_CHIEU_YEU_CAU.md`).

```
bd03_khuyen_nghi/
├── cau_hinh/cum.env       danh bạ cụm: máy, IP, vai trò, số lõi, bộ nhớ
├── conf/                  spark-defaults.conf, hdfs-site.xml, core-site.xml, .env.example
├── jobs/                  các job PySpark, nộp bằng ha_tang/spark/submit.sh
│   ├── common/            thư viện dùng chung, được nén và gửi tới executor:
│   │                      cau_hinh, luoc_do, spark_utils, als_lib, chi_so,
│   │                      tron, ab, thong_ke, nguon_luong
│   ├── streaming/         nap_su_kien, tinh_thinh_hanh, ghi_hien_thi
│   ├── transform/         nhap_danh_muc, bronze_to_silver, thong_ke_san_pham,
│   │                      tinh_ket_qua_ab, mo_phong_hien_thi, tien_hoa_luoc_do
│   ├── ml/                chuan_bi_ma_tran, huan_luyen_als, danh_gia,
│   │                      sinh_goi_y_toan_bo, tron_goi_y, ghi_gold,
│   │                      san_pham_lien_quan
│   ├── bao_tri/           toi_uu_delta, do_zorder
│   └── kiem_tra/          khoi_tao_bang, tai_lap_huan_luyen, tai_lap_ab,
│                          kiem_tra_thinh_hanh, xuat_ket_qua, thu_xep_lai, eda,
│                          phan_tich_loi, chay_sql, kiem_tra_lakehouse, ...
├── producer/              phat_lai_su_kien (phát lại vào Kafka), nguoi_dung_ao
├── web/                   ứng dụng FastAPI, dịch vụ, template
├── airflow/dags/          5 DAG + mô-đun dùng chung bd03_chung
├── ha_tang/               Docker Compose và ảnh theo từng dịch vụ
├── scripts/               điều khiển cụm, chạy lần đầu, luồng, thí nghiệm, chuyển gốc lakehouse,
│                          demo Delta SQL và cây HDFS, thu bằng chứng
├── notebooks/             eda_retailrocket.ipynb (khảo sát dữ liệu)
├── tests/                 139 kiểm thử pytest trên Spark cục bộ và Airflow 3.3.1
├── docs/                  kiến trúc, triển khai, minh họa, đối chiếu yêu cầu, AI_USAGE,
│                          bang_chung/ (output thu trên cụm), ket_qua_cum/
└── bao_cao/               báo cáo này: nội dung, hình, trình dựng
```

Table: Quy mô mã nguồn theo thành phần {#tab:loc w=30,15,15,40}
| Thành phần | Số tệp | Số dòng | Nội dung |
|---|---|---|---|
| `jobs/` | 42 | 5.540 | Các job luồng, theo lô, học máy, bảo trì và kiểm tra, thư viện dùng chung |
| `web/` | 19 | 2.036 | Ứng dụng, dịch vụ, lớp hiển thị minh họa, template, tệp tĩnh |
| `scripts/` | 25 | 2.280 | Điều khiển cụm và các pipeline |
| `tests/` | 16 | 2.436 | 139 kiểm thử |
| `ha_tang/` | 12 | 564 | Tệp compose, Dockerfile, XML của Hadoop |
| `airflow/` | 6 | 451 | Các DAG |
| `producer/` | 2 | 241 | Phát lại vào Kafka và người dùng ảo |

# @B Sổ tay triển khai và vận hành {#sec:app-runbook}

Quy trình đầy đủ, kèm cách xử lý sự cố, có trong `docs/TRIEN_KHAI_CUM.md`. Các lệnh dưới đây là những lệnh đã dùng trong thực tế; mỗi khối ghi rõ chạy ở đâu (từ laptop, một lệnh được gửi bằng `ssh <máy> "..."`).

**Chuẩn bị một lần (từng máy Linux, rồi đến laptop).**

```
sudo zerotier-cli join 633e31d8a29b038c     # rồi cấp quyền trong ZeroTier Central
sudo ufw allow in on zt+ comment "ZeroTier ttunet - bd03"
sudo bash scripts/cum/cau_hinh_zerotier.sh  # chặn các giao diện Docker
# trên laptop
bash scripts/cum/ssh_tat_ca.sh --tao-config > ~/.ssh/config
bash scripts/cum/ssh_tat_ca.sh --chep-khoa
bash scripts/cum/ssh_tat_ca.sh --dong-bo-ma # phân phối mã đã commit
```

**Khởi động dịch vụ (từng máy, máy master trước) và kiểm tra cụm.**

```
bash scripts/cum/ssh_tat_ca.sh \
     "cd ~/bd03_khuyen_nghi && bash scripts/cum/khoi_dong_may.sh"
ssh labsoe-11 "cd ~/bd03_khuyen_nghi && bash scripts/cum/kiem_tra_cum.sh"
bash scripts/cum/do_mang.sh                 # đường ZeroTier trực tiếp hay qua relay
```

**Dữ liệu và pipeline đầu tiên.**

```
# trên laptop: tải từ Kaggle, chép lên máy master và máy Kafka
bash scripts/cum/chep_du_lieu.sh
# trên master: đưa các tệp CSV vào /lakehouse/bd03_khuyen_nghi/landing trên HDFS
bash scripts/tai_du_lieu.sh ~/du_lieu/retailrocket
# trên labsit: phát lại sự kiện vào Kafka (trong tmux)
python3 producer/phat_lai_su_kien.py --tep ~/du_lieu/retailrocket/events.csv
# trên master (trong tmux): pipeline đầu cuối đầu tiên
bash scripts/chay_lan_dau.sh 2>&1 | tee ~/chay_lan_dau.log
# tiếp tục sau một lần lỗi
TU_BUOC=6 MA_CHAY=<mã lượt chạy> bash scripts/chay_lan_dau.sh
```

**Airflow, các luồng và trạng thái.**

```
# tất cả chạy trên master
bash scripts/cum/tao_cau_hinh_airflow.sh && bash scripts/cum/khoi_dong_may.sh
docker exec bd03-airflow-airflow-scheduler-1 \
       airflow pools set default_pool 1 "one driver at a time"
bash scripts/luong.sh khoi_dong tat_ca      # khởi động 3 luồng
bash scripts/luong.sh trang_thai
bash scripts/cum/tinh_trang.sh              # bộ nhớ, ứng dụng Spark, lượt chạy Airflow
for d in kn_tai_lap kn_giam_sat_streaming kn_tinh_ab kn_bao_tri \
         kn_pipeline_hang_ngay; do
  docker exec bd03-airflow-airflow-scheduler-1 airflow dags unpause $d
done
```

**Thí nghiệm và kết quả.**

```
# tiến hóa lược đồ (mô hình v2 ở lượt chạy DAG 1 kế tiếp)
bash ha_tang/spark/submit.sh lo transform/tien_hoa_luoc_do.py
# tái lập một lượt huấn luyện trên phiên bản đặc trưng 0
docker exec bd03-airflow-airflow-scheduler-1 airflow dags trigger kn_tai_lap \
       -c '{"phien_ban_delta": 0, "che_do": "mo_hinh_chon"}'
# đo Z-ORDER
bash ha_tang/spark/submit.sh bao_tri bao_tri/do_zorder.py \
       --phan-manh 200 --so-truy-van 30
# xuất mọi kết quả dạng Markdown (chạy trong tmux, rồi chép tệp về)
bash ha_tang/spark/submit.sh nhanh kiem_tra/xuat_ket_qua.py > ~/ket_qua.md
```

**Chuyển gốc hồ dữ liệu và thu bằng chứng (15 tháng 11).**

```
# trên laptop, sau git pull: dừng luồng, đồng bộ mã, hdfs dfs -mv, viết lại _spark_metadata, kiểm tra, bật lại
bash scripts/cum/chuyen_lakehouse.sh --chay
# trên master (trong tmux): du -h, cây HDFS, quarantine, DESCRIBE HISTORY, độ trễ web, EDA, phân tích lỗi
bash scripts/thu_bang_chung.sh
# demo Delta SQL (Spark local[2] trong container spark-master)
bash scripts/demo/cay_hdfs.sh
bash scripts/demo/delta_sql.sh demo <ma_nguoi_dung>
# backfill
docker exec bd03-airflow-airflow-scheduler-1 airflow backfill create --dag-id kn_tinh_ab \
       --from-date 2026-11-10 --to-date 2026-11-12 --reprocess-behavior completed
docker exec bd03-airflow-airflow-scheduler-1 airflow dags trigger kn_pipeline_hang_ngay \
       -c '{"tu_ngay": "2015-09-10", "den_ngay": "2015-09-12"}'
```

**Tắt hệ thống an toàn.** Dừng các luồng (`scripts/luong.sh dung tat_ca`; checkpoint bảo đảm khởi động lại không mất và không trùng dữ liệu), rồi chạy `khoi_dong_may.sh --dung` trên từng máy, các worker trước, master sau cùng. Không bao giờ chạy `docker compose down -v`, lệnh này sẽ xóa các volume của HDFS và Kafka, và không bao giờ dừng container của nhóm khác trên các máy dùng chung.

# @C Kịch bản minh họa {#sec:app-demo}

Phần minh họa tại buổi bảo vệ bao phủ tám tiêu chí nghiệm thu trong khoảng mười lăm phút, từ laptop trình chiếu. Ba mươi phút trước đó, người vận hành kiểm tra ba luồng đang chạy, khởi động producer ở tốc độ thời gian thực trên một giai đoạn gần đây để khối thịnh hành hoạt động, bật DAG giám sát luồng và mở ứng dụng web, giao diện Spark Master, giao diện Kafka, Airflow và giao diện HDFS.

Table: Trình tự minh họa {#tab:demo w=5,25,40,30}
| # | Hạng mục | Ở đâu và trình bày gì | Bằng chứng dự phòng |
|---|---|---|---|
| 0 | Kiến trúc | Giao diện Spark: 5 worker đang sống và 3 ứng dụng luồng; giao diện HDFS: 5 DataNode; Airflow: 5 DAG | Ảnh chụp màn hình |
| 1 | Bảng tinh chỉnh | Màn hình chất lượng mô hình: 27 dòng sắp theo NDCG@10, dòng đầu trùng với siêu tham số đang triển khai | SQL trên `gold.ket_qua_tuning` |
| 2 | ALS so với baseline | Cùng màn hình: bảng so sánh và biểu đồ phân bố độ phổ biến; giải thích thiên lệch độ phổ biến và kết quả xếp hạng lại | @tab:phuong-phap |
| 3 | Khởi đầu lạnh | Tạo người dùng mới (mọi ô là thịnh hành); xem 2–3 sản phẩm của một danh mục; tải lại: chiến lược "ít tương tác" với danh mục đó; một người dùng đang hoạt động thấy sản phẩm mới ở ô 9–10 | Kiểm thử đơn vị của các chiến lược |
| 4–5 | Thịnh hành ≤ 90 giây và vòng khép kín | Trang sản phẩm của một sản phẩm ít được xem; giao diện Kafka ở chế độ trực tiếp; bấm *Thêm vào giỏ* ba lần; bấm giờ đến khi số đếm thịnh hành cập nhật; chỉ sự kiện trong bronze | `demo_vong_khep_kin.py`, `tim_su_kien_bronze.py` |
| 6 | Kết quả A/B | Bảng điều khiển A/B: CTR và tỉ lệ chuyển đổi theo nhóm, biểu đồ theo ngày, p-value, kết luận, cỡ mẫu cần thiết, tỉ lệ mô phỏng | @tab:ab |
| 7 | Tái lập | Màn hình tái lập: chọn một ngày cũ, chạy lại, mọi độ lệch bằng 0; bấm thêm vài sản phẩm rồi chạy lại cùng ngày đó (vẫn giống hệt); kích hoạt DAG 5 cho một phiên bản đặc trưng | @tab:tai-lap |
| 8 | OPTIMIZE / Z-ORDER | Màn hình chất lượng mô hình, phần cuối: số tệp đọc và độ trễ ở ba pha | @tab:zorder |
| C.4 | Yêu cầu chung của đề cương | Airflow: trigger trực tiếp `kn_tinh_ab`; terminal: `cay_hdfs.sh` (`hdfs dfs -ls -R`), `delta_sql.sh demo` (DESCRIBE HISTORY, VERSION AS OF); Spark UI: luồng đã chạy ≥ 30 phút; web: nhấp và "Chạy lại" rồi xác nhận dòng mới trong Delta | `docs/bang_chung/cum/` |

# @D Truy vết yêu cầu {#sec:app-trace}

@tab:truy-vet ánh xạ từng mục của đặc tả sang phần hiện thực. Tình trạng: **T** = có kiểm thử tự động trên Spark cục bộ; **C** = đã kiểm chứng trên cụm với dữ liệu thật.

Table: Truy vết từ đặc tả đến phần hiện thực {#tab:truy-vet w=10,42,38,10}
| Mục đặc tả | Yêu cầu | Hiện thực | Tình trạng |
|---|---|---|---|
| 3.1 | Các khối "Dành cho bạn", "Sản phẩm liên quan", "Thịnh hành"; A/B có khả năng tái lập | trang chủ và trang sản phẩm của web; `san_pham_lien_quan`; `tinh_thinh_hanh`; `tinh_ket_qua_ab`, `tai_lap_ab` | T, C |
| 3.2 | Dữ liệu RetailRocket; phát lại 1 ngày = 30 giây; 5 % người dùng mới | `chep_du_lieu.sh`, `nhap_danh_muc`; `phat_lai_su_kien.py` | T, C |
| 3.3 | Kiến trúc từ luồng nhấp chuột đến kết quả A/B | @fig:arch, @fig:lineage | C |
| 3.4 | Lược đồ bảng của bronze, silver, features, gold | `luoc_do.py`, @tab:bang | T, C |
| 3.5 | Nạp luồng với checkpoint trên HDFS | `nap_su_kien` | T, C |
| 3.5 | Cửa sổ trượt, watermark 2 phút, chế độ update + MERGE | `tinh_thinh_hanh` | T, C |
| 3.5 | Khử trùng lặp, lọc bot, trọng số | `bronze_to_silver` | T, C |
| 3.5 | Lưu StringIndexer để dùng lại, suy giảm theo thời gian | `chuan_bi_ma_tran` | T, C |
| 3.5 | ALS phản hồi ngầm, tinh chỉnh, top-20 mỗi người dùng | `huan_luyen_als`, `sinh_goi_y_toan_bo` (`recommendForUserSubset`) | T, C |
| 3.5 | Trộn ALS, thịnh hành và độ phổ biến theo danh mục; khởi đầu lạnh | `tron_goi_y`, `common/tron.py` | T, C |
| 3.5 | Tổng hợp lượt hiển thị và kiểm định z hai tỉ lệ | `tinh_ket_qua_ab`, `common/ab.py`, `common/thong_ke.py` | T, C |
| 3.6 | ALS phản hồi ngầm với cold-start drop; lưới ≥ 9; chia theo thời gian; 4 chỉ số + độ phủ + độ mới lạ; 2 baseline; các ngưỡng | `als_lib`, `chi_so`, `danh_gia`; @tab:tuning, @tab:phuong-phap | T, C |
| 3.6 | Ba chiến lược khởi đầu lạnh | @tab:cold-start, @fig:cold-start-web | T, C |
| 3.7 | MERGE, time travel, tiến hóa lược đồ, CDF, OPTIMIZE/Z-ORDER, phân vùng | @tab:delta | T, C |
| 3.8 | Năm màn hình web và API; hàm băm A/B ổn định | `web/`, `common/tron.chon_nhom` | T, C |
| 3.9 | Năm DAG với lịch chạy và cấu trúc theo đặc tả | `airflow/dags/` | T, C |
| 3.10 | Rủi ro: hết bộ nhớ, lưu lượng, gợi ý chậm, độ phủ thấp | ≥ 3 tương tác, numBlocks; mô phỏng có gắn nhãn; gợi ý theo tập con; phân tích và xếp hạng lại | T, C |
| 3.11 | Tám hạng mục nghiệm thu | @tab:ket-qua-nghiem-thu | C |
| A.4 | `hdfs:///lakehouse/<ma_de_tai>/` với `_quarantine` | `cau_hinh.LAKE_DUONG_DAN`, `chuyen_lakehouse.sh`, `_quarantine.tuong_tac` | T, C |
| A.6.2 | MERGE INTO, DESCRIBE HISTORY, VERSION AS OF, OPTIMIZE có số trước/sau | @tab:delta, `scripts/demo/delta_sql.sh`, @tab:zorder | T, C |
| A.6.3 | Mọi bảng trên HDFS, nộp `hdfs dfs -du -h` | `docs/bang_chung/cum/01_hdfs_du_h.txt` | C |
| A.6.4 | Ghi ngược vào Delta từ web | "Chạy lại" → `gold.ket_qua_tai_lap`; Kafka → MERGE `gold.nhat_ky_hien_thi` | T, C |
| A.6.5 | retries, sla, nhánh hoặc sensor | Deadline Alerts (thay `sla`), BranchPythonOperator, PythonSensor | T |
| A.8 | Backfill; web < 3 s; không kéo dữ liệu về driver | @sec:res-airflow, @sec:res-web, `docs/KIEN_TRUC.md` mục 9 | T, C |
| A.9 | `docs/AI_USAGE.md` | @sec:app-ai | – |

# @E Khai báo sử dụng AI {#sec:app-ai}

Nội dung đầy đủ nằm ở `docs/AI_USAGE.md` (mục A.9 của đề cương); phần dưới tóm tắt.

**Công cụ và phạm vi.** Nhóm dùng Claude (Anthropic) từ 9 đến 15 tháng 11 năm 2026, qua claude.ai Projects và Claude Code. AI sinh gần như toàn bộ các thành phần sau:

- mã nguồn, cấu hình, kiểm thử;
- tài liệu, báo cáo, slide và kịch bản bảo vệ.

Commit do AI tạo có tác giả `Claude` hoặc dòng `Co-Authored-By: Claude`. Trước đợt sửa theo đề cương, 83 trên 87 commit có tác giả `Claude`.

**Phần nhóm thực hiện.**

- Cung cấp đề cương và hạ tầng cụm cũ của nhóm.
- Dựng mạng ZeroTier và vận hành sáu máy lab.
- Tải dữ liệu bằng khóa Kaggle trên laptop.
- Chạy mọi job, luồng và DAG trên cụm thật; gửi log lỗi để AI sửa.
- Ra quyết định triển khai.
- Kiểm chứng kết quả, chụp màn hình, trình bày và bảo vệ.

Mọi con số trong báo cáo đến từ các lần chạy thật trên cụm.

**Prompt.** `docs/AI_USAGE.md` mục 3 liệt kê yêu cầu theo từng giai đoạn: các câu chép nguyên văn được đánh dấu, các câu còn lại là tóm tắt. Bản ghi hội thoại đầy đủ được lưu trong dự án Claude của nhóm.

# @F Phân công công việc {#sec:app-phan-cong}

> [!TODO] Nhóm điền bảng phân công theo bốn vai trò của mục A.2 (Data Engineer, ML Engineer, Web Developer, DevOps/Orchestration) và phần đóng góp thực tế của từng thành viên, khớp với lịch sử Git và `docs/AI_USAGE.md`.

Table: Phân công vai trò và đóng góp {#tab:phan-cong w=22,26,52}
| Thành viên | Vai trò | Đóng góp chính |
|---|---|---|
| Lê Chí Tâm (2302220) | | |
| Lê Nguyễn Quốc Anh (2302283) | | |
