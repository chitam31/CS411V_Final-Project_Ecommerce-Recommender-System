# !Abstract

This report presents **bd03_khuyen_nghi**, a product recommender system for a simulated e-commerce marketplace (Topic 3, Big Data course CS411V). The system serves three blocks:

- "For you" (personalised);
- "Related products";
- "Trending now", refreshed within 90 seconds.

Every A/B test result can be reproduced with Delta Lake time travel.

**Platform.** The system runs on six laboratory machines connected over ZeroTier, with:

- HDFS 3.5 (5 DataNodes, replication 2), Spark 3.5.3 standalone (34 cores), Kafka 3.7.2 in KRaft mode, Delta Lake 3.2;
- Airflow 3.3.1 with 5 DAGs;
- a FastAPI + Jinja2 + Chart.js web application.

The RetailRocket dataset (2.76 million events over 4.5 months) is replayed into Kafka, each day of data compressed into 30 seconds.

**Results on real data.**

Table: - {w=62,38}
| Result | Value |
|---|---|
| Best implicit-feedback ALS (rank 50, regParam 1.0, alpha 40) | NDCG@10 = 0.0680 |
| Against the global / per-category best-seller baseline | 1,237% / 43% higher |
| Coverage of plain ALS, with root-cause analysis | 3.44% |
| Served version: novelty re-ranking | NDCG@10 0.0865, coverage 6.47% |
| A/B: blending in 30% trending products | CTR falls from 2.094% to 1.978% (p = 0.015) |
| Z-ORDER by user, recommendation lookup | median 8.3 s → 0.98 s |
| Reproducing a training run with `VERSION AS OF` | deviation 0 |

The system meets the five mandatory requirements of the course outline:

- the root `hdfs:///lakehouse/bd03_khuyen_nghi/` with a `_quarantine` zone;
- MERGE, DESCRIBE HISTORY, VERSION AS OF and OPTIMIZE, with measurements;
- a web application that writes back to Delta;
- Airflow with retries, Deadline Alerts in place of `sla`, branching and sensors;
- backfill.

The full report (120 pages, in Vietnamese, `BD03_Bao_cao_He_thong_goi_y.pdf`) is the technical appendix to this main report.

**Keywords:** recommender system, implicit-feedback ALS, Spark, Structured Streaming, Kafka, Delta Lake, lakehouse, Airflow, A/B testing, reproducibility.
