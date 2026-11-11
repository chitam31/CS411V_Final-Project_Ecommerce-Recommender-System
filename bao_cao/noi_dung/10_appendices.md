# @A Repository Structure {#sec:app-repo}

The repository is organised by component. Documentation in Vietnamese accompanies the code: the model card (`MO_HINH.md`), the project journal with every incident (`NHAT_KY.md`), the architecture (`docs/KIEN_TRUC.md`), the deployment guide (`docs/TRIEN_KHAI_CUM.md`), the demonstration guide (`docs/HUONG_DAN_DEMO.md`) and the requirement mapping (`docs/DOI_CHIEU_YEU_CAU.md`).

```
bd03_khuyen_nghi/
├── cau_hinh/cum.env       cluster directory: hosts, IPs, roles, cores, memory
├── jobs/                  PySpark jobs, submitted with ha_tang/spark/submit.sh
│   ├── common/            shared library, zipped and shipped to executors:
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
│                          kiem_tra_thinh_hanh, xuat_ket_qua, thu_xep_lai, ...
├── producer/              phat_lai_su_kien (Kafka replay), nguoi_dung_ao
├── web/                   FastAPI app, services, templates
├── airflow/dags/          5 DAGs + shared module bd03_chung
├── ha_tang/               Docker Compose and images per service
├── scripts/               cluster control, first run, streams, experiments
├── tests/                 84 pytest tests on local Spark
├── docs/                  architecture, deployment, demo, requirement mapping
└── bao_cao/               this report: content, figures, generator
```

Table: Size of the code base by component {#tab:loc w=30,15,15,40}
| Component | Files | Lines | Content |
|---|---|---|---|
| `jobs/` | 35 | 4,110 | Streaming, batch, ML, maintenance and verification jobs, shared library |
| `web/` | 17 | 1,443 | Application, services, templates, static files |
| `scripts/` | 19 | 1,535 | Cluster control and pipelines |
| `tests/` | 12 | 1,623 | 90 tests |
| `ha_tang/` | 14 | 561 | Compose files, Dockerfiles, Hadoop XML |
| `airflow/` | 6 | 359 | DAGs |
| `producer/` | 2 | 241 | Kafka replay and virtual users |

# @B Deployment and Operation Runbook {#sec:app-runbook}

The full procedure, with troubleshooting, is in `docs/TRIEN_KHAI_CUM.md`. The commands below are the ones used in practice; each block states where it runs (from the laptop, a command is sent with `ssh <host> "..."`).

**One-time preparation (each Linux machine, then the laptop).**

```
sudo zerotier-cli join 633e31d8a29b038c     # then authorise in ZeroTier Central
sudo ufw allow in on zt+ comment "ZeroTier ttunet - bd03"
sudo bash scripts/cum/cau_hinh_zerotier.sh  # blacklist Docker interfaces
# on the laptop
bash scripts/cum/ssh_tat_ca.sh --tao-config > ~/.ssh/config
bash scripts/cum/ssh_tat_ca.sh --chep-khoa
bash scripts/cum/ssh_tat_ca.sh --dong-bo-ma # distribute the committed code
```

**Start the services (each machine, master first) and check the cluster.**

```
bash scripts/cum/ssh_tat_ca.sh \
     "cd ~/bd03_khuyen_nghi && bash scripts/cum/khoi_dong_may.sh"
ssh labsoe-11 "cd ~/bd03_khuyen_nghi && bash scripts/cum/kiem_tra_cum.sh"
bash scripts/cum/do_mang.sh                 # direct or relayed ZeroTier paths
```

**Data and first pipeline.**

```
# on the laptop: download from Kaggle, copy to the master and the Kafka host
bash scripts/cum/chep_du_lieu.sh
# on the master: put the CSV files into /lake/landing on HDFS
bash scripts/tai_du_lieu.sh ~/du_lieu/retailrocket
# on labsit: replay the events into Kafka (inside tmux)
python3 producer/phat_lai_su_kien.py --tep ~/du_lieu/retailrocket/events.csv
# on the master (inside tmux): first end-to-end pipeline
bash scripts/chay_lan_dau.sh 2>&1 | tee ~/chay_lan_dau.log
# resume after a failure
TU_BUOC=6 MA_CHAY=<run id> bash scripts/chay_lan_dau.sh
```

**Airflow, streams and status.**

```
# all on the master
bash scripts/cum/tao_cau_hinh_airflow.sh && bash scripts/cum/khoi_dong_may.sh
docker exec bd03-airflow-airflow-scheduler-1 \
       airflow pools set default_pool 1 "one driver at a time"
bash scripts/luong.sh khoi_dong tat_ca      # start the 3 streams
bash scripts/luong.sh trang_thai
bash scripts/cum/tinh_trang.sh              # memory, Spark apps, Airflow runs
for d in kn_tai_lap kn_giam_sat_streaming kn_tinh_ab kn_bao_tri \
         kn_pipeline_hang_ngay; do
  docker exec bd03-airflow-airflow-scheduler-1 airflow dags unpause $d
done
```

**Experiments and results.**

```
# schema evolution (model v2 at the next DAG 1 run)
bash ha_tang/spark/submit.sh lo transform/tien_hoa_luoc_do.py
# reproduction of a training run on feature version 0
docker exec bd03-airflow-airflow-scheduler-1 airflow dags trigger kn_tai_lap \
       -c '{"phien_ban_delta": 0, "che_do": "mo_hinh_chon"}'
# Z-ORDER measurement
bash ha_tang/spark/submit.sh bao_tri bao_tri/do_zorder.py \
       --phan-manh 200 --so-truy-van 30
# export all results as Markdown (run in tmux, then copy the file)
bash ha_tang/spark/submit.sh nhanh kiem_tra/xuat_ket_qua.py > ~/ket_qua.md
```

**Safe shutdown.** Stop the streams (`scripts/luong.sh dung tat_ca`; their checkpoints guarantee a restart without loss or duplication), then run `khoi_dong_may.sh --dung` on each machine, workers first and the master last. Never run `docker compose down -v`, which would delete the HDFS and Kafka volumes, and never stop containers of other groups on shared machines.

# @C Demonstration Script {#sec:app-demo}

The defence demonstration covers the eight acceptance criteria in about fifteen minutes, from the presentation laptop. Thirty minutes before, the operator checks that the three streams run, starts the producer at real-time speed on a recent period so that the trending block is live, enables the stream-monitor DAG and opens the web application, the Spark Master UI, the Kafka UI, Airflow and the HDFS UI.

Table: Demonstration sequence {#tab:demo w=5,25,40,30}
| # | Item | Where and what to show | Fallback evidence |
|---|---|---|---|
| 0 | Architecture | Spark UI: 5 live workers and 3 streaming applications; HDFS UI: 5 DataNodes; Airflow: 5 DAGs | Screenshots |
| 1 | Tuning table | Model quality screen: 27 rows sorted by NDCG@10, first row equals the deployed hyper-parameters | SQL on `gold.ket_qua_tuning` |
| 2 | ALS vs baselines | Same screen: comparison table and popularity distribution chart; explain popularity bias and the re-ranking result | @tab:phuong-phap |
| 3 | Cold start | Create a new user (all slots trending); view 2–3 products of one category; reload: strategy "few interactions" with that category; an active user shows new items in slots 9–10 | Unit tests of the strategies |
| 4–5 | Trending ≤ 90 s and closed loop | Product page of a rarely viewed item; Kafka UI in live mode; click *Add to cart* three times; time the update of the trending counts; show the event in bronze | `demo_vong_khep_kin.py`, `tim_su_kien_bronze.py` |
| 6 | A/B result | A/B dashboard: CTR and conversion per group, daily chart, p-values, conclusion, required sample size, simulated share | @tab:ab |
| 7 | Reproduction | Reproduction screen: pick an old day, re-run, all deviations 0; click a few more items and re-run the same day (still identical); trigger DAG 5 for a feature version | @tab:tai-lap |
| 8 | OPTIMIZE / Z-ORDER | Model quality screen, last section: files read and latency in the three phases | @tab:zorder |

# @D Requirements Traceability {#sec:app-trace}

@tab:truy-vet maps each section of the specification to its implementation. Status: **T** = covered by automated tests on local Spark; **C** = verified on the cluster with the real data.

Table: Traceability of the specification to the implementation {#tab:truy-vet w=10,42,38,10}
| Spec section | Requirement | Implementation | Status |
|---|---|---|---|
| 3.1 | "For you", "Related products", "Trending" blocks; A/B with reproducibility | web home and product pages; `san_pham_lien_quan`; `tinh_thinh_hanh`; `tinh_ket_qua_ab`, `tai_lap_ab` | T, C |
| 3.2 | RetailRocket data; replay at 1 day = 30 s; 5 % new users | `chep_du_lieu.sh`, `nhap_danh_muc`; `phat_lai_su_kien.py` | T, C |
| 3.3 | Architecture from clickstream to A/B results | @fig:arch, @fig:lineage | C |
| 3.4 | Table schemas of bronze, silver, features, gold | `luoc_do.py`, @tab:bang | T, C |
| 3.5 | Streaming ingestion with HDFS checkpoint | `nap_su_kien` | T, C |
| 3.5 | Sliding window, 2-min watermark, update mode + MERGE | `tinh_thinh_hanh` | T, C |
| 3.5 | Deduplication, bot filter, weights | `bronze_to_silver` | T, C |
| 3.5 | StringIndexer saved for reuse, time decay | `chuan_bi_ma_tran` | T, C |
| 3.5 | ALS implicit, tuning, top-20 per user | `huan_luyen_als`, `sinh_goi_y_toan_bo` (`recommendForUserSubset`) | T, C |
| 3.5 | Blending ALS, trending and category popularity; cold start | `tron_goi_y`, `common/tron.py` | T, C |
| 3.5 | Impression aggregation and two-proportion z-test | `tinh_ket_qua_ab`, `common/ab.py`, `common/thong_ke.py` | T, C |
| 3.6 | ALS implicit with cold-start drop; grid ≥ 9; temporal split; 4 metrics + coverage + novelty; 2 baselines; thresholds | `als_lib`, `chi_so`, `danh_gia`; @tab:tuning, @tab:phuong-phap | T, C |
| 3.6 | Three cold-start strategies | @tab:cold-start, @fig:cold-start-web | T, C |
| 3.7 | MERGE, time travel, schema evolution, CDF, OPTIMIZE/Z-ORDER, partitioning | @tab:delta | T, C |
| 3.8 | Five web screens and their APIs; stable A/B hash | `web/`, `common/tron.chon_nhom` | T, C |
| 3.9 | Five DAGs with the specified schedules and structure | `airflow/dags/` | T, C |
| 3.10 | Risks: OOM, traffic, slow recommendation, low coverage | ≥ 3 interactions, numBlocks; simulation with labels; subset recommendation; analysis and re-ranking | T, C |
| 3.11 | Eight acceptance items | @tab:ket-qua-nghiem-thu | C |
