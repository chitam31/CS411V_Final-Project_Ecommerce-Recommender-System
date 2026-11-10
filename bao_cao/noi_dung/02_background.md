# Background {#sec:background}

This chapter summarises the concepts the system is built on. It is not a survey; each section explains only what is needed to follow the design decisions in later chapters.

## Recommender Systems and Implicit Feedback

A recommender system estimates how much a user *u* will be interested in an item *i* and shows each user the items with the highest estimates. Two families dominate. *Content-based* methods describe items by their attributes and recommend items similar to those the user liked. *Collaborative filtering* ignores item content and learns from the interaction matrix alone: users who behaved alike in the past are assumed to like similar items in the future. Collaborative filtering is the natural choice here because RetailRocket item attributes are anonymised hashes, while the interaction log is rich.

Most real shops collect **implicit feedback** — page views, add-to-cart events, purchases — instead of explicit ratings. Implicit data differs from ratings in three ways that matter for modelling [1]. First, there is no negative signal: an item a user never viewed may be unknown rather than disliked. Second, the numbers express *confidence*, not *preference*: ten views of a product make it more certain that the user is interested, not that the user likes it ten times more. Third, the matrix is extremely sparse; in this project the training matrix has a density of about 1.8 × 10^{−5}.

Three further problems are typical of e-commerce. **Cold start** concerns users and items without enough history for collaborative filtering; it must be handled by separate strategies such as popularity within a category or what is trending now. **Popularity bias** [5] is the tendency of collaborative models to recommend the same popular items to everyone, because popular items have the strongest learned vectors. **Bots and noise** — crawlers that generate thousands of events per hour, double clicks and page reloads — distort both popularity and the interaction matrix and must be removed before training.

## Alternating Least Squares for Implicit Feedback {#sec:bg-als}

Matrix factorisation [3] represents each user by a vector *x_u* and each item by a vector *y_i* of dimension *f* (the *rank*), so that the inner product *x_uᵀ y_i* approximates the user's interest. For implicit feedback, Hu, Koren and Volinsky [1] split each observation *r_ui* (here a time-decayed interaction score) into a binary preference and a confidence level, as in @eq:pref.

$$pref$$ {#eq:pref}

The model is fitted on **all** user–item pairs, including the empty ones (with preference 0 and confidence 1), by minimising @eq:als.

$$als$$ {#eq:als}

Because the sum runs over every cell of the matrix, gradient descent would be prohibitively expensive. Alternating least squares exploits the fact that, with *Y* fixed, the objective is quadratic in each *x_u* and has a closed-form solution; the algorithm alternates between solving for all users with items fixed and for all items with users fixed. Each half-step decomposes into independent least-squares problems, which Spark MLlib distributes across the cluster by partitioning users and items into blocks. MLlib scales the regularisation term by the number of interactions *n_u* and *n_i* (the ALS-WR scheme [2]), which makes `regParam` less sensitive to the size of the data.

The three hyper-parameters tuned in this project have a clear meaning. `rank` is the number of latent factors and controls model capacity. `regParam` (λ) penalises large factors and controls over-fitting. `alpha` controls how much more an observed interaction is trusted than an empty cell: with α = 40, a single purchase (weight 5) gives a confidence of 201 against 1 for an unobserved pair. The scores *x_uᵀ y_i* are used only for ranking; they are not probabilities.

## Evaluation Metrics for Top-K Recommendation {#sec:bg-metrics}

Offline evaluation hides the most recent interactions, asks the model for a top-*K* list per user and checks how many hidden items it recovers. Let *R_K(u)* be the top-*K* list of user *u*, *T(u)* the ground truth (items the user interacted with in the test period) and *rel_j* = 1 if the item at position *j* belongs to *T(u)*. Precision and recall at *K* are defined in @eq:pr.

$$pr$$ {#eq:pr}

Precision and recall ignore the order of the list. **NDCG@K** [4] rewards hits near the top with a logarithmic discount and normalises by the ideal list (@eq:ndcg), where *IDCG@K* places min(|*T(u)*|, *K*) hits in the first positions. **MAP@K** averages the precision at each hit position (@eq:map). All four metrics are averaged over users with a non-empty ground truth; a user who receives no recommendation scores zero. The definitions match `pyspark.mllib.evaluation.RankingMetrics`, and a unit test compares the project's implementation with Spark's.

$$ndcg$$ {#eq:ndcg}

$$map$$ {#eq:map}

Accuracy metrics alone reward popularity. Two further metrics, both required by the assignment, measure diversity [6] (@eq:covnov). **Coverage** is the share of the catalogue that appears in at least one top-*K* list. **Novelty** is the mean self-information of the recommended items, where *n_i* is the number of training users who interacted with item *i* and *N* is the number of training users: rarely seen items carry more information. The project also reports the **popularity distribution**: items are split into ten equal groups by popularity (N1 = the 10 % most popular), and the share of recommendation slots in each group is counted. Without popularity bias every group would receive about 10 %.

$$covnov$$ {#eq:covnov}

## The Lakehouse and Delta Lake {#sec:bg-delta}

A *data lake* stores raw files cheaply on a distributed file system but offers no transactions: a job that fails half-way leaves partial files, concurrent writers corrupt each other, and there is no way to update a single row. A *data warehouse* offers transactions but is expensive and poorly suited to machine learning on raw data. The **lakehouse** [11] adds a transactional metadata layer on top of open files in the lake. The project follows the common *medallion* organisation: **bronze** keeps raw events as received, **silver** keeps cleaned and conformed data, and **gold** keeps business-level tables ready for serving; a **features** layer sits between silver and the model.

**Delta Lake** [10] implements the lakehouse with Parquet data files plus a transaction log (`_delta_log`) of JSON commit files. Every write appends one commit that lists the files added and removed; readers reconstruct a consistent snapshot by replaying the log, so they never see a half-written table. Optimistic concurrency control resolves concurrent writers: each transaction checks at commit time whether a conflicting commit happened since it started, and if so it fails with a `Concurrent…Exception` and must be retried. The features used in this project are:

- **MERGE** (upsert): update matching rows, insert new ones and optionally delete others in one atomic statement — used to update a user's recommendation list without rewriting the whole table, and to upsert streaming aggregates.
- **Time travel**: `VERSION AS OF v` reads the table exactly as it was after commit *v*, as long as the files of that version have not been vacuumed. This is the basis of reproducibility.
- **Schema evolution**: `ALTER TABLE ADD COLUMNS` adds columns without rewriting data; old versions remain readable with their original schema.
- **Change Data Feed (CDF)**: when enabled, Delta records row-level changes, so a downstream job can read only the rows inserted or updated since a given version.
- **OPTIMIZE** compacts small files; **Z-ORDER BY** additionally clusters rows by one or more columns along a space-filling curve, so that the min/max statistics of each file cover a narrow range and data skipping can ignore most files for a selective predicate.
- **VACUUM** deletes files no longer referenced by recent versions; its retention period bounds how far back time travel can go.
- **Partitioning** splits a table into directories by a low-cardinality column (here the event date), so that queries filtering on that column read only the relevant directories.

## Apache Spark and Structured Streaming {#sec:bg-spark}

**Spark** [8] is a distributed engine that executes data-parallel programs. A *driver* process builds a plan from DataFrame or SQL operations, splits it into stages and tasks, and schedules the tasks on *executors* running on worker machines. In **standalone mode**, a Spark Master tracks the available workers and allocates executors to applications. Two settings matter on a shared cluster: `spark.cores.max` caps the cores an application may take (otherwise the first application grabs the whole cluster), and `spark.executor.memory` must fit within the memory each worker offers, or that worker receives no executor at all. PySpark applications on a standalone cluster can only run in *client mode*, where the driver lives on the machine that submits the job; this placed every driver of the project on the master host (@sec:infra).

**Structured Streaming** [9] treats a stream as an unbounded table and runs the same DataFrame operations incrementally in *micro-batches* triggered at a fixed interval. A **checkpoint** on reliable storage records the source offsets and the operator state of each batch, so a restarted query resumes exactly where it stopped. With a replayable source (Kafka) and an idempotent or transactional sink (Delta, or the Parquet file sink with its `_spark_metadata` log), the end-to-end result is exactly-once. **Event-time windows** group records by a timestamp column into fixed or sliding windows; a **watermark** declares how late data may arrive, after which the state of old windows is dropped. The **output mode** decides what each batch emits: `update` emits only the windows changed by the batch, which suits an upsert into a Delta table through `foreachBatch` and MERGE.

## Apache Kafka

**Kafka** [12] is a distributed, partitioned, replicated commit log. Producers append records to *topics*; each topic is split into partitions, and records with the same key go to the same partition, preserving their order. Consumers read at their own pace by tracking offsets, which means that several independent consumers — here three streaming jobs — can read the same topic without interfering, and a consumer can replay history from any offset. Kafka 3.7 runs in **KRaft** mode, where a built-in Raft quorum replaces ZooKeeper for metadata. In this project Kafka decouples the producers (the replay tool and the web application) from the processing jobs: the web application never writes to Delta directly, which avoids one commit and one small file per click.

## Hadoop Distributed File System

**HDFS** [13] stores files as large blocks (128 MB by default) replicated on several **DataNodes**, while a single **NameNode** keeps the namespace and the block locations in memory. Clients ask the NameNode where blocks are and then read or write directly from the DataNodes. Two properties shape the design. First, the NameNode holds about 150 bytes of heap per file, directory and block, so millions of small files exhaust it and slow every listing — the "small-file problem" that led to the choice of partitioning by date rather than by user (@sec:data-model). Second, the replication factor decides how many machine failures the data survives: with a factor of 1, losing or stalling one DataNode makes its blocks unreadable, as the project experienced (@sec:issues).

## Workflow Orchestration with Apache Airflow

**Airflow** describes workflows as Python-defined DAGs of tasks with dependencies, schedules (cron expressions), retries and timeouts. The scheduler creates *DAG runs* for each schedule interval and hands ready tasks to an executor; the `LocalExecutor` runs them as processes on the same host. *Sensors* wait for an external condition; in `reschedule` mode they release their worker slot between checks. A `BranchPythonOperator` chooses which downstream path to follow, and tasks exchange small values through **XCom**. *Pools* cap how many tasks run at once. Airflow 3, used here, splits the server into an API server, a scheduler, a DAG processor and an optional triggerer, and task processes talk to the API server through an execution API.

## Online Controlled Experiments {#sec:bg-ab}

An **A/B test** [7] randomly assigns units (here users) to a control group A and a treatment group B and compares an outcome metric. Assignment must be **stable** — the same user always lands in the same group — which is achieved by hashing the user id. For a binary outcome such as a click per impression, the **two-proportion z-test** compares the observed rates of the two groups with a pooled variance (@eq:z); the p-value is the probability of a difference at least as large if the true rates were equal.

$$z$$ {#eq:z}

The **sample size** needed per group to detect a change from *p₁* to *p₂* with significance level α and power 1 − β is given by @eq:n. Two pitfalls are relevant. Impressions of the same user are not independent, so a test at the impression level can understate the p-value; and repeatedly testing every day until a significant result appears ("peeking") inflates the false-positive rate. The project therefore defines the pooled test over the whole period as the primary analysis and uses daily values only for monitoring (@sec:res-ab).

$$n$$ {#eq:n}
