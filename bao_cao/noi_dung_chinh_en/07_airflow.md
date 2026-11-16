# Airflow orchestration {#sec:af}

## DAG overview

Table: The five DAGs (Airflow 3.3.1; every Spark task calls `submit.sh` through a BashOperator) {#tab:dag w=24,13,13,50}
| DAG | Schedule | Deadline | Content |
|---|---|---|---|
| `kn_pipeline_hang_ngay` | 02:00 daily | 7 hours | Sensor waits for new data → cleaning → statistics → matrix → tuning → evaluation → **BranchPythonOperator**: deploy, or keep the old model and raise an alert |
| `kn_giam_sat_streaming` | every 15 minutes | 10 minutes | Checks that the trending stream is alive and has the latest 15-minute window; restarts it on failure (`trigger_rule = one_failed`) |
| `kn_tinh_ab` | hourly | 30 minutes | CDF → aggregation → z-test → MERGE into `gold.ket_qua_ab`; **ShortCircuitOperator** for backfill |
| `kn_bao_tri` | 04:00 daily | 90 minutes | Delete old recommendations → OPTIMIZE / ZORDER → VACUUM |
| `kn_tai_lap` | manual | 3 hours | Takes `phien_ban_delta` through `dag_run.conf`, reruns training on `VERSION AS OF`, compares with the history |

![The daily pipeline DAG; the resource profile of each Spark task is shown in square brackets](hinh/f05b_dag1_ngang.png){#fig:dag1 w=16}

## Error handling

- **Retries and alerts.** `retries = 1` five minutes apart, `on_failure_callback` writing to `logs/canh_bao.log`, an `execution_timeout` of 4 hours for tuning and a `dagrun_timeout` per DAG. Every write is idempotent (@sec:spark), so a DAG that fails at task 3 of 5 can be rerun without duplicating data.
- **Sensors that hold no slot.** The sensor runs in `mode = "reschedule"` and compares the modification times of the bronze `_spark_metadata` and the silver `_delta_log` through WebHDFS, without starting Spark; with `soft_fail`, a night without data ends as a skipped run, not a failure.
- **A branch that keeps the old model.** If the NDCG of the new model does not reach that of the served model (1% tolerance), gold is left unchanged and the DAG records an alert.
- **SLA through Deadline Alerts.** Airflow 3.0 removed `sla`; 3.1 replaced it with Deadline Alerts. Each DAG sets `deadline = han_chot(minutes)` from the moment the run is queued; an unfinished run triggers the callback **at the deadline**, whereas the old SLA was checked only when the run ended. On a real Airflow 3.3.1 with a 1-minute deadline, the callback ran after 61 seconds while the task was still running.

## Backfill

- **DAG 1.** Triggered with the configuration `{"tu_ngay": "2015-09-10", "den_ngay": "2015-09-12"}`. `bronze_to_silver` recomputes exactly those partitions (both silver and quarantine), skips the sensor and **does not move the incremental watermark**: the commit records `{"backfill": …}` instead of a watermark. The later steps run as usual.
- **DAG 3.** Uses the standard command `airflow backfill create --dag-id kn_tinh_ab --from-date … --to-date … --reprocess-behavior completed`. Each day has 24 runs. The `cong_backfill` gate lets the 00:00 UTC run recompute the whole day and skips the other 23. MERGE on (day, group) prevents duplicates. Run on the cluster on 16 November for 06:00–08:00 on 15 November (Vietnam time): exactly the 00:00 UTC run executed the job with `--tu-ngay 2026-11-15`, and the other two were skipped (`docs/bang_chung/cum/10_backfill_dag3.txt`).
