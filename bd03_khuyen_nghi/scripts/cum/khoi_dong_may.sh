#!/usr/bin/env bash
# khoi_dong_may.sh - chạy trên TỪNG máy của cụm. Tự nhận ra máy mình qua IP ZeroTier,
# sinh tệp .env cho các docker compose rồi bật đúng các dịch vụ theo vai trò trong cau_hinh/cum.env.
#
#   bash scripts/cum/khoi_dong_may.sh              # tự nhận máy, bật dịch vụ
#   bash scripts/cum/khoi_dong_may.sh labsit12     # chỉ định tên máy
#   bash scripts/cum/khoi_dong_may.sh --in-thu     # chỉ in lệnh, không chạy
#   bash scripts/cum/khoi_dong_may.sh --dung       # dừng các dịch vụ của máy này
set -euo pipefail
THU_MUC="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
. "$THU_MUC/cau_hinh/cum.env"

IN_THU=0; DUNG=0; TEN_CHI_DINH=""
for a in "$@"; do
  case "$a" in
    --in-thu) IN_THU=1 ;;
    --dung) DUNG=1 ;;
    *) TEN_CHI_DINH="$a" ;;
  esac
done

chay() { echo "+ $*"; [ "$IN_THU" = "1" ] || "$@"; }

IP_CUA_MAY="$( (ip -4 -o addr show 2>/dev/null || true) | awk '{print $4}' | cut -d/ -f1 | tr '\n' ' ')"
DONG=""
for bien in $(compgen -v MAY_); do
  IFS='|' read -r ten ip vai_tro so_loi bo_nho <<< "${!bien}"
  if [ -n "$TEN_CHI_DINH" ] && [ "$ten" = "$TEN_CHI_DINH" ]; then DONG="${!bien}"; break; fi
  if [ -z "$TEN_CHI_DINH" ] && [[ " $IP_CUA_MAY " == *" $ip "* ]]; then DONG="${!bien}"; break; fi
done
if [ -z "$DONG" ]; then
  echo "Không tìm thấy máy này trong cau_hinh/cum.env (IP hiện có: $IP_CUA_MAY)."
  echo "Kiểm tra: sudo zerotier-cli listnetworks  (phải thấy mạng 633e31d8a29b038c và IP 10.68.71.x)"
  exit 1
fi
IFS='|' read -r TEN NODE_IP VAI_TRO SO_LOI BO_NHO <<< "$DONG"
echo "== Máy $TEN ($NODE_IP), vai trò: $VAI_TRO"

# Tệp .env cho từng docker compose (không đưa lên Git). Tệp được sinh lại mỗi lần chạy;
# cấu hình riêng của máy (mật khẩu, WEB_CHE_DO...) đặt trong .env.rieng cùng thư mục,
# nội dung tệp đó được nối vào cuối .env nên không bị mất.
ghi_env() {
  [ "$IN_THU" = "1" ] && { echo "+ ghi $1"; return; }
  printf '%s\n' "${@:2}" > "$1"
  [ -f "$1.rieng" ] && cat "$1.rieng" >> "$1"
  return 0
}
ghi_env "$THU_MUC/ha_tang/hadoop/.env" "NODE_IP=$NODE_IP" "COMPOSE_PROJECT_NAME=${COMPOSE_PROJECT_NAME:-hadoop-cluster}"
ghi_env "$THU_MUC/ha_tang/spark/.env" "NODE_IP=$NODE_IP" "SPARK_MASTER_IP=$SPARK_MASTER_IP" "SO_LOI=$SO_LOI" "BO_NHO=$BO_NHO" \
  "HDFS_GOC=$HDFS_GOC" "KAFKA_BROKER=$KAFKA_BROKER"
ghi_env "$THU_MUC/ha_tang/kafka/.env" "NODE_IP=$NODE_IP"
ghi_env "$THU_MUC/ha_tang/web/.env" "NODE_IP=$NODE_IP" "HDFS_GOC=$HDFS_GOC" "KAFKA_BROKER=$KAFKA_BROKER"

HADOOP="docker compose -f $THU_MUC/ha_tang/hadoop/docker-compose.yml --env-file $THU_MUC/ha_tang/hadoop/.env"
SPARK_M="docker compose -f $THU_MUC/ha_tang/spark/docker-compose-master.yml --env-file $THU_MUC/ha_tang/spark/.env"
SPARK_W="docker compose -f $THU_MUC/ha_tang/spark/docker-compose-worker.yml --env-file $THU_MUC/ha_tang/spark/.env"
KAFKA="docker compose -f $THU_MUC/ha_tang/kafka/docker-compose.yml --env-file $THU_MUC/ha_tang/kafka/.env"
WEB="docker compose -f $THU_MUC/ha_tang/web/docker-compose.yml --env-file $THU_MUC/ha_tang/web/.env"
AIRFLOW="docker compose -f $THU_MUC/ha_tang/airflow/docker-compose.yml"

co_vai() { [[ ",$VAI_TRO," == *",$1,"* ]]; }

if [ "$DUNG" = "1" ]; then
  co_vai web && chay $WEB down
  co_vai airflow && chay $AIRFLOW down
  co_vai spark-worker && chay $SPARK_W down
  co_vai spark-master && chay $SPARK_M down
  co_vai kafka && chay $KAFKA down
  co_vai datanode && chay $HADOOP stop worker
  co_vai namenode && chay $HADOOP stop master
  exit 0
fi

co_vai namenode && chay $HADOOP up -d master
co_vai datanode && chay $HADOOP up -d worker
co_vai kafka && chay $KAFKA up -d
co_vai spark-master && chay $SPARK_M up -d --build
co_vai spark-worker && chay $SPARK_W up -d --build
if co_vai airflow; then
  if [ -f "$THU_MUC/ha_tang/airflow/.env" ] && [ -f "$THU_MUC/ha_tang/airflow/mat_khau.json" ]; then
    chay $AIRFLOW up -d --build
  else
    echo "!! Chưa có ha_tang/airflow/.env và mat_khau.json: sao chép từ .env.mau, mat_khau.json.mau rồi chạy lại."
  fi
fi
if co_vai web; then
  # Ảnh web kế thừa bd03/spark: build ảnh Spark trước nếu máy này chưa có.
  docker image inspect bd03/spark:3.5.3 > /dev/null 2>&1 || chay docker build -t bd03/spark:3.5.3 "$THU_MUC/ha_tang/spark"
  chay $WEB up -d --build
fi
if co_vai may-demo; then
  echo "Máy demo: mở trình duyệt tới http://10.68.71.205:8000 (web), http://$SPARK_MASTER_IP:8080 (Spark), :9870 (HDFS), :8088 (Airflow)"
fi
echo "== Xong. Kiểm tra toàn cụm: bash scripts/cum/kiem_tra_cum.sh"
