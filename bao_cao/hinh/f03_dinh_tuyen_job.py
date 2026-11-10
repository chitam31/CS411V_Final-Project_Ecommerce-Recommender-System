"""Hình: đường đi của một job Spark từ task Airflow tới executor và HDFS."""
from ve import MAU, So

s = So(7.4, 4.75)
s.nhom(0.12, 0.12, 4.55, 4.5, "Master host labsoe-11 (10.68.71.113)", MAU["may"], "#6E8BB0")
s.hop("af", 0.27, 0.5, 1.6, 1.0, "airflow-scheduler\nLocalExecutor task:\nBashOperator runs\nsubmit.sh <profile> <job>", MAU["af"], co=6.8)
s.hop("dir", 0.27, 1.95, 1.6, 1.05, "project directory\n~/bd03_khuyen_nghi\n= /opt/bd03 in Airflow\n= /opt/spark/jobs in Spark", MAU["xam"], co=6.6, kieu="tru")
s.hop("sock", 0.27, 3.45, 1.6, 0.6, "/var/run/docker.sock\n(group docker)", MAU["trang"], co=6.8)
s.nhom(2.08, 0.42, 2.45, 4.05, "container spark-master (host network)", MAU["spark"], "#7FB27F", co=7.2)
s.hop("mst", 2.22, 0.78, 2.17, 0.62, "Standalone Master :7077\nUI :8080, applications list", MAU["trang"], co=6.8)
s.hop("drv", 2.22, 1.62, 2.17, 1.35, "Driver (client mode)\nJVM + Python process\ndriver.host = 10.68.71.113\nport per profile, e.g. als 4049/4050\njob UI 4144 · common.zip on --py-files", MAU["trang"], co=6.6)
s.hop("out", 2.22, 3.2, 2.17, 0.62, "stdout: last line = JSON result\n{\"ndcg_at_10\": ..., \"cai_thien\": true}", MAU["trang"], co=6.4)
s.chu(3.3, 4.12, "all drivers share the 7.4 GB of the master host", co=6.3, nghieng=True)

s.nhom(4.85, 0.12, 2.43, 2.62, "Spark workers (5 hosts, host network)", MAU["may"], "#6E8BB0")
for i, (ten, tn) in enumerate([("labsit12", "2 cores · 2 GB"), ("labsit-may26", "2 cores · 2 GB"), ("labsoe-18", "2 cores · 2 GB")]):
    s.hop("ex%d" % i, 5.0, 0.48 + i * 0.73, 2.13, 0.6, "Executor on %s\n%s, Python workers" % (ten, tn), MAU["spark"], co=6.7)
s.nhom(4.85, 2.92, 2.43, 1.7, "HDFS (Delta tables, checkpoints, models)", MAU["hdfs"], "#D9A47E")
s.hop("nn", 5.0, 3.28, 2.13, 0.5, "NameNode 10.68.71.113:8020\nmetadata, block locations", MAU["trang"], co=6.6)
s.hop("dn", 5.0, 3.92, 2.13, 0.55, "DataNodes on 5 workers\nreached by ZeroTier IP\n(dfs.client.use.datanode.hostname)", MAU["trang"], co=6.4, dam_dong_dau=False)


def so(x, y, n):
    s.ax.text(x, y, n, fontsize=7.2, ha="center", va="center", color="white", fontweight="bold", zorder=8,
              bbox=dict(boxstyle="circle,pad=0.18", fc="#B04A4A", ec="none"))


s.mui("af", "dir", "s", "n", ta=0.35, tb=0.35); so(0.62, 1.73, "1")
s.duong([(1.65, 1.5), (1.65, 1.75), (1.98, 1.75), (1.98, 3.75), (1.87, 3.75)]); so(1.98, 2.5, "2")
s.mui("sock", "drv", "e", "w", ta=0.5, tb=0.85); so(2.1, 3.62, "3")
s.mui("drv", "mst", "n", "s", ta=0.5, tb=0.5); so(3.48, 1.51, "4")
s.mui("mst", "ex0", "e", "w", ta=0.5, tb=0.5, nhan="launch executors", vi_tri_nhan=0.5, lech_nhan=(0.05, 0.2), co=6.0); so(4.6, 1.09, "5")
s.mui("drv", "ex1", "e", "w", ta=0.45, tb=0.5, hai_chieu=True, nhan="tasks / results", vi_tri_nhan=0.55, lech_nhan=(0, -0.1), co=6.0); so(4.6, 1.96, "6")
s.duong([(7.13, 1.9), (7.21, 1.9), (7.21, 4.2), (7.13, 4.2)])
s.chu(6.42, 2.77, "read / write blocks", co=6.0)
s.mui("drv", "nn", "e", "w", ta=0.8, tb=0.5, net="--"); so(4.6, 2.95, "7")
s.duong([(2.4, 3.82), (2.4, 4.42), (1.07, 4.42), (1.07, 4.05)], net="--", mau="#B04A4A")
s.chu(1.72, 4.52, "8  BashOperator stdout → XCom → branch", co=6.3, mau="#B04A4A")
s.luu("f03_dinh_tuyen_job.png")
