"""Hình: triển khai vật lý trên cụm 7 máy + laptop điều khiển."""
from ve import MAU, So

s = So(7.4, 6.55)
s.hop("zt", 0.15, 0.12, 7.1, 0.36, "ZeroTier overlay network 'ttunet' (633e31d8a29b038c), subnet 10.68.71.0/24, carried over the LabSoe Wi-Fi (192.168.80.0/24)",
      "#E8EEF6", co=7.4, dam_dong_dau=True)

# Máy master
s.nhom(0.15, 0.68, 4.1, 2.02, "labsoe-11 · 10.68.71.113 · master (12 cores, 7.4 GB)", MAU["may"], "#6E8BB0")
s.hop("nn", 0.3, 1.02, 1.25, 1.55, "hadoop-master\nNameNode\nRPC :8020\nWeb UI :9870\nheap 1 GB\n(bridge network)", MAU["hdfs"], co=6.9)
s.hop("sm", 1.65, 1.02, 1.25, 1.55, "spark-master\nMaster :7077\nWeb UI :8080\ndrivers of ALL jobs\nports 4041-4060\njob UIs 4140-4150", MAU["spark"], co=6.9)
s.hop("af", 3.0, 1.02, 1.12, 1.55, "Airflow 3.3.1\napi-server :8088\nscheduler\ndag-processor\nPostgreSQL 16\n(slim, ~0.9 GB)", MAU["af"], co=6.9)

# Ctam (dự phòng) + laptop
s.nhom(4.45, 0.68, 2.8, 0.95, "ctam · 10.68.71.205 · standby", MAU["may"], "#6E8BB0")
s.hop("web", 4.6, 0.98, 2.5, 0.55, "Ubuntu in WSL2 on the laptop\nfirst web host, kept as standby", MAU["xam"], co=6.8, dam_dong_dau=False)
s.nhom(4.45, 1.75, 2.8, 0.95, "whitehathacker · 10.68.71.182 · control laptop", MAU["may"], "#6E8BB0")
s.hop("lap", 4.6, 2.05, 2.5, 0.55, "Git Bash: ssh_tat_ca.sh, --dong-bo-ma\nbrowser to all web UIs (SSH tunnel)", MAU["trang"], co=6.8, dam_dong_dau=False)

# bus
s.ax.plot([0.35, 7.05], [2.88, 2.88], color="#6E8BB0", lw=2.2, zorder=2)
for x in (2.2, 5.85):
    s.ax.plot([x, x], [2.7, 2.88], color="#6E8BB0", lw=1.4, zorder=2)
s.ax.plot([5.85, 5.85], [1.63, 1.75], color="#6E8BB0", lw=1.4, zorder=2)
s.ax.plot([7.2, 7.2], [0.48, 2.88], color="#6E8BB0", lw=1.4, zorder=2)

# 5 worker
mays = [
    ("labsit12", ".198", "8 cores · 3 GB", []),
    ("labsit", ".204", "6 cores · 2 GB", ["kafka-server :9092", "kafka-ui :8080", "producer (replay)"]),
    ("labsit-may25", ".42", "4 cores · 2 GB", ["(shared with another", "group's services)"]),
    ("labsit-may26", ".90", "8 cores · 3 GB", ["(shared with another", "group's Airflow worker)"]),
    ("labsoe-18", ".149", "8 cores · 3 GB", ["bd03-web :8000", "FastAPI + Spark local[2]", "SSH jump host"]),
]
w, gap, y0 = 1.34, 0.105, 3.12
for i, (ten, ip, tn, them) in enumerate(mays):
    x = 0.15 + i * (w + gap)
    s.ax.plot([x + w / 2, x + w / 2], [2.88, y0], color="#6E8BB0", lw=1.4, zorder=2)
    s.nhom(x, y0, w, 2.55, "%s %s" % (ten, ip), MAU["may"], "#6E8BB0", co=7.4)
    s.hop("dn%d" % i, x + 0.08, y0 + 0.36, w - 0.16, 0.62, "hadoop-worker\nDataNode :9866\nheap 1 GB", MAU["hdfs"], co=6.8)
    s.hop("sw%d" % i, x + 0.08, y0 + 1.06, w - 0.16, 0.62, "spark-worker\n%s\nhost network" % tn, MAU["spark"], co=6.8)
    if them:
        dam = not them[0].startswith("(")
        s.hop("x%d" % i, x + 0.08, y0 + 1.76, w - 0.16, 0.68, "\n".join(them),
              (MAU["web"] if them[0].startswith("bd03-web") else MAU["kafka"]) if dam else MAU["xam"],
              co=6.6, dam_dong_dau=False)

s.chu(3.7, 5.95, "Totals: Spark 5 workers, 34 cores, 13 GB executor memory  ·  HDFS 1 NameNode + 5 DataNodes, replication 2  ·  Kafka 1 broker (KRaft)",
      co=7.0, dam=True)
s.chu(3.7, 6.25, "Every lab machine: Ubuntu 22.04/24.04, 12 logical cores, 7 GB RAM, Docker; all services run in containers started by scripts/cum/khoi_dong_may.sh",
      co=6.7)
s.luu("f02_cum.png")
