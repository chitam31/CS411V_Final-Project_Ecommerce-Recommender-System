# Conclusion {#sec:conclusion}

## Summary of Results

The project delivered a complete recommender system for a simulated e-commerce marketplace on a cluster of six laboratory machines, covering every component of the specification: a Kafka producer that replays RetailRocket events with synthetic new users; three Structured Streaming jobs with checkpoints on HDFS; a Delta Lake lakehouse with bronze, silver, features and gold layers that uses MERGE, time travel, schema evolution, Change Data Feed, OPTIMIZE/Z-ORDER and partitioning; a nightly batch pipeline from cleaning to published recommendation lists; implicit-feedback ALS with a 27-combination grid, two baselines, three cold-start strategies and a price-filtered version 2; an A/B pipeline with impression logging, simulated traffic and two-proportion tests; five Airflow DAGs; and a web application with the five required screens. The system runs in Docker containers configured from a single cluster directory and is covered by 90 automated tests.

Against the acceptance criteria, the results on the real dataset are:

- the tuning table covers 27 combinations; the best ALS model reaches NDCG@10 = 0.0680, **+1,237 %** over the best-seller baseline and +43 % over the category baseline;
- coverage of the model is **3.44 %**, below the 10 % target; the analysis attributes it to popularity bias (99.2 % of slots in the 10 % most popular items) rather than a structural limit, and a novelty re-ranking deployed in production raises NDCG@10 to 0.0865 and coverage to 6.47 % simultaneously;
- the simulated A/B test with 350,160 impressions finds that blending 30 % trending items lowers CTR from 2.094 % to 1.978 % (p = 0.015), with no difference in conversion;
- Z-ORDER reduces the files read by a per-user lookup from 67 to 1.07 and the median latency 8.4 times relative to compaction alone;
- the reproduction DAG re-ran the selected experiment on Delta version 0 of the feature table with a deviation of 0.000000, after the source tables had evolved.

On the live system, a click on the web page reached bronze about ten seconds after Kafka received it and the trending table after 51 seconds, within the 90-second target, and a user created on the spot received the brand-new-user strategy. All eight acceptance criteria have therefore been demonstrated on the cluster; what remains before the defence is the full rehearsal of the demonstration script.

## Limitations

- **Coverage below target.** No ALS configuration tried reaches 10 % coverage; most training items have one or two interactions and weak latent vectors.
- **Optimistic evaluation protocol.** Hyper-parameters, β and the candidate pool were chosen on the test month; a separate validation period would give unbiased estimates.
- **Simulated traffic.** The A/B conclusion holds only under the assumptions of the position-dependent click model, in which trending items receive no bonus; it says nothing about real shoppers. The impression-level z-test ignores correlation between impressions of the same user.
- **Proxy attributes.** Prices are anonymised relative values and star ratings are a proxy derived from the purchase-to-view ratio.
- **Single points of failure.** The NameNode, the Spark Master, Kafka (one broker) and all drivers run on single machines, and every driver shares the 7.4 GB of the master host.
- **Batch-only personalisation.** Personalised lists change once per night; only the trending block and the in-session cold-start lists react within seconds.

## Future Work

- **Raise coverage with more candidate sources**: category-based and item-to-item candidates merged with ALS candidates before re-ranking, and an extended grid (rank 100, alpha 80), since coverage increases with both.
- **A stricter evaluation protocol** with a validation period for all selection decisions, and user-level bootstrap confidence intervals for the A/B test.
- **A sensitivity analysis of the A/B simulation** over the attractiveness of trending items, to find where group B ties group A, followed by a test on real traffic if possible.
- **Session-aware and incremental models**: folding in new interactions between nightly runs, or a sequence model for short sessions, which dominate RetailRocket.
- **High availability and capacity**: a dedicated orchestration host for Airflow and batch drivers, HDFS NameNode high availability, and a three-broker Kafka cluster.
- **Monitoring**: export Spark, Kafka and Airflow metrics to a time-series dashboard and alert on stream lag and data freshness instead of a log file.
