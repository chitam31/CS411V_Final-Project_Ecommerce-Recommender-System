"""Hình: triển khai vật lý trên các máy phòng thí nghiệm (khổ ngang)."""
from ve import So

s = So(7.4, 3.22)
s.hop("zt", 0.1, 0.1, 7.2, 0.27, "ZeroTier overlay network 'ttunet' · subnet 10.68.71.0/24 · carried over the LabSoe Wi-Fi",
      "kafka", co=7.0)

# Máy master
s.nhom(0.1, 0.5, 3.62, 0.98, "labsoe-11 · 10.68.71.113 · master (12 cores, 7.4 GB RAM)", "xam", co=7.2)
s.hop("nn", 0.18, 0.76, 1.1, 0.62, "hadoop-master\nNameNode\n:8020 · UI :9870", "gold", co=6.6)
s.hop("sm", 1.36, 0.76, 1.1, 0.62, "spark-master\nMaster :7077\ndrivers of all jobs", "lo", co=6.6)
s.hop("af", 2.54, 0.76, 1.1, 0.62, "Airflow 3.3.1\nAPI :8088\nPostgreSQL 16", "af", co=6.6)

s.nhom(3.84, 0.5, 1.68, 0.98, "whitehathacker · .182 · control", "xam", co=7.2)
s.hop("lap", 3.92, 0.76, 1.52, 0.62, "Control laptop\nGit Bash · SSH tunnels\ncode sync: --dong-bo-ma", "trang", co=6.6)
s.nhom(5.64, 0.5, 1.66, 0.98, "ctam · .205 · standby", "xam", co=7.2)
s.hop("sb", 5.72, 0.76, 1.5, 0.62, "Ubuntu in WSL2\nfirst web host,\nkept as standby", "xam", co=6.6)

# Đường trục mạng
s.ax.plot([0.3, 7.1], [1.6, 1.6], color="#6C8EBF", lw=1.8, zorder=2)
for x in (1.91, 4.68, 6.47):
    s.ax.plot([x, x], [1.48, 1.6], color="#6C8EBF", lw=1.0, zorder=2)

may = [
    ("labsit12 · .198", "Spark: 8 cores · 3 GB", None),
    ("labsit · .204", "Spark: 6 cores · 2 GB", ("Kafka :9092 · UI · producer", "kafka")),
    ("labsit-may25 · .42", "Spark: 4 cores · 2 GB", ("shared with another group", "xam")),
    ("labsit-may26 · .90", "Spark: 8 cores · 3 GB", ("another group's Airflow", "xam")),
    ("labsoe-18 · .149", "Spark: 8 cores · 3 GB", ("bd03-web :8000 · SSH jump", "web")),
]
w = 1.36
for i, (ten, spark, them) in enumerate(may):
    x = 0.1 + i * (w + 0.1)
    s.ax.plot([x + w / 2, x + w / 2], [1.6, 1.72], color="#6C8EBF", lw=1.0, zorder=2)
    s.nhom(x, 1.72, w, 1.08, ten, "xam", co=7.2)
    s.hop("dn%d" % i, x + 0.07, 1.98, w - 0.14, 0.24, "DataNode :9866", "gold", co=6.5, dam_dong_dau=False)
    s.hop("sw%d" % i, x + 0.07, 2.26, w - 0.14, 0.24, spark, "lo", co=6.5, dam_dong_dau=False)
    if them:
        s.hop("x%d" % i, x + 0.07, 2.54, w - 0.14, 0.24, them[0], them[1], co=6.3, dam_dong_dau=False)

s.chu(3.7, 2.98, "Totals: Spark 5 workers, 34 cores, 13 GB executor memory  ·  HDFS 1 NameNode + 5 DataNodes, replication 2  ·  Kafka 1 broker (KRaft)",
      co=6.9, dam=True)
s.chu(3.7, 3.12, "Every lab machine: Ubuntu, 12 logical cores, 7 GB RAM, Docker; services start from scripts/cum/khoi_dong_may.sh",
      co=6.4, nghieng=True, mau="#444444")
s.luu("f02_cum.png")
