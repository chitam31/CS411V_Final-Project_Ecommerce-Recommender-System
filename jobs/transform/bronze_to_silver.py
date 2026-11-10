"""transform/bronze_to_silver.py - khử trùng lặp, lọc bot, gán trọng số.

Xử lý tăng dần theo ngày: chỉ tính lại những phân vùng ngày có dữ liệu mới, và ghi đè
đúng các phân vùng đó bằng replaceWhere. Chạy lại bao nhiêu lần cũng ra cùng kết quả,
nên Airflow có thể retry an toàn. Mốc đã xử lý lưu ở userMetadata của commit Delta.
"""
import argparse

from pyspark.sql import Window
from pyspark.sql import functions as F

from common import cau_hinh as ch
from common.spark_utils import (
    bang_ton_tai,
    doc_bronze,
    doc_delta,
    doc_ghi_chu_gan_nhat,
    ghi_delta,
    in_ket_qua,
    phien_ban_moi_nhat,
    tao_spark,
)


def loc_bot(df, nguong=ch.NGUONG_BOT_MOI_GIO):
    """User có ít nhất một giờ vượt ngưỡng bị coi là bot và loại toàn bộ."""
    bot = (
        df.groupBy("ma_nguoi_dung", F.date_trunc("hour", "thoi_diem").alias("gio"))
        .count()
        .filter(F.col("count") > nguong)
        .select("ma_nguoi_dung")
        .distinct()
    )
    return df.join(bot, "ma_nguoi_dung", "left_anti")


COT_NOI_DUNG = ["ma_nguoi_dung", "ma_san_pham", "loai_su_kien", "thoi_diem"]


def bo_ban_sao_noi_dung(df):
    """Bỏ các dòng trùng cả user, item, loại lẫn thời điểm (tới mili giây).

    ma_su_kien băm cả offset Kafka, nên khi bộ phát chạy lại một đoạn dữ liệu đã phát, cùng
    một sự kiện gốc mang ma_su_kien mới và lọt qua bước bỏ trùng theo ma_su_kien. Phải bỏ
    chúng TRƯỚC khi lọc bot: nếu không, số sự kiện mỗi giờ của user bị nhân đôi và user
    thật có 251-500 sự kiện/giờ bị coi nhầm là bot. Hai sự kiện thật trùng tới mili giây
    vốn cũng bị khu_trung_lap bỏ (cách nhau 0 giây), nên bước này không bỏ thêm dữ liệu thật.
    """
    return df.dropDuplicates(COT_NOI_DUNG)


def khu_trung_lap(df, so_giay=ch.GIAY_KHU_TRUNG):
    """Bỏ sự kiện cùng user - item - loại xảy ra trong vòng so_giay so với lần trước đó."""
    cua_so = Window.partitionBy("ma_nguoi_dung", "ma_san_pham", "loai_su_kien").orderBy("thoi_diem")
    khoang = F.col("thoi_diem").cast("double") - F.lag("thoi_diem").over(cua_so).cast("double")
    return (
        df.withColumn("_khoang", khoang)
        .filter(F.col("_khoang").isNull() | (F.col("_khoang") > so_giay))
        .drop("_khoang")
    )


def gan_trong_so(df):
    """xem=1, them_gio=3, mua=5; bo_gio không phải tín hiệu quan tâm nên bị loại."""
    bieu_thuc = F.lit(None).cast("double")
    for loai, trong_so in ch.TRONG_SO.items():
        bieu_thuc = F.when(F.col("loai_su_kien") == loai, F.lit(trong_so)).otherwise(bieu_thuc)
    return df.withColumn("trong_so", bieu_thuc).filter(F.col("trong_so").isNotNull())


def lam_sach(bronze):
    """Chuỗi làm sạch đầy đủ từ bronze ra lược đồ silver."""
    df = bo_ban_sao_noi_dung(bronze.dropDuplicates(["ma_su_kien"]))
    df = gan_trong_so(khu_trung_lap(loc_bot(df)))
    return df.select(
        "ma_nguoi_dung", "ma_san_pham", "thoi_diem", "loai_su_kien", "trong_so", "ngay", "_nguon"
    )


def chon_ngay_can_xu_ly(spark, bronze, toan_bo):
    """Trả về danh sách ngày cần tính lại và mốc _ingest_ts mới."""
    moc_moi = bronze.agg(F.max("_ingest_ts")).first()[0]
    ghi_chu = None
    if bang_ton_tai(spark, "silver.tuong_tac") and not toan_bo:
        ghi_chu = doc_ghi_chu_gan_nhat(spark, "silver.tuong_tac", "moc_ingest")
    if ghi_chu and ghi_chu.get("moc_ingest"):
        moi = bronze.filter(F.col("_ingest_ts") > F.lit(ghi_chu["moc_ingest"]).cast("timestamp"))
    else:
        moi = bronze
    return sorted(r["ngay"] for r in moi.select("ngay").distinct().collect()), moc_moi


def them_cot_tien_hoa(spark, silver_moi):
    """Sau khi schema evolution chạy (tuần 5), dòng mới cũng phải có giá và sao."""
    if not bang_ton_tai(spark, "silver.tuong_tac"):
        return silver_moi
    cot_hien_co = doc_delta(spark, "silver.tuong_tac").columns
    if "gia_san_pham" not in cot_hien_co or not bang_ton_tai(spark, "silver.san_pham"):
        return silver_moi
    san_pham = doc_delta(spark, "silver.san_pham")
    cot = [c for c in ("gia_san_pham", "xep_hang_sao") if c in san_pham.columns]
    return silver_moi.join(san_pham.select("ma_san_pham", *cot), "ma_san_pham", "left")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--toan-bo", action="store_true", help="Bỏ qua mốc, tính lại mọi ngày")
    args = ap.parse_args()

    spark = tao_spark("bd03-bronze-to-silver")
    bronze = doc_bronze(spark).cache()
    cac_ngay, moc_moi = chon_ngay_can_xu_ly(spark, bronze, args.toan_bo)
    if not cac_ngay:
        in_ket_qua({"so_ngay": 0, "so_dong": 0, "ghi_chu": "khong co du lieu moi"})
        return

    silver_moi = lam_sach(bronze.filter(F.col("ngay").isin(cac_ngay)))
    silver_moi = them_cot_tien_hoa(spark, silver_moi).cache()
    so_dong = silver_moi.count()
    ghi_chu = {"moc_ingest": str(moc_moi)}

    if bang_ton_tai(spark, "silver.tuong_tac") and not args.toan_bo:
        danh_sach = ",".join("'{}'".format(n) for n in cac_ngay)
        ghi_delta(
            silver_moi,
            "silver.tuong_tac",
            "overwrite",
            ghi_chu=ghi_chu,
            tuy_chon={"replaceWhere": "ngay IN ({})".format(danh_sach)},
        )
    else:
        ghi_delta(silver_moi, "silver.tuong_tac", "overwrite", phan_vung=["ngay"], ghi_chu=ghi_chu)

    in_ket_qua(
        {
            "so_ngay": len(cac_ngay),
            "so_dong": so_dong,
            "phien_ban_silver": phien_ban_moi_nhat(spark, "silver.tuong_tac"),
        }
    )


if __name__ == "__main__":
    main()
