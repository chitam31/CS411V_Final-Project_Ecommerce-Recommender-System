// tao_kich_ban.js - dựng "Kịch bản thuyết trình bảo vệ" (tiếng Việt, lời nói tiếng Anh) thành .docx:
// Times New Roman 13, giãn dòng 1,5, A4. Chạy: node tao_kich_ban.js -> BD03_Kich_ban_thuyet_trinh.docx
// Cú pháp nội dung: **đậm**, `mã`.
const fs = require("fs");
const path = require("path");
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, Table, TableRow, TableCell,
  WidthType, BorderStyle, ShadingType, LevelFormat, Footer, PageNumber, PageBreak,
} = require("/usr/local/lib/node_modules_global/docx");

const FONT = "Times New Roman";
const MA = "Courier New";
const XANH = "1F3A68";
const CAM = "B4531F";

function chu(s, them = {}) {
  const ra = [];
  const re = /(\*\*[^*]+\*\*|`[^`]+`)/g;
  let i = 0, m;
  while ((m = re.exec(s))) {
    if (m.index > i) ra.push(new TextRun({ text: s.slice(i, m.index), font: FONT, size: 26, ...them }));
    const t = m[0];
    if (t.startsWith("**")) ra.push(new TextRun({ text: t.slice(2, -2), font: FONT, size: 26, bold: true, ...them }));
    else ra.push(new TextRun({ text: t.slice(1, -1), font: MA, size: 22, ...them }));
    i = m.index + t.length;
  }
  if (i < s.length) ra.push(new TextRun({ text: s.slice(i), font: FONT, size: 26, ...them }));
  return ra;
}

const GIAN = { line: 360, lineRule: "auto" };
const doan = (s, o = {}) => new Paragraph({ children: chu(s), spacing: { ...GIAN, after: 80 }, alignment: AlignmentType.JUSTIFIED, ...o });
const y = (s) => new Paragraph({ children: chu(s), numbering: { reference: "y", level: 0 }, spacing: { ...GIAN, after: 40 } });
const so = (s) => new Paragraph({ children: chu(s), numbering: { reference: "so", level: 0 }, spacing: { ...GIAN, after: 40 } });
const muc = (s) => new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text: s, font: FONT, size: 28, bold: true, color: XANH })] });
const muc2 = (s) => new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: s, font: FONT, size: 26, bold: true, color: XANH })] });
const nhan = (s) => new Paragraph({ children: [new TextRun({ text: s, font: FONT, size: 26, bold: true, color: CAM })], spacing: { ...GIAN, before: 60, after: 20 }, keepNext: true });
const VIEN_LOI = { style: BorderStyle.SINGLE, size: 18, color: "2E6DB4", space: 8 };
// lời nói tiếng Anh: khung nền nhạt, viền trái xanh
const loi = (s) => new Paragraph({
  children: chu(s), alignment: AlignmentType.LEFT, spacing: { ...GIAN, after: 60 },
  indent: { left: 284, right: 113 }, border: { left: VIEN_LOI },
  shading: { type: ShadingType.CLEAR, fill: "EEF3FA", color: "auto" },
});
const ngat = () => new Paragraph({ children: [new PageBreak()] });

const VIEN = { style: BorderStyle.SINGLE, size: 4, color: "8C96A3" };
const TONG = 9071; // A4 21 cm − lề trái 3 cm − lề phải 2 cm = 16 cm
function bang(cot, dong, rong, toMau = null) {
  const w = rong.map((r) => Math.round((TONG * r) / 100));
  w[w.length - 1] = TONG - w.slice(0, -1).reduce((a, b) => a + b, 0);
  const o = (s, dau, j, nen) => new TableCell({
    width: { size: w[j], type: WidthType.DXA }, borders: { top: VIEN, bottom: VIEN, left: VIEN, right: VIEN },
    shading: dau ? { type: ShadingType.CLEAR, fill: "DCE6F2", color: "auto" } : nen ? { type: ShadingType.CLEAR, fill: nen, color: "auto" } : undefined,
    margins: { top: 40, bottom: 40, left: 90, right: 90 },
    children: [new Paragraph({ children: chu(s, dau ? { bold: true } : {}), spacing: { line: 276, lineRule: "auto" } })],
  });
  return new Table({
    width: { size: TONG, type: WidthType.DXA }, columnWidths: w,
    rows: [cot, ...dong].map((d, i) => new TableRow({
      tableHeader: i === 0, cantSplit: true,
      children: d.map((x, j) => o(x, i === 0, j, i > 0 && toMau ? toMau(d) : null)),
    })),
  });
}
const mmss = (g) => `${Math.floor(g / 60)}:${String(g % 60).padStart(2, "0")}`;

// ------------------------------------------------------------------ nội dung từng slide
const T = "Tâm", QA = "Quốc Anh";
const S = [
  { id: "cover", tieu: "Cover", nguoi: T, giay: 35,
    loi: ["Good morning, members of the committee. We are Le Chi Tam and Le Nguyen Quoc Anh, supervised by Doctor Cao Tien Dung. Our project is Topic 3 of CS411V: a product recommender for a simulated e-commerce marketplace. In the next twenty minutes we show how the system is built, what the model achieves on real data, and how we proved all eight acceptance criteria on six laboratory machines."],
    y: ["Chào hội đồng, giới thiệu hai thành viên và giảng viên hướng dẫn.", "Đề tài 3: hệ thống gợi ý cho sàn thương mại điện tử mô phỏng.", "Hứa hẹn ba điều: cách xây dựng, kết quả mô hình, bằng chứng cho **8 tiêu chí**."],
    chi: "Tên đề tài và tên hai thành viên trên bìa." },
  { id: "assignment", tieu: "What the assignment asks", nguoi: T, giay: 45,
    loi: ["Let us start with what the assignment asks. It has five objectives. O1 is the data platform: events arrive through Kafka and are stored in a lakehouse on HDFS with Delta Lake. O2 is the model: ALS for implicit feedback, a tuning grid, two baselines and three cold-start strategies. O3 is streaming: a “trending now” block that reacts to a click within ninety seconds. O4 is an A/B experiment with a statistical conclusion. And O5 covers operations: five Airflow DAGs, a web application and reproducible experiments."],
    y: ["5 mục tiêu O1–O5: nền tảng dữ liệu, mô hình, streaming, thí nghiệm A/B, vận hành.", "Nhấn hai con số của đề: thịnh hành **≤ 90 giây**, **5 DAG**."],
    chi: "Lần lượt từng dòng O1 → O5." },
  { id: "criteria", tieu: "Eight acceptance criteria", nguoi: T, giay: 40,
    loi: ["The specification turns these objectives into eight measurable acceptance criteria: a tuning table, a comparison with two baselines, three cold-start strategies, trending within ninety seconds, the closed loop from a web click to the lakehouse, an A/B result with a p-value, reproduction with time travel, and Z-ORDER figures. Please keep this list in mind. At the end we come back to it and show the evidence for each one."],
    y: ["8 tiêu chí nghiệm thu; đọc nhanh, không giải thích chi tiết.", "Báo trước: slide kết quả (slide 23) sẽ quay lại danh sách này."],
    chi: "Quét tay dọc 8 thẻ tiêu chí." },
  { id: "dataset", tieu: "RetailRocket clickstream", nguoi: T, giay: 55,
    loi: ["We use the RetailRocket dataset: almost 2.9 million events over 139 days, on more than four hundred thousand items. The matrix is extremely sparse, a density of 1.8 times ten to the minus five, and most visitors appear only once. That fact shapes every result later. A Kafka producer replays the log, one day in thirty seconds, and adds about five percent synthetic new users so that cold start can be exercised. Evaluation uses a temporal split: four months for training, the last month for testing, with 9,467 test users. Events are weighted — view one, cart three, purchase five — and decay with age."],
    y: ["**2,89 triệu** sự kiện, 139 ngày, **417.053** sản phẩm; mật độ **1,8·10⁻⁵**.", "Bộ phát Kafka: 1 ngày dữ liệu = 30 giây; **4,8 %** user mới tổng hợp cho cold start.", "Chia theo thời gian: 4 tháng train, tháng cuối test, **9.467** user test.", "Trọng số xem 1 – giỏ 3 – mua 5, suy giảm λ = 0,01/ngày."],
    chi: "Ba con số lớn ở trên, rồi ba dòng Replay / Split / Weights." },
  { id: "architecture", tieu: "Six layers, one direction of flow", nguoi: T, giay: 60,
    loi: ["Here is the architecture. It has six layers, and data flows in one direction. Events come from two sources: the replay producer and the web application itself. They enter Kafka, are stored in the lakehouse on HDFS with Delta Lake, and are processed by Spark: three streaming jobs and about a dozen batch jobs. Airflow orchestrates the batch work with five DAGs, and a FastAPI web application serves the recommendations. Everything runs in Docker, and every script reads one shared directory file that says which machine plays which role. So moving a role to another machine is a one-line change — and we actually did that when we moved the web application to another host."],
    y: ["6 lớp: nguồn → Kafka → lưu trữ (HDFS + Delta) → xử lý (Spark) → điều phối (Airflow) → phục vụ (FastAPI).", "Dữ liệu chảy **một chiều**; mọi thứ chạy Docker.", "Một tệp danh bạ `cau_hinh/cum.env` quyết định vai trò máy → đã chuyển web sang labsoe-18 bằng một dòng."],
    chi: "Hình f01 từ trái sang phải, theo mũi tên." },
  { id: "cluster", tieu: "Deployed on six laboratory machines", nguoi: T, giay: 45,
    loi: ["The system is deployed on six laboratory machines connected by a ZeroTier overlay network. The master, labsoe-11, runs the NameNode, the Spark Master, all drivers and Airflow. Five workers provide 34 cores and 13 gigabytes of executor memory, and five DataNodes store the data with replication factor two. Kafka runs on a separate machine. One important constraint: each machine has only seven gigabytes of RAM and is shared with other groups, so every memory setting was sized from measurements, not from defaults."],
    y: ["Master labsoe-11: NameNode, Spark Master, mọi driver, Airflow.", "5 worker: **34 lõi, 13 GB** executor; 5 DataNode, sao chép **2**.", "Mạng ZeroTier “ttunet” trên Wi-Fi lab; mỗi máy chỉ **7 GB RAM**, dùng chung với nhóm khác."],
    chi: "Hình f02: master ở giữa, 5 worker xung quanh." },
  { id: "lakehouse", tieu: "A medallion lakehouse on HDFS", nguoi: T, giay: 50,
    loi: ["Inside HDFS the lakehouse follows the medallion pattern. Bronze keeps raw events exactly as received, append-only and partitioned by date. Silver cleans them: we deduplicate by event id and also by content, so that a replay never doubles the data; we filter bots and assign event weights. Features hold the decayed interaction matrix with append-only indexers, which matters later for reproducibility. Gold holds everything that is served: recommendation lists, trending windows, the impression log, A/B results and the model history. Every table except bronze is Delta Lake."],
    y: ["Bronze: dữ liệu thô, chỉ ghi thêm, theo ngày.", "Silver: bỏ trùng theo mã **và theo nội dung** (phát lại không nhân đôi), lọc bot, trọng số.", "Features: ma trận suy giảm, indexer chỉ nối thêm (nền tảng cho tái lập).", "Gold: mọi thứ được phục vụ. Mọi bảng trừ bronze là Delta."],
    chi: "Bốn thẻ Bronze → Silver → Features → Gold." },
  { id: "streaming", tieu: "Three Structured Streaming jobs", nguoi: T, giay: 55,
    loi: ["Three Structured Streaming jobs run continuously. The first lands every event in bronze, every fifteen seconds. The second computes the trending table: a fifteen-minute window sliding every minute, with a two-minute watermark, merged into gold every twenty seconds. The third writes impressions and clicks into the impression log used by the A/B test. The figure shows the latency budget. One design point: windows are keyed on the Kafka timestamp, not the original event time, because the replayed data is from 2015 and live clicks are from 2026."],
    y: ["Luồng 1: Kafka → bronze, trigger **15 giây**.", "Luồng 2: cửa sổ **15 phút** trượt 1 phút, watermark 2 phút, MERGE vào gold mỗi **20 giây**.", "Luồng 3: impression và click → nhật ký hiển thị (có Change Data Feed).", "Cửa sổ theo **thời điểm Kafka**, vì dữ liệu phát lại năm 2015, click thật năm 2026."],
    chi: "Ba dòng bên trái, rồi ngân sách độ trễ trên hình f07." },
  { id: "airflow", tieu: "Five Airflow DAGs", nguoi: T, giay: 50, chuyen: true,
    loi: ["Batch work is orchestrated by five Airflow DAGs. DAG 1, on the right, is the nightly pipeline at two a.m.: it waits for new data, rebuilds silver and the matrix, tunes ALS, evaluates it, and branches — it deploys new recommendations only if NDCG is not worse than the served model; otherwise it keeps the old one. The other four restart the trending stream when it goes stale, recompute the A/B test every hour, maintain the Delta tables every night, and reproduce experiments on demand.",
      "That completes the platform. Now Quoc Anh will present the model and the evaluation."],
    y: ["DAG 1 lúc 02:00: chờ dữ liệu → silver → ma trận → tuning → đánh giá → **rẽ nhánh** (chỉ triển khai khi NDCG không kém).", "4 DAG còn lại: giám sát streaming 15 phút, A/B mỗi giờ, bảo trì 04:00, tái lập thủ công.", "**Chuyển lượt** sang Quốc Anh."],
    chi: "Bảng 5 DAG, rồi nhánh rẽ trên hình DAG 1 (f05)." },
  { id: "als", tieu: "ALS for implicit feedback", nguoi: QA, giay: 55,
    loi: ["Thank you. For the model we use ALS in the implicit-feedback form of Hu, Koren and Volinsky. A click is not a rating: it tells us about confidence, not preference. So every cell of the matrix enters the loss. Observed pairs get preference one, with confidence one plus alpha times the decayed score; unseen pairs get preference zero with confidence one. Alternating least squares fixes the items and solves every user in closed form, then swaps, so each half-step is a set of independent problems that Spark distributes. We tuned all 27 combinations of rank, regParam and alpha, selected on NDCG at ten."],
    y: ["Click không phải rating: tách **preference** (0/1) và **confidence** c = 1 + α·r.", "**Mọi ô** vào hàm mất mát, kể cả ô trống (p = 0, c = 1).", "Xen kẽ: cố định item giải user dạng đóng, rồi đổi vai; Spark song song theo khối.", "Lưới **27** tổ hợp: rank {10, 30, 50} × regParam {0,01; 0,1; 1,0} × alpha {1, 10, 40}."],
    chi: "Hai công thức, rồi dòng “Grid (27)”." },
  { id: "tuning", tieu: "Tuning: bigger rank, higher alpha", nguoi: QA, giay: 50,
    loi: ["This heat map shows NDCG at ten over the whole grid, one panel per rank. NDCG grows monotonically with rank and with alpha. With implicit feedback a large alpha gives observed pairs, especially purchases, much more weight than the empty cells, so the model extracts more signal from very sparse data. The best configuration is rank 50, regParam 1.0, alpha 40, with NDCG at ten of 0.0680. The optimum lies on the edge of the grid, so the natural next step is rank 100 and alpha 80. The grid was chosen on the test month, so we checked it: choosing on the first fifteen days and reporting on the last sixteen selects the same configuration."],
    y: ["NDCG **tăng đơn điệu** theo rank và alpha.", "Tốt nhất: rank 50, regParam 1,0, alpha 40 → NDCG@10 = **0,0680**.", "Tối ưu ở biên lưới → thử rank 100, alpha 80.", "Tự nói trước hạn chế và cách đã kiểm tra: chọn trên 15 ngày đầu, báo cáo trên 16 ngày sau → **cùng cấu hình**, lạc quan chỉ 0,0002 (dòng chữ dưới hình; chi tiết ở slide dự phòng 26)."],
    chi: "Ô đậm nhất ở góc phải của bảng nhiệt rank 50." },
  { id: "baselines", tieu: "ALS beats both baselines", nguoi: QA, giay: 45,
    loi: ["Against the two mandatory baselines ALS wins by a wide margin. Compared with global best-sellers, NDCG at ten rises from 0.0051 to 0.0680: plus 1,237 percent, where the target was only plus thirty. Compared with best-sellers of the user's own category — a much stronger baseline, because RetailRocket visitors stay within one category — ALS is still forty-three percent better. ALS also wins on precision, recall and MAP. And the configuration we actually serve, ALS with novelty re-ranking, is better again: 0.0865."],
    y: ["So bán chạy toàn sàn: 0,0051 → 0,0680, **+1.237 %** (ngưỡng +30 %).", "So bán chạy theo danh mục (baseline mạnh hơn): **+43 %**.", "Thắng cả P@10, R@10, MAP@10; cấu hình phục vụ **0,0865**."],
    chi: "Ba con số lớn bên trái, rồi biểu đồ c02." },
  { id: "bias", tieu: "Coverage is limited by popularity bias", nguoi: QA, giay: 50,
    loi: ["Coverage is the one threshold we did not meet with pure ALS: 3.44 percent against a target of ten. The specification accepts this if it is analysed, so here is the analysis. It is not a structural limit: ten recommendations for 9,467 test users give almost 95 thousand slots for 126 thousand items, so the ceiling is about seventy-five percent. The real cause is popularity bias, shown in this chart: 99.2 percent of ALS slots fall on the ten percent most popular items. Items with few interactions get weak latent vectors and rarely reach a top ten."],
    y: ["Coverage ALS **3,44 %** < ngưỡng 10 %: đề cho phép nếu có phân tích.", "Trần cấu trúc **≈ 75 %** (≈ 95 nghìn ô cho 126 nghìn item) → không phải do thiếu chỗ.", "Nguyên nhân: **thiên lệch phổ biến**, 99,2 % ô thuộc 10 % item phổ biến nhất."],
    chi: "Cột cao nhất (nhóm phổ biến nhất) trên biểu đồ c03." },
  { id: "rerank", tieu: "Novelty re-ranking", nguoi: QA, giay: 55,
    loi: ["As a de-biasing method we re-rank two hundred ALS candidates by the normalised ALS score plus beta times normalised novelty. The chart shows the trade-off. Up to beta equal to one, accuracy and diversity improve together: NDCG rises twenty-seven percent to 0.0865, and coverage rises eighty-eight percent to 6.47 percent. That happens because the test month contains many items that are rare in training. We deployed this configuration. To reach ten percent we tested, offline, items co-viewed with the user's own items in the last three slots: coverage rises to 14.5 percent and NDCG rises too. That mix is not deployed yet."],
    y: ["Xếp lại 200 ứng viên: điểm ALS chuẩn hóa + β × độ mới chuẩn hóa.", "β = 1,0: NDCG **+27 %** (0,0865), coverage **+88 %** (6,47 %); ô thuộc top 10 % giảm 99,2 % → 80,8 %.", "Đã triển khai. Thí nghiệm offline 11/11: 3 ô cuối lấy món **đồng xuất hiện** → coverage **14,5 %** (vượt 10 %), NDCG 0,0892; **chưa triển khai** (dòng chữ dưới hai số lớn)."],
    chi: "Điểm β = 1,0 trên đường cong c04." },
  { id: "coldstart", tieu: "Cold start and the blended “For you” block", nguoi: QA, giay: 50,
    loi: ["ALS has no vector for a new user or a new item, so we wrote three cold-start strategies as pure functions shared by the batch job and the web application. A brand-new user sees the newest trending items. A user with fewer than five interactions sees best-sellers of the categories they viewed, interleaved with trending. New items that ALS does not know enter through slots nine and ten. The screenshot is the live system: a user created with one click immediately gets the new-user strategy, and the page marks that user as outside the A/B experiment. Product names and pictures are illustrations, because RetailRocket is anonymised."],
    y: ["User mới: top thịnh hành cửa sổ mới nhất.", "User **< 5** tương tác: bán chạy theo danh mục đã xem, xen kẽ thịnh hành.", "Item mới: chen vào **ô 9–10**.", "Ảnh chụp: user tạo tại chỗ, ghi “ngoài thí nghiệm A/B”; tên/ảnh sản phẩm là **minh họa**."],
    chi: "Ba dòng chiến lược, rồi ảnh chụp trang chủ người dùng mới." },
  { id: "abtest", tieu: "A/B test: blending trending items lowers CTR", nguoi: QA, giay: 65,
    loi: ["Next, the A/B test. Group A sees ALS only; group B sees ALS with thirty percent trending items. Users are assigned by a stable hash of their id. Real visitors are too few, so impressions are simulated with a position-dependent click model and labelled as simulated. Over 350 thousand impressions in seven days, group B has a significantly lower click-through rate: 1.978 against 2.094 percent, p equals 0.015. Conversion shows no difference, p equals 0.75. Taking the user as the unit, a bootstrap over users still gives p equals 0.029. The conclusion holds only under the assumptions of the simulation. The dashboard reads p equals 0.0135 because it also counts 230 real web impressions logged on 11 November."],
    y: ["A: chỉ ALS; B: ALS + **30 %** thịnh hành (ô 3, 6, 8); chia nhóm bằng băm mã user.", "**350.160** impression mô phỏng, 7 ngày; CTR A **2,094 %** – B **1,978 %**, z = −2,43, **p = 0,015**.", "Chuyển đổi p = 0,75: không khác; cỡ mẫu cần 76.972/nhóm — đã đủ. Tính theo user (bootstrap): **p = 0,029**, kết luận giữ nguyên.", "Bảng web ghi **p = 0,0135** vì gộp 8 ngày (thêm 230 impression thật ngày 11/11)."],
    chi: "Số p = 0.015 màu cam, rồi ảnh bảng điều khiển A/B." },
  { id: "delta", tieu: "Delta Lake features in use", nguoi: QA, giay: 45,
    loi: ["Every Delta Lake requirement of the specification is used for a real purpose. MERGE makes every writer idempotent. Time travel supports reproducibility: every training records its feature version. Schema evolution produced model version two. Change Data Feed lets the hourly A/B job read only new impressions. OPTIMIZE and Z-ORDER run every night. And because streams and maintenance write the same tables, optimistic concurrency had to be handled with an explicit retry."],
    y: ["MERGE → mọi job ghi lặp lại vẫn đúng (idempotent).", "Time travel → tái lập; schema evolution → mô hình v2; CDF → job A/B chỉ đọc phần mới.", "Xung đột ghi đồng thời → bắt ngoại lệ Delta và thử lại."],
    chi: "Cột trái của bảng, từ trên xuống." },
  { id: "zorder", tieu: "Z-ORDER: one file per user lookup", nguoi: QA, giay: 45,
    loi: ["The hot query of the web application is the per-user lookup. We measured three phases on a copy of the 5.3-million-row table. Compaction alone barely helps: every compacted file still spans the whole range of user ids. Z-ORDER clusters rows of the same user, narrows each file's min-max statistics, and lets data skipping read about one file. Files read per lookup drop from 67 to 1.07, and the median latency from 8,280 to 980 milliseconds, 8.4 times faster than compaction alone. Files read is the reliable figure; latency varies with Wi-Fi."],
    y: ["Truy vấn nóng: lấy gợi ý theo user, bảng **5,3 triệu** dòng.", "Chỉ OPTIMIZE gần như không giúp; Z-ORDER thu hẹp min/max → data skipping.", "Tệp đọc **67 → 1,07**; trung vị **8.280 → 980 ms**; nhanh **8,4 lần**."],
    chi: "Ba con số, rồi hai biểu đồ c05." },
  { id: "reproduce", tieu: "Reproducing an experiment with time travel", nguoi: QA, giay: 45,
    loi: ["DAG 5 re-ran the selected experiment on version zero of the feature table and compared the result with the recorded metrics: the deviation is zero to six decimals. This is a meaningful test, because during the run the source tables had already evolved: silver was at version two and 857 thousand events had been replayed. It works because the job reads only that version, ALS has a fixed seed, and the indexers are append-only, so an index means the same user or item in every version."],
    y: ["Chạy lại trên features `VERSION AS OF 0`: độ lệch **0,000000** (1,78·10⁻¹⁵ khi không làm tròn).", "Có ý nghĩa vì nguồn đã thay đổi: silver phiên bản 2, **857.072** sự kiện phát lại.", "Ba lý do: đọc đúng phiên bản, hạt giống cố định, indexer chỉ nối thêm."],
    chi: "Số 0.000000, rồi hình f09." },
  { id: "v2", tieu: "Schema evolution and model version 2", nguoi: QA, giay: 50, chuyen: true,
    loi: ["Week five asks for a schema change. We added price and star rating to silver with ALTER TABLE, filled them with MERGE, and built model version two, which keeps recommendations inside the user's usual price range. At equal hyper-parameters version two is better on every metric: NDCG plus 2.1 percent, coverage from 3.44 to 3.72 percent. Small next to re-ranking, but consistent. And on 11 November the scheduled nightly run retrained and deployed version two by itself, without anyone touching it.",
      "Now Tam will show the live system and conclude."],
    y: ["`ALTER TABLE … ADD COLUMNS (price, star rating)` chỉ đổi metadata; MERGE điền giá trị.", "v2 lọc theo tầm giá của user: NDCG **0,0680 → 0,0694** (+2,1 %), coverage **3,44 → 3,72 %**, 4.346 → 4.699 item.", "Ngày 11/11 DAG chạy theo lịch **tự triển khai** v2.", "**Chuyển lượt** về Tâm."],
    chi: "Bốn bước bên trái, rồi bảng v1/v2." },
  { id: "loop", tieu: "The closed loop, measured live", nguoi: T, giay: 50,
    loi: ["Thank you. These two criteria were measured on 11 November through the web application. We clicked “Add to cart” three times. The events reached bronze about ten seconds after Kafka received them, and the trending table fifty-one seconds after the clicks, against a target of ninety. Those seconds are the twenty-second trigger, the micro-batch and the polling. During the first attempt a stream had died; after the restart the earlier clicks were still counted, which shows exactly-once recovery from the checkpoint. We will repeat this click in the demo."],
    y: ["Kafka → bronze **10,3 giây**; bấm → bảng thịnh hành **51 giây** (ngưỡng 90).", "51 giây = trigger 20 giây + micro-batch + thời gian trang hỏi lại.", "Luồng từng chết rồi chạy lại vẫn tính đủ click cũ → phục hồi exactly-once từ checkpoint.", "Báo trước: sẽ bấm lại trong demo."],
    chi: "Hai con số, rồi vòng khép kín trên hình f08." },
  { id: "operations", tieu: "Lessons from a shared, constrained cluster", nguoi: T, giay: 50,
    loi: ["A large part of the work was operations: we logged thirty-one issues and wrote a hundred and nine automated tests. Four examples. A path-MTU black hole on the home network silently dropped large packets, so SSH hung. Cancelling a Spark application did not stop its client-mode driver, and the zombie collided with the new stream on the checkpoint. Our nightly deployment gate could never open, because the nightly grid did not contain the served hyper-parameters. And small files and small memory forced one file per date and careful scheduling."],
    y: ["**31 lỗi** đã ghi nhận và sửa, **109 kiểm thử** tự động.", "MTU: gói lớn bị rơi → jump host, MTU ZeroTier 1.280.", "Driver “ma” tranh checkpoint → dừng = hủy app + giết driver.", "Cổng triển khai không bao giờ mở → luôn thử lại cấu hình đang phục vụ; tệp nhỏ, RAM nhỏ → 1 tệp/ngày, pool 1 chỗ ban đêm."],
    chi: "Bốn thẻ, mỗi thẻ một câu." },
  { id: "results", tieu: "All eight criteria demonstrated", nguoi: T, giay: 45,
    loi: ["To close the loop on the list from the beginning, here are the eight criteria with their evidence: 27 tuning combinations; plus 1,237 and plus 43 percent over the baselines; cold start shown live; trending in 51 seconds; 10.3 seconds to bronze; an A/B p-value of 0.015; a reproduction deviation of zero; and files read cut from 67 to about one. All eight were demonstrated on the cluster with the real data. The only threshold not met in production, catalogue coverage, is analysed as the specification requires; the deployed re-ranking almost doubles it, and an offline mix with co-occurrence candidates passes it."],
    y: ["Đọc cột Evidence từ trên xuống; tất cả **Met**.", "Coverage là ngưỡng duy nhất chưa đạt trong hệ thống đang chạy — đã phân tích, xếp lại gần như gấp đôi (3,44 → 6,47 %), offline với ô đồng xuất hiện đạt **14,5 %**."],
    chi: "Cột Evidence, dừng ở dòng 2 (coverage)." },
  { id: "limits", tieu: "Limitations and future work", nguoi: T, giay: 35,
    loi: ["We are also clear about the limits. Served coverage is 6.5 percent; 14.5 percent so far only offline. The main grid was chosen on the test month, although a validation check gives the same choice; the A/B traffic is simulated; and the master, NameNode and broker are single points of failure. The next steps are to deploy the co-occurrence slots and re-run the A/B test, a full validation protocol, and a sensitivity analysis of the A/B simulation."],
    y: ["Hạn chế: coverage đang phục vụ 6,5 % (14,5 % mới ở offline), lưới chính chọn trên tháng test (kiểm tra validation: cùng lựa chọn), A/B mô phỏng (theo user vẫn đúng), điểm lỗi đơn.", "Hướng phát triển: triển khai 3 ô đồng xuất hiện rồi chạy lại A/B, đủ lưới validation và chia trượt, phân tích độ nhạy A/B, HA cho HDFS/Kafka."],
    chi: "Cột cam (Limitations) rồi cột xanh (Future work)." },
  { id: "thanks", tieu: "Thank you", nguoi: T, giay: 30,
    loi: ["Thank you for your attention. We are happy to take your questions. After that, or now if the committee prefers, we will run a short live demonstration: model quality, cold start with a new user, the closed loop with its latency, the A/B dashboard and the reproduction screen."],
    y: ["Cảm ơn, mời đặt câu hỏi.", "Nêu thứ tự 5 bước demo; để hội đồng chọn demo trước hay hỏi trước."],
    chi: "Danh sách 5 bước demo." },
];

// mốc thời gian và tốc độ nói
let moc = 0;
const tongNguoi = { [T]: 0, [QA]: 0 };
S.forEach((s, i) => {
  s.so = i + 1;
  moc += s.giay; s.moc = moc;
  tongNguoi[s.nguoi] += s.giay;
  s.tu = s.loi.join(" ").split(/\s+/).length;
});
if (moc !== 1200) throw new Error("Tổng thời lượng phải là 1.200 giây, đang là " + moc);

// ------------------------------------------------------------------ dựng tài liệu
const ND = [];
const giua = (text, o = {}, sp = {}) => new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 60, ...sp }, children: [new TextRun({ text, font: FONT, size: 26, ...o })] });
ND.push(giua("TRƯỜNG ĐẠI HỌC TÂN TẠO · CS411V DỮ LIỆU LỚN", { bold: true }));
ND.push(giua("KỊCH BẢN THUYẾT TRÌNH BẢO VỆ ĐỒ ÁN", { size: 32, bold: true, color: XANH }, { before: 120 }));
ND.push(giua("Đề tài 3 – Hệ thống gợi ý sản phẩm thương mại điện tử (bd03_khuyen_nghi)", { italics: true }));
ND.push(giua("Lê Chí Tâm (2302220) · Lê Nguyễn Quốc Anh (2302283)", {}));
ND.push(giua("Giảng viên hướng dẫn: TS. Cao Tiến Dũng", {}));
ND.push(giua("Bảo vệ ngày 18/11/2026 · 25 slide (+1 slide dự phòng) · 20 phút trình bày + hỏi đáp + demo khoảng 5 phút", {}, { after: 240 }));

ND.push(muc("Cách dùng kịch bản"));
ND.push(y("Phần trình bày nói bằng **tiếng Anh** vì slide bằng tiếng Anh. Khung xanh là lời nói gợi ý, viết sẵn ở tốc độ khoảng **110–120 từ/phút**; đọc to với đồng hồ bấm giờ để chỉnh nhịp."));
ND.push(y("**Không cần thuộc từng chữ.** Thuộc câu mở đầu của mỗi slide, các **số in đậm** ở phần Ý chính và câu chuyển lượt; phần còn lại nói bằng lời của mình."));
ND.push(y(`Mỗi slide ghi **mốc kết thúc** (phút:giây tính từ lúc bắt đầu). Khi tập, so đồng hồ ở ba mốc: **${mmss(S[8].moc)}** (hết slide 9), **${mmss(S[19].moc)}** (hết slide 20) và **20:00**.`));
ND.push(y("Nếu hội đồng cho phép trình bày bằng tiếng Việt: dùng phần **Ý chính** làm dàn ý, giữ nguyên thời lượng."));
ND.push(y("Số liệu trong kịch bản khớp với báo cáo, slide và bộ câu hỏi – đáp; khi bị hỏi, trả lời theo tài liệu hỏi – đáp."));

// ---- 1. phân công
ND.push(muc("1. Phân công và thời lượng"));
ND.push(doan(`Chia theo các phần của slide: **Tâm** mở đầu, dữ liệu và kiến trúc (slide 1–9), hệ thống chạy thật, vận hành và kết luận (slide 21–25): **${mmss(tongNguoi[T])}**. **Quốc Anh** trình bày mô hình, đánh giá, thí nghiệm và lakehouse (slide 10–20): **${mmss(tongNguoi[QA])}**. Chỉ có **hai lần chuyển lượt** (sau slide 9 và sau slide 20). Muốn đổi phân công thì đổi theo nguyên cả phần để không tăng số lần chuyển lượt.`));
ND.push(bang(["#", "Slide", "Người nói", "Thời lượng", "Mốc kết thúc"],
  S.map((s) => [String(s.so), s.tieu + (s.chuyen ? " **→ chuyển lượt**" : ""), s.nguoi, `${s.giay} giây`, mmss(s.moc)]),
  [6, 50, 16, 14, 14], (d) => (d[2] === QA ? "F4F7FB" : null)));
ND.push(doan("Hàng tô nền nhạt là phần của Quốc Anh.", { spacing: { ...GIAN, before: 60, after: 80 } }));

// ---- 2. kịch bản từng slide
ND.push(ngat());
ND.push(muc("2. Kịch bản từng slide"));
const phan = { 1: "Phần 1 – Mở đầu, dữ liệu và kiến trúc (Tâm)", 10: "Phần 2 – Mô hình, đánh giá, thí nghiệm và lakehouse (Quốc Anh)", 21: "Phần 3 – Hệ thống chạy thật, vận hành và kết luận (Tâm)" };
S.forEach((s) => {
  if (phan[s.so]) ND.push(new Paragraph({ children: [new TextRun({ text: phan[s.so], font: FONT, size: 26, bold: true, italics: true, color: "5F6B7A" })], spacing: { ...GIAN, before: 200, after: 40 }, keepNext: true }));
  ND.push(muc2(`Slide ${s.so} · ${s.tieu}`));
  ND.push(new Paragraph({
    spacing: { ...GIAN, after: 40 }, keepNext: true,
    children: [
      new TextRun({ text: "Người nói: ", font: FONT, size: 26, color: "5F6B7A" }),
      new TextRun({ text: s.nguoi, font: FONT, size: 26, bold: true }),
      new TextRun({ text: `   ·   ${s.giay} giây (khoảng ${s.tu} từ)   ·   mốc kết thúc ${mmss(s.moc)}`, font: FONT, size: 26, color: "5F6B7A" }),
    ],
  }));
  ND.push(nhan("Lời nói (tiếng Anh)"));
  s.loi.forEach((p) => ND.push(loi(p)));
  ND.push(nhan("Ý chính (nếu quên lời)"));
  s.y.forEach((p) => ND.push(y(p)));
  ND.push(new Paragraph({ spacing: { ...GIAN, after: 120 }, children: [new TextRun({ text: "Chỉ vào: ", font: FONT, size: 26, bold: true, color: CAM }), ...chu(s.chi)] }));
});

// ---- 3. demo
ND.push(ngat());
ND.push(muc("3. Lời dẫn phần demo (khoảng 5 phút)"));
ND.push(doan("Thứ tự theo slide cảm ơn. Người thao tác máy: **Tâm**; người nói: **Quốc Anh** (để Tâm tập trung bấm, Quốc Anh nói lời dẫn). Web ở `http://10.68.71.149:8000` (trong mạng ZeroTier). Nếu mạng hỏng: dùng ảnh chụp trong slide 15–16 và báo cáo, nói rõ “đây là ảnh chụp ngày 11/11”."));

const demo = [
  { tieu: "Bước 1 · Chất lượng mô hình (khoảng 1 phút)",
    lam: ["Bấm menu **Chất lượng mô hình** (`/mo-hinh`).", "Cuộn qua: bảng so sánh ALS – 2 baseline (dòng “Ngưỡng đạt”), bảng tuning 27 dòng, lịch sử mô hình (dòng `als_v2_r20261110T230924` trạng thái triển khai), mục OPTIMIZE / ZORDER cuối trang."],
    noi: "This screen reads directly from the gold tables. At the top, ALS against the two baselines on every metric, with the thresholds. Below, the twenty-seven-row tuning table of the latest run, sorted by NDCG. The history shows that model version two was deployed on 11 November by the nightly pipeline. And at the bottom, the Z-ORDER measurements from the slides." },
  { tieu: "Bước 2 · Cold start với người dùng mới (khoảng 1 phút)",
    lam: ["Về **Trang chủ** → bấm **+ Người dùng mới (cold start)**.", "Chỉ vào: mã `moi_xxxxxxxx`, nhãn chiến lược `nguoi_moi`, dòng “ngoài thí nghiệm A/B”, 10 ô có nhãn **Thịnh hành** trùng khối “Đang thịnh hành”.", "Nếu còn thời gian: mở 2–3 sản phẩm cùng một danh mục, bấm **Thêm vào giỏ**, quay lại trang chủ → nhãn chuyển sang `it_tuong_tac`."],
    noi: "Now a user who has never existed. One click creates a brand-new id. ALS knows nothing about this user, so the page uses the new-user strategy: all ten slots come from the newest trending window, the same items as the trending block. The user is outside the A/B experiment, because the experiment only compares ALS lists." },
  { tieu: "Bước 3 · Vòng khép kín ≤ 90 giây (khoảng 1,5 phút)",
    lam: ["Mở trang sản phẩm **ít người xem** đã chọn sẵn (xem mục 6). Khối thịnh hành của trang ghi số lượt thêm giỏ hiện tại.", "Bấm **Thêm vào giỏ** 3 lần. Trang tự hỏi lại mỗi 5 giây và hiện “ĐÃ CẬP NHẬT sau N giây” khi bảng thịnh hành đổi.", "Trong lúc chờ, Quốc Anh nói lời dẫn bên dưới (đủ khoảng 50 giây).", "Dự phòng nếu trang không cập nhật sau 90 giây: chạy `python3 scripts/demo_vong_khep_kin.py --web http://10.68.71.149:8000 --san-pham <mã> --so-lan 3` và kiểm tra luồng (mục 6)."],
    noi: "This is the closed loop. We click “Add to cart” three times on a product that almost nobody views. Each click goes from the web application to Kafka. Within about fifteen seconds the first stream writes it to bronze. The trending stream reads the same topic, updates its fifteen-minute window and merges the result into gold every twenty seconds. The page asks for the new count every five seconds and prints how long it took. On 11 November it took fifty-one seconds; the target is ninety." },
  { tieu: "Bước 4 · Thí nghiệm A/B (khoảng 1 phút)",
    lam: ["Mở `/?u=270018` (nhóm B): ô **3, 6, 8** có nhãn Thịnh hành. Có thể mở `/?u=1287993` (nhóm A) để so: toàn ô ALS.", "Bấm menu **Bảng điều khiển A/B**: CTR và chuyển đổi theo nhóm, p-value, biểu đồ theo ngày, tỷ lệ traffic mô phỏng."],
    noi: "This user is in group B: slots three, six and eight are trending items, and reloading the page never changes the group, because assignment is a hash of the user id. On the dashboard, group B has a lower click-through rate. The dashboard shows p equals 0.0135 over eight days, because our own screenshots added 230 real impressions on 11 November; the report keeps the seven simulated days, p equals 0.015. Both say the same thing: B is significantly worse under this simulation." },
  { tieu: "Bước 5 · Tái lập thí nghiệm (khoảng 30 giây)",
    lam: ["Bấm menu **Tái lập thí nghiệm**: chọn một ngày cũ → **Chạy lại** → bảng cũ/mới với cột lệch = 0.", "Chỉ vào bảng tái lập huấn luyện bên dưới: độ lệch 1,78·10⁻¹⁵. **Không** kích hoạt lại DAG 5 trong buổi bảo vệ (chạy nhiều phút)."],
    noi: "Finally, reproduction. We pick an old day and re-run it: the web application reads the impression log with VERSION AS OF the recorded version and recomputes the test. Every metric matches, with a deviation of zero, even though the log has grown since then. Below is the training reproduction from DAG 5, with a deviation of 1.78 times ten to the minus fifteen." },
];
demo.forEach((d) => {
  ND.push(muc2(d.tieu));
  ND.push(nhan("Thao tác"));
  d.lam.forEach((p) => ND.push(y(p)));
  ND.push(nhan("Lời dẫn (tiếng Anh)"));
  ND.push(loi(d.noi));
});

// ---- 4. rút gọn
ND.push(muc("4. Phương án rút gọn"));
ND.push(muc2("Nếu hội đồng chỉ cho 15 phút"));
ND.push(doan("Giữ nguyên thứ tự và người nói, chỉ rút ngắn các slide dưới đây (bỏ phần giải thích, giữ câu đầu và con số). Tổng giảm 300 giây."));
ND.push(bang(["Slide", "Thời lượng mới", "Cách rút"], [
  ["2 + 3", "45 giây (từ 85)", "Gộp: “five objectives, turned into eight criteria; we come back to them at the end”."],
  ["4 – Dữ liệu", "45 giây (từ 55)", "Bỏ câu về trọng số sự kiện."],
  ["5 – Kiến trúc", "40 giây (từ 60)", "Bỏ câu về tệp danh bạ và chuyển máy web."],
  ["6 – Cụm", "25 giây (từ 45)", "Chỉ nói master, 5 worker, 7 GB RAM."],
  ["7 – Lakehouse", "45 giây (từ 50)", "Nói gọn phần gold."],
  ["8 – Streaming", "35 giây (từ 55)", "Bỏ câu về watermark; giữ lý do dùng thời điểm Kafka."],
  ["9 – Airflow", "35 giây (từ 50)", "Chỉ nói DAG 1 và cổng triển khai."],
  ["10 – ALS", "40 giây (từ 55)", "Bỏ phần giải thích xen kẽ."],
  ["11 – Tuning", "40 giây (từ 50)", "Bỏ câu về rank 100, alpha 80."],
  ["13 – Coverage", "40 giây (từ 50)", "Bỏ phép tính trần 75 %, chỉ nói kết luận."],
  ["16 – A/B", "50 giây (từ 65)", "Bỏ câu về cỡ mẫu và 7 ngày; giữ p = 0,015 và câu về p = 0,0135."],
  ["17 – Delta", "20 giây (từ 45)", "Một câu: “every Delta feature has a real use”."],
  ["18 – Z-ORDER", "30 giây (từ 45)", "Chỉ nói 67 → 1,07 tệp và 8,4 lần."],
  ["20 – v2", "40 giây (từ 50)", "Bỏ câu “small next to re-ranking”."],
  ["21 – Vòng khép kín", "40 giây (từ 50)", "Bỏ câu về luồng chết rồi chạy lại."],
  ["22 – Vận hành", "20 giây (từ 50)", "Chỉ nói 31 lỗi, 109 kiểm thử và một ví dụ (cổng triển khai)."],
  ["23 – Kết quả", "25 giây (từ 45)", "Không đọc từng dòng; nói “all eight met, coverage analysed”."],
  ["24 – Hạn chế", "25 giây (từ 35)", "Nói 3 hạn chế đầu và 1 hướng phát triển."],
], [18, 22, 60]));
ND.push(muc2("Nếu chỉ còn 2 phút demo"));
ND.push(doan("Làm **Bước 2** (người dùng mới) và **Bước 4** (bảng A/B). Bỏ vòng khép kín vì có thể phải chờ tới 90 giây; nói số 51 giây đã đo và chỉ slide 21."));
ND.push(muc2("Nếu bị hỏi giữa chừng"));
ND.push(y("Câu hỏi ngắn, đúng slide đang nói: trả lời một câu rồi tiếp tục."));
ND.push(y("Câu hỏi dài hoặc thuộc phần sau: “Thank you, we cover that on slide …; may we answer it there?” rồi nhớ quay lại."));
ND.push(y("Câu hỏi về **chọn siêu tham số trên tháng test**, **p-value khi impression không độc lập** hoặc **coverage < 10 %**: mở **slide 26 (dự phòng)**, có đủ số của ba thí nghiệm bổ sung ngày 11/11."));
ND.push(y("Người trình bày phần nào trả lời phần đó: Tâm (dữ liệu, kiến trúc, streaming, Airflow, vận hành), Quốc Anh (ALS, đánh giá, coverage, A/B, Delta, Z-ORDER, tái lập, v2). Người kia bổ sung khi cần."));

// ---- 5. cách đọc số
ND.push(muc("5. Cách đọc số liệu và thuật ngữ bằng tiếng Anh"));
ND.push(bang(["Viết", "Đọc"], [
  ["NDCG@10", "N-D-C-G at ten"],
  ["0.0680 · 0.0865", "zero point zero six eight · zero point zero eight six five"],
  ["2.89 M", "two point eight nine million"],
  ["1.8 × 10⁻⁵", "one point eight times ten to the minus five"],
  ["9,467 · 126,230", "nine thousand four hundred sixty-seven · one hundred twenty-six thousand"],
  ["+1,237 %", "plus one thousand two hundred thirty-seven percent (hoặc “about thirteen times”)"],
  ["p = 0.015 · z = −2.43", "p equals zero point zero one five · z equals minus two point four three"],
  ["350,160", "about three hundred fifty thousand"],
  ["67 → 1.07", "from sixty-seven to one point oh seven"],
  ["8,280 → 980 ms", "from eight thousand two hundred eighty to nine hundred eighty milliseconds"],
  ["1.78 × 10⁻¹⁵", "one point seven eight times ten to the minus fifteen"],
  ["β = 1.0 · α = 40", "beta equals one · alpha equals forty"],
  ["regParam", "reg-param (regularisation parameter)"],
  ["Z-ORDER", "zee-order"],
  ["labsoe-11", "lab S-O-E eleven"],
], [32, 68]));

// ---- 6. checklist
ND.push(muc("6. Danh sách kiểm tra ngày bảo vệ"));
ND.push(muc2("Trước 1 ngày (17/11)"));
ND.push(y("Tập trọn 20 phút ít nhất một lần, có bấm giờ, có demo trên cụm thật."));
ND.push(y("Chọn sẵn một sản phẩm **ít người xem** (không nằm trong khối thịnh hành) cho Bước 3; ghi mã ra giấy."));
ND.push(y("Kiểm tra web mở được `/`, `/mo-hinh`, `/ab`, `/tai-lap`; chép bản PDF slide, báo cáo và ảnh chụp màn hình vào máy trình chiếu (không cần mạng)."));
ND.push(y("Đăng nhập sẵn Airflow bằng tài khoản `admin` và mật khẩu mới (không ghi mật khẩu vào slide hay giấy để trên bàn)."));
ND.push(muc2("Trước 30 phút"));
ND.push(y("Trên labsoe-11: `bash scripts/luong.sh trang_thai` — phải có **3 luồng** đang chạy; nếu thiếu: `bash scripts/luong.sh khoi_dong tat_ca`."));
ND.push(y("Mở sẵn các tab: web `http://10.68.71.149:8000`, Airflow `http://10.68.71.113:8088`, Spark Master `http://10.68.71.113:8080`, HDFS `http://10.68.71.113:9870`, Kafka UI `http://10.68.71.204:8080`."));
ND.push(y("Mở slide ở chế độ trình chiếu; thử chuyển trang và phóng to ảnh."));
ND.push(muc2("Trước 10 phút"));
ND.push(y("Trên labsit, trong tmux `phat`, bật bộ phát với `--ty-le-nguoi-moi 0 --giay-moi-ngay 90` (chạy khoảng 72 phút, đủ đến hết phần demo; lệnh đầy đủ ở `docs/CHUAN_BI_BAO_VE.md`, mục 4)."));
ND.push(y("Trước 5 phút: tải lại trang chủ một lần, khối “Đang thịnh hành” phải có nhiều sản phẩm (không chỉ 1–2)."));
ND.push(muc2("Sau buổi bảo vệ"));
ND.push(y("Dừng bộ phát (Ctrl+C trong tmux `phat`)."));
ND.push(y("Trên labsoe-11: `sudo systemctl start cassandra` (trả lại Cassandra đã tạm dừng cho phòng lab)."));
ND.push(y("Trên laptop: bỏ dòng `ProxyJump` trong `~/.ssh/config` nếu không còn dùng."));
ND.push(y("**Không** dừng hoặc xóa container của nhóm khác; **không** chạy `docker compose down -v`."));

// ---- 7. lịch tập
ND.push(muc("7. Lịch tập gợi ý (13–17/11)"));
ND.push(bang(["Ngày", "Việc"], [
  ["13/11", "Mỗi người đọc to phần mình 3 lần với đồng hồ; đánh dấu câu khó đọc, sửa lời cho tự nhiên."],
  ["14/11", "Tập chung trọn 20 phút, ghi âm; nghe lại, kiểm tra các mốc 7:10 – 16:25 – 20:00 và hai câu chuyển lượt."],
  ["15/11", "Nộp báo cáo. Tập demo 5 bước trên cụm thật (bật bộ phát trước)."],
  ["16/11", "Hỏi – đáp thử: người này hỏi, người kia trả lời theo bộ 52 câu; đổi vai."],
  ["17/11", "Tập lần cuối, nhẹ nhàng; làm phần “Trước 1 ngày” ở mục 6."],
], [16, 84]));

// ------------------------------------------------------------------ xuất
const doc = new Document({
  creator: "Le Chi Tam",
  title: "Kịch bản thuyết trình bảo vệ đồ án",
  styles: {
    default: { document: { run: { font: FONT, size: 26 } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { font: FONT, size: 28, bold: true, color: XANH }, paragraph: { spacing: { before: 280, after: 120, ...GIAN }, keepNext: true, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { font: FONT, size: 26, bold: true, color: XANH }, paragraph: { spacing: { before: 200, after: 40, ...GIAN }, keepNext: true, outlineLevel: 1 } },
    ],
  },
  numbering: { config: [
    { reference: "y", levels: [{ level: 0, format: LevelFormat.BULLET, text: "–", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 567, hanging: 283 } } } }] },
    { reference: "so", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 567, hanging: 340 } } } }] },
  ] },
  sections: [{
    properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1134, bottom: 1134, left: 1701, right: 1134 } } },
    footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: 24 })] })] }) },
    children: ND,
  }],
});
const RA = path.join(__dirname, "BD03_Kich_ban_thuyet_trinh.docx");
Packer.toBuffer(doc).then((b) => {
  fs.writeFileSync(RA, b);
  console.log("đã ghi", RA, Math.round(b.length / 1024), "KB");
  console.log("Tâm", mmss(tongNguoi[T]), "· Quốc Anh", mmss(tongNguoi[QA]));
  S.forEach((s) => console.log(String(s.so).padStart(2), s.id.padEnd(12), s.nguoi.padEnd(9), s.giay + "s", s.tu + " từ", (s.tu / s.giay * 60).toFixed(0) + " từ/phút"));
});
