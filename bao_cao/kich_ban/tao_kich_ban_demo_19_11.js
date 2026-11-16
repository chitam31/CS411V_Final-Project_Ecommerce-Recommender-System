// tao_kich_ban_demo_19_11.js - dựng "Kịch bản demo ngày 19/11/2026 – bản tường minh" thành .docx:
// Times New Roman 13, giãn dòng 1,5, A4. Chạy: node tao_kich_ban_demo_19_11.js -> BD03_Kich_ban_demo_19_11.docx
// Cú pháp nội dung: **đậm**, `mã`. Bản 14/11/2026: viết lại từ kịch bản 12/11, ghi rõ từng lệnh gõ ở
// cửa sổ nào / máy nào và từng đường link mở ở tab nào.
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
const ND = [];
const doan = (s, o = {}) => new Paragraph({ children: chu(s), spacing: { ...GIAN, after: 80 }, alignment: AlignmentType.JUSTIFIED, ...o });
const y = (s, keep = false) => new Paragraph({ children: chu(s), numbering: { reference: "y", level: 0 }, spacing: { ...GIAN, after: 40 }, keepNext: keep });
let dsSo = 0;
const batDauSo = () => { dsSo += 1; };
const so = (s, keep = false) => new Paragraph({ children: chu(s), numbering: { reference: "so", level: 0, instance: dsSo }, spacing: { ...GIAN, after: 40 }, keepNext: keep });
const muc = (s) => new Paragraph({ heading: HeadingLevel.HEADING_1, keepNext: true, children: [new TextRun({ text: s, font: FONT, size: 30, bold: true, color: XANH })] });
const muc2 = (s) => new Paragraph({ heading: HeadingLevel.HEADING_2, keepNext: true, children: [new TextRun({ text: s, font: FONT, size: 27, bold: true, color: XANH })] });
const nhan = (s) => new Paragraph({ children: [new TextRun({ text: s, font: FONT, size: 26, bold: true, color: CAM })], spacing: { ...GIAN, before: 80, after: 20 }, keepNext: true });
const ghi = (s) => new Paragraph({ children: chu(s, { color: XAM, italics: true }), spacing: { ...GIAN, after: 80 } });
const ngat = () => new Paragraph({ children: [new PageBreak()] });

// lời dẫn tiếng Anh: khung nền nhạt, viền trái xanh dương
const VIEN_LOI = { style: BorderStyle.SINGLE, size: 18, color: "2E6DB4", space: 8 };
const loi = (s) => new Paragraph({
  children: chu(s), alignment: AlignmentType.LEFT, spacing: { ...GIAN, after: 60 },
  indent: { left: 284, right: 113 }, border: { left: VIEN_LOI },
  shading: { type: ShadingType.CLEAR, fill: "EEF3FA", color: "auto" },
});

// Khung hai dòng: dòng nhãn (cửa sổ / tab) và dòng nội dung (lệnh / link) là HAI đoạn riêng, để bấm ba lần
// vào dòng lệnh chỉ chọn đúng lệnh. Hai đoạn cùng màu viền nên Word gộp thành một khung; hai khung liền
// nhau đổi màu viền xen kẽ để Word không gộp chúng.
let soKhung = 0;
function khung(nhanChu, noiDung, mauNhan, mauVien, nen) {
  soKhung += 1;
  const vien = { left: { style: BorderStyle.SINGLE, size: 18, color: mauVien[soKhung % 2], space: 6 } };
  const chung = { indent: { left: 284, right: 113 }, border: vien, shading: { type: ShadingType.CLEAR, fill: nen, color: "auto" } };
  return [
    new Paragraph({ ...chung, keepNext: true, keepLines: true, spacing: { line: 264, lineRule: "auto", before: 60, after: 0 },
      children: [new TextRun({ text: `[${nhanChu}]`, font: FONT, size: 22, bold: true, color: mauNhan })] }),
    new Paragraph({ ...chung, keepLines: true, spacing: { line: 264, lineRule: "auto", before: 0, after: 60 },
      children: [new TextRun({ text: noiDung, font: MA, size: 21 })] }),
  ];
}
const lenh = (may, s) => khung(may, s, CAM, ["8C96A3", "8D97A4"], "F1F3F5");
const mo = (tab, url) => khung(`Trình duyệt · ${tab}`, url, LA, ["2E7D32", "2E7D33"], "EAF5EC");
const L = (may, s) => ND.push(...lenh(may, s));
const M = (tab, url) => ND.push(...mo(tab, url));
const mongDoi = (s, keep = false) => new Paragraph({
  children: [new TextRun({ text: "→ ", font: FONT, size: 26, bold: true, color: LA }), ...chu(s)],
  spacing: { ...GIAN, after: 60 }, indent: { left: 284 }, keepNext: keep,
});

const VIEN = { style: BorderStyle.SINGLE, size: 4, color: "8C96A3" };
const TONG = 9071; // A4 21 cm − lề trái 3 cm − lề phải 2 cm = 16 cm
function bang(cot, dong, rong) {
  const w = rong.map((r) => Math.round((TONG * r) / 100));
  w[w.length - 1] = TONG - w.slice(0, -1).reduce((a, b) => a + b, 0);
  const o = (s, dau, j) => new TableCell({
    width: { size: w[j], type: WidthType.DXA }, borders: { top: VIEN, bottom: VIEN, left: VIEN, right: VIEN },
    shading: dau ? { type: ShadingType.CLEAR, fill: "DCE6F2", color: "auto" } : undefined,
    margins: { top: 40, bottom: 40, left: 90, right: 90 },
    children: String(s).split("\n").map((d) => new Paragraph({ children: chu(d, dau ? { bold: true } : {}), spacing: { line: 276, lineRule: "auto" } })),
  });
  return new Table({
    width: { size: TONG, type: WidthType.DXA }, columnWidths: w,
    rows: [cot, ...dong].map((d, i) => new TableRow({ tableHeader: i === 0, cantSplit: true, children: d.map((x, j) => o(x, i === 0, j)) })),
  });
}
const sauBang = () => new Paragraph({ children: [], spacing: { after: 80 } });
const giua = (text, o = {}, sp = {}) => new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 60, ...sp }, children: [new TextRun({ text, font: FONT, size: 26, ...o })] });

const WEB = "http://10.68.71.149:8000";
const C1 = "Cửa sổ 1 · labsoe-11";
const C2 = "Cửa sổ 2 · labsit";
const C3 = "Cửa sổ 3 · laptop";
const SPARK = "http://10.68.71.113:8080";
const HDFS = "http://10.68.71.113:9870/dfshealth.html#tab-datanode";
const KAFKA = "http://10.68.71.204:8080";
const AIRFLOW = "http://10.68.71.113:8088/dags";
const DAG5 = "http://10.68.71.113:8088/dags/kn_tai_lap";
const PHAT = "nohup python3 -u ~/bd03_khuyen_nghi/producer/phat_lai_su_kien.py --tep ~/du_lieu/retailrocket/events.csv --tu-ngay-ms 1438387200000 --ty-le-nguoi-moi 0 --giay-moi-ngay 300 > ~/phat.log 2>&1 &";
const MOI = (sp) => `curl -s -m 30 -X POST ${WEB}/api/su-kien -H "Content-Type: application/json" -d '{"ma_nguoi_dung":"demo_moi","ma_san_pham":"${sp}","loai":"xem"}'`;

// ================================================================== BÌA
ND.push(giua("TRƯỜNG ĐẠI HỌC TÂN TẠO · CS411V DỮ LIỆU LỚN", { bold: true }));
ND.push(giua("KỊCH BẢN DEMO NGÀY 19/11/2026", { size: 34, bold: true, color: XANH }, { before: 160 }));
ND.push(giua("Bản tường minh: từng lệnh, từng máy, từng đường link", { size: 28, color: XANH }));
ND.push(giua("Đề tài 3 – Hệ thống gợi ý sản phẩm thương mại điện tử (bd03_khuyen_nghi)", { italics: true }, { before: 120 }));
ND.push(giua("Lê Chí Tâm (2302220) · Lê Nguyễn Quốc Anh (2302283)"));
ND.push(giua("Giảng viên hướng dẫn: TS. Cao Tiến Dũng"));
ND.push(giua("Bản ngày 15/11/2026 · buổi demo và thuyết trình ngày 19/11/2026 tại phòng lab · không giới hạn thời gian, demo trước, slide sau · thay cho kịch bản demo ngày 12/11", { color: XAM }, { after: 240 }));

// ================================================================== CÁCH ĐỌC
ND.push(muc("Cách đọc kịch bản"));
ND.push(y("Kịch bản dùng cho buổi **demo và thuyết trình trước lớp ngày 19/11/2026**, học tại **phòng lab**. Thầy Dũng **không giới hạn thời gian**: **demo trước, slide sau**. Demo khoảng **14 phút**, đi qua đủ **8 tiêu chí nghiệm thu** và các yêu cầu chung của mục **C.4** đề cương (bước 7) trên cụm thật (mục 4); mục 5 chỉ dùng khi Thầy yêu cầu rút ngắn."));
ND.push(y("Bản này **thay cho** kịch bản demo ngày 12/11. Nội dung demo giữ nguyên; điểm mới là ghi rõ **từng lệnh gõ ở cửa sổ nào, trên máy nào** và **từng đường link mở ở tab nào**."));
ND.push(y("**T** là giờ nhóm bắt đầu phần của mình (mở đầu bằng demo). Chưa biết nhóm lên lượt mấy thì lấy T = giờ bắt đầu buổi học. T−90 là 90 phút trước T."));
ND.push(y("Phân vai: **Tâm** gõ lệnh và bấm máy; **Quốc Anh** nói lời dẫn và nhìn đồng hồ."));
ND.push(y("**Phụ lục D** là thẻ tóm tắt một trang: in ra và cầm theo ngày 19/11."));

ND.push(muc2("Thứ tự phần của nhóm"));
ND.push(bang(["Phần", "Từ – đến", "Thời lượng", "Ai"], [
  ["Mở đầu (slide 1)", "0:00 – 0:30", "0:30", "Quốc Anh nói"],
  ["Demo bước 0 → 7 (mục 4)", "0:30 – 13:30", "13:00", "Tâm bấm, Quốc Anh nói"],
  ["Câu chuyển sang slide", "13:30 – 14:00", "0:30", "Quốc Anh"],
  ["Thuyết trình (kịch bản thuyết trình chi tiết)", "14:00 – ~1:15:00", "~60 phút", "Tâm trình bày toàn bộ"],
  ["Hỏi đáp", "sau đó", "tùy Thầy", "Cả hai"],
], [44, 20, 14, 22]));
ND.push(sauBang());
ND.push(doan("Quốc Anh so đồng hồ ở 4 mốc của demo: **3:30** (hết bước 2), **7:00** (hết bước 4), **9:30** (hết bước 6), **13:30** (hết bước 7). Các mốc để giữ nhịp; chỉ cắt theo mục 5 khi Thầy yêu cầu rút ngắn."));
ND.push(muc2("Bốn loại khung trong kịch bản"));
ND.push(doan("**Khung xám** là **một lệnh** gõ trong Git Bash. Dòng chữ cam ghi cửa sổ và máy đang đứng; dòng chữ Courier bên dưới là lệnh. **Chỉ chép dòng Courier** (bấm ba lần vào dòng lệnh để chọn đúng cả dòng)."));
L(C1, "bash scripts/luong.sh trang_thai");
ND.push(doan("**Khung xanh lá** là **một trang web**: dòng trên ghi tab số mấy, dòng dưới là đường link. Dán link vào thanh địa chỉ của đúng tab đó rồi Enter."));
M("tab 5 · Chất lượng mô hình", `${WEB}/mo-hinh`);
ND.push(mongDoi("Dòng bắt đầu bằng mũi tên xanh là **kết quả phải thấy**."));
ND.push(loi("Khung viền xanh dương là lời dẫn tiếng Anh cho Quốc Anh."));

ND.push(new Paragraph({ heading: HeadingLevel.HEADING_2, keepNext: true, pageBreakBefore: true, children: [new TextRun({ text: "Quy tắc khi gõ lệnh", font: FONT, size: 27, bold: true, color: XANH })] }));
ND.push(y("Dán **từng khung một**, chờ có kết quả rồi mới dán khung sau. Không dán nhiều lệnh cùng lúc (ngày 12/11 dán cả khối bắt đầu bằng `ssh` thì các dòng sau bị mất)."));
ND.push(y("Dán vào Git Bash bằng **Shift+Insert** (hoặc chuột phải rồi chọn Paste). Ctrl+V có thể không dán được trong Git Bash."));
ND.push(y("Trước khi gõ, **nhìn dấu nhắc lệnh** để chắc đang ở đúng máy (bảng 0.2)."));
ND.push(y("Thay `moi_xxxxxxxx` bằng mã người dùng thật tạo ở bước 3."));
ND.push(y("**Không gõ mật khẩu khi màn hình đang chiếu.** Đăng nhập Airflow trước khi nối máy chiếu (mốc T−20)."));

// ================================================================== 0. TRA CỨU NHANH
ND.push(muc("0. Tra cứu nhanh"));
ND.push(muc2("0.1 Các máy và lệnh SSH"));
ND.push(bang(["Máy", "IP ZeroTier", "Lệnh từ laptop", "Việc trong buổi demo"], [
  ["labsoe-11 (master)", "10.68.71.113", "`ssh labsoe-11`\n(tài khoản hduser)", "Spark Master, HDFS NameNode, Airflow. Mọi lệnh kiểm tra, mồi sản phẩm, lệnh dự phòng: **cửa sổ 1**"],
  ["labsit", "10.68.71.204", "`ssh labsit`", "Kafka, Kafka UI, **bộ phát** sự kiện: **cửa sổ 2**"],
  ["labsoe-18", "10.68.71.149", "`ssh labsoe-18`", "Web (container `bd03-web`). Chỉ đụng tới khi phải khởi động lại web"],
  ["labsit12, labsit-may25, labsit-may26", ".198, .42, .90", "–", "Worker và DataNode. **Không cần SSH** trong buổi demo"],
  ["Laptop", "10.68.71.182", "–", "Git Bash ở `/d/BIG DATA/bd03_khuyen_nghi` (**cửa sổ 3**), trình duyệt, slide"],
], [21, 15, 22, 42]));
ND.push(sauBang());
ND.push(ghi("Lệnh `ssh` dùng tên tắt đã khai báo trong `~/.ssh/config` của laptop. Khi đứng ngoài mạng lab, SSH đôi khi treo (báo `banner exchange` hoặc đứng ở `KEX`): nhấn Ctrl+C, chạy lại; vẫn treo thì đi vòng qua labsoe-18 bằng `ssh -J labsoe-18 labsoe-11`."));

ND.push(muc2("0.2 Ba cửa sổ Git Bash"));
ND.push(bang(["Cửa sổ", "Mở thế nào", "Dấu nhắc lệnh khi đúng", "Dùng cho"], [
  ["**1** · labsoe-11", "Git Bash → `ssh labsoe-11` → `cd ~/bd03_khuyen_nghi`", "bắt đầu bằng `hduser@`, kết thúc bằng `~/bd03_khuyen_nghi$`", "Kiểm tra cụm, luồng, web; mồi sản phẩm; lệnh dự phòng ở bước 4"],
  ["**2** · labsit", "Git Bash → `ssh labsit`", "bắt đầu bằng `labsit@`, kết thúc bằng `~$`", "Bật bộ phát (T−10), tắt bộ phát (sau demo)"],
  ["**3** · laptop", "Git Bash → `cd \"/d/BIG DATA/bd03_khuyen_nghi\"`", "có chữ `MINGW64` và `/d/BIG DATA/bd03_khuyen_nghi`", "Lệnh chạy trên laptop; đường hầm SSH; khởi động lại web"],
], [15, 31, 28, 26]));
ND.push(sauBang());

ND.push(muc2("0.3 Tám tab trình duyệt (mở đúng thứ tự này)"));
ND.push(bang(["Tab", "Trang", "Link", "Bước"], [
  ["1", "Spark Master", `\`${SPARK}\``, "0"],
  ["2", "HDFS · Datanodes", `\`${HDFS}\``, "0"],
  ["3", "Kafka UI", `\`${KAFKA}\`\nrồi bấm **Topics** → \`retailrocket-events\``, "0, 4"],
  ["4", "Airflow (danh sách DAG)", `\`${AIRFLOW}\``, "0, 6"],
  ["5", "Web · Chất lượng mô hình", `\`${WEB}/mo-hinh\``, "1, 2"],
  ["6", "Web · Trang chủ", `\`${WEB}/\``, "3, 5"],
  ["7", "Web · Bảng điều khiển A/B", `\`${WEB}/ab\``, "5"],
  ["8", "Web · Tái lập thí nghiệm", `\`${WEB}/tai-lap\``, "6"],
], [7, 26, 57, 10]));
ND.push(sauBang());

ND.push(muc2("0.4 Link gõ trong lúc demo"));
ND.push(bang(["Việc", "Link"], [
  ["Tạo người dùng mới (bước 3)", "Bấm nút **+ Người dùng mới (cold start)** ở tab 6 (tương đương `" + WEB + "/nguoi-dung-moi`)"],
  ["Trang chủ của người dùng vừa tạo", `\`${WEB}/?u=moi_xxxxxxxx\``],
  ["Trang sản phẩm vòng khép kín (bước 4)", `\`${WEB}/san-pham/102605?u=moi_xxxxxxxx\`\ndự phòng: \`${WEB}/san-pham/320844?u=moi_xxxxxxxx\``],
  ["Nhóm B / nhóm A (bước 5)", `\`${WEB}/?u=270018\`\n\`${WEB}/?u=1287993\``],
  ["Người dùng có ô 9–10 “Theo danh mục” (bước 3)", `\`${WEB}/?u=\`________ (ghi ở mục 2.3)`],
  ["DAG 5 trên Airflow (T−90, bước 6)", `\`${DAG5}\``],
  ["Khi dùng đường hầm SSH (mục 2.4)", "Thay `" + WEB + "` bằng `http://localhost:8001` trong mọi link web"],
], [34, 66]));
ND.push(sauBang());

ND.push(muc2("0.5 Số liệu dùng trong demo"));
ND.push(bang(["Mục", "Giá trị"], [
  ["User nhóm A / nhóm B", "`1287993` (toàn ô ALS) / `270018` (ô 3, 6, 8 là Thịnh hành)"],
  ["Sản phẩm vòng khép kín", "Chính `102605`, dự phòng `320844`. Cả hai được **mồi** ở mốc T−8 (mục 3.8)"],
  ["Mô hình đang phục vụ", "`als_v2_r20261111T190002`: features v4, rank 50, regParam 1,0, alpha 40, NDCG@10 = 0,0680. Số liệu trùng hoàn toàn với `als_v2_r20261110T230924` trong báo cáo"],
  ["Tái lập đã có sẵn", "6 dòng, đều **CÓ**. Hai dòng ngày 12/11 (features v4): lệch 3,55·10⁻¹⁵ và 1,78·10⁻¹⁵"],
  ["Giờ trên màn hình", "Airflow hiện giờ Việt Nam. Bảng tái lập, cửa sổ thịnh hành và Spark UI của từng ứng dụng ghi giờ **UTC**: cộng 7 tiếng"],
], [26, 74]));
ND.push(sauBang());

ND.push(muc2("0.6 Bản đồ 8 tiêu chí"));
ND.push(bang(["#", "Tiêu chí", "B.", "Tab · màn hình", "Số cần nói"], [
  ["1", "Tuning ≥ 9 tổ hợp", "1", "Tab 5 → Bảng tuning", "Lưới 27 tổ hợp; tốt nhất rank 50 / 1,0 / 40, NDCG@10 = 0,0680"],
  ["2", "ALS so với 2 baseline", "1", "Tab 5 → bảng so sánh, biểu đồ độ phổ biến", "+1.237 %, +43 %; coverage 3,44 % → khi phục vụ 6,47 %"],
  ["8", "OPTIMIZE / Z-ORDER", "2", "Tab 5 → cuối trang", "Tệp đọc 67 → 1,07; 8.280 → 980 ms; nhanh 8,4 lần"],
  ["3", "3 chiến lược cold start", "3", "Tab 6 → + Người dùng mới", "Người mới · ít tương tác · item mới (ô 9–10)"],
  ["4", "Thịnh hành ≤ 90 giây", "4", "Tab sản phẩm → “ĐÃ CẬP NHẬT sau N giây”", "Đo ngày 11/11: 51 giây"],
  ["5", "Vòng khép kín", "4", "Tab 3 Kafka UI (`\"nguon\": \"web\"`), lệnh tìm trong bronze", "Kafka → bronze 10,3 giây"],
  ["6", "A/B có p-value", "5", "Tab 7", "Báo cáo p = 0,015; nói thêm số đang hiện (ghi ở T−15)"],
  ["7", "Tái lập (VERSION AS OF)", "6", "Tab 8 (và tab 4)", "A/B lệch 0; huấn luyện lệch ≤ 3,55·10⁻¹⁵"],
], [5, 21, 6, 34, 34]));
ND.push(sauBang());

// ================================================================== 1. MỞ CỬA SỔ LÀM VIỆC
ND.push(ngat());
ND.push(muc("1. Mở cửa sổ làm việc"));
ND.push(doan("Làm phần này **mỗi lần** ngồi vào laptop để kiểm tra, tập hoặc demo (khoảng 3 phút). Các mục sau chỉ ghi “cửa sổ 1”, “cửa sổ 2”, “cửa sổ 3”, “tab 5”…, nghĩa là các cửa sổ và tab đã mở ở đây."));

ND.push(muc2("1.1 Cửa sổ 3 – laptop"));
batDauSo();
ND.push(so("Bấm **Start**, gõ `Git Bash`, Enter."));
L(C3, 'cd "/d/BIG DATA/bd03_khuyen_nghi"');
ND.push(mongDoi("Dấu nhắc có chữ `MINGW64` và kết thúc bằng `/d/BIG DATA/bd03_khuyen_nghi`. Đường dẫn có dấu cách nên **phải có ngoặc kép**."));
L(C3, "bash scripts/cum/ssh_tat_ca.sh hostname");
ND.push(mongDoi("In đủ 6 tên máy, master trước, không có dòng lỗi. Máy nào báo lỗi: chạy lại một lần; vẫn lỗi thì xem mục 6."));

ND.push(muc2("1.2 Cửa sổ 1 – labsoe-11 (master)"));
batDauSo();
ND.push(so("Mở **cửa sổ Git Bash thứ hai** (Start → Git Bash)."));
L("Cửa sổ 1 · laptop", "ssh labsoe-11");
ND.push(mongDoi("Dấu nhắc đổi thành `hduser@…`. Treo quá 20 giây: Ctrl+C rồi chạy lại; vẫn treo: `ssh -J labsoe-18 labsoe-11`."));
L(C1, "cd ~/bd03_khuyen_nghi");
ND.push(mongDoi("Dấu nhắc kết thúc bằng `~/bd03_khuyen_nghi$`. **Mọi lệnh ghi “Cửa sổ 1 · labsoe-11” đều chạy ở thư mục này.**"));

ND.push(muc2("1.3 Cửa sổ 2 – labsit (Kafka, bộ phát)"));
batDauSo();
ND.push(so("Mở **cửa sổ Git Bash thứ ba**."));
L("Cửa sổ 2 · laptop", "ssh labsit");
ND.push(mongDoi("Dấu nhắc đổi thành `labsit@…`. Để sẵn cửa sổ này; chỉ dùng ở mốc T−10 (bật bộ phát) và sau demo (tắt bộ phát)."));

ND.push(muc2("1.4 Tám tab trình duyệt"));
batDauSo();
ND.push(so("Mở trình duyệt, đóng hết tab cá nhân. Mở lần lượt 8 link ở bảng 0.3, mỗi link một tab, **đúng thứ tự**."));
ND.push(so("Tab 3 (Kafka UI): khi trang hiện, bấm **Topics** ở menu trái → bấm `retailrocket-events` → tab **Overview**."));
ND.push(so("Tab 4 (Airflow): đăng nhập tài khoản `admin`. **Chỉ gõ mật khẩu khi chưa nối máy chiếu.**"));
ND.push(so("Lưu cả 8 tab thành một thư mục dấu trang: nhấn **Ctrl+Shift+D**, đặt tên `BD03 demo`, Save. Lần sau: mở trình quản lý dấu trang (**Ctrl+Shift+O**), chuột phải thư mục `BD03 demo` → **Open all** (mở tất cả)."));

ND.push(muc2("1.5 Thoát"));
ND.push(y("Gõ `exit` ở cửa sổ 1 hoặc 2 để quay về laptop."));
ND.push(y("Bộ phát chạy bằng `nohup` nên **vẫn chạy** khi cửa sổ 2 bị đóng hoặc mất kết nối. Muốn tắt phải dùng lệnh ở mục 9.1."));

// ================================================================== 2. CHUẨN BỊ TRƯỚC 19/11
ND.push(ngat());
ND.push(muc("2. Chuẩn bị trước ngày 19/11 (15–18/11)"));

ND.push(muc2("2.1 Kiểm tra nhanh mỗi ngày (khoảng 5 phút, làm được từ nhà)"));
ND.push(doan("Mở cửa sổ 1 (mục 1.2), rồi chạy lần lượt:", { keepNext: true }));
L(C1, "bash scripts/cum/kiem_tra_cum.sh");
ND.push(mongDoi("Mọi cổng `OK`, không có chữ `DONG`; `DataNode sống: 5 | chết: 0`; `Worker sống: 5 | lõi: 34`; dòng cuối `== Cụm ổn`."));
L(C1, "bash scripts/cum/tinh_trang.sh");
ND.push(mongDoi("RAM master còn trên 1 GB khả dụng. Swap cao là bình thường: **không** dọn swap, **không** khởi động lại master (bỏ qua dòng “System restart required”)."));
L(C1, "bash scripts/luong.sh trang_thai");
ND.push(mongDoi("3 luồng đang chạy: `bd03-nap-su-kien`, `bd03-tinh-thinh-hanh`, `bd03-ghi-hien-thi`. Thiếu luồng nào thì chạy lệnh dưới, chờ 1 phút rồi chạy lại lệnh `trang_thai`:", true));
L(C1, "bash scripts/luong.sh khoi_dong tat_ca");
ND.push(doan("Kiểm tra gốc lakehouse mới (một lần, sau khi chạy `bash scripts/cum/chuyen_lakehouse.sh --chay` từ laptop):", { keepNext: true }));
L(C1, "bash scripts/demo/cay_hdfs.sh");
ND.push(mongDoi("Mọi đường dẫn bắt đầu bằng `/lakehouse/bd03_khuyen_nghi`, có `_quarantine/tuong_tac`. Báo không có thư mục: chưa chuyển gốc."));
ND.push(doan("Kiểm tra web:", { keepNext: true }));
L(C1, `curl -s ${WEB}/api/suc-khoe`);
ND.push(mongDoi("`{\"che_do\":\"delta\",\"kafka\":\"GuiKafka\"}`. Nếu ra `\"che_do\":\"gia\"` (chế độ giả lập, số liệu giả): khởi động lại web bằng lệnh dưới, chờ khoảng 30 giây rồi kiểm tra lại.", true));
L(C3, 'ssh labsoe-18 "docker restart bd03-web"');
ND.push(doan("Kiểm tra công tắc các DAG trên Airflow:", { keepNext: true }));
M("tab 4 · Airflow", AIRFLOW);
ND.push(mongDoi("Đủ 5 DAG, công tắc đúng như bảng dưới:"));
ND.push(bang(["DAG", "Công tắc phải là", "Ghi chú"], [
  ["`kn_pipeline_hang_ngay` (DAG 1)", "**Tạm dừng** (xám)", "Giữ tạm dừng tới khi nộp bài xong, để màn hình khớp báo cáo"],
  ["`kn_giam_sat_streaming`", "Tạm dừng", "Có thể bật trong lúc bộ phát chạy ngày 19/11 (mục 3.7)"],
  ["`kn_tinh_ab`", "Bật", "Chạy mỗi giờ"],
  ["`kn_bao_tri`", "Bật", "Chạy 04:00 mỗi ngày; xóa dòng thịnh hành cũ hơn 2 ngày, nên phải mồi sản phẩm (mục 3.8)"],
  ["`kn_tai_lap` (DAG 5)", "Bật", "Chỉ chạy khi kích hoạt tay (mục 3.1)"],
], [33, 22, 45]));
ND.push(sauBang());
ND.push(y("`kn_pipeline_hang_ngay` đang bật: tắt ngay, rồi mở tab 5 xem tên mô hình mới nhất có đổi không; đổi thì ghi tên mới ở mục 2.3."));
ND.push(y("Ô **Triggerer** màu đỏ là cố ý (không có deferrable operator, sensor chạy `mode=reschedule`). Lần chạy `kn_tinh_ab` đỏ lúc 16:00 ngày 11/11 là sự cố 31 đã ghi trong báo cáo."));

ND.push(muc2("2.2 Buổi tập trọn kịch bản ở lab (một buổi trong 15–18/11, khoảng 2 giờ)"));
batDauSo();
ND.push(so("Làm mục 1, rồi mục 3 từ mốc **T−45 tới T−5**, rồi mục 4 từ bước 0 tới câu kết, cả bước 7 (Trigger `kn_tinh_ab`, `cay_hdfs.sh`, `delta_sql.sh demo`). Quốc Anh bấm giờ từng bước."));
ND.push(so("Không cần kích hoạt DAG 5 trong buổi tập (bảng tái lập đã có 6 dòng CÓ). Muốn thử thì kích hoạt **trước khi bật bộ phát** và chờ xanh rồi mới tập tiếp."));
ND.push(so("Quay video **toàn màn hình** làm phương án dự phòng mất mạng: dùng **OBS Studio** (nguồn Display Capture) hoặc **Snipping Tool** của Windows 11 ở chế độ quay video, chọn cả màn hình. **Không dùng Win+Alt+R** (Xbox Game Bar): công cụ này chỉ quay một cửa sổ, sẽ mất phần Git Bash khi chuyển qua lại."));
ND.push(so("Chụp màn hình tab 1–4 (Spark, HDFS, Kafka UI, Airflow) và 4 trang web; lưu cùng video vào laptop và USB."));
ND.push(so("Tập xong: **tắt bộ phát** (mục 9.1) để tối đó cụm nhẹ. Ghi số giây đo được ở bước 4 vào `NHAT_KY.md`."));

ND.push(muc2("2.3 Ghi lại các số đang hiện"));
ND.push(bang(["Mục", "Mở ở đâu", "Giá trị"], [
  ["Tên mô hình `trien_khai` mới nhất", "Tab 5 → dòng “Mô hình mới nhất”", "________________"],
  ["Features v của mô hình đó", "Tab 5 → bảng lịch sử mô hình, cột “Features v”", "____"],
  ["Dòng đầu ô chọn ở trang Tái lập", "Tab 8 → mục “Tái lập huấn luyện mô hình”", "features v____ (phải là v4 thì mới dùng được lệnh ở mục 3.1, cách B)"],
  ["Số tổ hợp của bảng tuning", "Tab 5 → tiêu đề “Bảng tuning của lần chạy mới nhất (… tổ hợp)”", "____"],
  ["p-value CTR", "Tab 7", "________"],
  ["User có ô 9–10 nhãn “Theo danh mục”", "Tab 6 → ô **Chọn người dùng mẫu…**, thử vài user", "________"],
], [32, 38, 30]));
ND.push(sauBang());
ND.push(ghi("Ngày 12/11 bảng tuning trên màn hình là của lần chạy 19:00 ngày 11/11, có 10 tổ hợp (vẫn ≥ 9); lưới đủ 27 tổ hợp nằm trong báo cáo. User 1287993 hiện toàn ô ALS vì nguồn item mới của user này cạn; nên tìm sẵn một user có ô 9–10 “Theo danh mục” để minh họa chiến lược item mới."));

ND.push(muc2("2.4 Thử đường hầm SSH (dùng khi web treo vì đứng ngoài mạng lab)"));
L(C3, "ssh -N -L 8001:localhost:8000 labsoe-18");
ND.push(mongDoi("Cửa sổ đứng im, không in gì: **đúng**. Để nguyên cửa sổ này."));
M("tab bất kỳ", "http://localhost:8001");
ND.push(mongDoi("Trang chủ web hiện ra. Khi dùng đường hầm, mọi link web ở bảng 0.3 và 0.4 đổi `http://10.68.71.149:8000` thành `http://localhost:8001`."));
ND.push(y("Tắt đường hầm: bấm vào cửa sổ đó, nhấn **Ctrl+C**."));
ND.push(y("Đường hầm chiếm cửa sổ 3. Cần chạy lệnh laptop khác thì mở thêm một Git Bash và làm lại lệnh `cd` ở mục 1.1."));

ND.push(muc2("2.5 Chuẩn bị laptop"));
ND.push(y("Tắt chế độ ngủ khi cắm sạc (Settings → System → Power); bật Do not disturb; thoát Zalo, Messenger và ứng dụng đồng bộ."));
ND.push(y("Trình duyệt: đóng tab cá nhân và tab Claude; ẩn thanh dấu trang (**Ctrl+Shift+B**); phóng to 110–125 % và thử trên máy chiếu."));
ND.push(y("Git Bash: chuột phải thanh tiêu đề → **Options** → **Text** → cỡ chữ 14–16 → **Save**."));

ND.push(muc2("2.6 Tối 18/11"));
ND.push(y("Chép vào USB: slide (PDF và bản trình chiếu), video và ảnh chụp buổi tập, kịch bản này (PDF), báo cáo (PDF)."));
ND.push(y("Sạc đầy laptop; mang sạc và đầu chuyển HDMI. In Phụ lục D."));
ND.push(y("Buổi học ở phòng lab, nơi đặt chính các máy của cụm: nhờ Thầy Dũng nhắc lớp **không tắt, không khởi động lại, không rút mạng** 6 máy labsoe-11, labsoe-18, labsit, labsit12, labsit-may25, labsit-may26 trong buổi học."));
ND.push(y("Dán giấy lên 6 máy đó: “Máy đang chạy cụm đồ án BD03 – xin đừng tắt / khởi động lại”."));
ND.push(y("Kiểm tra lần cuối ở cửa sổ 2: bộ phát **đang tắt** (lệnh `pgrep` ở mục 3.7 in `CHUA_CHAY`). Ở tab 4: `kn_pipeline_hang_ngay` vẫn tạm dừng."));

// ================================================================== 3. NGÀY 19/11
ND.push(ngat());
ND.push(muc("3. Ngày 19/11: các mốc từ T−90 đến T"));
ND.push(doan("Điền giờ vào cột “Giờ” ngay khi biết giờ T. Ví dụ T = 13:00 thì T−90 = 11:30, T−45 = 12:15, T−10 = 12:50."));
ND.push(bang(["Mốc", "Giờ", "Việc", "Ở đâu", "Ai", "Xong"], [
  ["T−90", "", "**Kích hoạt DAG 5** một lần, khi bộ phát **chưa** chạy (3.1)", "Tab 8 hoặc cửa sổ 1", "Tâm", "☐"],
  ["T−60", "", "Có mặt ở phòng; cắm máy chiếu; thử mạng (3.2)", "Laptop", "Cả hai", "☐"],
  ["T−45", "", "Mở 3 cửa sổ Git Bash; kiểm tra cụm (3.3)", "Cửa sổ 1–3", "Tâm", "☐"],
  ["T−30", "", "DAG 5 phải **xanh**; nạp sẵn các trang web (3.4)", "Tab 4–8", "Tâm", "☐"],
  ["T−20", "", "Đăng nhập Airflow **trước khi chiếu**; xếp 8 tab (3.5)", "Trình duyệt", "Tâm", "☐"],
  ["T−15", "", "Ghi p-value đang hiện, báo Quốc Anh (3.6)", "Tab 7", "Tâm", "☐"],
  ["T−10", "", "**Bật bộ phát** 300 giây/ngày (3.7)", "Cửa sổ 2", "Tâm", "☐"],
  ["T−8", "", "**Mồi** 2 sản phẩm demo (3.8)", "Cửa sổ 1", "Tâm", "☐"],
  ["T−5", "", "Kiểm tra lần cuối (3.9)", "Cửa sổ 1, tab 6, tab 3", "Tâm", "☐"],
  ["T−2", "", "Chiếu slide 1 (tiêu đề); trình duyệt để sẵn ở tab 1; điện thoại im lặng", "Máy chiếu", "Cả hai", "☐"],
], [9, 10, 41, 21, 10, 9]));
ND.push(sauBang());
ND.push(y("**Nhóm lên muộn hơn T** (các nhóm khác trình bày trước): vẫn ổn. Bộ phát chạy khoảng 4 giờ; sản phẩm đã mồi vẫn dùng được, vì trang sản phẩm so với dòng thịnh hành **mới nhất** của sản phẩm, dòng đó cũ bao lâu cũng được."));
ND.push(y("**T rơi vào buổi sáng sớm**: kích hoạt DAG 5 từ nhà bằng cách B ở mục 3.1 (chỉ cần SSH vào cửa sổ 1), hoặc kích hoạt tối 18/11 sau khi bộ phát đã tắt. Khi đó 2 dòng mới mang ngày 18/11, vẫn là bằng chứng hợp lệ."));

ND.push(muc2("3.1 T−90 · Kích hoạt DAG 5 (tái lập huấn luyện)"));
ND.push(nhan("Cách A – bấm trên web"));
M("tab 8 · Tái lập thí nghiệm", `${WEB}/tai-lap`);
batDauSo();
ND.push(so("Kéo xuống mục **“Tái lập huấn luyện mô hình (DAG kn_tai_lap)”**."));
ND.push(so("Ô chọn để nguyên **dòng đầu tiên**, ví dụ `features v4 · als_v2_r20261111T190002 · NDCG 0.0680` (trùng mô hình đang phục vụ)."));
ND.push(so("Bấm **Kích hoạt kn_tai_lap** **đúng một lần**."));
ND.push(mongDoi("Dưới nút hiện `{\"dag_id\":\"kn_tai_lap\",\"dag_run_id\":\"manual__…\",\"trang_thai\":\"queued\"}`."));
ND.push(nhan("Cách B – một lệnh (khi ở nhà, hoặc trang web chậm)"));
ND.push(doan("Lệnh gửi đúng yêu cầu mà nút ở cách A gửi, với features v4. Chỉ dùng khi dòng đầu ô chọn là features v4 (đã ghi ở mục 2.3). Mở cửa sổ 1 (mục 1.2) rồi chạy **một lần**:", { keepNext: true }));
L(C1, `curl -s -m 60 -X POST "${WEB}/api/tai-lap-mo-hinh?phien_ban_delta=4"`);
ND.push(mongDoi("Cùng kết quả như cách A: `{\"dag_id\":\"kn_tai_lap\",…,\"trang_thai\":\"queued\"}`."));
ND.push(nhan("Theo dõi"));
M("tab 4 · Airflow", DAG5);
ND.push(mongDoi("Có một lượt mới đang chạy. Khi cụm rảnh, DAG chạy khoảng **20–25 phút**."));
ND.push(y("Trong lúc DAG 5 chạy: **không** bật bộ phát, **không** chạy job tay nào khác, **không** kích hoạt lần nữa."));
ND.push(y("Lỡ mốc T−90 (đến muộn): **bỏ qua bước này**. Ở bước 6 dùng các dòng đã có (6 dòng **CÓ**). Không kích hoạt DAG 5 sát giờ demo."));

ND.push(muc2("3.2 T−60 · Vào phòng lab, nối máy chiếu, thử mạng"));
batDauSo();
ND.push(so("Đi một vòng: 6 máy cụm vẫn bật, giấy còn dán. Có bạn đang ngồi máy cụm thì nhờ đổi sang máy khác."));
ND.push(so("Cắm máy chiếu, nhấn **Win + P** → **Duplicate**. Độ phân giải 1920×1080 hoặc 1280×720."));
ND.push(so("Mở slide ở chế độ trình chiếu thử một lần, rồi thoát."));
ND.push(so("Thử mạng: mở link dưới, trang chủ phải hiện đủ trong vài giây.", true));
M("tab bất kỳ", `${WEB}/`);
ND.push(so("Ở phòng lab, web thường mở thẳng được. Nếu trang hiện một nửa rồi đứng (lỗi MTU): bật đường hầm (mục 2.4) và đổi mọi link web sang `http://localhost:8001`."));
ND.push(so("Tab 1–4 (Spark, HDFS, Kafka UI, Airflow) không mở được qua mạng phòng học: ở bước 0 dùng ảnh chụp của buổi tập và nói rõ ngày chụp."));

ND.push(muc2("3.3 T−45 · Mở cửa sổ và kiểm tra cụm"));
ND.push(doan("Làm mục 1.1–1.3 (ba cửa sổ Git Bash). Ở cửa sổ 1:", { keepNext: true }));
L(C1, "bash scripts/cum/kiem_tra_cum.sh");
ND.push(mongDoi("Không `DONG`, 5 DataNode, 5 worker. Spark có **4** ứng dụng nếu DAG 5 còn chạy (3 luồng và `bd03-tai-lap-huan-luyen`)."));
L(C1, "bash scripts/luong.sh trang_thai");
ND.push(mongDoi("3 luồng đang chạy."));
L(C1, `curl -s ${WEB}/api/suc-khoe`);
ND.push(mongDoi("`\"che_do\":\"delta\"`."));

ND.push(muc2("3.4 T−30 · DAG 5 đã xanh, nạp sẵn web"));
M("tab 4 · Airflow", DAG5);
ND.push(mongDoi("Lượt hôm nay có 2 task xanh: `chay_lai_huan_luyen`, `so_sanh_voi_lich_su`."));
M("tab 8 · Tái lập thí nghiệm", `${WEB}/tai-lap`);
ND.push(mongDoi("Nhấn **Ctrl+F5**: bảng “Tái lập huấn luyện mô hình” có **2 dòng mới** (giờ UTC của hôm nay), cột trùng khớp **CÓ**."));
ND.push(y("**DAG 5 chưa xanh:** chờ, **chưa bật bộ phát**. Tới T−10 vẫn chưa xanh: không bật bộ phát; khối thịnh hành sẽ thưa nhưng các bước khác vẫn làm được; ở bước 6 chỉ lượt đang chạy và các dòng cũ."));
ND.push(doan("Mở lần lượt 3 trang dưới, mỗi trang nhấn **Ctrl+F5** một lần để web nạp sẵn bộ đệm. **Không** mở trang sản phẩm.", { keepNext: true }));
M("tab 6 · Trang chủ", `${WEB}/`);
M("tab 5 · Chất lượng mô hình", `${WEB}/mo-hinh`);
M("tab 7 · Bảng điều khiển A/B", `${WEB}/ab`);

ND.push(muc2("3.5 T−20 · Đăng nhập Airflow, xếp tab"));
batDauSo();
ND.push(so("**Chưa** nối máy chiếu (hoặc tạm ngắt bằng Win + P → PC screen only): đăng nhập Airflow ở tab 4, tài khoản `admin`."));
ND.push(so("Đóng mọi tab khác. Kiểm tra đủ 8 tab đúng thứ tự bảng 0.3 (thiếu thì Ctrl+Shift+O → thư mục `BD03 demo` → Open all)."));
ND.push(so("Cửa sổ trình duyệt thứ hai (hoặc ứng dụng trình chiếu): slide. **Không** mở sẵn tab trang sản phẩm."));

ND.push(muc2("3.6 T−15 · Ghi p-value"));
M("tab 7 · Bảng điều khiển A/B", `${WEB}/ab`);
ND.push(mongDoi("Đọc p-value của CTR, ghi vào đây: ____________, báo Quốc Anh (dùng ở bước 5)."));

ND.push(muc2("3.7 T−10 · Bật bộ phát (cửa sổ 2)"));
L(C2, 'pgrep -f "phat_lai_su_kie[n]" || echo CHUA_CHAY');
ND.push(mongDoi("`CHUA_CHAY`. Nếu in ra một số: bộ phát đã chạy từ trước, **không** bật thêm; nhảy tới lệnh `tail`."));
L(C2, PHAT);
ND.push(mongDoi("Chỉ hiện một dòng kiểu `[1] 3013475`."));
L(C2, "sleep 10; tail -3 ~/phat.log");
ND.push(mongDoi("Có dòng `Phát 857072 sự kiện, 48.1 ngày dữ liệu, dự kiến … phút` (khoảng 240 phút). Hai dòng `DeprecationWarning` của thư viện Kafka là cảnh báo, không phải lỗi. Thấy `Traceback` thì dừng lại và xem mục 6."));
ND.push(y("Để nguyên cửa sổ 2. Bộ phát vẫn chạy kể cả khi cửa sổ này bị đóng hay mất kết nối."));
ND.push(y("Ý nghĩa tham số: `1438387200000` là 01/08/2015 (48 ngày cuối của dữ liệu); `--giay-moi-ngay 300` phát một ngày dữ liệu trong 5 phút (khoảng 60 sự kiện/giây, chạy khoảng 4 giờ); `--ty-le-nguoi-moi 0` vì đây là lần phát lặp, không sinh lại mã `moi_<n>`. Silver bỏ trùng theo nội dung nên phát lặp không làm sai dữ liệu."));
ND.push(y("Tùy chọn: ở tab 4 bật công tắc `kn_giam_sat_streaming`; tắt lại sau buổi demo (mục 9.1)."));

ND.push(muc2("3.8 T−8 · Mồi 2 sản phẩm demo (cửa sổ 1)"));
ND.push(doan("Gửi 1 lượt **xem** cho mỗi sản phẩm để sản phẩm có sẵn một dòng trong bảng thịnh hành với số thêm giỏ bằng 0. Nhờ vậy, ở bước 4 trang sản phẩm mới in được dòng “ĐÃ CẬP NHẬT sau N giây”.", { keepNext: true }));
L(C1, MOI("102605"));
L(C1, MOI("320844"));
ND.push(mongDoi("Mỗi lệnh ra `{\"da_gui\":true,\"luc_ms\":…,\"so_tuong_tac_phien\":…}`."));

ND.push(muc2("3.9 T−5 · Kiểm tra lần cuối"));
L(C1, `curl -s -m 120 ${WEB}/api/thinh-hanh/102605`);
ND.push(mongDoi("Có `cua_so_ket_thuc` (giờ UTC của vài phút tới) và `\"so_luot_them_gio\": 0` (hoặc 1–2). Nếu số thêm giỏ **≥ 3** thì dùng `320844` cho bước 4 (thay số trong lệnh trên để kiểm tra). Chạy **một lần**, chờ tối đa 2 phút; không chạy lặp lại."));
M("tab 6 · Trang chủ", `${WEB}/`);
ND.push(mongDoi("Nhấn F5: khối **“Đang thịnh hành”** có đủ 10 sản phẩm, không chỉ 1–2 món."));
M("tab 3 · Kafka UI", KAFKA);
ND.push(mongDoi("Topics → `retailrocket-events` → Overview: **Message Count** tăng sau mỗi lần nhấn F5."));
ND.push(y("Xong: nối máy chiếu, chiếu slide 1 (tiêu đề); trình duyệt để sẵn ở tab 1; điện thoại im lặng."));

// ================================================================== 4. DEMO 10 PHÚT
ND.push(ngat());
ND.push(muc("4. Demo khoảng 14 phút (bản dùng ngày 19/11)"));
ND.push(doan("Demo diễn ra **trước** phần slide. Tâm bấm máy, Quốc Anh nói. Mỗi bước gồm: màn hình (tab và link), thao tác, bằng chứng phải thấy, lời dẫn tiếng Anh (bản ngắn), ý chính tiếng Việt, cách xử lý khi lỗi. Phần ghi (bỏ được) là phần cắt đầu tiên khi trễ giờ."));
ND.push(bang(["B.", "Nội dung", "Tab", "Tiêu chí", "Thời lượng", "Mốc kết thúc"], [
  ["–", "Mở đầu", "slide 1", "–", "0:30", "0:30"],
  ["0", "Hạ tầng đang chạy", "1, 2, 3, 4", "–", "1:00", "1:30"],
  ["1", "Chất lượng mô hình: so sánh, độ phổ biến, lịch sử, tuning", "5", "1, 2", "1:30", "3:00"],
  ["2", "OPTIMIZE / Z-ORDER", "5", "8", "0:30", "**3:30** ⏱"],
  ["3", "Cold start: người mới, ít tương tác, item mới", "6", "3", "1:30", "5:00"],
  ["4", "Vòng khép kín và thịnh hành ≤ 90 giây", "tab mới, 3", "4, 5", "2:00", "**7:00** ⏱"],
  ["5", "Thí nghiệm A/B", "6, 7", "6", "1:15", "8:15"],
  ["6", "Tái lập bằng VERSION AS OF", "8", "7", "1:15", "**9:30** ⏱"],
  ["7", "Yêu cầu chung C.4: chạy DAG, cây HDFS, HISTORY / VERSION AS OF, luồng ≥ 30 phút, ghi ngược", "4, cửa sổ 1, 1", "C.4", "4:00", "**13:30** ⏱"],
  ["–", "Chuyển sang slide", "slide 2", "–", "0:30", "14:00"],
], [7, 43, 14, 11, 12, 13]));
ND.push(sauBang());

// Mỗi mục trong `lam` / `loi`: chuỗi = một ý; [cửa sổ, lệnh] = khung lệnh; {tab, url} = khung trình duyệt.
function phanTu(p, kieu, sau) {
  if (Array.isArray(p)) L(p[0], p[1]);
  else if (p && typeof p === "object") M(p.tab, p.url);
  else {
    const giu = sau !== undefined && typeof sau === "object"; // ý đứng ngay trước một khung: giữ cùng trang
    ND.push(kieu === "so" ? so(p, giu) : y(p, giu));
  }
}
function buoc(b) {
  ND.push(muc2(b.tieu));
  ND.push(new Paragraph({ spacing: { ...GIAN, after: 40 }, keepNext: true, children: [
    new TextRun({ text: "Thời lượng: ", font: FONT, size: 26, color: XAM }), new TextRun({ text: b.tg, font: FONT, size: 26, bold: true }),
    new TextRun({ text: `   ·   Tiêu chí: ${b.tc}   ·   Màn hình: `, font: FONT, size: 26, color: XAM }), ...chu(b.mh),
  ] }));
  ND.push(nhan("Thao tác (Tâm)"));
  batDauSo();
  b.lam.forEach((p, i) => phanTu(p, "so", b.lam[i + 1]));
  ND.push(nhan("Phải thấy"));
  b.thay.forEach((p) => ND.push(y(p)));
  ND.push(nhan("Lời dẫn (Quốc Anh, tiếng Anh)"));
  b.noi.forEach((p) => ND.push(loi(p)));
  ND.push(nhan("Ý chính (tiếng Việt)"));
  b.yc.forEach((p) => ND.push(y(p)));
  ND.push(nhan("Nếu lỗi"));
  b.loi.forEach((p, i) => phanTu(p, "y", b.loi[i + 1]));
  if (b.moc) ND.push(new Paragraph({ spacing: { ...GIAN, before: 60, after: 60 }, children: [new TextRun({ text: `⏱ Mốc ${b.moc}: Quốc Anh so đồng hồ (mục 5).`, font: FONT, size: 26, bold: true, color: CAM })] }));
}

ND.push(muc2("Mở đầu · slide 1 (0:30)"));
ND.push(loi("Hello everyone. We are Lê Chí Tâm and Lê Nguyễn Quốc Anh, and our topic is a product recommender for e-commerce, built on the RetailRocket clickstream. We will start with a live demo on our six-machine cluster, covering all eight acceptance criteria. After that, the slides explain how the system is designed and what the numbers mean."));
ND.push(y("Nói xong: Tâm nhấn **Alt+Tab** sang trình duyệt, tab 1."));

buoc({
  tieu: "Bước 0 · Hạ tầng đang chạy", tg: "1:00", tc: "nền cho cả 8", mh: "tab 1 → 2 → 3 → 4",
  lam: [
    { tab: "tab 1 · Spark Master", url: SPARK },
    "Chỉ vào **Alive Workers: 5**, **Cores in use: 34 Total**; bảng **Running Applications** (3 ứng dụng `bd03-…`).",
    { tab: "tab 2 · HDFS · Datanodes", url: HDFS },
    "Chỉ vào bảng **In operation**: 5 DataNode `In Service`. (bỏ được: chỉ nói số)",
    { tab: "tab 3 · Kafka UI", url: KAFKA },
    "Topics → `retailrocket-events` → **Overview**: **Message Count**; F5 thấy tăng. (bỏ được: bước 4 mở lại)",
    { tab: "tab 4 · Airflow", url: AIRFLOW },
    "Chỉ vào 5 DAG `kn_*`; `kn_pipeline_hang_ngay` tạm dừng.",
  ],
  thay: ["5 worker, 34 lõi; 3 ứng dụng `bd03-nap-su-kien`, `bd03-tinh-thinh-hanh`, `bd03-ghi-hien-thi`.", "5 DataNode; Message Count tăng.", "5 DAG; DAG 1 tạm dừng có chủ đích."],
  noi: ["This is our cluster. Five Spark workers on five lab machines, connected by ZeroTier: thirty-four cores. Three streaming applications are running right now: event ingestion, trending, and the impression log. HDFS has five live DataNodes with replication two. Kafka is receiving a replayed clickstream, so the message count keeps growing. And Airflow holds our five DAGs; the nightly pipeline is paused so that the screens match the report."],
  yc: ["6 máy lab qua ZeroTier; 5 worker, 34 lõi.", "3 luồng streaming: nạp sự kiện, thịnh hành, nhật ký hiển thị.", "HDFS 5 DataNode, sao chép 2; Kafka đang nhận dữ liệu phát lại.", "5 DAG; DAG 1 tạm dừng để màn hình khớp báo cáo."],
  loi: [
    "Có **4** ứng dụng (còn `bd03-tai-lap-huan-luyen`): DAG 5 chưa xong. Nói: “the reproduction job is still running; we come back to it at the end”.",
    "Một worker hoặc DataNode chết: không cần làm gì, Spark chạy lại task, HDFS còn bản sao thứ hai.",
  ],
});

buoc({
  tieu: "Bước 1 · Chất lượng mô hình", tg: "1:30", tc: "1 và 2", mh: "tab 5",
  lam: [
    { tab: "tab 5 · Chất lượng mô hình", url: `${WEB}/mo-hinh` },
    "Chỉ bảng so sánh, rồi dòng **“Ngưỡng đạt”** (coverage 3,4 % → CHƯA ĐẠT).",
    "Cuộn xuống biểu đồ **“Phân phối độ phổ biến của item được gợi ý”**.",
    "Cuộn xuống **“Chỉ số theo phiên bản mô hình”**: dòng `giu_mo_hinh_cu` (17:44 ngày 10/11).",
    "Cuộn xuống **“Bảng tuning của lần chạy mới nhất”**: dòng đầu rank 50, regParam 1,0, alpha 40.",
  ],
  thay: ["ALS NDCG@10 = 0,0680; Baseline 1 = 0,0051; Baseline 2 = 0,0475.", "Bảng tuning ≥ 9 dòng, xếp NDCG giảm dần."],
  noi: ["Model quality, read straight from the gold tables. ALS reaches an NDCG at ten of 0.0680: plus 1,237 percent over global best-sellers, and plus 43 percent over best-sellers of the user’s own category. The threshold line says “not met” only because of coverage, 3.4 percent; the chart shows why: recommendations concentrate on popular items. The configuration we serve, with novelty re-ranking, reaches 6.5 percent. Below is the deployment gate: on 10 November a weaker model was rejected. And the tuning table: the best configuration is rank 50, regParam 1.0, alpha 40; the full grid of 27 is in the report."],
  yc: [
    "NDCG@10 = 0,0680: **+1.237 %** so với bán chạy toàn sàn, **+43 %** so với bán chạy theo danh mục.",
    "“CHƯA ĐẠT” do coverage: ALS thuần **3,44 %** (popularity bias). Cấu hình đang phục vụ **6,47 %**, NDCG 0,0865; offline thêm ứng viên đồng xuất hiện **14,5 %**.",
    "Cổng triển khai: dòng 17:44 ngày 10/11 bị giữ mô hình cũ.",
    "Tuning: tốt nhất rank 50, regParam 1,0, alpha 40; lưới đủ 27 tổ hợp ở báo cáo.",
  ],
  loi: ["Trang chậm hơn 20 giây: Quốc Anh nói tiếp lời dẫn trong lúc chờ, không bấm tải lại."],
});

buoc({
  tieu: "Bước 2 · OPTIMIZE / Z-ORDER", tg: "0:30", tc: "8", mh: "tab 5, cuối trang", moc: "3:30",
  lam: ["Ở tab 5, cuộn xuống mục cuối **OPTIMIZE / ZORDER**; chỉ 2 dòng `truoc` / `sau`."],
  thay: ["Tệp đọc mỗi truy vấn **67 → 1,07**; trung vị **8.280 → 980 ms**."],
  noi: ["At the bottom, Z-ORDER by user id on the hottest query of the home page: each query reads about one file instead of sixty-seven, and the median time drops from 8.3 seconds to under one second."],
  yc: ["Z-ORDER theo user gom dòng cùng user vào ít tệp, data skipping loại gần hết tệp.", "Thời gian dao động theo tải, **số tệp đọc thì không**."],
  loi: ["Có người muốn đo lại tại chỗ: **không** chạy trong buổi demo (job nặng). Hẹn chạy sau, ở cửa sổ 1:", [C1, "bash ha_tang/spark/submit.sh bao_tri bao_tri/do_zorder.py --phan-manh 200 --so-truy-van 30"]],
});

buoc({
  tieu: "Bước 3 · Cold start", tg: "1:30", tc: "3", mh: "tab 6",
  lam: [
    { tab: "tab 6 · Trang chủ", url: `${WEB}/` },
    "Bấm **+ Người dùng mới (cold start)**. **Quốc Anh chép mã** `moi_xxxxxxxx` trên thanh địa chỉ (dùng ở bước 4).",
    "Chỉ chip **“ngoài thí nghiệm A/B”**, **Chiến lược nguoi_moi**, 10 ô **Thịnh hành**.",
    "Bấm một thẻ sản phẩm → **Thêm vào giỏ** → kéo xuống **Sản phẩm liên quan**, bấm một thẻ → **Thêm vào giỏ** → bấm **Về trang chủ**.",
    "Chỉ chip **Chiến lược it_tuong_tac** (ô Theo danh mục xen kẽ Thịnh hành).",
    "Item mới (bỏ được: chỉ nói): mở trang chủ của user đã ghi ở mục 2.3, chỉ ô **9–10** nhãn **Theo danh mục**:",
    { tab: "tab 6 · Trang chủ", url: `${WEB}/?u=________` },
  ],
  thay: ["User mới: 10 ô Thịnh hành, ngoài thí nghiệm A/B.", "Sau 2 tương tác cùng danh mục: chiến lược `it_tuong_tac`.", "User quen: ô 9–10 là item chưa có trong mô hình ALS."],
  noi: ["Cold start. One click creates a user who has never existed. There is no ALS vector, so all ten slots come from the newest fifteen-minute trending window, and the user stays outside the A/B test. Now the user adds two products of one category to the cart. Back home, the strategy has switched immediately to “few interactions”: best-sellers of that category, interleaved with trending. The third strategy is for new items: for known users, slots nine and ten show items that ALS has never seen, from the user’s main category."],
  yc: ["**Người mới hoàn toàn**: 10 ô thịnh hành 15 phút mới nhất.", "**Ít tương tác (< 5)**: bán chạy theo danh mục vừa xem xen kẽ thịnh hành 5/5, đổi ngay trong phiên.", "**Item mới**: ô 9–10 của user quen, cùng vị trí ở cả 2 nhóm A/B."],
  loi: [
    "10 ô ít hoặc trùng lặp: bộ phát chưa chạy hoặc đã dừng. Kiểm tra ở cửa sổ 2:",
    [C2, "tail -3 ~/phat.log"],
    "Nhãn chưa đổi sang `it_tuong_tac`: kiểm tra thanh địa chỉ còn `?u=moi_…`; nhấn F5.",
  ],
});

buoc({
  tieu: "Bước 4 · Vòng khép kín và thịnh hành ≤ 90 giây", tg: "2:00", tc: "4 và 5", mh: "tab mới (sản phẩm đã mồi), tab 3", moc: "7:00",
  lam: [
    "Nhấn **Ctrl+T**, dán link trang sản phẩm đã mồi, **thay đúng mã user** của bước 3:",
    { tab: "tab mới · trang sản phẩm", url: `${WEB}/san-pham/102605?u=moi_xxxxxxxx` },
    "Đọc ô **Trạng thái trong bảng thịnh hành**: “… · thêm giỏ 0”.",
    "Bấm **Thêm vào giỏ** 3 lần **liền nhau trong khoảng 2 giây**.",
    "(bỏ được: chỉ nói) Tab 3 Kafka UI → **Messages** → **Seek Type = Timestamp**, đúng phút vừa bấm → **Search** gõ mã user → **Submit** → bấm **+** ở một dòng.",
    "Quay lại tab sản phẩm, chờ **“ĐÃ CẬP NHẬT sau N giây”**, rồi **Ctrl+W** đóng tab.",
  ],
  thay: ["Kafka UI: 3 dòng có Key = mã user, `\"nguon\": \"web\"`, `\"loai\": \"them_gio\"`.", "Trang sản phẩm: “thêm giỏ 3 · **ĐÃ CẬP NHẬT sau N giây**”, N ≤ 90 (ngày 11/11 đo được 51 giây)."],
  noi: ["The closed loop. On a product that almost nobody views, we click “Add to cart” three times. Every click goes to Kafka; here they are in Kafka UI, keyed by our new user, with source “web”. Within about fifteen seconds the first stream writes them to bronze, so they become training data for tonight’s model. The trending stream updates its fifteen-minute window and merges into gold every twenty seconds. The page polls every five seconds and prints the delay: the target is ninety seconds, and we measured fifty-one."],
  yc: ["Bấm trên web → Kafka (nguồn `web`).", "Kafka → bronze khoảng 10–15 giây: click thành dữ liệu huấn luyện đêm nay.", "Cửa sổ 15 phút trượt 1 phút, MERGE vào gold mỗi 20 giây; ngưỡng **90 giây**."],
  loi: [
    "**Chờ quá 60 giây chưa thấy “ĐÃ CẬP NHẬT”:** để nguyên tab sản phẩm, làm luôn bước 5, xong quay lại đọc kết quả. Trang vẫn tự hỏi khi nằm ở tab nền và tính N từ lúc bấm, nên số giây vẫn đúng.",
    "Số thêm giỏ tăng nhưng không có chữ “ĐÃ CẬP NHẬT”: sản phẩm chưa được mồi; con số vẫn là bằng chứng.",
    "Số thêm giỏ chỉ tăng 1–2: 3 lần bấm vắt qua ranh giới phút; các cửa sổ trước chứa đủ 3.",
    "Luồng có thể đã chết: kiểm tra ở cửa sổ 1 (checkpoint giữ offset nên click vừa bấm vẫn được tính):",
    [C1, "bash scripts/luong.sh trang_thai"],
    [C1, "bash scripts/luong.sh khoi_dong thinh_hanh"],
    "Trang sản phẩm không mở được: gửi “Thêm giỏ” thẳng qua API. Lệnh tự chờ tới giây :03 của phút kế tiếp:",
    [C1, `while [ $(date +%-S) -gt 2 ]; do sleep 1; done; sleep 3; for i in 1 2 3; do curl -s -m 30 -X POST ${WEB}/api/su-kien -H "Content-Type: application/json" -d '{"ma_nguoi_dung":"moi_xxxxxxxx","ma_san_pham":"320844","loai":"them_gio"}'; echo; done; date`],
    "Hoặc đo tự động bằng script (in “… cập nhật sau NN giây → ĐẠT”):",
    [C1, `python3 scripts/demo_vong_khep_kin.py --web ${WEB} --san-pham 320844 --nguoi-dung moi_xxxxxxxx --so-lan 3`],
    "Có người hỏi bằng chứng đã vào bronze (job nhỏ, 1–2 phút; chạy ở phần hỏi đáp):",
    [C1, "bash ha_tang/spark/submit.sh nhanh kiem_tra/tim_su_kien_bronze.py --ma-nguoi-dung moi_xxxxxxxx"],
    "Không kịp: nói số 51 giây đã đo; slide phía sau có số này.",
  ],
});

buoc({
  tieu: "Bước 5 · Thí nghiệm A/B", tg: "1:15", tc: "6", mh: "tab 6, tab 7",
  lam: [
    { tab: "tab 6 · Trang chủ, nhóm B", url: `${WEB}/?u=270018` },
    "Chỉ chip **Nhóm B · ALS trộn 30% thịnh hành** và ô **3, 6, 8** Thịnh hành. F5: vẫn nhóm B.",
    { tab: "tab 7 · Bảng điều khiển A/B", url: `${WEB}/ab` },
    "Chỉ CTR và chuyển đổi theo nhóm, p-value, biểu đồ **CTR theo ngày**.",
  ],
  thay: ["CTR và chuyển đổi theo nhóm; p-value; câu kết luận ở mức 5 %; biểu đồ CTR theo ngày."],
  noi: ["The A/B test. This user is in group B: slots three, six and eight are trending items. The group comes from a hash of the user id, so reloading never changes it. The dashboard shows click-through and conversion per group with a z-test. Right now p equals [số ghi ở T−15]; the seven simulated days in the report give p equals 0.015: group B has a lower click-through rate, and conversion shows no difference."],
  yc: ["Phân nhóm bằng `md5(ma_nguoi_dung)`: cùng user luôn cùng nhóm.", "Báo cáo: 350.160 impression, 7 ngày; CTR A 2,094 %, B 1,978 %; **p = 0,015**; chuyển đổi p = 0,75.", "Traffic chủ yếu mô phỏng, có gắn nhãn."],
  loi: ["p trên bảng khác 0,015: nói đúng số đang hiện (web ghi impression thật; `kn_tinh_ab` tính lại mỗi giờ)."],
});

buoc({
  tieu: "Bước 6 · Tái lập bằng VERSION AS OF", tg: "1:15", tc: "7 (đề ghi “bắt buộc demo”)", mh: "tab 8", moc: "9:30",
  lam: [
    { tab: "tab 8 · Tái lập thí nghiệm", url: `${WEB}/tai-lap` },
    "Ở bảng A/B, chọn một ngày cũ → bấm **Chạy lại**. Chờ 10–30 giây.",
    "Chỉ cột **Lệch** = 0 và cột **Phiên bản hiện tại (không time travel)** cho số khác.",
    "Kéo xuống bảng **Tái lập huấn luyện mô hình**: **2 dòng mới nhất**, cột Trùng khớp **CÓ**.",
  ],
  thay: ["A/B: mọi chỉ số lệch 0, kết luận trùng khớp.", "Huấn luyện: 2 dòng của lượt hôm nay, lệch cỡ 10⁻¹⁵, **CÓ** (giờ UTC)."],
  noi: ["Reproduction with Delta time travel. Re-running an old day reads the impression log VERSION AS OF the recorded version: every metric matches with zero deviation, while the current version, in the last column, gives different numbers. Below is DAG 5, which we triggered before class: it retrained the deployed model on the recorded feature version with the same seed, and the metrics match to within ten to the minus fifteen, which is only floating-point rounding."],
  yc: ["A/B: đọc `gold.nhat_ky_hien_thi` bằng `versionAsOf` đã ghi, chạy lại cùng hàm tổng hợp và z-test → lệch 0.", "Huấn luyện (DAG 5): features `VERSION AS OF` + cùng siêu tham số, hạt giống 42 → lệch ~10⁻¹⁵ (dung sai 10⁻⁶).", "Lịch sử Delta giữ 30 ngày nên VACUUM hằng đêm không xóa phiên bản cũ."],
  loi: [
    "**Không** bấm Kích hoạt kn_tai_lap trong buổi demo.",
    "DAG 5 chưa xong: chỉ 2 dòng ngày 12/11 (lệch 3,55·10⁻¹⁵ và 1,78·10⁻¹⁵).",
    "Nút Chạy lại chờ quá 30 giây: nói phần huấn luyện trước, quay lại sau.",
  ],
});

buoc({
  tieu: "Bước 7 · Yêu cầu chung của đề cương (mục C.4)", tg: "4:00", tc: "C.4: chạy DAG trực tiếp, cây HDFS, HISTORY / VERSION AS OF, luồng ≥ 30 phút, ghi ngược web → Delta", mh: "tab 4, cửa sổ 1, tab 1", moc: "13:30",
  lam: [
    { tab: "tab 4 · DAG kn_tinh_ab", url: "http://10.68.71.113:8088/dags/kn_tinh_ab" },
    "Bấm nút **Trigger** (▶) → **Trigger**, **một lần**. Mở tab **Code**, chỉ dòng `deadline=han_chot(30)` (Deadline Alerts thay `sla`).",
    "Trong lúc DAG chạy (2–3 phút), ở cửa sổ 1 in cây hồ dữ liệu:",
    [C1, "bash scripts/demo/cay_hdfs.sh"],
    { tab: "tab 1 · Spark Master", url: SPARK },
    "Chỉ cột **Duration** của 3 luồng `bd03-…` trong **Running Applications**.",
    "Xác nhận trong Delta (thay mã user tạo ở bước 3; mất 40–60 giây):",
    [C1, "bash scripts/demo/delta_sql.sh demo moi_xxxxxxxx"],
    "Quay lại tab 4: lượt vừa kích hoạt **xanh**; bấm task `tinh_ket_qua_ab` → **Logs**, chỉ dòng JSON cuối.",
  ],
  thay: [
    "`cay_hdfs.sh`: `du -h` và cây dưới `/lakehouse/bd03_khuyen_nghi`: `landing`, `bronze`, `silver`, `features`, `gold`, `models`, `checkpoints`, `_quarantine`.",
    "Spark UI: 3 luồng có Duration **≥ 30 phút** (thường vài giờ).",
    "`delta_sql.sh demo`: (1) `DESCRIBE HISTORY gold.nhat_ky_hien_thi` có `STREAMING UPDATE`/`MERGE` vài chục giây trước; (2) `VERSION AS OF 1` khác `hien_tai`; (3) dòng `ab_web` mới trong `gold.ket_qua_tai_lap` từ nút Chạy lại ở bước 6; (4) lượt hiển thị của `moi_…`, có dòng `da_click = true`.",
    "`kn_tinh_ab`: `cong_backfill` → `tinh_ket_qua_ab` xanh; log có `phien_ban_delta_du_lieu`.",
  ],
  noi: ["Finally, the general items of the project outline. We trigger the hourly A/B DAG by hand; each DAG carries a deadline alert, which replaces the SLA feature that Airflow 3 removed. While it runs: the lakehouse on HDFS, under slash lakehouse slash bd03, with bronze, silver, gold, models, checkpoints and a quarantine table that keeps every rejected row with its reason. The Spark UI shows our three streams have been running for hours. Now SQL on the terminal: the history of the impression log, written by the stream every thirty seconds; time travel to version one; the row the web just wrote when we pressed “Re-run”; and our new user’s impressions and click, which went from the browser through Kafka into Delta. And the DAG we triggered has finished, green."],
  yc: [
    "Gốc đúng A.4: `hdfs:///lakehouse/bd03_khuyen_nghi`, dời từ `/lake` ngày 15/11 bằng `hdfs dfs -mv` (giữ nguyên lịch sử Delta).",
    "`_quarantine.tuong_tac`: dòng bị loại kèm `ly_do` (6 lý do): 5.315.672 dòng, gồm 5.304.360 trùng nội dung (bản phát lại) và 11.312 nhấp lặp 5 giây.",
    "Hai đường ghi ngược Delta từ web (A.6.4): qua Kafka → MERGE vào `gold.nhat_ky_hien_thi`; trực tiếp → `gold.ket_qua_tai_lap`.",
    "`delta_sql.sh` chạy Spark `local[2]` trong container `spark-master`: không lấy lõi của cụm.",
  ],
  loi: [
    "`delta_sql.sh` lỗi hoặc chờ quá 2 phút: Ctrl+C, mở `docs/bang_chung/cum/04_delta.txt` trên laptop (output thu sẵn bằng `thu_bang_chung.sh`).",
    "`kn_tinh_ab` chưa xanh: chuyển slide, quay lại xem ở phần hỏi đáp. **Không** bấm Trigger lần nữa.",
    "Bị hỏi output `hdfs dfs -du -h`: có trong `docs/bang_chung/cum/01_hdfs_du_h.txt` (bản nộp theo A.6.3).",
  ],
});

ND.push(muc2("Chuyển sang slide (0:30)"));
ND.push(loi("That was all eight criteria and the outline’s demo items, live on the cluster. Now the slides: how we designed the system, and what these numbers mean."));
ND.push(y("Tâm nhấn **Alt+Tab** về slide, sang **slide 2**. Trình duyệt để nguyên để dùng lại khi hỏi đáp."));

// ================================================================== 5. GIỮ ĐÚNG GIỜ
ND.push(muc("5. Giữ đúng giờ"));
ND.push(bang(["Mốc", "Phải xong", "Trễ hơn 30 giây thì cắt"], [
  ["3:30", "Bước 2", "Bước 3: bỏ ô item mới (chỉ nói). Bước 4: bỏ Kafka UI"],
  ["7:00", "Bước 4", "Bước 5: chỉ mở tab 7, nói nhóm B bằng lời"],
  ["9:30", "Bước 6", "Bỏ phần huấn luyện ở bước 6, chỉ chỉ cột Lệch = 0"],
  ["13:30", "Bước 7", "Chạy `delta_sql.sh demo` không kèm mã user (bỏ khối 4)"],
], [12, 18, 70]));
ND.push(sauBang());
ND.push(y("Vòng khép kín chờ lâu: làm bước 5 trong lúc chờ (bước 4, mục “Nếu lỗi”)."));
ND.push(y("**Chỉ còn 5 phút** cho demo: bước 1 (1:00) → bước 3 chỉ tạo người dùng mới (0:45) → bước 4 bỏ Kafka UI (1:45) → tab 7 (0:45) → bước 6 chỉ cột Lệch (0:45)."));
ND.push(y("**Chỉ còn 2 phút:** bước 3 (người dùng mới) và tab 7. Nói số 51 giây đã đo."));
ND.push(y("Thầy hỏi riêng tiêu chí nào: mở theo **Bản đồ 8 tiêu chí** (mục 0.6)."));

// ================================================================== 6. SỰ CỐ
ND.push(muc("6. Xử lý sự cố trong lúc demo"));
ND.push(bang(["Dấu hiệu", "Nguyên nhân thường gặp", "Xử lý trong 1 phút", "Nếu vẫn không được"], [
  ["Mọi trang web đều xoay", "Truy vấn xếp hàng trên `local[2]` của web: tab sản phẩm để mở lâu, `curl` chạy lặp, hoặc job nặng (DAG 5) đang chạy", "Đóng mọi tab sản phẩm; không tải lại liên tục; chờ 1–2 phút. DAG 5 đang chạy thì chờ nó xong", "Cửa sổ 3: `ssh labsoe-18 \"docker restart bd03-web\"`, chờ khoảng 30 giây. Bộ đệm mất nên trang đầu tiên chậm"],
  ["Trang tải được một nửa rồi treo", "Lỗi MTU trên đường ZeroTier (đứng ngoài lab, qua 4G)", "Đường hầm (mục 2.4), mở `http://localhost:8001`", "Phát Wi-Fi từ điện thoại rồi dùng đường hầm"],
  ["`ssh` treo, báo `banner exchange`", "Mạng ngoài lab chập chờn", "Ctrl+C, chạy lại", "`ssh -J labsoe-18 labsoe-11`"],
  ["Khối thịnh hành chỉ 1–2 món", "Bộ phát chưa chạy hoặc đã dừng; luồng thịnh hành chết", "Cửa sổ 2: `tail -3 ~/phat.log`. Cửa sổ 1: `bash scripts/luong.sh trang_thai`", "Bộ phát dừng: làm lại mục 3.7. Luồng chết: cửa sổ 1 `bash scripts/luong.sh khoi_dong thinh_hanh`"],
  ["Không hiện “ĐÃ CẬP NHẬT” sau 90 giây", "Chưa mồi sản phẩm; luồng đang micro-batch dài hoặc đã chết", "Làm bước 5 trong lúc chờ; đọc số “thêm giỏ”; kiểm tra luồng như dòng trên", "Lệnh API dự phòng hoặc `demo_vong_khep_kin.py` (bước 4); nói số 51 giây đã đo"],
  ["`curl` không in gì", "Hết thời gian `-m`; với `-s`, curl im lặng khi bị cắt", "Không chạy lại liên tục; chờ 1–2 phút rồi chạy **một lần** với `-m 180`", "Bỏ qua, dùng giao diện"],
  ["Kafka UI không ra tin của web", "Chưa bấm Submit; mốc thời gian quá xa", "Seek Type = Timestamp đúng phút vừa bấm, gõ mã user, **Submit**; bấm **Next** nếu cần", "Bỏ qua Kafka UI, dùng trang sản phẩm"],
  ["Giờ trên bảng lệch 7 tiếng", "Bảng Delta và Spark UI ghi giờ UTC", "Nói: “UTC, add seven hours”", "—"],
  ["Spark có thêm ứng dụng `bd03-tai-lap-huan-luyen`", "DAG 5 chưa xong", "Bình thường; không chạy thêm job tay nào", "Ở bước 6 dùng các dòng cũ"],
  ["Airflow có ô đỏ", "Triggerer (cố ý tắt); lần chạy lỗi cũ (sự cố 24, 31)", "Giải thích: không có deferrable operator; lỗi cũ đã ghi trong báo cáo", "—"],
  ["Một worker hoặc DataNode chết", "Wi-Fi lab chập chờn", "Không cần làm gì: Spark chạy lại task, HDFS còn bản sao thứ hai", "Xử lý sau buổi demo"],
  ["Mất toàn bộ mạng", "Wi-Fi phòng hoặc ZeroTier", "Chuyển sang slide và ảnh chụp (nói rõ ngày chụp)", "Mở video buổi tập"],
  ["Máy chiếu không nhận laptop", "Đầu chuyển, độ phân giải", "Win + P → Duplicate; 1920×1080 hoặc 1280×720", "Mở PDF slide từ USB trên máy của phòng"],
], [20, 26, 29, 25]));
ND.push(sauBang());
ND.push(doan("**Không bao giờ** dùng chế độ giả lập của web (`\"che_do\":\"gia\"`) làm bằng chứng: số liệu ở chế độ đó là giả."));

// ================================================================== 7. HỎI NHANH
ND.push(muc("7. Câu hỏi hay gặp ngay trong lúc demo"));
ND.push(doan("Trả lời ngắn rồi quay lại demo. Câu dài hơn xem bộ hỏi – đáp 52 câu và giáo trình.", { keepNext: true }));
const hoi = [
  ["Dòng “CHƯA ĐẠT” mà mô hình vẫn “triển khai”?", "Hai việc khác nhau. Dòng ngưỡng là mục tiêu của đề (NDCG +30 % và coverage 10 %): NDCG đạt, coverage chưa. Triển khai do cổng riêng quyết định: mô hình mới chỉ lên khi NDCG không kém mô hình đang chạy (dòng 17:44 ngày 10/11 bị giữ mô hình cũ).", "Deployment is a separate gate: a new model goes live only if it is not worse than the one being served."],
  ["Coverage dưới 10 % có phải không đạt tiêu chí?", "Đề yêu cầu phân tích khi chưa đạt. Nguyên nhân là popularity bias (biểu đồ). Cấu hình phục vụ đạt 6,47 %; offline thêm 3 ô đồng xuất hiện đạt 14,5 % và NDCG còn tăng; chưa triển khai để giữ hệ thống ổn định trước buổi demo.", "Coverage is analysed as required; re-ranking nearly doubles it and an offline mix passes ten percent."],
  ["Tên mô hình khác báo cáo?", "Lần chạy pipeline lúc 19:00 ngày 11/11 huấn luyện lại trên features v4, ra cùng siêu tham số và cùng NDCG 0,0680 nên cổng cho triển khai. Mọi số liệu giống hệt `als_v2_r20261110T230924` trong báo cáo.", "Same configuration, same metrics; only the run id is newer."],
  ["Bảng tuning chỉ 10 dòng?", "Đó là lần chạy mới nhất (10 tổ hợp, vẫn ≥ 9). Lưới đủ 27 tổ hợp ở báo cáo, cùng cấu hình thắng.", "The full grid of 27 is in the report, with the same winner."],
  ["Giờ trên một số bảng lệch 7 tiếng?", "Bảng Delta và Spark UI ghi giờ UTC; cộng 7 tiếng.", "Those timestamps are UTC."],
  ["Khối thịnh hành toàn sản phẩm năm 2015?", "Bộ phát phát lại log năm 2015; cửa sổ tính theo thời điểm Kafka nhận nên vẫn là 15 phút gần nhất theo giờ thật.", "Windows use the Kafka timestamp, so they are the last fifteen real minutes."],
  ["Tên và ảnh sản phẩm có thật không?", "Không. RetailRocket đã ẩn danh; ảnh và tên là minh họa theo ngành hàng; mã sản phẩm thật luôn hiện trên thẻ.", "Names and pictures are illustrations; the real item id is on every card."],
  ["Vì sao người dùng mới “ngoài thí nghiệm A/B”?", "Thí nghiệm chỉ so danh sách ALS (A) với ALS trộn thịnh hành (B); user chưa có ALS không thuộc nhóm nào.", "The experiment compares ALS lists only."],
  ["Traffic A/B có phải người thật?", "Chủ yếu là mô phỏng theo mô hình click phụ thuộc vị trí, có gắn nhãn, không cộng điểm cho thịnh hành. Kết luận chỉ đúng trong giả định đó.", "Mostly simulated and labelled; the conclusion holds under that model."],
  ["Kafka chết thì sao?", "Web vẫn gợi ý (đọc từ gold). Kafka sống lại thì luồng đọc tiếp từ offset trong checkpoint, không mất, không trùng.", "Streams resume from the checkpoint: no loss, no duplicates."],
  ["Vì sao DAG 1 tạm dừng?", "Để màn hình khớp báo cáo. Bình thường DAG 1 chạy 02:00 mỗi ngày; ngày 11/11 nó tự triển khai mô hình v2.", "We froze the nightly pipeline so that the screens match the report."],
  ["Airflow chạy ở máy nào? PostgreSQL để làm gì?", "Trên labsoe-11 (master), bằng Docker Compose, LocalExecutor. PostgreSQL 16 là cơ sở dữ liệu metadata của Airflow (DAG, lượt chạy, trạng thái task); dữ liệu của đề tài nằm trên HDFS/Delta.", "Airflow runs on the master with the LocalExecutor; PostgreSQL only stores Airflow’s own metadata."],
  ["Vì sao master không có DataNode?", "DataNode cũ trên labsoe-11 đã dừng từ 10/11 để nhường RAM cho driver Spark và Airflow. HDFS còn 5 DataNode, hệ số sao chép 2.", "The master keeps the coordination services; HDFS has five DataNodes with replication two."],
  ["Danh sách cá nhân có đổi ngay sau click?", "Phần ALS đổi mỗi đêm; phần thịnh hành đổi trong khoảng 1 phút; user mới đổi chiến lược ngay trong phiên. Cập nhật trực tuyến là hướng phát triển (slide 25).", "ALS nightly, trending within a minute, new users within the session."],
  ["Trang vừa rồi chậm?", "Web đọc Delta bằng Spark `local[2]` trên một máy cũng là worker; khi cụm đang chạy job nặng, truy vấn không đệm phải xếp hàng. Hướng cải tiến: tách web khỏi worker, giới hạn `spark.cores.max` cho job nặng.", "The web app shares a worker machine; under heavy jobs its uncached queries queue."],
];
ND.push(bang(["Câu hỏi", "Ý trả lời (tiếng Việt)", "Câu tiếng Anh ngắn"], hoi, [24, 48, 28]));
ND.push(sauBang());

// ================================================================== 8. KHÔNG LÀM
ND.push(muc("8. Những việc KHÔNG làm"));
[
  "Không kích hoạt DAG 5 sát giờ hoặc trong lúc demo; chỉ kích hoạt **một lần ở T−90**, khi bộ phát chưa chạy. Không chạy job tay nào khác trong lúc DAG 5 chạy (sự cố 31).",
  "Không kích hoạt hay bật lại DAG 1 (`kn_pipeline_hang_ngay`) trước khi nộp bài.",
  "Không bấm Trigger `kn_tinh_ab` lần thứ hai khi lượt trước chưa xong; không chạy `delta_sql.sh` song song ở hai cửa sổ.",
  "Không mở sẵn hay để lâu tab trang sản phẩm; không mở nhiều tab sản phẩm cùng lúc; không chạy `curl` lặp lại liên tục.",
  "Không chạy `producer/nguoi_dung_ao.py` vào ngày demo: script này ghi thêm traffic `mo_phong_web` và làm số trên bảng A/B thay đổi.",
  "Không dừng hay xóa container của nhóm khác trên labsit-may25 và labsit-may26. Không chạy `docker compose down -v`.",
  "Không khởi động lại máy master, kể cả khi thấy dòng “System restart required”.",
  "Không mở trên màn hình các tệp bí mật: `ha_tang/*/.env`, `ha_tang/web/.env.rieng`, `ha_tang/airflow/mat_khau.json`, `kaggle.json`. Không gõ mật khẩu khi đang chiếu.",
  "Không đưa token GitHub hay khóa Kaggle lên máy lab; không sửa mã trên máy lab trong ngày demo.",
].forEach((s) => ND.push(y(s)));

// ================================================================== 9. SAU DEMO
ND.push(muc("9. Sau buổi demo"));
ND.push(muc2("9.1 Ngay sau demo"));
L(C2, "pkill -f phat_lai_su_kien");
L(C2, 'pgrep -f "phat_lai_su_kie[n]" || echo DA_TAT');
ND.push(mongDoi("`DA_TAT`."));
L(C2, "exit");
ND.push(y("Tab 4: tắt lại `kn_giam_sat_streaming` nếu đã bật ở T−10."));
ND.push(y("Ghi vào `NHAT_KY.md` (trên laptop): giờ demo, số giây đo được ở bước 4, p-value đang hiện, góp ý của Thầy, sự cố nếu có. Đây là bằng chứng bổ sung cho báo cáo nộp trước 22/11."));
ND.push(muc2("9.2 Từ 20/11 tới khi nộp bài (trước 22/11)"));
ND.push(y("Giữ nguyên cụm và để `kn_pipeline_hang_ngay` tạm dừng cho tới khi nộp xong, phòng khi Thầy muốn xem lại."));
ND.push(y("Sửa báo cáo theo góp ý trên laptop, commit, sao lưu lại, rồi nộp."));
ND.push(muc2("9.3 Trước 01/12 (trường cài Windows)"));
ND.push(y("Dừng các luồng ở cửa sổ 1: `bash scripts/luong.sh dung tat_ca`; rồi dừng dịch vụ từng máy bằng `bash scripts/cum/khoi_dong_may.sh --dung`. **Không** thêm `-v`."));
ND.push(y("Trả Cassandra cho phòng lab, ở cửa sổ 1: `sudo systemctl start cassandra`."));
ND.push(y("Hỏi cán bộ phòng lab trước khi gỡ ZeroTier, openssh hay đổi thiết lập máy lab."));

// ================================================================== PHỤ LỤC A
ND.push(muc("Phụ lục A. Lệnh nhanh theo cửa sổ"));
ND.push(ghi("Mỗi khung là một lệnh; thay `moi_xxxxxxxx` bằng mã user thật."));
ND.push(muc2("Cửa sổ 3 · laptop"));
[
  'cd "/d/BIG DATA/bd03_khuyen_nghi"',
  "bash scripts/cum/ssh_tat_ca.sh hostname",
  "ssh labsoe-11",
  "ssh -J labsoe-18 labsoe-11",
  "ssh labsit",
  "ssh -N -L 8001:localhost:8000 labsoe-18",
  'ssh labsoe-18 "docker restart bd03-web"',
].forEach((s) => L(C3, s));
ND.push(muc2("Cửa sổ 1 · labsoe-11 (đứng ở ~/bd03_khuyen_nghi)"));
[
  "cd ~/bd03_khuyen_nghi",
  "bash scripts/cum/kiem_tra_cum.sh",
  "bash scripts/cum/tinh_trang.sh",
  "bash scripts/luong.sh trang_thai",
  "bash scripts/luong.sh khoi_dong tat_ca",
  "bash scripts/luong.sh khoi_dong thinh_hanh",
  "bash scripts/luong.sh log thinh_hanh",
  `curl -s ${WEB}/api/suc-khoe`,
  `curl -s -m 60 -X POST "${WEB}/api/tai-lap-mo-hinh?phien_ban_delta=4"`,
  MOI("102605"),
  MOI("320844"),
  `curl -s -m 120 ${WEB}/api/thinh-hanh/102605`,
  `python3 scripts/demo_vong_khep_kin.py --web ${WEB} --san-pham 320844 --nguoi-dung moi_xxxxxxxx --so-lan 3`,
  "bash ha_tang/spark/submit.sh nhanh kiem_tra/tim_su_kien_bronze.py --ma-nguoi-dung moi_xxxxxxxx",
  "bash scripts/demo/cay_hdfs.sh",
  "bash scripts/demo/delta_sql.sh demo moi_xxxxxxxx",
  "bash scripts/demo/delta_sql.sh cach_ly",
].forEach((s) => L(C1, s));
ND.push(muc2("Cửa sổ 2 · labsit"));
[
  'pgrep -f "phat_lai_su_kie[n]" || echo CHUA_CHAY',
  PHAT,
  "sleep 10; tail -3 ~/phat.log",
  "pkill -f phat_lai_su_kien",
].forEach((s) => L(C2, s));

// ================================================================== PHỤ LỤC B
ND.push(muc("Phụ lục B. Số liệu cần thuộc"));
ND.push(bang(["Hạng mục", "Số liệu"], [
  ["Dữ liệu", "2,89 triệu sự kiện, 139 ngày, 417.053 sản phẩm; mật độ 3,3·10⁻⁵"],
  ["Train / test", "179.999 user train (≥ 3 tương tác), 126.230 item; 9.467 user test; tháng test 19/8–18/9/2015"],
  ["Trọng số", "Xem 1, thêm giỏ 3, mua 5; suy giảm λ = 0,01/ngày"],
  ["Tuning", "Lưới 27 tổ hợp; tốt nhất rank 50, regParam 1,0, alpha 40, NDCG@10 = 0,0680"],
  ["Baseline", "Toàn sàn 0,0051 (ALS +1.237 %); theo danh mục 0,0475 (ALS +43 %)"],
  ["Coverage", "ALS 3,44 % (ngưỡng 10 %); phục vụ (xếp lại β = 1,0, 200 ứng viên) 6,47 %, NDCG 0,0865; offline thêm 3 ô đồng xuất hiện 14,5 %"],
  ["Mô hình v2", "NDCG 0,0680 → 0,0694 (+2,1 %); coverage 3,44 → 3,72 %; tự triển khai ngày 11/11"],
  ["A/B", "350.160 impression, 7 ngày; CTR A 2,094 %, B 1,978 %; z = −2,43; p = 0,015; chuyển đổi p = 0,75; theo user p = 0,029–0,037"],
  ["Z-ORDER", "Tệp đọc 67 → 1,07; trung vị 8.280 → 980 ms; nhanh 8,4 lần so với chỉ OPTIMIZE"],
  ["Vòng khép kín", "Kafka → bronze 10,3 giây; bấm → bảng thịnh hành 51 giây (ngưỡng 90)"],
  ["Tái lập", "A/B lệch 0; huấn luyện lệch 0 – 3,55·10⁻¹⁵; 6 dòng từ 3 lượt chạy (features v0, v3, v4)"],
  ["Cụm", "6 máy lab, mỗi máy 7 GB RAM; 5 worker, 34 lõi, 13 GB executor; HDFS 5 DataNode, sao chép 2"],
], [22, 78]));

// ================================================================== PHỤ LỤC C
ND.push(muc("Phụ lục C. Vì sao kịch bản làm như vậy (rút kinh nghiệm 12/11)"));
ND.push(doan("Buổi demo với giảng viên sáng 12/11 đạt đủ 8 tiêu chí, nhưng có 8 chỗ vướng; bảng dưới là lý do của từng thay đổi. Ngoài ra, bộ phát chạy bằng `nohup` thay cho `tmux` (không phải nhớ phím tắt), tắt bằng `pkill`; lệnh `pgrep` dùng mẫu `phat_lai_su_kie[n]` để không tự khớp với chính nó."));
ND.push(bang(["#", "Hiện tượng ngày 12/11", "Nguyên nhân", "Cách làm trong kịch bản này"], [
  ["1", "DAG 5 chạy **1 giờ 16 phút** (lần trước 19 phút); web treo gần 40 phút", "DAG 5 (ALS 16 lõi) chạy cùng lúc với bộ phát 90 giây/ngày (khoảng 200 sự kiện/giây); labsoe-18 vừa là worker vừa chạy web", "Kích hoạt DAG 5 ở **T−90, khi bộ phát chưa chạy**. Chỉ bật bộ phát khi DAG 5 đã xanh"],
  ["2", "Bộ phát làm cụm nặng", "90 giây/ngày là tốc độ cao nhất từng dùng", "Phát ở **300 giây/ngày** (khoảng 60 sự kiện/giây): khối thịnh hành vẫn đầy, tải giảm 3 lần"],
  ["3", "Trang sản phẩm xoay mãi; `curl` không in gì", "Trang sản phẩm **tự hỏi bảng thịnh hành mỗi 5 giây**, mỗi lần là một truy vấn Spark không đệm trên `local[2]` của web; các truy vấn xếp hàng", "Chỉ mở trang sản phẩm **đúng lúc demo**, đóng ngay khi xong. Không chạy `curl` liên tục"],
  ["4", "“ĐÃ CẬP NHẬT sau N giây” có thể không hiện", "Trang chỉ in dòng này khi sản phẩm **đã có dòng** trong bảng thịnh hành trước khi bấm. DAG bảo trì xóa dòng cũ hơn 2 ngày", "**Mồi** sản phẩm bằng 1 lượt “xem” ở T−8, kiểm tra ở T−5"],
  ["5", "Số thêm giỏ tăng ít hơn số lần bấm", "3 lần gửi **vắt qua ranh giới phút**; cửa sổ mới nhất chỉ chứa lần thứ 3", "Bấm 3 lần **liền nhau trong 2 giây**. Lệnh dự phòng tự chờ tới giây :03 của phút kế tiếp"],
  ["6", "Kafka UI không lọc ra tin của web", "Gõ từ khóa nhưng **chưa bấm Submit**; quét từ mốc quá xa", "Seek Type = **Timestamp** đúng phút vừa bấm, gõ mã user, **bấm Submit**"],
  ["7", "Giờ trên bảng tái lập và cửa sổ thịnh hành lệch 7 tiếng", "Các bảng Delta và Spark UI ghi giờ UTC", "Nói trước: “UTC, cộng 7 tiếng”"],
  ["8", "Bộ phát chạy thì DAG 1 sẽ tự huấn luyện lại lúc 02:00", "Sensor của DAG 1 thấy dữ liệu mới trong bronze", "**Tạm dừng** `kn_pipeline_hang_ngay` tới khi nộp bài để màn hình khớp báo cáo"],
], [5, 26, 33, 36]));

// ================================================================== PHỤ LỤC D
ND.push(ngat());
ND.push(muc("Phụ lục D. Thẻ tóm tắt ngày 19/11 (in ra, cầm tay)"));
ND.push(bang(["Mốc", "Giờ", "Việc", "Ở đâu"], [
  ["T−90", "", "Kích hoạt DAG 5 **một lần** (bộ phát tắt)", "Tab 8 / cửa sổ 1"],
  ["T−60", "", "Vào phòng, máy chiếu, thử mạng", "Laptop"],
  ["T−45", "", "3 cửa sổ Git Bash; `kiem_tra_cum.sh`, `luong.sh trang_thai`, `suc-khoe`", "Cửa sổ 1–3"],
  ["T−30", "", "DAG 5 xanh? Ctrl+F5 tab 6, 5, 7, 8", "Tab 4–8"],
  ["T−20", "", "Đăng nhập Airflow **trước khi chiếu**; xếp 8 tab", "Trình duyệt"],
  ["T−15", "", "Ghi p-value: ________", "Tab 7"],
  ["T−10", "", "`pgrep` → `nohup … phat_lai_su_kien.py …` → `tail`", "Cửa sổ 2"],
  ["T−8", "", "Mồi 102605 và 320844 (2 lệnh `curl … \"loai\":\"xem\"`)", "Cửa sổ 1"],
  ["T−5", "", "`curl …/api/thinh-hanh/102605` (thêm giỏ < 3); trending đủ 10", "Cửa sổ 1, tab 6, 3"],
], [10, 11, 54, 25]));
ND.push(sauBang());
ND.push(bang(["Tab", "Link"], [
  ["1 Spark", `\`${SPARK}\``],
  ["2 HDFS", `\`${HDFS}\``],
  ["3 Kafka UI", `\`${KAFKA}\` → Topics → \`retailrocket-events\``],
  ["4 Airflow", `\`${AIRFLOW}\``],
  ["5 Mô hình", `\`${WEB}/mo-hinh\``],
  ["6 Trang chủ", `\`${WEB}/\` (nhóm B \`/?u=270018\`, nhóm A \`/?u=1287993\`)`],
  ["7 A/B", `\`${WEB}/ab\``],
  ["8 Tái lập", `\`${WEB}/tai-lap\``],
  ["Sản phẩm", `\`${WEB}/san-pham/102605?u=moi_\`________`],
], [17, 83]));
ND.push(sauBang());
ND.push(doan("**Thứ tự:** mở đầu → 0:30 · demo bước 0–7 → 13:30 · chuyển slide → 14:00 · thuyết trình (Tâm, ~60 phút) · hỏi đáp · **so giờ 3:30 / 7:00 / 9:30 / 13:30**"));
ND.push(doan("Mã user mới: `moi_`________________ · User có item mới: ________________ · Nhóm lên lúc: ________"));

// ------------------------------------------------------------------ xuất
const doc = new Document({
  creator: "Le Chi Tam",
  title: "Kịch bản demo ngày 19/11/2026",
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
    { reference: "y", levels: [
      { level: 0, format: LevelFormat.BULLET, text: "–", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 567, hanging: 283 } } } },
    ] },
    { reference: "so", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 567, hanging: 340 } } } }] },
  ] },
  sections: [{
    properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1134, bottom: 1134, left: 1701, right: 1134 } } },
    footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [
      new TextRun({ text: "BD03 · Kịch bản demo ngày 19/11/2026 · trang ", font: FONT, size: 20, color: XAM }),
      new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: 20, color: XAM }),
    ] })] }) },
    children: ND,
  }],
});
const RA = path.join(__dirname, "BD03_Kich_ban_demo_19_11.docx");
Packer.toBuffer(doc).then((b) => {
  fs.writeFileSync(RA, b);
  console.log("đã ghi", RA, Math.round(b.length / 1024), "KB");
});
