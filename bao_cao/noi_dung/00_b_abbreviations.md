# !List of Abbreviations

Table: - {w=18,82}
| Abbreviation | Meaning |
|---|---|
| ACID | Atomicity, Consistency, Isolation, Durability |
| ALS | Alternating Least Squares |
| AP / MAP | Average Precision / Mean Average Precision |
| API | Application Programming Interface |
| CDF | Change Data Feed (Delta Lake) |
| CTR | Click-Through Rate |
| DAG | Directed Acyclic Graph (an Airflow workflow) |
| DCG / NDCG | (Normalised) Discounted Cumulative Gain |
| DXA | Twentieth of a typographic point (unit of Word layouts) |
| HDFS | Hadoop Distributed File System |
| JVM | Java Virtual Machine |
| KRaft | Kafka Raft metadata mode (Kafka without ZooKeeper) |
| MLlib | Spark Machine Learning library |
| MTU | Maximum Transmission Unit |
| OOM | Out Of Memory |
| P@K / R@K | Precision / Recall at cut-off K |
| RAM | Random Access Memory |
| RPC | Remote Procedure Call |
| SSH | Secure Shell |
| UI | User Interface |
| XCom | Cross-communication value passed between Airflow tasks |

# !Naming Conventions

The assignment specifies table, column and job names in Vietnamese, and the implementation keeps them unchanged so that every artefact can be traced back to the specification. The table below translates the identifiers that appear most often in this report.

Table: - {w=32,68}
| Identifier | Meaning |
|---|---|
| `su_kien` | events (raw clickstream) |
| `tuong_tac` | interactions (cleaned, weighted events) |
| `san_pham` | products (catalogue) |
| `ma_tran_tuong_tac` | user–item interaction matrix (ALS input) |
| `goi_y_nguoi_dung` | per-user recommendation lists |
| `thinh_hanh_15p` | 15-minute trending scores |
| `nhat_ky_hien_thi` | impression log |
| `ket_qua_ab` | A/B test results |
| `thong_ke_san_pham` | product statistics |
| `san_pham_lien_quan` | related products |
| `ket_qua_tuning`, `lich_su_huan_luyen` | tuning results, training history |
| `ket_qua_tai_lap` | reproduction results |
| `ma_nguoi_dung`, `ma_san_pham`, `ma_danh_muc` | user id, product id, category id |
| `thoi_diem`, `ngay` | timestamp, date (partition column) |
| `loai_su_kien`: `xem`, `them_gio`, `mua`, `bo_gio` | event type: view, add-to-cart, purchase, remove-from-cart |
| `trong_so`, `diem` | weight, (decayed) score |
| `xep_hang`, `diem_du_doan`, `nguon` | rank, predicted score, source of a recommendation |
| `nhom_ab`, `vi_tri`, `da_click`, `da_mua` | A/B group, slot position, clicked, purchased |
| `phien_ban_delta`, `ma_chay` | Delta table version, run id |
| `nap_su_kien`, `tinh_thinh_hanh`, `ghi_hien_thi` | streaming jobs: ingest events, compute trending, write impressions |
| `chuan_bi_ma_tran`, `huan_luyen_als`, `danh_gia` | prepare matrix, train ALS, evaluate |
| `sinh_goi_y_toan_bo`, `tron_goi_y`, `ghi_gold` | generate recommendations, blend them, publish to gold |
| `tinh_ket_qua_ab`, `tai_lap`, `bao_tri` | compute A/B results, reproduce, maintenance |
| `kn_*` | prefix of the Airflow DAGs (*khuyến nghị*, recommendation) |
