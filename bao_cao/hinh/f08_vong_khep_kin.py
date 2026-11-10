"""Hình: vòng khép kín của web và luồng dữ liệu thí nghiệm A/B."""
from ve import MAU, So

s = So(7.4, 4.72, y0=-0.1)
s.nhom(0.1, 0.1, 1.42, 4.35, "Browser", MAU["xam"])
s.hop("home", 0.2, 0.45, 1.22, 1.15, "Home page\n'For you': 10 slots\n+ 'Trending now'\nuser picker,\n'new user' button", MAU["trang"], co=6.5)
s.hop("prod", 0.2, 1.75, 1.22, 1.0, "Product page\nrelated items\nView · Add to cart\n· Buy buttons", MAU["trang"], co=6.5)
s.hop("dash", 0.2, 2.9, 1.22, 1.45, "Dashboards\nA/B results\nmodel quality\nreproduction:\npick a day → re-run", MAU["trang"], co=6.5)

s.nhom(1.68, 0.1, 1.82, 4.35, "FastAPI web (labsoe-18)", MAU["web"], "#B8964E")
s.hop("w1", 1.78, 0.45, 1.62, 1.15, "GET /api/goi-y/{u}\ngroup = parity of md5(u)\nA: ALS only, B: ALS + 30 %\ntrending; newest trending\nreplaces trending slots", MAU["trang"], co=6.2)
s.hop("w2", 1.78, 1.75, 1.62, 1.0, "POST /api/hien-thi\nPOST /api/su-kien\nKafka producer\n(no direct Delta writes)", MAU["trang"], co=6.2)
s.hop("w3", 1.78, 2.9, 1.62, 1.45, "GET /api/ab/ket-qua\nPOST /api/tai-lap/{ngay}\nreads Delta with local\nSpark; re-aggregates the\nimpression log\nVERSION AS OF v", MAU["trang"], co=6.2)
s.mui("home", "w1", "e", "w"); s.mui("prod", "w2", "e", "w"); s.mui("dash", "w3", "e", "w", hai_chieu=True)
s.mui("w1", "home", "w", "e", ta=0.8, tb=0.8, net="--")

s.hop("ke", 3.68, 0.55, 1.05, 0.8, "topic\nretailrocket-\nevents", MAU["kafka"], co=6.4, kieu="tru")
s.hop("kh", 3.68, 1.9, 1.05, 0.8, "topic\nhien-thi", MAU["kafka"], co=6.6, kieu="tru")
s.mui("w2", "ke", "e", "w", ta=0.3, tb=0.75, nhan="events", co=6.0, vi_tri_nhan=0.45)
s.mui("w2", "kh", "e", "w", ta=0.7, tb=0.5, nhan="impressions,\nclicks, buys", co=6.0, vi_tri_nhan=0.5, lech_nhan=(0, 0.2))

s.hop("st", 4.95, 0.22, 1.12, 0.55, "tinh_thinh_hanh\nevery 20 s", MAU["luong"], co=6.5)
s.hop("nap", 4.95, 0.95, 1.12, 0.55, "nap_su_kien\n→ bronze → nightly", MAU["luong"], co=6.3)
s.hop("gh", 4.95, 2.0, 1.12, 0.6, "ghi_hien_thi\nMERGE every 30 s", MAU["luong"], co=6.4)
s.hop("mp", 4.95, 2.8, 1.12, 0.55, "mo_phong_hien_thi\nlabel 'mo_phong'", MAU["lo"], co=6.3)
s.hop("d3", 4.95, 3.6, 1.12, 0.72, "DAG 3 (hourly)\ntinh_ket_qua_ab\nCDF → z-test", MAU["af"], co=6.3)
s.mui("ke", "st", "e", "w", ta=0.3, tb=0.6); s.mui("ke", "nap", "e", "w", ta=0.75, tb=0.4)
s.mui("kh", "gh", "e", "w")

s.hop("gt", 6.27, 0.22, 1.05, 0.55, "gold.\nthinh_hanh_15p", MAU["gold"], co=6.3)
s.hop("gg", 6.27, 0.95, 1.05, 0.55, "gold.\ngoi_y_nguoi_dung", MAU["gold"], co=6.3)
s.hop("nk", 6.27, 2.0, 1.05, 0.95, "gold.\nnhat_ky_hien_thi\nChange Data Feed\nversion v", MAU["gold"], co=6.2)
s.hop("ab", 6.27, 3.6, 1.05, 0.72, "gold.\nket_qua_ab\n+ data version", MAU["gold"], co=6.3)
s.mui("st", "gt", "e", "w"); s.mui("nap", "gg", "e", "w", nhan="next day", co=5.8)
s.mui("gh", "nk", "e", "w", ta=0.5, tb=0.3); s.mui("mp", "nk", "e", "w", ta=0.5, tb=0.8, net="--")
s.mui("nk", "d3", "s", "e", ta=0.4, tb=0.3, cong=-0.2)
s.mui("d3", "ab", "e", "w")
# đọc lại bởi web
s.duong([(6.8, 0.22), (6.8, 0.15), (2.6, 0.15), (2.6, 0.45)], net="--", mau="#8A6D3B")
s.chu(4.5, 0.08, "web reads the newest trending window and the user's list (≤ 90 s loop for trending)", co=6.0, mau="#8A6D3B")
s.duong([(6.8, 4.32), (6.8, 4.42), (2.6, 4.42), (2.6, 4.35)], net="--", mau="#8A6D3B")
s.chu(4.5, 4.49, "dashboard reads ket_qua_ab; reproduction re-reads nhat_ky_hien_thi at the recorded version", co=6.0, mau="#8A6D3B")
s.luu("f08_vong_khep_kin.png")
