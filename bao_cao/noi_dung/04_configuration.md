# Configuration Management {#sec:config}

A cluster of eight machines, five kinds of services and eight Spark profiles has many settings that must agree with each other: the IP address a DataNode advertises must be the one clients use, the memory a worker offers must exceed the memory an executor requests, and the replication factor of HDFS must match the one Spark jobs use when they write. Settings that are copied by hand drift apart. The project therefore derives every setting from a small number of sources, generates the rest, and keeps secrets out of version control. @fig:config gives an overview.

![Code distribution and configuration generation from a single cluster directory](hinh/f10_cau_hinh.png){#fig:config w=15.8}

## A Single Cluster Directory

The file `cau_hinh/cum.env` is the single source of truth for the topology. Each machine is one line with five fields — host name, ZeroTier IP, comma-separated roles, Spark cores and Spark memory:

```
MAY_1="labsoe-11|10.68.71.113|namenode,spark-master,airflow|0|0"
MAY_2="labsit12|10.68.71.198|datanode,spark-worker|8|3g"
MAY_3="labsit|10.68.71.204|datanode,spark-worker,kafka|6|2g"
MAY_4="labsit-may25|10.68.71.42|datanode,spark-worker|4|2g"
MAY_5="labsit-may26|10.68.71.90|datanode,spark-worker|8|3g"
MAY_6="labsoe-18|10.68.71.149|datanode,spark-worker,web|8|3g"
MAY_7="ctam|10.68.71.205|du-phong|0|0"            # standby
TAI_KHOAN_SSH="labsoe-11=hduser labsit12=labsit12 labsit=labsit ..."   # SSH account per host
SPARK_MASTER_IP=10.68.71.113
HDFS_GOC=hdfs://10.68.71.113:8020
KAFKA_BROKER=10.68.71.204:9092
HE_SO_SAO_CHEP=2
LOI_LO=8
RAM_LO=2g
LOI_ALS=10
RAM_ALS=2g
```

Every script reads this file: the startup script uses it to decide which services a machine runs, the SSH control script to list machines and accounts, `submit.sh` to find the master and to set the replication factor of Spark writes, and the streaming launcher to find the Spark Master UI. Moving a role to another machine, changing the replication factor or resizing a worker is a one-line change followed by re-running the startup script on the affected machines.

## Generated Service Configuration

`scripts/cum/khoi_dong_may.sh` runs on each machine. It finds its own line in the directory by comparing the machine's IPv4 addresses with the ZeroTier IPs, reads the roles, and writes one `.env` file per Docker Compose project (`ha_tang/hadoop/.env`, `ha_tang/spark/.env`, `ha_tang/kafka/.env`, `ha_tang/web/.env`). The generated values include the node's ZeroTier IP, the worker's cores and memory, the master's address, the HDFS replication factor and the HDFS URL. It then starts the services of each role with `docker compose up -d`, in dependency order: NameNode, DataNode, Kafka, Spark Master, Spark Worker, Airflow, web. Before starting anything it checks that no container with the same name belongs to another compose project — a situation found on several machines with older clusters — and stops with instructions instead of creating a conflicting container.

Two details make regeneration safe:

- **Configuration hashes.** Docker Compose recreates a container only when its definition changes, not when a mounted XML file changes. The script therefore computes a hash of `ha_tang/hadoop/config/*.xml` and passes it as an environment variable (`CAU_HINH_HDFS`) to the Hadoop containers; editing `hdfs-site.xml` changes the hash, and the next run recreates the containers with the new configuration.
- **Machine-specific overrides.** A file `.env.rieng` (for example the Airflow password the web application needs to trigger a DAG) is appended to the generated `.env` on every run, so regeneration never loses a manual setting.

The Spark image `bd03/spark:3.5.3` is built only when absent (or with `--build`). It extends `apache/spark:3.5.3` with NumPy (required by `pyspark.ml`) and with the Delta Lake 3.2.0 and Kafka connector JARs, so that no job downloads packages at submission time and concurrent jobs do not contend for the Ivy cache.

## Application Configuration

Settings of the application itself — not of the infrastructure — live in `jobs/common/cau_hinh.py` and are imported by all jobs, the web application and the tests:

- the **table registry**, mapping each logical table name to its HDFS path, and the checkpoint paths of the streams;
- the **event weights** (view 1, add-to-cart 3, purchase 5), the time-decay constant λ = 0.01, the deduplication window of 5 seconds and the bot threshold of 500 events per hour;
- the **ALS grids** (27 combinations for the full grid, 9 for the nightly grid), the evaluation cut-off K = 10 and the list length of 20;
- the **re-ranking** parameters (200 candidates, β = 1.0) and the A/B slot templates;
- the **Delta retention**: `deletedFileRetentionDuration = 30 days` and `logRetentionDuration = 60 days`, applied as defaults to every table the jobs create through `spark.databricks.delta.properties.defaults.*`. The nightly VACUUM honours these properties, so time travel to any version of the last 30 days remains possible.

The schema of every table is declared once, as DDL strings in `jobs/common/luoc_do.py`. A helper creates DataFrames from Python rows according to the DDL and coerces integers to floating point for `DOUBLE` columns, after a measurement written as an integer was rejected by Spark (@sec:issues).

## Spark Submission Profiles

The profiles of @tab:ho-so are defined in one `case` statement in `submit.sh`. Batch profiles read their cores and memory from the cluster directory (`LOI_LO`, `RAM_LO`, `LOI_ALS`, `RAM_ALS`), so they can be resized without editing code. The script also sets the options common to all jobs: the Delta extensions and catalog, UTC session time zone, `dfs.client.use.datanode.hostname`, the replication factor, the socket timeout and retry settings, and `--py-files common.zip`. The trending profile additionally switches the state store to RocksDB, so that the state of tens of thousands of (window, item) pairs is kept off the JVM heap; this setting is applied from the first run because changing the provider makes an existing checkpoint unusable.

## Airflow Configuration

Airflow is configured by `ha_tang/airflow/docker-compose.yml`, a generated `.env` and a password file. `scripts/cum/tao_cau_hinh_airflow.sh` creates the `.env` from a template with a random JWT secret and Fernet key, the GID of the host's `docker` group, the absolute project path and the UID of the account that owns the project directory (`AIRFLOW_UID`); it writes the administrator password to `mat_khau.json` with permissions 600 and prints it once. The containers run with that UID and group 0, as the official Airflow compose file recommends: with the image's default UID 50000, the API server could not open the password file, which the authentication manager opens in append mode, and tasks could not write `common.zip` into the mounted project directory (@sec:issues).

Measurements on the master host led to a slim configuration that uses about 0.9 GB instead of almost 2 GB: one API server worker instead of four, at most six concurrently running tasks, one DAG-parsing process, and no triggerer, because no DAG uses deferrable operators (the triggerer can be enabled with a compose profile). The default pool is set to one slot at night so that at most one batch driver runs on the master at a time.

## Secrets and Shared Accounts

The laboratory accounts are shared with other students, so no credential that could reach outside the cluster is stored on a laboratory machine. The GitHub token and the Kaggle API key stay on the control laptop: code reaches the machines by `git push` over SSH, and the dataset is downloaded on the laptop (`chep_du_lieu.sh`, which passes the key to `curl` on standard input so that it never appears on a command line) and copied with `scp`. Generated files containing secrets — `ha_tang/*/.env`, `.env.rieng`, `mat_khau.json` — are listed in `.gitignore`.

## Code Distribution

`scripts/cum/ssh_tat_ca.sh` controls all machines from the laptop. It generates the SSH client configuration from the directory, copies the public key, runs a command on every machine sequentially or in parallel, runs a local script on each machine through standard input, and — with `--dong-bo-ma` — distributes the committed code. For distribution it initialises a Git repository on each machine if needed, sets `receive.denyCurrentBranch = updateInstead`, and pushes the current commit. Git then updates the working tree on the target machine, and refuses to do so if a file there was edited by hand, so local changes are never silently overwritten. Pushes are retried up to three times when the SSH connection drops, which happened frequently when the cluster was operated from outside the campus (@sec:issues). Because job code is mounted into the containers as a volume, distributing new code requires no image rebuild; a running streaming job picks it up at its next restart.
