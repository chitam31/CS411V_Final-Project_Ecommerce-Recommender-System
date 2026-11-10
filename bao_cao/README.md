# Báo cáo cuối kỳ (tiếng Anh)

Bản nộp: `BD03_Recommender_System_Report.docx` (Word) và `BD03_Recommender_System_Report.pdf`.

| Thư mục / tệp | Nội dung |
|---|---|
| `noi_dung/*.md` | Nội dung báo cáo, viết bằng một tập con Markdown (xem chú thích đầu `tao_bao_cao.js`) |
| `hinh/*.py`, `hinh/*.dot` | Mã vẽ sơ đồ kiến trúc (matplotlib, Graphviz) |
| `hinh/bieu_do.py` | Biểu đồ kết quả (tuning, baseline, phổ biến, xếp lại, Z-ORDER, A/B, RAM master) |
| `hinh/cong_thuc.py` | Công thức dưới dạng ảnh (matplotlib mathtext) |
| `tao_bao_cao.js` | Dựng `.docx` bằng docx-js: đánh số chương/hình/bảng/công thức, tham chiếu chéo `@fig:` `@tab:` `@eq:` `@sec:` |
| `cap_nhat_muc_luc.py` | Mở `.docx` bằng LibreOffice, cập nhật mục lục, danh mục hình/bảng và xuất PDF |

## Dựng lại

```bash
cd bao_cao/hinh
for f in f0*.py f1*.py; do python3 "$f"; done
dot -Tpng -Gdpi=220 f04_dong_du_lieu.dot -o f04_dong_du_lieu.png
dot -Tpng -Gdpi=220 f05_dag1.dot -o f05_dag1.png
# f06_dag_khac.png: vẽ riêng từng cluster của f06_dag_khac.dot rồi xếp chồng dọc bằng PIL
python3 bieu_do.py && python3 cong_thuc.py
cd ..
node tao_bao_cao.js && zip -d BD03_Recommender_System_Report.docx '*/'
python3 cap_nhat_muc_luc.py BD03_Recommender_System_Report.docx   # tạo PDF có mục lục
```

Khi mở `.docx` trong Word, chọn **Yes** ở hộp thoại cập nhật trường để Word điền mục lục,
danh mục hình và danh mục bảng.

Các ô vàng "To be completed" là phần chờ số liệu: kết quả mô hình v2 sau lượt chạy đêm
11/11, độ trễ khối thịnh hành đo được, vòng khép kín và ảnh chụp 5 màn hình sau buổi tổng duyệt.
