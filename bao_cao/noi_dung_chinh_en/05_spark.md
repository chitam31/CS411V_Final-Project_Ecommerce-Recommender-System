# Spark processing {#sec:spark}

## Jobs

Table: Main Spark jobs {#tab:jobs w=26,10,64}
| Job | Type | What it does |
|---|---|---|
| `streaming/nap_su_kien` | Stream 15 s | Kafka → bronze. JSON → specification schema, deterministic `ma_su_kien`, HDFS checkpoint |
| `streaming/tinh_thinh_hanh` | Stream 20 s | 15-minute window sliding every minute, 2-minute watermark, `outputMode("update")` + `foreachBatch` MERGE; state in RocksDB |
| `streaming/ghi_hien_thi` | Stream 30 s | Impressions, clicks, purchases → MERGE on `ma_hien_thi` into the impression log (CDF) |
| `transform/bronze_to_silver` | Batch | Cleaning, `_quarantine`; incremental by `_ingest_ts`, backfill with `--tu-ngay/--den-ngay` |
| `ml/chuan_bi_ma_tran` | Batch | Time-based split, StringIndexer that only appends labels, decay `exp(−0.01·Δdays)` |
| `ml/huan_luyen_als`, `ml/danh_gia` | Batch | Grid tuning, 4 metrics + coverage + novelty, 2 baselines, deployment decision |
| `ml/sinh_goi_y_toan_bo`, `ml/tron_goi_y`, `ml/ghi_gold` | Batch | 200 candidates → novelty re-ranking → A/B blending, cold start → MERGE into gold |
| `transform/tinh_ket_qua_ab` | Batch | Reads the CDF, recomputes the changed days, two-proportion z-test, writes the data version alongside |
| `bao_tri/toi_uu_delta`, `do_zorder` | Batch | OPTIMIZE, ZORDER, VACUUM; before/after measurements |

## Hard technical points

- **Idempotence at every write.** No step of the nightly pipeline appends: silver and quarantine use `replaceWhere` by day, tuning and history tables `replaceWhere ma_chay`, gold MERGE on a key. Airflow retries or DAG reruns therefore never duplicate data. The incremental watermark lives in the `userMetadata` of the Delta commit, so no separate state table is needed.
- **Replays do not corrupt silver.** A replayed event gets a new offset, hence a new ID. Removing content duplicates **before** bot filtering keeps silver unchanged; a regression test covers this case.
- **Small files.** A 64-partition shuffle writes up to 64 files per day. Grouping by the partition column before writing gives exactly one file per day: silver drops to 140 files, and the write step falls from 15 minutes to a few seconds.
- **Concurrent writes.** The trending stream MERGEs every 20 seconds while the maintenance DAG runs OPTIMIZE and VACUUM. Delta uses optimistic concurrency; jobs retry by themselves on conflict errors.
- **Drivers on a 7 GB machine.** PySpark standalone has no cluster mode, so every driver runs on the master, each job profile with its own driver memory. Only small tables reach the driver, by design: the list of days, the novelty table of 126 thousand products (2–3 MB, broadcast) and the answers of 9,467 users (`docs/KIEN_TRUC.md` section 9).

## Measured performance tuning

**OPTIMIZE and Z-ORDER.** The hot query of the web application is `WHERE ma_nguoi_dung = ?` on the 5.3-million-row recommendation table. Each phase measures 30 lookups (@tab:zorder).

Table: Lookup of one user's recommendations before and after tuning {#tab:zorder w=34,14,18,17,17}
| Phase | Table files | Files read per query | Median (ms) | p95 (ms) |
|---|---|---|---|---|
| Fragmented (many days of MERGE) | 200 | 200 | 10,793 | 13,420 |
| OPTIMIZE only (compaction) | 67 | 67 | 8,280 | 9,524 |
| OPTIMIZE ZORDER BY (ma_nguoi_dung) | 55 | 1.07 | 980 | 1,387 |

Compaction alone hardly helps: every file still holds users from the whole ID range, so each file's min/max covers the entire domain. Z-ORDER places a user's rows together, each file's min/max range narrows, and data skipping opens only about 1 file: **8.4 times faster** than compaction alone. This requires small files (the experiment caps them at 1 MB). On 16 November the team found that the nightly OPTIMIZE of DAG 4 used the 1 GB default, merging the table into a single file and cancelling the benefit; it now uses the same 1 MB cap (@sec:web).

**Streaming latency.** Measured on the cluster on 11 November (@tab:dotre).

Table: Streaming latency measured on the cluster (11 Nov 2026) {#tab:dotre w=60,40}
| Measurement | Result |
|---|---|
| From the Kafka broker to bronze | 10.3–10.7 seconds |
| From a click on the web site to the update of the trending table | **51 seconds**, target ≤ 90 seconds, measured while ALS tuning was running |

**Delta Lake in practice.** `DESCRIBE HISTORY` shows the `STREAMING UPDATE` and `MERGE` of the streams, `WRITE` with a day `predicate` on silver, `OPTIMIZE` with `zOrderBy`, and the `ADD COLUMNS` of schema evolution. `scripts/demo/delta_sql.sh` runs DESCRIBE HISTORY, VERSION AS OF and counts commits per operation with a local Spark session, without taking cores from the cluster. The output is in `docs/bang_chung/cum/04_delta.txt`.
