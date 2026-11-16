# Data {#sec:dl}

## Source

The RetailRocket Recommender System Dataset (Kaggle) consists of four files:

- `events.csv`: 2,756,101 view, add-to-cart and purchase events from 1.4 million visitors, from 3 May to 18 September 2015;
- `item_properties_part1.csv`, `item_properties_part2.csv`: anonymised product properties over time;
- `category_tree.csv`: the category tree.

The producer replays events in their original order, each day compressed into 30 seconds, and adds 5% new users (48,376 users, 138,137 events) to force cold start.

## Exploratory data analysis

`notebooks/eda_retailrocket.ipynb` presents the exploration of the raw data (@tab:eda, @fig:eda), computed on the cluster on 16 November by `jobs/kiem_tra/eda.py` from the CSV files on HDFS; only small aggregates reach the driver.

Table: Exploration of `events.csv` (computed on the cluster, `docs/bang_chung/cum/eda.json`) {#tab:eda w=58,42}
| Measure | Value |
|---|---|
| Events / users / products | 2,756,101 / 1,407,580 / 235,061 |
| Time span | 3 May – 18 Sep 2015 (139 days), on average 19,828 events/day |
| Views / add-to-cart / purchases | 96.7% / 2.5% / 0.8% |
| User funnel: view → add-to-cart → purchase | 1,404,179 → 37,722 (2.7%) → 11,719 (0.83%) |
| Density of the user × product matrix | 6.5 × 10^{−6} (2,145,179 pairs) |
| Users with only 1 event / fewer than 3 events | 71.2% / 85.8% |
| Events per user: median / p99 / max | 1 / 13 / 7,757 |
| Events per product: median / p99 / max | 3 / 136 / 3,412 |
| Share of events of the top 1% / 10% most popular products | 22.9% / 64.0% |
| Exact duplicate rows / repeat clicks within 5 seconds | 460 / 11,759 |
| Bots (> 500 events in one hour) | 0; at most 242 events in one hour |
| Product properties / category tree | 20.3 million rows, 417,053 products, 1,104 properties; 1,669 categories, 25 roots |

![Events per day, per UTC hour, and the distribution of events per user](hinh/c08_eda_en.png){#fig:eda w=15}

The characteristics that shape the design:

- **Extremely sparse, implicit feedback.** The density is only 6.5 × 10^{−6} and 96.7% of events are views, hence ALS with `implicitPrefs = true` and weights view 1, add-to-cart 3, purchase 5. After filtering, the training matrix has 746,350 pairs over 179,999 users × 126,230 products (density about 3.3 × 10^{−5}).
- **Most visitors come only once.** 85.8% of users have fewer than 3 events. Keeping users with at least 3 interactions (section 3.10) leaves 179,999 for training; the rest need cold-start strategies.
- **Long tail.** The top 10% of products receive 64% of events, while half of all products have at most 3 events, so coverage and novelty must be measured and bias reduction tried.
- **Daily rhythm.** Peak hours (19–21 UTC) are about 11 times busier than the quietest; the producer keeps the time order, so the trending stream sees the same swings.
- **Fairly clean data.** No bots at the 500 events/hour threshold, no missing fields, only 460 exact duplicates and 11,759 repeat clicks within 5 seconds. De-duplication is still needed, because replaying data through Kafka creates duplicates (next section).

## Quality and cleaning

`transform/bronze_to_silver.py` applies the steps in @tab:lam-sach in order. Every rejected row goes to `_quarantine.tuong_tac` with its `ly_do` (reason, section A.4).

Table: Bronze → silver cleaning steps and rejection reasons {#tab:lam-sach w=22,42,36}
| `ly_do` | Rule | Reason |
|---|---|---|
| `thieu_truong` | Missing user, product, timestamp or type | Unusable |
| `trung_ma_su_kien` | Duplicate `ma_su_kien` (SHA-256 of topic, partition, offset, payload); the earliest loaded copy is kept | Kafka and the file sink may deliver again |
| `trung_noi_dung` | Same user, product, type and timestamp (milliseconds) | Replaying a segment a second time creates new IDs; these rows must go before bot filtering, or real users would be taken for bots |
| `bot` | A user with > 500 events in one hour | Threshold from the specification |
| `nhap_lap_5_giay` | Same user, product and type within 5 seconds | Double clicks, page reloads |
| `loai_su_kien_khong_dung` | No weight (remove from cart) | Not a signal of interest |

On 16 November the job was rerun in full to build `_quarantine` (@tab:loai). Bronze then held 8,198,159 rows, mostly replays from test runs and demo rehearsals: a replayed event gets a new Kafka offset, hence a new event ID, so only the content comparison catches it.

Table: Rejected rows by reason (`docs/bang_chung/cum/04_delta.txt`, part F) {#tab:loai w=34,22,44}
| Location / `ly_do` | Rows | Note |
|---|---|---|
| `bronze.su_kien` | 8,198,159 | Every loaded event, replays included |
| `trung_noi_dung` | 5,304,360 | Replays plus the 460 duplicate rows already in the CSV; 475,531 users |
| `nhap_lap_5_giay` | 11,312 | 0.39% of the rows left after de-duplication; 7,901 users |
| `thieu_truong`, `trung_ma_su_kien`, `bot`, `loai_su_kien_khong_dung` | 0 | As the exploration predicted |
| `_quarantine.tuong_tac` | 5,315,672 | Total rejected rows |
| `silver.tuong_tac` | 2,882,484 | Views 2,779,729, add-to-cart 77,561, purchases 25,194 |

Silver plus quarantine equals bronze, except for the 3 newest events, not yet cleaned because DAG 1 is paused. Bronze grew from 2.89 to 8.20 million rows while silver barely changed (2,882,479 rows at version 0 on 10 November, 2,882,484 now): evidence at real scale that replays do not corrupt silver. Rerunning the job gives the same result, because both tables are overwritten in exactly the day partitions just computed.
