# Overall evaluation, limitations and future work {#sec:dg}

## Evaluation against the acceptance criteria

Table: Status of the criteria (specification 3.11 and outline A.6) {#tab:nt w=7,43,50}
| # | Criterion | Status, evidence |
|---|---|---|
| 1 | Tuning table with ≥ 9 combinations, NDCG@10 | Met: 27 combinations (@fig:tuning) |
| 2 | ALS against 2 baselines, 4 metrics + coverage + novelty | Met: NDCG +1,237%. Coverage 6.47% when served, below 10% but with analysis and remedies (@tab:pp) |
| 3 | Three cold-start strategies, new-user demo | Met (@tab:cs) |
| 4–5 | Trending ≤ 90 seconds; loop web → Kafka → bronze → trending | Met: 51 seconds (@tab:dotre) |
| 6 | A/B with p-value and conclusion | Met: p = 0.015 (@tab:ab) |
| 7 | Reproduction with VERSION AS OF gives the same metrics | Met: deviation 0, twice |
| 8 | OPTIMIZE/ZORDER measurements | Met: 8.3 s → 0.98 s (@tab:zorder) |
| A.6.1 | Batch jobs, MLlib, streams running ≥ 30 minutes | Met: 3 streams running continuously |
| A.6.2 | MERGE, DESCRIBE HISTORY, VERSION AS OF, OPTIMIZE | Met: `04_delta.txt` |
| A.6.3 | Tables on HDFS + `du -h` | Met: `01_hdfs_du_h.txt` |
| A.6.4 | ≥ 3 screens, write-back to Delta | Met: 5 screens, 2 write paths |
| A.6.5 | ≥ 3 DAGs, retries, sla, branching/sensor | Met: 5 DAGs, Deadline Alerts |

## Limitations

- **Coverage below 10% when served.** 14.5% is reached only in the offline experiment with extra co-occurrence slots.
- **A/B based on simulated traffic.** The conclusion holds only under the assumptions of the click model.
- **Price and star rating are proxies.** Property 790 is anonymised; the star rating is derived from the purchase-to-view ratio.
- **The master machine is a weak point.** The master has only 7.4 GB of RAM yet holds the driver of every job; the ZeroTier network over the lab Wi-Fi sometimes has to go through a relay.
- **Web tests use a fake data store.** Two bugs showed up only when measuring on the cluster (@sec:web). They are fixed, but the web application's Delta access layer still has no automated test on Spark with Delta.
- **False alarms when there is no traffic.** When the producer is off, the monitoring DAG sees no new trending window, so it records an alert and calls a stream restart; the running stream is left untouched.
- **The novelty table lives on the driver.** The table is broadcast, and it will no longer fit when the number of products grows a hundredfold.

## Future work

- **Infrastructure.** Run drivers in cluster mode (YARN or Kubernetes) to take them off the master; replace the novelty table with a DataFrame broadcast join; move the recommendation table to a key–value store for the web; add Kafka partitions.
- **Model.** Try BPR, item-kNN and MinHash/LSH for long-tail products, bring the co-occurrence candidate source into serving, then run the A/B test with real traffic.
