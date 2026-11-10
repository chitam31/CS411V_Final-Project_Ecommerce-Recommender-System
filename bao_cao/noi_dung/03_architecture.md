# System Architecture {#sec:architecture}

## Design Principles {#sec:principles}

Six principles guided the architecture. They recur throughout the implementation and explain most of the choices described later.

1. **Reuse the group's existing cluster instead of rebuilding it.** The team already had Docker-based Hadoop, Spark and Kafka clusters from earlier coursework. The project keeps their software versions (Spark 3.5.3, Hadoop 3.5.0, Kafka 3.7.2), container names, compose project names, volumes and ports, and only fixes the configuration errors found during a review (@sec:issues-review).
2. **Address tables by path, not by name.** The standalone Spark cluster has no Hive Metastore, so a name such as `silver.tuong_tac` does not survive between Spark sessions. Logical table names are only keys in a registry (`jobs/common/cau_hinh.py`) that maps each name to an HDFS path; SQL statements refer to a table by its path, in the form `delta.<path>` with the path `hdfs://10.68.71.113:8020/lake/silver/tuong_tac` quoted.
3. **Every job is idempotent.** Re-running a job yields the same result: bronze-to-silver overwrites exactly the affected date partitions with `replaceWhere`, gold tables are written with MERGE or full overwrite of intermediate tables. Airflow can therefore retry any task safely.
4. **Every commit carries metadata.** The `userMetadata` of each Delta commit records the run id, the cut-off date and the versions of the source tables. This is the bridge between a result and the exact data that produced it, and the foundation of reproducibility.
5. **One implementation of each piece of logic.** Blending, A/B aggregation, metrics and statistical tests live in the shared package `jobs/common/` and are used by the batch jobs, the web application, the reproduction jobs and the tests. A reproduction is therefore guaranteed to use the same formulas as the original run.
6. **A job reports its result as the last line of standard output, in JSON.** Airflow reads this line through XCom to branch, and humans read it in logs.

## High-Level Design {#sec:hld}

![High-level architecture of the system, organised in six layers](hinh/f01_tong_the.png){#fig:arch w=15.8 h=19}

@fig:arch shows the system as six layers. Data enters from the RetailRocket files, from the replay producer and from shoppers on the web application. Kafka decouples these sources from processing. Three always-on Structured Streaming jobs consume the topics: one lands raw events in bronze, one maintains trending scores in gold, one records impressions in gold. The lakehouse on HDFS holds the bronze, silver, features and gold layers plus the trained models. A nightly batch pipeline turns bronze into silver, builds the interaction matrix, tunes and evaluates ALS, and publishes blended recommendation lists; hourly and nightly jobs compute A/B results and maintain the Delta tables. Airflow schedules all batch work, and the FastAPI web application reads the gold tables to render pages, while every click it records flows back into Kafka.

@tab:thanh-phan lists the components, the technology and version of each and its role. All versions are pinned in Docker images so that every machine runs exactly the same software.

Table: Components of the system {#tab:thanh-phan w=19,24,57}
| Layer | Technology | Role in the system |
|---|---|---|
| Source | RetailRocket dataset (Kaggle) | 2.76 M events, item properties over time, category tree; downloaded on the control laptop and copied to the cluster |
| Source | Python producer (`kafka-python`) | Replays `events.csv` in timestamp order, 1 day = 30 s, adds 5 % brand-new users |
| Ingestion | Apache Kafka 3.7.2, KRaft | Topics `retailrocket-events` and `hien-thi`, 3 partitions each, broker on labsit |
| Streaming | Spark 3.5.3 Structured Streaming | `nap_su_kien`, `tinh_thinh_hanh`, `ghi_hien_thi` with checkpoints on HDFS |
| Storage | HDFS 3.5.0 | 1 NameNode, 5 DataNodes, replication 2; stores all tables, checkpoints and models |
| Table format | Delta Lake 3.2.0 | ACID tables with MERGE, time travel, schema evolution, CDF, OPTIMIZE/Z-ORDER |
| Batch and ML | Spark 3.5.3 + MLlib | Cleaning, statistics, matrix preparation, ALS tuning and evaluation, serving lists |
| Orchestration | Apache Airflow 3.3.1, LocalExecutor, PostgreSQL 16 | 5 DAGs; tasks call `submit.sh`, which runs `spark-submit` in the Spark Master container |
| Serving | FastAPI + Jinja2 + local Spark | 5 screens and a JSON API; reads Delta directly from HDFS, writes events to Kafka |
| Infrastructure | Docker Compose, ZeroTier, Bash | One compose file per service; scripts generate configuration and control all machines over SSH |

## Cluster Infrastructure {#sec:infra}

### Machines and roles

The cluster consists of six laboratory machines and one web host, all members of the ZeroTier network `ttunet`, plus the control laptop used to operate them (@fig:cluster). Each laboratory machine has 12 logical cores and 7 GB of RAM, which makes memory, not CPU, the binding constraint. Roles are assigned in a single directory file, `cau_hinh/cum.env` (@sec:config), summarised in @tab:may.

![Physical deployment: machines, containers, ports and resources](hinh/f02_cum.png){#fig:cluster w=15.8}

Table: Machines of the cluster and their roles {#tab:may w=17,15,40,14,14}
| Host | ZeroTier IP | Roles and containers | Spark cores | Spark memory |
|---|---|---|---|---|
| labsoe-11 | 10.68.71.113 | NameNode, Spark Master, all Spark drivers, Airflow | – | – |
| labsit12 | 10.68.71.198 | DataNode, Spark Worker | 8 | 3 GB |
| labsit | 10.68.71.204 | DataNode, Spark Worker, Kafka broker and UI, replay producer | 6 | 2 GB |
| labsit-may25 | 10.68.71.42 | DataNode, Spark Worker (shared with another group's services) | 4 | 2 GB |
| labsit-may26 | 10.68.71.90 | DataNode, Spark Worker (shared with another group's Airflow worker) | 8 | 3 GB |
| labsoe-18 | 10.68.71.149 | DataNode, Spark Worker, SSH jump host | 8 | 3 GB |
| Ctam | 10.68.71.205 | Web application (FastAPI with local Spark) | – | – |
| whitehathacker | 10.68.71.182 | Control laptop (Windows, Git Bash) | – | – |

Memory was sized from measurements taken with `scripts/cum/khao_sat_may.sh` on 10 November 2026 using a simple rule: reserve about 2 GB for Ubuntu with its desktop, 1 GB for the DataNode and the memory of any other service on the machine, and give the rest to the Spark worker. Executors of batch jobs use 2 GB, so a worker must offer at least 2 GB or it would never receive an executor. Machines shared with other groups received less. The workers total **34 cores and 13 GB of executor memory**.

### Network

ZeroTier creates a virtual layer-2 network (10.68.71.0/24) on top of whatever physical network each machine uses — in the laboratory, the LabSoe Wi-Fi (192.168.80.0/24). All services advertise their ZeroTier address: Spark workers start with `--host $NODE_IP` in host network mode so that executors on other machines can reach them; DataNodes set `dfs.datanode.hostname` to the ZeroTier IP and clients set `dfs.client.use.datanode.hostname = true`, so that drivers, executors and the web application connect to DataNodes by their ZeroTier address rather than an internal container address; the NameNode advertises `10.68.71.113:8020` while binding to `0.0.0.0` inside its bridge-networked container.

ZeroTier connects two peers either *directly* (peer to peer over the LAN) or through a *relay*. Relayed paths have higher latency and lower throughput. A script (`do_mang.sh`) measures every pair of machines, compares the ZeroTier round-trip time with the LAN round-trip time and reports which pairs are relayed. It revealed that Docker and Tailscale interfaces confused ZeroTier's path discovery; blacklisting these interfaces in ZeroTier's `local.conf` brought 29 of the 30 directed pairs to direct connections at about 3 MB/s, the ceiling of the Wi-Fi (@sec:issues).

### Spark resource profiles

On a standalone cluster, the first application to arrive takes every free core unless `spark.cores.max` is set. Every job is therefore submitted through one script, `ha_tang/spark/submit.sh`, with a *profile* that fixes its cores, executor and driver memory, shuffle partitions and driver ports (@tab:ho-so). Each profile has its own driver and block-manager ports (4041–4060) and UI port (4140–4150), so that up to ten drivers can run side by side in the same container without port clashes.

Table: Spark submission profiles (ha_tang/spark/submit.sh) {#tab:ho-so w=15,31,12,10,11,10,11}
| Profile | Used by | cores.max | Cores / executor | Executor memory | Driver memory | Shuffle |
|---|---|---|---|---|---|---|
| `nap` | streaming ingestion (always on) | 1 | 1 | 768 MB | 512 MB | 4 |
| `thinh_hanh` | trending stream, RocksDB state store | 2 | 2 | 1 GB | 768 MB | 8 |
| `hien_thi` | impression stream | 1 | 1 | 768 MB | 640 MB | 4 |
| `lo` | ordinary batch jobs | 8 | 2 | 2 GB | 1 GB | 64 |
| `als` | tuning, evaluation, serving lists | 10 | 2 | 2 GB | 1.5 GB | 64 |
| `bao_tri` | OPTIMIZE, Z-ORDER, VACUUM | 4 | 2 | 1.5 GB | 1 GB | 32 |
| `tai_lap` | reproduction DAG | 10 | 2 | 2 GB | 1.5 GB | 64 |
| `nhanh` | small checks and exports | 2 | 1 | 768 MB | 640 MB | 8 |

The three streams permanently hold four cores; the remaining thirty are available to batch jobs. Common settings added to every profile came from incidents on the cluster: a 180-second HDFS client socket timeout, up to eight task attempts, a 300-second network timeout and longer shuffle retries, so that a slow Wi-Fi link or a briefly stalled DataNode does not fail a whole job.

### Memory of the master host

Because PySpark drivers run in client mode inside the `spark-master` container, the master host carries the NameNode, the Spark Master, Airflow and *every* driver. @fig:ram shows two measurements. Before deployment, a Cassandra server unrelated to the project occupied 2.47 GB, leaving 3.2 GB available — enough for Airflow and one batch job but not for the three streaming drivers. With the agreement of the team it was stopped for the duration of the project (stopped, not disabled). With Airflow in a slim configuration (about 0.9 GB), the three streaming drivers and a reproduction job running together, 1.8 GB remained available. An Airflow pool with a single slot ensures that at most one batch driver runs at a time.

![Memory of the master host before deployment and with all services running](hinh/c07_ram_master.png){#fig:ram w=15}

## Task Routing and Data Pipeline Flow {#sec:flow}

Data follows three paths with very different latencies: the **streaming path** (seconds), the **batch path** (nightly) and the **serving path** with its closed loop back into Kafka. This section describes each path and then how a single Spark job is routed from Airflow to the executors.

### Streaming path

The replay producer on the Kafka host and the web application publish JSON messages to the topic `retailrocket-events`, keyed by visitor id. Each message keeps the five fields of the original data (timestamp, visitor, event, item, transaction) plus a `nguon` field (`phat_lai` for replayed events, `nguoi_moi` for synthetic new users, `web` for clicks on the web application). Two streaming jobs read the same topic **independently**:

- `nap_su_kien` (trigger 15 s) converts each message to the bronze schema, enriches it with the product category and appends it as Parquet partitioned by date;
- `tinh_thinh_hanh` (trigger 20 s) counts views and add-to-cart events per item in sliding windows and upserts the scores into `gold.thinh_hanh_15p`.

Because the trending job does not wait for bronze, the latency of the trending block does not include the latency of writing bronze. Impressions and clicks go to the topic `hien-thi`, consumed by `ghi_hien_thi` (trigger 30 s), which upserts them into the impression log. @sec:impl-streaming details the three jobs.

### Batch path

The daily DAG (@fig:dag1) starts with a sensor that checks, through WebHDFS and without starting Spark, whether bronze has received a batch newer than the last silver commit. It then creates a run id, cleans bronze into silver, computes product statistics and related products, prepares the interaction matrix, tunes ALS, evaluates it and branches: if the new model is at least as good as the serving model (within a 1 % tolerance), it generates serving lists, blends them and publishes them with MERGE; otherwise it keeps the current lists and raises a warning. Each box in @fig:dag1 shows, in brackets, the Spark profile its task uses.

![Daily pipeline DAG kn_pipeline_hang_ngay; the profile of each Spark task is shown in brackets](hinh/f05_dag1.png){#fig:dag1 w=12.5}

### Serving path and the closed loop

The web application reads the gold tables with a local Spark session (`local[2]`) and never writes to Delta (@fig:loop). When a home page is rendered, it determines the user's A/B group, reads the user's list from `gold.goi_y_nguoi_dung`, replaces the trending slots with the newest trending window, and publishes one impression message per displayed slot to `hien-thi`. When the user clicks *View*, *Add to cart* or *Buy* on a product page, the application publishes the event to `retailrocket-events` and a click or purchase message to `hien-thi`. The event reaches the trending table within one or two micro-batches and bronze within 15 seconds; it influences the personalised model at the next nightly run. The impression log, with Change Data Feed enabled, feeds the hourly A/B job, whose results the dashboard displays; the reproduction screen re-aggregates the impression log at the exact version recorded with each result.

![Closed loop between the web application, Kafka, the streaming jobs and the A/B pipeline](hinh/f08_vong_khep_kin.png){#fig:loop w=15.8}

### Routing of a Spark job {#sec:routing}

Every Spark job, whether started by Airflow, by a script or by hand, follows the same route (@fig:route):

1. The Airflow task (a `BashOperator`) runs `ha_tang/spark/submit.sh <profile> <job> [arguments]`. The script packages `jobs/common/` into `common.zip`, writing a temporary file and renaming it atomically so that two jobs submitted at the same moment never read a half-written archive. The project directory is the same host directory mounted at `/opt/bd03` in the Airflow containers and at `/opt/spark/jobs` in the Spark container, so the archive is immediately visible to Spark.
2. The script calls `docker exec spark-master spark-submit …` through the Docker socket mounted into the Airflow containers. Airflow therefore runs on the same host as the Spark Master container.
3. The driver starts inside the `spark-master` container in client mode, advertising `spark.driver.host = 10.68.71.113` and the ports of its profile.
4. The driver registers with the Standalone Master on port 7077.
5. The Master launches executors on the workers within the profile's `spark.cores.max` and executor memory.
6. Executors connect back to the driver to receive tasks and return results.
7. Executors and the driver read and write Delta tables on HDFS: metadata from the NameNode, blocks from the DataNodes by their ZeroTier addresses.
8. The job prints its result as a JSON line; the `BashOperator` pushes the last line of standard output to XCom, where a branch operator or a later task reads it.

Streaming jobs use the same route but with `CHAY_NEN=1`, which runs the driver detached (`docker exec -d`) and redirects its log to a file in the container.

![Route of a Spark job from an Airflow task to the executors and HDFS](hinh/f03_dinh_tuyen_job.png){#fig:route w=15.8}

## Data Lake Layout and Data Model {#sec:data-model}

### Layout on HDFS

All persistent data lives under `/lake` on HDFS:

```
/lake
├── landing/retailrocket/        original CSV files
├── bronze/su_kien_v2/           Parquet, ngay=YYYY-MM-DD/, _spark_metadata
├── silver/tuong_tac/            Delta, partitioned by ngay
├── silver/san_pham/             Delta
├── features/ma_tran_tuong_tac/  Delta
├── gold/<table>/                Delta (12 tables)
├── checkpoints/<stream>/        Structured Streaming checkpoints
└── models/
    ├── user_indexer/            StringIndexerModel, labels only appended
    ├── item_indexer/            StringIndexerModel, labels only appended
    ├── als/<run_id>/            best tuning model (fitted on train)
    └── als/<run_id>_phuc_vu/    serving model (refitted on train + test)
```
Bronze is written to a new directory, `su_kien_v2`, because the team's earlier bronze directory had a different schema and its own file-sink log; writing into it would have made the file sink skip batches it believed were already committed. The old data was left untouched.

### Table schemas

The project keeps every column of the specification (section 3.4) with its exact name and type, and adds columns only where the implementation needs them. @tab:bang summarises the tables; added columns are listed separately with the reason for each.

Table: Main tables, their format and keys {#tab:bang w=23,13,34,30}
| Table | Format | Columns (specification) | Added columns and why |
|---|---|---|---|
| `bronze.su_kien` | Parquet, by `ngay` | `ma_su_kien, thoi_diem, ma_nguoi_dung, ma_phien, ma_san_pham, loai_su_kien, ma_danh_muc, thiet_bi, ngay` | `ma_giao_dich` (transaction id), `kafka_ts` (broker time, used for trending and latency), `_nguon` (source), `_ingest_ts` (incremental watermark), `_schema_ver` |
| `silver.tuong_tac` | Delta, by `ngay` | `ma_nguoi_dung, ma_san_pham, thoi_diem, loai_su_kien, trong_so, ngay` | `_nguon` (to exclude web clicks from train/test); `gia_san_pham, xep_hang_sao` after schema evolution |
| `silver.san_pham` | Delta | (not in the specification) | `ma_san_pham, ma_danh_muc, danh_muc_cha, gia_san_pham, con_hang`; needed for categories, baseline 2, cold start and new items |
| `features.ma_tran_tuong_tac` | Delta | `user_idx, item_idx, diem` | `tap` (`train`/`test`), so that one version contains everything needed to re-run training *and* evaluation |
| `gold.goi_y_nguoi_dung` | Delta, Z-ORDER by user | `ma_nguoi_dung, xep_hang (1..20), ma_san_pham, diem_du_doan, nguon, phien_ban_mo_hinh, sinh_luc` | – (MERGE on user and rank) |
| `gold.thinh_hanh_15p` | Delta | `cua_so_bat_dau, cua_so_ket_thuc, ma_san_pham, so_luot_xem, so_luot_them_gio, diem_thinh_hanh` | – (MERGE on window and item) |
| `gold.nhat_ky_hien_thi` | Delta, CDF on | `ma_hien_thi, ma_nguoi_dung, nhom_ab, vi_tri, ma_san_pham, thoi_diem_hien_thi, da_click, da_mua` | `nguon_traffic` (web or simulated, required by section 3.10), `chien_luoc` (only ALS impressions enter the A/B test) |
| `gold.ket_qua_ab` | Delta | `ngay, nhom_ab, so_hien_thi, so_click, so_mua, ctr, ty_le_chuyen_doi, p_value, phien_ban_delta_du_lieu` | `p_value_chuyen_doi` (second proportion), `ty_le_mo_phong` (share of simulated traffic) |

Six further gold tables support evaluation and the acceptance demonstration: `thong_ke_san_pham` (per-product counts and the 24-hour mean used by the trending score), `san_pham_lien_quan` (related products), `ket_qua_tuning` (one row per hyper-parameter combination), `lich_su_huan_luyen` (one row per evaluation with metrics, baselines, decision and a JSON detail column), `ket_qua_tai_lap` (reproduction comparisons) and `do_hieu_nang_zorder` (Z-ORDER measurements). Two intermediate tables pass data between the serving jobs.

### Why silver is partitioned by date and not by user

The specification asks to explain why `silver.tuong_tac` is not partitioned by `ma_nguoi_dung`. With 1.4 million users, partitioning by user would create 1.4 million directories holding a few dozen bytes each (on average fewer than two events per user). The NameNode keeps about 150 bytes of heap per file and directory, the Delta log would grow with the number of files, and every full scan would open millions of tiny files. Partitioning by date gives about 140 partitions of reasonable size, and every batch job filters by date range — incremental processing by day and the temporal train/test split — so partition pruning on `ngay` is genuinely useful. The hot per-user query of the web application is served from the gold table, clustered with Z-ORDER by user (@sec:res-zorder), not by partitioning.

### Lineage

@fig:lineage traces every table to the job that writes it and the jobs that read it. Streaming jobs are marked with ⟳. The three tables at the bottom are the ones the web application and the A/B pipeline consume.

![Table-level lineage: jobs (boxes) and tables (cylinders)](hinh/f04_dong_du_lieu.png){#fig:lineage w=11.5 h=22.5}
