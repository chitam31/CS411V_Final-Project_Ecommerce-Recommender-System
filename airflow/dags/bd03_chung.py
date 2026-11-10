"""Tiện ích dùng chung cho 5 DAG của đề tài 3 (Airflow 3.3.1, airflow.sdk).

Airflow chỉ ĐIỀU PHỐI: mọi bước nặng là một spark-submit vào cụm qua ha_tang/spark/submit.sh
(docker exec vào container spark-master). Mỗi job in một dòng JSON ở cuối stdout; BashOperator
đẩy dòng cuối vào XCom để task sau đọc (ví dụ nhánh "NDCG có cải thiện?").
"""
import json
import logging
import os
import urllib.request
from datetime import datetime, timedelta

import pendulum

THU_MUC_DU_AN = os.environ.get("BD03_HOME", "/opt/bd03")
SPARK_MASTER_IP = os.environ.get("SPARK_MASTER_IP", "10.68.71.113")
WEBHDFS = os.environ.get("WEBHDFS", "http://{}:9870/webhdfs/v1".format(SPARK_MASTER_IP))
MUI_GIO = pendulum.timezone("Asia/Ho_Chi_Minh")
NGAY_BAT_DAU = pendulum.datetime(2026, 11, 1, tz=MUI_GIO)

nhat_ky = logging.getLogger("bd03")


def lenh_spark(ho_so, job, tham_so=""):
    """Lệnh bash nộp một job vào cụm Spark."""
    return "bash {}/ha_tang/spark/submit.sh {} {} {}".format(THU_MUC_DU_AN, ho_so, job, tham_so).strip()


def canh_bao(context):
    """on_failure_callback: ghi cảnh báo ra log của task và tệp logs/canh_bao.log."""
    ti = context.get("ti")
    noi_dung = "[CANH BAO] {} | dag={} task={} run={}".format(
        datetime.utcnow().isoformat(timespec="seconds"),
        getattr(ti, "dag_id", "?"),
        getattr(ti, "task_id", "?"),
        getattr(ti, "run_id", "?"),
    )
    nhat_ky.error(noi_dung)
    try:
        os.makedirs(os.path.join(THU_MUC_DU_AN, "logs"), exist_ok=True)
        with open(os.path.join(THU_MUC_DU_AN, "logs", "canh_bao.log"), "a", encoding="utf-8") as f:
            f.write(noi_dung + "\n")
    except OSError:
        pass


THAM_SO_MAC_DINH = {
    "owner": "nhom-bd03",
    "retries": 1,
    "retry_delay": timedelta(minutes=5),
    "on_failure_callback": canh_bao,
}


def doc_json_xcom(ti, task_id):
    """Đọc dòng JSON cuối mà job Spark in ra (đã được BashOperator đẩy vào XCom)."""
    gia_tri = ti.xcom_pull(task_ids=task_id)
    if not gia_tri:
        return {}
    if isinstance(gia_tri, dict):
        return gia_tri
    return json.loads(str(gia_tri).strip().splitlines()[-1])


def _webhdfs_mtime(duong_dan):
    """Thời điểm sửa đổi (ms) của một thư mục HDFS qua WebHDFS; None nếu không tồn tại."""
    url = "{}{}?op=GETFILESTATUS".format(WEBHDFS, duong_dan)
    try:
        with urllib.request.urlopen(url, timeout=15) as ph:
            return json.loads(ph.read().decode("utf-8"))["FileStatus"]["modificationTime"]
    except Exception:
        return None


def co_du_lieu_moi():
    """Sensor của DAG 1: bronze có lô mới hơn lần ghi silver gần nhất chưa?

    File sink ghi một tệp vào bronze/su_kien_v2/_spark_metadata sau mỗi lô thành công;
    Delta ghi một tệp vào silver/tuong_tac/_delta_log sau mỗi commit. So hai mốc là đủ,
    không cần khởi động Spark chỉ để kiểm tra.
    """
    bronze = _webhdfs_mtime("/lake/bronze/su_kien_v2/_spark_metadata")
    silver = _webhdfs_mtime("/lake/silver/tuong_tac/_delta_log")
    nhat_ky.info("mtime bronze=%s silver=%s", bronze, silver)
    if bronze is None:
        return False
    return silver is None or bronze > silver
