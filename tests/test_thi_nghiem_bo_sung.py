"""Thí nghiệm bổ sung 11/11/2026: kỳ validation riêng cho tuning và kiểm định A/B theo user."""
import itertools
from datetime import date, datetime, timedelta

import pytest

from common import cau_hinh as ch
from common.als_lib import (
    chi_so_xep_hang,
    chia_ky_validation,
    danh_chi_so_bang_indexer_da_luu,
    thuc_te_tu_su_kien,
    tinh_chi_so,
)
from common.thong_ke import ztest_hai_ty_le
from kiem_tra.bootstrap_ab import phan_tich, theo_user
from kiem_tra.tuning_validation import chon_theo, luoi_day_du
from ml.chuan_bi_ma_tran import dung_ma_tran

SILVER = "ma_nguoi_dung string, ma_san_pham string, thoi_diem timestamp, loai_su_kien string, trong_so double, ngay date, _nguon string"
NHAT_KY = """ma_hien_thi string, ma_nguoi_dung string, nhom_ab string, vi_tri int, ma_san_pham string,
    thoi_diem_hien_thi timestamp, da_click boolean, da_mua boolean, nguon_traffic string, chien_luoc string"""


@pytest.fixture
def lake_tam(tmp_path, monkeypatch):
    monkeypatch.setattr(ch, "LAKE_GOC", "file://" + str(tmp_path / "lake"))
    return tmp_path


def test_chia_ky_validation_theo_ngay(spark):
    d0 = date(2015, 8, 19)
    df = spark.createDataFrame([(i, d0 + timedelta(days=i)) for i in range(30)], "i int, ngay date")
    val, kt = chia_ky_validation(df, str(d0), 15)
    assert sorted(r["i"] for r in val.collect()) == list(range(15))
    assert sorted(r["i"] for r in kt.collect()) == list(range(15, 30))


def test_thuc_te_chi_giu_user_va_item_cua_train(spark):
    train = spark.createDataFrame([(1, 10, 1.0), (1, 11, 1.0), (2, 12, 1.0)], "user_idx int, item_idx int, diem double")
    su_kien = spark.createDataFrame([(1, 11), (1, 10), (1, 10), (1, 99), (3, 10), (2, 12)], "user_idx int, item_idx int")
    kq = {r["user_idx"]: list(r["thuc_te"]) for r in thuc_te_tu_su_kien(su_kien, train).collect()}
    assert kq == {1: [10, 11], 2: [12]}   # item 99 và user 3 không có trong train -> bỏ


def test_chi_so_xep_hang_trung_tinh_chi_so(spark):
    tt = spark.createDataFrame([(1, [3, 4]), (2, [9]), (3, [1])], "user_idx int, thuc_te array<int>")
    ds = spark.createDataFrame([(1, [4, 1, 3]), (2, [1, 2])], "user_idx int, ds array<int>")
    pb = spark.createDataFrame([(i, i, float(i)) for i in range(1, 10)], "item_idx int, so_nguoi long, tong_diem double")
    day_du = tinh_chi_so(ds, tt, pb, 9, 10)
    gon = chi_so_xep_hang(ds, tt, 10)
    for khoa in ("precision_at_10", "recall_at_10", "ndcg_at_10", "map_at_10", "so_nguoi_danh_gia"):
        assert gon[khoa] == pytest.approx(day_du[khoa])
    assert gon["so_nguoi_danh_gia"] == 3   # user 3 không có gợi ý vẫn được tính với điểm 0


def test_indexer_da_luu_chi_doc_va_khop_features(spark, lake_tam):
    d0 = date(2015, 5, 1)
    dong = [("u1", "sp{}".format(i), d0 + timedelta(days=i), 1.0, "phat_lai") for i in range(3)]
    dong.append(("u1", "sp9", d0 + timedelta(days=60), 3.0, "phat_lai"))
    silver = spark.createDataFrame(
        [(u, sp, datetime(n.year, n.month, n.day, 12), "xem", w, n, nguon) for u, sp, n, w, nguon in dong], SILVER)
    features, _ = dung_ma_tran(spark, silver, min_tuong_tac=3)
    test_features = {(r["user_idx"], r["item_idx"]) for r in features.filter("tap = 'test'").collect()}

    from pyspark.ml.feature import StringIndexerModel
    truoc = list(StringIndexerModel.load(ch.duong_dan_mo_hinh("item_indexer")).labels)
    su_kien = spark.createDataFrame([("u1", "sp9"), ("u1", "khong_co"), ("la", "sp1")], "ma_nguoi_dung string, ma_san_pham string")
    kq = {(r["user_idx"], r["item_idx"]) for r in danh_chi_so_bang_indexer_da_luu(su_kien).collect()}
    assert kq == test_features                       # cùng chỉ số với features; nhãn lạ bị bỏ
    assert list(StringIndexerModel.load(ch.duong_dan_mo_hinh("item_indexer")).labels) == truoc  # không ghi


def test_luoi_validation_trung_luoi_bao_cao():
    luoi = luoi_day_du()
    assert len(luoi) == 27
    mong_doi = [{"rank": r, "regParam": g, "alpha": a} for r, g, a in itertools.product(
        ch.LUOI_DAY_DU["rank"], ch.LUOI_DAY_DU["regParam"], ch.LUOI_DAY_DU["alpha"])]
    assert luoi == mong_doi
    dong = [{"x": 1, "id": "a"}, {"x": 3, "id": "b"}, {"x": 3, "id": "c"}]
    assert chon_theo(dong, "x")["id"] == "b"         # hòa thì giữ dòng đứng trước


def test_bootstrap_ab_loc_dung_va_khop_z_theo_impression(spark):
    luc = datetime(2026, 11, 5, 10)
    dong = []
    # A: 2 user x 10 impression, 1 click; B: 2 user x 10 impression, 4 click (dồn vào một user)
    for u, nhom, so_click in (("a1", "A", 1), ("a2", "A", 0), ("b1", "B", 4), ("b2", "B", 0)):
        for v in range(10):
            dong.append(("{}-{}".format(u, v), u, nhom, v + 1, "sp", luc, v < so_click, False, "mo_phong", "als"))
    dong.append(("web-1", "a1", "A", 1, "sp", luc, True, True, "web", "als"))           # traffic web: bỏ
    dong.append(("cold-1", "c1", "B", 1, "sp", luc, True, False, "mo_phong", "nguoi_moi"))  # cold start: bỏ
    df = spark.createDataFrame(dong, NHAT_KY)
    kq = phan_tich([r.asDict() for r in theo_user(df).collect()], so_lan=200, hat_giong=1)
    assert kq["quy_mo"]["A"] == {"so_user": 2, "so_hien_thi": 20, "so_click": 1, "so_mua": 0}
    assert kq["quy_mo"]["B"]["so_click"] == 4
    _, p = ztest_hai_ty_le(1, 20, 4, 20)
    assert kq["ctr"]["theo_impression"]["p_value"] == pytest.approx(p)
    assert kq["ctr"]["theo_cum_user"]["p_value"] > p     # click dồn vào một user -> kém chắc chắn hơn
    ca_web = phan_tich([r.asDict() for r in theo_user(df, chi_mo_phong=False).collect()], 200, 1)
    assert ca_web["quy_mo"]["A"]["so_hien_thi"] == 21
