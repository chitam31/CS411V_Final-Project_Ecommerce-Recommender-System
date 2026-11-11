# Operational Issues and Lessons Learned {#sec:issues}

A large part of the effort went into making the system run reliably on shared laboratory machines with little memory and a Wi-Fi network. This chapter records the problems found, how they were diagnosed and fixed, and what they taught. Every fix was accompanied by a regression test where the problem could be reproduced locally.

## Review of the Inherited Infrastructure {#sec:issues-review}

Before writing new code, the team's existing repositories (Spark, Hadoop and Kafka clusters on Docker) were reviewed against the ZeroTier network. @tab:ra-soat lists the configuration errors found. Several of them would have made a multi-machine cluster fail in ways that are hard to diagnose, because each one works on a single machine.

Table: Configuration errors found in the inherited cluster {#tab:ra-soat w=4,26,36,34}
| # | Location | Problem | Fix |
|---|---|---|---|
| 1 | Spark worker compose | `--host 10.68.71.114` hard-coded for every worker; the address belonged to no machine | Each worker advertises its own `NODE_IP` from the directory |
| 2 | DataNode `hdfs-site.xml` | `dfs.datanode.hostname` set to the master's IP on every DataNode: clients looked for every block on the master | One shared file with `${env.NODE_IP}` |
| 3 | Kafka compose | Volume mounted at `/var/lib/kafka/data` while the image wrote to `/tmp/kraft-combined-logs`: recreating the container lost all topics | `KAFKA_LOG_DIRS=/var/lib/kafka/data` |
| 4 | Spark Master compose | Only ports 4041–4042 open: a single driver at a time, so three streams and a batch job could not coexist | Ports 4041–4060 and 4140–4150, one pair per profile |
| 5 | `submit.sh` | `docker exec -it`: "the input device is not a TTY" when called by Airflow | `-i`, plus a detached mode for streams |
| 6 | `submit.sh` | `--packages io.delta…` at every submission, no Kafka connector | JARs baked into the `bd03/spark` image |
| 7 | `apache/spark:3.5.3` image | No NumPy, so `pyspark.ml` cannot be imported | NumPy 1.24.4 installed in the image |
| 8 | Earlier ML jobs | `saveAsTable` without a metastore or `fs.defaultFS`: tables existed only in one session, on local disk | Tables addressed by HDFS path (@sec:principles) |
| 9 | Earlier bronze job | English column names, not the schema of the specification | New bronze schema in a new directory, old data kept |
| 10 | Duplicate Hadoop repository | Two identical stacks with different volume names | One compose file, with an option to reuse the old volumes |

## Issues Found During Development and Operation

@tab:loi lists the issues found while developing and running the project, in the order they appeared. Issues 1–12 were found by tests or code review before deployment; issues 13–29 appeared on the cluster.

Table: Issues found during development and operation {#tab:loi w=4,46,50}
| # | Issue | Fix |
|---|---|---|
| 1 | A Spark expression created at module level in the ingestion job: the job died on import without a SparkContext | Wrap it in a function called at run time |
| 2 | Unary minus applied to an aliased column in the novelty computation produced a wrong column name | Parenthesise before aliasing |
| 3 | Python workers could not import the shared package | `PYTHONPATH` in tests; `--py-files common.zip` on the cluster |
| 4 | The project's `airflow/` directory shadowed the `airflow` package in tests | Skip DAG tests when Airflow is absent |
| 5 | Airflow 3.3 moved `DagBag` and removed timetable summaries | Tests check `dag.schedule` directly |
| 6 | Synthetic ALS test data was too easy: baselines also scored perfectly | Four preference clusters plus popularity noise |
| 7 | One slot of the group B template was wrong | Template fixed and the number of trending slots asserted |
| 8 | Two inputs with the same name on the home page | Separate forms |
| 9 | Two jobs submitted at the same time could read a half-written `common.zip` | Write to a temporary file, then rename atomically |
| 10 | Model version 2 (price filter) was missing | Implemented (@sec:impl-v2) |
| 11 | The stream monitor wrote a warning file into a missing directory | Create the directory first |
| 12 | The startup script overwrote the web host's `.env`, losing the Airflow password | Machine-specific `.env.rieng` appended on every run |
| 13 | NameNode RPC address `0.0.0.0:8020` in the shared configuration: DataNodes looked for the NameNode at 0.0.0.0 | Advertise 10.68.71.113:8020, bind with `rpc-bind-host = 0.0.0.0` |
| 14 | Spark Master in a bridge network advertised `spark://0.0.0.0:7077` and rejected workers | Host network with `--host 10.68.71.113` |
| 15 | Editing the mounted HDFS XML did not recreate the containers | Configuration hash passed as an environment variable |
| 16 | A job failed when one DataNode stalled for over 60 s: with replication 1 there was no other copy, and all four task attempts hit the same machine | Replication 2, 180 s socket timeout, 8 task attempts, resumable first-run script |
| 17 | Two machines stayed on a relayed ZeroTier path although their LAN worked; the measurement script misclassified a slow LAN as blocked | Blacklist Docker and Tailscale interfaces in ZeroTier; compare ZeroTier and LAN latency |
| 18 | Small-file problem in silver: up to 64 files of a few KB per date (7,334 files for 20,624 sample rows); preparing the matrix took 15 minutes | Repartition by the partition column before writing: one file per date (140 files for 2.88 M rows) |
| 19 | Writing an integer mean into a `DOUBLE` column was rejected by Spark | Coerce integers to floats according to the DDL, for every table |
| 20 | Replaying data a second time would corrupt silver: new offsets give new event ids, doubling hourly counts and turning genuine users into bots | Deduplicate by content before the bot filter; disable synthetic users in the second replay |
| 21 | The Airflow API server restarted in a loop: the authentication manager opens the password file in append mode, but the container ran as UID 50000 | Run the containers with the UID of the project owner; password file mode 600 |
| 22 | Design risk: maintenance (OPTIMIZE/DELETE) and streaming MERGE write the same tables; the second commit fails and the stream stops | Retry helper for Delta conflict exceptions in both streams and the maintenance job |
| 23 | The nightly run could never replace the model: the minimal grid fixes alpha = 10 while the served model uses alpha = 40, so the best nightly combination always lost by more than the 1 % tolerance, even with model version 2 | The served model's hyperparameters are always appended to the grid; a manual run of DAG 1 can skip the data sensor |
| 24 | The hourly A/B DAG (run timeout 50 min) failed twice while its task waited for the single pool slot held by the nightly pipeline | No data lost: the job resumes from the last processed Change Data Feed version; two slots in the daytime |
| 25 | A web application started from home would hang reading HDFS: the home network drops large ZeroTier packets (1,300-byte pings pass, 1,400-byte pings are lost) | `ZT_MTU=1280` lowers the MTU of the ZeroTier interface before the services start |
| 26 | The first web host (Ubuntu in WSL2 on the laptop, 3.8 GB) crashed twice while building and starting the web container because Windows ran short of memory; one crash corrupted the cached base image | The web role moved to labsoe-18 inside the laboratory LAN; `--chi=<role>` starts one role without recreating the other services of a machine |
| 27 | Restarting a stream left a zombie driver: cancelling the application through the Spark Master did not stop the client-mode driver, which later collided with the new stream on the same checkpoint and stopped both streams | `luong.sh dung` also stops the driver process; `khoi_dong` removes a leftover driver first; `trang_thai` warns |
| 28 | The maintenance DAG deleted recommendations older than *today* minus 7 days, so seven days without a new deployment would have emptied the served table (on the morning of the defence) | The cut-off is now the latest deployment minus 7 days; only rows of users missing from recent deployments are removed |
| 29 | The deployment of 11 November blended the lists while the producer was stopped: the newest trending window held only one test product, so all 265,043 stored lists carried a single trending product and the other trending slots fell back to category best sellers, which also inflated the measured coverage of the served table | When the newest window holds fewer than 30 products, the trending list is topped up with the most viewed products of the last 24 hours; the job reports which source it used |

## Key Incidents

### A stalled DataNode and replication factor 1

During the first pipeline on the cluster, the product-statistics job failed with socket timeouts while reading from one DataNode. That machine's ZeroTier service had been restarted while the job was running — on the advice given during the network diagnosis, which wrongly assumed the restart would not affect running jobs. With a replication factor of 1, every block of that DataNode existed only there; HDFS had no other replica to read, and Spark's four task attempts all hit the same machine. The fix had four parts: replication factor 2 for HDFS and for every Spark write (data survives the loss of one machine and reads can go elsewhere), a 180-second socket timeout instead of 60, eight task attempts, and a first-run script that can resume from the failed step without retuning. The rule adopted afterwards is simple: never restart network services while jobs are running.

### Relayed network paths

The first pair-wise measurement showed some pairs of machines communicating through ZeroTier relays, with latencies of hundreds of milliseconds, although the machines shared the same Wi-Fi. ZeroTier advertises every local interface address as a candidate path, including Docker bridges, whose overlapping private ranges on different machines confused path discovery. A script now adds Docker, bridge, veth and Tailscale interfaces to ZeroTier's `interfacePrefixBlacklist`; afterwards 29 of the 30 directed pairs connected directly at about 3 MB/s, the Wi-Fi ceiling. The measurement script was also corrected to compare the ZeroTier latency with the LAN latency of the same pair instead of using a fixed threshold.

### The small-file problem

Writing silver with `partitionBy("ngay")` right after a 64-partition shuffle made every task write one file for every date it contained: 7,334 files for 20,624 sample rows. Each file costs a NameNode lookup and a DataNode connection over Wi-Fi, so preparing the matrix took 15 minutes on sample data. Repartitioning by the partition column before writing produces one file per date; on the real data silver has 140 files for 2.88 million rows. This is the same NameNode pressure that motivated partitioning by date rather than by user (@sec:data-model), observed directly.

### Operating the cluster from outside the campus

From home, SSH connections to the master hung during key exchange (`expecting SSH2_MSG_KEX_ECDH_REPLY`) while connections to other machines worked and large pings failed: a path MTU black hole dropped the large key-exchange packet. Jumping through another laboratory machine (`ProxyJump labsoe-18`) avoided the problem. The paths from home were also unstable — the same machine was reachable one minute and not the next, and seven parallel connections all failed. Three changes made remote operation workable: every long command runs inside `tmux` on the target machine and writes its output to a file there (a result export streamed over SSH was lost when the connection dropped); the code distribution retries `git push` on network errors; and a read-only status script (`tinh_trang.sh`) gives a one-screen view of memory, Spark applications and Airflow runs without nested quoting. The same black hole affected the first web host: from home, 1,300-byte pings to the master passed and 1,400-byte pings were lost, so HDFS reads by the web application would have hung until the MTU of the ZeroTier interface was lowered to 1,280 (issue 25). That host, Ubuntu in WSL2 on the control laptop, then crashed twice for lack of memory (issue 26), and the web application was moved to labsoe-18, which shares the laboratory LAN with the DataNodes; from outside the campus it is opened through an SSH tunnel.

### Memory on the master host

Measurements before enabling Airflow showed only 3.2 GB available on the master, because a Cassandra server unrelated to the project used 2.47 GB. Since every PySpark driver runs on the master (client mode), the three streaming drivers (about 2.4 GB measured) and one batch driver could not fit together with Airflow. Three measures resolved it: stopping Cassandra for the duration of the project with the team's agreement (stopped, not disabled, so it can be restarted unchanged); a slim Airflow configuration of about 0.9 GB; and a one-slot pool so that at most one batch driver runs at a time. Moving Airflow to another machine was considered and rejected: the drivers would stay on the master anyway because tasks submit through the Spark Master container, and the worker machines have only about 1 GB to spare.

### A nightly pipeline that never deploys

The first scheduled run of DAG 1 on the real data (night of 10 November) trained model version 2 on the evolved silver table and then kept the old model. The reason was a design flaw, not the data. The nightly run uses the minimal grid, in which alpha is fixed at 10 to save time, while the served model had been selected from the full grid with alpha = 40. The best nightly combination (rank 50, regParam 1.0, alpha 10) reached NDCG@10 = 0.0574 against 0.0680 for the served model, so the branch `giu_mo_hinh_cu` was taken — and it would have been taken every night, whatever the data, because the nightly grid could not contain the served configuration. The run nevertheless gave two useful results: the nine alpha = 10 combinations reproduced the earlier values to four decimals after the schema evolution and the second replay of 857,072 events, confirming that content deduplication (issue 20) kept silver intact; and at equal hyperparameters the price filter of model version 2 improved NDCG@10 from 0.0574 to 0.0587 (+2.3 %) and coverage from 2.49 % to 2.70 %. The fix (issue 23) appends the served model's hyperparameters to any grid that lacks them, so a new model is always compared with the old one under the same configuration as well as under new ones. A manual run on the morning of 11 November confirmed the fix: the appended configuration was the best of ten, matched the serving model and was deployed as model version 2 (@sec:res-v2).

## Lessons Learned

- **Measure before sizing.** Every memory setting in the project comes from measurements on the actual machines. Estimates made before measuring (8 GB workers, 3–4 GB executors) would have produced a cluster on which no executor could start.
- **Distributed defaults hide single-machine assumptions.** Most inherited errors (hard-coded hosts, `0.0.0.0` advertised addresses, internal container addresses) work on one machine and fail on several. Advertising the overlay IP everywhere and deriving it from one directory removed a whole class of errors.
- **Replication is not optional on unreliable hardware.** A replication factor of 1 saves disk but turns any hiccup of one machine into a failed job.
- **Idempotence makes everything else easier.** Because every job can be re-run safely, Airflow retries, resumable scripts and manual reruns after an incident were all safe by construction.
- **Small files are a real cost, not a textbook warning.** Repartitioning before a partitioned write turned a 15-minute step into seconds.
- **Concurrency must be designed, not assumed.** Optimistic concurrency in Delta is correct but rejects conflicting writers; long-running streams need explicit retries when maintenance touches the same tables.
- **Reproducibility needs more than time travel.** It also needs the ground truth in the same table version, stable indexers, fixed seeds, recorded parameters and a retention period longer than the reproduction horizon.
- **Champion and challenger must be comparable.** An automatic deployment gate is only as good as the candidates it sees: if the retraining grid cannot reproduce the served configuration, the gate silently freezes the model.
- **Operate remote systems asynchronously.** Commands that outlive a network connection belong in `tmux`, with output in files; a status script that reads state without side effects is worth writing early.
