"""demo_vong_khep_kin.py - đo 2 mục nghiệm thu bằng chính API của web:

  * Vòng khép kín: bấm "Thêm giỏ" -> Kafka -> bronze -> ảnh hưởng bảng thịnh hành.
  * Streaming thịnh hành cập nhật trong <= 90 giây sau khi bấm nút.

Cách đo: đọc số lượt thêm giỏ hiện tại của sản phẩm trong gold.thinh_hanh_15p, gửi N lần
"Thêm giỏ", rồi thăm dò mỗi 3 giây tới khi con số tăng. In số giây đã trôi qua.

    python3 scripts/demo_vong_khep_kin.py --web http://10.68.71.149:8000 --san-pham 461686
Nên chọn một sản phẩm ÍT người xem (không nằm trong khối thịnh hành) để con số chỉ đổi vì lần bấm này.
Sau đó xác nhận sự kiện đã nằm trong bronze:
    bash ha_tang/spark/submit.sh nhanh kiem_tra/tim_su_kien_bronze.py --ma-nguoi-dung demo_vong_kin
"""
import argparse
import json
import time
import urllib.request


def goi(phuong_thuc, url, du_lieu=None):
    yc = urllib.request.Request(
        url, method=phuong_thuc, headers={"Content-Type": "application/json"},
        data=json.dumps(du_lieu).encode("utf-8") if du_lieu is not None else None,
    )
    with urllib.request.urlopen(yc, timeout=30) as ph:
        return json.loads(ph.read().decode("utf-8"))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--web", default="http://10.68.71.149:8000")
    ap.add_argument("--san-pham", required=True)
    ap.add_argument("--nguoi-dung", default="demo_vong_kin")
    ap.add_argument("--so-lan", type=int, default=3)
    ap.add_argument("--toi-da-giay", type=int, default=180)
    args = ap.parse_args()

    dong_truoc = goi("GET", "{}/api/thinh-hanh/{}".format(args.web, args.san_pham))
    truoc = dong_truoc.get("so_luot_them_gio") or 0
    cua_so_truoc = dong_truoc.get("cua_so_ket_thuc")
    print("Trước khi bấm: cửa sổ {}, thêm giỏ {}".format(cua_so_truoc, truoc))
    bat_dau = time.time()
    for _ in range(args.so_lan):
        goi("POST", args.web + "/api/su-kien",
            {"ma_nguoi_dung": args.nguoi_dung, "ma_san_pham": args.san_pham, "loai": "them_gio"})
    print("Đã bấm 'Thêm giỏ' {} lần lúc {}".format(args.so_lan, time.strftime("%H:%M:%S")))

    while time.time() - bat_dau < args.toi_da_giay:
        time.sleep(3)
        dong = goi("GET", "{}/api/thinh-hanh/{}".format(args.web, args.san_pham))
        sau = dong.get("so_luot_them_gio") or 0
        # Cửa sổ trượt bước 1 phút: con số có thể nằm ở cửa sổ mới, nên chấp nhận khi bảng
        # đã thay đổi (khác số hoặc khác cửa sổ) và đã chứa ít nhất số lần vừa bấm.
        thay_doi = sau != truoc or dong.get("cua_so_ket_thuc") != cua_so_truoc
        if thay_doi and sau >= args.so_lan:
            giay = time.time() - bat_dau
            print("Bảng thịnh hành đã cập nhật sau {:.0f} giây (cửa sổ {}, thêm giỏ {}) -> {}".format(
                giay, dong.get("cua_so_ket_thuc"), sau, "ĐẠT (<= 90s)" if giay <= 90 else "CHƯA ĐẠT"))
            return
    print("Hết {} giây mà bảng chưa cập nhật: kiểm tra scripts/luong.sh trang_thai".format(args.toi_da_giay))


if __name__ == "__main__":
    main()
