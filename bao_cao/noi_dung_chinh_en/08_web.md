# Web application {#sec:web}

## Screens and API

Table: Five screens and their APIs {#tab:web w=20,52,28}
| Screen | Content | API |
|---|---|---|
| Home | Pick or create a user; 10 "For you" slots with their source and A/B group; the trending block; every page render logs impressions | `GET /api/goi-y/{user_id}`, `POST /api/hien-thi` |
| Product | Details, related products, trending counts; the View / Add to cart / Buy buttons push events into Kafka | `POST /api/su-kien` |
| A/B dashboard | CTR and conversion per group, daily chart (Chart.js), p-value, required sample size, conclusion | `GET /api/ab/ket-qua` |
| Model quality | Metrics per version, comparison with the baselines, tuning table, popularity distribution | `GET /api/mo-hinh/chi-so` |
| Reproduce | Pick an old A/B result → rerun on `VERSION AS OF` → compare old and new; trigger DAG 5 | `POST /api/tai-lap/{ngay}` |

**Writing back to Delta (A.6.4).**

- **Directly.** "Rerun" writes a row with `loai = 'ab_web'` into `gold.ket_qua_tai_lap` through the web application's own Spark + Delta session, in the background so the response is not slowed.
- **Through Kafka.** Impressions, clicks and purchases go into the `hien-thi` topic; the `ghi_hien_thi` stream MERGEs them into `gold.nhat_ky_hien_thi`.

During the demo, `scripts/demo/delta_sql.sh demo <user>` queries these two tables to confirm the rows just written.

## Performance

A middleware times every request by route pattern: each response carries the header `X-Thoi-Gian-Xu-Ly-Ms`, and `GET /api/hieu-nang` returns the median, the p95 and the share under 3 seconds. Caches with a time-to-live (@tab:bo-dem) keep most requests in the millisecond range; a local Spark query runs only on the first request after an entry expires. The per-user recommendation query is the one measured with Z-ORDER in @tab:zorder.

Table: Time-to-live of the web caches {#tab:bo-dem w=60,40}
| Data | Time-to-live |
|---|---|
| Trending | 10 seconds |
| Per-user recommendations | 30 seconds |
| Small tables | 60 seconds |
| Report tables that change only nightly | 600 seconds |
| Related products | 600 seconds |
| Large tables | 3,600 seconds |

`scripts/do_do_tre_web.py` measures from the client, 20 times per group of read requests; the script does not log impressions, so it does not pollute the A/B data.

**The measurement on the cluster on 16 November revealed two bugs** that tests against a fake data store had not caught (`docs/bang_chung/cum/07_do_tre_web.md`):

- **Slow recommendations for known users:** median 8.9 seconds, only 1 in 20 requests under 3 seconds. The nightly OPTIMIZE ZORDER used the 1 GB default file size and merged the recommendation table (38 MB) into one file, so data skipping excluded nothing and every lookup read the whole table (the experiment in @tab:zorder used 1 MB files). Fix: DAG 4 caps this table at 1 MB.
- **`/mo-hinh`, `/api/mo-hinh/chi-so` and `/tai-lap` returned error 500** when called again within 60 seconds: a function dropped a column directly on data held in the cache. Fix: copy before transforming, with a regression test.

After the fixes and a fresh OPTIMIZE of the recommendation table (1 file → 36 files), a second measurement on the same day gave the results in @tab:web.

Table: Response time before and after the fixes, 20 requests per group (16 Nov 2026) {#tab:web w=34,26,40}
| Request group | Before: median, under 3 s | After: first / median / p95, under 3 s |
|---|---|---|
| Recommendations, known user | 8,907 ms, 1/20 | 426 / 28 / 531 ms, **20/20** |
| Recommendations, new user | 17 ms, 20/20 | 402 / 22 / 407 ms, 20/20 |
| Home, trending, `/api/ab/ket-qua` | 16–18 ms, 20/20 | 16–21 ms, 20/20 |
| Product page | 409 ms, 18/20 | 2,586 / 338 / 2,586 ms, 19/20 |
| `/mo-hinh` | 19/20 error 500 | 8,529 / 28 / 58 ms, 19/20 |
| `/api/mo-hinh/chi-so`, `/tai-lap` | 20/20 error 500 | median 22–29 ms, **20/20** |
| **All 220 requests** | 161 succeeded | **220 succeeded, 99.1% under 3 s, p95 457 ms** |

The two requests still above 3 seconds were both the first after start-up: `/mo-hinh` at 8.5 seconds and one product page at 3.4 seconds. Since then the web application warms those queries in a background thread at start-up and keeps the three report tables (which change only nightly) in a 10-minute cache. Checked on the cluster after a rebuild: the warm-up finished 9 queries about 43 seconds after start-up, and the first `/mo-hinh` took 24 ms (previously 8.5 seconds).
