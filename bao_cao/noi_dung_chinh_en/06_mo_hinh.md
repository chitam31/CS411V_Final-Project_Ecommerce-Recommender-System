# Machine learning model {#sec:ml}

## Features and algorithm

**Data split.** By time, with 19 August 2015 as the cut-off day:

- train: the first 4 months, 179,999 users with at least 3 interactions, 746,350 pairs;
- test: the last 30 days, 9,467 users who interacted with known products;
- the answer for each user: the set of products they interacted with in the last month.

**Interaction score.** The score of each pair is the sum of event weights (view 1, add-to-cart 3, purchase 5) multiplied by the decay factor `exp(−0.01·Δdays)`. The reference day is the cut-off day, so no future information leaks into training.

**Model.** ALS with `implicitPrefs = true` (@eq:als) treats the score *r* as the confidence *c = 1 + α·r* of a binary preference and fits every cell, empty cells included. Evaluation uses `coldStartStrategy = "drop"`.

$$als$$ {#eq:als}

Evaluation metrics: Precision@10, Recall@10, NDCG@10 (@eq:ndcg) and MAP@10, matching Spark's `RankingMetrics` (verified by a cross-check test). Two more metrics measure bias:

- coverage: the share of products in the training catalogue that appear in at least one list;
- novelty: the mean of −log₂ of the share of users who have interacted with the recommended product.

$$ndcg$$ {#eq:ndcg}

## Tuning and results against the baselines

The full grid has 27 combinations (rank ∈ {10, 30, 50}, regParam ∈ {0.01, 0.1, 1.0}, alpha ∈ {1, 10, 40}) and takes 78 minutes. NDCG@10 rises with rank and with alpha. The best combination is rank 50, regParam 1.0, alpha 40, with NDCG@10 = 0.0680 (@fig:tuning).

A separate validation period (the first 15 days of the test month) selects the same configuration, so choosing hyperparameters on the test month makes the figures only negligibly optimistic.

![NDCG@10 over the tuning grid, one heat map per rank](hinh/c01_tuning.png){#fig:tuning w=14}

Table: Comparison on the test month (9,467 users, K = 10) {#tab:pp w=34,9,9,10,9,10,9,10}
| Method | P@10 | R@10 | NDCG@10 | MAP@10 | Coverage | Novelty | Products |
|---|---|---|---|---|---|---|---|
| Baseline 1: global best-sellers | 0.0017 | 0.0066 | 0.0051 | 0.0036 | 0.01% | 8.91 | 10 |
| Baseline 2: best-sellers within category | 0.0122 | 0.0706 | 0.0475 | 0.0352 | 5.28% | 11.88 | 6,660 |
| ALS (rank 50, reg 1.0, α 40) | 0.0161 | 0.0921 | 0.0680 | 0.0531 | 3.44% | 10.86 | 4,346 |
| **Served: ALS + re-ranking β = 1, 200 candidates** | **0.0182** | **0.1089** | **0.0865** | **0.0716** | **6.47%** | 12.17 | 8,162 |

Against baseline 1, the NDCG@10 of ALS is **1,237%** higher, far above the 30% threshold; against baseline 2 it is 43% higher. Model version 2, built after schema evolution added prices to silver, filters candidates to the price range the user is used to and raises NDCG by a further 2.1%. The nightly DAG deployed this model on its own.

## Popularity bias

The coverage of 3.44%, below the 10% threshold, is not a structural limit: 10 slots × 9,467 users over 126,230 products allow up to 75%. The cause is that ALS puts **99.2%** of all slots on the top 10% most popular products.

The remedy is re-ranking: over-fetch 200 candidates, then rank them by the normalised ALS score plus β × the normalised novelty. With β = 1, both accuracy (NDCG +27%) and diversity (coverage +88%, the share of slots in N1 down to 80.8%) improve.

No configuration reaches 10%, because most products have only one or two interactions and near-zero vectors. Adding three co-occurrence slots (tested offline) reaches 14.5%.

## Error analysis

- **Coverage and novelty.** Plain ALS trails baseline 2 (3.44% against 5.28%, 10.86 against 11.88) because of the bias above; the served version with re-ranking overtakes baseline 2 on coverage.
- **By user group.** `jobs/kiem_tra/phan_tich_loi.py` (run on the cluster on 16 November) computes each of the 9,467 users' NDCG@10 for ALS and both baselines and groups users by training interactions, popularity of the test products and categories viewed (@tab:loi; full table and chart in the full report, section 6.6). The initial hypothesis was that ALS loses to baseline 2 for users with few interactions and for users who view only one category.

Table: Condensed error analysis; "ALS loses" is the share of users whose ALS NDCG is below baseline 2 {#tab:loi w=34,13,13,13,13,14}
| Group | Users | ALS | Baseline 2 | ALS loses | Both = 0 |
|---|---|---|---|---|---|
| All | 9,467 | 0.0680 | 0.0475 | 3.9% | 84.8% |
| 3–4 training interactions | 6,401 | 0.0727 | 0.0504 | 3.4% | 85.7% |
| ≥ 50 training interactions | 126 | 0.0644 | 0.0499 | 13.5% | 57.9% |
| Test products all long-tail | 3,865 | 0.0123 | 0.0080 | 1.3% | 96.6% |
| Test products ≥ 50% popular | 5,061 | 0.1139 | 0.0802 | 5.6% | 76.4% |
| Viewed 1 category | 2,823 | 0.1228 | 0.0882 | 5.2% | 76.7% |
| Viewed 4–7 categories | 1,743 | 0.0368 | 0.0252 | 2.8% | 90.1% |

Conclusions:

- **Both initial hypotheses are wrong.** ALS beats baseline 2 in **every** group, by about 30–45% at every interaction level, and by 44% in the 3–4 interaction group (68% of users). Single-category users are the easiest case for both methods; users spread over 2–7 categories are the hardest.
- **The main source of error is the long tail.** 41% of users interact only with long-tail products in the test month; their ALS NDCG is only 1/9 of the "head" group's, and 96.6% of them get 0 from both methods, matching ALS putting 99.2% of slots on the top 10% of products.
- **Direction for improvement.** The long tail needs its own candidate sources (co-occurrence, content), not further ALS tuning.

- **New users, new products.** ALS cannot score them. The system uses three cold-start strategies (@tab:cs).

Table: Three cold-start strategies {#tab:cs w=26,74}
| Case | Strategy |
|---|---|
| Brand-new user | Top trending products of the last 15 minutes |
| User with < 5 interactions | Best-sellers in up to 3 categories already viewed, interleaved 50/50 with trending |
| New product (not in ALS) | New products in the user's main category, inserted into the last 20% of positions (slots 9–10) |

## A/B test and reproducibility

Group A receives plain ALS; group B receives ALS blended with 30% trending products. Users are assigned by the MD5 of their ID, so the assignment is stable across visits. Traffic is simulated with a position- and relevance-dependent click model for the 8,592 users who have an ALS list (@tab:ab).

Table: A/B results pooled over 7 days (simulated traffic, no advantage given to trending products) {#tab:ab w=26,16,12,12,12,22}
| Group | Impressions | Clicks | CTR | Purchases | p-value |
|---|---|---|---|---|---|
| A: ALS | 175,960 | 3,685 | 2.094% | 412 | CTR: 0.015 |
| B: ALS + 30% trending | 174,200 | 3,446 | 1.978% | 417 | conversion: 0.75 |

**Interpretation.** For CTR, z = −2.43 and p = 0.015: B is about 5.5% below A, with a sample larger than the required 76,972 per group. User-level tests agree (p = 0.037 with cluster-robust standard errors, p = 0.029 with the bootstrap). There is not enough evidence of a difference in conversion. The conclusion holds only under the assumptions of the simulation.

**Reproducibility.** DAG 5 reads `features.ma_tran_tuong_tac` with `VERSION AS OF`, retrains, re-evaluates and compares with the history. Both runs (version 0 on 10 November, and the served model at version 3 on 11 November) give **a deviation of 0**, a meaningful test since silver had by then changed its schema and bronze had received another 857 thousand events. Every row of `gold.ket_qua_ab` stores the log version it read; the Reproduce screen recomputes exactly that version, again with a deviation of 0.
