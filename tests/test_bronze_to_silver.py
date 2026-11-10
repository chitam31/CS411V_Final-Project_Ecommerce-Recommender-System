"""Làm sạch bronze -> silver: lọc bot, khử trùng lặp 5 giây, gán trọng số."""
from datetime import datetime, timedelta

from transform.bronze_to_silver import gan_trong_so, khu_trung_lap, lam_sach, loc_bot

T0 = datetime(2015, 6, 1, 10, 0, 0)
COT = "ma_su_kien string, ma_nguoi_dung string, ma_san_pham string, thoi_diem timestamp, loai_su_kien string, ngay date, _nguon string"


def dong(ma, u, sp, giay, loai="xem"):
    t = T0 + timedelta(seconds=giay)
    return (ma, u, sp, t, loai, t.date(), "phat_lai")


def test_loc_bot(spark):
    bot = [dong("b{}".format(i), "bot", "sp{}".format(i % 7), i * 3) for i in range(501)]  # 501 sự kiện / 25 phút
    nguoi = [dong("n{}".format(i), "nguoi", "sp1", i * 60) for i in range(20)]
    df = spark.createDataFrame(bot + nguoi, COT)
    con_lai = {r["ma_nguoi_dung"] for r in loc_bot(df).collect()}
    assert con_lai == {"nguoi"}
    # đúng 500 sự kiện/giờ thì chưa phải bot (đề: > 500)
    df500 = spark.createDataFrame([dong("c{}".format(i), "vua", "sp1", i * 7) for i in range(500)], COT)
    assert loc_bot(df500).count() == 500


def test_khu_trung_lap_5_giay(spark):
    df = spark.createDataFrame(
        [
            dong("1", "u", "sp1", 0),
            dong("2", "u", "sp1", 3),  # trong 5 giây -> bỏ
            dong("3", "u", "sp1", 9),  # cách lần trước 6 giây -> giữ
            dong("4", "u", "sp1", 10, "them_gio"),  # khác loại -> giữ
            dong("5", "u", "sp2", 10),  # khác sản phẩm -> giữ
        ],
        COT,
    )
    assert sorted(r["ma_su_kien"] for r in khu_trung_lap(df).collect()) == ["1", "3", "4", "5"]


def test_gan_trong_so(spark):
    df = spark.createDataFrame(
        [dong("1", "u", "a", 0, "xem"), dong("2", "u", "a", 60, "them_gio"), dong("3", "u", "a", 120, "mua"),
         dong("4", "u", "a", 180, "bo_gio")],
        COT,
    )
    kq = {r["loai_su_kien"]: r["trong_so"] for r in gan_trong_so(df).collect()}
    assert kq == {"xem": 1.0, "them_gio": 3.0, "mua": 5.0}


def test_lam_sach_day_du(spark):
    df = spark.createDataFrame(
        [dong("1", "u", "a", 0), dong("1", "u", "a", 0), dong("2", "u", "a", 2), dong("3", "u", "b", 40, "mua")], COT
    )
    kq = lam_sach(df)
    assert kq.columns == ["ma_nguoi_dung", "ma_san_pham", "thoi_diem", "loai_su_kien", "trong_so", "ngay", "_nguon"]
    assert sorted((r["ma_san_pham"], r["trong_so"]) for r in kq.collect()) == [("a", 1.0), ("b", 5.0)]


def test_ghi_phan_vung_moi_ngay_mot_tep(spark, tmp_path):
    """gom_theo_phan_vung: dữ liệu rải trên nhiều task vẫn ghi đúng một tệp cho mỗi ngày."""
    import os

    from pyspark.sql import functions as F

    from common.spark_utils import gom_theo_phan_vung

    df = spark.range(3000).select(
        F.col("id"), F.expr("date_add(DATE'2015-06-01', CAST(id % 5 AS INT))").alias("ngay")
    ).repartition(8)  # mỗi task chứa đủ 5 ngày, như sau một phép shuffle bất kỳ

    def so_tep_moi_ngay(thu_muc):
        return sorted(
            len([t for t in os.listdir(os.path.join(thu_muc, d)) if t.endswith(".parquet")])
            for d in os.listdir(thu_muc) if d.startswith("ngay=")
        )

    khong_gom, co_gom = str(tmp_path / "khong_gom"), str(tmp_path / "co_gom")
    df.write.partitionBy("ngay").parquet(khong_gom)
    gom_theo_phan_vung(df, ["ngay"]).write.partitionBy("ngay").parquet(co_gom)
    assert so_tep_moi_ngay(khong_gom) == [8] * 5
    assert so_tep_moi_ngay(co_gom) == [1] * 5
    assert spark.read.parquet(co_gom).count() == 3000
