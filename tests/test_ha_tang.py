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
    assert "chưa khai báo tài khoản" in cfg and "StrictHostKeyChecking accept-new" in cfg and "ConnectTimeout 20" in cfg
    kich_ban = tmp_path / "s.sh"  # tên khác "tep": lambda chay đang dùng biến tep
    kich_ban.write_text("hostname\n")
    kq = chay("--song-song", "--chay-tep", str(kich_ban))
    assert kq.stdout.count("lenh=bash -s --") == 6 and "10.68.71.182" not in kq.stdout


def test_ssh_tat_ca_dong_bo_ma(tmp_path):
    """--dong-bo-ma: git push qua ssh giả (chạy lệnh ngay trên máy này, mỗi máy một HOME riêng).

    Dùng một repo tạm chứa bản sao script và danh bạ, không đụng tới repo thật."""
    import shutil
    repo = tmp_path / "repo"
    (repo / "scripts" / "cum").mkdir(parents=True)
    (repo / "cau_hinh").mkdir()
    shutil.copy(os.path.join(GOC, "scripts", "cum", "ssh_tat_ca.sh"), repo / "scripts" / "cum")
    shutil.copy(os.path.join(GOC, "cau_hinh", "cum.env"), repo / "cau_hinh")
    danh_tinh = dict(os.environ, GIT_AUTHOR_NAME="t", GIT_AUTHOR_EMAIL="t@t", GIT_COMMITTER_NAME="t",
                     GIT_COMMITTER_EMAIL="t@t")
    git = lambda *a: subprocess.run(["git", "-C", str(repo), *a], check=True, capture_output=True, env=danh_tinh)
    git("init", "-q", "-b", "main")
    git("add", "-A")
    git("commit", "-q", "-m", "ban dau")

    goc_may = tmp_path / "may"
    gia = tmp_path / "bin" / "ssh"
    gia.parent.mkdir()
    gia.write_text(
        "#!/bin/bash\n"
        "while [ $# -gt 0 ]; do case \"$1\" in -o|-p) shift 2;; -G) exit 0;; -*) shift;; *) break;; esac; done\n"
        "h=\"$1\"; shift; mkdir -p \"$GOC_MAY/$h\"; cd \"$GOC_MAY/$h\"\n"
        "HOME=\"$GOC_MAY/$h\" exec bash -c \"$*\"\n"
    )
    gia.chmod(0o755)
    mt = dict(danh_tinh, PATH="{}:{}".format(gia.parent, os.environ["PATH"]), GOC_MAY=str(goc_may),
              GIT_SSH_VARIANT="ssh")
    lenh = ["bash", str(repo / "scripts" / "cum" / "ssh_tat_ca.sh"), "--may", "labsit12,labsoe-18", "--dong-bo-ma"]
    chay = lambda: subprocess.run(lenh, capture_output=True, text=True, env=mt)

    kq = chay()
    assert kq.returncode == 0, kq.stdout + kq.stderr
    (repo / "GHI_CHU.md").write_text("ban moi\n")
    git("add", "-A")
    git("commit", "-q", "-m", "ban moi")
    kq = chay()  # máy đích đã có repo: push cập nhật, thư mục làm việc phải có tệp mới
    assert kq.returncode == 0, kq.stdout + kq.stderr
    for may in ("labsit12", "labsoe-18"):
        assert (goc_may / may / "bd03_khuyen_nghi" / "GHI_CHU.md").read_text() == "ban moi\n"

    # Tệp bị sửa tay trên máy đích: push phải bị từ chối thay vì ghi đè
    (goc_may / "labsit12" / "bd03_khuyen_nghi" / "GHI_CHU.md").write_text("sua tay\n")
    git("commit", "-q", "--allow-empty", "-m", "ban thu ba")
    kq = chay()
    assert kq.returncode == 1 and "!! labsit12: git push thất bại" in kq.stdout
    assert (goc_may / "labsit12" / "bd03_khuyen_nghi" / "GHI_CHU.md").read_text() == "sua tay\n"


def test_do_mang_chi_ping(tmp_path):
    """do_mang.sh --chi-ping: hỏi IP LAN từng máy, ping chéo qua ZeroTier và LAN, phân loại đúng nguyên nhân."""
    tep = os.path.join(GOC, "scripts", "cum", "ssh_tat_ca.sh")
    ds = subprocess.run(["bash", tep, "--liet-ke"], capture_output=True, text=True, check=True).stdout.split("\n")
    assert ds[0] == "labsoe-11 10.68.71.113" and len([d for d in ds if d]) == 6
    bin_gia = tmp_path / "bin"
    bin_gia.mkdir()
    lenh_gia = {
        # ssh giả: chạy lệnh ngay trên máy này, báo tên máy cho các lệnh giả qua biến MAY
        "ssh": "while [ $# -gt 0 ]; do case \"$1\" in -o) shift 2;; -*) shift;; *) break;; esac; done\n"
               "h=\"$1\"; shift; MAY=\"$h\" exec bash -c \"$*\"\n",
        # mỗi máy: đuôi IP ZeroTier và đuôi IP LAN (192.168.80.x) như kết quả đo ngày 10/11
        "ip": "case \"$MAY\" in labsoe-11) z=113 l=103;; labsit12) z=198 l=156;; labsit) z=204 l=127;;\n"
              "  labsit-may25) z=42 l=135;; labsit-may26) z=90 l=155;; *) z=149 l=234;; esac\n"
              "case \"$*\" in 'route get 1.1.1.1') echo \"1.1.1.1 via 192.168.80.254 dev wlo1 src 192.168.80.$l uid 1\";;\n"
              "  route) echo 'default via 192.168.80.254 dev wlo1';; *) echo \"5: zt inet 10.68.71.$z/24 scope global zt\";; esac\n",
        # .204 đi relay nhưng LAN của nó thông; .42 đi relay và LAN của nó không trả lời;
        # .90 chậm cả qua ZeroTier lẫn LAN (Wi-Fi nghẽn, vẫn nối thẳng)
        "ping": "d=\"${@: -1}\"; echo '4 packets transmitted'\n"
                "case \"$d\" in 10.68.71.204) echo 'rtt min/avg/max/mdev = 200/312.5/700/90 ms';;\n"
                "  10.68.71.42) echo 'rtt min/avg/max/mdev = 150/201.8/260/30 ms';; 192.168.80.135) exit 1;;\n"
                "  10.68.71.90) echo 'rtt min/avg/max/mdev = 60/80.2/99/9 ms';;\n"
                "  192.168.80.155) echo 'rtt min/avg/max/mdev = 50/75.4/90/9 ms';;\n"
                "  *) echo 'rtt min/avg/max/mdev = 3/4.5/7/1 ms';; esac\n",
    }
    for ten, noi_dung in lenh_gia.items():
        (bin_gia / ten).write_text("#!/bin/bash\n" + noi_dung)
        (bin_gia / ten).chmod(0o755)
    mt = dict(os.environ, PATH="{}:{}".format(bin_gia, os.environ["PATH"]))
    kq = subprocess.run(["bash", os.path.join(GOC, "scripts", "cum", "do_mang.sh"), "--chi-ping"],
                        capture_output=True, text=True, env=mt)
    assert kq.returncode == 0, kq.stdout + kq.stderr
    assert kq.stdout.count("=====") == 6 and "Phần 2" not in kq.stdout
    dong = [d for d in kq.stdout.splitlines() if d.startswith("[labsit12] ping")]
    assert len(dong) == 5  # bỏ qua chính IP ZeroTier của máy
    tim = lambda ip: [d for d in dong if "ping " + ip + " " in d][0]
    assert "192.168.80.127" in tim("10.68.71.204") and "RELAY du LAN thong" in tim("10.68.71.204")
    assert "Wi-Fi chan" in tim("10.68.71.42")
    assert tim("10.68.71.90").endswith("| noi thang, Wi-Fi dang cham")
    assert tim("10.68.71.113").endswith("| noi thang")
    assert "20 cặp nối thẳng, 10 cặp đi relay (5 cặp LAN vẫn thông), 0 cặp không ping được" in kq.stdout
    assert "cau_hinh_zerotier.sh" in kq.stdout


def test_chay_lan_dau_tu_buoc(tmp_path):
    """TU_BUOC: chạy tiếp từ bước bị lỗi; từ bước 6 bắt buộc có MA_CHAY của lần tuning trước."""
    nhat_ky = tmp_path / "docker.log"
    gia = tmp_path / "docker"
    gia.write_text("#!/bin/bash\necho \"$*\" >> {}\nexit 0\n".format(nhat_ky))
    gia.chmod(0o755)
    mt = dict(os.environ, PATH="{}:{}".format(tmp_path, os.environ["PATH"]), LUOI="toi_thieu")
    tep = os.path.join(GOC, "scripts", "chay_lan_dau.sh")

    def cac_job(**bien):
        if nhat_ky.exists():
            nhat_ky.unlink()
        kq = subprocess.run(["bash", tep], capture_output=True, text=True, env=dict(mt, **bien))
        dong = nhat_ky.read_text().splitlines() if nhat_ky.exists() else []
        return kq, [d.split("/opt/spark/jobs/")[-1] for d in dong if "spark-submit" in d]

    kq, job = cac_job(TU_BUOC="4")
    assert kq.returncode == 0, kq.stdout + kq.stderr
    assert job[0] == "transform/bronze_to_silver.py" and len(job) == 12  # bước 4-8
    assert not any("khoi_tao_bang" in j or "nhap_danh_muc" in j or "nap_su_kien" in j for j in job)
    assert any(j.startswith("ml/huan_luyen_als.py") and "--luoi toi_thieu" in j for j in job)

    kq, job = cac_job(TU_BUOC="6")
    assert kq.returncode == 2 and "MA_CHAY" in kq.stderr and job == []

    kq, job = cac_job(TU_BUOC="6", MA_CHAY="r20261110T120000")
    assert kq.returncode == 0 and job[0] == "ml/sinh_goi_y_toan_bo.py --ma-chay r20261110T120000"


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
