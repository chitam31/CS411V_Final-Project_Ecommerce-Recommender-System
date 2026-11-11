# Implementation {#sec:impl}

The code base contains about 9,900 lines: 35 PySpark job and library files (4,100 lines), 5 Airflow DAGs with a shared module, a web application of 17 files, the Kafka producers, 19 operational scripts, 14 Docker and Hadoop configuration files and 12 test files (Appendix A). This chapter follows the outline of the pipeline: infrastructure, Spark jobs, orchestration, the web application, the A/B pipeline, reproducibility and testing.

## Infrastructure Setup (Docker) {#sec:impl-infra}

Every service runs in a container defined by one Docker Compose file per service family (@tab:compose). The files reuse the container, project and volume names of the team's earlier clusters, so that existing HDFS data and Kafka topics were preserved when the new configuration was rolled out.

Table: Docker Compose projects and their services {#tab:compose w=26,24,50}
| Compose file | Services | Notes |
|---|---|---|
| `ha_tang/hadoop/docker-compose.yml` | `master` (NameNode), `worker` (DataNode) | Hadoop 3.5.0; NameNode in a bridge network advertising 10.68.71.113:8020; DataNodes advertise `NODE_IP`; heap 1 GB; configuration hash forces recreation |
| `ha_tang/spark/docker-compose-master.yml` | `spark-master` | Host network, `--host 10.68.71.113`; mounts `./jobs` at `/opt/spark/jobs`; daemon memory 512 MB; also hosts every driver |
| `ha_tang/spark/docker-compose-worker.yml` | `spark-worker` | Host network, `--host NODE_IP`, cores and memory from the directory |
| `ha_tang/kafka/docker-compose.yml` | `kafka-server`, `kafka-ui` | Kafka 3.7.2 KRaft, advertised `PLAINTEXT://10.68.71.204:9092`, log directory on a named volume |
| `ha_tang/airflow/docker-compose.yml` | `postgres`, `airflow-init`, `airflow-apiserver`, `airflow-scheduler`, `airflow-dag-processor` (+ optional `airflow-triggerer`) | Image `bd03/airflow:3.3.1` adds the Docker CLI; mounts the project directory and the Docker socket; UI on port 8088 |
| `ha_tang/web/docker-compose.yml` | `bd03-web` | Image based on `bd03/spark`, FastAPI on port 8000, host network so that its local Spark reaches the DataNodes |

Bringing up the cluster takes four steps, documented in the deployment guide (Appendix B):

1. On every Linux machine: install ZeroTier, Docker and Git, allow inbound traffic on the ZeroTier interface, disable automatic suspend.
2. From the laptop: generate the SSH configuration, copy the key, distribute the code (`ssh_tat_ca.sh --tao-config`, `--chep-khoa`, `--dong-bo-ma`).
3. On every machine: run `khoi_dong_may.sh`, master first.
4. On the master: check the whole cluster (`kiem_tra_cum.sh`: NameNode and DataNodes, Spark workers, Kafka topics, Delta JARs), then run the first pipeline with `chay_lan_dau.sh`.

`chay_lan_dau.sh` runs the first end-to-end pipeline in eight resumable steps: (1) create the HDFS directories, check that the landing CSV files are present and create the Delta tables with their properties (Change Data Feed on the impression log, retention settings); (2) import the catalogue into `silver.san_pham`; (3) load the events already in Kafka into bronze with a one-shot (`availableNow`) run of the ingestion job; (4) clean bronze into silver and compute product statistics and related products; (5) prepare the matrix, tune ALS on the full 27-combination grid and evaluate; (6) generate serving lists, blend and publish; (7) simulate A/B traffic and compute the results; (8) measure OPTIMIZE and Z-ORDER on a table fragmented into 200 files. After a failure the script can resume from a given step (`TU_BUOC=6 MA_CHAY=<run id>`), which saved a full retuning when a DataNode stalled during the first run on the cluster.

Operational scripts, all in Bash and driven by the cluster directory, are listed in @tab:scripts.

Table: Main operational scripts {#tab:scripts w=30,70}
| Script | Purpose |
|---|---|
| `scripts/cum/khoi_dong_may.sh` | Detect the machine, generate `.env` files, start the services of its roles; `--dung` stops them |
| `scripts/cum/ssh_tat_ca.sh` | Run commands or scripts on all machines; generate SSH configuration; distribute code with retries |
| `scripts/cum/kiem_tra_cum.sh` | End-to-end health check of HDFS, Spark, Kafka and the Delta libraries |
| `scripts/cum/do_mang.sh`, `cau_hinh_zerotier.sh` | Measure every pair of machines (direct or relayed path); blacklist Docker interfaces in ZeroTier |
| `scripts/cum/chep_du_lieu.sh` | Download the Kaggle dataset on the laptop and copy it to the master and the Kafka host |
| `scripts/cum/don_du_lieu.sh` | Preview and delete only the project's HDFS paths before a clean rerun (requires typing a confirmation) |
| `scripts/cum/tao_cau_hinh_airflow.sh` | Generate Airflow `.env` and password file |
| `scripts/cum/tinh_trang.sh` | One read-only status screen: memory, running Spark applications, Airflow DAGs, runs and tasks |
| `scripts/chay_lan_dau.sh` | First end-to-end pipeline in 8 resumable steps |
| `scripts/luong.sh` | Start, stop and monitor the three streaming jobs |
| `scripts/trien_khai_lai.sh` | Re-evaluate and redeploy an existing run without retuning |
| `scripts/thu_nghiem_bo_sung.sh` | Re-ranking sweep and full-size A/B simulation |

## Spark Jobs {#sec:impl-jobs}

### Ingestion and cleaning {#sec:impl-clean}

**Catalogue import (`nhap_danh_muc`).** RetailRocket item properties are time-stamped key–value records split over two files. The job keeps, for each item, the latest value of `categoryid`, `available` and property `790` (relative price), joins the category tree to obtain the parent category, and writes `silver.san_pham`.

**Event ingestion (`nap_su_kien`, streaming).** The job reads the topic, parses the JSON, drops records without user, item or event, and maps them to the bronze schema of the specification (@tab:bang). The event id `ma_su_kien` is the SHA-256 hash of topic, partition, offset and value: it is unique and deterministic, so a message redelivered by Kafka or re-read after a failure gets the same id and is removed downstream. Because RetailRocket has no sessions, a session id is derived from the user and a 30-minute time bucket when the message does not carry one. The product category is added by a left join with `silver.san_pham`. Rows are written with the Parquet file sink, partitioned by date, with the checkpoint on HDFS. The same job also runs in one-shot mode (`--mot-lan`, trigger `availableNow`) to load a backlog and report the number of batches and events.

**Bronze to silver (`bronze_to_silver`).** Cleaning applies the rules of @tab:lam-sach in order. The job is incremental: it reads the ingestion timestamp of the last processed row from the `userMetadata` of the latest silver commit that carries it, selects the dates that received new rows, recomputes them completely and overwrites exactly those partitions with `replaceWhere`. Running it twice gives the same table. Before writing, rows are repartitioned by the partition column, so each date is written as one file; without this, the 64-partition shuffle wrote up to 64 tiny files per date (@sec:issues).

Table: Cleaning rules from bronze to silver {#tab:lam-sach w=24,38,38}
| Step | Rule | Reason |
|---|---|---|
| Deduplicate by id | `dropDuplicates(ma_su_kien)` | Kafka and the file sink may deliver a message twice |
| Deduplicate by content | same user, item, event type and timestamp (millisecond), **before** bot filtering | Replaying a period again gives each original event a new id (new offset); without this step event counts per hour double and genuine users with 251–500 events per hour would be removed as bots |
| Bot filter | remove every user with at least one hour above **500 events** | Threshold of the specification; bots distort popularity and the matrix |
| Debounce | drop an event of the same user, item and type within **5 seconds** of the previous one | Double clicks and page reloads |
| Weights | view = 1, add-to-cart = 3, purchase = 5; remove-from-cart is dropped | Remove-from-cart is not a signal of interest |

**Product statistics (`thong_ke_san_pham`).** For each product the job counts views, add-to-cart events and purchases, computes a popularity score, the number of views in the last 24 hours of data and the mean number of views per 15-minute window over those 24 hours. The table feeds the two baselines, the cold-start strategies and the denominator of the trending score.

**Related products (`san_pham_lien_quan`).** Item-to-item collaborative filtering by co-occurrence: two products are related if the same user interacted with both on the same day, and their similarity is the cosine of @eq:cos, where *n(i, j)* is the number of users who interacted with both items. Cosine rather than raw counts prevents very popular items from appearing in every list. Pairs seen by fewer than two users are ignored and the ten most similar products of each item are stored; for items without a list the web application shows best sellers of the same category.

$$cos$$ {#eq:cos}

### Data splitting and training {#sec:impl-train}

**Interaction matrix (`chuan_bi_ma_tran`).** The job reads silver (excluding events generated by the web application, so that experiments do not influence the evaluation) and splits it by time. The last date in silver is the end date; the cut-off date is thirty days earlier. Interactions before the cut-off form the training set (about the first four months); the remaining month forms the test set. The ground truth of a user is the set of items the user interacted with in the test month, restricted to users and items that appear in training: unseen users and items belong to cold start and are handled by separate strategies rather than mixed into the ranking metrics. Each user–item score is the sum of the weights of its events with exponential time decay (@eq:decay), where Δ*d* is the number of days between the event and the reference date. The reference is the cut-off date for training and the end date for testing, so no information from the future leaks into training. With *λ_d* = 0.01, an interaction 70 days old keeps about half of its weight (e^{−0.7} ≈ 0.50).

$$decay$$ {#eq:decay}

ALS needs integer ids. Refitting a `StringIndexer` every day could map the same index to a different user in two versions of the feature table, silently breaking every comparison and reproduction. The job therefore loads the saved label lists and only **appends** new labels at the end (`StringIndexerModel.from_labels`), so the index of an existing user or item never changes. To bound memory (risk "ALS out of memory" of the specification), only users with at least three training interactions are kept. The feature table stores `user_idx, item_idx, diem` plus a column `tap` (`train` or `test`): a single Delta version thus contains everything needed to re-run both training and evaluation. The commit metadata records the cut-off and end dates, the minimum number of interactions and the versions of `silver.tuong_tac` and `silver.san_pham` that were read.

**Tuning (`huan_luyen_als`).** The job trains ALS with `implicitPrefs = true`, `maxIter = 10`, `seed = 42` and `coldStartStrategy = "drop"` for every combination of the grid: 27 combinations (`rank` × `regParam` × `alpha`) for the report, or 9 combinations with α = 10 for the nightly run. Each combination is evaluated on the test month and recorded as one row of `gold.ket_qua_tuning` with the run id, the feature version, the four ranking metrics, coverage, novelty and the training time. The model with the highest NDCG@10 is selected; ties favour the smaller rank and then the larger regParam (the simpler model). The selected model is saved under `/lake/models/als/<run id>`.

**Evaluation and deployment decision (`danh_gia`).** The evaluation job recomputes the full set of metrics for the selected model and for the two mandatory baselines: (1) the ten items with the highest total training score, the same for every user, and (2) the ten best sellers of the category in which the user has the highest training score, completed with global best sellers when the category has fewer than ten items. It also measures the two re-ranking variants β = 0.1 and 0.3, the serving configuration (@sec:impl-blend), the popularity distribution of each list, and — when the silver version behind the features has a price column — the version 2 model with price filtering. Two different decisions are recorded in `gold.lich_su_huan_luyen`:

- `dat_nguong`, the acceptance criterion of the assignment (@eq:uplift);
- `cai_thien`, the branch condition of the daily DAG: the new model is deployed if no model is serving yet, or if its NDCG@10 is not more than 1 % below that of the serving model. The tolerance prevents the published lists from freezing because NDCG fluctuates slightly from night to night.

$$uplift$$ {#eq:uplift}

The job prints its result as a JSON line that the DAG's branch operator reads.

### Serving lists, blending and cold start {#sec:impl-blend}

**Serving model (`sinh_goi_y_toan_bo`).** The evaluation model learned only the first four months; recommendations shown to users must also reflect the last month. The job therefore refits ALS with the selected hyper-parameters on training plus test data. To merge the two sets without reading silver again, training scores, decayed relative to the cut-off date *c*, are multiplied by e^{−λ(e − c)} so that they become decayed relative to the end date *e*, as the identity @eq:gop shows. Recommendations are generated with `recommendForUserSubset` only for users active in the last 30 days with at least five interactions — the mitigation of the risk "`recommendForAllUsers` too slow" in the specification; all other users follow a cold-start strategy.

$$gop$$ {#eq:gop}

For each user the job takes 200 ALS candidates and re-ranks them by @eq:rerank, where the ALS score and the item's novelty (−log₂ of the share of users who interacted with it, computed on the matrix used to fit the serving model) are both min–max normalised within the user's candidates, and β = 1.0. The twenty best candidates (forty for model version 2, which filters some of them later) are kept. The original ALS score remains in `diem_du_doan`; the new order is in `xep_hang`. The choice of 200 candidates and β = 1.0 comes from the sweep in @sec:res-coverage; setting β = 0 in the configuration restores pure ALS ordering.

$$rerank$$ {#eq:rerank}

**Blending (`tron_goi_y`).** The final list of every user has twenty positions organised as two blocks of ten; the web application shows the first block, so the share of each source is guaranteed in what the user actually sees. @fig:mau-khoi shows the templates. Group A receives eight ALS items and two new items; group B receives five ALS items, three trending items at fixed positions and the same two new items. Because new items occupy the same positions in both groups, the only difference between A and B is the trending blend. When a source runs out, the slot is filled from the next source in a fixed order, and a product never appears twice in a list. Groups are assigned by hashing: a user belongs to group A if the first eight hexadecimal digits of the MD5 of the user id form an even number, otherwise to group B. The hash is the same in the batch job, the web application and the simulator, so a user always lands in the same group.

![Templates of the ten visible 'For you' slots by user type and A/B group](hinh/f11_mau_khoi.png){#fig:mau-khoi w=15.5}

The three cold-start strategies of the specification are implemented as in @tab:cold-start. Each one is a pure Python function in `jobs/common/tron.py`, used by the batch job and by the web application and covered by unit tests.

Table: Cold-start strategies {#tab:cold-start w=20,48,32}
| Case | Strategy | Implementation |
|---|---|---|
| Brand-new user | The top trending items of the most recent 15-minute window | `danh_sach_nguoi_moi`; the web application uses it for users it does not know |
| User with fewer than 5 interactions | Best sellers of up to three categories the user viewed (interleaved), blended 50/50 with trending in the pattern d t d t d t d t d t | `tron_nguoi_it_tuong_tac`; the web application keeps the interactions of a new session in memory |
| New item (not in the ALS model) | Items of the category most frequent in the user's top-20 ALS list that have no ALS factors, placed in the last 20 % of each block (positions 9–10) | `item_moi_theo_danh_muc`, with a `left_anti` join on the model's item factors |

Trending slots are filled from the most recent window of `gold.thinh_hanh_15p`; when the streaming table does not exist yet, the job falls back to the items most viewed in the last 24 hours of data. At display time the web application replaces trending slots with the newest window, keeping their positions.

**Publishing (`ghi_gold`).** The blended lists are written to `gold.goi_y_nguoi_dung` with a MERGE keyed on (user, rank) instead of overwriting the table: rows of users in the new run are updated or inserted, surplus ranks of those users (when a new list is shorter) are deleted through a `WHEN MATCHED AND s._xoa THEN DELETE` clause, and users absent from the run keep their previous lists. The maintenance DAG removes lists generated more than seven days before the latest deployment, so a user missing from recent runs loses a stale list while the served table never empties (issue 28). The model version (`als_<run id>` or `als_v2_<run id>`) and the generation time are written with every row.

### Model version 2 and schema evolution {#sec:impl-v2}

The specification asks for a schema change in week 5: add the product price and a star rating to silver, then build a version 2 model that uses them as a constraint. `tien_hoa_luoc_do` performs it in three steps: it adds `xep_hang_sao` to `silver.san_pham`; it runs `ALTER TABLE … ADD COLUMNS (gia_san_pham DOUBLE, xep_hang_sao DOUBLE)` on `silver.tuong_tac`, which only commits new metadata and leaves the data files untouched; and it fills the two columns with a MERGE from the catalogue. Old versions remain readable with the original seven-column schema; after the change, `bronze_to_silver` adds both columns to newly processed rows automatically. RetailRocket has no star ratings, so `xep_hang_sao` is a **proxy**: the purchase-to-view ratio of the product mapped to the range 1–5 by percentile rank. The report states this wherever the column is used.

When the silver version behind the features contains the price column, the evaluation job switches to version 2 and names the model `als_v2_<run id>`; this is the only place where the decision is made, and later steps read the name. Version 2 estimates the price range of each user from the prices of the items the user interacted with (@eq:tam-gia) — percentiles rather than minimum and maximum, so that one accidental view of a very expensive item does not make the range meaningless — and removes ALS candidates outside that range, keeping their order and keeping items with unknown prices. If fewer than ten candidates remain, the out-of-range items are appended at the end so that the block never has empty slots. Users with fewer than three priced interactions are not filtered. The same filter function is used for evaluation (top-20, filtered, cut to 10) and for serving.

$$tam_gia$$ {#eq:tam-gia}

### Streaming and prediction {#sec:impl-streaming}

@fig:streams details the three Structured Streaming jobs. They are started, stopped and monitored with `scripts/luong.sh`, which submits each job detached in its own profile and identifies running jobs by application name through the Spark Master's JSON API; a job is never started twice.

![The three Structured Streaming jobs and the latency budget of the trending block](hinh/f07_luong.png){#fig:streams w=15.8}

**Trending (`tinh_thinh_hanh`).** The job keeps views and add-to-cart events, applies a 2-minute watermark, groups by a 15-minute window sliding every minute and by item, and counts both event types. Each micro-batch (trigger 20 s, at most 200,000 records) is written by `foreachBatch`: it joins the product's normal level — the mean number of views per 15-minute window over 24 hours, from `gold.thong_ke_san_pham` — computes the score of @eq:trend and upserts it into `gold.thinh_hanh_15p` with a MERGE keyed on window start, window end and item. Normalising by the product's usual level lets a rarely viewed product that suddenly attracts attention reach the block; the constant 10 avoids dividing by tiny numbers. Window state is kept in RocksDB rather than on the JVM heap, which allows a 1 GB executor.

$$trend$$ {#eq:trend}

Windows are computed on `kafka_ts`, the time at which the broker received the message, not on the original event time. The replay producer keeps the 2015 timestamps and compresses one day into 30 seconds, while the web application produces events with 2026 timestamps; grouping on the original time would let a single web event push the watermark to 2026 and make every replayed event "late". The broker time is a single clock shared by both sources, and it is also the right clock for a "what is popular right now" block. The job starts from the latest offsets because only current activity matters.

**Impressions (`ghi_hien_thi`).** The web application does not write impressions to Delta: each impression would be one commit and one small file. It publishes them to Kafka, and this job aggregates each 30-second micro-batch by impression id and upserts it into `gold.nhat_ky_hien_thi`: new impressions are inserted, and click or purchase feedback sets the corresponding flag of an existing row with a logical OR, so replaying a batch never double-counts. The table has Change Data Feed enabled from version 0.

**Conflict handling.** The nightly maintenance DAG compacts and cleans the same two gold tables that the streams update continuously. With Delta's optimistic concurrency control, whichever transaction commits second fails with a `Concurrent…Exception`; an unhandled failure in `foreachBatch` stops the whole streaming query. Both streams and the maintenance job therefore wrap their writes in a retry helper that re-runs the statement up to five times with increasing waits, but only for Delta conflict exceptions. This is safe because a rejected transaction has written nothing and every statement involved — a keyed MERGE, an OPTIMIZE or a DELETE — produces the same result when repeated.

**Latency budget.** A click reaches Kafka in well under a second. The trending query picks it up at its next trigger (at most 20 seconds later), aggregates and merges it in one micro-batch, and the web application reads the newest window on the next page load. The sum stays well within the 90-second target, with margin for a slow micro-batch.

### Delta Lake features in practice {#sec:impl-delta}

@tab:delta maps each Delta Lake requirement of the specification (section 3.7) to its implementation.

Table: Delta Lake requirements and their implementation {#tab:delta w=18,52,30}
| Requirement | Implementation | Files |
|---|---|---|
| MERGE | Per-user upsert of recommendation lists with deletion of surplus ranks; upsert of trending windows; upsert of impressions and feedback | `ml/ghi_gold.py`, `streaming/tinh_thinh_hanh.py`, `streaming/ghi_hien_thi.py` |
| Time travel | Every training run records the feature version; DAG 5 re-runs training on `versionAsOf`; the reproduction screen re-aggregates the impression log at the recorded version | `kiem_tra/tai_lap_huan_luyen.py`, `kiem_tra/tai_lap_ab.py`, web |
| Schema evolution | `ALTER TABLE ADD COLUMNS` then MERGE to fill; new rows get the columns automatically; model version 2 | `transform/tien_hoa_luoc_do.py`, `transform/bronze_to_silver.py`, `ml/tron_goi_y.py` |
| Change Data Feed | Enabled on the impression log at creation; the A/B job reads `table_changes` from the last processed version and recomputes only the affected days | `kiem_tra/khoi_tao_bang.py`, `transform/tinh_ket_qua_ab.py` |
| OPTIMIZE / Z-ORDER | `ZORDER BY (ma_nguoi_dung)` on the recommendation table, measured before and after; nightly compaction of six tables | `bao_tri/do_zorder.py`, `bao_tri/toi_uu_delta.py` |
| Partitioning | `silver.tuong_tac` by date (bronze too); one file per date | `transform/bronze_to_silver.py`, `common/spark_utils.py` |
| Retention | 30 days for removed files and 60 days for the log, so nightly VACUUM never breaks time travel within a month | `common/spark_utils.py` (`tao_spark`) |

**Measuring Z-ORDER (`do_zorder`).** To separate the effect of clustering from the effect of compaction, the measurement has three phases on a copy of the recommendation table: (1) a fragmented table, simulating many days of MERGE (200 files); (2) after a plain OPTIMIZE that only compacts files (target size 1 MB); (3) after `OPTIMIZE … ZORDER BY (ma_nguoi_dung)`. In each phase the job runs thirty lookups `WHERE ma_nguoi_dung = ?` for random users and records the number of files read (from the query metrics) and the latency. Comparing phase 3 with phase 2 isolates the benefit of Z-ORDER; an earlier version that compared only before and after mixed both effects (@sec:issues).

## Orchestration with Airflow {#sec:impl-airflow}

Five DAGs implement the workflows of the specification (section 3.9). @tab:dags summarises them; @fig:dag1 shows the daily pipeline and @fig:dags the four others.

Table: Airflow DAGs {#tab:dags w=24,15,61}
| DAG | Schedule | Content |
|---|---|---|
| `kn_pipeline_hang_ngay` | 02:00 daily | Sensor for new bronze data → run id → cleaning, statistics, related products, matrix, tuning, evaluation → branch: generate, blend and publish, or keep the old model and warn. Parameters: grid (`toi_thieu` / `day_du`), minimum interactions |
| `kn_giam_sat_streaming` | every 15 min | Checks that the trending application is alive and that the trending table has a window ending within the last 15 minutes; if either check fails, restarts the stream and appends a warning |
| `kn_tinh_ab` | hourly | Reads the Change Data Feed of the impression log, recomputes the affected days, runs the z-tests and writes `gold.ket_qua_ab` with the data version |
| `kn_bao_tri` | 04:00 daily | Deletes recommendation lists generated more than 7 days before the latest deployment and trending windows older than 2 days, compacts six tables (Z-ORDER where useful), vacuums them |
| `kn_tai_lap` | manual | Takes `phien_ban_delta` (feature version) and `che_do` (selected model or whole grid) from the run configuration, re-runs training and evaluation on that version and compares with the history; fails if the deviation exceeds 10^{−6} |

![DAGs 2 to 5: stream monitor, hourly A/B, nightly maintenance and reproduction](hinh/f06_dag_khac.png){#fig:dags w=13.5}

Several mechanisms make the DAGs robust on a small cluster:

- **The sensor does not start Spark.** It compares, through WebHDFS, the modification time of bronze's `_spark_metadata` directory (updated by every successful file-sink batch) with that of silver's `_delta_log` (updated by every commit). It runs in `reschedule` mode, releasing its slot between checks every five minutes, and soft-fails after six hours, so a night without new data ends in a skipped run rather than a failure.
- **XCom carries results.** Each Spark task's last stdout line is a JSON object; the branch operator parses the evaluation result, and the run id created by the first task is passed to all later tasks through a template.
- **Retries and timeouts.** Tasks retry once; tuning has a four-hour timeout and the DAG an eight-hour timeout. All jobs are idempotent, so a retry is always safe.
- **A single pool slot at night.** Because every driver runs on the master host, the default pool is limited to one slot during the night, when the daily pipeline, the hourly A/B job and maintenance may overlap.
- **Warnings.** A failure callback appends a line to `logs/canh_bao.log` and the task log; the stream monitor uses the same file.

Two behaviours of Airflow 3 were learned on the cluster. A DAG is paused when first created, and a manual run of a paused DAG stays queued; `kn_tai_lap` must therefore be unpaused even though it has no schedule, otherwise the "Re-run model" button of the web application does nothing. And when a scheduled DAG is unpaused, Airflow immediately creates a run for the most recent past schedule: enabling the three nightly DAGs at 23:21 started all three at once instead of at 02:00 and 04:00.

## Web Application {#sec:impl-web}

The web application plays the role of the marketplace, as section 3.8 of the specification requires, so that real impressions and clicks can be generated. It is a FastAPI application with Jinja2 templates and a small amount of JavaScript, running on labsoe-18 (the first host, Ctam, is kept as a standby, issue 26). It reads Delta tables directly from HDFS with a local Spark session (`local[2]`) inside the process, without taking cores from the cluster, and writes nothing to Delta: all events go to Kafka (@tab:web).

Table: Screens and API of the web application {#tab:web w=20,45,35}
| Screen | Content | API |
|---|---|---|
| Home (simulated) | Pick a user from a list or type an id (simulated login), or create a brand-new user; shows the user's strategy, A/B group, the ten "For you" items with their sources, and "Trending now"; every render logs impressions | `GET /api/goi-y/{user_id}`, `POST /api/hien-thi` |
| Product page | Product details, related products, the product's current trending counts; buttons View, Add to cart, Buy push events to Kafka | `POST /api/su-kien` |
| A/B dashboard | CTR and conversion per group, daily chart, p-values, pooled test, required sample size, share of simulated traffic, conclusion | `GET /api/ab/ket-qua` |
| Model quality | Metrics per model version, comparison with the baselines and re-ranking variants, tuning table, popularity distribution chart | `GET /api/mo-hinh/chi-so` |
| Reproduction | Pick a past A/B result, see its Delta version, re-run the aggregation on that version and compare old and new; trigger DAG 5 | `POST /api/tai-lap/{ngay}`, `POST /api/tai-lap-mo-hinh` |

Auxiliary endpoints return trending items (`/api/thinh-hanh`, and per product for latency measurements), sample users for the demonstration and a health check that shows the data mode and the Kafka client in use. The application has two data modes: `delta`, the default, reads the cluster; `gia` serves generated data so that the interface can be developed without the cluster.

**An illustrative display layer.** RetailRocket is anonymised: products have no names or pictures, categories are numeric ids, and the other attributes are hashed. So that the pages read like a marketplace, a display layer (`web/dich_vu/minh_hoa.py`) assigns each second-level category of the category tree (a direct child of one of its roots, found by walking `category_tree.csv` upwards) one of sixteen illustrative departments (phones, fashion, kitchenware, …), derives a display name from the department and the product id ("Tai nghe 102605"), formats the anonymised price attribute as a price, and draws a product picture as an SVG image on the server: the department's icon on a background whose shade varies with the product id. The mapping is deterministic, needs no Internet access, and touches no table, model or metric. Every picture carries the words "ảnh minh họa" (illustration), the footer of every page states that names, departments and pictures are illustrative, and the real product and category ids remain visible on every card.

Brand-new users created on the home page receive an id `moi_<8 characters>` and the trending-only strategy. Their clicks go to Kafka like any other event, but they would reach silver only at the next nightly run; to demonstrate the "fewer than five interactions" strategy on the spot, the application keeps the interactions of the session in memory and applies the same blending function as the batch job. The memory is lost when the application restarts, which matches the nature of a session. The "Re-run model" button triggers DAG 5 through the Airflow 3 REST API: it obtains a JWT from `/auth/token` with the password stored in the host's `.env.rieng` and posts a run to `/api/v2/dags/kn_tai_lap/dagRuns`.

## A/B Testing and Traffic Simulation {#sec:impl-ab}

**Unit and metrics.** The experimental unit is an impression of the "For you" block whose strategy is ALS; impressions shown to cold-start users are excluded because they are not part of the experiment (both groups receive the same cold-start lists). CTR is clicks divided by impressions and the conversion rate is purchases divided by impressions. `tinh_ket_qua_ab` computes both per day and group and the two-proportion z-test of @eq:z for each; the two groups of a day share the same p-values and data version. The dashboard adds a pooled test over the whole period and the sample size needed per group to detect a given relative lift with α = 5 % and 80 % power (@eq:n).

**Incremental computation with CDF.** Each hourly run reads `table_changes` of the impression log from the version processed by the previous run to the current version, collects the dates of the changed rows and recomputes only those days from the snapshot at the current version; the result rows store that version in `phien_ban_delta_du_lieu`, which makes every row reproducible.

**Simulated traffic.** Real visitors are too few to give the test any power, so `mo_phong_hien_thi` generates impressions with a position-dependent click model (@eq:click): the probability of noticing slot *v* decays as *v*^{−η}, and the probability that the item is relevant is 0.40 if it belongs to the user's ground truth in the test month and 0.03 otherwise. A click leads to a purchase with probability 0.12. By default no bonus is given to trending items, so the simulation does **not** assume that group B is better. Every simulated row has `nguon_traffic = "mo_phong"`, `gold.ket_qua_ab` stores the share of simulated traffic, and the dashboard displays it. An option restricts the simulation to users who have ALS recommendations, which is needed because the A/B test only counts ALS impressions (@sec:res-ab).

$$click$$ {#eq:click}

A second method, `producer/nguoi_dung_ao.py`, sends virtual users through the real web application (web → Kafka → impression stream → CDF → A/B job). Their click probability depends only on the position, so the expected result is *no difference*: an A/A test that checks that the pipeline does not report spurious differences.

## Reproducibility {#sec:impl-repro}

Reproducing an experiment requires the same data, the same code and the same parameters. The system records all three (@fig:repro):

- Each row of `gold.lich_su_huan_luyen` stores the feature version, the silver version, the cut-off date, the hyper-parameters, `maxIter` and the seed; the commit of the feature table stores the catalogue version and the minimum number of interactions.
- Each row of `gold.ket_qua_ab` stores the version of the impression log it was computed from.
- The retention settings keep every version of the last 30 days available to time travel.

**Reproducing a training run (DAG 5).** `tai_lap_huan_luyen` reads the feature table with `VERSION AS OF v`, calls the same tuning and evaluation functions with the recorded parameters — either for the selected model only or for the whole grid — and compares every metric with the history. The comparison is written to `gold.ket_qua_tai_lap` and the second task fails if the largest deviation is 10^{−6} or more. ALS in Spark is deterministic for the same data, parameters, iterations, seed and number of blocks; a unit test trains twice and checks that the metrics are identical.

**Reproducing an A/B result.** The reproduction screen and `tai_lap_ab` read the impression log at the recorded version, re-run the aggregation function and compare each figure. Because the computation uses integers and deterministic formulas, the tolerance is zero.

![Reproduction of an experiment with Delta time travel](hinh/f09_tai_lap.png){#fig:repro w=15.8}

## Testing and Quality Assurance {#sec:impl-test}

The repository contains 91 automated tests (89 run in the standard environment, two are skipped when Airflow is not installed). They run with `pytest` on a real local Spark session, so they exercise the same DataFrame code as the cluster (@tab:tests). Infrastructure scripts are tested by putting fake `ssh`, `docker`, `curl`, `getent` or `ping` commands first on the `PATH` and checking what the scripts do with them.

Table: Automated tests by area {#tab:tests w=27,8,65}
| Test file | Tests | What is checked |
|---|---|---|
| `test_bronze_to_silver.py` | 7 | Bot filter threshold, 5-second debounce, weights, full cleaning, replay deduplication, one file per date |
| `test_ml.py` | 12 | Time split, decay, append-only indexers, ALS beats the baselines on structured data, two trainings give identical metrics, v2 price filter, served configuration added to the grid |
| `test_chi_so.py` | 4 | Ranking metrics against Spark's `RankingMetrics`, coverage and novelty |
| `test_tron.py` | 11 | A/B templates, stable group assignment, cold-start strategies, new-item placement, re-ranking, trending top-up |
| `test_ab_va_tron.py`, `test_thong_ke.py` | 9 | A/B aggregation, z-test and sample size against reference values |
| `test_streaming.py` | 8 | Event normalisation, windows and watermark, trending score, impression aggregation, one-shot progress summary |
| `test_web.py` | 8 | Every screen and API in simulated mode, Kafka client stub |
| `test_xuat_ket_qua.py`, `test_xung_dot_delta.py` | 9 | Result export, pooled A/B, retry on Delta conflicts only, maintenance keeps the latest deployment |
| `test_ha_tang.py` | 23 | Table schemas, startup script roles, single-role start and image build, ZeroTier MTU, stream stop that also stops the driver, sensor bypass for manual runs, SSH control and code distribution (including retries), network measurement, resumable first run, data copy and cleanup scripts, Airflow configuration, status script, DAG structure |

Every bug found during development or on the cluster received a regression test before it was fixed; @sec:issues lists them.
