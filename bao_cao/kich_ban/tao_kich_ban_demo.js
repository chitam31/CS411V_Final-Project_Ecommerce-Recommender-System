// tao_kich_ban_demo.js - dựng "Kịch bản demo chính thức" (tiếng Việt, lời dẫn tiếng Anh) thành .docx:
// Times New Roman 13, giãn dòng 1,5, A4. Chạy: node tao_kich_ban_demo.js -> BD03_Kich_ban_demo_chinh_thuc.docx
// Cú pháp nội dung: **đậm**, `mã`. Bản 12/11/2026, viết lại sau buổi demo với giảng viên sáng 12/11.
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
const y2 = (s) => new Paragraph({ children: chu(s), numbering: { reference: "y", level: 1 }, spacing: { ...GIAN, after: 30 } });
let dsSo = 0;
const batDauSo = () => { dsSo += 1; };
const so = (s) => new Paragraph({ children: chu(s), numbering: { reference: "so", level: 0, instance: dsSo }, spacing: { ...GIAN, after: 40 } });
const muc = (s) => new Paragraph({ heading: HeadingLevel.HEADING_1, pageBreakBefore: false, children: [new TextRun({ text: s, font: FONT, size: 30, bold: true, color: XANH })] });
const muc2 = (s) => new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: s, font: FONT, size: 27, bold: true, color: XANH })] });
const nhan = (s) => new Paragraph({ children: [new TextRun({ text: s, font: FONT, size: 26, bold: true, color: CAM })], spacing: { ...GIAN, before: 80, after: 20 }, keepNext: true });
const ghi = (s) => new Paragraph({ children: chu(s, { color: XAM, italics: true }), spacing: { ...GIAN, after: 80 } });
const ngat = () => new Paragraph({ children: [new PageBreak()] });

// lời dẫn tiếng Anh: khung nền nhạt, viền trái xanh
const VIEN_LOI = { style: BorderStyle.SINGLE, size: 18, color: "2E6DB4", space: 8 };
const loi = (s) => new Paragraph({
  children: chu(s, { italics: false }), alignment: AlignmentType.LEFT, spacing: { ...GIAN, after: 60 },
  indent: { left: 284, right: 113 }, border: { left: VIEN_LOI },
  shading: { type: ShadingType.CLEAR, fill: "EEF3FA", color: "auto" },
});

// khung lệnh: một khung = một lệnh, dán từng khung một
let soLenh = 0;
const lenh = (may, s) => { soLenh += 1; const VIEN_LENH = { style: BorderStyle.SINGLE, size: 18, color: soLenh % 2 ? "8C96A3" : "8D97A4", space: 6 }; return new Paragraph({
  keepNext: false, keepLines: true,
  spacing: { line: 264, lineRule: "auto", before: 60, after: 60 },
  indent: { left: 284, right: 113 }, border: { left: VIEN_LENH },
  shading: { type: ShadingType.CLEAR, fill: "F1F3F5", color: "auto" },
  children: [
    new TextRun({ text: `[${may}]`, font: FONT, size: 22, bold: true, color: CAM }),
    new TextRun({ text: s, font: MA, size: 21, break: 1 }),
  ],
}); };
const mongDoi = (s) => new Paragraph({
  children: [new TextRun({ text: "→ ", font: FONT, size: 26, bold: true, color: "2E7D32" }), ...chu(s)],
  spacing: { ...GIAN, after: 60 }, indent: { left: 284 },
});

const VIEN = { style: BorderStyle.SINGLE, size: 4, color: "8C96A3" };
const TONG = 9071; // A4 21 cm − lề trái 3 cm − lề phải 2 cm = 16 cm
function bang(cot, dong, rong, toMau = null) {
  const w = rong.map((r) => Math.round((TONG * r) / 100));
  w[w.length - 1] = TONG - w.slice(0, -1).reduce((a, b) => a + b, 0);
  const o = (s, dau, j, nen) => new TableCell({
    width: { size: w[j], type: WidthType.DXA }, borders: { top: VIEN, bottom: VIEN, left: VIEN, right: VIEN },
    shading: dau ? { type: ShadingType.CLEAR, fill: "DCE6F2", color: "auto" } : nen ? { type: ShadingType.CLEAR, fill: nen, color: "auto" } : undefined,
    margins: { top: 40, bottom: 40, left: 90, right: 90 },
    children: String(s).split("\n").map((dongChu) => new Paragraph({ children: chu(dongChu, dau ? { bold: true } : {}), spacing: { line: 276, lineRule: "auto" } })),
  });
  return new Table({
    width: { size: TONG, type: WidthType.DXA }, columnWidths: w,
    rows: [cot, ...dong].map((d, i) => new TableRow({
      tableHeader: i === 0, cantSplit: true,
      children: d.map((x, j) => o(x, i === 0, j, i > 0 && toMau ? toMau(d, i) : null)),
    })),
  });
}
const sauBang = () => new Paragraph({ children: [], spacing: { after: 80 } });

const WEB = "http://10.68.71.149:8000";
const ND = [];
const giua = (text, o = {}, sp = {}) => new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 60, ...sp }, children: [new TextRun({ text, font: FONT, size: 26, ...o })] });

// ================================================================== BÌA
ND.push(giua("TRƯỜNG ĐẠI HỌC TÂN TẠO · CS411V DỮ LIỆU LỚN", { bold: true }));
ND.push(giua("KỊCH BẢN DEMO CHÍNH THỨC", { size: 34, bold: true, color: XANH }, { before: 160 }));
ND.push(giua("Đề tài 3 – Hệ thống gợi ý sản phẩm thương mại điện tử (bd03_khuyen_nghi)", { italics: true }));
ND.push(giua("Lê Chí Tâm (2302220) · Lê Nguyễn Quốc Anh (2302283)"));
ND.push(giua("Giảng viên hướng dẫn: TS. Cao Tiến Dũng"));
ND.push(giua("Bản ngày 12/11/2026, viết lại sau buổi demo với giảng viên sáng 12/11 · dùng cho buổi bảo vệ 18/11/2026", { color: XAM }, { after: 240 }));

// ================================================================== CÁCH DÙNG
ND.push(muc("Cách dùng kịch bản"));
ND.push(y("Kịch bản đi qua **đủ 8 tiêu chí nghiệm thu** trên cụm thật, khoảng **15 phút** (mục 4). Có bản rút gọn 5 phút và 2 phút (mục 5)."));
ND.push(y("Kịch bản này **thay cho mục 4–5** của `docs/CHUAN_BI_BAO_VE.md` và **mục 3** (lời dẫn demo) của kịch bản thuyết trình. Các mục còn lại của hai tài liệu đó vẫn dùng được."));
ND.push(y("**T** là giờ bắt đầu buổi trình bày. T−90 nghĩa là 90 phút trước đó. Demo có thể diễn ra ngay sau T hoặc sau phần hỏi – đáp; kịch bản đủ thời gian cho cả hai trường hợp."));
ND.push(y("Ký hiệu máy: `[laptop]` là Git Bash ở `/d/BIG DATA/bd03_khuyen_nghi`; `[labsoe-11]`, `[labsit]` là sau khi đã `ssh` vào máy đó, đứng ở `~/bd03_khuyen_nghi`."));
ND.push(y("**Mỗi khung xám là một lệnh.** Dán từng khung một, chờ kết quả rồi mới dán khung tiếp theo. Không dán nhiều dòng cùng lúc (ngày 12/11 dán cả khối bắt đầu bằng `ssh` thì các dòng sau bị mất)."));
ND.push(y("Khung xanh là **lời dẫn tiếng Anh** (Quốc Anh nói). Phần **Ý chính** là dàn ý tiếng Việt: dùng khi demo bằng tiếng Việt hoặc khi quên lời."));
ND.push(y("Phân vai: **Tâm** bấm máy và gõ lệnh; **Quốc Anh** nói lời dẫn và nhìn đồng hồ."));

// ================================================================== 0. THÔNG TIN NHANH
ND.push(muc("0. Thông tin nhanh"));
ND.push(bang(["Mục", "Giá trị"], [
  ["Web", "`http://10.68.71.149:8000` (máy labsoe-18). Ngoài mạng lab: đường hầm SSH, mục 6"],
  ["Airflow", "`http://10.68.71.113:8088`, tài khoản `admin`. **Không gõ mật khẩu khi màn hình đang chiếu**"],
  ["Spark Master · HDFS", "`http://10.68.71.113:8080` · `http://10.68.71.113:9870`"],
  ["Kafka UI", "`http://10.68.71.204:8080` (máy labsit, cũng là máy chạy bộ phát)"],
  ["User nhóm A / nhóm B", "`1287993` (toàn ô ALS) / `270018` (ô 3, 6, 8 là Thịnh hành)"],
  ["Sản phẩm vòng khép kín", "Chính `102605`, dự phòng `320844`. Cả hai được **mồi** ở mốc T−8 (mục 3.6)"],
  ["Mô hình đang phục vụ", "`als_v2_r20261111T190002`: features v4, rank 50, regParam 1,0, alpha 40, NDCG@10 = 0,0680. Số liệu trùng hoàn toàn với `als_v2_r20261110T230924` trong báo cáo. Ghi lại tên đang hiện ở mục 2.4"],
  ["Tái lập đã có sẵn", "6 dòng, đều **CÓ**. Hai dòng ngày 12/11 (features v4): lệch 3,55·10⁻¹⁵ và 1,78·10⁻¹⁵"],
  ["Giờ trên màn hình", "Bảng tái lập, cửa sổ thịnh hành và Spark UI của từng ứng dụng ghi giờ **UTC**: cộng 7 tiếng ra giờ Việt Nam"],
], [26, 74]));
ND.push(sauBang());

ND.push(muc2("Bản đồ 8 tiêu chí"));
ND.push(bang(["#", "Tiêu chí", "B.", "Màn hình", "Số cần nói"], [
  ["1", "Tuning ≥ 9 tổ hợp", "1", "Chất lượng mô hình → Bảng tuning", "Lưới 27 tổ hợp; tốt nhất rank 50 / 1,0 / 40, NDCG@10 = 0,0680"],
  ["2", "ALS so với 2 baseline", "1", "Chất lượng mô hình → bảng so sánh, biểu đồ độ phổ biến", "+1.237 %, +43 %; coverage 3,44 % → khi phục vụ 6,47 %"],
  ["8", "OPTIMIZE / Z-ORDER", "2", "Cuối trang Chất lượng mô hình", "Tệp đọc 67 → 1,07; 8.280 → 980 ms; nhanh 8,4 lần"],
  ["3", "3 chiến lược cold start", "3", "Trang chủ → + Người dùng mới", "Người mới · ít tương tác · item mới (ô 9–10)"],
  ["4", "Thịnh hành ≤ 90 giây", "4", "Trang sản phẩm → “ĐÃ CẬP NHẬT sau N giây”", "Đo ngày 11/11: 51 giây"],
  ["5", "Vòng khép kín", "4", "Kafka UI (`\"nguon\": \"web\"`), lệnh tìm trong bronze", "Kafka → bronze 10,3 giây"],
  ["6", "A/B có p-value", "5", "Bảng điều khiển A/B", "Báo cáo p = 0,015; nói thêm số đang hiện (ghi ở T−15)"],
  ["7", "Tái lập (VERSION AS OF)", "6", "Tái lập thí nghiệm", "A/B lệch 0; huấn luyện lệch ≤ 3,55·10⁻¹⁵"],
], [5, 21, 7, 33, 34]));
ND.push(sauBang());

// ================================================================== 1. RÚT KINH NGHIỆM 12/11
ND.push(muc("1. Rút kinh nghiệm từ buổi demo 12/11"));
ND.push(doan("Buổi demo với giảng viên sáng 12/11 đạt đủ 8 tiêu chí, nhưng có 8 chỗ vướng. Kịch bản này đã sửa cả 8; bảng dưới giải thích lý do của từng thay đổi."));
ND.push(bang(["#", "Hiện tượng ngày 12/11", "Nguyên nhân", "Cách làm trong kịch bản này"], [
  ["1", "DAG 5 chạy **1 giờ 16 phút** (lần trước 19 phút); web treo gần 40 phút", "DAG 5 (ALS 16 lõi) chạy cùng lúc với bộ phát 90 giây/ngày (khoảng 200 sự kiện/giây); máy labsoe-18 vừa là worker vừa chạy web", "Kích hoạt DAG 5 ở **T−90, khi bộ phát chưa chạy**. Chỉ bật bộ phát khi DAG 5 đã xanh"],
  ["2", "Bộ phát làm cụm nặng", "90 giây/ngày là tốc độ cao nhất từng dùng", "Phát ở **300 giây/ngày** (khoảng 60 sự kiện/giây, chạy khoảng 4 giờ): khối thịnh hành vẫn đầy, tải giảm 3 lần"],
  ["3", "Trang sản phẩm xoay mãi; `curl` không in gì", "Trang sản phẩm **tự hỏi bảng thịnh hành mỗi 5 giây**, mỗi lần là một truy vấn Spark không đệm trên `local[2]` của web; các truy vấn xếp hàng", "Chỉ mở trang sản phẩm **đúng lúc demo**, đóng ngay khi xong. Không mở nhiều tab sản phẩm. Không chạy `curl` liên tục"],
  ["4", "“ĐÃ CẬP NHẬT sau N giây” có thể không hiện", "Trang chỉ in dòng này khi sản phẩm **đã có dòng** trong bảng thịnh hành trước khi bấm, và số thêm giỏ mới lớn hơn số cũ. DAG bảo trì xóa dòng cũ hơn 2 ngày", "**Mồi** sản phẩm bằng 1 lượt “xem” ở T−8, kiểm tra ở T−5 (số thêm giỏ phải nhỏ hơn 3)"],
  ["5", "Số thêm giỏ tăng ít hơn số lần bấm", "3 lần gửi lúc 10:03:58–10:04:01 **vắt qua ranh giới phút**; cửa sổ mới nhất chỉ chứa lần thứ 3", "Bấm 3 lần **liền nhau trong 2 giây**. Lệnh dự phòng tự chờ tới giây :03 của phút kế tiếp"],
  ["6", "Kafka UI không lọc ra tin của web", "Gõ từ khóa nhưng **chưa bấm Submit**; quét từ mốc quá xa", "Seek Type = **Timestamp** đúng phút vừa bấm, gõ mã user, **bấm Submit**"],
  ["7", "Giờ trên bảng tái lập và cửa sổ thịnh hành lệch 7 tiếng", "Các bảng Delta và Spark UI ghi giờ UTC", "Nói trước: “UTC, cộng 7 tiếng”"],
  ["8", "Sau khi bộ phát chạy, DAG 1 sẽ tự huấn luyện lại lúc 02:00", "Sensor của DAG 1 thấy dữ liệu mới trong bronze", "**Tạm dừng** `kn_pipeline_hang_ngay` tới sau buổi bảo vệ để màn hình khớp báo cáo"],
], [5, 26, 33, 36]));
ND.push(sauBang());
ND.push(doan("Ngoài ra: bộ phát chạy bằng `nohup` thay cho `tmux` (không phải nhớ phím tắt), tắt bằng `pkill`. Khi kiểm tra tiến trình bằng lệnh một dòng qua `ssh`, dùng mẫu `phat_lai_su_kie[n]` để lệnh không tự khớp với chính nó."));

// ================================================================== 2. CHUẨN BỊ TRƯỚC 1 NGÀY
ND.push(ngat());
ND.push(muc("2. Chuẩn bị trước 1 ngày (17/11)"));

ND.push(muc2("2.1 SSH được tới 6 máy"));
ND.push(lenh("laptop", "bash scripts/cum/ssh_tat_ca.sh hostname"));
ND.push(mongDoi("In đủ 6 tên máy, không có dòng lỗi. Nếu `ssh labsoe-11` treo khi ở ngoài trường: dùng tên tắt `m11` (xem `docs/TRIEN_KHAI_CUM.md`, mục 10c)."));

ND.push(muc2("2.2 Cụm, luồng và web"));
ND.push(lenh("laptop", "ssh labsoe-11"));
ND.push(lenh("labsoe-11", "cd ~/bd03_khuyen_nghi"));
ND.push(lenh("labsoe-11", "bash scripts/cum/kiem_tra_cum.sh"));
ND.push(mongDoi("Mọi cổng `OK`, không có dòng `DONG`; `DataNode sống: 5`, `chết: 0`; `Worker sống: 5`, `lõi: 34`."));
ND.push(lenh("labsoe-11", "bash scripts/cum/tinh_trang.sh"));
ND.push(mongDoi("RAM master còn trên 1 GB khả dụng. Swap cao là bình thường, **không** dọn swap, **không** khởi động lại master (bỏ qua dòng “System restart required”)."));
ND.push(lenh("labsoe-11", "bash scripts/luong.sh trang_thai"));
ND.push(mongDoi("3 luồng đang chạy: `bd03-nap-su-kien`, `bd03-tinh-thinh-hanh`, `bd03-ghi-hien-thi`. Thiếu luồng nào: `bash scripts/luong.sh khoi_dong tat_ca`."));
ND.push(lenh("labsoe-11", `curl -s ${WEB}/api/suc-khoe`));
ND.push(mongDoi("`{\"che_do\":\"delta\",\"kafka\":\"GuiKafka\"}`. Nếu ra `\"che_do\":\"gia\"` là chế độ giả lập: **không** dùng làm bằng chứng, khởi động lại web (mục 6)."));
ND.push(y("Trên laptop mở lần lượt `/`, `/mo-hinh`, `/ab`, `/tai-lap` và nhấn **Ctrl+F5**. Trang nào trắng hoặc báo lỗi thì xử lý ngay hôm nay."));

ND.push(muc2("2.3 Airflow"));
ND.push(y("Đăng nhập `http://10.68.71.113:8088`, thấy đủ 5 DAG: `kn_pipeline_hang_ngay`, `kn_giam_sat_streaming`, `kn_tinh_ab`, `kn_bao_tri`, `kn_tai_lap`."));
ND.push(y("`kn_pipeline_hang_ngay` **phải đang tạm dừng** (công tắc xám). Nếu đang bật: tắt ngay, rồi mở trang Chất lượng mô hình xem mô hình triển khai có đổi không. Nếu đã đổi: ghi tên mới ở mục 2.4 và dùng tên đó trong buổi bảo vệ."));
ND.push(y("`kn_giam_sat_streaming` để **tạm dừng** khi bộ phát không chạy (nếu bật, cứ 15 phút nó khởi động lại luồng thịnh hành vô ích). Ngày bảo vệ có thể bật trong lúc bộ phát chạy (mục 3.5)."));
ND.push(y("Ô **Triggerer** màu đỏ là cố ý (không có deferrable operator, sensor chạy `mode=reschedule`). Lần chạy `kn_tinh_ab` đỏ lúc 16:00 ngày 11/11 là sự cố 31 đã ghi trong báo cáo."));

ND.push(muc2("2.4 Ghi lại các số đang hiện"));
ND.push(bang(["Mục", "Lấy ở đâu", "Giá trị"], [
  ["Tên mô hình trạng thái `trien_khai` mới nhất", "Chất lượng mô hình → dòng “Mô hình mới nhất”", "________________"],
  ["Features v của mô hình đó", "Cột “Features v” trong bảng lịch sử mô hình", "____"],
  ["Số tổ hợp của bảng tuning trên màn hình", "Tiêu đề “Bảng tuning của lần chạy mới nhất (… tổ hợp)”", "____"],
  ["p-value CTR trên bảng A/B", "Bảng điều khiển A/B", "________"],
  ["User có ô 9–10 nhãn “Theo danh mục” (item mới)", "Trang chủ → danh sách user mẫu, thử vài user", "________"],
], [40, 42, 18]));
ND.push(sauBang());
ND.push(ghi("Ngày 12/11 bảng tuning trên màn hình là của lần chạy 19:00 ngày 11/11, có 10 tổ hợp (vẫn ≥ 9). Lưới đủ 27 tổ hợp nằm trong báo cáo. User 1287993 hiện toàn ô ALS vì nguồn item mới của user này cạn; nên tìm sẵn một user có ô 9–10 “Theo danh mục” để minh họa chiến lược item mới."));

ND.push(muc2("2.5 Tập trọn kịch bản và quay video dự phòng"));
ND.push(y("Làm đúng mục 3 (từ T−45) và mục 4 một lần trên cụm thật, có bấm giờ."));
ND.push(y("Quay màn hình bằng **Win + Alt + R** (Xbox Game Bar) hoặc OBS. Lưu vào laptop và USB. Đây là phương án cuối cùng nếu mất mạng."));
ND.push(y("Tập xong: **tắt bộ phát** (mục 9) để tối đó DAG không có việc nặng."));

ND.push(muc2("2.6 Đường hầm SSH (thử trước, dùng khi ở ngoài mạng lab)"));
ND.push(lenh("laptop", "ssh -N -L 8001:localhost:8000 labsoe-18"));
ND.push(mongDoi("Cửa sổ đứng im là đúng; để nguyên cửa sổ này. Mở web ở `http://localhost:8001`."));

ND.push(muc2("2.7 Chuẩn bị laptop"));
ND.push(y("Tắt chế độ ngủ; bật Do not disturb; thoát Zalo, Messenger và ứng dụng đồng bộ."));
ND.push(y("Trình duyệt: profile sạch, ẩn thanh dấu trang, đóng tab cá nhân và tab Claude; phóng to 110–125 % và thử trên máy chiếu."));
ND.push(y("Cỡ chữ Git Bash lớn (chuột phải → Options → Text). Mở sẵn một cửa sổ đã `ssh labsoe-11` và `cd ~/bd03_khuyen_nghi`."));

// ================================================================== 3. NGÀY DEMO
ND.push(ngat());
ND.push(muc("3. Ngày demo: các mốc từ T−90 đến T"));
ND.push(bang(["Mốc", "Việc", "Ai", "Xong"], [
  ["T−90", "**Kích hoạt DAG 5** một lần, khi bộ phát **chưa** chạy (3.1)", "Tâm", "☐"],
  ["T−60", "Có mặt, cắm máy chiếu, mở slide, thử độ phân giải", "Cả hai", "☐"],
  ["T−45", "Kiểm tra cụm, luồng, web (3.2)", "Tâm", "☐"],
  ["T−30", "DAG 5 phải **xanh**; mở 4 trang web (3.3)", "Tâm", "☐"],
  ["T−20", "Đăng nhập Airflow; mở các tab theo thứ tự (3.4)", "Tâm", "☐"],
  ["T−15", "Ghi p-value đang hiện trên bảng A/B, báo cho Quốc Anh", "Tâm", "☐"],
  ["T−10", "**Bật bộ phát** ở 300 giây/ngày (3.5)", "Tâm", "☐"],
  ["T−8", "**Mồi** 2 sản phẩm demo (3.6)", "Tâm", "☐"],
  ["T−5", "Kiểm tra khối thịnh hành và sản phẩm đã mồi (3.7)", "Tâm", "☐"],
  ["T−2", "Về slide 1; điện thoại im lặng", "Cả hai", "☐"],
], [10, 64, 14, 12]));
ND.push(sauBang());

ND.push(muc2("3.1 T−90 · Kích hoạt DAG 5 (tái lập huấn luyện)"));
batDauSo();
ND.push(so(`Mở \`${WEB}/tai-lap\`, kéo xuống mục **“Tái lập huấn luyện mô hình (DAG kn_tai_lap)”**.`));
ND.push(so("Ô chọn để **dòng đầu tiên** (mới nhất), ví dụ `features v4 · als_v2_r20261111T190002 · NDCG 0.0680`: trùng với mô hình đang phục vụ."));
ND.push(so("Bấm **Kích hoạt kn_tai_lap** **đúng một lần**."));
ND.push(mongDoi("Dưới nút hiện `{\"dag_id\":\"kn_tai_lap\",\"dag_run_id\":\"manual__…\",\"trang_thai\":\"queued\"}`. Airflow → `kn_tai_lap` có lượt mới đang chạy. Khi cụm rảnh, DAG chạy khoảng **20–25 phút**."));
ND.push(y("Trong lúc DAG 5 chạy: **không** bật bộ phát, **không** chạy job tay nào khác, **không** bấm Kích hoạt lần nữa."));
ND.push(y("Nếu không kịp T−90 (đến muộn): **bỏ qua bước này**. Ở bước 6 dùng các dòng đã có (6 dòng **CÓ**, hai dòng ngày 12/11). Không kích hoạt DAG 5 sát giờ demo."));

ND.push(muc2("3.2 T−45 · Kiểm tra cụm"));
ND.push(lenh("laptop", "ssh labsoe-11"));
ND.push(lenh("labsoe-11", "cd ~/bd03_khuyen_nghi"));
ND.push(lenh("labsoe-11", "bash scripts/cum/kiem_tra_cum.sh"));
ND.push(mongDoi("Không `DONG`, 5 DataNode, 5 worker. Spark có **4** ứng dụng nếu DAG 5 còn chạy (3 luồng + `bd03-tai-lap-huan-luyen`)."));
ND.push(lenh("labsoe-11", "bash scripts/luong.sh trang_thai"));
ND.push(mongDoi("3 luồng đang chạy."));
ND.push(lenh("labsoe-11", `curl -s ${WEB}/api/suc-khoe`));
ND.push(mongDoi("`\"che_do\":\"delta\"`."));

ND.push(muc2("3.3 T−30 · DAG 5 đã xanh, mở 4 trang web"));
ND.push(y("Airflow → `kn_tai_lap`: lượt hôm nay có 2 task xanh (`chay_lai_huan_luyen`, `so_sanh_voi_lich_su`)."));
ND.push(y(`Mở \`${WEB}/tai-lap\`, nhấn Ctrl+F5: bảng tái lập huấn luyện có **2 dòng mới** (giờ UTC của hôm nay), cột trùng khớp **CÓ**.`));
ND.push(y("**Nếu DAG 5 chưa xanh:** chờ, và **chưa bật bộ phát** cho tới khi nó xanh. Nếu tới T−10 vẫn chưa xanh: không bật bộ phát; khối thịnh hành sẽ thưa nhưng các bước khác vẫn làm được. Ở bước 6 chỉ Airflow đang chạy và các dòng cũ."));
ND.push(y("Mở lần lượt `/`, `/mo-hinh`, `/ab` (Ctrl+F5) để web nạp sẵn bộ đệm. **Không** mở trang sản phẩm."));

ND.push(muc2("3.4 T−20 · Mở tab theo thứ tự demo"));
ND.push(doan("Cửa sổ 1 (theo thứ tự): **Spark Master** · **HDFS** (Datanodes) · **Airflow** (trang danh sách DAG) · **Kafka UI** (topic `retailrocket-events`) · **web Chất lượng mô hình** · **web Trang chủ** · **web Bảng điều khiển A/B** · **web Tái lập thí nghiệm**. Cửa sổ 2: slide. **Không** mở sẵn tab trang sản phẩm."));

ND.push(muc2("3.5 T−10 · Bật bộ phát"));
ND.push(lenh("laptop", "ssh labsit"));
ND.push(lenh("labsit", `pgrep -f "phat_lai_su_kie[n]" || echo CHUA_CHAY`));
ND.push(mongDoi("`CHUA_CHAY`. Nếu in ra một số: bộ phát đã chạy từ trước, **không** bật thêm; nhảy tới lệnh `tail`."));
ND.push(lenh("labsit", "nohup python3 -u ~/bd03_khuyen_nghi/producer/phat_lai_su_kien.py --tep ~/du_lieu/retailrocket/events.csv --tu-ngay-ms 1438387200000 --ty-le-nguoi-moi 0 --giay-moi-ngay 300 > ~/phat.log 2>&1 &"));
ND.push(mongDoi("Chỉ hiện một dòng kiểu `[1] 3013475`."));
ND.push(lenh("labsit", "sleep 10; tail -3 ~/phat.log"));
ND.push(mongDoi("Có dòng `Phát 857072 sự kiện, 48.1 ngày dữ liệu, dự kiến … phút` (khoảng 240 phút). Hai dòng `DeprecationWarning` của thư viện Kafka là cảnh báo, không phải lỗi. Thấy `Traceback` thì dừng lại và xử lý."));
ND.push(lenh("labsit", "exit"));
ND.push(y("Giải thích tham số: `1438387200000` là 01/08/2015 (48 ngày cuối của dữ liệu); `--giay-moi-ngay 300` phát một ngày dữ liệu trong 5 phút, chạy khoảng 4 giờ; `--ty-le-nguoi-moi 0` vì đây là lần phát lặp, không sinh lại mã `moi_<n>`. Silver bỏ trùng theo nội dung nên phát lặp không làm sai dữ liệu."));
ND.push(y("Tùy chọn: bật công tắc `kn_giam_sat_streaming` trên Airflow để cả 4 DAG đang chạy theo lịch (DAG 1 vẫn tạm dừng). Tắt lại sau buổi demo."));

ND.push(muc2("3.6 T−8 · Mồi 2 sản phẩm demo"));
ND.push(doan("Gửi 1 lượt **xem** cho mỗi sản phẩm để sản phẩm có sẵn một dòng trong bảng thịnh hành với số thêm giỏ bằng 0. Nhờ vậy, ở bước 4 trang sản phẩm mới in được dòng “ĐÃ CẬP NHẬT sau N giây”. Chạy ở cửa sổ đã `ssh labsoe-11`:"));
ND.push(lenh("labsoe-11", `curl -s -m 30 -X POST ${WEB}/api/su-kien -H "Content-Type: application/json" -d '{"ma_nguoi_dung":"demo_moi","ma_san_pham":"102605","loai":"xem"}'`));
ND.push(lenh("labsoe-11", `curl -s -m 30 -X POST ${WEB}/api/su-kien -H "Content-Type: application/json" -d '{"ma_nguoi_dung":"demo_moi","ma_san_pham":"320844","loai":"xem"}'`));
ND.push(mongDoi("Mỗi lệnh ra `{\"da_gui\":true,\"luc_ms\":…,\"so_tuong_tac_phien\":…}`."));

ND.push(muc2("3.7 T−5 · Kiểm tra lần cuối"));
ND.push(lenh("labsoe-11", `curl -s -m 120 ${WEB}/api/thinh-hanh/102605`));
ND.push(mongDoi("Có `cua_so_ket_thuc` là giờ UTC của vài phút tới và `\"so_luot_them_gio\": 0` (hoặc 1–2). Nếu số thêm giỏ **≥ 3**, dùng `320844` cho bước 4 (kiểm tra bằng lệnh tương tự). Chạy **một lần**, chờ tối đa 2 phút; không chạy lặp lại."));
ND.push(y("Tải lại tab Trang chủ: khối **“Đang thịnh hành”** có đủ 10 sản phẩm, không chỉ 1–2 món."));
ND.push(y("Kafka UI → topic `retailrocket-events` → Overview: **Message Count** tăng sau mỗi lần tải lại."));

// ================================================================== 4. KỊCH BẢN DEMO TRỌN BỘ
ND.push(ngat());
ND.push(muc("4. Kịch bản demo trọn bộ (khoảng 15 phút)"));
ND.push(doan("Tâm bấm máy, Quốc Anh nói. Mỗi bước gồm: thao tác, bằng chứng phải thấy, lời dẫn tiếng Anh, ý chính tiếng Việt, cách xử lý khi lỗi. Thứ tự đi từ hạ tầng đến mô hình, rồi tới các tính năng chạy sống, kết thúc bằng tái lập."));
ND.push(bang(["B.", "Nội dung", "Tiêu chí", "Thời lượng", "Mốc kết thúc"], [
  ["0", "Hạ tầng đang chạy", "–", "1:30", "1:30"],
  ["1", "Chất lượng mô hình: so sánh, độ phổ biến, lịch sử, tuning", "1, 2", "2:30", "4:00"],
  ["2", "OPTIMIZE / Z-ORDER", "8", "1:00", "5:00"],
  ["3", "Cold start: người mới, ít tương tác, item mới", "3", "2:30", "7:30"],
  ["4", "Vòng khép kín và thịnh hành ≤ 90 giây", "4, 5", "3:00", "10:30"],
  ["5", "Thí nghiệm A/B", "6", "2:00", "12:30"],
  ["6", "Tái lập bằng VERSION AS OF", "7", "2:00", "14:30"],
  ["–", "Câu kết", "–", "0:30", "15:00"],
], [8, 50, 12, 14, 16]));
ND.push(sauBang());

function buoc(b) {
  ND.push(muc2(b.tieu));
  ND.push(new Paragraph({ spacing: { ...GIAN, after: 40 }, keepNext: true, children: [
    new TextRun({ text: "Thời lượng: ", font: FONT, size: 26, color: XAM }), new TextRun({ text: b.tg, font: FONT, size: 26, bold: true }),
    new TextRun({ text: `   ·   Tiêu chí: ${b.tc}   ·   Màn hình: `, font: FONT, size: 26, color: XAM }), ...chu(b.mh),
  ] }));
  ND.push(nhan("Thao tác (Tâm)"));
  batDauSo();
  b.lam.forEach((p) => (Array.isArray(p) ? ND.push(lenh(p[0], p[1])) : ND.push(so(p))));
  ND.push(nhan("Phải thấy"));
  b.thay.forEach((p) => ND.push(y(p)));
  ND.push(nhan("Lời dẫn (Quốc Anh, tiếng Anh)"));
  b.noi.forEach((p) => ND.push(loi(p)));
  ND.push(nhan("Ý chính (tiếng Việt)"));
  b.yc.forEach((p) => ND.push(y(p)));
  ND.push(nhan("Nếu lỗi"));
  b.loi.forEach((p) => (Array.isArray(p) ? ND.push(lenh(p[0], p[1])) : ND.push(y(p))));
}

buoc({
  tieu: "Bước 0 · Hạ tầng đang chạy", tg: "1:30", tc: "nền cho cả 8", mh: "Spark Master, HDFS, Kafka UI, Airflow",
  lam: [
    "Tab **Spark Master** (`:8080`): chỉ vào 5 worker `ALIVE` với IP ZeroTier và 3 ứng dụng streaming đang chạy.",
    "Tùy chọn: bấm `bd03-tinh-thinh-hanh` → **Application Detail UI** → tab **Structured Streaming**: biểu đồ Input Rate / Process Rate.",
    "Tab **HDFS** (`:9870`) → **Datanodes**: 5 DataNode `In Service`.",
    "Tab **Kafka UI** → topic `retailrocket-events` → Overview: **Message Count**; tải lại một lần để thấy số tăng.",
    "Tab **Airflow**: 5 DAG `kn_*`; chỉ vào `kn_pipeline_hang_ngay` đang tạm dừng.",
  ],
  thay: ["5 worker, 34 lõi, 13 GB executor; 3 ứng dụng `bd03-nap-su-kien`, `bd03-tinh-thinh-hanh`, `bd03-ghi-hien-thi`.", "5 DataNode; Message Count của Kafka tăng đều.", "5 DAG; DAG 1 tạm dừng có chủ đích."],
  noi: ["Before the features, the platform itself. This is the Spark Master of our cluster: five workers on five laboratory machines connected by ZeroTier, thirty-four cores in total. Three Structured Streaming applications are running right now: event ingestion, trending, and the impression log. HDFS has five live DataNodes with replication two. Kafka is receiving the replayed clickstream; the message count keeps growing. Airflow holds our five DAGs. The nightly pipeline is paused for the defence, so that every screen matches the report."],
  yc: ["6 máy lab qua ZeroTier; 5 worker, 34 lõi.", "3 luồng streaming đang chạy: nạp sự kiện, thịnh hành, nhật ký hiển thị.", "HDFS 5 DataNode, sao chép 2; Kafka đang nhận dữ liệu phát lại.", "5 DAG; DAG 1 tạm dừng để màn hình khớp báo cáo."],
  loi: [
    "Có **4** ứng dụng (còn `bd03-tai-lap-huan-luyen`): DAG 5 chưa xong. Nói: “the reproduction job from this morning is still running; we will come back to it at the end”.",
    "Một worker hoặc DataNode chết: không cần làm gì, Spark chạy lại task, HDFS còn bản sao thứ hai. Có thể nói đây là ví dụ chịu lỗi.",
  ],
});

buoc({
  tieu: "Bước 1 · Chất lượng mô hình", tg: "2:30", tc: "1 và 2", mh: "web → **Chất lượng mô hình** (`/mo-hinh`)",
  lam: [
    "Mở tab **Chất lượng mô hình**. Dừng ở bảng so sánh đầu trang khoảng 15 giây.",
    "Chỉ vào dòng **“Ngưỡng đạt”** (NDCG tăng +1237,2 %, coverage 3,4 % → CHƯA ĐẠT).",
    "Cuộn xuống biểu đồ **“Phân phối độ phổ biến của item được gợi ý”**.",
    "Cuộn xuống **“Chỉ số theo phiên bản mô hình”**: chỉ vào dòng `giu_mo_hinh_cu` (17:44 ngày 10/11, NDCG 0,0574) và dòng `trien_khai` mới nhất.",
    "Cuộn xuống **“Bảng tuning của lần chạy mới nhất”**: dòng đầu rank 50, regParam 1,0, alpha 40.",
  ],
  thay: [
    "6 phương pháp × 6 chỉ số: ALS, Baseline 1 (bán chạy toàn sàn), Baseline 2 (theo danh mục), mô hình v2 lọc tầm giá, xếp lại novelty β = 0,1 và 0,3.",
    "ALS NDCG@10 = 0,0680; Baseline 1 = 0,0051; Baseline 2 = 0,0475.",
    "Bảng tuning ≥ 9 dòng, xếp NDCG giảm dần.",
  ],
  noi: [
    "This page reads directly from the gold tables. At the top, ALS against the two mandatory baselines on precision, recall, NDCG and MAP at ten, plus coverage and novelty. NDCG at ten is 0.0680: plus 1,237 percent over global best-sellers, and still plus 43 percent over best-sellers of the user’s own category.",
    "The threshold line says “not met” because of coverage: plain ALS covers 3.4 percent of the catalogue. The chart below explains why: recommendations concentrate on the most popular items. Novelty re-ranking pulls the distribution to the right; the configuration we serve reaches 6.5 percent with an even higher NDCG, and an offline mix with co-occurrence candidates passes ten percent.",
    "Further down is the model history. The nightly pipeline deploys a new model only if it is not worse than the one being served: here, on 10 November, a weaker model was rejected and the old one kept. Finally, the tuning table of the latest run, sorted by NDCG. The best configuration is rank 50, regParam 1.0, alpha 40.",
  ],
  yc: [
    "Mọi số trên trang đọc thẳng từ bảng gold.",
    "NDCG@10 = 0,0680: **+1.237 %** so với bán chạy toàn sàn, **+43 %** so với bán chạy theo danh mục.",
    "“CHƯA ĐẠT” là do coverage: ALS thuần **3,44 %**. Biểu đồ cho thấy popularity bias. Cấu hình đang phục vụ (xếp lại novelty) đạt **6,47 %**, NDCG 0,0865; thử offline thêm ứng viên đồng xuất hiện đạt **14,5 %**.",
    "Cổng triển khai: mô hình mới chỉ lên khi NDCG không kém mô hình đang chạy. Dòng 17:44 ngày 10/11 bị giữ mô hình cũ.",
    "Bảng tuning: tốt nhất rank 50, regParam 1,0, alpha 40.",
  ],
  loi: [
    "Trang chậm hơn 20 giây: Quốc Anh nói tiếp lời dẫn; quá 40 giây thì chuyển sang slide 11–14 và quay lại sau.",
    "Hội đồng hỏi vì sao bảng tuning chỉ có 10 dòng: “the latest nightly run tuned ten combinations; the full grid of 27 is in the report, with the same winner”.",
    "Hội đồng hỏi vì sao tên mô hình khác báo cáo: xem mục 7.",
  ],
});

buoc({
  tieu: "Bước 2 · OPTIMIZE / Z-ORDER", tg: "1:00", tc: "8", mh: "cuối trang **Chất lượng mô hình**",
  lam: ["Cuộn xuống mục cuối **OPTIMIZE / ZORDER**.", "Chỉ vào 2 dòng `truoc` / `sau`: số tệp phải đọc trung bình mỗi truy vấn, thời gian trung vị."],
  thay: ["Tệp đọc mỗi truy vấn **67 → 1,07**; trung vị **8.280 → 980 ms**."],
  noi: ["At the bottom of the same page, the Z-ORDER measurement on the hottest query of the home page: fetching one user’s recommendations. After OPTIMIZE with Z-ORDER by user id, each query reads about one file instead of sixty-seven, and the median time falls from 8.3 seconds to under one second, 8.4 times faster than OPTIMIZE alone. Times vary with cluster load; the number of files read does not."],
  yc: ["Truy vấn nóng của trang chủ: `WHERE ma_nguoi_dung = ?`.", "Z-ORDER theo user gom dòng cùng user vào ít tệp, data skipping loại gần hết tệp.", "Thời gian dao động theo tải, **số tệp đọc thì không**."],
  loi: ["Hội đồng muốn đo lại tại chỗ: **không** chạy trong buổi demo (job nặng, làm web chậm). Hẹn chạy sau buổi bảo vệ: `bash ha_tang/spark/submit.sh bao_tri bao_tri/do_zorder.py --phan-manh 200 --so-truy-van 30`."],
});

buoc({
  tieu: "Bước 3 · Cold start", tg: "2:30", tc: "3", mh: "web → **Trang chủ**",
  lam: [
    "Tab **Trang chủ** → bấm **+ Người dùng mới (cold start)**. **Ghi lại mã** `moi_xxxxxxxx` trên thanh địa chỉ (dùng ở bước 4).",
    "Chỉ vào: mã user, chip **ngoài thí nghiệm A/B**, chip **Chiến lược nguoi_moi**, 10 ô nhãn **Thịnh hành** trùng khối “Đang thịnh hành”.",
    "Bấm một thẻ sản phẩm → trên trang sản phẩm bấm **Thêm vào giỏ** → kéo xuống **Sản phẩm liên quan** (cùng danh mục), bấm một thẻ → **Thêm vào giỏ**.",
    "Gõ lại địa chỉ trang chủ của user (giữ đúng mã): `http://10.68.71.149:8000/?u=moi_xxxxxxxx`.",
    "Chỉ vào chip **Chiến lược it_tuong_tac**: các ô **Theo danh mục** (đúng danh mục vừa xem) xen kẽ **Thịnh hành**.",
    "Item mới: mở trang chủ của user đã tìm ở mục 2.4, chỉ vào ô **9–10** nhãn **Theo danh mục**.",
  ],
  thay: [
    "User mới: 10 ô Thịnh hành, ngoài thí nghiệm A/B.",
    "Sau 2 tương tác cùng danh mục: chiến lược `it_tuong_tac`, 5 ô theo danh mục và 5 ô thịnh hành xen kẽ.",
    "User quen: ô 9–10 là item chưa có trong mô hình ALS, cùng danh mục chính của user.",
  ],
  noi: [
    "Cold start. One click creates a user who has never existed. ALS has no vector for this user, so the page uses the new-user strategy: all ten slots come from the newest trending window, the same items as the trending block. The user is outside the A/B experiment, because the experiment only compares ALS lists.",
    "Now this user adds two products of one category to the cart. Back on the home page, the strategy has switched to “few interactions”: best-sellers of that category, interleaved with trending, five and five. The session memory of the web application makes this immediate, without waiting for the nightly batch.",
    "The third strategy is for new items. For known users, the last two slots are reserved for items that ALS has never seen, chosen from the user’s main category, at the same positions in both A/B groups.",
  ],
  yc: ["**Người mới hoàn toàn**: 10 ô thịnh hành 15 phút mới nhất.", "**Ít tương tác (< 5)**: bán chạy theo danh mục vừa xem xen kẽ thịnh hành 5/5, đổi ngay trong phiên.", "**Item mới**: ô 9–10 của user quen, cùng vị trí ở cả 2 nhóm A/B nên không làm lệch thí nghiệm."],
  loi: [
    "10 ô ít hoặc trùng lặp: khối thịnh hành thưa vì bộ phát chưa chạy hoặc đã dừng. Kiểm tra: `ssh labsit \"tail -3 ~/phat.log\"`.",
    "Nhãn chưa đổi sang `it_tuong_tac`: kiểm tra thanh địa chỉ còn đúng `?u=moi_…`; tải lại trang chủ.",
    "Trang sản phẩm mở chậm: **không** bấm tải lại liên tục. Mỗi trang sản phẩm chỉ ở lại vài giây rồi rời đi (trang tự hỏi máy chủ mỗi 5 giây).",
  ],
});

buoc({
  tieu: "Bước 4 · Vòng khép kín và thịnh hành ≤ 90 giây", tg: "3:00", tc: "4 và 5", mh: "trang sản phẩm đã mồi, Kafka UI",
  lam: [
    "Gõ địa chỉ trang sản phẩm đã mồi, kèm mã user của bước 3: `http://10.68.71.149:8000/san-pham/102605?u=moi_xxxxxxxx`. Nút **Thêm vào giỏ** chỉ hiện khi địa chỉ có `?u=`.",
    "Đọc ô **Trạng thái trong bảng thịnh hành**: “Cửa sổ kết thúc … · thêm giỏ 0”.",
    "Bấm **Thêm vào giỏ** 3 lần **liền nhau trong khoảng 2 giây**. Nhìn giờ trên dòng “Đã đẩy sự kiện … vào Kafka lúc …”.",
    "Chuyển sang tab **Kafka UI** → **Messages** → ô **Seek Type** chọn **Timestamp**, chọn **đúng phút vừa bấm** → ô **Search** gõ mã `moi_xxxxxxxx` → bấm **Submit**. Bấm dấu **+** ở một dòng.",
    "Quay lại tab sản phẩm, chờ trang tự hỏi lại (mỗi 5 giây) tới khi hiện **“ĐÃ CẬP NHẬT sau N giây”**.",
    "Thấy kết quả xong: **đóng tab sản phẩm** (hoặc bấm Back).",
  ],
  thay: [
    "Kafka UI: 3 dòng có Key = mã user, nội dung có `\"nguon\": \"web\"`, `\"loai\": \"them_gio\"`.",
    "Trang sản phẩm: “thêm giỏ 3 · **ĐÃ CẬP NHẬT sau N giây**”, N ≤ 90 (ngày 11/11 đo được 51 giây). Giờ “Cửa sổ kết thúc” là UTC.",
  ],
  noi: [
    "This is the closed loop. We open a product that almost nobody views and click “Add to cart” three times. Each click goes from the web application to Kafka; here they are in Kafka UI, keyed by our new user and marked as coming from the web.",
    "Within about fifteen seconds the first stream writes them to bronze, so they become training data for tonight’s model. The trending stream reads the same topic, updates its fifteen-minute window and merges the result into gold every twenty seconds. The page asks for the new count every five seconds and prints how long it took. The target is ninety seconds; on 11 November it took fifty-one.",
  ],
  yc: ["Bấm trên web → Kafka (thấy ngay trên Kafka UI, nguồn `web`).", "Kafka → bronze khoảng 10–15 giây: click trở thành dữ liệu huấn luyện đêm nay (khép kín vòng).", "Luồng thịnh hành: cửa sổ 15 phút trượt 1 phút, MERGE vào gold mỗi 20 giây; trang đo và in số giây, ngưỡng **90 giây**."],
  loi: [
    "Số thêm giỏ tăng nhưng không có chữ “ĐÃ CẬP NHẬT”: sản phẩm chưa có dòng trước khi bấm (quên mồi hoặc dòng đã bị xóa). Con số vẫn là bằng chứng; đọc giờ trên đồng hồ.",
    "Số thêm giỏ chỉ tăng 1–2: 3 lần bấm vắt qua ranh giới phút. Giải thích: cửa sổ trượt mỗi phút, cửa sổ vừa mở chỉ chứa các lần bấm sau mốc phút; các cửa sổ trước đó chứa đủ 3.",
    "Quá 90 giây chưa cập nhật: (1) nói “the stream may be in a micro-batch, let me check it”; (2) ở cửa sổ labsoe-11 chạy `bash scripts/luong.sh trang_thai`, thiếu luồng thì `bash scripts/luong.sh khoi_dong thinh_hanh` (checkpoint giữ offset nên click vừa bấm vẫn được tính); (3) không kịp thì chỉ slide 21 (51 giây) và đi tiếp.",
    "Trang sản phẩm không mở được: gửi “Thêm giỏ” thẳng qua API (đúng lệnh mà nút bấm gọi). Lệnh tự chờ tới giây :03 của phút kế tiếp để 3 lần gửi nằm trong cùng một phút:",
    ["labsoe-11", `while [ $(date +%-S) -gt 2 ]; do sleep 1; done; sleep 3; for i in 1 2 3; do curl -s -m 30 -X POST ${WEB}/api/su-kien -H "Content-Type: application/json" -d '{"ma_nguoi_dung":"moi_xxxxxxxx","ma_san_pham":"320844","loai":"them_gio"}'; echo; done; date`],
    "Hoặc đo tự động bằng script (in “… cập nhật sau NN giây → ĐẠT”):",
    ["labsoe-11", `python3 scripts/demo_vong_khep_kin.py --web ${WEB} --san-pham 320844 --nguoi-dung moi_xxxxxxxx --so-lan 3`],
    "Hội đồng hỏi bằng chứng sự kiện đã vào bronze (job Spark nhỏ, khoảng 1–2 phút):",
    ["labsoe-11", "bash ha_tang/spark/submit.sh nhanh kiem_tra/tim_su_kien_bronze.py --ma-nguoi-dung moi_xxxxxxxx"],
  ],
});

buoc({
  tieu: "Bước 5 · Thí nghiệm A/B", tg: "2:00", tc: "6", mh: "Trang chủ `/?u=270018`, **Bảng điều khiển A/B**",
  lam: [
    "Mở `http://10.68.71.149:8000/?u=270018` (nhóm B): chỉ vào ô **3, 6, 8** nhãn Thịnh hành. Tải lại một lần: vẫn nhóm B.",
    "Tùy chọn: mở `/?u=1287993` (nhóm A): cả 10 ô **Gợi ý ALS**.",
    "Mở tab **Bảng điều khiển A/B**.",
  ],
  thay: ["CTR và tỷ lệ chuyển đổi theo nhóm; p-value của CTR và của chuyển đổi; câu kết luận ở mức 5 %; cỡ mẫu cần thiết; biểu đồ CTR theo ngày; tỷ lệ traffic mô phỏng từng ngày."],
  noi: [
    "The A/B experiment. This user is in group B: slots three, six and eight are trending items. Reloading never changes the group, because assignment is a stable hash of the user id. Group A, for comparison, sees ALS only.",
    "On the dashboard: click-through and conversion per group, the p-values and the daily chart, with the share of simulated traffic for every day. The dashboard currently shows p equals [số đã ghi ở T−15]; the report keeps the seven simulated days, p equals 0.015. Both say the same thing: under this simulation group B has a significantly lower click-through rate, and conversion shows no difference.",
  ],
  yc: ["Phân nhóm bằng `md5(ma_nguoi_dung)`: cùng user luôn cùng nhóm.", "Nhóm B: 30 % ô hiển thị là thịnh hành (ô 3, 6, 8); ô 9–10 là item mới ở cả hai nhóm.", "Báo cáo: 350.160 impression, 7 ngày; CTR A 2,094 %, B 1,978 %; **p = 0,015**; chuyển đổi p = 0,75.", "Traffic chủ yếu mô phỏng, có gắn nhãn; kết luận chỉ đúng trong giả định mô phỏng."],
  loi: ["p trên bảng khác 0,0135 hoặc 0,015: nói đúng số đang hiện. Lý do: mỗi lần mở trang chủ user ALS, web ghi 10 impression thật; `kn_tinh_ab` tính lại mỗi giờ."],
});

buoc({
  tieu: "Bước 6 · Tái lập bằng VERSION AS OF", tg: "2:00", tc: "7 (đề ghi “bắt buộc demo”)", mh: "web → **Tái lập thí nghiệm** (`/tai-lap`), Airflow",
  lam: [
    "Mở tab **Tái lập thí nghiệm**. Ở bảng A/B, chọn một ngày cũ (ví dụ dòng cuối) → bấm **Chạy lại**. Chờ 10–30 giây.",
    "Chỉ vào bảng so sánh: cột **Lệch** = 0, và cột **Phiên bản hiện tại (không time travel)** cho số khác.",
    "Kéo xuống bảng **Tái lập huấn luyện mô hình**: chỉ vào **2 dòng mới nhất** (DAG 5 kích hoạt lúc T−90), cột trùng khớp **CÓ**.",
    "Tùy chọn: tab Airflow → `kn_tai_lap` → lượt hôm nay → task `so_sanh_voi_lich_su` → **Logs**: dòng `=== KẾT QUẢ TÁI LẬP ===`, `trung_khop: True`.",
  ],
  thay: ["A/B: mọi chỉ số (hiển thị, click, mua, CTR, chuyển đổi, p-value) lệch 0, kết luận trùng khớp.", "Huấn luyện: 2 dòng `tuning` và `huan_luyen` của lượt hôm nay, lệch cỡ 10⁻¹⁵, **CÓ**. Giờ trong bảng là UTC."],
  noi: [
    "Finally, reproduction with Delta time travel. We pick an old day and re-run it: the application reads the impression log VERSION AS OF the version recorded with that result, and recomputes the aggregates and the test. Every metric matches with a deviation of zero, while the current version of the log, in the last column, gives different numbers because the log has grown since then.",
    "Below is the training reproduction. Before this session we triggered DAG 5. It read the feature matrix as of the recorded version, retrained the deployed model with the same hyper-parameters, iterations and seed, and evaluated it again. The new rows match the recorded metrics to within ten to the minus fifteen, which is only floating-point rounding in distributed sums. Same Delta version, same seed, same metrics.",
  ],
  yc: ["A/B: đọc `gold.nhat_ky_hien_thi` bằng `versionAsOf` đã ghi, chạy lại cùng hàm tổng hợp và z-test → lệch 0; phiên bản hiện tại cho số khác.", "Huấn luyện (DAG 5): features `VERSION AS OF` + cùng siêu tham số, `maxIter`, hạt giống 42, số khối → cùng metric; lệch ~10⁻¹⁵ do cộng số thực phân tán (dung sai 10⁻⁶).", "Lịch sử Delta giữ 30 ngày nên VACUUM hằng đêm không xóa phiên bản cũ."],
  loi: [
    "**Không** bấm Kích hoạt kn_tai_lap trong buổi demo (ngày 12/11 việc này làm web treo gần 40 phút).",
    "DAG 5 chưa xong: mở Airflow cho thấy lượt đang chạy, nói “it retrains the deployed model, about twenty minutes when the cluster is idle”, rồi chỉ 2 dòng ngày 12/11 (lệch 3,55·10⁻¹⁵ và 1,78·10⁻¹⁵).",
    "Nút Chạy lại A/B chờ quá 40 giây: nói tiếp phần huấn luyện, quay lại sau.",
  ],
});

ND.push(muc2("Câu kết (30 giây)"));
ND.push(loi("That covers all eight acceptance criteria, live on the cluster: the tuning table, the two baselines, Z-ORDER, three cold-start strategies, the closed loop within ninety seconds, the A/B test with its p-value, and reproduction with time travel. Thank you; we are happy to answer your questions."));
ND.push(y("Sau câu kết: Tâm quay về slide cuối (slide 25), không để màn hình ở trang Airflow hay Git Bash."));

// ================================================================== 5. RÚT GỌN
ND.push(ngat());
ND.push(muc("5. Phương án rút gọn"));
ND.push(muc2("Nếu chỉ có 5 phút"));
ND.push(bang(["Bước", "Làm gì", "Thời lượng"], [
  ["1 + 2", "Chất lượng mô hình: bảng so sánh, dòng Ngưỡng đạt, kéo nhanh qua tuning, dừng 10 giây ở Z-ORDER", "1:00"],
  ["3", "Chỉ tạo người dùng mới (10 ô thịnh hành, ngoài A/B). Ghi mã `moi_…`", "0:45"],
  ["4", "Trang sản phẩm đã mồi → Thêm vào giỏ 3 lần → chờ “ĐÃ CẬP NHẬT”. Bỏ Kafka UI nếu thiếu giờ", "1:45"],
  ["5", "`/?u=270018` (ô 3, 6, 8) → Bảng điều khiển A/B, nói p", "1:00"],
  ["6", "Bảng tái lập huấn luyện: 2 dòng mới, CÓ. Bỏ nút Chạy lại A/B", "0:30"],
], [12, 70, 18]));
ND.push(sauBang());
ND.push(muc2("Nếu chỉ có 2 phút"));
ND.push(doan("Làm **bước 3** (chỉ người dùng mới) và **bước 5** (bảng A/B). Bỏ vòng khép kín vì có thể phải chờ tới 90 giây; nói số 51 giây đã đo và chỉ slide 21."));
ND.push(muc2("Nếu hội đồng chọn tiêu chí"));
ND.push(doan("Mở theo **Bản đồ 8 tiêu chí** ở mục 0. Mỗi tiêu chí làm độc lập được; riêng tiêu chí 4–5 cần sản phẩm đã mồi và một mã `?u=` (tạo nhanh bằng nút + Người dùng mới)."));

// ================================================================== 6. SỰ CỐ
ND.push(muc("6. Xử lý sự cố trong lúc demo"));
ND.push(bang(["Dấu hiệu", "Nguyên nhân thường gặp", "Xử lý trong 1 phút", "Nếu vẫn không được"], [
  ["Mọi trang web đều xoay", "Truy vấn xếp hàng trên `local[2]` của web: tab sản phẩm để mở lâu, `curl` chạy lặp, hoặc job nặng (DAG 5) đang chạy", "Đóng mọi tab sản phẩm; không tải lại liên tục; chờ 1–2 phút. Nếu DAG 5 đang chạy: chờ nó xong", "`[labsoe-18] docker restart bd03-web`, chờ khoảng 30 giây. Bộ đệm mất nên trang đầu tiên chậm"],
  ["Trang tải được một nửa rồi treo", "Lỗi MTU trên đường ZeroTier (khi ở ngoài lab hoặc qua 4G)", "Chuyển sang đường hầm (mục 2.6), mở `http://localhost:8001`", "Phát Wi-Fi từ điện thoại rồi dùng đường hầm"],
  ["Khối thịnh hành chỉ 1–2 món", "Bộ phát chưa chạy hoặc đã dừng; luồng thịnh hành chết", "`ssh labsit \"tail -3 ~/phat.log\"`; `bash scripts/luong.sh trang_thai`", "`bash scripts/luong.sh khoi_dong thinh_hanh`"],
  ["Không hiện “ĐÃ CẬP NHẬT” sau 90 giây", "Chưa mồi sản phẩm; luồng đang micro-batch dài hoặc đã chết", "Đọc số “thêm giỏ”; kiểm tra luồng như dòng trên", "Lệnh API dự phòng hoặc `demo_vong_khep_kin.py` (bước 4); chỉ slide 21"],
  ["`curl` không in gì", "Hết thời gian `-m`; với `-s`, curl im lặng khi bị cắt", "Không chạy lại liên tục; chờ 1–2 phút rồi chạy **một lần** với `-m 180`", "Bỏ qua, dùng giao diện"],
  ["Kafka UI không ra tin của web", "Chưa bấm Submit; mốc thời gian quá xa", "Seek Type = Timestamp đúng phút vừa bấm, gõ mã user, **Submit**; bấm **Next** nếu cần", "Bỏ qua Kafka UI, dùng trang sản phẩm"],
  ["Giờ trên bảng lệch 7 tiếng", "Bảng Delta và Spark UI ghi giờ UTC", "Nói: “UTC, add seven hours”", "—"],
  ["Spark có thêm ứng dụng `bd03-tai-lap-huan-luyen`", "DAG 5 chưa xong", "Bình thường; không chạy thêm job tay nào", "Ở bước 6 dùng các dòng cũ"],
  ["Airflow có ô đỏ", "Triggerer (cố ý tắt); lần chạy lỗi cũ (sự cố 24, 31)", "Giải thích: không có deferrable operator; lỗi cũ đã ghi trong báo cáo", "—"],
  ["Một worker hoặc DataNode chết", "Wi-Fi lab chập chờn", "Không cần làm gì: Spark chạy lại task, HDFS còn bản sao thứ hai", "Xử lý sau buổi bảo vệ"],
  ["Mất toàn bộ mạng", "Wi-Fi phòng hoặc ZeroTier", "Chuyển sang slide và ảnh chụp (nói rõ ngày chụp)", "Mở video demo dự phòng"],
  ["Máy chiếu không nhận laptop", "Đầu chuyển, độ phân giải", "Win + P → Duplicate; 1920×1080 hoặc 1280×720", "Mở PDF slide trên máy của phòng"],
], [20, 27, 30, 23]));
ND.push(sauBang());
ND.push(doan("**Không bao giờ** dùng chế độ giả lập của web (`\"che_do\":\"gia\"`) làm bằng chứng: số liệu ở chế độ đó là giả."));

// ================================================================== 7. HỎI NHANH
ND.push(muc("7. Câu hỏi hay gặp ngay trong lúc demo"));
ND.push(doan("Trả lời ngắn rồi quay lại demo. Câu dài hơn xem bộ hỏi – đáp 52 câu."));
const hoi = [
  ["Dòng “CHƯA ĐẠT” mà mô hình vẫn “triển khai”?", "Hai việc khác nhau. Dòng ngưỡng là mục tiêu của đề (NDCG +30 % và coverage 10 %): NDCG đạt, coverage chưa. Triển khai do cổng riêng quyết định: mô hình mới chỉ lên khi NDCG không kém mô hình đang chạy (dòng 17:44 ngày 10/11 bị giữ mô hình cũ).", "Deployment is a separate gate: a new model goes live only if it is not worse than the one being served."],
  ["Coverage dưới 10 % có phải không đạt tiêu chí?", "Đề yêu cầu phân tích khi chưa đạt. Nguyên nhân là popularity bias (biểu đồ). Cấu hình phục vụ đạt 6,47 %; offline thêm 3 ô đồng xuất hiện đạt 14,5 % và NDCG còn tăng; chưa triển khai để giữ hệ thống ổn định trước buổi bảo vệ.", "Coverage is analysed as required; re-ranking nearly doubles it and an offline mix passes ten percent."],
  ["Tên mô hình khác báo cáo?", "Lần chạy pipeline lúc 19:00 ngày 11/11 huấn luyện lại trên features v4, ra cùng siêu tham số và cùng NDCG 0,0680 nên cổng cho triển khai. Mọi số liệu giống hệt `als_v2_r20261110T230924` trong báo cáo.", "Same configuration, same metrics; only the run id is newer."],
  ["Bảng tuning chỉ 10 dòng?", "Đó là lần chạy mới nhất (10 tổ hợp, vẫn ≥ 9). Lưới đủ 27 tổ hợp ở báo cáo, cùng cấu hình thắng.", "The full grid of 27 is in the report, with the same winner."],
  ["Giờ trên một số bảng lệch 7 tiếng?", "Bảng Delta và Spark UI ghi giờ UTC; cộng 7 tiếng.", "Those timestamps are UTC."],
  ["Khối thịnh hành toàn sản phẩm năm 2015?", "Bộ phát phát lại log năm 2015; cửa sổ tính theo thời điểm Kafka nhận nên vẫn là 15 phút gần nhất theo giờ thật.", "Windows use the Kafka timestamp, so they are the last fifteen real minutes."],
  ["Tên và ảnh sản phẩm có thật không?", "Không. RetailRocket đã ẩn danh; ảnh và tên là minh họa theo ngành hàng; mã sản phẩm thật luôn hiện trên thẻ.", "Names and pictures are illustrations; the real item id is on every card."],
  ["Vì sao người dùng mới “ngoài thí nghiệm A/B”?", "Thí nghiệm chỉ so danh sách ALS (A) với ALS trộn thịnh hành (B); user chưa có ALS không thuộc nhóm nào.", "The experiment compares ALS lists only."],
  ["Traffic A/B có phải người thật?", "Chủ yếu là mô phỏng theo mô hình click phụ thuộc vị trí, có gắn nhãn, không cộng điểm cho thịnh hành. Kết luận chỉ đúng trong giả định đó.", "Mostly simulated and labelled; the conclusion holds under that model."],
  ["Kafka chết thì sao?", "Web vẫn gợi ý (đọc từ gold). Kafka sống lại thì luồng đọc tiếp từ offset trong checkpoint, không mất, không trùng.", "Streams resume from the checkpoint: no loss, no duplicates."],
  ["Vì sao DAG 1 tạm dừng?", "Để màn hình khớp báo cáo. Bình thường DAG 1 chạy 02:00 mỗi ngày; ngày 11/11 nó tự triển khai mô hình v2.", "We froze the nightly pipeline for the defence so that the screens match the report."],
  ["Danh sách cá nhân có đổi ngay sau click?", "Phần ALS đổi mỗi đêm; phần thịnh hành đổi trong khoảng 1 phút; user mới đổi chiến lược ngay trong phiên. Cập nhật trực tuyến là hướng phát triển (slide 24).", "ALS nightly, trending within a minute, new users within the session."],
  ["Trang vừa rồi chậm?", "Web đọc Delta bằng Spark `local[2]` trên một máy cũng là worker; khi cụm đang chạy job nặng, truy vấn không đệm phải xếp hàng. Hướng cải tiến: tách web khỏi worker, giới hạn `spark.cores.max` cho job nặng.", "The web app shares a worker machine; under heavy jobs its uncached queries queue."],
];
ND.push(bang(["Câu hỏi", "Ý trả lời (tiếng Việt)", "Câu tiếng Anh ngắn"], hoi, [24, 48, 28]));
ND.push(sauBang());

// ================================================================== 8. KHÔNG LÀM
ND.push(muc("8. Những việc KHÔNG làm"));
[
  "Không kích hoạt DAG 5 sát giờ hoặc trong lúc demo; chỉ kích hoạt **một lần ở T−90**, khi bộ phát chưa chạy. Không chạy job tay nào khác trong lúc DAG 5 chạy (sự cố 31).",
  "Không kích hoạt DAG 1 (`kn_pipeline_hang_ngay`) trong ngày bảo vệ.",
  "Không mở sẵn hay để lâu tab trang sản phẩm; không mở nhiều tab sản phẩm cùng lúc; không chạy `curl` lặp lại liên tục.",
  "Không chạy `producer/nguoi_dung_ao.py` vào ngày bảo vệ: script này ghi thêm traffic `mo_phong_web` và làm số trên bảng A/B thay đổi.",
  "Không dừng hay xóa container của nhóm khác trên labsit-may25 và labsit-may26. Không chạy `docker compose down -v`.",
  "Không khởi động lại máy master, kể cả khi thấy dòng “System restart required”.",
  "Không mở trên màn hình các tệp bí mật: `ha_tang/*/.env`, `ha_tang/web/.env.rieng`, `ha_tang/airflow/mat_khau.json`, `kaggle.json`. Không gõ mật khẩu khi đang chiếu.",
  "Không đưa token GitHub hay khóa Kaggle lên máy lab; không sửa mã trên máy lab trong ngày bảo vệ.",
].forEach((s) => ND.push(y(s)));

// ================================================================== 9. SAU DEMO
ND.push(muc("9. Sau buổi demo"));
ND.push(muc2("Ngay sau demo"));
ND.push(lenh("laptop", "ssh labsit"));
ND.push(lenh("labsit", "pkill -f phat_lai_su_kien"));
ND.push(lenh("labsit", `pgrep -f "phat_lai_su_kie[n]" || echo DA_TAT`));
ND.push(mongDoi("`DA_TAT`."));
ND.push(lenh("labsit", "exit"));
ND.push(y("Airflow: tắt lại `kn_giam_sat_streaming` nếu đã bật ở T−10."));
ND.push(y("Ghi vào `NHAT_KY.md` (trên laptop): giờ demo, số giây đo được ở bước 4, p-value đang hiện, sự cố nếu có."));
ND.push(muc2("Sau buổi bảo vệ (kết thúc dự án)"));
ND.push(y("Bật lại `kn_pipeline_hang_ngay`, hoặc để tạm dừng nếu không chạy dự án nữa."));
ND.push(y("Trả Cassandra cho phòng lab: `[labsoe-11] sudo systemctl start cassandra`."));
ND.push(y("Muốn dừng cụm hẳn: `[labsoe-11] bash scripts/luong.sh dung tat_ca`, rồi `bash scripts/cum/khoi_dong_may.sh --dung` trên từng máy. **Không** thêm `-v`."));
ND.push(y("Hỏi cán bộ phòng lab trước khi gỡ ZeroTier hay openssh khỏi máy lab."));
ND.push(y("Nếu hội đồng yêu cầu sửa: sửa trên laptop, commit, gắn tag mới, nộp lại."));

// ================================================================== PHỤ LỤC A
ND.push(muc("Phụ lục A. Lệnh nhanh"));
ND.push(ghi("Mỗi khung là một lệnh; thay `moi_xxxxxxxx` bằng mã user thật."));
[
  ["laptop", "bash scripts/cum/ssh_tat_ca.sh hostname"],
  ["laptop", "ssh -N -L 8001:localhost:8000 labsoe-18"],
  ["labsoe-11", "bash scripts/cum/kiem_tra_cum.sh"],
  ["labsoe-11", "bash scripts/cum/tinh_trang.sh"],
  ["labsoe-11", "bash scripts/luong.sh trang_thai"],
  ["labsoe-11", "bash scripts/luong.sh khoi_dong tat_ca"],
  ["labsoe-11", "bash scripts/luong.sh log thinh_hanh"],
  ["labsoe-11", `curl -s ${WEB}/api/suc-khoe`],
  ["labsoe-11", `curl -s -m 120 ${WEB}/api/thinh-hanh/102605`],
  ["labsoe-11", `curl -s -m 30 -X POST ${WEB}/api/su-kien -H "Content-Type: application/json" -d '{"ma_nguoi_dung":"demo_moi","ma_san_pham":"102605","loai":"xem"}'`],
  ["labsoe-11", `python3 scripts/demo_vong_khep_kin.py --web ${WEB} --san-pham 320844 --nguoi-dung moi_xxxxxxxx --so-lan 3`],
  ["labsoe-11", "bash ha_tang/spark/submit.sh nhanh kiem_tra/tim_su_kien_bronze.py --ma-nguoi-dung moi_xxxxxxxx"],
  ["labsit", `pgrep -f "phat_lai_su_kie[n]" || echo CHUA_CHAY`],
  ["labsit", "nohup python3 -u ~/bd03_khuyen_nghi/producer/phat_lai_su_kien.py --tep ~/du_lieu/retailrocket/events.csv --tu-ngay-ms 1438387200000 --ty-le-nguoi-moi 0 --giay-moi-ngay 300 > ~/phat.log 2>&1 &"],
  ["labsit", "tail -3 ~/phat.log"],
  ["labsit", "pkill -f phat_lai_su_kien"],
  ["labsoe-18", "curl -s http://localhost:8000/api/suc-khoe"],
  ["labsoe-18", "docker restart bd03-web"],
].forEach(([m, s]) => ND.push(lenh(m, s)));

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
  ["Cụm", "6 máy lab, mỗi máy 7 GB RAM; 5 worker, 34 lõi, 13 GB executor; HDFS sao chép 2"],
], [22, 78]));

// ------------------------------------------------------------------ xuất
const doc = new Document({
  creator: "Le Chi Tam",
  title: "Kịch bản demo chính thức",
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
      { level: 1, format: LevelFormat.BULLET, text: "·", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 1021, hanging: 283 } } } },
    ] },
    { reference: "so", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 567, hanging: 340 } } } }] },
  ] },
  sections: [{
    properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1134, bottom: 1134, left: 1701, right: 1134 } } },
    footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [
      new TextRun({ text: "BD03 · Kịch bản demo chính thức · trang ", font: FONT, size: 20, color: XAM }),
      new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: 20, color: XAM }),
    ] })] }) },
    children: ND,
  }],
});
const RA = path.join(__dirname, "BD03_Kich_ban_demo_chinh_thuc.docx");
Packer.toBuffer(doc).then((b) => {
  fs.writeFileSync(RA, b);
  console.log("đã ghi", RA, Math.round(b.length / 1024), "KB");
});
