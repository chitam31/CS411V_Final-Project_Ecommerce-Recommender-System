// tao_hoi_dap.js - dựng "Bộ câu hỏi – đáp dự kiến" (tiếng Việt) thành .docx: Times New Roman 13, giãn dòng 1,5.
// Chạy: node tao_hoi_dap.js  ->  BD03_Hoi_dap_bao_ve.docx
// Cú pháp nội dung: **đậm**, `mã`.
const fs = require("fs");
const path = require("path");
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, Table, TableRow, TableCell,
  WidthType, BorderStyle, ShadingType, LevelFormat, Footer, PageNumber, TabStopType,
} = require("/usr/local/lib/node_modules_global/docx");

const FONT = "Times New Roman";
const MA = "Courier New";

function chu(s, them = {}) {
  // **đậm** và `mã`
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

const doan = (s, o = {}) => new Paragraph({ children: chu(s), spacing: { line: 360, lineRule: "auto", after: 80 }, alignment: AlignmentType.JUSTIFIED, ...o });
const y = (s) => new Paragraph({ children: chu(s), numbering: { reference: "y", level: 0 }, spacing: { line: 360, lineRule: "auto", after: 40 } });
const muc = (s) => new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text: s, font: FONT, size: 28, bold: true })], spacing: { before: 280, after: 120, line: 360, lineRule: "auto" }, keepNext: true });
let soCau = 0;
const cau = (s) => new Paragraph({ children: [new TextRun({ text: `Câu ${++soCau}. `, font: FONT, size: 26, bold: true, color: "1F3A68" }), ...chu(s, { bold: true, color: "1F3A68" })], spacing: { before: 160, after: 60, line: 360, lineRule: "auto" }, keepNext: true });

const VIEN = { style: BorderStyle.SINGLE, size: 4, color: "8C96A3" };
function bang(cot, dong, rong) {
  const tong = 9071; // A4 21 cm − lề trái 3 cm − lề phải 2 cm = 16 cm
  const w = rong.map((r) => Math.round((tong * r) / 100));
  w[w.length - 1] = tong - w.slice(0, -1).reduce((a, b) => a + b, 0);
  const o = (s, dau, j) => new TableCell({
    width: { size: w[j], type: WidthType.DXA }, borders: { top: VIEN, bottom: VIEN, left: VIEN, right: VIEN },
    shading: dau ? { type: ShadingType.CLEAR, fill: "DCE6F2", color: "auto" } : undefined,
    margins: { top: 40, bottom: 40, left: 90, right: 90 },
    children: [new Paragraph({ children: chu(s, dau ? { bold: true } : {}), spacing: { line: 276, lineRule: "auto" } })],
  });
  return new Table({
    width: { size: tong, type: WidthType.DXA }, columnWidths: w,
    rows: [cot, ...dong].map((d, i) => new TableRow({ tableHeader: i === 0, cantSplit: true, children: d.map((x, j) => o(x, i === 0, j)) })),
  });
}

// ------------------------------------------------------------------ nội dung
const ND = [];
ND.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 60 }, children: [new TextRun({ text: "TRƯỜNG ĐẠI HỌC TÂN TẠO · CS411V DỮ LIỆU LỚN", font: FONT, size: 26, bold: true })] }));
ND.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 120, after: 60 }, children: [new TextRun({ text: "BỘ CÂU HỎI – ĐÁP DỰ KIẾN KHI BẢO VỆ ĐỒ ÁN", font: FONT, size: 32, bold: true, color: "1F3A68" })] }));
ND.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 60 }, children: [new TextRun({ text: "Đề tài 3 – Hệ thống gợi ý sản phẩm thương mại điện tử (bd03_khuyen_nghi)", font: FONT, size: 26, italics: true })] }));
ND.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 240 }, children: [new TextRun({ text: "Lê Chí Tâm (2302220) · Lê Nguyễn Quốc Anh (2302283) · Bảo vệ ngày 19/11/2026", font: FONT, size: 26 })] }));

ND.push(muc("Cách dùng tài liệu"));
ND.push(y("Mỗi câu trả lời gồm các ý ngắn; khi trả lời, nói **ý thứ nhất trước** (câu trả lời trực tiếp), các ý sau là lý do và bằng chứng."));
ND.push(y("Luôn dẫn **số liệu thật** của đồ án (bảng ở mục 1) và chỉ vào slide hoặc màn hình web tương ứng."));
ND.push(y("Câu hỏi về hạn chế: **thừa nhận thẳng**, nêu nguyên nhân và hướng khắc phục; không né tránh."));
ND.push(y("Thuật ngữ giữ nguyên tiếng Anh khi hội đồng dùng tiếng Anh: NDCG, coverage, watermark, checkpoint, time travel…"));

ND.push(muc("1. Số liệu cần thuộc"));
ND.push(bang(["Hạng mục", "Số liệu"], [
  ["Dữ liệu", "2.894.238 sự kiện (4,8 % người dùng mới tổng hợp); silver 2.882.479 dòng, 139 ngày; 417.053 sản phẩm"],
  ["Ma trận", "179.999 user train (≥ 3 tương tác), 746.350 cặp, mật độ 1,8·10⁻⁵; 9.467 user test; 126.230 item trong train"],
  ["Chia dữ liệu", "Theo thời gian: 4 tháng train, tháng cuối (19/8–18/9/2015) test"],
  ["Mô hình tốt nhất", "rank 50, regParam 1,0, alpha 40 → NDCG@10 = 0,0680 (27 tổ hợp, 78 phút, 34 lõi)"],
  ["So với baseline", "+1.237 % so với bán chạy toàn sàn (0,0051); +43 % so với bán chạy theo danh mục (0,0475)"],
  ["Coverage", "ALS 3,44 % (ngưỡng 10 %); 99,2 % ô gợi ý thuộc 10 % item phổ biến nhất; trần cấu trúc 75 %"],
  ["Xếp lại novelty", "β = 1,0, 200 ứng viên: NDCG@10 0,0865 (+27 %), coverage 6,47 % (+88 %); đang phục vụ"],
  ["A/B", "350.160 impression mô phỏng; CTR A 2,094 % – B 1,978 %, z = −2,43, p = 0,015; chuyển đổi p = 0,75; cần 76.972/nhóm. Theo user: p = 0,037 (cụm), 0,029 (bootstrap), KTC 95 % [−10,5 % ; −0,7 %], design effect 1,36"],
  ["Z-ORDER", "Tệp đọc mỗi truy vấn 67 → 1,07; trung vị 8.280 → 980 ms (nhanh 8,4 lần so với chỉ OPTIMIZE)"],
  ["Tái lập", "Độ lệch 0,000000 trên features phiên bản 0 (1,78·10⁻¹⁵ khi không làm tròn); 11/11 tái lập lại **mô hình đang phục vụ** trên phiên bản 3 từ nút trên web: lệch đúng 0, kể cả NDCG v2 và 2 baseline"],
  ["Vòng khép kín", "Kafka → bronze 10,3 giây; bấm → bảng thịnh hành 51 giây (ngưỡng 90 giây)"],
  ["Nguồn ứng viên", "Offline 11/11: 7 ô ALS + 3 ô đồng xuất hiện → coverage 6,47 % → **14,5 %** (ngưỡng 10 %), NDCG@10 0,0865 → 0,0892 (kỳ kiểm tra 0,0742 → 0,0764); chưa triển khai"],
  ["Kỳ validation", "Chọn trên 19/8–2/9, báo cáo trên 3–18/9: chọn đúng rank 50, reg 1,0, alpha 40 và β = 1,0; kỳ kiểm tra: ALS 0,0579 (+1.086 % / +40 %), xếp lại 0,0742 (+80 % so với danh mục); lạc quan 0,0002"],
  ["Mô hình v2", "Đã triển khai 11/11 (als_v2_r20261110T230924, alpha 40): NDCG@10 0,0680 → 0,0694 (+2,1 %), coverage 3,44 % → 3,72 %, 4.346 → 4.699 item; ở alpha 10: +2,3 %"],
  ["Cụm", "6 máy lab, mỗi máy 12 lõi, 7 GB RAM; 5 worker: 34 lõi, 13 GB executor; HDFS sao chép 2; 31 lỗi đã sửa, 139 kiểm thử"],
], [24, 76]));

ND.push(muc("2. Tổng quan và kiến trúc"));
ND.push(cau("Vì sao chọn kiến trúc lakehouse nhiều lớp (bronze/silver/gold) thay vì ghi thẳng vào một cơ sở dữ liệu?"));
ND.push(y("Bronze giữ nguyên dữ liệu gốc, nên khi đổi logic làm sạch có thể **xử lý lại** từ đầu mà không mất gì."));
ND.push(y("Delta Lake mang **ACID** lên HDFS: MERGE, time travel, schema evolution, Change Data Feed — đều là yêu cầu của đề."));
ND.push(y("Tách lớp giúp khoanh vùng lỗi: silver hỏng không ảnh hưởng bronze; gold chỉ chứa những gì web và DAG cần đọc."));
ND.push(cau("Vì sao phải dùng Kafka? Ghi thẳng từ web xuống HDFS có được không?"));
ND.push(y("Kafka **tách nguồn phát khỏi bộ xử lý**: nhiều consumer (luồng bronze, luồng thịnh hành) cùng đọc một topic."));
ND.push(y("Kafka giữ offset; luồng chạy lại từ checkpoint **không mất, không trùng** sự kiện."));
ND.push(y("Bằng chứng thật: 05:22 ngày 11/11 luồng thịnh hành chết; 3 lượt bấm vẫn nằm trong Kafka và được tính bù sau khi chạy lại."));
ND.push(y("Ghi thẳng xuống HDFS sẽ sinh rất nhiều tệp nhỏ và không có cơ chế phát lại."));
ND.push(cau("Cụm được triển khai thế nào? Vì sao dùng ZeroTier?"));
ND.push(y("6 máy lab: master `labsoe-11` (NameNode, Spark Master, mọi driver, Airflow); 5 worker (34 lõi, 13 GB); Kafka trên `labsit`; web trên `labsoe-18`."));
ND.push(y("Các máy không cùng một mạng LAN có thể cấu hình; **ZeroTier** tạo mạng ảo 10.68.71.0/24, mọi dịch vụ quảng bá IP ZeroTier."));
ND.push(y("Toàn bộ chạy trong Docker; một tệp danh bạ `cau_hinh/cum.env` quyết định vai trò từng máy."));
ND.push(cau("Vì sao driver chạy client mode trên master? Có nhược điểm gì?"));
ND.push(y("Đơn giản: mọi job nộp qua `docker exec spark-master`, log tập trung một chỗ."));
ND.push(y("Nhược điểm: **RAM master** (7,4 GB) là nút thắt → Airflow bản gọn, pool 1 chỗ ban đêm."));
ND.push(y("Rủi ro đã gặp: hủy ứng dụng qua Master không dừng tiến trình driver → driver “ma” tranh checkpoint (lỗi 27); đã sửa `luong.sh`."));
ND.push(cau("Hệ số sao chép HDFS bằng bao nhiêu? Vì sao?"));
ND.push(y("**2**: một DataNode treo vì Wi-Fi thì dữ liệu vẫn đọc được ở máy khác."));
ND.push(y("Lần chạy đầu với hệ số 1, một DataNode treo làm cả 4 lần thử của task đều lỗi (lỗi 16)."));

ND.push(muc("3. Dữ liệu và làm sạch"));
ND.push(cau("Bỏ trùng sự kiện như thế nào? Vì sao còn bỏ trùng theo nội dung?"));
ND.push(y("Hai bước: `dropDuplicates(ma_su_kien)` rồi `bo_ban_sao_noi_dung` theo (user, sản phẩm, loại, thời điểm)."));
ND.push(y("`ma_su_kien` băm cả offset Kafka, nên **phát lại** sinh mã mới; thiếu bước 2, lần phát lại thứ hai làm gấp đôi sự kiện và lọc bot nhầm người thật."));
ND.push(y("Bằng chứng: sau khi phát lại 857.072 sự kiện, 9 tổ hợp alpha = 10 cho NDCG **giống hệt** lần trước đến 4 chữ số thập phân."));
ND.push(cau("Lọc bot và nhiễu thế nào?"));
ND.push(y("Loại user có **trên 500 sự kiện/giờ**; gộp thao tác lặp trong **5 giây** (debounce)."));
ND.push(cau("Trọng số và suy giảm theo thời gian?"));
ND.push(y("Xem 1, thêm giỏ 3, mua 5; nhân `exp(−λ·tuổi)` với λ = 0,01/ngày, cộng dồn theo cặp user–item."));
ND.push(cau("Vì sao chia train/test theo thời gian chứ không ngẫu nhiên?"));
ND.push(y("Tránh **rò rỉ tương lai**: mô hình chỉ được thấy quá khứ, đúng như khi triển khai thật."));
ND.push(y("Chỉ đánh giá 9.467 user test đã có trong train; item test chưa từng xuất hiện thì ALS không thể gợi ý."));

ND.push(muc("4. Mô hình ALS"));
ND.push(cau("ALS implicit khác ALS explicit (rating) thế nào?"));
ND.push(y("Không có rating: tách **preference** p = 1 nếu có tương tác, 0 nếu không, và **confidence** c = 1 + α·r."));
ND.push(y("**Mọi ô** của ma trận (kể cả ô trống) đều vào hàm mất mát; ô trống có p = 0, c = 1."));
ND.push(y("Xen kẽ: cố định item, giải nghiệm đóng cho mọi user (bình phương tối thiểu), rồi đổi vai; Spark chia khối để song song."));
ND.push(cau("Ý nghĩa rank, regParam, alpha? Vì sao chọn rank 50, alpha 40?"));
ND.push(y("rank: số nhân tố ẩn (sức chứa); regParam: phạt độ lớn vector (chống quá khớp); alpha: mức tin vào ô có tương tác."));
ND.push(y("NDCG **tăng đơn điệu** theo rank và alpha: một lượt mua (trọng số 5) với alpha 40 có confidence 201 so với 1 của ô trống → mô hình học được nhiều từ dữ liệu rất thưa."));
ND.push(y("Tối ưu nằm ở **biên lưới** → bước tiếp theo là thử rank 100, alpha 80."));
ND.push(cau("Chọn siêu tham số trên tập test có phải là gian lận không?"));
ND.push(y("Thừa nhận: bảng tuning chính chọn trên tháng test nên về nguyên tắc **hơi lạc quan**; báo cáo ghi rõ (mục 1.3, 6.2)."));
ND.push(y("Ngày 11/11 nhóm **kiểm tra lại bằng kỳ validation riêng** (`kiem_tra/tuning_validation.py`): 15 ngày đầu tháng test (19/8–2/9) chỉ để chọn, 16 ngày sau (3–18/9) chỉ để báo cáo; train, seed, maxIter giữ nguyên."));
ND.push(y("Kết quả: chọn trên validation ra **đúng cấu hình đang phục vụ** (rank 50, reg 1,0, alpha 40) và **đúng β = 1,0**. Trên kỳ kiểm tra: ALS **+1.086 %** so với bán chạy toàn sàn, **+40 %** so với theo danh mục; bản xếp lại **0,0742** (+80 %)."));
ND.push(y("Mức lạc quan đo được: nếu nhìn chính kỳ kiểm tra để chọn thì chỉ hơn **0,0002** (0,0581 so với 0,0579), dưới 0,5 % tương đối → gần như bằng 0. Thứ hạng các cấu hình ở hai kỳ gần như trùng (Spearman 0,995)."));
ND.push(y("Lưu ý nếu bị hỏi: lần kiểm tra đo 17/27 tổ hợp (cả 9 tổ hợp rank 10, 5 tổ hợp rank 30, 3 tổ hợp rank 50 alpha 40); 10 tổ hợp bỏ lại có NDCG cả tháng 0,023–0,057, thấp xa nhóm dẫn đầu 0,066–0,068, nên không thể đổi kết quả chọn."));
ND.push(cau("Vì sao NDCG trên kỳ kiểm tra (0,058) thấp hơn trên cả tháng (0,068)?"));
ND.push(y("Mọi phương pháp đều thấp hơn ở kỳ sau, kể cả baseline: user ở kỳ này xa thời điểm train hơn, sở thích đã trôi; NDCG thấp hơn kỳ validation 17–29 % ở mọi tổ hợp."));
ND.push(y("Vì vậy chỉ so sánh **trên cùng một kỳ**: trên kỳ kiểm tra ALS vẫn hơn hai baseline +1.086 % và +40 % (cả tháng: +1.237 % và +43 %), xếp lại vẫn thêm 28 % (cả tháng 27 %)."));
ND.push(cau("Vì sao mô hình phục vụ phải huấn luyện lại trên cả train và test?"));
ND.push(y("Mô hình đánh giá chỉ thấy 4 tháng đầu; danh sách cho người dùng phải phản ánh **cả tháng gần nhất**."));
ND.push(y("Fit lại với đúng siêu tham số đã chọn, rồi mới sinh gợi ý cho toàn bộ user."));
ND.push(cau("ALS xử lý cold start thế nào?"));
ND.push(y("ALS **không có vector** cho user/item mới → ba chiến lược riêng (hàm thuần Python, có kiểm thử):"));
ND.push(y("User mới hoàn toàn: 10 sản phẩm thịnh hành của cửa sổ 15 phút mới nhất."));
ND.push(y("User < 5 tương tác: bán chạy của danh mục đã xem, xen kẽ với thịnh hành."));
ND.push(y("Item mới (không có trong ALS): chen vào ô 9–10 theo danh mục chính của user."));

ND.push(muc("5. Đánh giá và độ phủ"));
ND.push(cau("NDCG@10 là gì? Vì sao chọn làm chỉ số chính?"));
ND.push(y("Thưởng hit ở **vị trí cao** hơn hit ở vị trí thấp (chia log₂(j+1)), chuẩn hóa bởi danh sách lý tưởng IDCG → giá trị 0–1."));
ND.push(y("Phản ánh đúng trải nghiệm: người dùng thường chỉ nhìn vài ô đầu; đề bài yêu cầu chọn theo NDCG@10."));
ND.push(cau("NDCG 0,068 có phải quá thấp không?"));
ND.push(y("Giá trị tuyệt đối thấp vì ma trận rất thưa (1,8·10⁻⁵) và tháng test chứa nhiều item hiếm."));
ND.push(y("Ý nghĩa nằm ở **so sánh tương đối** trên cùng dữ liệu: gấp 13,4 lần baseline toàn sàn, +43 % so với baseline danh mục."));
ND.push(cau("Coverage chỉ 3,44 % (< 10 %), giải thích thế nào?"));
ND.push(y("Không phải giới hạn cấu trúc: 10 ô × 9.467 user = 94.670 ô cho 126.230 item → trần **75 %**."));
ND.push(y("Nguyên nhân là **popularity bias**: 99,2 % ô của ALS thuộc 10 % item phổ biến nhất; item ít tương tác có vector yếu."));
ND.push(y("Khắc phục đã làm: xếp lại novelty β = 1,0 → coverage 6,47 %, **đồng thời** NDCG tăng lên 0,0865; đã triển khai."));
ND.push(y("Danh sách đang phục vụ (gồm thịnh hành, danh mục, ALS) phủ 16.001 sản phẩm = **12,7 %** item trong train (gold phiên bản 14)."));
ND.push(y("**Thí nghiệm offline 11/11** (`kiem_tra/thu_nguon_ung_vien.py`): giữ 7 ô đầu của danh sách ALS đã xếp lại, 3 ô cuối lấy món **hay được xem cùng ngày** với các món của chính user (chỉ tính từ train) → coverage **14,5 %** (vượt ngưỡng 10 %) và NDCG@10 còn **tăng** 0,0865 → 0,0892; kỳ kiểm tra +85 % so với bán chạy theo danh mục. Chưa triển khai vào hệ thống đang chạy."));
ND.push(cau("Thí nghiệm nguồn ứng viên đạt coverage 14,5 %, sao không triển khai luôn?"));
ND.push(y("Kết quả có vào tối 11/11, một tuần trước buổi bảo vệ. Triển khai sẽ đổi danh sách đang phục vụ, thí nghiệm A/B và toàn bộ ảnh chụp trong báo cáo, nên nhóm giữ hệ thống ổn định và ghi rõ: ngưỡng coverage **đạt offline**, cùng tập user và cùng định nghĩa, nhưng **chưa đạt trong production**."));
ND.push(y("Cách triển khai đã rõ: thêm một bước ghép ô trong job trộn (`tron_goi_y`) trước khi áp mẫu A/B, rồi chạy lại A/B. Mã ghép (`ghep_danh_sach`) và luật chọn đã có kiểm thử."));
ND.push(y("Vì sao ô bán chạy theo danh mục không giúp: vài món bán chạy của mỗi danh mục lặp lại ở rất nhiều user nên gần như không thêm item mới (coverage giữ 6,4–6,5 %), lại thay chỗ những món hay trúng hơn."));
ND.push(cau("Vì sao xếp lại novelty lại làm tăng cả NDCG?"));
ND.push(y("Tháng test có nhiều item hiếm trong train; đẩy bớt món quá phổ biến làm danh sách khớp hơn với hành vi thật."));
ND.push(y("Vượt β = 1 thì đánh đổi quen thuộc quay lại (β = 2: coverage 7,21 % nhưng NDCG giảm 24 %)."));
ND.push(cau("Novelty tính thế nào?"));
ND.push(y("Trung bình −log₂(n_i / N) của các món được gợi ý; n_i là số user train tương tác với món i, N là số user train."));

ND.push(muc("6. Streaming"));
ND.push(cau("Watermark 2 phút để làm gì?"));
ND.push(y("Cho phép sự kiện đến trễ tối đa 2 phút vẫn được tính, đồng thời để Spark **dọn trạng thái** của cửa sổ cũ."));
ND.push(cau("Vì sao gom cửa sổ theo `kafka_ts` mà không theo thời điểm gốc của sự kiện?"));
ND.push(y("Dữ liệu phát lại mang mốc 2015, còn bấm trên web mang mốc 2026; gom theo thời điểm gốc thì một sự kiện web đẩy watermark lên 2026 và mọi sự kiện phát lại bị coi là trễ."));
ND.push(y("`kafka_ts` là đồng hồ của broker, **chung cho cả hai nguồn**, và đúng nghĩa “đang thịnh hành bây giờ”."));
ND.push(cau("Vì sao dùng output mode update kèm MERGE?"));
ND.push(y("Cửa sổ trượt được cập nhật ở mỗi lô; MERGE theo khóa (cửa sổ, sản phẩm) **idempotent**, chạy lại lô không làm sai số."));
ND.push(cau("51 giây độ trễ gồm những thành phần nào?"));
ND.push(y("Tối đa 20 giây chờ trigger + thời gian lô (join thống kê sản phẩm, MERGE) + 3 giây chu kỳ thăm dò của script đo."));
ND.push(cau("Exactly-once được bảo đảm thế nào?"));
ND.push(y("Checkpoint ghi offset trước khi xử lý lô; lô dở được chạy lại với đúng offset đó; ghi bằng MERGE nên không trùng."));
ND.push(y("Bằng chứng: 3 lượt bấm lúc luồng chết được tính đúng 3 lần sau khi chạy lại (cửa sổ 05:22–05:37)."));
ND.push(cau("Vì sao dùng RocksDB state store?"));
ND.push(y("Trạng thái cửa sổ của hàng trăm nghìn sản phẩm lớn; RocksDB giữ **ngoài heap JVM**, executor chỉ cần 1 GB."));

ND.push(muc("7. Thí nghiệm A/B"));
ND.push(cau("Chia nhóm A/B thế nào? Vì sao không chia ngẫu nhiên mỗi lần?"));
ND.push(y("**Hash ổn định** của mã người dùng: một user luôn ở cùng một nhóm qua mọi phiên, tránh nhiễm chéo."));
ND.push(cau("Vì sao phải mô phỏng traffic? Có trung thực không?"));
ND.push(y("Không đủ người dùng thật để kiểm định có lực; đề bài cho phép mô phỏng (mục 3.10)."));
ND.push(y("Mô hình click phụ thuộc **vị trí** và **độ liên quan**; mọi dòng mô phỏng gắn nhãn `mo_phong`, bảng điều khiển hiển thị tỷ lệ mô phỏng."));
ND.push(cau("Dùng kiểm định gì? Kết luận ra sao?"));
ND.push(y("z-test hai tỷ lệ, hai phía, độ lệch chuẩn gộp; cỡ mẫu cần 76.972 impression/nhóm để phát hiện mức tăng 10 % (α 5 %, power 80 %) — đã đủ."));
ND.push(y("CTR: B thấp hơn A 5,5 % (tương đối), **p = 0,015** → khác biệt có ý nghĩa; chuyển đổi p = 0,75 → không kết luận được."));
ND.push(cau("Impression của cùng một user không độc lập. p = 0,015 có còn tin được không?"));
ND.push(y("Đúng là không độc lập: trong mô phỏng, user có món “đúng” trong danh sách thì click ở mọi phiên. **Design effect = 1,36**, tức z-test theo impression đánh giá thấp sai số chuẩn khoảng 17 %."));
ND.push(y("Ngày 11/11 nhóm kiểm định lại **lấy user làm đơn vị** (`kiem_tra/bootstrap_ab.py`, 8.592 user, khoảng 41 impression/user): sai số chuẩn theo cụm cho **p = 0,037**; bootstrap lấy mẫu lại user 2.000 lần cho **p = 0,029**, khoảng tin cậy 95 % của mức chênh tương đối **[−10,5 % ; −0,7 %]** không chứa 0."));
ND.push(y("Kết luận giữ nguyên ở mức 5 %; chuyển đổi vẫn không khác (p = 0,75–0,76). Báo cáo giữ z-test làm phân tích chính vì đề bài yêu cầu, kết quả theo user ở mục Additional Experiments."));
ND.push(cau("Vì sao từng ngày đều không có ý nghĩa mà gộp lại thì có?"));
ND.push(y("Mỗi ngày chỉ khoảng 25.000 impression/nhóm, thấp hơn nhiều cỡ mẫu cần; phân tích chính được **định trước** là gộp 7 ngày."));
ND.push(y("Kết luận theo từng ngày là “peeking” và kiểm định bội; dù vậy B thấp hơn A cả 7/7 ngày, nhất quán với kết quả gộp."));
ND.push(cau("Hạn chế của thí nghiệm?"));
ND.push(y("Impression của cùng user tương quan (design effect 1,36) → p theo impression hơi lạc quan; **đã kiểm tra lại theo user**: p = 0,029–0,037, kết luận không đổi."));
ND.push(y("Kết luận chỉ đúng với giả định mô phỏng (thịnh hành không được cộng điểm hấp dẫn); cần phân tích độ nhạy."));
ND.push(cau("Change Data Feed được dùng ở đâu?"));
ND.push(y("DAG `kn_tinh_ab` đọc `table_changes` của nhật ký hiển thị từ phiên bản đã xử lý → chỉ tính lại những ngày bị ảnh hưởng."));

ND.push(muc("8. Delta Lake"));
ND.push(cau("Tái lập thí nghiệm bằng time travel hoạt động thế nào?"));
ND.push(y("Mỗi lần huấn luyện ghi **phiên bản Delta** của bảng features; DAG 5 đọc `VERSION AS OF` phiên bản đó, huấn luyện lại, so với số liệu đã ghi."));
ND.push(y("Kết quả trùng khớp nhờ: seed cố định, **indexer chỉ thêm** (chỉ số luôn chỉ đúng user/item), tập test lưu cùng phiên bản."));
ND.push(y("Độ lệch 0,000000 dù silver đã tiến hóa lược đồ và đã nhận thêm 857.072 sự kiện."));
ND.push(y("Đã chạy **hai lần**: 10/11 trên features phiên bản 0 (lần chạy đầu tiên), và 11/11 cho **mô hình đang phục vụ** trên phiên bản 3, kích hoạt từ nút trên web; cả hai đều trùng khớp, lần sau lệch đúng 0 kể cả NDCG của v2 và hai baseline. Mỗi lần khoảng 15–20 phút."));
ND.push(cau("Schema evolution đã làm gì?"));
ND.push(y("`ALTER TABLE ADD COLUMNS (gia_san_pham, xep_hang_sao)` chỉ ghi metadata; MERGE điền giá trị từ danh mục; dòng mới tự có hai cột."));
ND.push(y("Mô hình v2 lọc ứng viên trong tầm giá của user [0,5·P10, 1,5·P90]; xếp hạng sao là đại lượng ước lượng (proxy) vì dữ liệu không có sao."));
ND.push(cau("OPTIMIZE và Z-ORDER khác nhau thế nào?"));
ND.push(y("OPTIMIZE chỉ **gộp tệp nhỏ**; mỗi tệp gộp vẫn chứa user từ khắp miền giá trị nên không bỏ qua được tệp nào."));
ND.push(y("Z-ORDER **sắp xếp lại** để các dòng cùng user nằm chung, khoảng min/max mỗi tệp hẹp → data skipping chỉ đọc khoảng 1 tệp."));
ND.push(cau("Xung đột ghi đồng thời giữa luồng streaming và DAG bảo trì được xử lý ra sao?"));
ND.push(y("Delta kiểm soát đồng thời **lạc quan**: giao dịch commit sau bị từ chối (`Concurrent…Exception`)."));
ND.push(y("Hàm `thu_lai_khi_xung_dot` làm lại tối đa 5 lần, chờ tăng dần, chỉ với lỗi xung đột; an toàn vì MERGE/OPTIMIZE/DELETE đều idempotent."));
ND.push(cau("VACUUM có làm mất khả năng time travel không?"));
ND.push(y("Giữ tệp đã xóa **30 ngày** và log **60 ngày** → time travel trong vòng một tháng vẫn đảm bảo."));

ND.push(muc("9. Vận hành và Airflow"));
ND.push(cau("DAG hằng đêm quyết định triển khai mô hình mới thế nào?"));
ND.push(y("Triển khai nếu NDCG@10 mới ≥ NDCG@10 đang phục vụ × (1 − 1 %); ngược lại giữ mô hình cũ và cảnh báo."));
ND.push(y("Lỗi đã gặp (lỗi 23): lưới đêm cố định alpha = 10 trong khi mô hình phục vụ dùng alpha = 40 → cổng **không bao giờ mở**."));
ND.push(y("Cách sửa: lưới luôn thêm tổ hợp của mô hình đang phục vụ, để so mô hình mới với mô hình cũ ở cùng cấu hình."));
ND.push(cau("Nếu một worker chết giữa chừng thì sao?"));
ND.push(y("Spark chạy lại task trên worker khác; HDFS còn bản sao thứ hai; luồng streaming khôi phục từ checkpoint."));
ND.push(cau("Vì sao pool Airflow chỉ 1 chỗ ban đêm? Hệ quả?"));
ND.push(y("Mọi driver chạy trên master 7,4 GB; hai job lớn song song có thể làm hết RAM."));
ND.push(y("Hệ quả (lỗi 24): DAG A/B mỗi giờ quá hạn 50 phút khi xếp hàng; không mất dữ liệu nhờ đọc nối Change Data Feed. Ban ngày/khi demo dùng 2 chỗ."));
ND.push(cau("Lỗi khó nhất nhóm gặp là gì?"));
ND.push(y("**Driver ma** (lỗi 27): hủy ứng dụng qua Spark Master không dừng driver client mode; khi có dữ liệu mới, driver cũ và mới cùng ghi `offsets/31` → cả hai luồng chết."));
ND.push(y("Phát hiện nhờ đo độ trễ thất bại và đọc log; sửa `luong.sh` để dừng hẳn tiến trình driver, có kiểm thử hồi quy."));
ND.push(cau("Làm sao điều khiển cụm từ nhà?"));
ND.push(y("Mạng ở nhà làm rớt gói ZeroTier lớn (ping 1.300 byte qua, 1.400 byte mất) → SSH qua máy trung gian `labsoe-18`, hạ MTU ZeroTier 1.280."));
ND.push(y("Lệnh dài chạy trong `tmux`, ghi kết quả ra tệp; script `tinh_trang.sh` xem nhanh RAM, Spark, Airflow."));

ND.push(cau("Ảnh và tên sản phẩm trên web là thật à? Sao RetailRocket lại có ảnh?"));
ND.push(y("Không phải ảnh thật: RetailRocket đã ẩn danh, không có tên, không có ảnh, danh mục chỉ là mã số."));
ND.push(y("Lớp minh họa `web/dich_vu/minh_hoa.py` gán mỗi danh mục cấp 2 một trong 16 ngành hàng, vẽ ảnh SVG tại chỗ; ảnh nào cũng ghi \"ảnh minh họa\", chân trang nói rõ."));
ND.push(y("Mã sản phẩm và mã danh mục thật vẫn hiện trên từng thẻ; lớp này không đụng bảng, mô hình hay số đo nào."));
ND.push(y("Địa chỉ ảnh chứa khóa ngành hàng nên chữ và ảnh luôn khớp (lỗi 30: trình duyệt từng giữ ảnh cũ)."));
ND.push(cau("Vì sao bảng A/B trên web khác báo cáo một chút (p = 0,0135 so với 0,015)?"));
ND.push(y("Ngày 11/11, lúc chụp màn hình, web ghi thêm 230 impression thật của user ALS (A: 180, 7 click; B: 50, 1 click)."));
ND.push(y("Bảng điều khiển gộp 8 ngày; phân tích chính trong báo cáo cố định 7 ngày mô phỏng đến phiên bản dữ liệu 2 — định trước khi xem dữ liệu."));
ND.push(muc("10. Câu hỏi mở"));
ND.push(cau("Nếu có thêm thời gian, nhóm sẽ cải thiện gì đầu tiên?"));
ND.push(y("**Triển khai** 3 ô đồng xuất hiện vào job trộn (offline đã đạt coverage 14,5 %, NDCG còn tăng), thử 4–5 ô, mở rộng lưới (rank 100, alpha 80), rồi chạy lại A/B."));
ND.push(y("Hoàn thiện quy trình đánh giá: chạy đủ 27 tổ hợp (thêm rank 100, alpha 80) trên kỳ validation, nhiều lần chia trượt thay vì một lần. Phần kỳ validation và bootstrap theo user **đã làm ngày 11/11**, kết luận không đổi."));
ND.push(y("Cập nhật mô hình gần thời gian thực; HA cho NameNode và Kafka."));
ND.push(cau("Hệ thống này mở rộng lên dữ liệu lớn hơn 100 lần thì nghẽn ở đâu?"));
ND.push(y("RAM driver trên master (chạy mọi driver) → chuyển sang cluster mode hoặc YARN/Kubernetes."));
ND.push(y("Một broker Kafka → nhiều broker, nhiều partition; ALS: tăng `numBlocks`, bộ nhớ executor."));
ND.push(y("Phục vụ: bảng gợi ý đã Z-ORDER; với tải cao hơn, đưa gold sang kho truy vấn khóa–giá trị."));
ND.push(cau("Mô hình v2 đã được triển khai chưa? Kết quả?"));
ND.push(y("Đã triển khai, hai lần trong sáng 11/11: lượt theo lịch 02:00 (sensor thấy click thử trên web vào bronze lúc 05:22) triển khai lúc 06:07; lượt chạy tay r20261110T230924 (06:09–06:52) triển khai lại."));
ND.push(y("Lưới 10 tổ hợp = 9 tổ hợp tối thiểu + cấu hình đang phục vụ (sửa lỗi 23); tốt nhất rank 50, reg 1,0, alpha 40."));
ND.push(y("NDCG@10 0,0680 = mô hình đang phục vụ → cai_thien = true → ghi_gold MERGE, phiên bản als_v2_r20261110T230924."));
ND.push(y("v2 so với ALS thuần, cùng mô hình: NDCG@10 0,0680 → 0,0694 (+2,1 %), coverage 3,44 % → 3,72 % (+8 %); ở alpha 10 cũng +2,3 %."));
ND.push(y("Mức tăng nhỏ, chưa kiểm định ý nghĩa, không giảm popularity bias (N1 99,1 %); nhỏ hơn nhiều so với xếp lại novelty (+27 %)."));
ND.push(cau("Features phiên bản 3 cho đúng số liệu của phiên bản 0 — có phải trùng hợp?"));
ND.push(y("Không: sự kiện phát lại bị khử trùng lặp theo nội dung, sự kiện web bị loại khỏi ma trận → ma trận và mốc cắt không đổi."));
ND.push(y("ALS có seed cố định nên cho đúng mô hình cũ: thêm một bằng chứng tái lập độc lập với time travel."));
ND.push(cau("Sau khi triển khai v2 nhóm phát hiện lỗi gì?"));
ND.push(y("Lỗi 29: lúc trộn, producer đang dừng nên cửa sổ thịnh hành mới nhất chỉ có 1 sản phẩm → mọi danh sách lưu cùng 1 món thịnh hành."));
ND.push(y("Sửa: cửa sổ dưới 30 món thì bù bằng top xem 24 giờ; chạy lại tron_goi_y + ghi_gold lúc 10:15 (gold phiên bản 14), không phải huấn luyện lại."));
ND.push(y("Bảng phục vụ v2: 16.001 sản phẩm = 12,7 % item train; ô ALS có 9.237 sản phẩm (v1: 8.612) nhờ lọc giá trên 40 ứng viên đã xếp lại."));
ND.push(cau("Click trên web có đi qua cả nhánh batch không?"));
ND.push(y("Có: click đo vòng khép kín lúc 05:22 vào bronze → sensor DAG 1 thấy dữ liệu mới → train, đánh giá, triển khai v2 lúc 06:07, không ai can thiệp."));
ND.push(y("Vì vậy phép đo 51 giây diễn ra khi cụm đang tuning ALS: là số đo dưới tải batch."));

const doc = new Document({
  creator: "Le Chi Tam",
  title: "Bộ câu hỏi – đáp dự kiến khi bảo vệ đồ án",
  styles: { default: { document: { run: { font: FONT, size: 26 } } } },
  numbering: { config: [{ reference: "y", levels: [{ level: 0, format: LevelFormat.BULLET, text: "–", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 567, hanging: 283 } } } }] }] },
  sections: [{
    properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1134, bottom: 1134, left: 1701, right: 1134 } } },
    footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: 24 })] })] }) },
    children: ND,
  }],
});
const RA = path.join(__dirname, "BD03_Hoi_dap_bao_ve.docx");
Packer.toBuffer(doc).then((b) => { fs.writeFileSync(RA, b); console.log("đã ghi", RA, Math.round(b.length / 1024), "KB; số câu:", soCau); });
