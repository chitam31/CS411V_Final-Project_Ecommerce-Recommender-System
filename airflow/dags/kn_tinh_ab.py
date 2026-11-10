"""DAG 3 - kn_tinh_ab (0 * * * *).

Đọc CDF của gold.nhat_ky_hien_thi -> tổng hợp các ngày có thay đổi -> z-test -> MERGE vào
gold.ket_qua_ab kèm phien_ban_delta_du_lieu.
"""
from datetime import timedelta

from airflow.providers.standard.operators.bash import BashOperator
from airflow.sdk import DAG

from bd03_chung import NGAY_BAT_DAU, THAM_SO_MAC_DINH, lenh_spark

with DAG(
    dag_id="kn_tinh_ab",
    schedule="0 * * * *",
    start_date=NGAY_BAT_DAU,
    catchup=False,
    max_active_runs=1,
    default_args=THAM_SO_MAC_DINH,
    dagrun_timeout=timedelta(minutes=50),
    tags=["bd03", "ab"],
) as dag:
    BashOperator(task_id="tinh_ket_qua_ab", bash_command=lenh_spark("lo", "transform/tinh_ket_qua_ab.py"))
