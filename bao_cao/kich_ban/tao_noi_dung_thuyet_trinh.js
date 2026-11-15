// tao_noi_dung_thuyet_trinh.js - dựng "Kịch bản thuyết trình chi tiết (sau demo, không giới hạn thời gian, tiếng Việt)" thành .docx:
// Times New Roman 13, giãn dòng 1,5, A4. Chạy: node tao_noi_dung_thuyet_trinh.js -> BD03_Kich_ban_thuyet_trinh_chi_tiet_19_11.docx
// Cú pháp nội dung: **đậm**, `mã`. Bản 14/11/2026 cho buổi 19/11: demo trước (theo KICH_BAN_DEMO_19_11.md), thuyết trình sau.
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
const XAM = "5F6B7A";
const LA = "2E7D32";

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
const y = (s, keep = false) => new Paragraph({ children: chu(s), numbering: { reference: "y", level: 0 }, spacing: { ...GIAN, after: 40 }, keepNext: keep });
let dsSo = 0;
const batDauSo = () => { dsSo += 1; };
const so = (s) => new Paragraph({ children: chu(s), numbering: { reference: "so", level: 0, instance: dsSo }, spacing: { ...GIAN, after: 40 } });
const muc = (s, moi = false) => new Paragraph({ heading: HeadingLevel.HEADING_1, keepNext: true, pageBreakBefore: moi, children: [new TextRun({ text: s, font: FONT, size: 30, bold: true, color: XANH })] });
const muc2 = (s) => new Paragraph({ heading: HeadingLevel.HEADING_2, keepNext: true, children: [new TextRun({ text: s, font: FONT, size: 27, bold: true, color: XANH })] });
const nhan = (s, mau = CAM) => new Paragraph({ children: [new TextRun({ text: s, font: FONT, size: 26, bold: true, color: mau })], spacing: { ...GIAN, before: 80, after: 20 }, keepNext: true });
const ghi = (s) => new Paragraph({ children: chu(s, { color: XAM, italics: true }), spacing: { ...GIAN, after: 80 } });

// lời nói: khung nền nhạt, viền trái xanh dương
const VIEN_LOI = { style: BorderStyle.SINGLE, size: 18, color: "2E6DB4", space: 8 };
const loi = (s) => new Paragraph({
  children: chu(s), alignment: AlignmentType.JUSTIFIED, spacing: { ...GIAN, after: 60 },
  indent: { left: 284, right: 113 }, border: { left: VIEN_LOI },
  shading: { type: ShadingType.CLEAR, fill: "EEF3FA", color: "auto" },
});
// câu hỏi và ý trả lời
const hoiP = (s) => new Paragraph({ children: [new TextRun({ text: "Hỏi: ", font: FONT, size: 26, bold: true, color: CAM }), ...chu(s, { bold: true })], spacing: { ...GIAN, before: 40, after: 0 }, indent: { left: 284 }, keepNext: true });
const dapP = (s) => new Paragraph({ children: [new TextRun({ text: "→ ", font: FONT, size: 26, bold: true, color: LA }), ...chu(s)], spacing: { ...GIAN, after: 60 }, indent: { left: 567 }, alignment: AlignmentType.JUSTIFIED });

const VIEN = { style: BorderStyle.SINGLE, size: 4, color: "8C96A3" };
const TONG = 9071;
function bang(cot, dong, rong, toMau = null) {
  const w = rong.map((r) => Math.round((TONG * r) / 100));
  w[w.length - 1] = TONG - w.slice(0, -1).reduce((a, b) => a + b, 0);
  const o = (s, dau, j, nen) => new TableCell({
    width: { size: w[j], type: WidthType.DXA }, borders: { top: VIEN, bottom: VIEN, left: VIEN, right: VIEN },
    shading: dau ? { type: ShadingType.CLEAR, fill: "DCE6F2", color: "auto" } : nen ? { type: ShadingType.CLEAR, fill: nen, color: "auto" } : undefined,
    margins: { top: 40, bottom: 40, left: 90, right: 90 },
    children: String(s).split("\n").map((d) => new Paragraph({ children: chu(d, dau ? { bold: true } : {}), spacing: { line: 276, lineRule: "auto" } })),
  });
  return new Table({
    width: { size: TONG, type: WidthType.DXA }, columnWidths: w,
    rows: [cot, ...dong].map((d, i) => new TableRow({ tableHeader: i === 0, cantSplit: true, children: d.map((x, j) => o(x, i === 0, j, i > 0 && toMau ? toMau(d) : null)) })),
  });
}
const sauBang = () => new Paragraph({ children: [], spacing: { after: 80 } });
const mmss = (g) => `${Math.floor(g / 60)}:${String(g % 60).padStart(2, "0")}`;
const giua = (text, o = {}, sp = {}) => new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 60, ...sp }, children: [new TextRun({ text, font: FONT, size: 26, ...o })] });

// ------------------------------------------------------------------ nội dung từng slide (tệp riêng)
const { S, T, QA } = require("./noi_dung_thuyet_trinh_chi_tiet.js");

// Không giới hạn thời gian: ước lượng thời lượng theo tốc độ nói 150 âm tiết/phút, làm tròn 5 giây.
const TOC_DO = 150;
let moc = 0, soSlide = 0, tongBS = 0;
S.forEach((s) => {
  if (!s.bs) { soSlide += 1; s.so = soSlide; }
  s.nhan = s.bs ? `Bổ sung ${s.bs}` : `Slide ${s.so}`;
  s.am = s.noi.join(" ").split(/\s+/).length;
  s.giay = Math.max(15, Math.round((s.am / TOC_DO) * 60 / 5) * 5);
  moc += s.giay; s.moc = moc;
  if (s.bs) tongBS += s.giay;
});
const phut = (g) => `khoảng ${Math.round(g / 60)} phút`;

// ------------------------------------------------------------------ dựng tài liệu
const ND = [];
ND.push(giua("TRƯỜNG ĐẠI HỌC TÂN TẠO · CS411V DỮ LIỆU LỚN", { bold: true }));
ND.push(giua("KỊCH BẢN THUYẾT TRÌNH CHI TIẾT", { size: 34, bold: true, color: XANH }, { before: 160 }));
ND.push(giua("Phần trình bày sau demo · không giới hạn thời gian · nói tiếng Việt", { size: 28, color: XANH }));
ND.push(giua("Đề tài 3 – Hệ thống gợi ý sản phẩm thương mại điện tử (bd03_khuyen_nghi)", { italics: true }, { before: 120 }));
ND.push(giua("Lê Chí Tâm (2302220) · Lê Nguyễn Quốc Anh (2302283)"));
ND.push(giua("Giảng viên hướng dẫn: TS. Cao Tiến Dũng"));
ND.push(giua("Bản ngày 15/11/2026 · buổi 19/11/2026 tại phòng lab · theo bộ slide 25 trang (+1 slide dự phòng)", { color: XAM }, { after: 240 }));

ND.push(muc("Cách dùng tài liệu"));
ND.push(y("Thứ tự buổi 19/11: **demo** theo `KICH_BAN_DEMO_19_11.md` → **thuyết trình** theo tài liệu này → **hỏi đáp**. Thầy Dũng không giới hạn thời gian, yêu cầu là **làm rõ toàn bộ đồ án**. **Tâm trình bày toàn bộ** phần thuyết trình."));
ND.push(y("Ngoài 25 slide có **6 phần bổ sung** (khung “Bổ sung 1–6”): không có slide riêng, nói ngay sau slide ghi trong đề mục và để nguyên slide đó trên màn hình."));
ND.push(y("Slide bằng tiếng Anh, **nói bằng tiếng Việt**; thuật ngữ (MERGE, watermark, NDCG, độ phủ/coverage…) giữ nguyên tiếng Anh khi cần."));
ND.push(y("Mỗi slide gồm: thời lượng ước tính; **lời nói** chi tiết (khung xanh); **ý chính và số cần nhớ** (dàn ý khi quên lời); **chỉ vào** đâu trên slide; **Thầy có thể hỏi** (câu hỏi đào sâu kèm ý trả lời)."));
ND.push(y(`Thời lượng ước tính theo tốc độ nói khoảng ${TOC_DO} âm tiết/phút; cả bài **${phut(moc)}**, chưa tính hỏi đáp.`));
ND.push(y("**Không cần thuộc từng chữ.** Thuộc câu mở đầu, các **số in đậm** và câu chuyển giữa các phần; phần còn lại nói bằng lời của mình. Nếu Thầy muốn nghe nhanh một phần, chỉ nói phần **Ý chính** của slide đó."));
ND.push(y("Lời nói dựa trên báo cáo và mã nguồn; mọi con số khớp báo cáo, slide và bộ hỏi – đáp."));

// ---- 1. thông điệp
ND.push(muc("1. Năm thông điệp phải để lại cho Thầy"));
batDauSo();
[
  "**Hệ thống chạy thật, đầu cuối, trên 6 máy** và đạt đủ **8 tiêu chí**: bằng chứng vừa demo, số liệu ở slide 23.",
  "**ALS phản hồi ngầm** được hiểu đúng bản chất (preference/confidence, mọi ô vào hàm mất mát, công thức đóng) và vượt xa baseline: **+1.237 %** và **+43 %** NDCG@10; có lý do rõ ràng vì sao chọn ALS thay vì item-kNN, BPR.",
  "**Độ phủ chưa đạt được phân tích đến nguyên nhân** (popularity bias, không phải giới hạn cấu trúc) và có giải pháp: xếp lại theo độ mới lạ **6,47 %** đang phục vụ, đồng xuất hiện offline **14,5 %**.",
  "**Thiết kế bảo đảm tính đúng**: job lũy đẳng, MERGE + checkpoint → không mất, không trùng; time travel + hạt giống + indexer chỉ thêm nhãn → tái lập lệch ~10⁻¹⁵.",
  "**Trung thực về giới hạn**: A/B mô phỏng (đã kiểm tra theo người dùng), lưới chọn trên tháng test (đã kiểm tra validation), số sao là đại lượng thay thế, điểm lỗi đơn; có hướng phát triển cụ thể.",
].forEach((s) => ND.push(so(s)));

// ---- 2. bố cục
ND.push(muc("2. Bố cục"));
ND.push(doan(`**Tâm trình bày toàn bộ**: 25 slide và 6 phần bổ sung, cả bài **${phut(moc)}** (trong đó phần bổ sung ${phut(tongBS)}). Ba phần: nền tảng (slide 1–9), mô hình và đánh giá (slide 10–20), vận hành và kết luận (slide 21–25).`));
ND.push(bang(["#", "Nội dung", "Ước tính", "Mốc"],
  S.map((s) => [s.bs ? `**B${s.bs}**` : String(s.so), s.bs ? `**Bổ sung ${s.bs} · ${s.tieu}** (sau slide ${s.sau}, không có slide riêng)` : s.tieu, mmss(s.giay), mmss(s.moc)]),
  [8, 64, 14, 14], (d) => (String(d[0]).startsWith("**B") ? "FFF4E5" : null)));
ND.push(ghi("Hàng tô nền cam nhạt là phần bổ sung. Thời lượng là ước tính để tập, không phải giới hạn."));

// ---- 3. từng slide
ND.push(muc("3. Nội dung từng slide", true));
const phan = { 1: "Phần 1 – Mở đầu, dữ liệu và nền tảng", 10: "Phần 2 – Mô hình, đánh giá, thí nghiệm và lakehouse", 21: "Phần 3 – Vận hành, kết quả và kết luận" };
S.forEach((s) => {
  if (!s.bs && phan[s.so]) ND.push(new Paragraph({ children: [new TextRun({ text: phan[s.so], font: FONT, size: 26, bold: true, italics: true, color: XAM })], spacing: { ...GIAN, before: 200, after: 40 }, keepNext: true }));
  ND.push(new Paragraph({ heading: HeadingLevel.HEADING_2, keepNext: true, children: [new TextRun({ text: `${s.nhan} · ${s.tieu}`, font: FONT, size: 27, bold: true, color: s.bs ? CAM : XANH })] }));
  ND.push(new Paragraph({ spacing: { ...GIAN, after: 40 }, keepNext: true, children: [
    new TextRun({ text: s.bs ? `Không có slide riêng · nói ngay sau slide ${s.sau}   ·   ` : "", font: FONT, size: 26, color: CAM, bold: !!s.bs }),
    new TextRun({ text: `ước tính ${mmss(s.giay)}`, font: FONT, size: 26, color: XAM }),
  ] }));
  ND.push(nhan("Lời nói"));
  s.noi.forEach((p) => ND.push(loi(p)));
  ND.push(nhan("Ý chính và số cần nhớ"));
  s.y.forEach((p) => ND.push(y(p)));
  ND.push(new Paragraph({ spacing: { ...GIAN, after: 60 }, children: [new TextRun({ text: "Chỉ vào: ", font: FONT, size: 26, bold: true, color: CAM }), ...chu(s.chi)] }));
  if (s.hoi.length) {
    ND.push(nhan("Thầy có thể hỏi", LA));
    s.hoi.forEach(([h, d]) => { ND.push(hoiP(h)); ND.push(dapP(d)); });
  }
});

// ---- 4. số liệu tổng hợp
ND.push(muc("4. Số liệu cần thuộc", true));
ND.push(bang(["Hạng mục", "Số liệu"], [
  ["Dữ liệu", "2,76 triệu sự kiện gốc (2,89 triệu vào bronze, gồm 4,8 % người dùng mới tổng hợp), 139 ngày, 417.053 sản phẩm"],
  ["Ma trận", "179.999 user train (≥ 3 tương tác), 746.350 cặp, mật độ ~1,8·10⁻⁵; 126.230 sản phẩm train; 9.467 user test"],
  ["Chia thời gian", "Ngày cắt 19/8/2015, ngày cuối 18/9/2015; trọng số 1–3–5; suy giảm λ = 0,01/ngày"],
  ["Cụm", "6 máy lab 12 lõi / 7 GB RAM; 5 worker, 34 lõi, 13 GB executor; HDFS 5 DataNode, nhân bản 2; Kafka 2 topic × 3 phân vùng"],
  ["Luồng", "Trigger 15 / 20 / 30 giây; cửa sổ 15 phút trượt 1 phút; watermark 2 phút; RocksDB"],
  ["Tinh chỉnh", "27 tổ hợp; tốt nhất rank 50, regParam 1,0, alpha 40, NDCG@10 = 0,0680; pipeline đầu 2 giờ 8 phút (tinh chỉnh 78 phút)"],
  ["Baseline", "Toàn sàn 0,0051 (ALS ×13,4, +1.237 %); theo danh mục 0,0475 (ALS +43 %)"],
  ["Độ phủ", "ALS 3,44 % (4.346 sản phẩm, 99,2 % ô thuộc N1, trần 75 %); xếp lại β = 1,0, 200 ứng viên: 6,47 %, NDCG 0,0865; + 3 ô đồng xuất hiện (offline): 14,53 %, NDCG 0,0892"],
  ["Validation", "Chọn trên 15 ngày đầu, báo cáo 16 ngày sau: cùng cấu hình, lạc quan 0,0002; β = 1,0 cũng được chọn lại"],
  ["Mô hình v2", "NDCG 0,0680 → 0,0694 (+2,1 %); độ phủ 3,44 → 3,72 %; tự triển khai 11/11"],
  ["A/B", "350.160 impression, 8.592 user, 7 ngày; CTR A 2,094 %, B 1,978 %; z = −2,43; p = 0,015; cỡ mẫu cần 76.972/nhóm; chuyển đổi p = 0,75; theo user p = 0,037 (cụm), 0,029 (bootstrap); hệ số thiết kế 1,36"],
  ["Z-ORDER", "Bảng 5,3 triệu dòng; tệp đọc 200 → 67 → 1,07; trung vị 10,8 s → 8,3 s → 0,98 s; nhanh 8,4 lần so với chỉ nén"],
  ["Vòng khép kín", "Kafka → bronze 10,3–10,7 giây; bấm → bảng thịnh hành 51 giây (ngưỡng 90)"],
  ["Tái lập", "Lệch 0,000000 (dung sai 10⁻⁶); không làm tròn ~10⁻¹⁵; phiên bản features 0, 3, 4"],
  ["Vận hành", "31 sự cố; 139 kiểm thử; ~13.500 dòng mã; 5 DAG; 12 bảng gold"],
  ["Bổ sung 15/11", "Gốc /lakehouse/bd03_khuyen_nghi; _quarantine 11.759 dòng (0,41 %); Deadline Alerts thay sla; backfill DAG 1 + DAG 3; web đo thời gian xử lý, ghi ngược gold.ket_qua_tai_lap"],
], [22, 78]));

// ---- 5. tập và hỏi đáp
ND.push(muc("5. Tập và hỏi đáp"));
ND.push(y("Tập trọn bài ít nhất hai lần, nối tiếp ngay sau phần demo, đọc to với đồng hồ để biết nhịp. Bài dài khoảng 1 giờ: chuẩn bị nước uống, nghỉ nhịp ở cuối mỗi phần."));
ND.push(y("Câu hỏi về **chọn siêu tham số trên tháng test**, **p-value khi impression không độc lập** hoặc **độ phủ < 10 %**: mở **slide 26 (dự phòng)**, có đủ số của ba thí nghiệm bổ sung ngày 11/11."));
ND.push(y("Câu hỏi cần minh họa: chuyển sang trình duyệt (8 tab vẫn mở). **Không** chạy job nặng, **không** kích hoạt DAG 5 trong lúc hỏi đáp."));
ND.push(y("Không chắc câu trả lời: nói điều mình chắc chắn, chỉ rõ phần chưa làm hoặc chưa đo, đề nghị bổ sung trong báo cáo nộp trước 22/11. Không đoán số."));
ND.push(y("Câu hỏi sâu hơn: xem bộ hỏi – đáp 52 câu và giáo trình (Bài 17 về BPR, item-kNN, MinHash/LSH)."));
ND.push(muc2("Hai câu hỏi cần tự chuẩn bị"));
ND.push(hoiP("Ai làm phần nào trong đồ án?"));
ND.push(dapP("Trả lời đúng theo thực tế của nhóm, nêu cụ thể từng phần (hạ tầng cụm, pipeline dữ liệu, streaming, mô hình và đánh giá, A/B, web, báo cáo). Ghi sẵn ở đây trước buổi demo: Tâm: ________________________; Quốc Anh: ________________________."));
ND.push(hoiP("Nhóm có dùng AI không? Dùng như thế nào?"));
ND.push(dapP("Có, và đã khai báo đầy đủ theo mục A.9 của đề cương trong `docs/AI_USAGE.md` (tóm tắt ở Phụ lục A của báo cáo chính): công cụ (Claude), thời gian, phạm vi, phần nhóm tự thực hiện và danh sách yêu cầu đã gửi. Commit do AI tạo có tác giả hoặc dòng đồng tác giả Claude trong lịch sử Git. Trả lời đúng thực tế, không giảm nhẹ; nhấn vào phần nhóm làm: vận hành cụm 6 máy, chạy và gỡ lỗi mọi job trên cụm, ra quyết định triển khai, kiểm chứng số liệu."));
ND.push(hoiP("Nếu làm lại, nhóm sẽ làm khác gì?"));
ND.push(dapP("Một, tách kỳ validation ngay từ đầu thay vì kiểm tra lại sau. Hai, đưa nguồn ứng viên ngoài ALS (đồng xuất hiện) vào sớm để đạt độ phủ 10 % trong vận hành. Ba, thiết kế A/B với đơn vị là người dùng ngay từ đầu. Bốn, dùng mạng dây hoặc router riêng cho cụm thay Wi-Fi, và tách web khỏi máy worker. Năm, viết sẵn kiểm thử hạ tầng và cách dừng luồng an toàn (dừng cả driver) trước khi lên cụm."));


// ------------------------------------------------------------------ xuất
const doc = new Document({
  creator: "Le Chi Tam",
  title: "Kịch bản thuyết trình chi tiết BD03",
  styles: {
    default: { document: { run: { font: FONT, size: 26 } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { font: FONT, size: 30, bold: true, color: XANH }, paragraph: { spacing: { before: 300, after: 120, ...GIAN }, keepNext: true, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { font: FONT, size: 27, bold: true, color: XANH }, paragraph: { spacing: { before: 220, after: 60, ...GIAN }, keepNext: true, outlineLevel: 1 } },
    ],
  },
  numbering: { config: [
    { reference: "y", levels: [{ level: 0, format: LevelFormat.BULLET, text: "–", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 567, hanging: 283 } } } }] },
    { reference: "so", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 567, hanging: 340 } } } }] },
  ] },
  sections: [{
    properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1134, bottom: 1134, left: 1701, right: 1134 } } },
    footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [
      new TextRun({ text: "BD03 · Kịch bản thuyết trình chi tiết · trang ", font: FONT, size: 20, color: XAM }),
      new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: 20, color: XAM }),
    ] })] }) },
    children: ND,
  }],
});
const RA = path.join(__dirname, "BD03_Kich_ban_thuyet_trinh_chi_tiet_19_11.docx");
Packer.toBuffer(doc).then((b) => {
  fs.writeFileSync(RA, b);
  console.log("đã ghi", RA, Math.round(b.length / 1024), "KB");
  S.forEach((s) => console.log(s.nhan.padEnd(10), String(s.am).padStart(4) + " âm tiết", mmss(s.giay))); console.log("tổng", mmss(moc), "bổ sung", mmss(tongBS));
});
