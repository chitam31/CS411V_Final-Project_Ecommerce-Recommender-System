"""Đọc bảng Delta cho web bằng một phiên Spark cục bộ chạy ngay trong tiến trình web.

Vì sao dùng Spark: Delta Lake là thư viện chạy bên trong Spark (giáo trình CS411, mục 6.1),
và truy vấn "lấy gợi ý theo user" của web chính là truy vấn được đo OPTIMIZE/ZORDER.
Spark chạy local[2] trong container web, đọc HDFS của cụm qua ZeroTier.

Mỗi truy vấn Spark mất cỡ vài trăm mili-giây, nên kết quả được giữ đệm ngắn hạn:
thịnh hành 10 giây, gợi ý theo user 30 giây, danh mục sản phẩm 1 giờ.
"""
import json
import logging
import threading
import time
from collections import OrderedDict
from datetime import datetime

from common.ab import tong_hop_ab
from common.tron import NGUON_DANH_MUC, NGUON_THINH_HANH

nhat_ky = logging.getLogger("web.kho")


class BoDem:
    """Bộ đệm có hạn sống (TTL) và giới hạn số khóa (LRU)."""

    def __init__(self, giay, toi_da=2000):
        self.giay = giay
        self.toi_da = toi_da
        self._du_lieu = OrderedDict()
        self._khoa = threading.Lock()

    def lay(self, khoa, ham_tinh):
        bay_gio = time.time()
        with self._khoa:
            if khoa in self._du_lieu and bay_gio - self._du_lieu[khoa][0] < self.giay:
                self._du_lieu.move_to_end(khoa)
                return self._du_lieu[khoa][1]
        gia_tri = ham_tinh()
        with self._khoa:
            self._du_lieu[khoa] = (bay_gio, gia_tri)
            while len(self._du_lieu) > self.toi_da:
                self._du_lieu.popitem(last=False)
        return gia_tri

    def xoa(self):
        with self._khoa:
            self._du_lieu.clear()


def _sang_json(gia_tri):
    """Đổi Row/datetime sang kiểu JSON được."""
    if isinstance(gia_tri, datetime):
        return gia_tri.isoformat(sep=" ", timespec="seconds")
    if hasattr(gia_tri, "isoformat"):
        return gia_tri.isoformat()
    return gia_tri


def _dong(r):
    return {k: _sang_json(v) for k, v in r.asDict().items()}


class KhoDelta:
    """Truy cập dữ liệu thật trên HDFS qua Spark + Delta."""

    def __init__(self):
        self._spark = None
        self._khoa = threading.Lock()
        self.dem_thinh_hanh = BoDem(10, 4)
        self.dem_goi_y = BoDem(30, 5000)
        self.dem_lien_quan = BoDem(600, 5000)
        self.dem_bang_nho = BoDem(60, 50)
        self.dem_lon = BoDem(3600, 4)

    # ---------------------------------------------------------------- Spark
    @property
    def spark(self):
        with self._khoa:
            if self._spark is None:
                from common.spark_utils import tao_spark

                self._spark = tao_spark(
                    "bd03-web",
                    {
                        "spark.master": "local[2]",
                        "spark.driver.memory": "1g",
                        "spark.ui.enabled": "false",
                        "spark.sql.shuffle.partitions": "4",
                        "spark.hadoop.dfs.client.use.datanode.hostname": "true",
                    },
                )
            return self._spark

    def _doc(self, ten_bang, phien_ban=None):
        from common.spark_utils import doc_delta

        return doc_delta(self.spark, ten_bang, phien_ban)

    def _co_bang(self, ten_bang):
        from common.spark_utils import bang_ton_tai

        return self.dem_bang_nho.lay(("co", ten_bang), lambda: bang_ton_tai(self.spark, ten_bang))

    # ---------------------------------------------------------------- gợi ý
    def goi_y_cua(self, ma_nguoi_dung):
        """Truy vấn nóng: đúng truy vấn mà bao_tri/do_zorder.py đo trước/sau ZORDER."""
        from pyspark.sql import functions as F

        def tinh():
            if not self._co_bang("gold.goi_y_nguoi_dung"):
                return []
            dong = (
                self._doc("gold.goi_y_nguoi_dung")
                .filter(F.col("ma_nguoi_dung") == str(ma_nguoi_dung))
                .orderBy("xep_hang")
                .collect()
            )
            return [_dong(r) for r in dong]

        return self.dem_goi_y.lay(str(ma_nguoi_dung), tinh)

    def thinh_hanh(self, n=10):
        from pyspark.sql import functions as F

        def tinh():
            if not self._co_bang("gold.thinh_hanh_15p"):
                return []
            th = self._doc("gold.thinh_hanh_15p")
            moi_nhat = th.agg(F.max("cua_so_ket_thuc")).first()[0]
            if moi_nhat is None:
                return []
            dong = (
                th.filter(F.col("cua_so_ket_thuc") == F.lit(moi_nhat))
                .orderBy(F.desc("diem_thinh_hanh"), "ma_san_pham")
                .limit(50)
                .collect()
            )
            return [
                dict(_dong(r), diem_du_doan=float(r["diem_thinh_hanh"]), nguon=NGUON_THINH_HANH) for r in dong
            ]

        return self.dem_thinh_hanh.lay("top", tinh)[:n]

    def thinh_hanh_san_pham(self, ma_san_pham):
        """Dòng thịnh hành mới nhất của một sản phẩm (để đo độ trễ vòng khép kín). Không đệm."""
        from pyspark.sql import functions as F

        if not self._co_bang("gold.thinh_hanh_15p"):
            return None
        r = (
            self._doc("gold.thinh_hanh_15p")
            .filter(F.col("ma_san_pham") == str(ma_san_pham))
            .orderBy(F.desc("cua_so_ket_thuc"))
            .first()
        )
        return _dong(r) if r else None

    # ---------------------------------------------------------------- sản phẩm
    def _danh_muc_san_pham(self):
        def tinh():
            if not self._co_bang("silver.san_pham"):
                return {}
            cot = self._doc("silver.san_pham").columns
            chon = [c for c in ("ma_san_pham", "ma_danh_muc", "gia_san_pham", "con_hang", "xep_hang_sao") if c in cot]
            return {r["ma_san_pham"]: _dong(r) for r in self._doc("silver.san_pham").select(*chon).collect()}

        return self.dem_lon.lay("san_pham", tinh)

    def san_pham(self, ma_san_pham):
        return self._danh_muc_san_pham().get(str(ma_san_pham), {"ma_san_pham": str(ma_san_pham)})

    def _ban_chay_tat_ca(self):
        from pyspark.sql import Window
        from pyspark.sql import functions as F

        def tinh():
            if not self._co_bang("gold.thong_ke_san_pham"):
                return {}
            dong = (
                self._doc("gold.thong_ke_san_pham")
                .filter(F.col("ma_danh_muc").isNotNull())
                .withColumn(
                    "h",
                    F.row_number().over(Window.partitionBy("ma_danh_muc").orderBy(F.desc("diem_pho_bien"), "ma_san_pham")),
                )
                .filter(F.col("h") <= 20)
                .select("ma_danh_muc", "h", "ma_san_pham", "diem_pho_bien")
                .collect()
            )
            theo_dm = {}
            for r in sorted(dong, key=lambda x: (x["ma_danh_muc"], x["h"])):
                theo_dm.setdefault(r["ma_danh_muc"], []).append(
                    {"ma_san_pham": r["ma_san_pham"], "diem_du_doan": float(r["diem_pho_bien"] or 0), "nguon": NGUON_DANH_MUC}
                )
            return theo_dm

        return self.dem_lon.lay("ban_chay", tinh)

    def ban_chay_danh_muc(self, ma_danh_muc, n=20):
        return self._ban_chay_tat_ca().get(str(ma_danh_muc), [])[:n]

    def lien_quan(self, ma_san_pham, n=10):
        from pyspark.sql import functions as F

        def tinh():
            if not self._co_bang("gold.san_pham_lien_quan"):
                return []
            dong = (
                self._doc("gold.san_pham_lien_quan")
                .filter(F.col("ma_san_pham") == str(ma_san_pham))
                .orderBy("xep_hang")
                .collect()
            )
            return [
                {"ma_san_pham": r["ma_san_pham_lien_quan"], "diem_du_doan": float(r["do_lien_quan"]), "nguon": "dong_xuat_hien"}
                for r in dong
            ]

        ds = self.dem_lien_quan.lay(str(ma_san_pham), tinh)
        if not ds:
            # Thiếu dữ liệu đồng xuất hiện: lấy bán chạy cùng danh mục.
            dm = self.san_pham(ma_san_pham).get("ma_danh_muc")
            ds = [g for g in self.ban_chay_danh_muc(dm) if g["ma_san_pham"] != str(ma_san_pham)] if dm else []
        return ds[:n]

    def nguoi_dung_mau(self, n=12):
        """Danh sách user cho dropdown: một nửa có ALS, một nửa ít tương tác."""
        from pyspark.sql import functions as F

        def tinh():
            if not self._co_bang("gold.goi_y_nguoi_dung"):
                return []
            df = self._doc("gold.goi_y_nguoi_dung").filter(F.col("xep_hang") == 1)
            ket_qua = []
            for nguon, ten in (("als", "als"), (NGUON_DANH_MUC, "it_tuong_tac")):
                dong = (
                    df.filter(F.col("nguon") == nguon)
                    .select("ma_nguoi_dung")
                    .orderBy(F.md5("ma_nguoi_dung"))
                    .limit(n // 2)
                    .collect()
                )
                ket_qua += [{"ma_nguoi_dung": r["ma_nguoi_dung"], "chien_luoc": ten} for r in dong]
            return ket_qua

        return self.dem_bang_nho.lay(("mau", n), tinh)

    # ---------------------------------------------------------------- báo cáo
    def _bang_nho(self, ten_bang, sap_xep=None, loc=None):
        def tinh():
            if not self._co_bang(ten_bang):
                return []
            df = self._doc(ten_bang)
            if loc is not None:
                df = df.filter(loc)
            if sap_xep:
                df = df.orderBy(*sap_xep)
            return [_dong(r) for r in df.collect()]

        return self.dem_bang_nho.lay((ten_bang, str(sap_xep), str(loc)), tinh)

    def ket_qua_ab(self):
        return self._bang_nho("gold.ket_qua_ab", ["ngay", "nhom_ab"])

    def lich_su_mo_hinh(self):
        ds = self._bang_nho("gold.lich_su_huan_luyen", ["thoi_diem"])
        for d in ds:
            d["chi_tiet"] = json.loads(d.pop("chi_tiet_json") or "{}")
        return ds

    def tuning(self, ma_chay):
        from pyspark.sql import functions as F

        return self._bang_nho("gold.ket_qua_tuning", ["rank", "reg_param", "alpha"], F.col("ma_chay") == ma_chay)

    def ket_qua_tai_lap(self):
        return self._bang_nho("gold.ket_qua_tai_lap", ["thoi_diem"])

    def do_zorder(self):
        return self._bang_nho("gold.do_hieu_nang_zorder", ["thoi_diem"])

    def tai_lap_ab(self, ngay):
        """Chạy lại A/B của một ngày trên đúng phiên bản Delta đã ghi, so với kết quả cũ."""
        from pyspark.sql import functions as F

        cu = [
            _dong(r)
            for r in self._doc("gold.ket_qua_ab").filter(F.col("ngay") == F.lit(ngay)).orderBy("nhom_ab").collect()
        ]
        if not cu:
            return None
        phien_ban = int(cu[0]["phien_ban_delta_du_lieu"])
        bat_dau = time.time()
        moi = tong_hop_ab(self._doc("gold.nhat_ky_hien_thi", phien_ban), [datetime.strptime(ngay, "%Y-%m-%d").date()])
        moi = [{k: _sang_json(v) for k, v in d.items()} for d in moi]
        hien_tai = [
            {k: _sang_json(v) for k, v in d.items()}
            for d in tong_hop_ab(self._doc("gold.nhat_ky_hien_thi"), [datetime.strptime(ngay, "%Y-%m-%d").date()])
        ]
        return {
            "ngay": ngay,
            "phien_ban_delta_du_lieu": phien_ban,
            "cu": cu,
            "moi": moi,
            "phien_ban_hien_tai": hien_tai,
            "so_giay": round(time.time() - bat_dau, 2),
        }

    def xoa_bo_dem(self):
        for bd in (self.dem_thinh_hanh, self.dem_goi_y, self.dem_lien_quan, self.dem_bang_nho, self.dem_lon):
            bd.xoa()


def lay_kho(che_do):
    """che_do = 'delta' (mặc định, đọc cụm thật) hoặc 'gia' (dữ liệu giả lập, không cần cụm)."""
    if che_do == "gia":
        from .kho_gia import KhoGia

        return KhoGia()
    return KhoDelta()


__all__ = ["KhoDelta", "BoDem", "lay_kho"]
