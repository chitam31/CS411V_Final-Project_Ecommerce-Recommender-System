# Introduction {#sec:intro}

## Project Overview {#sec:overview}

Online marketplaces sell far more products than a visitor can browse. A marketplace with 1.4 million visitors and 235,000 products, the scenario of this project, cannot rely on search and category menus alone: most products are never seen unless the shop puts them in front of the right person at the right moment. Recommender systems fill this gap. They turn the trail of clicks that visitors leave behind into ranked lists of products that each visitor is likely to want, and they are one of the main levers of revenue in e-commerce.

The assignment (Topic 3, project code `bd03_khuyen_nghi`) asks for a recommender for such a marketplace, built on big-data tools and evaluated with the same rigour as an industrial system. The marketplace wants four things:

- a personalised **"For you"** block on the home page;
- a **"Related products"** block on every product page;
- a **"Trending now"** block that follows activity in real time (15-minute window);
- a way to **measure which recommendation strategy earns more clicks** through an A/B test, and to **reproduce** the result of any past experiment when it is questioned.

Three difficulties make the problem realistic. The data is **implicit feedback**: the shop records only views, add-to-cart and purchase events, never an explicit rating, so the model must infer preference from behaviour. **Cold start** is everywhere: brand-new visitors have no history, most visitors have only a handful of events, and new products have never been clicked. Finally, **popularity bias** pushes collaborative filtering towards the same best sellers for everyone, which hurts both discovery and long-tail sales.

The project uses the public **RetailRocket Recommender System Dataset** [14]: 2.76 million events (`view`, `addtocart`, `transaction`) from about 1.4 million visitors over 4.5 months (May to September 2015), together with time-stamped item properties and a category tree. Because a static file cannot exercise a streaming system, a producer replays the events into Kafka in their original order, compressing one day into 30 seconds, and adds 5 % of events from synthetic brand-new users so that the cold-start paths are exercised.

The result is a complete pipeline, shown in @fig:arch, that spans ingestion, stream and batch processing, a Delta Lake lakehouse on HDFS, model training and evaluation, a web application that plays the role of the marketplace, and workflow orchestration with Airflow. Everything runs on a cluster of six laboratory machines with 7 GB of RAM each, a constraint that shaped many design decisions.

## Objectives {#sec:objectives}

The objectives follow the specification of the assignment (sections 3.1 to 3.11). They fall into five groups.

**O1 – Data platform.** Build a lakehouse with bronze, silver, features and gold layers on HDFS and Delta Lake, fed by Kafka; keep the exact table schemas of the specification (section 3.4); use MERGE, time travel, schema evolution, Change Data Feed, OPTIMIZE/Z-ORDER and partitioning where the specification requires them (section 3.7).

**O2 – Streaming.** Ingest the event stream into bronze with checkpoints on HDFS, and maintain the trending table with a 15-minute sliding window, a 1-minute slide and a 2-minute watermark, written with `outputMode("update")` and MERGE, fast enough that a click on the web appears in the trending block within 90 seconds.

**O3 – Recommendation model.** Train ALS with `implicitPrefs = true` on a time-decayed interaction matrix; tune at least 9 combinations of `rank ∈ {10, 30, 50}`, `regParam ∈ {0.01, 0.1, 1.0}`, `alpha ∈ {1, 10, 40}`; split the data by time (first four months for training, last month for testing); report Precision@10, Recall@10, NDCG@10, MAP@10, coverage and novelty; compare with two baselines; implement three cold-start strategies; and add a version 2 model that uses the price column introduced by schema evolution.

**O4 – Experimentation.** Assign users to groups A (pure ALS) and B (ALS blended with 30 % trending items) with a stable hash; log every impression; compute CTR and conversion per group with a two-proportion z-test; and make every result reproducible from the exact Delta version of the data it was computed on.

**O5 – Operations.** Orchestrate the system with five Airflow DAGs (daily pipeline, stream monitor, hourly A/B computation, nightly maintenance, manual reproduction), and provide a web application with five screens: home, product, A/B dashboard, model quality and experiment reproduction.

@tab:nghiem-thu lists the measurable acceptance criteria. The two thresholds of the model are taken literally from the specification: the NDCG@10 of ALS must exceed that of the best-seller baseline by at least 30 %, and catalogue coverage must reach at least 10 %.

Table: Acceptance checklist of the assignment (section 3.11) {#tab:nghiem-thu w=6,58,36}
| # | Criterion | Where it is shown in this report |
|---|---|---|
| 1 | Tuning table with at least 9 ALS combinations and NDCG@10 | @sec:res-tuning |
| 2 | ALS versus 2 baselines on 4 ranking metrics plus coverage and novelty | @sec:res-baselines |
| 3 | The 3 cold-start strategies work, demonstrated with a user created on the spot | @sec:impl-blend, @sec:res-checklist |
| 4 | Trending block updated within 90 s of a click on the web | @sec:impl-streaming, @sec:res-streaming |
| 5 | Closed loop: a click on the web reaches Kafka, bronze and the trending table | @sec:flow, @sec:res-streaming |
| 6 | A/B result with p-value and statistical conclusion | @sec:res-ab |
| 7 | Reproduction demo with `VERSION AS OF` giving the same metrics | @sec:res-repro |
| 8 | OPTIMIZE/Z-ORDER figures for the per-user recommendation lookup | @sec:res-zorder |

## Scope {#sec:scope}

**In scope.** The project covers the full path from raw events to recommendations shown on a web page: the Kafka producer, three streaming jobs, the batch pipeline (cleaning, statistics, related products, matrix preparation, tuning, evaluation, serving lists, blending, publishing), the A/B pipeline (impression logging, simulated traffic, aggregation and testing), Delta Lake maintenance, the five Airflow DAGs, the web application, the deployment scripts for the cluster, and an automated test suite of 82 tests that run on a local Spark session.

**Out of scope.** The project does not handle user accounts, payments or a product catalogue editor; the web application only simulates the shopping pages needed to generate realistic events and impressions. Deep-learning recommenders and online (incremental) model updates are not attempted: ALS is retrained in batch every night, as the specification requires. No cloud service is used; the whole system runs on the laboratory machines.

**Assumptions and constraints.**

- *Data.* RetailRocket item properties are anonymised. Property `790`, commonly used as the price, is a transformed number and is meaningful only for relative comparisons; the dataset has no star ratings, so the `xep_hang_sao` column added by schema evolution is a proxy computed from the purchase-to-view ratio (@sec:impl-v2).
- *Traffic.* There are not enough real visitors to give an A/B test statistical power, so most impressions are simulated with a position-dependent click model, as the specification allows (section 3.10). Every simulated row is labelled and the dashboard displays the simulated share.
- *Hardware.* Six shared laboratory machines with 12 logical cores and 7 GB of RAM each, one of which also hosted software of other groups; a Wi-Fi network between them; no administrator rights beyond what the laboratory allows. All memory settings are sized from measurements on these machines (@sec:infra).
- *Evaluation protocol.* Hyper-parameters are chosen on the test month itself, without a separate validation period. This is common in coursework but makes the reported metrics slightly optimistic; the report states it wherever it matters (@sec:res-tuning).

## Report Organization

@sec:background summarises the theory the system relies on: implicit-feedback ALS, ranking metrics, the lakehouse and Delta Lake, Spark and Structured Streaming, Kafka, HDFS, Airflow and controlled experiments. @sec:architecture presents the architecture: design principles, the high-level design, the cluster infrastructure, the routing of tasks and data through the pipeline, and the data model. @sec:config explains how configuration is managed from a single cluster directory. @sec:impl describes the implementation of the infrastructure, every Spark job, the Airflow DAGs, the web application, the A/B pipeline and the test suite. @sec:results reports the experimental results on the real dataset against the acceptance criteria. @sec:issues records the problems met while running on a shared laboratory cluster and the lessons learned. @sec:conclusion concludes and outlines future work. The appendices give the repository structure, the operating runbook, the demonstration script and a requirement-by-requirement traceability matrix.
