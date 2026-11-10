"""ml/huan_luyen_als.py - tuning ALS implicitPrefs=True trên features, chọn theo NDCG@10.

Lưới bắt buộc: rank {10,30,50} x regParam {0.01,0.1,1.0} x alpha {1,10,40}.
  --luoi day_du    : đủ 27 tổ hợp (dùng cho báo cáo)
  --luoi toi_thieu : 9 tổ hợp, alpha cố định 10 (dùng cho DAG chạy hằng ngày)

Mỗi tổ hợp ghi một dòng vào gold.ket_qua_tuning kèm ma_chay và phien_ban_features.
Mô hình tốt nhất được lưu ở /lake/models/als/<ma_chay> để bước danh_gia dùng lại.
"""
import argparse
import itertools
from datetime import datetime

from common import cau_hinh as ch
from common.als_lib import chay_tuning, chon_tot_nhat
from common.luoc_do import tao_df
from common.spark_utils import ghi_delta, in_ket_qua, tao_spark


def to_hop_tham_so(ten_luoi):
    """Sinh danh sách tổ hợp theo thứ tự cố định (quan trọng cho tái lập)."""
    luoi = ch.LUOI_DAY_DU if ten_luoi == "day_du" else ch.LUOI_TOI_THIEU
    return [
        {"rank": r, "regParam": g, "alpha": a}
        for r, g, a in itertools.product(luoi["rank"], luoi["regParam"], luoi["alpha"])
    ]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--ma-chay", default=None)
    ap.add_argument("--phien-ban", type=int, default=None, help="Phiên bản features; mặc định mới nhất")
    ap.add_argument("--luoi", choices=["day_du", "toi_thieu"], default="day_du")
    ap.add_argument("--max-iter", type=int, default=10)
    ap.add_argument("--so-khoi", type=int, default=None, help="numBlocks của ALS (chống OOM)")
    args = ap.parse_args()

    ma_chay = args.ma_chay or datetime.utcnow().strftime("r%Y%m%dT%H%M%S")
    spark = tao_spark("bd03-huan-luyen-als")
    cac_to_hop = to_hop_tham_so(args.luoi)
    dong, phien_ban = chay_tuning(
        spark,
        args.phien_ban,
        cac_to_hop,
        args.max_iter,
        ch.HAT_GIONG,
        args.so_khoi,
        luu_mo_hinh_vao=ch.duong_dan_mo_hinh("als/" + ma_chay),
    )
    for d in dong:
        d["ma_chay"] = ma_chay
        d["phien_ban_features"] = phien_ban
    ghi_delta(
        tao_df(spark, "gold.ket_qua_tuning", dong),
        "gold.ket_qua_tuning",
        "append",
        ghi_chu={"ma_chay": ma_chay, "max_iter": args.max_iter, "luoi": args.luoi, "so_khoi": args.so_khoi},
    )

    tot = chon_tot_nhat(dong)
    in_ket_qua(
        {
            "ma_chay": ma_chay,
            "phien_ban_features": phien_ban,
            "so_to_hop": len(dong),
            "max_iter": args.max_iter,
            "tot_nhat": {k: tot[k] for k in ("rank", "reg_param", "alpha", "ndcg_at_10", "coverage")},
        }
    )


if __name__ == "__main__":
    main()
