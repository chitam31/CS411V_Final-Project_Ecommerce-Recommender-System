# System architecture {#sec:kt}

## Overall design

![Overall architecture in six layers: sources, ingestion, stream processing, lakehouse, batch and machine learning, serving](hinh/f01b_kien_truc_ngang.png){#fig:kt w=16}

The system has six layers (@fig:kt):

1. **Sources.** The RetailRocket files, the replay producer and shoppers on the web site.
2. **Ingestion.** Kafka decouples the sources from processing.
3. **Stream processing.** Three Structured Streaming jobs load events into bronze, compute trending scores and write impressions into gold.
4. **Lakehouse.** The data lake on HDFS and Delta Lake holds bronze, silver, features, gold, models, checkpoints and `_quarantine`.
5. **Batch and machine learning.** A nightly pipeline cleans the data, builds the matrix, tunes and evaluates ALS, then publishes the lists with MERGE.
6. **Serving.** The web application reads Delta and writes events back to Kafka, closing the data loop. Airflow orchestrates every batch job.

## Technology choices and rationale

Table: Components, versions and rationale {#tab:tp w=18,22,60}
| Layer | Technology | Rationale |
|---|---|---|
| Ingestion | Kafka 3.7.2 KRaft, 2 topics × 3 partitions | The user ID is the message key, so a user's events stay in order; consumers can re-read after a failure |
| Processing | Spark 3.5.3 standalone + MLlib | One engine for streaming, batch and ALS; standalone is allowed (A.3) and lighter than YARN on 7 GB machines |
| Table format | Delta Lake 3.2.0 | ACID, MERGE, time travel for reproducibility, CDF for incremental A/B, Z-ORDER for per-user queries |
| Storage | HDFS 3.5.0, replication 2 | Uses the disks of 5 machines; replication 2 because a lab machine may hang at any time |
| Orchestration | Airflow 3.3.1, LocalExecutor | A task is only a `spark-submit` command that waits for its result; one machine is enough |
| Serving | FastAPI + Jinja2 + Chart.js, Spark `local[2]` | Reads Delta directly; the per-user query is exactly the query that Z-ORDER optimises |
| Infrastructure | Docker Compose, ZeroTier, Bash | One compose file per role; all configuration comes from one directory file, `cau_hinh/cum.env` |

## Physical deployment

Table: Machine roles {#tab:may w=20,18,62}
| Machine | ZeroTier IP | Role |
|---|---|---|
| labsoe-11 | 10.68.71.113 | NameNode, Spark Master, Airflow, driver of every job |
| labsit12, labsit-may25, labsit-may26 | .198, .42, .90 | DataNode + Spark Worker |
| labsit | .204 | DataNode + Worker + Kafka + producer |
| labsoe-18 | .149 | DataNode + Worker + web |

Every lab machine has 12 cores and 7 GB of RAM. Memory settings are sized from real measurements, and each job profile (streaming, batch, ALS, maintenance) has its own core limit so jobs can run side by side. Code reaches the machines through `git push` over SSH (`ssh_tat_ca.sh --dong-bo-ma`); the shared lab machines hold no GitHub token or Kaggle key.
