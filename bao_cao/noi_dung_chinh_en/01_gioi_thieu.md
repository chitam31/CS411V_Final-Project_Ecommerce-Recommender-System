# Problem and objectives {#sec:gt}

The product team of an e-commerce marketplace (1.4 million users, 235,000 products) needs four things:

- personalised recommendations on the home page;
- related-product recommendations on the product page;
- a "Trending now" block over a 15-minute window;
- an A/B test, reproducible when challenged, that shows which block yields the higher click-through rate (CTR).

The problem has three challenges:

- **Implicit feedback.** Only view, add-to-cart and purchase events; no ratings.
- **Cold start.** Brand-new users, users with few interactions, new products.
- **Popularity bias.** A model easily recommends only best-sellers.

@tab:muc-tieu lists the measurable objectives from the topic specification (sections 3.6, 3.11) and the course outline (section A.6).

Table: Objectives and acceptance criteria {#tab:muc-tieu w=22,48,30}
| Area | Criterion | Result (chapter) |
|---|---|---|
| Model | Implicit ALS, tuned over ≥ 9 combinations; NDCG@10 ≥ 30% above the best-seller baseline; coverage ≥ 10% | NDCG +1,237%; coverage 6.47% when served, with analysis (@sec:ml) |
| Cold start | 3 strategies: new users, < 5 interactions, new products | Met (@sec:ml) |
| Streaming | Trending ≤ 90 s after a click; loop web → Kafka → bronze → trending | 51 s (@sec:spark) |
| Experiment | A/B with p-value and conclusion; reproduced with `VERSION AS OF` | p = 0.015; deviation 0 (@sec:ml) |
| Lakehouse | MERGE, DESCRIBE HISTORY, time travel, schema evolution, CDF, OPTIMIZE/Z-ORDER with measurements | Met (@sec:lake, @sec:spark) |
| Orchestration | ≥ 3 DAGs on different schedules, retries, sla, branching/sensor, backfill | 5 DAGs, Deadline Alerts (@sec:af) |
| Web | ≥ 3 screens, write-back to Delta, response < 3 s | 5 screens, 2 write-back paths (@sec:web) |

**Scope.** No user accounts, payments or deep-learning models; ALS is retrained in batch every night. Most A/B traffic is simulated with a position-dependent click model, as section 3.10 of the specification allows; every simulated row is labelled in `nguon_traffic`.
