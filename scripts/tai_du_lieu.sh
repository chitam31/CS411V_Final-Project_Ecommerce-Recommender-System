#!/usr/bin/env bash
# tai_du_lieu.sh - tải RetailRocket từ Kaggle về máy master và đưa lên HDFS /lake/landing.
# Cần: pip install kaggle, và tệp ~/.kaggle/kaggle.json (Kaggle -> Settings -> API -> Create New Token).
#
#   bash scripts/tai_du_lieu.sh /data/retailrocket
set -euo pipefail
DICH="${1:-/data/retailrocket}"
mkdir -p "$DICH"
if [ ! -f "$DICH/events.csv" ]; then
  kaggle datasets download -d retailrocket/ecommerce-dataset -p "$DICH" --unzip
fi
ls -lh "$DICH"

# Đưa lên HDFS qua container hadoop-master (máy master). NameNode vừa khởi động nằm ở safe mode
# (từ chối ghi) cho tới khi các DataNode báo cáo xong: chờ thay vì để lệnh ghi thất bại.
echo "Chờ NameNode ra khỏi safe mode..."
docker exec hadoop-master hdfs dfsadmin -safemode wait
docker exec hadoop-master hdfs dfs -mkdir -p /lake/landing/retailrocket
for t in events.csv item_properties_part1.csv item_properties_part2.csv category_tree.csv; do
  [ -f "$DICH/$t" ] || { echo "Thiếu tệp $DICH/$t" >&2; exit 1; }
  echo "Đưa $t lên HDFS ($(du -h "$DICH/$t" | cut -f1))..."
  docker cp "$DICH/$t" "hadoop-master:/tmp/$t"
  docker exec hadoop-master hdfs dfs -put -f "/tmp/$t" "/lake/landing/retailrocket/$t"
  docker exec hadoop-master rm -f "/tmp/$t"
done
docker exec hadoop-master hdfs dfs -ls -h /lake/landing/retailrocket
echo "events.csv cũng cần có trên máy Kafka (labsit) để chạy bộ phát: scp $DICH/events.csv <user>@10.68.71.204:/data/retailrocket/"
