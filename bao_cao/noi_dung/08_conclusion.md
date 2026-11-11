# Conclusion {#sec:conclusion}

## Summary of Results

The project delivered a complete recommender system for a simulated e-commerce marketplace on a cluster of six laboratory machines, covering every component of the specification: a Kafka producer that replays RetailRocket events with synthetic new users; three Structured Streaming jobs with checkpoints on HDFS; a Delta Lake lakehouse with bronze, silver, features and gold layers that uses MERGE, time travel, schema evolution, Change Data Feed, OPTIMIZE/Z-ORDER and partitioning; a nightly batch pipeline from cleaning to published recommendation lists; implicit-feedback ALS with a 27-combination grid, two baselines, three cold-start strategies and a price-filtered version 2; an A/B pipeline with impression logging, simulated traffic and two-proportion tests; five Airflow DAGs; and a web application with the five required screens. The system runs in Docker containers configured from a single cluster directory and is covered by 109 automated tests.

Against the acceptance criteria, the results on the real dataset are:

- the tuning table covers 27 combinations; the best ALS model reaches NDCG@10 = 0.0680, **+1,237 %** over the best-seller baseline and +43 % over the category baseline;
- coverage of the model is **3.44 %**, below the 10 % target; the analysis attributes it to popularity bias (99.2 % of slots in the 10 % most popular items) rather than a structural limit, and a novelty re-ranking deployed in production raises NDCG@10 to 0.0865 and coverage to 6.47 % simultaneously; offline, giving the last three slots to co-occurrence candidates raises coverage to 14.5 %, above the target, and NDCG@10 to 0.0892;
- after the schema evolution, the scheduled nightly run deployed model version 2 on its own; the price-range filter raises NDCG@10 from 0.0680 to 0.0694 and coverage from 3.44 % to 3.72 %, a small gain;
- the simulated A/B test with 350,160 impressions finds that blending 30 % trending items lowers CTR from 2.094 % to 1.978 % (p = 0.015), with no difference in conversion;
- Z-ORDER reduces the files read by a per-user lookup from 67 to 1.07 and the median latency 8.4 times relative to compaction alone;
- the reproduction DAG re-ran the selected experiment on Delta version 0 of the feature table with a deviation of 0.000000, after the source tables had evolved, and the deployed model on version 3 with a deviation of 0;
- two additional checks confirm the protocol: choosing the hyper-parameters and β on a separate validation period selects exactly the deployed configuration, which keeps +40 % (ALS) and +80 % (re-ranked) over the category baseline on held-out days, with an optimism of 0.0002 in NDCG@10; and testing the A/B difference with the user as the unit gives p = 0.037 (cluster-robust) and 0.029 (bootstrap).

On the live system, a click on the web page reached bronze about ten seconds after Kafka received it and the trending table after 51 seconds, within the 90-second target, and a user created on the spot received the brand-new-user strategy. All eight acceptance criteria have therefore been demonstrated on the cluster; what remains before the defence is the full rehearsal of the demonstration script.

## Limitations

- **Coverage below target in production.** No ALS configuration reaches 10 % coverage, because most training items have one or two interactions and weak latent vectors; the served list reaches 6.47 %. The co-occurrence mix that reaches 14.5 % has been evaluated offline only.
- **Evaluation protocol.** The main results choose the hyper-parameters, β and the candidate pool on the test month. A check on a separate validation period selected the same configuration with negligible optimism, but it covered 17 of the 27 combinations, a single split and not the pool size.
- **Simulated traffic.** The A/B conclusion holds only under the assumptions of the position-dependent click model, in which trending items receive no bonus; it says nothing about real shoppers. Impressions of the same user are correlated (design effect 1.36); the user-level tests keep the conclusion, with a p-value of about 0.03 instead of 0.015.
- **Proxy attributes.** Prices are anonymised relative values and star ratings are a proxy derived from the purchase-to-view ratio.
- **Single points of failure.** The NameNode, the Spark Master, Kafka (one broker) and all drivers run on single machines, and every driver shares the 7.4 GB of the master host.
- **Batch-only personalisation.** Personalised lists change once per night; only the trending block and the in-session cold-start lists react within seconds.

## Future Work

- **Deploy the co-occurrence slots**: add the mix of @sec:res-nguon (seven served slots, three co-occurrence slots) to the blending job before the A/B template, try four or five slots, and extend the ALS grid (rank 100, alpha 80); then repeat the A/B test with the new lists.
- **A complete validation protocol**: all 27 combinations plus rank 100 and alpha 80 on the validation period, the candidate pool size, and several rolling splits instead of one.
- **A sensitivity analysis of the A/B simulation** over the attractiveness of trending items, to find where group B ties group A, followed by a test on real traffic if possible.
- **Session-aware and incremental models**: folding in new interactions between nightly runs, or a sequence model for short sessions, which dominate RetailRocket.
- **High availability and capacity**: a dedicated orchestration host for Airflow and batch drivers, HDFS NameNode high availability, and a three-broker Kafka cluster.
- **Monitoring**: export Spark, Kafka and Airflow metrics to a time-series dashboard and alert on stream lag and data freshness instead of a log file.
