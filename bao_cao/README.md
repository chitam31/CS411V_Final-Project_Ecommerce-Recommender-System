# Báo cáo cuối kỳ

Báo cáo và slide có hai ngôn ngữ, cùng số liệu; báo cáo dựng bằng `tao_bao_cao.js`, slide bằng `slide/gen.py` (tiếng Anh) và `slide/gen_vi.py` (tiếng Việt):

| Bản | Tệp | Dùng để |
|---|---|---|
| **Báo cáo chính, tiếng Việt** (cấu trúc C.3, thân bài 29 trang, tổng 34 trang) | `CS411V_REPORT Final Project_Group Chí Tâm & Quốc Anh_Viet.pdf`| **Bản nộp** |
| Báo cáo chính, tiếng Anh (dịch đầy đủ bản trên, cùng bố cục và số trang) | `CS411V_REPORT Final Project_Group Chí Tâm & Quốc Anh_Eng.pdf` | Bản tiếng Anh của bản nộp |


Hình và biểu đồ ghi nhãn tiếng Anh, dùng chung cho hai ngôn ngữ (chú thích hình theo ngôn ngữ của bản); riêng `c08_eda`, `c09_phan_tich_loi` có hai bản nhãn (`*_en` cho bản tiếng Anh).


## Dựng lại

```bash
cd bao_cao/hinh
for f in f0*.py f1*.py; do python3 "$f"; done
dot -Tpng -Gdpi=220 f04_dong_du_lieu.dot -o f04_dong_du_lieu.png
dot -Tpng -Gdpi=220 f05_dag1.dot -o f05_dag1.png
# f06_dag_khac.png: vẽ riêng từng cluster của f06_dag_khac.dot rồi xếp chồng dọc bằng PIL
python3 bieu_do.py && python3 bieu_do_cum.py && python3 cong_thuc.py
cd ..
node tao_bao_cao.js chinh && zip -d BD03_Bao_cao_chinh.docx '*/'
python3 cap_nhat_muc_luc.py BD03_Bao_cao_chinh.docx            # tạo PDF có mục lục
node tao_bao_cao.js chinh en && zip -d BD03_Main_Report_EN.docx '*/'
python3 cap_nhat_muc_luc.py BD03_Main_Report_EN.docx
node tao_bao_cao.js vi    && zip -d BD03_Bao_cao_He_thong_goi_y.docx '*/'
python3 cap_nhat_muc_luc.py BD03_Bao_cao_He_thong_goi_y.docx
```

Khi mở `.docx` trong Word, chọn **Yes** ở hộp thoại cập nhật trường để Word điền mục lục,
danh mục hình và danh mục bảng.
