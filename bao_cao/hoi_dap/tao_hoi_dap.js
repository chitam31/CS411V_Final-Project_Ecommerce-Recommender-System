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
ND.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 240 }, children: [new TextRun({ text: "Lê Chí Tâm (2302220) · Lê Nguyễn Quốc Anh (2302283) · Bảo vệ ngày 18/11/2026", font: FONT, size: 26 })] }));

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
  ["A/B", "350.160 impression mô phỏng; CTR A 2,094 % – B 1,978 %, z = −2,43, p = 0,015; chuyển đổi p = 0,75; cần 76.972/nhóm"],
  ["Z-ORDER", "Tệp đọc mỗi truy vấn 67 → 1,07; trung vị 8.280 → 980 ms (nhanh 8,4 lần so với chỉ OPTIMIZE)"],
  ["Tái lập", "Độ lệch 0,000000 trên features phiên bản 0 (1,78·10⁻¹⁵ khi không làm tròn)"],
  ["Vòng khép kín", "Kafka → bronze 10,3 giây; bấm → bảng thịnh hành 51 giây (ngưỡng 90 giây)"],
  ["Mô hình v2", "Cùng siêu tham số (alpha 10): NDCG@10 0,0574 → 0,0587 (+2,3 %), coverage 2,49 % → 2,70 %; [số liệu triển khai v2 điền sau]"],
  ["Cụm", "6 máy lab, mỗi máy 12 lõi, 7 GB RAM; 5 worker: 34 lõi, 13 GB executor; HDFS sao chép 2; 28 lỗi đã sửa, 90 kiểm thử"],
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
ND.push(y("Thừa nhận: chọn trên tháng test làm số liệu **hơi lạc quan**; báo cáo đã ghi rõ (mục 1.3, 6.2)."));
ND.push(y("Mã đã có tùy chọn tách tháng cuối thành nửa validation và nửa test; cách so sánh với baseline vẫn công bằng vì baseline không có siêu tham số."));
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
ND.push(y("Danh sách đang phục vụ (gồm thịnh hành, danh mục, ALS) phủ 15.582 sản phẩm = **12,3 %** item trong train."));
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
ND.push(cau("Vì sao từng ngày đều không có ý nghĩa mà gộp lại thì có?"));
ND.push(y("Mỗi ngày chỉ khoảng 25.000 impression/nhóm, thấp hơn nhiều cỡ mẫu cần; phân tích chính được **định trước** là gộp 7 ngày."));
ND.push(y("Kết luận theo từng ngày là “peeking” và kiểm định bội; dù vậy B thấp hơn A cả 7/7 ngày, nhất quán với kết quả gộp."));
ND.push(cau("Hạn chế của thí nghiệm?"));
ND.push(y("Impression của cùng user tương quan → p-value có thể bị đánh giá thấp; nên bootstrap theo user."));
ND.push(y("Kết luận chỉ đúng với giả định mô phỏng (thịnh hành không được cộng điểm hấp dẫn); cần phân tích độ nhạy."));
ND.push(cau("Change Data Feed được dùng ở đâu?"));
ND.push(y("DAG `kn_tinh_ab` đọc `table_changes` của nhật ký hiển thị từ phiên bản đã xử lý → chỉ tính lại những ngày bị ảnh hưởng."));

ND.push(muc("8. Delta Lake"));
ND.push(cau("Tái lập thí nghiệm bằng time travel hoạt động thế nào?"));
ND.push(y("Mỗi lần huấn luyện ghi **phiên bản Delta** của bảng features; DAG 5 đọc `VERSION AS OF` phiên bản đó, huấn luyện lại, so với số liệu đã ghi."));
ND.push(y("Kết quả trùng khớp nhờ: seed cố định, **indexer chỉ thêm** (chỉ số luôn chỉ đúng user/item), tập test lưu cùng phiên bản."));
ND.push(y("Độ lệch 0,000000 dù silver đã tiến hóa lược đồ và đã nhận thêm 857.072 sự kiện."));
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

ND.push(muc("10. Câu hỏi mở"));
ND.push(cau("Nếu có thêm thời gian, nhóm sẽ cải thiện gì đầu tiên?"));
ND.push(y("Thêm nguồn ứng viên ngoài ALS (item-to-item, danh mục) trước khi xếp lại → mục tiêu coverage 10 %."));
ND.push(y("Quy trình đánh giá chặt hơn: kỳ validation riêng, bootstrap theo user cho A/B."));
ND.push(y("Cập nhật mô hình gần thời gian thực; HA cho NameNode và Kafka."));
ND.push(cau("Hệ thống này mở rộng lên dữ liệu lớn hơn 100 lần thì nghẽn ở đâu?"));
ND.push(y("RAM driver trên master (chạy mọi driver) → chuyển sang cluster mode hoặc YARN/Kubernetes."));
ND.push(y("Một broker Kafka → nhiều broker, nhiều partition; ALS: tăng `numBlocks`, bộ nhớ executor."));
ND.push(y("Phục vụ: bảng gợi ý đã Z-ORDER; với tải cao hơn, đưa gold sang kho truy vấn khóa–giá trị."));
ND.push(cau("Mô hình v2 đã được triển khai chưa? Kết quả?"));
ND.push(y("[Điền sau lượt chạy tay ngày 11/11: NDCG@10, coverage của v2 ở alpha 40 và nhánh DAG đã chạy.]"));
ND.push(y("Ở cùng siêu tham số, v2 tốt hơn v1 mọi chỉ số: NDCG@10 +2,3 %, coverage 2,49 % → 2,70 %."));

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
