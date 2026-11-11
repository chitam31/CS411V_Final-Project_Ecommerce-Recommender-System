# Experimental Results {#sec:results}

All figures in this chapter were produced on the cluster described in @sec:infra with the real RetailRocket data, on 10 November 2026, and exported from the gold tables with `jobs/kiem_tra/xuat_ket_qua.py`. The main run has the id `r20261110T075240`.

## Environment and Dataset {#sec:res-env}

The first end-to-end pipeline (eight steps of `chay_lan_dau.sh`, full 27-combination grid) took 2 hours 8 minutes on five workers with 34 cores; tuning accounted for 78.4 minutes. @tab:du-lieu summarises the data at each stage.

Table: Data volumes at each stage of the pipeline {#tab:du-lieu w=55,45}
| Quantity | Value |
|---|---|
| Events replayed through Kafka into bronze | 2,894,238 (2,756,101 original + 138,137 from 48,376 synthetic new users, 4.8 %) |
| Rows in `silver.tuong_tac` after cleaning | 2,882,479 over 139 days |
| Cut-off date / end date of the test month | 2015-08-19 / 2015-09-18 (30 days) |
| Users kept in the matrix (≥ 3 training interactions) | 179,999 |
| Training user–item pairs / density | 746,350 / about 1.8 × 10^{−5} |
| Test user–item pairs / users evaluated | 32,804 / 9,467 |
| Items in training (coverage denominator) / items in the catalogue | 126,230 / 417,053 |
| Files of `silver.tuong_tac` after the small-file fix | 140 (one per date) |

The matrix is extremely sparse, and only 9,467 of the 179,999 training users have test interactions with known items: most RetailRocket visitors appear for a single short visit. This shapes every result below — absolute metric values are low for all methods, and the test set contains many items that are rare in training.

## Hyper-parameter Tuning {#sec:res-tuning}

@tab:tuning lists the 27 combinations of the full grid, ordered as they were run, and @fig:tuning shows NDCG@10 as one heat map per rank. The selected model is **rank = 50, regParam = 1.0, alpha = 40** (bold), with NDCG@10 = 0.0680. Training plus evaluation took about 75 seconds per combination at rank 10, 160 seconds at rank 30 and 290 seconds at rank 50.

Table: Tuning results of run r20261110T075240 (27 combinations, test month) {#tab:tuning w=7,10,7,9,9,11,10,10,9,9}
| rank | regParam | alpha | P@10 | R@10 | NDCG@10 | MAP@10 | Coverage | Novelty | Seconds |
|---|---|---|---|---|---|---|---|---|---|
| 10 | 0.01 | 1 | 0.0051 | 0.0217 | 0.0158 | 0.0111 | 0.0014 | 9.574 | 81.4 |
| 10 | 0.01 | 10 | 0.0063 | 0.0297 | 0.0213 | 0.0152 | 0.0031 | 9.782 | 74.6 |
| 10 | 0.01 | 40 | 0.0065 | 0.0331 | 0.0228 | 0.0163 | 0.0050 | 9.857 | 75.5 |
| 10 | 0.1 | 1 | 0.0049 | 0.0199 | 0.0148 | 0.0104 | 0.0021 | 10.087 | 73.1 |
| 10 | 0.1 | 10 | 0.0064 | 0.0308 | 0.0221 | 0.0159 | 0.0030 | 9.780 | 73.1 |
| 10 | 0.1 | 40 | 0.0065 | 0.0326 | 0.0233 | 0.0170 | 0.0051 | 9.872 | 72.3 |
| 10 | 1.0 | 1 | 0.0031 | 0.0154 | 0.0121 | 0.0095 | 0.0019 | 12.554 | 75.7 |
| 10 | 1.0 | 10 | 0.0067 | 0.0328 | 0.0234 | 0.0168 | 0.0038 | 10.029 | 79.7 |
| 10 | 1.0 | 40 | 0.0068 | 0.0344 | 0.0241 | 0.0174 | 0.0053 | 9.907 | 73.0 |
| 30 | 0.01 | 1 | 0.0076 | 0.0335 | 0.0252 | 0.0184 | 0.0045 | 9.999 | 169.3 |
| 30 | 0.01 | 10 | 0.0104 | 0.0547 | 0.0396 | 0.0295 | 0.0131 | 10.329 | 165.5 |
| 30 | 0.01 | 40 | 0.0120 | 0.0680 | 0.0493 | 0.0377 | 0.0198 | 10.470 | 165.7 |
| 30 | 0.1 | 1 | 0.0074 | 0.0335 | 0.0250 | 0.0182 | 0.0060 | 10.231 | 173.2 |
| 30 | 0.1 | 10 | 0.0107 | 0.0554 | 0.0409 | 0.0308 | 0.0130 | 10.348 | 153.4 |
| 30 | 0.1 | 40 | 0.0123 | 0.0685 | 0.0490 | 0.0371 | 0.0202 | 10.510 | 150.1 |
| 30 | 1.0 | 1 | 0.0057 | 0.0291 | 0.0227 | 0.0178 | 0.0059 | 12.259 | 168.7 |
| 30 | 1.0 | 10 | 0.0114 | 0.0588 | 0.0454 | 0.0352 | 0.0155 | 10.554 | 152.9 |
| 30 | 1.0 | 40 | 0.0126 | 0.0694 | 0.0505 | 0.0385 | 0.0209 | 10.562 | 152.9 |
| 50 | 0.01 | 1 | 0.0090 | 0.0419 | 0.0313 | 0.0231 | 0.0075 | 10.205 | 262.6 |
| 50 | 0.01 | 10 | 0.0129 | 0.0699 | 0.0526 | 0.0408 | 0.0217 | 10.591 | 259.6 |
| 50 | 0.01 | 40 | 0.0156 | 0.0906 | 0.0668 | 0.0524 | 0.0323 | 10.769 | 260.6 |
| 50 | 0.1 | 1 | 0.0093 | 0.0442 | 0.0328 | 0.0243 | 0.0098 | 10.381 | 274.2 |
| 50 | 0.1 | 10 | 0.0132 | 0.0706 | 0.0531 | 0.0410 | 0.0214 | 10.623 | 276.4 |
| 50 | 0.1 | 40 | 0.0157 | 0.0902 | 0.0662 | 0.0516 | 0.0331 | 10.800 | 290.5 |
| 50 | 1.0 | 1 | 0.0074 | 0.0391 | 0.0309 | 0.0247 | 0.0094 | 12.182 | 296.9 |
| 50 | 1.0 | 10 | 0.0139 | 0.0738 | 0.0574 | 0.0453 | 0.0249 | 10.824 | 245.1 |
| **50** | **1.0** | **40** | **0.0161** | **0.0921** | **0.0680** | **0.0531** | **0.0344** | **10.865** | **410.1** |

![NDCG@10 over the tuning grid, one heat map per rank](hinh/c01_tuning.png){#fig:tuning w=15.5}

Three observations follow from the grid.

- **NDCG@10 grows monotonically with rank and with alpha.** The best value per rank rises from 0.024 to 0.050 to 0.068, and for a fixed rank and regParam, alpha = 40 is always best. With implicit feedback, a large alpha raises the confidence of observed pairs — especially purchases with weight 5 — far above the empty cells, so the model extracts more signal from very sparse data. Higher rank gives the capacity to represent more niche preferences.
- **regParam matters little when alpha is large, but hurts when alpha is small.** At rank 50 and alpha 40 the three values give 0.0668, 0.0662 and 0.0680. At alpha = 1, regParam = 1.0 gives the lowest NDCG at every rank together with an abnormally high novelty (12.2–12.6): the factors are shrunk towards zero and the recommendations become close to random rare items.
- **The optimum lies on the edge of the grid** for rank and alpha. The true optimum may lie outside the grid; the natural next step is to add rank 100 and alpha 80. Cost grows roughly linearly with rank.

The hyper-parameters were selected on the test month itself, without a separate validation period (@sec:scope), so the reported values are slightly optimistic. @sec:res-val repeats the selection with a separate validation period — the first 15 days of the test month — and reports on the remaining days.

## ALS Versus the Baselines {#sec:res-baselines}

@tab:phuong-phap compares the selected model with the two mandatory baselines, the two re-ranking variants measured by the evaluation job, and the configuration deployed for serving (@sec:impl-blend). @fig:phuong-phap plots NDCG@10 and coverage.

Table: Comparison of methods on the test month (9,467 users, K = 10) {#tab:phuong-phap w=27,8,8,9,10,9,11,8,10}
| Method | P@10 | R@10 | NDCG@10 | MAP@10 | Cov. (train) | Cov. (catalogue) | Novelty | Distinct items |
|---|---|---|---|---|---|---|---|---|
| Baseline 1: global best sellers | 0.0017 | 0.0066 | 0.0051 | 0.0036 | 0.01 % | 0.002 % | 8.91 | 10 |
| Baseline 2: best sellers of the user's category | 0.0122 | 0.0706 | 0.0475 | 0.0352 | 5.28 % | 1.60 % | 11.88 | 6,660 |
| ALS (rank 50, reg 1.0, alpha 40) | 0.0161 | 0.0921 | 0.0680 | 0.0531 | 3.44 % | 1.04 % | 10.86 | 4,346 |
| ALS + re-ranking, β = 0.1 (50 candidates) | 0.0166 | 0.0952 | 0.0702 | 0.0549 | 3.65 % | 1.10 % | 10.93 | 4,607 |
| ALS + re-ranking, β = 0.3 (50 candidates) | 0.0173 | 0.1001 | 0.0746 | 0.0589 | 4.14 % | 1.25 % | 11.09 | 5,221 |
| **Served: ALS + re-ranking, β = 1.0, 200 candidates** | **0.0182** | **0.1089** | **0.0865** | **0.0716** | **6.47 %** | 1.96 % | 12.17 | 8,162 |

![NDCG@10 and coverage of the baselines, ALS and the re-ranked variants](hinh/c02_phuong_phap.png){#fig:phuong-phap w=15.5}

- **Accuracy threshold: met by a wide margin.** The NDCG@10 of ALS is 13.4 times that of the global best sellers, an uplift of **+1,237 %** against the required +30 %. The global best-seller list is a weak baseline on this dataset because the ten most popular items rarely appear in a given user's test month. The category baseline is much stronger (0.0475): RetailRocket visitors tend to stay within a category. ALS still beats it by **+43 %** on NDCG@10 and on all four ranking metrics.
- **Coverage threshold: not met.** ALS covers 3.44 % of the training items, below the 10 % target; `dat_nguong` is therefore false. Because this was the first training run, `cai_thien` was true and the model was deployed — the two flags are deliberately independent (@sec:impl-train). Interestingly, the category baseline covers more items than ALS (5.28 %), because it recommends the best sellers of many different categories.
- **The served configuration** improves on pure ALS in every column: NDCG@10 +27 % (+1,601 % over baseline 1) and coverage +88 %, still below 10 %. The same values were obtained independently by the evaluation job and by the re-ranking sweep below, which cross-checks both implementations.

## Popularity Bias and Coverage {#sec:res-coverage}

The specification accepts a coverage below 10 % as a valid result *if it is analysed*: the cause must be explained and at least one de-biasing method must be tried. This section provides both.

**The low coverage is not a structural limit.** Ten recommendations for each of the 9,467 test users give 94,670 slots for 126,230 items, so the structural ceiling of coverage is 75 %. ALS uses only 4,346 distinct items: the slots exist, but they are filled with the same items.

**It is popularity bias.** @fig:pho-bien shows how the recommended slots are distributed over popularity groups. ALS places **99.2 %** of its slots in N1, the 10 % most popular items; the global best-seller list places 100 % there by construction, and even the category baseline places 86.5 %. This is the typical behaviour of matrix factorisation on sparse data: items with few interactions receive weak latent vectors (close to zero), so their scores rarely reach a user's top 10.

![Distribution of recommendation slots over popularity groups (N1 = 10 % most popular items)](hinh/c03_pho_bien.png){#fig:pho-bien w=15.5}

**De-biasing by novelty re-ranking.** The re-ranking of @eq:rerank was swept over β and over the size of the candidate pool, on the same model and the same feature version (`jobs/kiem_tra/thu_xep_lai.py`). @tab:xep-lai and @fig:xep-lai show the results.

Table: Novelty re-ranking sweep (same model and features) {#tab:xep-lai w=10,10,10,10,11,10,12,12,15}
| Cand. | β | P@10 | R@10 | NDCG@10 | MAP@10 | Coverage | Distinct items | Slots in N1 |
|---|---|---|---|---|---|---|---|---|
| 50 | 0 (ALS) | 0.0161 | 0.0921 | 0.0680 | 0.0531 | 3.44 % | 4,346 | 99.2 % |
| 50 | 0.3 | 0.0173 | 0.1001 | 0.0746 | 0.0589 | 4.14 % | 5,221 | 98.3 % |
| 50 | 0.5 | 0.0179 | 0.1037 | 0.0797 | 0.0642 | 4.65 % | 5,875 | 97.4 % |
| 50 | 1.0 | 0.0180 | 0.1067 | 0.0854 | 0.0709 | 5.67 % | 7,152 | 94.7 % |
| 50 | 2.0 | 0.0148 | 0.0892 | 0.0683 | 0.0557 | 6.30 % | 7,950 | 92.7 % |
| 200 | 0.5 | 0.0178 | 0.1037 | 0.0789 | 0.0633 | 4.74 % | 5,977 | 96.0 % |
| **200** | **1.0** | **0.0182** | **0.1089** | **0.0865** | **0.0716** | **6.47 %** | **8,162** | **80.8 %** |
| 200 | 2.0 | 0.0118 | 0.0753 | 0.0518 | 0.0402 | 7.21 % | 9,099 | 47.5 % |

![Accuracy–coverage trade-off of novelty re-ranking](hinh/c04_xep_lai.png){#fig:xep-lai w=13}

- **Up to β = 1.0, re-ranking improves accuracy and diversity together.** With 200 candidates and β = 1.0, NDCG@10 rises by 27 %, coverage by 88 %, and the share of slots in N1 falls from 99.2 % to 80.8 % (N2 11.2 %, N3 4.3 %, N4 2.0 %, N5–N10 1.9 %). The test month of RetailRocket contains many items that are rare in training, so promoting less popular candidates makes lists both more diverse and more accurate.
- **Beyond that, the usual trade-off appears.** At β = 2.0 the lists are much more diverse (N1 47.5 %, coverage 7.21 %) but NDCG drops 24 % below pure ALS — still above both baselines.
- **A larger pool helps only with a strong enough β.** With small β, items outside the top 50 never move up; from β = 1.0, the 200-candidate pool gives clearly better results.
- **No configuration reaches 10 % coverage** (maximum 7.21 %). Most of the 126,230 training items have only one or two interactions; their vectors are close to zero and they never enter the top 200 of any user. Exceeding 10 % requires candidate sources other than ALS — category-based candidates (the category baseline alone reaches 5.28 %), new items (already given 20 % of the visible slots by the blending step), or a larger grid (coverage increases with rank and alpha). @sec:res-nguon tests the first idea offline: three co-occurrence slots reach 14.5 %.
- β and the pool size were selected on the test month. @sec:res-val chooses β again on a separate validation period and obtains the same value, β = 1.0; the pool size was not re-examined.

**Coverage of the lists actually served.** The coverage above concerns the top-10 ALS lists of the 9,467 test users. Measured on the whole of `gold.goi_y_nguoi_dung` after deployment of the re-ranked configuration — every user, all twenty positions, every source — the system shows 15,582 distinct products (@tab:phu-phuc-vu), that is **12.3 %** of the training items (3.7 % of the catalogue). This exceeds 10 % but measures something different: the coverage of the whole system including non-personalised blocks, not the coverage of the model to which the threshold of the specification refers. The report therefore states both and does not claim that the model threshold is met. At the time of this measurement the trending stream had not yet been started, so the trending slots used the fallback list of 19 items most viewed in the last 24 hours; with live trending windows that block changes every few minutes.

Table: Distinct products in the served recommendation table, by source {#tab:phu-phuc-vu w=50,25,25}
| Source | Slots | Distinct products |
|---|---|---|
| Trending (fallback: most viewed in 24 h) | 2,599,964 | 19 |
| Best sellers by category (users with few interactions) | 2,577,372 | 9,927 |
| Re-ranked ALS (8,592 active users) | 123,524 | 8,612 |
| **Total (265,043 users, 5,300,860 rows)** | | **15,582** |

## Model Version 2 (Price-Range Filter) {#sec:res-v2}

The schema evolution ran on 10 November at 23:12–23:18: `silver.tuong_tac` moved from version 0 to version 2 (version 1 adds the two columns, version 2 fills them), while version 0 remains readable with the original seven columns. The daily DAG started at 23:21 rebuilt the features from the evolved silver table, which switches the evaluation to model version 2 with the nine-combination grid.

That night's run kept the previous lists because its grid could not contain the served configuration (issue 23, @sec:issues). The fix reached the master at 03:50 on 11 November, and the next two runs of DAG 1 both deployed model version 2:

- **The scheduled run of 02:00** waited on its sensor, which saw new data at 05:22: the clicks of the closed-loop measurement (@sec:res-streaming) had been written to bronze. The whole pipeline then ran without intervention — cleaning, matrix, tuning, evaluation — and `ghi_gold` published model version 2 at 06:07 (run `r20261110T222242`, features version 2). A click on the web page had thus travelled through both paths of the architecture, the streaming path within a minute and the batch path into a new model.
- **A manual run** (`bo_qua_cho_du_lieu`, queued at 04:05 behind the scheduled run because `max_active_runs = 1`) started at 06:09 and finished at 06:52 (run `r20261110T230924`). It rebuilt the features from silver version 10 (features version 3), tuned ten combinations in 20.7 minutes — the nine of the minimal grid plus the served configuration — and evaluated the best one, rank 50, regParam 1.0, alpha 40, with model version 2. NDCG@10 = 0.0680 equalled that of the serving model, so `cai_thien` was true and the lists were published again as `als_v2_r20261110T230924`. @tab:v2 reports this run, the latest one.

Table: Model version 2 against plain ALS on the same model and feature version (run r20261110T230924, 9,467 test users) {#tab:v2 w=24,8,8,12,11,10,10,17}
| Method | P@10 | R@10 | NDCG@10 | MAP@10 | Coverage | Novelty | Distinct items |
|---|---|---|---|---|---|---|---|
| ALS (version 1 ranking) | 0.0161 | 0.0921 | 0.0680 | 0.0531 | 3.44 % | 10.86 | 4,346 |
| **Model v2: ALS + price-range filter** | **0.0165** | **0.0943** | **0.0694** | **0.0541** | **3.72 %** | **10.91** | **4,699** |
| Relative change | +2.5 % | +2.4 % | +2.1 % | +1.9 % | +8.1 % | +0.4 % | +8.1 % |

- **The deployment gate works.** With the served configuration in the grid, the new model is compared with the old one under the same hyperparameters, and the nightly pipeline can publish again. The appended combination was the best of the ten; the nine alpha = 10 combinations reproduced the values of the night before to four decimals (best 0.0574).
- **Same data, same model.** Features version 3 was built the next morning, about 22 hours after version 0, from a silver table that had gone through schema evolution and a second replay of 857,072 events, yet plain ALS gives exactly the figures of run `r20261110T075240` (@tab:phuong-phap): 179,999 training users, 9,467 test users and NDCG@10 = 0.0680. Replayed events are removed by content deduplication and web events are excluded from the matrix, so the matrix and the split are unchanged and the seeded ALS fits the same model — an independent confirmation of reproducibility across table versions, in addition to the time-travel test of @sec:res-repro.
- **The price filter helps a little.** Removing candidates outside the user's price range and moving the next in-range items up raises every accuracy metric by about 2 % and coverage by 8 %, the same gain as on the alpha = 10 model the night before (+2.3 %). The effect is an order of magnitude smaller than that of novelty re-ranking (+27 %), it was not tested for significance, and it leaves popularity bias unchanged (99.1 % of the slots in N1 against 99.2 %).
- **What is served.** In production, model version 2 is the re-ranked list (200 candidates, β = 1.0, forty items kept) followed by the price filter in `tron_goi_y`. The evaluation measures the filter on plain ALS lists, and the deployment rule keeps comparing plain ALS so that successive versions remain comparable; the combination of re-ranking and price filter was not measured separately.

The model-quality screen of the web application (@fig:mo-hinh-web) shows the state after deployment: the latest model and its metrics, and the history of the five evaluations recorded in `gold.lich_su_huan_luyen` — the first run and its re-evaluation with the re-ranked serving configuration, the night run that kept the old model (`r20261110T162756`, NDCG@10 = 0.0574), and the two runs of 11 November that deployed version 2.

![Model-quality screen after deployment of model version 2: metrics of every method and the history of the five evaluations (times in UTC)](hinh/s04_mo_hinh_web.png){#fig:mo-hinh-web w=12.5}

**The served table after deployment.** Both deployments blended the lists while the producer was stopped, so the newest trending window held only the test product: every stored list received one trending product and the remaining trending slots fell back to category best sellers, which inflated the distinct products of the table to 22,011 (issue 29). After the fix, `tron_goi_y` and `ghi_gold` were re-run for the same model at 10:15 (gold version 14; 5,264,440 rows updated, 36,176 inserted). @tab:phu-phuc-vu-v2 compares the result with the version 1 table of @tab:phu-phuc-vu: the price filter, applied to forty re-ranked candidates, brings 7 % more distinct products into the ALS slots, and the table as a whole covers 16,001 products, 12.7 % of the training items (3.8 % of the catalogue).

Table: Distinct products in the served table, version 1 (10 November) and version 2 (11 November) {#tab:phu-phuc-vu-v2 w=40,15,15,15,15}
| Source | Slots v1 | Products v1 | Slots v2 | Products v2 |
|---|---|---|---|---|
| Trending (mostly the 24 h most viewed) | 2,599,964 | 19 | 2,600,580 | 19 |
| Best sellers by category | 2,577,372 | 9,927 | 2,577,743 | 9,821 |
| ALS (8,592 active users) | 123,524 | 8,612 | 122,293 | 9,237 |
| **Total (265,043 users)** | **5,300,860** | **15,582** | **5,300,616** | **16,001** |

## A/B Test {#sec:res-ab}

**A first, under-powered test.** The default simulation of the first run (5,000 users taken in hash order, seven days) produced only about 3,000 ALS impressions per group, because only about 3 % of all users have ALS recommendations and the test counts only ALS impressions. The pooled test gave p = 0.77: the sample was about 25 times too small to detect a 10 % relative difference.

**The full simulation.** The simulation was rerun for all 8,592 users who have ALS lists (option `--chi-als`, seed 7): 343,680 impressions and 7,008 clicks over seven days. @tab:ab and @fig:ab give the pooled result over the whole period (Change Data Feed up to data version 2), the primary analysis defined before looking at the data.

Table: Pooled A/B result over seven days (simulated traffic, no bonus for trending items) {#tab:ab w=24,14,9,10,12,13,18}
| Group | Impressions | Clicks | CTR | Purchases | Conversion | p-value |
|---|---|---|---|---|---|---|
| A: ALS only | 175,960 | 3,685 | 2.094 % | 412 | 0.234 % | CTR 0.015 |
| B: ALS + 30 % trending | 174,200 | 3,446 | 1.978 % | 417 | 0.239 % | conversion 0.75 |

![CTR and conversion per group with 95 % confidence intervals](hinh/c06_ab.png){#fig:ab w=14}

- **CTR:** z = −2.43, **p = 0.015**. Group B has a CTR about 5.5 % lower (relative) than group A, a difference significant at the 5 % level. The required sample to detect a 10 % relative lift is 76,972 impressions per group, so the sample is sufficient.
- **Conversion:** p = 0.75; no difference can be claimed.
- **Daily tests are all non-significant** (p from 0.07 to 0.85): each day has about 25,000 impressions per group, whereas detecting a 5.5 % difference needs about 250,000. The daily chart on the dashboard is for monitoring only; drawing conclusions from it would be "peeking" and multiple testing.
- **Interpretation.** In the simulation, the click probability depends on whether the item belongs to the items the user actually interacted with in the test month, and trending items receive no bonus. Replacing 30 % of personalised ALS slots with generic trending items (in this run, the fallback list, because the trending stream had not been started) therefore reduces the number of relevant slots, and B loses to A. The conclusion holds only under the assumptions of the simulation — 100 % of the traffic is simulated and labelled as such — and is not evidence about real shoppers. A sensitivity analysis that gives trending items an attractiveness bonus (`--tang-thinh-hanh`) would find the level at which B ties A.
- **Unit of analysis.** Impressions of the same user are correlated, so an impression-level z-test may understate the p-value. The z-test is kept as the primary analysis because the specification requires it, and @sec:res-ab-user repeats the test with the user as the unit: the conclusion holds (p = 0.037 with cluster-robust standard errors, p = 0.029 by user bootstrap).
- These figures were measured on the lists before re-ranking was deployed (version 1 of the recommendation table).

The A/B dashboard of the web application reads `gold.ket_qua_ab` and shows the pooled result, conclusion and required sample size, together with the share of simulated traffic for each group and the daily CTR curves (@fig:ab-web). The screenshot was taken on 11 November, after the screenshots of the live system had logged 230 real impressions of ALS users (180 in group A with 7 clicks, 50 in group B with 1 click). The dashboard therefore pools eight days — 176,140 against 174,250 impressions, p = 0.0135 — while the primary analysis of @tab:ab keeps the seven simulated days up to data version 2 (p = 0.015); the jump of group A on 11 November is noise from 180 impressions. On the seven simulated days group B lies below group A every day (by 0.02 to 0.22 percentage points), which is consistent with the pooled test even though no single day is significant on its own.

![A/B dashboard of the web application on 11 November: pooled result with p-values and conclusions (top) and CTR per day, including the first day of real web impressions (bottom)](hinh/s03_ab_web.png){#fig:ab-web w=15}

## OPTIMIZE and Z-ORDER {#sec:res-zorder}

The per-user lookup `WHERE ma_nguoi_dung = ?` is the hot query of the web application. @tab:zorder and @fig:zorder give the three-phase measurement on the 5.3-million-row recommendation table (30 lookups per phase).

Table: Per-user lookup on gold.goi_y_nguoi_dung before and after optimisation {#tab:zorder w=30,12,16,14,14,14}
| Phase | Files in table | Files read per query | Mean (ms) | Median (ms) | p95 (ms) |
|---|---|---|---|---|---|
| Fragmented (simulating many days of MERGE) | 200 | 200 | 10,868 | 10,793 | 13,420 |
| OPTIMIZE only (compaction, 1 MB target) | 67 | 67 | 7,789 | 8,280 | 9,524 |
| OPTIMIZE ZORDER BY (ma_nguoi_dung) | 55 | 1.07 | 999 | 980 | 1,387 |

![Latency and files read per user lookup in the three phases](hinh/c05_zorder.png){#fig:zorder w=14}

Compaction alone barely helps: each compacted file still contains users from the whole range of ids, so the min/max statistics of every file cover almost the entire domain and data skipping cannot exclude any file. Z-ORDER places rows of the same user together, narrows the min/max range of each file, and lets Delta skip all but about one file per lookup. The median latency drops from 8,280 ms to 980 ms, **8.4 times faster than compaction alone** and 11 times faster than the fragmented table. Absolute latencies on the cluster vary with load and with the Wi-Fi, but the number of files read does not, which makes it the more reliable figure.

## Reproducibility {#sec:res-repro}

DAG 5 was triggered on 10 November at 23:13 with the configuration `{"phien_ban_delta": 0, "che_do": "mo_hinh_chon"}`. It read `features.ma_tran_tuong_tac` at version 0 — the version built for run `r20261110T075240` — retrained the selected model with the recorded hyper-parameters, re-evaluated it on the test set stored in the same version and compared the results with `gold.ket_qua_tuning` and `gold.lich_su_huan_luyen` (@tab:tai-lap).

Table: Reproduction with time travel: run r20261110T075240 on 10 November and the deployed model r20261110T230924 on 11 November {#tab:tai-lap w=30,34,12,12,12}
| Comparison | Key | Delta version | Max deviation | Match |
|---|---|---|---|---|
| Tuning row | r20261110T075240, rank 50, reg 1.0, alpha 40 | 0 | 0.000000 | yes |
| Training and evaluation | r20261110T075240 | 0 | 0.000000 | yes |
| Tuning row (11 Nov) | r20261110T230924, rank 50, reg 1.0, alpha 40 | 3 | 0.000000 | yes |
| Training and evaluation, incl. v2 filter and both baselines (11 Nov) | r20261110T230924 | 3 | 0.000000 | yes |

The deviation is zero to six decimal places (tolerance 10^{−6}). This is a meaningful test: while the reproduction ran, `silver.tuong_tac` had already moved to version 2 through schema evolution and bronze had received 857,000 additional replayed events. The result is identical because the job reads only version 0 of the feature table, which contains both the training data and the ground truth (@sec:impl-train), because ALS uses a fixed seed, and because the append-only indexers guarantee that indices mean the same users and items in every version.

On 11 November, after the additional experiments, DAG 5 was triggered a second time — from the *Trigger kn_tai_lap* button of the web application, which calls the Airflow REST API — for the model that is actually deployed, `als_v2_r20261110T230924` on feature version 3. The run took about 20 minutes. Both comparisons matched with a deviation of exactly 0, also without rounding, and this time the comparison includes NDCG@10 of model version 2 (price filter) and of the two baselines. The time-travel guarantee therefore holds for the served model as well as for the first experiment.

The reproduction screen of the web application reads the same table (@fig:tai-lap-web; the screenshot predates the second run). It shows the maximum deviation without rounding: exactly 0 for the training row and 1.78 × 10^{−15} for the tuning row, a difference in the last bits of a floating-point sum that the 10^{−6} tolerance is designed to absorb.

![Reproduction screen of the web application: A/B results that can be recomputed at their recorded data version (top) and the two comparisons of DAG 5 on feature version 0 (bottom)](hinh/s02_tai_lap_web.png){#fig:tai-lap-web w=14.5}

## Additional Experiments {#sec:res-extra}

Three limitations of the evaluation protocol were raised while preparing the defence: the A/B test treats impressions as independent, the hyper-parameters and the re-ranking weight were chosen on the test month, and every candidate of the served list comes from ALS. On 11 November three read-only jobs addressed them. None of them writes a table or changes the served system, and all read the same Delta versions as the main results (feature version 3, silver version 10, impression log version 51).

### User-level test of the A/B result {#sec:res-ab-user}

`kiem_tra/bootstrap_ab.py` aggregates the impression log by user — the same filter as the dashboard: ALS strategy only, simulated traffic only — and repeats the test with the user as the unit, in two ways: a z-test with cluster-robust standard errors (delta method for the ratio of sums, with an m/(m − 1) correction), and a bootstrap that resamples users with replacement within each group 2,000 times with a fixed seed. The design effect is the ratio of the cluster-robust variance to the binomial variance of the impression-level test.

Table: The A/B result with the user as the unit (8,592 simulated users, 350,160 impressions) {#tab:ab-user w=20,16,16,16,32}
| Metric | Impression-level p | Cluster-robust p | User bootstrap p | Bootstrap 95 % CI of the relative difference B vs A; design effect |
|---|---|---|---|---|
| CTR (A 2.094 %, B 1.978 %, −5.5 %) | 0.015 | **0.037** | **0.029** | [−10.5 % ; −0.7 %]; 1.36 |
| Conversion (A 0.234 %, B 0.239 %) | 0.75 | 0.76 | 0.75 | [−10.6 % ; +17.4 %]; 1.05 |

Each group has about 4,300 users with about 41 impressions each. The design effect of 1.36 for CTR means that the impression-level test understates the standard error by about 17 % (√1.36 ≈ 1.17): in the simulation a user whose list contains items from their own test month clicks in every session, so the clicks of one user are correlated. The correction raises the p-value from 0.015 to 0.03–0.04, but the conclusion at the 5 % level is unchanged, and the bootstrap interval for the relative difference excludes zero. Conversion shows no correlation worth mentioning (design effect 1.05) and no difference under any of the three tests. The answer to the question "does B lower CTR?" is therefore the same with the stricter unit of analysis — still under the assumptions of the simulation.

### Hyper-parameters selected on a validation period {#sec:res-val}

`kiem_tra/tuning_validation.py` repeats the selection with a clean protocol. Training data, seed and maxIter are those of the deployed model (feature version 3, built from silver version 10). The test month (19 August – 18 September 2015) is split by date: the first 15 days (19 August – 2 September) form a **validation period** used only to choose, and the remaining 16 days (3–18 September) a **held-out period** used only to report. Of the 9,467 test users, 6,505 are active in the validation period, 4,215 in the held-out period and 1,253 in both; as in the main evaluation, only users and items seen in training are scored. The job also recomputes NDCG@10 on the whole test month, which reproduces @tab:tuning to four decimals and confirms that the models are identical.

The first run, over all 27 combinations, measured the nine rank-10 and five rank-30 combinations before it was stopped because it ran five to six times slower than the original tuning (issue 31). A second run measured the three rank-50, alpha-40 combinations, which lead in every period. The ten combinations left out score between 0.023 and 0.057 on the full month, well below the rank-50, alpha-40 group (0.066–0.068), and the ordering of configurations is almost the same in the two periods (Spearman correlation 0.995 over the 17 measured combinations), so they could not change the selection.

Table: NDCG@10 of 17 of the 27 combinations on the validation period, the held-out period and the whole test month; the combination selected on validation in bold {#tab:val w=12,15,12,21,20,20}
| rank | regParam | alpha | Validation (19 Aug – 2 Sep) | Held-out (3–18 Sep) | Whole month (@tab:tuning) |
|---|---|---|---|---|---|
| 10 | 0.01 | 1 | 0.0177 | 0.0135 | 0.0158 |
| 10 | 0.01 | 10 | 0.0241 | 0.0179 | 0.0213 |
| 10 | 0.01 | 40 | 0.0256 | 0.0188 | 0.0228 |
| 10 | 0.1 | 1 | 0.0172 | 0.0125 | 0.0148 |
| 10 | 0.1 | 10 | 0.0249 | 0.0188 | 0.0221 |
| 10 | 0.1 | 40 | 0.0264 | 0.0193 | 0.0233 |
| 10 | 1.0 | 1 | 0.0150 | 0.0124 | 0.0121 |
| 10 | 1.0 | 10 | 0.0264 | 0.0211 | 0.0234 |
| 10 | 1.0 | 40 | 0.0275 | 0.0196 | 0.0241 |
| 30 | 0.01 | 1 | 0.0284 | 0.0226 | 0.0252 |
| 30 | 0.01 | 10 | 0.0459 | 0.0348 | 0.0396 |
| 30 | 0.01 | 40 | 0.0568 | 0.0422 | 0.0493 |
| 30 | 0.1 | 1 | 0.0285 | 0.0227 | 0.0250 |
| 30 | 0.1 | 10 | 0.0476 | 0.0360 | 0.0409 |
| 50 | 0.01 | 40 | 0.0771 | 0.0581 | 0.0668 |
| 50 | 0.1 | 40 | 0.0763 | 0.0574 | 0.0662 |
| **50** | **1.0** | **40** | **0.0789** | **0.0579** | **0.0680** |

The re-ranking weight β was then chosen on the validation period as well, with the model selected above and the same 200 candidates as in production (@tab:val-beta), and every method was scored on the held-out period, which played no part in either choice (@tab:val-kt).

Table: Novelty re-ranking weight chosen on the validation period (200 ALS candidates) {#tab:val-beta w=16,24,24,18,18}
| β | NDCG@10 validation | NDCG@10 held-out | Coverage held-out | Items |
|---|---|---|---|---|
| 0 (ALS only) | 0.0789 | 0.0579 | 2.83 % | 3,568 |
| 0.25 | 0.0855 | 0.0630 | 3.24 % | 4,091 |
| 0.5 | 0.0919 | 0.0674 | 3.85 % | 4,856 |
| **1.0** | **0.1012** | **0.0742** | **5.27 %** | **6,649** |
| 1.5 | 0.0819 | 0.0576 | 5.97 % | 7,536 |
| 2.0 | 0.0630 | 0.0439 | 5.81 % | 7,336 |

Table: Methods on the held-out period (3–18 September, 4,215 users), all choices made on the validation period {#tab:val-kt w=44,14,21,21}
| Method | NDCG@10 | Over best-seller baseline | Over category baseline |
|---|---|---|---|
| Baseline 1: global best-sellers | 0.0049 | — | — |
| Baseline 2: category best-sellers | 0.0413 | — | — |
| ALS selected on validation (rank 50, regParam 1.0, alpha 40) | 0.0579 | +1,086 % | +40 % |
| ALS that would be selected on the held-out period itself (rank 50, regParam 0.01, alpha 40) | 0.0581 | +1,091 % | +41 % |
| ALS + novelty re-ranking, β = 1.0 selected on validation | **0.0742** | +1,420 % | +80 % |

- **The clean protocol selects the deployed configuration.** Both the ALS hyper-parameters (rank 50, regParam 1.0, alpha 40) and the re-ranking weight β = 1.0 come out on top of the validation period, exactly as they did on the whole month; β = 1.0 is also the best value on the held-out period.
- **The optimism of the main protocol is negligible.** The combination that would have been chosen by looking at the held-out period is better by 0.0002 (0.0581 against 0.0579), less than 0.5 % relative. Selecting on the test month therefore did not inflate the reported metrics in any way that matters.
- **Absolute values differ between periods, comparisons do not.** Every method, the baselines included, scores lower on the held-out period, whose users are further from the training period; NDCG is 17–29 % lower than on the validation period for every combination. Compared on the same period, ALS keeps +1,086 % and +40 % over the two baselines (+1,237 % and +43 % on the whole month), and re-ranking adds 28 % to ALS (27 % on the whole month). Held-out coverage (5.27 %) is lower than the whole-month figure (6.47 %) only because 4,215 users receive fewer slots than 9,467.

The results of @sec:res-tuning, @sec:res-baselines and @sec:res-coverage are therefore not an artefact of choosing on the test month.

### Candidate sources beyond ALS {#sec:res-nguon}

Every item of the served list comes from ALS, which is why re-ranking stops at 6.47 % coverage (@sec:res-coverage). `kiem_tra/thu_nguon_ung_vien.py` starts from that served list — ALS with novelty re-ranking, β = 1.0 over 200 candidates — keeps its first 10 − *c* − *d* slots and gives the last ones to two sources that do not go through ALS, both computed from training data only: *c* **co-occurrence** items, those most often viewed on the same day as the user's ten highest-scoring training items, with the cosine similarity of the related-products block (@eq:cos), and *d* **category best-sellers** of the user's main category (baseline 2). An item already in the list is skipped, and a missing candidate is replaced by the next item of the served list. Ten mixes were scored with the deployed model on the periods of @sec:res-val. The selection rule was fixed before the run: the highest validation coverage among the mixes whose validation NDCG@10 is at least 95 % of the served list's. Coverage uses no ground truth, so it is reported on the lists of all 9,467 test users, exactly as the 3.44 % and 6.47 % of @sec:res-coverage; 8,673 of these users have at least one co-occurrence candidate. The run took 11 minutes.

Table: Mixing co-occurrence and category candidates into the last slots of the served list (offline, deployed model, β = 1.0); the mix selected on validation in bold {#tab:nguon w=11,12,10,12,11,12,11,10,11}
| Served slots kept | Co-occurrence slots | Category slots | NDCG@10 validation | NDCG@10 held-out | NDCG@10 whole month | Coverage | Items | Slots in N1 |
|---|---|---|---|---|---|---|---|---|
| 10 | 0 | 0 | 0.1012 | 0.0742 | 0.0865 | 6.47 % | 8,162 | 80.8 % |
| 9 | 1 | 0 | 0.1022 | 0.0753 | 0.0876 | 10.14 % | 12,805 | 78.2 % |
| 8 | 2 | 0 | 0.1034 | 0.0760 | 0.0886 | 12.68 % | 16,011 | 75.9 % |
| **7** | **3** | **0** | **0.1040** | **0.0764** | **0.0892** | **14.53 %** | **18,341** | **74.1 %** |
| 9 | 0 | 1 | 0.1009 | 0.0740 | 0.0863 | 6.44 % | 8,124 | 82.2 % |
| 8 | 0 | 2 | 0.1010 | 0.0737 | 0.0863 | 6.46 % | 8,151 | 83.3 % |
| 8 | 1 | 1 | 0.1024 | 0.0751 | 0.0877 | 10.09 % | 12,737 | 79.5 % |
| 7 | 2 | 1 | 0.1034 | 0.0762 | 0.0887 | 12.63 % | 15,939 | 77.4 % |
| 6 | 3 | 1 | 0.1041 | 0.0763 | 0.0892 | 14.44 % | 18,231 | 75.6 % |
| 6 | 2 | 2 | 0.1033 | 0.0756 | 0.0884 | 12.59 % | 15,891 | 78.6 % |

- **Co-occurrence slots raise accuracy and coverage together.** Each of the first three slots adds between 1.9 and 3.7 points of coverage (6.47 % → 10.14 % → 12.68 % → 14.53 %) and a little NDCG@10 (0.0865 → 0.0892 on the whole month, 0.0742 → 0.0764 on the held-out days). The selected mix — seven served slots and three co-occurrence slots — exceeds the 10 % coverage target for the first time, with 18,341 distinct items, while the share of slots among the 10 % most popular items falls from 80.8 % to 74.1 %. On the held-out days it is 85 % better than the category baseline (0.0764 against 0.0413) and 15.7 times better than the best-seller baseline.
- **Category slots add nothing.** With category best-sellers only, coverage stays at 6.4–6.5 % and NDCG@10 drops slightly: a handful of best-sellers per category is repeated across many users, so they bring hardly any new items, and they replace items that were more often relevant.
- **The optimum lies at the edge of the tried range.** Three co-occurrence slots is the largest value tried, so four or five may raise coverage further; the gain in NDCG flattens after two slots.
- **The mix is not deployed.** The served system still fills its ALS slots from ALS alone (6.47 %). Deploying the mix means one more step in the blending job before the A/B template is applied; it was not done a week before the defence because it would change the served lists, the A/B experiment and the screenshots of this report. The coverage threshold of criterion 2 is therefore met offline, on the same users and the same definition, but not yet in production.

## Streaming and Operations {#sec:res-streaming}

On 10 November the three streaming jobs were started on the cluster and the producer replayed the last 48 days of data (1 August to 18 September 2015) a second time: 857,072 events in about 24 minutes. Thanks to content deduplication (@tab:lam-sach), these duplicates do not change silver. The check used by the stream monitor reported the trending table as live, with 2,203,504 (window, item) rows whose window ended within the last 15 minutes. With Airflow, the three streaming drivers and a reproduction job running together, the master host still had 1.8 GB of memory available (@fig:ram).

**Closed loop and latency.** The two streaming criteria were measured on 11 November between 05:20 and 05:36 (Vietnam time) with the web application running on labsoe-18 and the producer stopped, so that the trending table changed only because of the test. The first clicks also woke the sensor of the nightly DAG, which started its batch jobs at 05:22 (@sec:res-v2): the second measurement was therefore taken while ALS tuning was running on the cluster and its driver on the master, so the 51 seconds were measured under batch load rather than on an idle cluster. Both measurements use the public API of the web application from the master host (@tab:do-tre). The first attempt sent three *Add to cart* events for product 320844: they reached bronze about ten seconds after the broker received them, but the trending block did not change within 180 seconds. The log showed two runs of the same trending query writing the same offset file: the stream restart earlier that night had cancelled the application through the Spark Master but left the client-mode driver alive, and the first new event made the old and the new driver collide on the checkpoint, which stopped both (issue 27). After the fix — stopping a stream now also stops its driver process — the streams were restarted. The three earlier clicks then appeared in the window starting 22:22 UTC: the checkpoint had kept the planned batch, and nothing was lost. The second measurement, on product 102605, saw the trending table updated **51 seconds** after the three clicks, within the 90-second target; the time is made of up to 20 seconds of trigger interval, the micro-batch (join with the product statistics and MERGE) and the 3-second polling of the script.

Table: Closed-loop and latency measurements on the cluster (11 November 2026) {#tab:do-tre w=34,22,44}
| Measurement | Product, user | Result |
|---|---|---|
| Kafka → bronze, three *Add to cart* events (`tim_su_kien_bronze.py`) | 320844, `demo_vong_kin` | 3 rows in bronze; 10.3–10.7 s from `kafka_ts` to `_ingest_ts` |
| Click → updated trending table (`demo_vong_khep_kin.py`, three clicks) | 102605, `demo_vong_kin` | **51 s** (window ending 22:50 UTC); target ≤ 90 s |
| Recovery after the stream failure | 320844 | the three clicks of the failed attempt counted in the window 22:22–22:37 UTC after restart |

**Cold start on the live system.** A user created with the *New user (cold start)* button receives the strategy `nguoi_moi`: all ten "For you" slots come from the newest trending window and coincide with the trending block below (@fig:cold-start-web). Ten impressions are written to the impression log, but the A/B computation leaves them out because it counts only users with ALS recommendations, and the page therefore labels the user as outside the experiment.

![Home page of a user created on the spot: strategy `nguoi_moi`, outside the A/B experiment; the "For you" slots (top) are the products of the trending block (bottom)](hinh/s01_cold_start_web.png){#fig:cold-start-web w=14.5}

## Acceptance Checklist {#sec:res-checklist}

@tab:ket-qua-nghiem-thu summarises the status of the eight acceptance criteria of @tab:nghiem-thu.

Table: Status of the acceptance criteria {#tab:ket-qua-nghiem-thu w=5,28,24,43}
| # | Criterion | Status | Evidence |
|---|---|---|---|
| 1 | Tuning table, ≥ 9 combinations | Met | 27 combinations with NDCG@10 (@tab:tuning); the same selection on a separate validation period (@tab:val) |
| 2 | ALS vs 2 baselines, 4 metrics + coverage + novelty | Met; coverage threshold met offline only, analysed | NDCG@10 +1,237 % over baseline 1; coverage 3.44 % (6.47 % served), analysis and re-ranking in @sec:res-coverage; 14.5 % with three co-occurrence slots, offline (@tab:nguon) |
| 3 | Three cold-start strategies | Met: brand-new user shown live; the other two strategies unit-tested and shown at the defence | @tab:cold-start, @fig:cold-start-web |
| 4 | Trending updated ≤ 90 s after a click | Met | 51 s from three clicks to the updated table (@tab:do-tre) |
| 5 | Closed loop web → Kafka → bronze → trending | Met | Web events in bronze 10.3 s after Kafka, in the trending table after 51 s (@tab:do-tre, @fig:loop) |
| 6 | A/B result with p-value and conclusion | Met | CTR p = 0.015 (B lower), conversion p = 0.75 (@tab:ab, @fig:ab-web); user-level bootstrap p = 0.029 (@tab:ab-user) |
| 7 | Reproduction with `VERSION AS OF` | Met | Deviation 0.000000 on version 0, and 0 for the deployed model on version 3, triggered from the web (@tab:tai-lap) |
| 8 | OPTIMIZE/Z-ORDER figures for the per-user lookup | Met | Files read 67 → 1.07, median 8.4× faster than compaction only (@tab:zorder) |

**Personalised lists on the live system.** @fig:trang-chu-a and @fig:trang-chu-b show the home pages of two active users after the deployment of model version 2, taken on 11 November with the producer replaying events so that the trending windows were full. Both pages name the model that produced the list (`als_v2_r20261110T230924`) and log ten impressions. Product names, departments and pictures come from the illustrative display layer of @sec:impl-web; the product and category ids under each card are the real ones. The group A user receives eight re-ranked, price-filtered ALS items followed by two items from the new-item source of the user's main category. The group B user receives five ALS items, the same two new items, and trending items at positions 3, 6 and 8; these three slots were stored at night but are replaced at request time by the three newest trending products, which are exactly positions 1 to 3 of the trending block below the list. The template of @fig:mau-khoi is therefore visible on the page itself.

![Home page of a group A user after deployment of model version 2 (11 November, producer running): eight ALS items and two new items of the user's main category](hinh/s05a_trang_chu_a.png){#fig:trang-chu-a w=14.5}

![Home page of a group B user: trending items at positions 3, 6 and 8, refreshed at request time with positions 1–3 of the trending block (bottom)](hinh/s05b_trang_chu_b.png){#fig:trang-chu-b w=14.5}

Clicking a recommended item opens the product page (@fig:san-pham-web): it records the click against the impression it came from (`mh` in the address, shown as "đến từ impression"), so that the A/B pipeline can join clicks to impressions, and it shows the product's latest row in the trending table and the related products of `gold.san_pham_lien_quan`: products that the same users interacted with on the same day, ranked by cosine similarity of their user counts.

![Product page reached from slot 6 of @fig:trang-chu-a: impression id of the click, state in the trending table and related products](hinh/s06_san_pham_web.png){#fig:san-pham-web w=14.5}
