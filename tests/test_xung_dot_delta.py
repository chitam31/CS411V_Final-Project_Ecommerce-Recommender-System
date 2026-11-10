"""thu_lai_khi_xung_dot: luồng streaming và DAG bảo trì cùng ghi một bảng Delta không làm hỏng nhau."""
import pytest

from common.spark_utils import la_xung_dot_delta, thu_lai_khi_xung_dot


class LoiGiaPy4J(Exception):
    """Giống cách PySpark báo lỗi Java: tên lớp Delta nằm trong thông điệp."""


def test_nhan_ra_xung_dot_delta():
    assert la_xung_dot_delta(LoiGiaPy4J("io.delta.exceptions.ConcurrentAppendException: Files were added"))
    assert la_xung_dot_delta(LoiGiaPy4J("An error occurred: ConcurrentDeleteReadException ..."))
    assert not la_xung_dot_delta(LoiGiaPy4J("AnalysisException: Table not found"))
    assert not la_xung_dot_delta(ValueError("bad"))


def test_thu_lai_roi_thanh_cong():
    dem, cho = [], []

    def ham():
        dem.append(1)
        if len(dem) < 3:
            raise LoiGiaPy4J("io.delta.exceptions.ConcurrentDeleteReadException")
        return "xong"

    assert thu_lai_khi_xung_dot(ham, so_lan=5, cho_giay=2, ngu=cho.append) == "xong"
    assert len(dem) == 3 and cho == [2, 4]  # chờ tăng dần theo số lần


def test_loi_khac_nem_ngay_va_het_lan_thi_nem():
    dem = []

    def loi_khac():
        dem.append(1)
        raise LoiGiaPy4J("AnalysisException: cột không tồn tại")

    with pytest.raises(LoiGiaPy4J):
        thu_lai_khi_xung_dot(loi_khac, ngu=lambda _: None)
    assert len(dem) == 1

    dem.clear()

    def luon_xung_dot():
        dem.append(1)
        raise LoiGiaPy4J("ConcurrentAppendException")

    with pytest.raises(LoiGiaPy4J):
        thu_lai_khi_xung_dot(luon_xung_dot, so_lan=4, ngu=lambda _: None)
    assert len(dem) == 4
