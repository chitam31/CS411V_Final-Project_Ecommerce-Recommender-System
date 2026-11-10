"""Sinh các tệp slide (project/slides/*.html) và project/deck.json cho deck bảo vệ BD03."""
import json
import os
from datetime import datetime, timezone

GOC = os.path.dirname(os.path.abspath(__file__))
SL = os.path.join(GOC, "project", "slides")
os.makedirs(SL, exist_ok=True)

NAVY, BG, BG2, CARD = "#14213D", "#F5F6F1", "#ECEEE6", "#FFFFFF"
TEXT, MUTED, RULE = "#3D4A5C", "#5F6B7A", "#D5D9CF"
BLUE, ORANGE, LIGHT_ACC = "#2459B8", "#A84F17", "#F2B66D"
H = "'Space Grotesk', Arial, sans-serif"
B = "'Inter', Arial, sans-serif"
M = "'JetBrains Mono', 'Courier New', monospace"

IMG = {
    "f01": ("/_blob/4caf77be05e94aa3ed6f79fa86828a98", 1628, 1925),
    "f02": ("/_blob/a27597dcb2c62cf389fd5eff21119da6", 1628, 1441),
    "f05": ("/_blob/c4ab632597f13659fd5e2f6b3be7b232", 1364, 1854),
    "f07": ("/_blob/92fd15fa6a88dc64ea7621edeeff02f6", 1628, 1236),
    "f08": ("/_blob/f4bf52b65e5f2d6956b5fd632f172624", 1628, 1038),
    "f09": ("/_blob/d5ab4dbebc3e6ebc6bd5327f4ed9a674", 1628, 825),
    "f11": ("/_blob/4a13f2b6dc7452735dafbf0d494de072", 1628, 627),
    "c01": ("/_blob/39d2e3a307545e69d83758cef89bd91f", 1322, 465),
    "c02": ("/_blob/0eb3a1eccef5618e640ad97f6547ee13", 1571, 581),
    "c03": ("/_blob/5be17cbeaef875d3efc3a5814d199683", 1563, 612),
    "c04": ("/_blob/7ce0658c2de47170ff5f8f764da02dba", 1209, 634),
    "c05": ("/_blob/f859a4537140ca9932e0c8ab719af4ea", 1231, 587),
    "s01": ("/_blob/56fa31840152250ce5ade608a83b2df3", 1745, 1033),
    "s03": ("/_blob/8caf05578d7f8553b3e528e833c023da", 1720, 1308),
    "eq_als": ("/_blob/4576264a7d76e2eb4a8cf05a603503e4", 975, 113),
    "eq_pref": ("/_blob/9b09edcb48b80f018b0ea744ca353cbe", 671, 63),
}

THU_TU = []
TONG = 25


def hinh(khoa, alt, rong=None, cao=None, dem=16):
    """Ảnh trong thẻ trắng; cho rong HOẶC cao, cạnh kia theo tỉ lệ."""
    src, w, h = IMG[khoa]
    if rong is not None:
        cao = round(rong * h / w)
    else:
        rong = round(cao * w / h)
    return (
        '<div style="background:{c};border:1px solid {r};border-radius:16px;padding:{d}px;'
        'display:flex;align-items:center;justify-content:center">'
        '<img src="{s}" alt="{a}" style="width:{w}px;height:{h}px;object-fit:contain"></div>'
    ).format(c=CARD, r=RULE, d=dem, s=src, a=alt, w=rong, h=cao)


def tieu_de(eyebrow, tieu):
    return (
        '<div style="display:flex;flex-direction:column;gap:8px">'
        '<p style="font-size:24px;font-weight:600;letter-spacing:2px;text-transform:uppercase;color:{o}">{e}</p>'
        '<h2 style="font-family:{h};font-size:64px;font-weight:600;line-height:1.15;color:{n}">{t}</h2></div>'
    ).format(o=ORANGE, e=eyebrow, h=H, n=NAVY, t=tieu)


def chan(so):
    return (
        '<p style="position:absolute;left:128px;bottom:64px;width:1300px;font-size:24px;color:{m}">'
        'BD03 · E-commerce Product Recommender System · CS411V Big Data</p>'
        '<p style="position:absolute;right:128px;bottom:64px;width:200px;text-align:right;font-size:24px;color:{m}">{s} / {t}</p>'
    ).format(m=MUTED, s=so, t=TONG)


def slide(id_, noi_dung, ghi_chu, nen=BG, chuyen="fade"):
    THU_TU.append(id_)
    so = len(THU_TU)
    html = (
        '<section id="{i}" data-transition="{tr}" style="background:{bg};color:{tx};font-family:{b};'
        'padding:128px 128px 160px;display:flex;flex-direction:column;gap:40px">\n{nd}\n{ch}\n<aside>{gc}</aside>\n</section>\n'
    ).format(i=id_, tr=chuyen, bg=nen, tx=TEXT, b=B, nd=noi_dung, ch=chan(so), gc=ghi_chu)
    with open(os.path.join(SL, id_ + ".html"), "w", encoding="utf-8") as f:
        f.write(html)


def dong(nhan, mo_ta, co=28, rong_nhan=None):
    """Một dòng: nhãn đậm + mô tả."""
    w = "width:{}px;".format(rong_nhan) if rong_nhan else ""
    return (
        '<div style="display:flex;gap:24px;align-items:baseline;border-top:1px solid {r};padding:14px 0px 0px 0px">'
        '<p style="{w}font-size:{c}px;font-weight:600;color:{n};min-width:min-content">{l}</p>'
        '<p style="flex:1;font-size:{c}px;line-height:1.35;color:{t}">{m}</p></div>'
    ).format(r=RULE, w=w, c=co, n=NAVY, l=nhan, t=TEXT, m=mo_ta)


def so_lon(gia_tri, nhan, mau=BLUE, co=72):
    return (
        '<div style="display:flex;flex-direction:column;gap:8px">'
        '<p style="font-family:{h};font-size:{c}px;font-weight:700;line-height:1.05;color:{m}">{g}</p>'
        '<p style="font-size:28px;line-height:1.35;color:{t}">{n}</p></div>'
    ).format(h=H, c=co, m=mau, g=gia_tri, t=TEXT, n=nhan)


def bang(cot, dong_s, rong, co=26):
    tr = ['<tr style="background:{}">'.format(BG2) + "".join(
        '<th style="width:{}%;text-align:left">{}</th>'.format(w, c) for c, w in zip(cot, rong)) + "</tr>"]
    for d in dong_s:
        tr.append("<tr>" + "".join("<td>{}</td>".format(x) for x in d) + "</tr>")
    return '<table style="font-size:{}px;color:{};width:100%">{}</table>'.format(co, TEXT, "".join(tr))


# ------------------------------------------------------------------ 1. Bìa
slide("cover", (
    '<p style="font-size:24px;font-weight:600;letter-spacing:3px;text-transform:uppercase;color:{la}">CS411V Big Data · Final project · Topic 3</p>'
    '<h1 style="font-family:{h};font-size:96px;font-weight:700;line-height:1.08;color:{bg}">E-commerce Product<br>Recommender System</h1>'
    '<p style="font-size:32px;line-height:1.4;color:#C9D4E5;width:1300px">Implicit-feedback ALS, streaming trends and an A/B test on a Spark, Kafka and Delta Lake cluster of six laboratory machines</p>'
    '<div style="flex:1"></div>'
    '<div style="display:flex;gap:96px">'
    '<div style="display:flex;flex-direction:column;gap:6px"><p style="font-size:32px;font-weight:600;color:{bg}">Le Chi Tam</p><p style="font-size:24px;color:#C9D4E5">Student code 2302220</p></div>'
    '<div style="display:flex;flex-direction:column;gap:6px"><p style="font-size:32px;font-weight:600;color:{bg}">Le Nguyen Quoc Anh</p><p style="font-size:24px;color:#C9D4E5">Student code 2302283</p></div>'
    '</div>'
    '<p style="font-size:24px;color:#C9D4E5">Tan Tao University · Defence 18 November 2026 · Lecturer: [lecturer’s name]</p>'
).format(la=LIGHT_ACC, h=H, bg=BG),
    "Good morning. We are Le Chi Tam and Le Nguyen Quoc Anh. Our project is Topic 3 of CS411V: a product recommender "
    "for a simulated e-commerce marketplace. In the next twenty minutes we show how the system is built, what the model "
    "achieves on real data, and how we proved each of the eight acceptance criteria on a cluster of six laboratory machines. "
    "After the slides we run a short live demonstration.", nen=NAVY)
# chân trang trên nền tối: sửa màu trong tệp bìa
p = os.path.join(SL, "cover.html")
s = open(p, encoding="utf-8").read().replace("color:{}\">BD03".format(MUTED), "color:#9FB0C8\">BD03").replace(
    "text-align:right;font-size:24px;color:{}".format(MUTED), "text-align:right;font-size:24px;color:#9FB0C8")
open(p, "w", encoding="utf-8").write(s)

# ------------------------------------------------------------------ 2. Đề bài
muc_tieu = [
    ("O1", "Data platform", "Kafka ingestion and a bronze → silver → gold lakehouse on HDFS with Delta Lake"),
    ("O2", "Model", "ALS with implicit feedback, a tuning grid, two baselines and three cold-start strategies"),
    ("O3", "Streaming", "A “trending now” block that reacts to a click within 90 seconds"),
    ("O4", "Experiment", "An A/B test with impression logging and a statistical conclusion"),
    ("O5", "Operations", "Five Airflow DAGs, a five-screen web application and reproducible experiments"),
]
hang = "".join(
    '<div style="display:flex;gap:28px;align-items:center;border-top:1px solid {r};padding:18px 0px 0px 0px">'
    '<p style="font-family:{h};font-size:32px;font-weight:700;color:{bg};background:{n};padding:8px 18px;border-radius:12px">{k}</p>'
    '<p style="width:250px;font-size:32px;font-weight:600;color:{n}">{t}</p>'
    '<p style="flex:1;font-size:28px;line-height:1.35;color:{tx}">{m}</p></div>'.format(
        r=RULE, h=H, bg=BG, n=NAVY, k=k, t=t, tx=TEXT, m=m) for k, t, m in muc_tieu)
slide("assignment", tieu_de("Introduction", "What the assignment asks") +
      '<p style="font-size:32px;line-height:1.4;color:{t};width:1500px">Learn from clicks, react within seconds, prove it with an experiment.</p>'.format(t=TEXT) +
      '<div style="display:flex;flex-direction:column;gap:12px">' + hang + "</div>",
      "The assignment has five objectives. O1 is the data platform: events arrive through Kafka and are stored in a "
      "lakehouse on HDFS with Delta Lake. O2 is the model: ALS for implicit feedback, a tuning grid, two baselines and cold "
      "start. O3 is streaming: a trending block that reacts within ninety seconds. O4 is an A/B experiment, and O5 covers "
      "operations: Airflow, the web application and reproducibility.")

# ------------------------------------------------------------------ 3. Tám tiêu chí
tieu_chi = [
    "Tuning table with at least 9 ALS combinations and NDCG@10",
    "ALS against 2 baselines on 4 ranking metrics, coverage and novelty",
    "Three cold-start strategies, shown with a user created on the spot",
    "Trending block updated at most 90 s after a click",
    "Closed loop: a web click reaches Kafka, bronze and the trending table",
    "A/B result with a p-value and a statistical conclusion",
    "Reproduction of an experiment with Delta <span style=\"color:{}\">VERSION AS OF</span>".format(BLUE),
    "OPTIMIZE / Z-ORDER figures for the per-user lookup",
]
the = "".join(
    '<div style="display:flex;gap:20px;align-items:center;background:{c};border:1px solid {r};border-radius:14px;padding:20px 24px">'
    '<p style="font-family:{h};font-size:44px;font-weight:700;color:{b}">{i}</p>'
    '<p style="flex:1;font-size:28px;line-height:1.3;color:{n}">{t}</p></div>'.format(
        c=CARD, r=RULE, h=H, b=BLUE, i=i + 1, n=NAVY, t=t) for i, t in enumerate(tieu_chi))
slide("criteria", tieu_de("Introduction", "Eight acceptance criteria") +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:20px 28px">' + the + "</div>",
      "The specification turns these objectives into eight measurable acceptance criteria. We will come back to this list "
      "at the end and show the evidence for each one. All eight were demonstrated on the cluster with the real data.")

# ------------------------------------------------------------------ 4. Dữ liệu
slide("dataset", tieu_de("Data and architecture", "RetailRocket clickstream") +
      '<div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:32px">' +
      so_lon("2.89 M", "events over 139 days: views, add-to-cart, purchases") +
      so_lon("417,053", "items in the catalogue (126,230 seen in training)") +
      so_lon("179,999", "training users with at least 3 interactions") +
      so_lon("1.8×10<span style=\"color:{}\">⁻⁵</span>".format(BLUE), "density of the user–item matrix") +
      "</div>" +
      '<div style="display:flex;flex-direction:column;gap:12px">' +
      dong("Replay", "A Kafka producer replays the log, compressing one day into 30 seconds; 4.8 % of users are synthetic newcomers for cold start", 28, 260) +
      dong("Split", "By time: four months for training, the last month (19 Aug – 18 Sep 2015) for testing; 9,467 test users", 28, 260) +
      dong("Weights", "View 1, add-to-cart 3, purchase 5, decayed with age (λ = 0.01 per day)", 28, 260) +
      "</div>",
      "We use the RetailRocket dataset: almost 2.9 million events over 139 days. The matrix is extremely sparse, "
      "1.8 times ten to the minus five, and most visitors appear only once, which shapes every result later. A producer "
      "replays the log through Kafka, one day in thirty seconds, and adds about five percent synthetic new users so that "
      "cold start can be exercised. Evaluation uses a temporal split: the last month is the test set.")

# ------------------------------------------------------------------ 5. Kiến trúc
lop = [
    ("Sources", "Replay producer, web application events"),
    ("Ingestion", "Kafka 3.7 (KRaft): retailrocket-events, hien-thi"),
    ("Storage", "HDFS 3.5 + Delta Lake 3.2: bronze, silver, features, gold"),
    ("Processing", "Spark 3.5.3: three streaming jobs, a dozen batch jobs"),
    ("Orchestration", "Airflow 3.3.1: five DAGs"),
    ("Serving", "FastAPI web app with a local Spark session, five screens"),
]
slide("architecture", tieu_de("Data and architecture", "Six layers, one direction of flow") +
      '<div style="display:flex;gap:48px;flex:1">'
      '<div style="flex:1;display:flex;flex-direction:column;gap:14px">' +
      "".join(dong(a, b, 26, 250) for a, b in lop) +
      '<p style="font-size:26px;line-height:1.4;color:{m}">Everything runs in Docker containers started from one directory file, <span style="color:{b}">cau_hinh/cum.env</span>.</p>'.format(m=MUTED, b=BLUE) +
      "</div>" + hinh("f01", "Layered architecture of the system", cao=600) + "</div>",
      "The architecture has six layers and data flows in one direction. Events come from the replay producer and from the web "
      "application, enter Kafka, are stored in the lakehouse, processed by Spark streaming and batch jobs, orchestrated by "
      "Airflow, and served by the web application. Everything is containerised, and every script reads the same directory "
      "file, so moving a role to another machine is a one-line change — we actually did that for the web host.")

# ------------------------------------------------------------------ 6. Cụm
cum = [
    ("Master", "labsoe-11: NameNode, Spark Master, every driver, Airflow"),
    ("Workers", "5 machines, 34 cores and 13 GB of executor memory in total"),
    ("Storage", "5 DataNodes, replication factor 2"),
    ("Kafka", "One broker on labsit; web application on labsoe-18"),
    ("Network", "ZeroTier overlay “ttunet” over the laboratory Wi-Fi"),
]
slide("cluster", tieu_de("Data and architecture", "Deployed on six laboratory machines") +
      '<div style="display:flex;gap:48px;flex:1">'
      '<div style="flex:1;display:flex;flex-direction:column;gap:14px">' +
      "".join(dong(a, b, 28, 170) for a, b in cum) +
      '<p style="font-size:26px;line-height:1.4;color:{m}">Each machine: 12 cores, 7 GB of RAM, shared with other groups — memory, not CPU, is the binding constraint.</p>'.format(m=MUTED) +
      "</div>" + hinh("f02", "Physical deployment on the cluster", cao=600) + "</div>",
      "The cluster has six laboratory machines on a ZeroTier network. The master runs the NameNode, the Spark Master, all "
      "drivers and Airflow. Five workers give 34 cores and 13 gigabytes of executor memory. Each machine has only 7 gigabytes "
      "of RAM and is shared with other groups, so every memory setting was sized from measurements.")

# ------------------------------------------------------------------ 7. Lakehouse
tang = [
    ("Bronze", "#8C5A2B", "su_kien_v2", "Raw events from Kafka, Parquet, append-only, by date"),
    ("Silver", "#5F6B7A", "tuong_tac", "Deduplicated by id and content, bot filter, weights; one file per date"),
    ("Features", BLUE, "ma_tran_tuong_tac", "Decayed scores, temporal split, append-only indexers"),
    ("Gold", ORANGE, "goi_y_nguoi_dung", "Served lists, trending windows, impression log, A/B and model history"),
]
o = []
for i, (ten, mau, bang_ten, mo_ta) in enumerate(tang):
    if i:
        o.append('<x-shape kind="arrow-right" style="width:56px;height:32px;background:{}"></x-shape>'.format(RULE))
    o.append(
        '<div style="flex:1;display:flex;flex-direction:column;gap:14px;background:{c};border:1px solid {r};border-top:8px solid {m};border-radius:14px;padding:28px">'
        '<h3 style="font-family:{h};font-size:44px;font-weight:600;color:{n}">{t}</h3>'
        '<p style="font-family:{mo};font-size:24px;color:{m}">{b}</p>'
        '<p style="font-size:26px;line-height:1.4;color:{tx}">{d}</p></div>'.format(
            c=CARD, r=RULE, m=mau, h=H, n=NAVY, t=ten, mo=M, b=bang_ten, tx=TEXT, d=mo_ta))
slide("lakehouse", tieu_de("Data and architecture", "A medallion lakehouse on HDFS") +
      '<div style="display:flex;gap:16px;align-items:center">' + "".join(o) + "</div>" +
      '<div style="display:flex;gap:24px;flex-wrap:wrap;background:{bg2};border-radius:14px;padding:24px 32px">'
      '<p style="font-size:28px;color:{n}"><b>2,894,238</b> events → <b>2,882,479</b> silver rows (139 days) → <b>746,350</b> user–item pairs → <b>5,300,860</b> served rows for 265,043 users</p></div>'.format(bg2=BG2, n=NAVY),
      "The lakehouse follows the medallion pattern. Bronze keeps raw events exactly as received. Silver cleans them: "
      "deduplication by event id and by content, so that a replay never doubles the data, a bot filter, and event weights. "
      "Features hold the decayed interaction matrix with append-only indexers, and gold holds everything that is served. "
      "Every table except bronze is Delta Lake.")

# ------------------------------------------------------------------ 8. Streaming
luong = [
    ("nap_su_kien", "Kafka → bronze, trigger 15 s"),
    ("tinh_thinh_hanh", "15-min window sliding every minute, 2-min watermark, update mode + MERGE, RocksDB state, trigger 20 s"),
    ("ghi_hien_thi", "Impressions and click feedback → impression log with Change Data Feed, trigger 30 s"),
]
slide("streaming", tieu_de("Data and architecture", "Three Structured Streaming jobs") +
      '<div style="display:flex;gap:48px;flex:1">'
      '<div style="flex:1;display:flex;flex-direction:column;gap:16px">' +
      "".join(
          '<div style="display:flex;flex-direction:column;gap:6px;border-top:1px solid {r};padding:14px 0px 0px 0px">'
          '<p style="font-family:{mo};font-size:28px;font-weight:600;color:{b}">{a}</p>'
          '<p style="font-size:28px;line-height:1.35;color:{t}">{m}</p></div>'.format(r=RULE, mo=M, b=BLUE, a=a, t=TEXT, m=m) for a, m in luong) +
      '<p style="font-size:26px;line-height:1.4;color:{m}">Windows use the Kafka timestamp, so replayed 2015 events and live 2026 clicks share one clock.</p>'.format(m=MUTED) +
      "</div>" + hinh("f07", "The three streaming jobs and the latency budget", cao=600) + "</div>",
      "Three streaming jobs run continuously. The first lands every event in bronze. The second computes the trending table: a "
      "fifteen-minute window sliding every minute, merged into gold every twenty seconds. The third writes the impression log "
      "used by the A/B test. One design point: windows are keyed on the Kafka timestamp, not the original event time, because "
      "the replayed data is from 2015 and live clicks are from 2026.")

# ------------------------------------------------------------------ 9. Airflow
slide("airflow", tieu_de("Data and architecture", "Five Airflow DAGs") +
      '<div style="display:flex;gap:48px;flex:1">'
      '<div style="flex:1;display:flex;flex-direction:column;gap:20px">' +
      bang(["DAG", "Schedule", "What it does"], [
          ["<b>kn_pipeline_hang_ngay</b>", "02:00", "Silver → statistics → matrix → tuning → evaluation → deploy or keep the old model"],
          ["<b>kn_giam_sat_streaming</b>", "15 min", "Restarts the trending stream when its table is stale"],
          ["<b>kn_tinh_ab</b>", "hourly", "Reads the impression log’s Change Data Feed, recomputes the tests"],
          ["<b>kn_bao_tri</b>", "04:00", "Retention, OPTIMIZE, Z-ORDER, VACUUM"],
          ["<b>kn_tai_lap</b>", "manual", "Re-runs training on a recorded Delta version and compares"],
      ], [38, 14, 48], 24) +
      '<p style="font-size:26px;line-height:1.4;color:{m}">Every job is idempotent, so retries and reruns are always safe.</p>'.format(m=MUTED) +
      "</div>" + hinh("f05", "DAG 1, the daily pipeline", cao=600) + "</div>",
      "Five DAGs implement the workflows of the specification. DAG 1, on the right, is the nightly pipeline: it waits for new "
      "data, rebuilds silver and the matrix, tunes ALS, evaluates it and branches — new recommendations only if NDCG is not "
      "worse than the served model. The other four monitor the stream, compute the A/B test hourly, maintain the Delta tables "
      "and reproduce experiments.")

# ------------------------------------------------------------------ 10. ALS
src_p, wp, hp = IMG["eq_pref"]
src_a, wa, ha = IMG["eq_als"]
slide("als", tieu_de("Model and evaluation", "ALS for implicit feedback") +
      '<div style="display:flex;gap:32px;align-items:center;background:{c};border:1px solid {r};border-radius:16px;padding:28px 40px">'
      '<img src="{sp}" alt="Preference and confidence of an observation" style="width:560px;height:{hp}px;object-fit:contain">'
      '<img src="{sa}" alt="ALS objective for implicit feedback" style="width:900px;height:{ha}px;object-fit:contain"></div>'.format(
          c=CARD, r=RULE, sp=src_p, hp=round(560 * hp / wp), sa=src_a, ha=round(900 * ha / wa)) +
      '<div style="display:flex;flex-direction:column;gap:14px">' +
      dong("Every cell counts", "Observed pairs get preference 1 with confidence 1 + α·r; unseen pairs preference 0 with confidence 1", 28, 330) +
      dong("Alternating", "Fix the items and solve every user in closed form, then swap; Spark parallelises across blocks", 28, 330) +
      dong("Grid (27)", "rank {10, 30, 50} × regParam {0.01, 0.1, 1.0} × alpha {1, 10, 40}, selected on NDCG@10", 28, 330) +
      "</div>",
      "We use ALS in the implicit-feedback form of Hu, Koren and Volinsky. A click is not a rating: it tells us about "
      "confidence, not preference. Every cell of the matrix enters the loss: observed pairs with preference one and a "
      "confidence that grows with alpha times the decayed score, unseen pairs with preference zero. Alternating least squares "
      "makes each half-step a set of independent least-squares problems, which Spark distributes. We tuned all 27 combinations.")

# ------------------------------------------------------------------ 11. Tuning
slide("tuning", tieu_de("Model and evaluation", "Tuning: bigger rank, higher alpha") +
      '<p style="font-size:32px;line-height:1.35;color:{n}">Best of 27: <b>rank 50 · regParam 1.0 · alpha 40 → NDCG@10 = 0.0680</b> <span style="color:{m}">(78 minutes on 34 cores)</span></p>'.format(n=NAVY, m=MUTED) +
      '<div style="display:flex;justify-content:center">' + hinh("c01", "NDCG@10 over the tuning grid, one heat map per rank", rong=1300) + "</div>",
      "NDCG grows monotonically with rank and with alpha. With implicit feedback a large alpha gives observed pairs, especially "
      "purchases, much more weight than the empty cells, so the model extracts more signal from very sparse data. The optimum "
      "lies on the edge of the grid, so the natural next step is rank 100 and alpha 80. One honest caveat: hyper-parameters were "
      "selected on the test month, so absolute values are slightly optimistic.")

# ------------------------------------------------------------------ 12. Baselines
slide("baselines", tieu_de("Model and evaluation", "ALS beats both baselines") +
      '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:48px">' +
      so_lon("+1,237 %", "NDCG@10 over global best-sellers (0.0051 → 0.0680); target +30 %") +
      so_lon("+43 %", "NDCG@10 over category best-sellers (0.0475)") +
      so_lon("0.0865", "NDCG@10 of the served configuration (ALS + re-ranking)", ORANGE) +
      "</div>" +
      '<div style="display:flex;justify-content:center">' + hinh("c02", "NDCG@10 and coverage of the baselines, ALS and re-ranked variants", rong=1040) + "</div>",
      "Against the two mandatory baselines ALS wins by a wide margin: thirteen times the global best-seller list, and 43 percent "
      "over best-sellers of the user’s category, which is a much stronger baseline because RetailRocket visitors stay within a "
      "category. ALS also wins on precision, recall and MAP. The served configuration, with novelty re-ranking, is better again.")

# ------------------------------------------------------------------ 13. Popularity bias
slide("bias", tieu_de("Model and evaluation", "Coverage is limited by popularity bias") +
      '<p style="font-size:32px;line-height:1.35;color:{n};width:1600px"><b>99.2 %</b> of ALS slots fall in the 10 % most popular items. Coverage is <b>3.44 %</b> against a structural ceiling of 75 % — the cause is bias, not the number of slots.</p>'.format(n=NAVY) +
      '<div style="display:flex;justify-content:center">' + hinh("c03", "Distribution of recommendation slots over popularity groups", rong=1150) + "</div>",
      "Coverage is the one threshold we did not meet with pure ALS: 3.44 percent against a target of 10. The specification accepts "
      "this if it is analysed. Ten recommendations for 9,467 test users give almost 95 thousand slots for 126 thousand items, so "
      "the ceiling is 75 percent. The real cause is popularity bias: items with few interactions get weak latent vectors and "
      "rarely reach a top ten.")

# ------------------------------------------------------------------ 14. Re-ranking
slide("rerank", tieu_de("Model and evaluation", "Novelty re-ranking: accuracy and diversity together") +
      '<div style="display:flex;gap:48px;flex:1">'
      '<div style="flex:1;display:flex;flex-direction:column;gap:28px">' +
      so_lon("+27 %", "NDCG@10 at β = 1.0 over 200 candidates (0.0680 → 0.0865)", ORANGE, 64) +
      so_lon("+88 %", "coverage (3.44 % → 6.47 %); slots in the top 10 % fall from 99.2 % to 80.8 %", ORANGE, 64) +
      '<p style="font-size:26px;line-height:1.4;color:{m}">Deployed for serving. Beyond β = 1 the usual trade-off returns; no β reaches 10 %.</p>'.format(m=MUTED) +
      "</div>" + hinh("c04", "Accuracy–coverage trade-off of novelty re-ranking", cao=560) + "</div>",
      "As a de-biasing method we re-rank 200 ALS candidates by normalised ALS score plus beta times normalised novelty. Up to beta "
      "equal one, accuracy and diversity improve together, because the test month contains many items that are rare in training. "
      "We deployed that configuration. Reaching ten percent needs candidate sources other than ALS, which is our main future work.")

# ------------------------------------------------------------------ 15. Cold start
slide("coldstart", tieu_de("Model and evaluation", "Cold start and the blended “For you” block") +
      '<div style="display:flex;gap:48px;flex:1">'
      '<div style="width:912px;display:flex;flex-direction:column;gap:20px">' +
      hinh("f11", "Templates of the ten visible slots by user type and A/B group", rong=800) +
      dong("New user", "Top 10 of the newest trending window", 26, 210) +
      dong("&lt; 5 interactions", "Best-sellers of viewed categories + trending", 26, 210) +
      dong("New item", "Items unknown to ALS fill slots 9–10", 26, 210) +
      "</div>" + hinh("s01", "Home page of a user created on the spot", rong=672) + "</div>",
      "Three cold-start strategies are pure functions shared by the batch job and the web application. A brand-new user sees the "
      "newest trending items; a user with fewer than five interactions sees best-sellers of the categories they viewed, "
      "interleaved with trending; and new items that ALS does not know enter through the last two slots. The screenshot is the live "
      "system: a user created with one click immediately gets the new-user strategy.")

# ------------------------------------------------------------------ 16. A/B
slide("abtest", tieu_de("Experiment and lakehouse", "A/B test: blending trending items lowers CTR") +
      '<div style="display:flex;gap:48px;flex:1">'
      '<div style="flex:1;display:flex;flex-direction:column;gap:20px">' +
      dong("Design", "A: ALS only · B: ALS + 30 % trending; stable hash of the user id", 26, 150) +
      dong("Traffic", "350,160 simulated impressions over 7 days, position-dependent click model", 26, 150) +
      so_lon("p = 0.015", "CTR 2.094 % (A) vs 1.978 % (B), z = −2.43: B is 5.5 % worse", ORANGE, 64) +
      dong("Conversion", "0.234 % vs 0.239 %, p = 0.75: no difference", 26, 150) +
      dong("Power", "76,972 impressions per group needed — reached; B below A on all 7 days", 26, 150) +
      "</div>" + hinh("s03", "A/B dashboard of the web application", cao=600) + "</div>",
      "Group A sees ALS only, group B ALS with thirty percent trending items. Real visitors are too few, so impressions are "
      "simulated with a position-dependent click model and labelled as simulated. Over 350 thousand impressions, B has a "
      "significantly lower click-through rate, p equals 0.015, and no difference in conversion. The conclusion holds only under the "
      "assumptions of the simulation, which gives trending items no bonus.")

# ------------------------------------------------------------------ 17. Delta Lake
slide("delta", tieu_de("Experiment and lakehouse", "Delta Lake features in use") +
      bang(["Feature", "How the project uses it"], [
          ["<b>MERGE</b>", "Upserts of recommendation lists, trending windows and impressions; surplus ranks deleted"],
          ["<b>Time travel</b>", "Every training records its feature version; A/B results re-aggregated at the recorded version"],
          ["<b>Schema evolution</b>", "ALTER TABLE ADD COLUMNS price and star rating → model version 2"],
          ["<b>Change Data Feed</b>", "Impression log → the hourly A/B job recomputes only the affected days"],
          ["<b>OPTIMIZE / Z-ORDER</b>", "Nightly compaction; Z-ORDER BY user on the served recommendation table"],
          ["<b>Partitioning, retention</b>", "Silver by date, one file per date; 30 days for files, 60 for the log"],
          ["<b>Concurrency</b>", "Streams and maintenance write the same tables → retry on Delta conflict exceptions"],
      ], [30, 70], 24),
      "Every Delta Lake requirement of the specification is used for a real purpose. MERGE makes every writer idempotent. Time "
      "travel supports reproducibility. Schema evolution produces model version 2. Change Data Feed lets the A/B job read only "
      "new impressions. And because streams and maintenance write the same tables, optimistic concurrency had to be handled "
      "with an explicit retry.")

# ------------------------------------------------------------------ 18. Z-ORDER
slide("zorder", tieu_de("Experiment and lakehouse", "Z-ORDER: one file per user lookup") +
      '<div style="display:flex;gap:48px;flex:1">'
      '<div style="flex:1;display:flex;flex-direction:column;gap:32px">' +
      so_lon("67 → 1.07", "files read per lookup, compaction only vs Z-ORDER BY user", BLUE, 56) +
      so_lon("8,280 → 980 ms", "median latency of the per-user lookup", BLUE, 56) +
      so_lon("8.4×", "faster than compaction alone (11× vs the fragmented table)", ORANGE, 56) +
      "</div>" + hinh("c05", "Latency and files read in the three phases", rong=1040) + "</div>",
      "The hot query of the web application is the per-user lookup. We measured three phases on a copy of the 5.3-million-row "
      "table. Compaction alone barely helps: every compacted file still spans the whole range of user ids. Z-ORDER clusters rows "
      "of the same user, narrows each file’s min-max statistics, and lets data skipping read about one file. Files read is the "
      "reliable figure; latency varies with Wi-Fi.")

# ------------------------------------------------------------------ 19. Tái lập
slide("reproduce", tieu_de("Experiment and lakehouse", "Reproducing an experiment with time travel") +
      '<div style="display:flex;gap:48px;flex:1">'
      '<div style="flex:1;display:flex;flex-direction:column;gap:20px">' +
      so_lon("0.000000", "maximum deviation, re-training on features VERSION AS OF 0", BLUE, 72) +
      dong("Meanwhile", "Silver evolved to version 2 and 857,072 events were replayed", 26, 170) +
      dong("Why", "Fixed seed, append-only indexers, test set stored in the same version", 26, 170) +
      dong("Where", "DAG 5 and the web’s reproduction screen (1.78×10<span style=\"color:{}\">⁻¹⁵</span> unrounded)".format(BLUE), 26, 170) +
      "</div>" + hinh("f09", "Reproduction with Delta time travel", rong=1000) + "</div>",
      "DAG 5 re-ran the selected experiment on version zero of the feature table and compared the result with the recorded "
      "metrics: the deviation is zero to six decimals. This is a meaningful test, because during the run the source tables had "
      "already evolved. It works because the job reads only that version, ALS has a fixed seed, and the indexers are append-only, "
      "so an index means the same user or item in every version.")

# ------------------------------------------------------------------ 20. v2
slide("v2", tieu_de("Experiment and lakehouse", "Schema evolution and model version 2") +
      '<div style="display:flex;gap:56px;flex:1">'
      '<div style="flex:1;display:flex;flex-direction:column;gap:16px">' +
      dong("1", "ALTER TABLE silver ADD COLUMNS (price, star rating): metadata only", 28, 40) +
      dong("2", "MERGE fills both from the catalogue; new rows get them automatically", 28, 40) +
      dong("3", "Version 2 keeps candidates in the user’s price range [0.5·P10, 1.5·P90]", 28, 40) +
      dong("4", "Nightly gate: deploy only if NDCG@10 is not worse than the served model", 28, 40) +
      "</div>"
      '<div style="width:720px;display:flex;flex-direction:column;gap:20px">'
      '<p style="font-size:28px;font-weight:600;color:{n}">Same hyper-parameters (rank 50, reg 1.0, alpha 10)</p>'.format(n=NAVY) +
      bang(["Metric", "v1", "v2"], [
          ["NDCG@10", "0.0574", "<b>0.0587</b> (+2.3 %)"],
          ["Coverage", "2.49 %", "<b>2.70 %</b>"],
          ["Distinct items", "3,137", "<b>3,412</b>"],
      ], [40, 25, 35], 28) +
      '<p style="font-size:26px;line-height:1.4;color:{m}">Deployed v2 (alpha 40): NDCG@10 [__], coverage [__] — manual DAG 1 run, 11 November.</p>'.format(m=MUTED) +
      "</div></div>",
      "Week five of the specification asks for a schema change. We added price and star rating to silver with ALTER TABLE, filled "
      "them with MERGE, and built model version 2, which keeps recommendations inside the user’s usual price range. At equal "
      "hyper-parameters version 2 is better on every metric. The first nightly run kept the old model for a design reason we "
      "explain on the operations slide; after the fix the gate compares like with like.")

# ------------------------------------------------------------------ 21. Vòng khép kín
slide("loop", tieu_de("Live system and operations", "The closed loop, measured live") +
      '<div style="display:flex;gap:48px;flex:1">'
      '<div style="flex:1;display:flex;flex-direction:column;gap:32px">' +
      so_lon("10.3 s", "from Kafka to bronze for three “Add to cart” clicks") +
      so_lon("51 s", "from the clicks to the updated trending table — target 90 s", ORANGE) +
      '<p style="font-size:26px;line-height:1.4;color:{m}">Clicks sent while a stream was down were counted after its restart: the checkpoint kept the planned batch.</p>'.format(m=MUTED) +
      "</div>" + hinh("f08", "Closed loop between the web application and the lakehouse", rong=900) + "</div>",
      "These two criteria were measured on 11 November through the web application’s API. Three add-to-cart clicks reached bronze "
      "about ten seconds after Kafka received them, and the trending table fifty-one seconds after the clicks: twenty seconds of "
      "trigger interval, the micro-batch and the polling. During the first attempt a stream had died; after the restart the "
      "earlier clicks were still counted, which shows exactly-once recovery from the checkpoint.")

# ------------------------------------------------------------------ 22. Vận hành
van_de = [
    ("Path MTU black hole", "From home, 1,400-byte packets vanished: SSH hung at key exchange.",
     "Jump host, ZeroTier MTU 1,280"),
    ("Zombie streaming drivers", "Cancelling an app left the client-mode driver alive; two drivers collided on one checkpoint.",
     "Stop = cancel + kill the driver"),
    ("A gate that never opens", "The nightly grid lacked the served alpha, so no new model could ever win.",
     "Always re-test the served configuration"),
    ("Small files, small memory", "7,334 files for 20,624 rows; one 7.4 GB master for every driver.",
     "One file per date; pool of 1 slot at night"),
]
the = "".join(
    '<div style="display:flex;flex-direction:column;gap:12px;background:{c};border:1px solid {r};border-radius:14px;padding:26px 30px">'
    '<h3 style="font-family:{h};font-size:36px;font-weight:600;color:{n}">{t}</h3>'
    '<p style="font-size:26px;line-height:1.4;color:{tx}">{m}</p>'
    '<p style="font-size:26px;font-weight:600;color:{b}">→ {f}</p></div>'.format(
        c=CARD, r=RULE, h=H, n=NAVY, t=t, tx=TEXT, m=m, b=BLUE, f=f) for t, m, f in van_de)
slide("operations", tieu_de("Live system and operations", "Lessons from a shared, constrained cluster") +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:24px 28px">' + the + "</div>" +
      '<p style="font-size:26px;color:{m}">27 issues found and fixed, each with a regression test — 89 automated tests in total.</p>'.format(m=MUTED),
      "A large part of the work was operations. Four examples. A path-MTU black hole on the home network silently dropped large "
      "packets. Cancelling a Spark application through the Master did not stop its client-mode driver, and the zombie collided "
      "with the new stream on the checkpoint. Our nightly deployment gate could never open, because the nightly grid did not "
      "contain the served hyper-parameters. And small files and small memory forced repartitioning and careful scheduling.")

# ------------------------------------------------------------------ 23. Kết quả
slide("results", tieu_de("Conclusion", "All eight criteria demonstrated on the cluster") +
      bang(["#", "Criterion", "Evidence", "Status"], [
          ["1", "Tuning table, ≥ 9 combinations", "27 combinations; best NDCG@10 = 0.0680", "Met"],
          ["2", "ALS vs 2 baselines", "+1,237 % / +43 %; coverage 3.44 % analysed, 6.47 % served", "Met, coverage analysed"],
          ["3", "Three cold-start strategies", "New user shown live; all three unit-tested", "Met"],
          ["4", "Trending ≤ 90 s after a click", "51 s", "Met"],
          ["5", "Closed loop web → bronze → trending", "10.3 s to bronze", "Met"],
          ["6", "A/B with p-value", "CTR p = 0.015 (B lower), conversion p = 0.75", "Met"],
          ["7", "Reproduction, VERSION AS OF", "Deviation 0.000000", "Met"],
          ["8", "OPTIMIZE / Z-ORDER", "Files read 67 → 1.07, 8.4× faster", "Met"],
      ], [5, 33, 42, 20], 24),
      "To close the loop on the list from the beginning: all eight acceptance criteria were demonstrated on the cluster with the "
      "real data. The only threshold not met, catalogue coverage, is analysed as the specification requires, and the deployed "
      "re-ranking almost doubles it.")

# ------------------------------------------------------------------ 24. Hạn chế
cot = lambda tieu, ds, mau: (
    '<div style="flex:1;display:flex;flex-direction:column;gap:14px;background:{c};border:1px solid {r};border-top:8px solid {m};border-radius:14px;padding:32px">'
    '<h3 style="font-family:{h};font-size:44px;font-weight:600;color:{n}">{t}</h3>'
    '<ul style="font-size:28px;line-height:1.45;color:{tx}">{li}</ul></div>').format(
    c=CARD, r=RULE, m=mau, h=H, n=NAVY, t=tieu, tx=TEXT, li="".join("<li>{}</li>".format(x) for x in ds))
slide("limits", tieu_de("Conclusion", "Limitations and future work") +
      '<div style="display:flex;gap:32px;flex:1">' +
      cot("Limitations", [
          "Coverage below 10 % even with re-ranking",
          "Hyper-parameters chosen on the test month",
          "Simulated A/B traffic; impression-level z-test",
          "Single NameNode, Spark Master and Kafka broker",
          "Personal lists change once per night",
      ], ORANGE) +
      cot("Future work", [
          "Item-to-item and category candidates before re-ranking",
          "A validation period and user-level bootstrap",
          "Sensitivity of the A/B result to trending attractiveness",
          "High availability for HDFS and Kafka",
          "Incremental (online) model updates",
      ], BLUE) + "</div>",
      "We are clear about the limits. Coverage stays below ten percent; hyper-parameters were chosen on the test month; the A/B "
      "traffic is simulated; and the master, NameNode and broker are single points of failure. The most valuable next steps are "
      "more candidate sources before re-ranking, a proper validation protocol, and a sensitivity analysis of the A/B simulation.")

# ------------------------------------------------------------------ 25. Cảm ơn
demo = ["Model quality", "Cold start", "Closed loop ≤ 90 s", "A/B dashboard", "Reproduction"]
slide("thanks", (
    '<p style="font-size:24px;font-weight:600;letter-spacing:3px;text-transform:uppercase;color:{la}">Thank you</p>'
    '<h1 style="font-family:{h};font-size:96px;font-weight:700;line-height:1.08;color:{bg}">Questions — then a live demo</h1>'
    '<div style="display:flex;gap:20px;flex-wrap:wrap">{d}</div>'
    '<div style="flex:1"></div>'
    '<p style="font-family:{mo};font-size:26px;color:#C9D4E5">github.com/chitam31/CS411V_Final-Project_Ecommerce-Recommender-System</p>'
).format(la=LIGHT_ACC, h=H, bg=BG, mo=M, d="".join(
    '<p style="font-size:28px;font-weight:600;color:{n};background:{la};padding:12px 24px;border-radius:12px">{i}. {t}</p>'.format(
        n=NAVY, la=LIGHT_ACC, i=i + 1, t=t) for i, t in enumerate(demo))),
    "Thank you for your attention. We are happy to take questions, and then we will run the live demonstration in this order: "
    "model quality, cold start with a new user, the closed loop with its latency, the A/B dashboard and the reproduction screen.",
    nen=NAVY)
p = os.path.join(SL, "thanks.html")
s = open(p, encoding="utf-8").read().replace("color:{}\">BD03".format(MUTED), "color:#9FB0C8\">BD03").replace(
    "text-align:right;font-size:24px;color:{}".format(MUTED), "text-align:right;font-size:24px;color:#9FB0C8")
open(p, "w", encoding="utf-8").write(s)

assert len(THU_TU) == TONG, len(THU_TU)
deck = {
    "v": 4,
    "createdOnFiles": {"v": 1, "at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")},
    "lists": "css",
    "title": "BD03 Recommender System – Defence",
    "cover": "cover",
    "order": THU_TU,
    "sections": {
        "s1": {"description": "The assignment, its objectives and the eight acceptance criteria", "start": "cover"},
        "s2": {"description": "Dataset, architecture, cluster, lakehouse, streaming and orchestration", "start": "dataset"},
        "s3": {"description": "ALS, tuning, baselines, popularity bias, re-ranking and cold start", "start": "als"},
        "s4": {"description": "A/B test and the Delta Lake features: Z-ORDER, time travel, schema evolution", "start": "abtest"},
        "s5": {"description": "The live closed loop and lessons from operating the cluster", "start": "loop"},
        "s6": {"description": "Results against the criteria, limitations and future work", "start": "results"},
    },
    "faces": {
        "space-grotesk": {"family": "Space Grotesk", "href": "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300..700&display=swap"},
        "inter": {"family": "Inter", "href": "https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap"},
        "jetbrains-mono": {"family": "JetBrains Mono", "href": "https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600&display=swap"},
    },
    "designSystems": [],
}
with open(os.path.join(GOC, "project", "deck.json"), "w", encoding="utf-8") as f:
    json.dump(deck, f, ensure_ascii=False, indent=1)
print("OK", len(THU_TU), "slide")
