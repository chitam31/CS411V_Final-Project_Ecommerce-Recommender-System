"""Web giả lập sàn TMĐT: 5 màn hình, API theo đặc tả 3.8, impression log, vòng khép kín."""
import json

import pytest

pytest.importorskip("fastapi")
from fastapi.testclient import TestClient  # noqa: E402

from app import create_app  # noqa: E402
from common.luoc_do import LUOC_DO_HIEN_THI, LUOC_DO_SU_KIEN  # noqa: E402
from dich_vu.gui_su_kien import GuiBoNho  # noqa: E402
from dich_vu.kho_gia import KhoGia  # noqa: E402


@pytest.fixture
def web():
    gui = GuiBoNho()
    return TestClient(create_app(kho=KhoGia(), gui=gui)), gui


def test_nam_man_hinh(web):
    c, _ = web
    for url in ("/", "/?u=u_als_1", "/san-pham/sp3", "/ab", "/mo-hinh", "/tai-lap"):
        r = c.get(url)
        assert r.status_code == 200, url
        assert "DỮ LIỆU GIẢ LẬP" in r.text


def test_moi_lan_render_ghi_impression(web):
    c, gui = web
    c.get("/?u=u_als_3")
    hien_thi = [m for t, _, m in gui.da_gui if t == "hien-thi"]
    assert len(hien_thi) == 10
    assert [m["vi_tri"] for m in hien_thi] == list(range(1, 11))
    ten_truong = {f.name for f in LUOC_DO_HIEN_THI.fields}
    assert all(set(m) <= ten_truong for m in hien_thi)  # job ghi_hien_thi đọc được mọi trường
    assert len({m["nhom_ab"] for m in hien_thi}) == 1


def test_su_kien_vao_kafka_dung_luoc_do(web):
    c, gui = web
    r = c.post("/api/su-kien", json={"ma_nguoi_dung": "u_als_1", "ma_san_pham": "sp5", "loai": "them_gio", "ma_hien_thi": "h1"})
    assert r.status_code == 200
    topic, khoa, m = gui.da_gui[-1]
    assert topic == "retailrocket-events" and khoa == "u_als_1"
    assert m["event"] == "addtocart" and m["nguon"] == "web" and m["ma_danh_muc"] == "dm5"
    assert set(m) <= {f.name for f in LUOC_DO_SU_KIEN.fields}
    assert c.post("/api/su-kien", json={"ma_nguoi_dung": "u", "ma_san_pham": "sp5", "loai": "xoa"}).status_code == 400


def test_mua_tu_impression_ghi_phan_hoi(web):
    c, gui = web
    c.get("/san-pham/sp5?u=u_als_1&mh=h9")
    c.post("/api/su-kien", json={"ma_nguoi_dung": "u_als_1", "ma_san_pham": "sp5", "loai": "mua", "ma_hien_thi": "h9"})
    phan_hoi = [m["hanh_dong"] for t, _, m in gui.da_gui if t == "hien-thi" and m["loai"] == "phan_hoi"]
    assert phan_hoi == ["click", "mua"]


def test_ba_chien_luoc_cold_start(web):
    c, _ = web
    assert c.get("/api/goi-y/u_als_2").json()["chien_luoc"] == "als"
    assert c.get("/api/goi-y/u_it_1").json()["chien_luoc"] == "it_tuong_tac"
    moi = c.get("/nguoi-dung-moi", follow_redirects=False).headers["location"].split("u=")[1]
    kq = c.get("/api/goi-y/" + moi).json()
    assert kq["chien_luoc"] == "nguoi_moi" and all(g["nguon"] == "thinh_hanh" for g in kq["goi_y"])
    for sp in ("sp3", "sp13"):
        c.post("/api/su-kien", json={"ma_nguoi_dung": moi, "ma_san_pham": sp, "loai": "xem"})
    kq = c.get("/api/goi-y/" + moi).json()
    assert kq["chien_luoc"] == "it_tuong_tac"
    assert sum(g["nguon"] == "thinh_hanh" for g in kq["goi_y"]) == 5
    assert {g.get("ma_danh_muc") for g in kq["goi_y"] if g["nguon"] == "pho_bien_danh_muc"} == {"dm3"}


def test_nhom_ab_on_dinh_va_dung_ty_le(web):
    c, _ = web
    lan = [c.get("/api/goi-y/u_als_4").json() for _ in range(3)]
    assert len({k["nhom_ab"] for k in lan}) == 1
    for u in ("u_als_{}".format(i) for i in range(1, 9)):
        kq = c.get("/api/goi-y/" + u).json()
        so_th = sum(g["nguon"] == "thinh_hanh" for g in kq["goi_y"])
        assert so_th == (3 if kq["nhom_ab"] == "B" else 0)


def test_api_ab_mo_hinh_tai_lap(web):
    c, _ = web
    ab = c.get("/api/ab/ket-qua").json()
    assert ab["tong_hop"]["p_value"] is not None and "ket_luan" in ab["tong_hop"]
    assert len(c.get("/api/mo-hinh/chi-so").json()["tuning"]) >= 9
    r = c.post("/api/tai-lap/2026-11-04")
    assert r.status_code == 200 and r.json()["trung_khop"] is True
    assert c.post("/api/tai-lap/2000-01-01").status_code == 404


def test_thinh_hanh_cap_nhat_sau_them_gio(web):
    c, _ = web
    truoc = c.get("/api/thinh-hanh/sp200").json()["so_luot_them_gio"]
    c.post("/api/su-kien", json={"ma_nguoi_dung": "x", "ma_san_pham": "sp200", "loai": "them_gio"})
    assert c.get("/api/thinh-hanh/sp200").json()["so_luot_them_gio"] == truoc + 1
    assert json.dumps(c.get("/api/thinh-hanh").json())


def test_anh_minh_hoa_va_ghi_chu(web):
    """Lớp minh họa (RetailRocket ẩn danh): ảnh SVG hợp lệ, tất định, có chữ "ảnh minh họa", chân trang nói rõ."""
    import xml.etree.ElementTree as ET

    c, _ = web
    r = c.get("/anh/sp3.svg")
    assert r.status_code == 200 and r.headers["content-type"].startswith("image/svg+xml")
    ET.fromstring(r.text)                                  # XML hợp lệ (tên ngành có "&" đã được escape)
    assert "ảnh minh họa" in r.text and r.text == c.get("/anh/sp3.svg").text
    trang = c.get("/?u=u_als_1").text
    assert "/anh/" in trang and "minh họa" in trang
    sp = c.get("/san-pham/sp3").text
    assert "/anh/sp3.svg" in sp


def test_nganh_hang_theo_danh_muc_goc():
    from dich_vu import minh_hoa
    from dich_vu.kho_du_lieu import goc_cua

    cha = {"5": "2", "2": "1", "1": "", "9": "9x", "9x": "9"}   # 9 <-> 9x là vòng lặp lỗi
    assert goc_cua("5", cha) == "1" and goc_cua("1", cha) == "1"
    assert goc_cua("9", cha) in ("9", "9x")                       # không treo khi cây có vòng
    a, b = minh_hoa.trang_tri({"ma_san_pham": "1", "ma_danh_muc": "5"}, "1"), minh_hoa.trang_tri({"ma_san_pham": "2"}, "1")
    assert a["nganh"] == b["nganh"]                               # cùng danh mục gốc -> cùng ngành hàng
    assert a["ten_hien_thi"].endswith(" 1") and a["anh"] == "/anh/1.svg"
    assert minh_hoa.dinh_dang_gia(479880.0) == "479.880 ₫" and minh_hoa.dinh_dang_gia(None) is None
    import xml.etree.ElementTree as ET
    for i in range(64):
        ET.fromstring(minh_hoa.anh_svg(str(i), str(i)))
