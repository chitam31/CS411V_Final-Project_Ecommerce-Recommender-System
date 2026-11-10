#!/usr/bin/env bash
# chay_lan_dau.sh - chạy tay toàn bộ pipeline lần đầu trên cụm (máy master), theo đúng thứ tự
# mà DAG kn_pipeline_hang_ngay sẽ chạy hằng đêm. Dùng để có dữ liệu demo trước buổi bảo vệ.
#
#   bash scripts/chay_lan_dau.sh            # đủ 27 tổ hợp tuning
#   LUOI=toi_thieu bash scripts/chay_lan_dau.sh
set -euo pipefail
THU_MUC="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
S="bash $THU_MUC/ha_tang/spark/submit.sh"
LUOI="${LUOI:-day_du}"
MA_CHAY="r$(date -u +%Y%m%dT%H%M%S)"
buoc() { echo; echo "=================== $* ==================="; }

buoc "1. Tạo thư mục HDFS và bảng Delta"
docker exec hadoop-master hdfs dfsadmin -safemode wait
docker exec hadoop-master hdfs dfs -mkdir -p /lake/landing/retailrocket /lake/models /lake/checkpoints
# Kiểm tra đầu vào trước, để không chạy nửa chừng mới báo thiếu tệp.
for t in events.csv item_properties_part1.csv item_properties_part2.csv category_tree.csv; do
  docker exec hadoop-master hdfs dfs -test -e "/lake/landing/retailrocket/$t" || {
    echo "Thiếu /lake/landing/retailrocket/$t trên HDFS: chạy bash scripts/tai_du_lieu.sh <thư mục CSV> trước." >&2
    exit 1
  }
done
$S nhanh kiem_tra/khoi_tao_bang.py

buoc "2. Danh mục sản phẩm -> silver.san_pham"
$S lo transform/nhap_danh_muc.py

buoc "3. Kafka -> bronze (xử lý hết dữ liệu đang có trong topic rồi dừng)"
$S nap streaming/nap_su_kien.py --mot-lan

buoc "4. bronze -> silver -> thống kê, sản phẩm liên quan"
$S lo transform/bronze_to_silver.py
$S lo transform/thong_ke_san_pham.py
$S lo ml/san_pham_lien_quan.py

buoc "5. Ma trận, tuning ($LUOI), đánh giá  [ma_chay=$MA_CHAY]"
$S lo ml/chuan_bi_ma_tran.py
$S als ml/huan_luyen_als.py --ma-chay "$MA_CHAY" --luoi "$LUOI"
$S als ml/danh_gia.py --ma-chay "$MA_CHAY"

buoc "6. Sinh gợi ý, trộn, ghi gold"
$S als ml/sinh_goi_y_toan_bo.py --ma-chay "$MA_CHAY"
$S lo ml/tron_goi_y.py --ma-chay "$MA_CHAY"
$S lo ml/ghi_gold.py --ma-chay "$MA_CHAY"

buoc "7. Traffic mô phỏng cho A/B rồi tính kết quả A/B"
$S lo transform/mo_phong_hien_thi.py --so-nguoi 5000
$S lo transform/tinh_ket_qua_ab.py

buoc "8. Số liệu OPTIMIZE/ZORDER (phân mảnh 200 tệp để mô phỏng nhiều ngày MERGE)"
$S bao_tri bao_tri/do_zorder.py --phan-manh 200 --so-truy-van 30

echo; echo "Xong. ma_chay=$MA_CHAY. Bật 3 luồng: bash scripts/luong.sh khoi_dong tat_ca"
