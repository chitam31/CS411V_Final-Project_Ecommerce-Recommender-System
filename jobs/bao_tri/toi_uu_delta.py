"""bao_tri/toi_uu_delta.py - OPTIMIZE + ZORDER + VACUUM + xóa gợi ý cũ hơn 7 ngày (DAG 4).

VACUUM không truyền RETAIN: Delta dùng thuộc tính delta.deletedFileRetentionDuration của
từng bảng (30 ngày với bảng do job tạo, xem common/spark_utils.tao_spark), nên phiên bản
cũ phục vụ tái lập không bị xóa sớm.
"""
import argparse

from common.spark_utils import bang_ton_tai, in_ket_qua, so_tep, sql_bang, tao_spark, thu_lai_khi_xung_dot

# bảng -> cột ZORDER (None = chỉ gộp tệp nhỏ)
BANG_TOI_UU = [
    ("silver.tuong_tac", None),
    ("gold.goi_y_nguoi_dung", "ma_nguoi_dung"),
    ("gold.thinh_hanh_15p", "ma_san_pham"),
    ("gold.nhat_ky_hien_thi", None),
    ("gold.thong_ke_san_pham", None),
    ("gold.san_pham_lien_quan", "ma_san_pham"),
]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--so-ngay-giu-goi-y", type=int, default=7)
    ap.add_argument("--bo-qua-vacuum", action="store_true")
    args = ap.parse_args()

    spark = tao_spark("bd03-bao-tri-delta")
    ket_qua = {}

    # Xóa trước rồi mới gộp tệp, để OPTIMIZE không phải ghi lại dữ liệu sắp bị xóa.
    # gold.thinh_hanh_15p và gold.nhat_ky_hien_thi đang được luồng streaming MERGE liên tục:
    # mọi lệnh ghi ở đây đi qua thu_lai_khi_xung_dot để không hỏng vì xung đột ghi đồng thời.
    if bang_ton_tai(spark, "gold.goi_y_nguoi_dung"):
        thu_lai_khi_xung_dot(lambda: spark.sql(
            "DELETE FROM {} WHERE sinh_luc < current_timestamp() - INTERVAL {} DAYS".format(
                sql_bang("gold.goi_y_nguoi_dung"), int(args.so_ngay_giu_goi_y)
            )
        ))
    if bang_ton_tai(spark, "gold.thinh_hanh_15p"):
        thu_lai_khi_xung_dot(lambda: spark.sql(
            "DELETE FROM {} WHERE cua_so_ket_thuc < current_timestamp() - INTERVAL 2 DAYS".format(
                sql_bang("gold.thinh_hanh_15p")
            )
        ))

    for ten, cot_zorder in BANG_TOI_UU:
        if not bang_ton_tai(spark, ten):
            continue
        truoc = so_tep(spark, ten)
        lenh = "OPTIMIZE {}".format(sql_bang(ten))
        if cot_zorder:
            lenh += " ZORDER BY ({})".format(cot_zorder)
        thu_lai_khi_xung_dot(lambda: spark.sql(lenh))
        if not args.bo_qua_vacuum:
            spark.sql("VACUUM {}".format(sql_bang(ten)))
        ket_qua[ten] = {"so_tep_truoc": truoc, "so_tep_sau": so_tep(spark, ten), "zorder": cot_zorder}
        print("[bao_tri]", ten, ket_qua[ten], flush=True)

    in_ket_qua(ket_qua)


if __name__ == "__main__":
    main()
