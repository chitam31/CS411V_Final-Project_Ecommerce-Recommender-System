# Lakehouse design {#sec:lake}

## Directory tree on HDFS

The root follows the convention of section A.4: `hdfs:///lakehouse/bd03_khuyen_nghi/`.

```
/lakehouse/bd03_khuyen_nghi
├── landing/retailrocket/        raw CSV
├── bronze/su_kien/              Parquet, ngay=…/, append-only (+ _spark_metadata)
├── silver/{tuong_tac,san_pham}/ Delta; tuong_tac partitioned by ngay
├── features/ma_tran_tuong_tac/  Delta (column tap = train/test)
├── gold/<12 tables>/            Delta
├── models/                      StringIndexer, als/<run_id>, als/<run_id>_phuc_vu
├── checkpoints/<stream>/        Kafka offsets, RocksDB state
└── _quarantine/tuong_tac/       Delta, by ngay: rejected rows + ly_do
```

Tables are addressed by path (the standalone cluster has no Hive Metastore); logical names such as `silver.tuong_tac` map to paths in `jobs/common/cau_hinh.py`. The output of `hdfs dfs -du -h /lakehouse/bd03_khuyen_nghi` (A.6.3) is in `docs/bang_chung/cum/01_hdfs_du_h.txt`.

**Root migration on 15 November.** The data lake used to live under `/lake`. `scripts/cum/chuyen_lakehouse.sh` moves each table with `hdfs dfs -mv`, which only renames entries on the NameNode and copies no blocks:

- Delta tables store relative paths, so version history and `VERSION AS OF` stay intact.
- Only the bronze file sink writes absolute paths into `_spark_metadata`; the script rewrites those files.
- The migration can be undone, and `submit.sh` refuses to submit jobs while data is still under the old root.
- The procedure is tested with real Spark: move, read back, the stream continues without reprocessing, undo.

## Bronze, silver and gold schemas

Table: Main tables (column names and types follow specification 3.4; every extra column has a reason) {#tab:bang w=24,14,62}
| Table | Format | Content, extra columns |
|---|---|---|
| `bronze.su_kien` | Parquet, by `ngay` | 9 specification columns + `ma_giao_dich`, `kafka_ts` (trending, latency measurement), `_nguon`, `_ingest_ts` (incremental watermark) |
| `silver.tuong_tac` | Delta, by `ngay` | 6 specification columns + `_nguon`; `gia_san_pham`, `xep_hang_sao` after schema evolution |
| `_quarantine.tuong_tac` | Delta, by `ngay` | Bronze columns + `ly_do`, `_cach_ly_luc` |
| `features.ma_tran_tuong_tac` | Delta | `user_idx, item_idx, diem` + `tap`: one version holds both the training data and the answers, for reproducibility |
| `gold.goi_y_nguoi_dung` | Delta, Z-ORDER by user | top 20 per user, MERGE on (user, rank) |
| `gold.thinh_hanh_15p` | Delta | MERGE on (window, product) every 20 seconds |
| `gold.nhat_ky_hien_thi` | Delta, CDF enabled | + `nguon_traffic` (web/simulated), `chien_luoc` |
| `gold.ket_qua_ab` | Delta | + `p_value_chuyen_doi`, `ty_le_mo_phong`, `phien_ban_delta_du_lieu` |

## Partitioning strategy

`bronze`, `silver.tuong_tac` and `_quarantine` are partitioned by `ngay` (day), about 140 partitions. Every batch job reads by day range:

- incremental processing of new days;
- the train/test split at a cut-off day;
- backfill;
- overwriting exactly the affected partitions with `replaceWhere`.

**No partitioning by `ma_nguoi_dung`.** 1.4 million users would become millions of directories and files of a few dozen bytes: the NameNode would hold metadata for each file, the Delta log would balloon, and every scan would open millions of files. On sample data, writing partitions without grouping produced 7,334 files for 20,624 rows; after grouping by partition before writing, the real silver table has only 140 files.

The hot per-user query is solved with Z-ORDER on the gold table (@sec:spark), not with partitioning.

**History kept for reproducibility.** Every table keeps old files for 30 days and its log for 60 days, so the nightly VACUUM does not break `VERSION AS OF` for experiments within one month.
