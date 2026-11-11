"""Hình: ba luồng Structured Streaming và ngân sách độ trễ của khối thịnh hành."""
from ve import MAU, So

s = So(7.4, 5.62)
lanes = [
    ("1  nap_su_kien  (profile nap: 1 core, driver 512 MB, trigger 15 s, startingOffsets earliest)",
     "retailrocket-events", [
         "from_json, drop rows\nwithout user / item / event",
         "map to the Vietnamese\nschema; sha256 event id;\n30-min session id",
         "left join\nsilver.san_pham\n(category)",
     ], "bronze/su_kien_v2\nParquet file sink\npartitionBy(ngay)", MAU["bronze"], "checkpoint: /lake/checkpoints/nap_su_kien_v2"),
    ("2  tinh_thinh_hanh  (profile thinh_hanh: 2 cores, RocksDB state store, trigger 20 s, startingOffsets latest)",
     "retailrocket-events", [
         "keep view and\nadd-to-cart;\nevent time = kafka_ts",
         "withWatermark 2 min\nwindow 15 min / 1 min\ncount per item",
         "foreachBatch: join mean\nper 15 min (24 h), score,\nMERGE on (window, item)",
     ], "gold.thinh_hanh_15p\nDelta, outputMode\nupdate", MAU["gold"], "checkpoint: /lake/checkpoints/tinh_thinh_hanh_v1"),
    ("3  ghi_hien_thi  (profile hien_thi: 1 core, trigger 30 s)",
     "hien-thi", [
         "parse impression,\nclick and purchase\nmessages",
         "aggregate per\nma_hien_thi within\nthe micro-batch",
         "foreachBatch MERGE:\ninsert new impressions,\nOR-update click / buy",
     ], "gold.nhat_ky_hien_thi\nDelta, Change Data\nFeed enabled", MAU["gold"], "checkpoint: /lake/checkpoints/ghi_hien_thi_v1"),
]
y = 0.12
for i, (tieu_de, topic, buoc, dich, mau_dich, ckpt) in enumerate(lanes):
    s.nhom(0.12, y, 7.16, 1.38, tieu_de, MAU["spark"], "#7FB27F", co=7.4)
    s.hop("t%d" % i, 0.25, y + 0.42, 1.05, 0.72, "topic\n" + topic, MAU["kafka"], co=6.6, kieu="tru")
    x = 1.47
    prev = "t%d" % i
    for j, b in enumerate(buoc):
        ten = "b%d%d" % (i, j)
        s.hop(ten, x, y + 0.42, 1.3, 0.72, b, MAU["trang"], co=6.4, dam_dong_dau=False)
        s.mui(prev, ten, "e", "w")
        prev = ten
        x += 1.43
    s.hop("d%d" % i, x, y + 0.42, 1.3, 0.72, dich, mau_dich, co=6.5)
    s.mui(prev, "d%d" % i, "e", "w")
    s.chu(4.4, y + 1.25, ckpt, co=6.2, nghieng=True, mau="#555555")
    y += 1.52

# Ngân sách độ trễ của khối thịnh hành
s.nhom(0.12, y, 7.16, 0.85, "Latency budget of the trending block (target ≤ 90 s from a click to the updated block; measured 51 s, Section 6.9)", "#FFFFFF", "#8C8C8C", co=7.2)
doan = [("click → Kafka\n< 1 s", 0.8), ("wait for next trigger\n≤ 20 s", 1.5), ("micro-batch: aggregate\n+ MERGE, ~10–30 s", 2.1), ("web reads newest\nwindow, < 5 s", 1.25), ("margin", 1.2)]
x = 0.25
mau = ["#D9E8F8", "#DCF0DC", "#F8E7A1", "#FFF4DE", "#F2F2F2"]
for k, (nhan, w) in enumerate(doan):
    s.hop("l%d" % k, x, y + 0.33, w, 0.42, nhan, mau[k], co=6.3, dam_dong_dau=False)
    x += w
s.luu("f07_luong.png")
