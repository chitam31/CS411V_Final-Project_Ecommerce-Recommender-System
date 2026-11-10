"""bao_tri/do_zorder.py - số liệu OPTIMIZE/ZORDER trên truy vấn lấy gợi ý theo user.

Truy vấn được đo chính là truy vấn nóng của web:
    SELECT * FROM gold.goi_y_nguoi_dung WHERE ma_nguoi_dung = ?

Quy trình:
  1. (tùy chọn) --phan-manh N: viết lại bảng thành N tệp nhỏ trộn ngẫu nhiên user, mô phỏng
     trạng thái sau nhiều ngày MERGE. Ghi bằng dataChange=false nên không đổi dữ liệu.
  2. Đo: khởi động 3 truy vấn, rồi đo --so-truy-van truy vấn với các user ngẫu nhiên.
  3. OPTIMIZE ... ZORDER BY (ma_nguoi_dung).
  4. Đo lại với đúng các user đó; ghi 2 dòng vào gold.do_hieu_nang_zorder.

Kèm số tệp Spark thực sự phải đọc cho mỗi truy vấn (lấy từ metric "number of files read"
của bước quét), vì thời gian trên cụm dao động còn số tệp thì không.
"""
import argparse
import random
import statistics
import time
from datetime import datetime

from pyspark.sql import functions as F

from common import cau_hinh as ch
from common.luoc_do import tao_df
from common.spark_utils import doc_delta, ghi_delta, in_ket_qua, so_tep, sql_bang, tao_spark


def phan_vi(gia_tri, p):
    """Phân vị p (0..1) theo nội suy tuyến tính."""
    ds = sorted(gia_tri)
    if not ds:
        return None
    vt = (len(ds) - 1) * p
    duoi = int(vt)
    tren = min(duoi + 1, len(ds) - 1)
    return ds[duoi] + (ds[tren] - ds[duoi]) * (vt - duoi)


def so_tep_da_doc(df):
    """Số tệp đã đọc của lần thực thi vừa rồi, lấy từ metric của kế hoạch vật lý."""
    try:
        ke_hoach = df._jdf.queryExecution().executedPlan()
        tong = 0
        hang_doi = [ke_hoach]
        while hang_doi:
            nut = hang_doi.pop()
            metric = nut.metrics()
            if metric.contains("numFiles"):
                tong += int(metric.apply("numFiles").value())
            con = nut.children()
            for i in range(con.size()):
                hang_doi.append(con.apply(i))
            # Kế hoạch có AQE bọc bên ngoài: đi vào kế hoạch thật bên trong.
            if nut.nodeName() == "AdaptiveSparkPlan":
                hang_doi.append(nut.executedPlan())
        return tong
    except Exception:
        return None


def do_truy_van(spark, duong_dan, cac_user):
    """Trả về (danh sách ms, danh sách số tệp đã đọc)."""
    thoi_gian, so_tep_doc = [], []
    for u in cac_user:
        df = spark.read.format("delta").load(duong_dan).filter(F.col("ma_nguoi_dung") == u)
        bat_dau = time.perf_counter()
        df.collect()
        thoi_gian.append((time.perf_counter() - bat_dau) * 1000.0)
        so_tep_doc.append(so_tep_da_doc(df))
    return thoi_gian, so_tep_doc


def tong_hop(giai_doan, so_tep_bang, thoi_gian, so_tep_doc):
    """Một dòng của gold.do_hieu_nang_zorder (cộng số tệp đã đọc để in ra)."""
    doc_duoc = [x for x in so_tep_doc if x is not None]
    return {
        "thoi_diem": datetime.utcnow(),
        "giai_doan": giai_doan,
        "so_tep": so_tep_bang,
        "so_truy_van": len(thoi_gian),
        "trung_binh_ms": statistics.mean(thoi_gian),
        "trung_vi_ms": statistics.median(thoi_gian),
        "p95_ms": phan_vi(thoi_gian, 0.95),
        "tep_doc_trung_binh": float(statistics.mean(doc_duoc)) if doc_duoc else None,
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--so-truy-van", type=int, default=30)
    ap.add_argument("--phan-manh", type=int, default=0, help="Viết lại thành N tệp nhỏ trước khi đo")
    args = ap.parse_args()

    spark = tao_spark("bd03-do-zorder")
    duong_dan = ch.duong_dan("gold.goi_y_nguoi_dung")

    if args.phan_manh > 0:
        (
            doc_delta(spark, "gold.goi_y_nguoi_dung")
            .repartition(args.phan_manh)
            .write.format("delta")
            .mode("overwrite")
            .option("dataChange", "false")
            .save(duong_dan)
        )

    tat_ca = [r["ma_nguoi_dung"] for r in doc_delta(spark, "gold.goi_y_nguoi_dung").select("ma_nguoi_dung").distinct().collect()]
    cac_user = random.Random(ch.HAT_GIONG).sample(tat_ca, min(args.so_truy_van, len(tat_ca)))

    do_truy_van(spark, duong_dan, cac_user[:3])  # khởi động JVM, bộ nhớ đệm nhật ký Delta
    truoc = tong_hop("truoc_zorder", so_tep(spark, "gold.goi_y_nguoi_dung"), *do_truy_van(spark, duong_dan, cac_user))

    spark.sql("OPTIMIZE {} ZORDER BY (ma_nguoi_dung)".format(sql_bang("gold.goi_y_nguoi_dung")))

    do_truy_van(spark, duong_dan, cac_user[:3])
    sau = tong_hop("sau_zorder", so_tep(spark, "gold.goi_y_nguoi_dung"), *do_truy_van(spark, duong_dan, cac_user))

    ket_qua = {"truoc": truoc, "sau": sau, "nhanh_hon_lan": truoc["trung_vi_ms"] / max(sau["trung_vi_ms"], 1e-9)}
    # In số đo ra log TRƯỚC khi ghi bảng: lỡ ghi lỗi vẫn còn số liệu của gần 5 phút đo.
    print("So do ZORDER: " + str(ket_qua), flush=True)
    ghi_delta(tao_df(spark, "gold.do_hieu_nang_zorder", [truoc, sau]), "gold.do_hieu_nang_zorder", "append")
    in_ket_qua(ket_qua)


if __name__ == "__main__":
    main()
