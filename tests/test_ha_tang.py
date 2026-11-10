"""Cấu hình, lược đồ, bộ phát Kafka, DAG Airflow và tiện ích đo ZORDER."""
import os
import subprocess

import pytest

from common import cau_hinh as ch
from common.luoc_do import BANG_DELTA, ten_cot

GOC = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def test_luoc_do_dung_dac_ta():
    assert ten_cot("gold.goi_y_nguoi_dung")[:5] == ["ma_nguoi_dung", "xep_hang", "ma_san_pham", "diem_du_doan", "nguon"]
    assert {"phien_ban_mo_hinh", "sinh_luc"} <= set(ten_cot("gold.goi_y_nguoi_dung"))
    assert ten_cot("gold.nhat_ky_hien_thi")[:8] == ["ma_hien_thi", "ma_nguoi_dung", "nhom_ab", "vi_tri", "ma_san_pham",
                                                     "thoi_diem_hien_thi", "da_click", "da_mua"]
    assert "phien_ban_delta_du_lieu" in ten_cot("gold.ket_qua_ab")
    assert BANG_DELTA["gold.nhat_ky_hien_thi"]["thuoc_tinh"]["delta.enableChangeDataFeed"] == "true"
    assert ch.duong_dan("silver.tuong_tac").endswith("/lake/silver/tuong_tac")
    assert sum(len(v) for v in ch.LUOI_DAY_DU.values()) == 9 and len(ch.LUOI_TOI_THIEU["rank"]) * len(ch.LUOI_TOI_THIEU["regParam"]) == 9


def test_tao_df_theo_ddl(spark):
    from common.luoc_do import tao_df

    df = tao_df(spark, "gold.ket_qua_tuning", [{"ma_chay": "r1", "rank": 10, "reg_param": 0.1, "alpha": 1.0, "ndcg_at_10": 0.2}])
    assert df.columns == ten_cot("gold.ket_qua_tuning") and df.first()["coverage"] is None


def test_bo_phat(tmp_path):
    from phat_lai_su_kien import MS_MOI_NGAY, SinhNguoiMoi, doc_su_kien, thoi_diem_phat

    tep = tmp_path / "events.csv"
    tep.write_text("timestamp,visitorid,event,itemid,transactionid\n300,2,view,9,\n100,1,view,8,\n200,1,transaction,8,77\n")
    ds = doc_su_kien(str(tep))
    assert [d[0] for d in ds] == [100, 200, 300] and ds[1][4] == "77"
    assert thoi_diem_phat(1000 + MS_MOI_NGAY, 1000, 50.0, 30.0) == pytest.approx(80.0)  # 1 ngày = 30 giây
    sinh = SinhNguoiMoi(0.05, hat_giong=1)
    so = sum(sinh.co_sinh() for _ in range(20000))
    assert 0.04 < so / 20000 < 0.06
    tm = sinh.sinh(123, "9")
    assert tm["visitorid"].startswith("moi_") and tm["nguon"] == "nguoi_moi"


def test_du_lieu_mau(tmp_path):
    from tao_du_lieu_mau import sinh

    n = sinh(str(tmp_path), so_nguoi=200, so_item=100)
    assert n > 600 and (tmp_path / "item_properties_part2.csv").exists()


def test_script_shell_dung_cu_phap():
    for goc, _, tep in os.walk(os.path.join(GOC, "scripts")):
        for t in tep:
            if t.endswith(".sh"):
                subprocess.run(["bash", "-n", os.path.join(goc, t)], check=True)
    subprocess.run(["bash", "-n", os.path.join(GOC, "ha_tang", "spark", "submit.sh")], check=True)


def test_khoi_dong_may_nhan_dung_vai_tro():
    kq = subprocess.run(["bash", os.path.join(GOC, "scripts", "cum", "khoi_dong_may.sh"), "labsit", "--in-thu"],
                        capture_output=True, text=True, check=True).stdout
    assert "10.68.71.204" in kq and "kafka/docker-compose.yml" in kq and "up -d worker" in kq
    assert "spark-master" not in kq.split("vai trò:")[1].split("\n")[0]


def test_khoi_dong_may_chi_build_khi_chua_co_anh(tmp_path):
    # Giả lập lệnh docker: "image inspect" thành công, tức máy đã có ảnh bd03/spark.
    gia = tmp_path / "docker"
    gia.write_text("#!/bin/sh\nexit 0\n")
    gia.chmod(0o755)
    moi_truong = dict(os.environ, PATH="{}:{}".format(tmp_path, os.environ["PATH"]))
    lenh = ["bash", os.path.join(GOC, "scripts", "cum", "khoi_dong_may.sh"), "labsit12", "--in-thu"]
    dong_spark = lambda kq: [d for d in kq.splitlines() if "docker-compose-worker.yml" in d][0]
    kq = subprocess.run(lenh, capture_output=True, text=True, check=True, env=moi_truong).stdout
    assert dong_spark(kq).endswith("up -d")  # đã có ảnh: không build lại
    kq = subprocess.run(lenh + ["--build"], capture_output=True, text=True, check=True, env=moi_truong).stdout
    assert dong_spark(kq).endswith("up -d --build")


def _ssh_gia(tmp_path):
    """Lệnh ssh giả: in tên máy và lệnh nhận được; máy labsit giả vờ lỗi (mã 3)."""
    gia = tmp_path / "ssh"
    gia.write_text(
        "#!/bin/bash\n"
        "while [ $# -gt 0 ]; do case \"$1\" in -o) shift 2;; -n|-t) shift;; *) break;; esac; done\n"
        "echo \"may=$1 lenh=$2\"\n"
        "[ \"$1\" = labsit ] && exit 3\n"
        "exit 0\n"
    )
    gia.chmod(0o755)
    return dict(os.environ, PATH="{}:{}".format(tmp_path, os.environ["PATH"]))


def test_ssh_tat_ca_chon_may_va_thu_tu(tmp_path):
    mt = _ssh_gia(tmp_path)
    tep = os.path.join(GOC, "scripts", "cum", "ssh_tat_ca.sh")
    chay = lambda *a: subprocess.run(["bash", tep, *a], capture_output=True, text=True, env=mt)
    kq = chay("hostname")
    may = [d.split()[0][4:] for d in kq.stdout.splitlines() if d.startswith("may=")]
    # 6 máy lab, master đứng đầu; không có máy web và máy Windows điều khiển
    assert may == ["labsoe-11", "labsit12", "labsit", "labsit-may25", "labsit-may26", "labsoe-18"]
    assert kq.returncode == 1 and "!! labsit: mã thoát 3" in kq.stdout
    assert len([d for d in chay("--vai-tro", "spark-worker", "x").stdout.splitlines() if d.startswith("may=")]) == 5
    assert "may=ctam lenh=uptime" in chay("--may", "ctam,labsit12", "uptime").stdout
    ss = chay("--song-song", "nproc").stdout
    assert ss.count("=====") == 6 and "[labsoe-18] may=labsoe-18 lenh=nproc" in ss
    cfg = chay("--tao-config").stdout
    assert cfg.count("Host ") == 7 and "HostName 10.68.71.205" in cfg and "10.68.71.59" not in cfg
    khoi = {b.split()[0]: b for b in cfg.split("Host ")[1:]}  # "HostName" không có dấu cách sau "Host"
    assert "User labsit12" in khoi["labsit12"] and "User hduser" in khoi["labsoe-11"] and "User labsit" in khoi["labsit-may26"]
    assert "chưa khai báo tài khoản" in cfg and "StrictHostKeyChecking accept-new" in cfg


def test_dags_airflow():
    pytest.importorskip("airflow.sdk")  # thư mục airflow/ của dự án không phải gói Airflow
    from airflow.dag_processing.dagbag import DagBag

    db = DagBag(dag_folder=os.path.join(GOC, "airflow", "dags"))
    assert db.import_errors == {}
    assert set(db.dags) == {"kn_pipeline_hang_ngay", "kn_giam_sat_streaming", "kn_tinh_ab", "kn_bao_tri", "kn_tai_lap"}
    lich = {k: d.schedule for k, d in db.dags.items()}
    assert lich["kn_pipeline_hang_ngay"] == "0 2 * * *" and lich["kn_giam_sat_streaming"] == "*/15 * * * *"
    assert lich["kn_tinh_ab"] == "0 * * * *" and lich["kn_bao_tri"] == "0 4 * * *" and lich["kn_tai_lap"] is None
    re_nhanh = db.dags["kn_pipeline_hang_ngay"].get_task("ndcg_co_cai_thien")
    assert re_nhanh.downstream_task_ids == {"sinh_goi_y_toan_bo", "giu_mo_hinh_cu"}


def test_do_zorder_tien_ich(spark, tmp_path):
    from bao_tri.do_zorder import phan_vi, so_tep_da_doc

    assert phan_vi([1, 2, 3, 4, 5], 0.5) == 3 and phan_vi([], 0.9) is None
    spark.range(100).repartition(4).write.parquet(str(tmp_path / "p"))
    df = spark.read.parquet(str(tmp_path / "p")).filter("id = 5")
    df.collect()
    assert so_tep_da_doc(df) == 4
