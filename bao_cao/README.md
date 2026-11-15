# Báo cáo cuối kỳ

Ba bản, cùng một bộ sinh `tao_bao_cao.js`:

| Bản | Tệp | Dùng để |
|---|---|---|
| **Báo cáo chính** (tiếng Việt, theo cấu trúc C.3 của đề cương, thân bài 17 trang) | `BD03_Bao_cao_chinh.docx` / `.pdf` | **Bản nộp** |
| Báo cáo đầy đủ (tiếng Việt, 113 trang) | `BD03_Bao_cao_He_thong_goi_y.docx` / `.pdf` | Tài liệu tham khảo chi tiết đi kèm: mọi thí nghiệm, sự cố, phụ lục |
| Báo cáo tiếng Anh | `BD03_Recommender_System_Report.docx` / `.pdf` | Bản cũ (trước 15/11), chưa có các bổ sung sau kiểm tra theo đề cương |

Các ô vàng "To be completed" trong hai bản tiếng Việt chờ số liệu từ `scripts/thu_bang_chung.sh` trên cụm.

| Thư mục / tệp | Nội dung |
|---|---|
| `noi_dung_chinh/*.md` | Nội dung báo cáo chính (`node tao_bao_cao.js chinh`) |
| `noi_dung_vi/*.md` | Nội dung báo cáo đầy đủ tiếng Việt (`node tao_bao_cao.js vi`) |
| `noi_dung/*.md` | Nội dung báo cáo tiếng Anh, viết bằng một tập con Markdown (xem chú thích đầu `tao_bao_cao.js`) |
| `hinh/*.py`, `hinh/*.dot` | Mã vẽ sơ đồ kiến trúc (matplotlib, Graphviz) |
| `hinh/bieu_do.py` | Biểu đồ kết quả (tuning, baseline, phổ biến, xếp lại, Z-ORDER, A/B, RAM master) |
| `hinh/cong_thuc.py` | Công thức dưới dạng ảnh (matplotlib mathtext) |
| `tao_bao_cao.js` | Dựng `.docx` bằng docx-js: đánh số chương/hình/bảng/công thức, tham chiếu chéo `@fig:` `@tab:` `@eq:` `@sec:` |
| `cap_nhat_muc_luc.py` | Mở `.docx` bằng LibreOffice, cập nhật mục lục, danh mục hình/bảng và xuất PDF |
| `slide/` | Mã dựng 25 slide thuyết trình (tiếng Anh, có lời ghi chú cho người nói) |
| `hoi_dap/` | Bộ 49 câu hỏi – đáp dự kiến (tiếng Việt): `node tao_hoi_dap.js` |
| `kich_ban/` | Kịch bản thuyết trình 20 phút: phân công, thời lượng, lời nói từng slide, lời dẫn demo, phương án rút gọn, danh sách kiểm tra: `node tao_kich_ban.js` |

## Dựng lại

```bash
cd bao_cao/hinh
for f in f0*.py f1*.py; do python3 "$f"; done
dot -Tpng -Gdpi=220 f04_dong_du_lieu.dot -o f04_dong_du_lieu.png
dot -Tpng -Gdpi=220 f05_dag1.dot -o f05_dag1.png
# f06_dag_khac.png: vẽ riêng từng cluster của f06_dag_khac.dot rồi xếp chồng dọc bằng PIL
python3 bieu_do.py && python3 cong_thuc.py
cd ..
node tao_bao_cao.js chinh && zip -d BD03_Bao_cao_chinh.docx '*/'
python3 cap_nhat_muc_luc.py BD03_Bao_cao_chinh.docx            # tạo PDF có mục lục
node tao_bao_cao.js vi    && zip -d BD03_Bao_cao_He_thong_goi_y.docx '*/'
python3 cap_nhat_muc_luc.py BD03_Bao_cao_He_thong_goi_y.docx
```

Khi mở `.docx` trong Word, chọn **Yes** ở hộp thoại cập nhật trường để Word điền mục lục,
danh mục hình và danh mục bảng.
