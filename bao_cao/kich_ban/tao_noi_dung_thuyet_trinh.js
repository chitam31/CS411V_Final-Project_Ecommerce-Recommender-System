// tao_noi_dung_thuyet_trinh.js - dựng "Kịch bản thuyết trình và demo chi tiết" (tiếng Việt) thành .docx:
// Times New Roman 13, giãn dòng 1,5, A4. Chạy: node tao_noi_dung_thuyet_trinh.js -> BD03_Kich_ban_thuyet_trinh_chi_tiet_19_11.docx
// Nội dung: noi_dung_demo_chi_tiet.js (phần demo, đọc màn hình web và cụm) và noi_dung_thuyet_trinh_chi_tiet.js (27 slide).
// Cú pháp nội dung: **đậm**, *nghiêng*, `mã`. Bản 17/11/2026 cho buổi 19/11: demo trước, thuyết trình sau, rồi hỏi đáp.
const fs = require("fs");
const path = require("path");
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, Table, TableRow, TableCell,
  WidthType, BorderStyle, ShadingType, LevelFormat, Footer, PageNumber,
} = require("/usr/local/lib/node_modules_global/docx");

const FONT = "Times New Roman";
const MA = "Courier New";
const XANH = "1F3A68";
const CAM = "B4531F";
const XAM = "5F6B7A";
const LA = "2E7D32";

function chu(s, them = {}) {
  const ra = [];
  const re = /(\*\*[^*]+\*\*|`[^`]+`|\*[^*\s][^*]*\*)/g;
  let i = 0, m;
  while ((m = re.exec(s))) {
    if (m.index > i) ra.push(new TextRun({ text: s.slice(i, m.index), font: FONT, size: 26, ...them }));
    const t = m[0];
    if (t.startsWith("**")) ra.push(...chu(t.slice(2, -2), { ...them, bold: true }));
    else if (t.startsWith("`")) ra.push(new TextRun({ text: t.slice(1, -1), font: MA, size: 22, ...them }));
    else ra.push(...chu(t.slice(1, -1), { ...them, italics: true }));
    i = m.index + t.length;
  }
  if (i < s.length) ra.push(new TextRun({ text: s.slice(i), font: FONT, size: 26, ...them }));
  return ra;
}

const GIAN = { line: 360, lineRule: "auto" };
const doan = (s, o = {}) => new Paragraph({ children: chu(s), spacing: { ...GIAN, after: 80 }, alignment: AlignmentType.JUSTIFIED, ...o });
const y = (s, keep = false) => new Paragraph({ children: chu(s), numbering: { reference: "y", level: 0 }, spacing: { ...GIAN, after: 40 }, keepNext: keep, alignment: AlignmentType.JUSTIFIED });
let dsSo = 0;
const batDauSo = () => { dsSo += 1; };
const so = (s) => new Paragraph({ children: chu(s), numbering: { reference: "so", level: 0, instance: dsSo }, spacing: { ...GIAN, after: 40 }, alignment: AlignmentType.JUSTIFIED });
const muc = (s, moi = false) => new Paragraph({ heading: HeadingLevel.HEADING_1, keepNext: true, pageBreakBefore: moi, children: [new TextRun({ text: s, font: FONT, size: 30, bold: true, color: XANH })] });
const muc2 = (s, mau = XANH) => new Paragraph({ heading: HeadingLevel.HEADING_2, keepNext: true, children: [new TextRun({ text: s, font: FONT, size: 27, bold: true, color: mau })] });
const nhan = (s, mau = CAM) => new Paragraph({ children: [new TextRun({ text: s, font: FONT, size: 26, bold: true, color: mau })], spacing: { ...GIAN, before: 80, after: 20 }, keepNext: true });
const ghi = (s) => new Paragraph({ children: chu(s, { color: XAM, italics: true }), spacing: { ...GIAN, after: 80 }, alignment: AlignmentType.JUSTIFIED });

// lời nói: nền xanh nhạt, viền trái xanh dương
const VIEN_LOI = { style: BorderStyle.SINGLE, size: 18, color: "2E6DB4", space: 8 };
const loi = (s) => new Paragraph({
  children: chu(s), alignment: AlignmentType.JUSTIFIED, spacing: { ...GIAN, after: 60 },
  indent: { left: 284, right: 113 }, border: { left: VIEN_LOI },
  shading: { type: ShadingType.CLEAR, fill: "EEF3FA", color: "auto" },
});
// đọc hình, đọc màn hình: nền cam nhạt, viền trái cam
const VIEN_HINH = { style: BorderStyle.SINGLE, size: 18, color: "D9822B", space: 8 };
const docHinh = (s) => new Paragraph({
  children: chu(s), alignment: AlignmentType.JUSTIFIED, spacing: { ...GIAN, after: 60 },
  indent: { left: 284, right: 113 }, border: { left: VIEN_HINH },
  shading: { type: ShadingType.CLEAR, fill: "FDF3E7", color: "auto" },
});
const hoiP = (s) => new Paragraph({ children: [new TextRun({ text: "Hỏi: ", font: FONT, size: 26, bold: true, color: CAM }), ...chu(s, { bold: true })], spacing: { ...GIAN, before: 40, after: 0 }, indent: { left: 284 }, keepNext: true });
const dapP = (s) => new Paragraph({ children: [new TextRun({ text: "→ ", font: FONT, size: 26, bold: true, color: LA }), ...chu(s)], spacing: { ...GIAN, after: 60 }, indent: { left: 567 }, alignment: AlignmentType.JUSTIFIED });
const dongNhan = (n, s, mau = CAM) => new Paragraph({ spacing: { ...GIAN, after: 60 }, alignment: AlignmentType.JUSTIFIED, children: [new TextRun({ text: n, font: FONT, size: 26, bold: true, color: mau }), ...chu(s)] });

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

// ------------------------------------------------------------------ nội dung
const { D } = require("./noi_dung_demo_chi_tiet.js");
const { S } = require("./noi_dung_thuyet_trinh_chi_tiet.js");

// Thời lượng nói ước tính theo 150 âm tiết/phút (tiếng Việt: một từ ≈ một âm tiết), làm tròn 5 giây.
const TOC_DO = 150;
let moc = 0, tongBS = 0;
S.forEach((s) => {
  s.nhan = s.bs ? `Nói thêm ${s.bs}` : `Slide ${s.so}`;
  s.am = s.noi.join(" ").split(/\s+/).length;
  s.giay = Math.max(15, Math.round((s.am / TOC_DO) * 60 / 5) * 5);
  moc += s.giay; s.moc = moc;
  if (s.bs) tongBS += s.giay;
});
const phut = (g) => `khoảng ${Math.round(g / 60)} phút`;

const ND = [];
// ------------------------------------------------------------------ bìa
ND.push(giua("TRƯỜNG ĐẠI HỌC TÂN TẠO · CS411V DỮ LIỆU LỚN", { bold: true }));
ND.push(giua("KỊCH BẢN DEMO VÀ THUYẾT TRÌNH CHI TIẾT", { size: 34, bold: true, color: XANH }, { before: 160 }));
ND.push(giua("Theo bộ slide đã chốt (27 trang) và hệ thống đang chạy trên cụm · nói tiếng Việt", { size: 28, color: XANH }));
ND.push(giua("Đề tài 3 – Hệ thống gợi ý sản phẩm thương mại điện tử (bd03_khuyen_nghi)", { italics: true }, { before: 120 }));
ND.push(giua("Lê Chí Tâm (2302220) · Lê Nguyễn Quốc Anh (2302283)"));
ND.push(giua("Giảng viên hướng dẫn: TS. Cao Tiến Dũng"));
ND.push(giua("Bản ngày 17/11/2026 · buổi bảo vệ 19/11/2026 tại phòng lab", { color: XAM }, { after: 240 }));

// ------------------------------------------------------------------ cách dùng
ND.push(muc("Cách dùng tài liệu"));
ND.push(y("Thứ tự buổi 19/11: **demo** (Phần A, khoảng 14 phút; thao tác chi tiết, lệnh và cách xử lý sự cố ở `KICH_BAN_DEMO_19_11.md`) → **thuyết trình theo slide** (Phần B, " + phut(moc) + ") → **hỏi đáp** (Phần C). Thầy Dũng không giới hạn thời gian; yêu cầu là **Thầy và cả lớp nắm được toàn bộ đồ án**."));
ND.push(y("**Ai làm gì**: ở phần demo, Tâm bấm máy, Quốc Anh nói lời dẫn; **Tâm trình bày toàn bộ** phần slide; cả hai trả lời câu hỏi theo phần mình phụ trách."));
ND.push(y("Bộ slide tiếng Việt và tiếng Anh **cùng bố cục, cùng số trang, cùng hình**; hình giữ nhãn tiếng Anh, nên mục “Đọc hình và biểu đồ” dịch và giải thích từng nhãn. Tài liệu dùng được với bản nào cũng vậy (tiêu đề tiếng Anh ghi kèm)."));
ND.push(y("Mỗi bước demo gồm: thao tác; **đọc màn hình** (khung cam: từng bảng, biểu đồ trên web hay trên giao diện cụm hiển thị gì và vì sao nó có hình dạng đó); **lời dẫn** (khung xanh); câu Thầy có thể hỏi."));
ND.push(y("Mỗi slide gồm: thời lượng ước tính; **trên slide có gì**; **lời nói** chi tiết (khung xanh); **đọc hình và biểu đồ** (khung cam); **số cần nhớ**; **chỉ vào** đâu; **Thầy có thể hỏi**. Mục **Nói thêm** (tiêu đề cam) không có slide riêng: nói ngay sau slide ghi trong đề mục, giữ nguyên slide đó trên màn hình."));
ND.push(y("Số trên web thay đổi theo thời gian (lượt hiển thị mới, CTR, p-value): tài liệu ghi số của buổi tập **17/11**; ngày 19/11 **đọc đúng số đang hiện** và ghi lại ở mốc T−15. Số trên slide và trong báo cáo là số chính thức, không đổi."));
ND.push(y("**Không cần thuộc từng chữ.** Thuộc câu mở đầu, các **số in đậm** và câu chuyển giữa các phần; phần còn lại nói bằng lời của mình. Nếu Thầy muốn nghe nhanh, chỉ nói mục “Số cần nhớ”."));

// ------------------------------------------------------------------ 1. tổng quan
ND.push(muc("1. Đồ án trong hai phút", true));
ND.push(doan("Nhóm xây một hệ thống gợi ý sản phẩm hoàn chỉnh cho một sàn thương mại điện tử mô phỏng, chạy thật trên **cụm sáu máy phòng lab** nối bằng ZeroTier. Dữ liệu nhấp chuột RetailRocket (2,76 triệu sự kiện, 139 ngày) được một producer **phát lại qua Kafka** như một sàn đang hoạt động; ứng dụng web cũng đẩy mọi cú nhấp của người dùng vào Kafka. Ba job **Spark Structured Streaming** ghi sự kiện vào hồ dữ liệu **bronze** trên HDFS, tính bảng **thịnh hành** theo cửa sổ 15 phút và ghi **nhật ký hiển thị** cho thí nghiệm A/B. Mỗi đêm, **Airflow** chạy pipeline: làm sạch thành **silver** (Delta Lake), dựng ma trận **features**, **tinh chỉnh ALS** phản hồi ngầm, đánh giá so với hai baseline, và chỉ công bố danh sách mới vào **gold** nếu mô hình mới không kém mô hình đang phục vụ."));
ND.push(doan("Ứng dụng **FastAPI** đọc gold để dựng khối “Dành cho bạn” 10 ô, trộn **ALS** với **thịnh hành** và **sản phẩm mới** theo nhóm A/B và theo loại người dùng (ba chiến lược khởi đầu lạnh). Kết quả chính: ALS đạt **NDCG@10 = 0,0680**, gấp **13,4 lần** baseline bán chạy toàn sàn và hơn **43 %** baseline theo danh mục; cấu hình phục vụ có **xếp lại theo độ mới lạ** đạt **0,0865** và độ phủ **6,47 %** (độ phủ là ngưỡng duy nhất chưa đạt 10 %, đã phân tích nguyên nhân là thiên lệch độ phổ biến). Khối thịnh hành phản ứng với cú nhấp trong **51 giây** (mục tiêu 90); A/B cho thấy trộn 30 % thịnh hành làm **CTR giảm 5,5 %, p = 0,015**; thực nghiệm **tái lập** bằng Delta time travel với độ lệch **0**; **Z-ORDER** giảm số tệp đọc mỗi lần tra cứu từ **67 xuống 1,07**."));

ND.push(muc2("Năm thông điệp phải để lại cho Thầy"));
batDauSo();
[
  "**Hệ thống chạy thật, đầu cuối, trên 6 máy** và đạt đủ **8 tiêu chí**: bằng chứng vừa demo, tổng hợp ở slide 24.",
  "**ALS phản hồi ngầm được hiểu đúng bản chất** (sở thích/độ tin cậy, mọi ô vào hàm mất mát, công thức đóng) và vượt xa baseline: **+1.237 %** và **+43 %** NDCG@10; có lý do rõ ràng vì sao chọn ALS thay vì item-kNN, BPR, MinHash/LSH.",
  "**Độ phủ chưa đạt được phân tích đến nguyên nhân** (thiên lệch độ phổ biến, không phải giới hạn cấu trúc) và có giải pháp: xếp lại theo độ mới lạ **6,47 %** đang phục vụ, đồng xuất hiện offline **14,5 %**.",
  "**Thiết kế bảo đảm tính đúng**: job lũy đẳng, MERGE + checkpoint → không mất, không trùng; time travel + hạt giống + indexer chỉ thêm nhãn → tái lập lệch ~10⁻¹⁵.",
  "**Trung thực về giới hạn**: A/B mô phỏng (đã kiểm tra theo người dùng), lưới chọn trên tháng kiểm tra (đã kiểm tra validation), số sao là đại lượng thay thế, điểm lỗi đơn; có hướng phát triển cụ thể.",
].forEach((s) => ND.push(so(s)));

ND.push(muc2("Tiêu chí ↔ bước demo ↔ slide"));
ND.push(bang(["#", "Tiêu chí nghiệm thu", "Bước demo (Phần A)", "Slide"], [
  ["1", "Bảng tinh chỉnh ≥ 9 tổ hợp", "Bước 1: bảng tuning 10 tổ hợp trên web", "11 (lưới 27)"],
  ["2", "ALS so với 2 baseline, độ phủ, độ mới lạ", "Bước 1: bảng so sánh, dòng Ngưỡng đạt, biểu đồ độ phổ biến", "12, 13, 14, 15"],
  ["3", "Ba chiến lược khởi đầu lạnh", "Bước 3: người dùng mới → ít tương tác; ô 9–10", "16"],
  ["4", "Thịnh hành ≤ 90 giây", "Bước 4: “ĐÃ CẬP NHẬT sau N giây”", "8, 22"],
  ["5", "Vòng khép kín web → Kafka → bronze → thịnh hành", "Bước 4 (Kafka UI) và bước 7 (Delta SQL khối 4)", "22"],
  ["6", "A/B có p-value, kết luận", "Bước 5: trang chủ nhóm B, bảng điều khiển A/B", "17, 27"],
  ["7", "Tái lập bằng VERSION AS OF", "Bước 6: Chạy lại một ngày, bảng DAG 5", "20"],
  ["8", "OPTIMIZE / Z-ORDER", "Bước 2: bảng ba giai đoạn", "19"],
  ["C.4", "Chạy DAG, cây HDFS, Delta SQL, luồng ≥ 30 phút, ghi ngược từ web", "Bước 7", "9, 18, 26"],
], [7, 33, 44, 16]));
ND.push(sauBang());

ND.push(muc2("Số liệu cần thuộc"));
ND.push(bang(["Hạng mục", "Số liệu"], [
  ["Dữ liệu", "2,76 triệu sự kiện gốc, 139 ngày (2,89 triệu vào bronze, gồm 4,8 % người dùng mới tổng hợp); 417.053 sản phẩm"],
  ["Ma trận", "179.999 người dùng train (≥ 3 tương tác) × 126.230 sản phẩm; 746.350 cặp; mật độ 3,3·10⁻⁵; 9.467 người dùng kiểm tra"],
  ["Chia thời gian", "Ngày cắt 19/8/2015, ngày cuối 18/9/2015; trọng số 1 – 3 – 5; suy giảm λ = 0,01/ngày (bán rã ~69 ngày)"],
  ["Cụm", "6 máy lab, mỗi máy 12 lõi / 7 GB RAM; 5 worker, 34 lõi, 13 GB executor; HDFS 5 DataNode, nhân bản 2; Kafka 1 broker, 2 topic × 3 phân vùng"],
  ["Luồng", "Trigger 15 / 20 / 30 giây; cửa sổ 15 phút trượt 1 phút; watermark 2 phút; RocksDB; 3 luồng dùng 4 lõi"],
  ["Lakehouse", "Gốc /lakehouse/bd03_khuyen_nghi; 2.894.238 → 2.882.479 → 746.350 → 5.300.860 dòng phục vụ (265.043 người × 20); _quarantine 5.315.672 dòng (5.304.360 trùng nội dung + 11.312 nhấp lặp); 12 bảng gold"],
  ["Tinh chỉnh", "27 tổ hợp; tốt nhất rank 50, regParam 1,0, alpha 40, NDCG@10 = 0,0680; pipeline đầu 2 giờ 8 phút (tinh chỉnh 78 phút); lưới đêm 9 + 1"],
  ["Baseline", "Toàn sàn 0,0051 (ALS ×13,4, +1.237 %); theo danh mục 0,0475 (ALS +43 %)"],
  ["Phân tích lỗi", "ALS hơn baseline 2 ở cả 12 nhóm (+29–54 %); đuôi dài 41 % người dùng, NDCG 0,0123 vs 0,1139; 84,8 % người dùng = 0 với cả hai"],
  ["Độ phủ", "ALS 3,44 % (4.346 SP, 99,2 % ô thuộc N1, trần 75 %); phục vụ β = 1,0, 200 ứng viên: 6,47 %, NDCG 0,0865, N1 80,8 %; + 3 ô đồng xuất hiện (offline): 14,5 %, NDCG 0,0892"],
  ["Validation", "Chọn trên 19/8–2/9, báo cáo 3–18/9: cùng cấu hình, lạc quan 0,0002, Spearman 0,995; β = 1,0 cũng được chọn lại"],
  ["Mô hình v2", "NDCG 0,0680 → 0,0694 (+2,1 %); độ phủ 3,44 → 3,72 %; 4.346 → 4.699 SP; tự triển khai 06:07 ngày 11/11"],
  ["A/B", "350.160 lượt, 8.592 người dùng, 7 ngày; CTR A 2,094 % (175.960 lượt), B 1,978 % (174.200); z = −2,43; p = 0,015; cần 76.972/nhóm; chuyển đổi p = 0,75; theo người dùng p = 0,037 (cụm), 0,029 (bootstrap); hệ số thiết kế 1,36"],
  ["Z-ORDER", "Bảng 5,3 triệu dòng; tệp đọc 200 → 67 → 1,07; trung vị 10,8 s → 8,3 s → 0,98 s; nhanh 8,4 lần so với chỉ nén"],
  ["Vòng khép kín", "Kafka → bronze 10,3–10,7 giây; nhấp → bảng thịnh hành 51 giây (11/11, chính thức), 39 giây (script) và 32 giây (trang) ngày 17/11"],
  ["Tái lập", "Lệch 0,000000 (dung sai 10⁻⁶); không làm tròn ~10⁻¹⁵; phiên bản features 0, 3, 4; A/B lệch đúng 0"],
  ["Vận hành", "33 sự cố; 143 kiểm thử; ~13.500 dòng mã; 5 DAG; Deadline Alerts thay sla; web 220/220 yêu cầu thành công, 99,1 % < 3 s, p95 457 ms"],
  ["Web ngày 17/11", "A/B trên web: p (CTR) = 0,0138, chuyển đổi p = 0,7431; luồng chạy liên tục ~27 giờ; kn_tinh_ab xanh sau 58 giây"],
], [20, 80]));
ND.push(sauBang());

// ------------------------------------------------------------------ Phần A. demo
ND.push(muc("Phần A – Demo trên hệ thống thật (đọc màn hình và giải thích)"));
ND.push(doan("Demo diễn ra **trước** phần slide, khoảng 14 phút. Phần này không lặp lại toàn bộ lệnh (xem `KICH_BAN_DEMO_19_11.md`), mà tập trung vào điều Thầy và các bạn **nhìn thấy** trên từng màn hình: mỗi bảng, mỗi biểu đồ nói gì, vì sao nó có hình dạng đó, và câu dẫn tương ứng. Tám tab trình duyệt theo thứ tự: 1 Spark Master, 2 HDFS, 3 Kafka UI, 4 Airflow, 5 Chất lượng mô hình, 6 Trang chủ, 7 Bảng điều khiển A/B, 8 Tái lập."));
ND.push(bang(["Bước", "Màn hình", "Tiêu chí", "Thời lượng"],
  D.map((d) => [d.tieu, d.man.replace(/`/g, ""), d.tc, d.tg]), [30, 46, 10, 14]));
ND.push(sauBang());
D.forEach((d) => {
  ND.push(muc2(d.tieu));
  ND.push(new Paragraph({ spacing: { ...GIAN, after: 40 }, keepNext: true, children: chu(`Thời lượng ${d.tg} · tiêu chí ${d.tc} · ${d.man}`, { color: XAM }) }));
  if (d.lam.length) { ND.push(nhan("Thao tác")); d.lam.forEach((p) => ND.push(y(p))); }
  if (d.doc.length) { ND.push(nhan("Đọc màn hình")); d.doc.forEach((p) => ND.push(docHinh(p))); }
  ND.push(nhan("Lời dẫn", "2E6DB4"));
  d.noi.forEach((p) => ND.push(loi(p)));
  if (d.hoi.length) { ND.push(nhan("Thầy có thể hỏi", LA)); d.hoi.forEach(([h, a]) => { ND.push(hoiP(h)); ND.push(dapP(a)); }); }
});

// ------------------------------------------------------------------ Phần B. slide
ND.push(muc("Phần B – Thuyết trình theo 27 slide", true));
ND.push(doan(`**Tâm trình bày toàn bộ**: 27 slide và 6 mục nói thêm, cả bài **${phut(moc)}** (trong đó nói thêm ${phut(tongBS)}). Thời lượng là ước tính để tập (150 âm tiết/phút), không phải giới hạn. Nhãn cam nhỏ ở góc trên slide cho biết phần: Giới thiệu (2–3), Dữ liệu và kiến trúc (4–9), Mô hình và đánh giá (10–16), Thực nghiệm và lakehouse (17–21), Hệ thống thật và vận hành (22–23), Kết luận (24–25), Cảm ơn (26), Dự phòng cho hỏi – đáp (27). Hình trên slide được đánh số liên tục: Hình 1 (slide 5) đến Hình 15 (slide 22).`));
ND.push(bang(["#", "Nội dung", "Ước tính", "Mốc"],
  S.map((s) => [s.bs ? `**N${s.bs}**` : String(s.so), s.bs ? `**Nói thêm ${s.bs} · ${s.tieu}** (sau slide ${s.sau})` : s.tieu, mmss(s.giay), mmss(s.moc)]),
  [8, 64, 14, 14], (d) => (String(d[0]).startsWith("**N") ? "FFF4E5" : null)));
ND.push(ghi("Hàng tô nền cam nhạt là mục nói thêm, không có slide riêng."));

const phan = { 1: "Giới thiệu", 4: "Dữ liệu và kiến trúc", 10: "Mô hình và đánh giá", 17: "Thực nghiệm và lakehouse", 22: "Hệ thống thật và vận hành", 24: "Kết luận", 26: "Kết thúc và dự phòng" };
S.forEach((s) => {
  if (!s.bs && phan[s.so]) ND.push(new Paragraph({ children: [new TextRun({ text: phan[s.so], font: FONT, size: 26, bold: true, italics: true, color: XAM })], spacing: { ...GIAN, before: 200, after: 40 }, keepNext: true }));
  ND.push(muc2(s.bs ? `${s.nhan} · ${s.tieu}` : `${s.nhan} · ${s.tieu}`, s.bs ? CAM : XANH));
  ND.push(new Paragraph({ spacing: { ...GIAN, after: 40 }, keepNext: true, children: [
    new TextRun({ text: s.bs ? `Không có slide riêng · nói ngay sau slide ${s.sau}   ·   ` : `Bản tiếng Anh: “${s.en}”   ·   `, font: FONT, size: 26, color: s.bs ? CAM : XAM, bold: !!s.bs, italics: !s.bs }),
    new TextRun({ text: `ước tính ${mmss(s.giay)}`, font: FONT, size: 26, color: XAM }),
  ] }));
  if (s.tren) ND.push(dongNhan("Trên slide: ", s.tren, XAM));
  ND.push(nhan("Lời nói", "2E6DB4"));
  s.noi.forEach((p) => ND.push(loi(p)));
  if (s.hinh && s.hinh.length) { ND.push(nhan("Đọc hình và biểu đồ")); s.hinh.forEach((p) => ND.push(docHinh(p))); }
  ND.push(nhan("Số cần nhớ", XANH));
  s.y.forEach((p) => ND.push(y(p)));
  if (s.chi) ND.push(dongNhan("Chỉ vào: ", s.chi));
  if (s.hoi.length) {
    ND.push(nhan("Thầy có thể hỏi", LA));
    s.hoi.forEach(([h, d]) => { ND.push(hoiP(h)); ND.push(dapP(d)); });
  }
});

// ------------------------------------------------------------------ Phần C. hỏi đáp xuyên suốt
ND.push(muc("Phần C – Câu hỏi xuyên suốt và tình huống trên màn hình", true));
ND.push(doan("Các câu dưới đây không gắn với một slide; phần lớn xuất phát từ điều Thầy và các bạn thấy trên web hoặc trên giao diện cụm lúc demo."));
[
  ["Trang Chất lượng mô hình ghi “CHƯA ĐẠT”, vậy tiêu chí 2 đã đạt chưa?", "Dòng đó xét **ALS thuần** với hai vế: NDCG +1.237 % (đạt, yêu cầu +30 %) **và** độ phủ ≥ 10 % (3,44 %, chưa đạt). Đề chấp nhận kết quả nếu có phân tích; nhóm chỉ ra nguyên nhân (thiên lệch độ phổ biến, trần cấu trúc 75 %), triển khai xếp lại (6,47 %) và chứng minh offline cách vượt ngưỡng (14,5 %). Slide 24 ghi “Đạt, có phân tích độ phủ”; nhóm không nói đã đạt 10 %."],
  ["Bảng điều khiển A/B hiện p khác 0,015 trên slide?", "Slide và báo cáo dùng 7 ngày mô phỏng (350.160 lượt). Bảng trên web cộng thêm các lượt hiển thị thật khi nhóm thử web từ 11/11, nên p lệch nhẹ (17/11: 0,0138); kết luận giống nhau: CTR của B thấp hơn có ý nghĩa, chuyển đổi không khác."],
  ["Vì sao web ghi cần khoảng 76.9xx lượt mỗi nhóm, báo cáo ghi 76.972?", "Cỡ mẫu tính theo CTR nền hiện tại; thêm lượt thật làm CTR nền đổi chút nên số đổi theo. Cả hai đều cho kết luận: mỗi nhóm có khoảng 175 nghìn lượt, đủ độ mạnh."],
  ["Khối “Đang thịnh hành” lấy cửa sổ nào? Ô trên trang sản phẩm thì sao?", "Cùng bảng `gold.thinh_hanh_15p` (cửa sổ 15 phút, trượt mỗi phút, MERGE mỗi 20 giây). Khối Đang thịnh hành lấy **cửa sổ mới nhất**, tức cửa sổ đang mở của luồng; cửa sổ này bắt đầu ở phút của sự kiện mới nhất nên số đếm phản ánh hoạt động mới nhất, và thứ hạng theo điểm chuẩn hóa với trung bình 24 giờ. Ô trên trang sản phẩm hiện **cửa sổ 15 phút đang chạy** (kết thúc ở phút kế tiếp, đủ 15 phút gần nhất), và đo độ trễ trên cửa sổ bắt đầu ở phút của lần bấm (sửa ngày 17/11)."],
  ["Vì sao các phiên bản mô hình trên web cùng NDCG 0,0680?", "Cùng siêu tham số, seed 42 và cùng dữ liệu train/test: sự kiện web (năm 2026) bị loại khỏi việc chia, nên ngày cắt vẫn là 19/8/2015. ALS tất định nên ra đúng từng số. Điểm lõm 0,0574 là mô hình của lưới đêm thiếu alpha 40, bị cổng triển khai giữ lại."],
  ["Dấu X đỏ ở `kn_pipeline_hang_ngay`?", "Lượt 15/11 02:00: sensor chờ một ngày dữ liệu mới không bao giờ tới (bộ phát tắt trong lúc dời gốc hồ dữ liệu sang `/lakehouse`), nhóm đánh dấu Failed sáng 16/11, các task sau Skipped; DAG tạm dừng từ đó để các màn hình khớp báo cáo."],
  ["Vì sao giờ trên một số màn hình lệch 7 tiếng?", "Bảng Delta, Spark UI, HDFS và kết quả `curl` ghi **UTC**; Airflow và ô thịnh hành trên trang sản phẩm hiện giờ Việt Nam. Ví dụ tên mô hình `r20261111T190002` là 19:00 UTC, tức 02:00 sáng 12/11 giờ Việt Nam."],
  ["Hệ thống chịu được một máy chết không?", "Một worker hoặc DataNode: được (nhân bản 2, Spark chạy lại task, tối đa 8 lần thử). Máy master hoặc máy Kafka: không, đó là điểm lỗi đơn đã nêu ở slide 25; hướng khắc phục là NameNode HA, nhiều broker, master dự phòng."],
  ["Ai làm phần nào trong đồ án?", "**Lê Chí Tâm** – ML Engineer, DevOps/Orchestration: vận hành cụm (chạy pipeline, thí nghiệm mô hình, tuning, A/B, ba luồng, năm DAG, web trên cụm thật), thu bằng chứng, duyệt báo cáo, slide, kịch bản, trình bày và điều khiển demo; giải thích mã `jobs/ml/`, `jobs/kiem_tra/`, `jobs/bao_tri/`, `airflow/dags/`, `ha_tang/`, `scripts/cum/`. **Lê Nguyễn Quốc Anh** – Web Developer, Data Engineer: hạ tầng cụm gốc (Spark, Hadoop, Kafka), mạng ZeroTier cho sáu máy, phối hợp phòng lab, chọn máy cho từng vai trò; tải RetailRocket, job bronze ban đầu, kiểm tra dữ liệu; giải thích mã `producer/`, `jobs/streaming/`, `jobs/transform/`, `web/`."],
  ["Nhóm có dùng AI không? Dùng như thế nào?", "Có, và đã khai báo theo mục A.9 của đề cương trong `docs/AI_USAGE.md` (tóm tắt ở phụ lục báo cáo chính): công cụ (Claude), thời gian, phạm vi, phần nhóm tự làm. Phần lớn mã do AI sinh theo yêu cầu của nhóm nên phần lớn commit mang tên Claude. Trả lời đúng thực tế, không giảm nhẹ; nhấn vào phần nhóm làm: vận hành cụm 6 máy, chạy và gỡ lỗi mọi job trên cụm, ra quyết định triển khai, kiểm chứng số liệu."],
  ["Không chắc câu trả lời thì sao?", "Nói điều mình chắc chắn, chỉ rõ phần chưa làm hoặc chưa đo, đề nghị bổ sung trong báo cáo nộp trước 22/11. **Không đoán số.** Câu cần minh họa: chuyển sang trình duyệt (8 tab vẫn mở); không chạy job nặng, không kích hoạt DAG 5 trong lúc hỏi đáp."],
].forEach(([h, a]) => { ND.push(hoiP(h)); ND.push(dapP(a)); });

ND.push(muc2("Tập trước ngày 19/11"));
ND.push(y("Tập trọn bài ít nhất hai lần, nối tiếp ngay sau phần demo, đọc to với đồng hồ. Bài dài: chuẩn bị nước uống, nghỉ nhịp ở cuối mỗi phần."));
ND.push(y("Tập riêng các mục **Đọc hình và biểu đồ** của slide 11, 12, 13, 14, 15, 17, 19: đó là chỗ Thầy hay hỏi “trục này là gì, vì sao đường này gãy”."));
ND.push(y("Câu hỏi về chọn siêu tham số trên tháng kiểm tra, p-value khi lượt hiển thị không độc lập, hay độ phủ < 10 %: mở **slide 27**."));
ND.push(y("Câu hỏi sâu hơn: bộ hỏi – đáp `BD03_Hoi_dap_bao_ve.docx` và giáo trình (bài về BPR, item-kNN, MinHash/LSH)."));

// ------------------------------------------------------------------ xuất
const doc = new Document({
  creator: "Le Chi Tam",
  title: "Kịch bản demo và thuyết trình chi tiết BD03",
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
      new TextRun({ text: "BD03 · Kịch bản demo và thuyết trình chi tiết · trang ", font: FONT, size: 20, color: XAM }),
      new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: 20, color: XAM }),
    ] })] }) },
    children: ND,
  }],
});
const RA = path.join(__dirname, "BD03_Kich_ban_thuyet_trinh_chi_tiet_19_11.docx");
Packer.toBuffer(doc).then((b) => {
  fs.writeFileSync(RA, b);
  console.log("đã ghi", RA, Math.round(b.length / 1024), "KB");
  S.forEach((s) => console.log(s.nhan.padEnd(11), String(s.am).padStart(4) + " âm tiết", mmss(s.giay))); console.log("tổng", mmss(moc), "nói thêm", mmss(tongBS));
});
