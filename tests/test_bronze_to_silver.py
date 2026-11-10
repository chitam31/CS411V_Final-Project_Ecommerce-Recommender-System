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
