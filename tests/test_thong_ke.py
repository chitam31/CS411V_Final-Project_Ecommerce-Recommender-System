"""Kiểm định z hai tỷ lệ: so với công thức của statsmodels/scipy và các trường hợp biên."""
import math

import pytest

from common.thong_ke import co_mau_can_thiet, ket_luan, ztest_hai_ty_le


def test_gia_tri_biet_truoc():
    # 200/4000 = 5% so với 260/4000 = 6.5%
    z, p = ztest_hai_ty_le(200, 4000, 260, 4000)
    p_gop = 460 / 8000
    z_tay = (0.065 - 0.05) / math.sqrt(p_gop * (1 - p_gop) * (2 / 4000))
    assert z == pytest.approx(z_tay)
    assert 0.0 < p < 0.01


def test_khop_scipy():
    stats = pytest.importorskip("scipy.stats")
    z, p = ztest_hai_ty_le(120, 2000, 150, 2100)
    assert p == pytest.approx(2 * stats.norm.sf(abs(z)))


def test_bang_nhau_va_thieu_du_lieu():
    z, p = ztest_hai_ty_le(50, 1000, 50, 1000)
    assert z == 0.0 and p == pytest.approx(1.0)
    assert ztest_hai_ty_le(0, 0, 5, 10) == (None, None)
    assert ztest_hai_ty_le(0, 10, 0, 10) == (None, None)


def test_ket_luan_va_co_mau():
    assert "có ý nghĩa" in ket_luan(0.01)
    assert "Chưa đủ bằng chứng" in ket_luan(0.2)
    assert "Chưa đủ dữ liệu" in ket_luan(None)
    # CTR nền 5%, muốn phát hiện tăng 10% tương đối: cỡ vài chục nghìn mỗi nhóm
    assert 25000 < co_mau_can_thiet(0.05, 0.10) < 40000
