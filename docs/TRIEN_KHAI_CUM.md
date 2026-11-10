# Triển khai trên cụm 8 máy

Tài liệu đi theo đúng thứ tự bật cụm. Mỗi lệnh ghi rõ chạy **trên máy nào**. Mọi máy dùng cùng một bản mã (clone từ repo của nhóm) và cùng danh bạ `cau_hinh/cum.env`; script `scripts/cum/khoi_dong_may.sh` tự nhận ra máy qua IP ZeroTier và chỉ bật dịch vụ đúng vai trò.

| # | Máy | IP | Dịch vụ sẽ chạy |
|---|---|---|---|
| 1 | labsoe-11 (master) | 10.68.71.113 | hadoop-master, spark-master, Airflow |
| 2 | labsit12 | 10.68.71.198 | hadoop-worker, spark-worker |
| 3 | labsit | 10.68.71.204 | hadoop-worker, spark-worker, kafka-server, kafka-ui, bộ phát |
| 4 | labsit-may25 | 10.68.71.42 | hadoop-worker, spark-worker |
| 5 | labsit-may26 | 10.68.71.90 | hadoop-worker, spark-worker |
| 6 | labsoe-18 | 10.68.71.149 | hadoop-worker, spark-worker |
| 7 | Ctam (Linux) | 10.68.71.205 | bd03-web |
| 8 | Windows cá nhân | 10.68.71.59 | trình duyệt, script demo |
| 9 | Laptop Windows `Whitehathacker` | 10.68.71.182 | điều khiển cụm qua SSH (mục 1.5), trình chiếu |

---

## 0. Nếu máy đang chạy cụm cũ của nhóm

Dự án mới giữ nguyên **tên project compose** (`hadoop-cluster`, `spark-cluster`, `kafka-docker`) nên dùng lại đúng các volume cũ (`hadoop-cluster_namenode_data`, `hadoop-cluster_worker_data`, `kafka-docker_kafka_data`). Dữ liệu HDFS đã có không mất.

```bash
# Trên mỗi máy, trong thư mục repo CŨ tương ứng:
docker compose down                    # KHÔNG thêm -v (sẽ xóa volume dữ liệu)
docker compose -f docker-compose-worker.yml down   # với spark-cluster trên máy worker
```

Nếu máy từng chạy từ thư mục `hadoop-custom` (giống hệt `hadoop-cluster`), volume mang tên `hadoop-custom_...`; khi đó đặt `export COMPOSE_PROJECT_NAME=hadoop-custom` trước khi chạy `khoi_dong_may.sh`. Kiểm tra bằng `docker volume ls | grep -E "hadoop|kafka"`.

---

## 1. Chuẩn bị chung trên MỖI máy Linux (máy 1–7)

### 1.1. ZeroTier

```bash
curl -s https://install.zerotier.com | sudo bash          # nếu chưa cài
sudo zerotier-cli join 633e31d8a29b038c
sudo zerotier-cli listnetworks       # phải thấy trạng thái OK và IP 10.68.71.x
ip -4 addr | grep 10.68.71           # IP này phải trùng với cau_hinh/cum.env
```

Máy mới phải được quản trị mạng bấm **Authorize** trên ZeroTier Central. IP ZeroTier cố định theo máy; nếu khác danh bạ, sửa `cau_hinh/cum.env` rồi commit để cả nhóm dùng chung.

### 1.2. Docker, Git, Python

```bash
sudo apt-get update && sudo apt-get install -y docker.io docker-compose-v2 git python3 python3-pip chrony
sudo usermod -aG docker $USER && newgrp docker
docker compose version            # cần Compose v2
timedatectl status | grep synchronized   # đồng hồ phải đồng bộ (Kafka, watermark, Airflow)
```

### 1.2b. Không cho máy tự ngủ

Ubuntu có giao diện mặc định có thể tự ngủ khi không ai dùng, kể cả ở màn hình đăng nhập; máy ngủ thì cụm mất DataNode, worker hoặc cả master. Sau khi xin phép phòng máy, tắt chế độ ngủ cho máy trong cụm (gỡ lại bằng `unmask` khi trả máy):

```bash
sudo systemctl mask sleep.target suspend.target hibernate.target hybrid-sleep.target
```

Từ máy điều khiển có thể làm cho cả 6 máy một lần: `bash scripts/cum/ssh_tat_ca.sh --tty "sudo systemctl mask sleep.target suspend.target hibernate.target hybrid-sleep.target"`.

### 1.3. Tường lửa

Spark executor mở cổng ngẫu nhiên cho block manager; cách đơn giản và an toàn trong mạng riêng là **cho phép mọi kết nối đi vào từ giao diện ZeroTier**:

```bash
sudo ufw status
sudo ufw allow in on zt+ comment "ZeroTier ttunet - cum bd03"
```

(Nếu không dùng ufw thì bỏ qua.)

### 1.4. Đưa mã lên máy và tài nguyên của từng máy

**Cách khuyên dùng — đẩy mã từ máy điều khiển qua SSH** (cần làm mục 1.5 trước). Repo để private, còn các tài khoản lab dùng chung, nên không đặt token GitHub trên máy lab. Chỉ máy điều khiển kéo mã từ GitHub, rồi đẩy sang `~/bd03_khuyen_nghi` của 6 máy:

```bash
# Trong Git Bash trên máy điều khiển, thư mục repo
git pull
bash scripts/cum/ssh_tat_ca.sh --tty "sudo apt-get install -y git"   # nếu máy lab chưa có git
bash scripts/cum/ssh_tat_ca.sh --dong-bo-ma
```

Mỗi lần có bản mới trên GitHub: `git pull` rồi `--dong-bo-ma` lại. Máy đích nào có tệp bị sửa tay thì git từ chối cập nhật máy đó thay vì ghi đè; mọi chỉnh sửa (kể cả `cau_hinh/cum.env`) làm trong repo rồi đẩy đi. Các tệp sinh ra khi chạy (`ha_tang/*/.env`, `jobs/common.zip`, `logs/`) nằm trong `.gitignore` nên không cản việc cập nhật.

Cách thay thế: `git clone` trực tiếp trên từng máy, gõ token chỉ đọc khi git hỏi mật khẩu (không lưu token vào URL).

**Tài nguyên** đã đo ngày 10/11/2026 bằng `scripts/cum/khao_sat_may.sh`: cả 6 máy lab đều **12 lõi, 7 GB RAM**, nên RAM là giới hạn chính. `cau_hinh/cum.env` giao cho Spark 3 GB RAM ở labsit12, labsit-may26, labsoe-18; 2 GB ở labsit (có Kafka) và labsit-may25 (đang chạy ứng dụng của nhóm khác). Mỗi executor dùng 2 GB nên phải nhỏ hơn hoặc bằng `bo_nho` nhỏ nhất, nếu không máy đó sẽ không nhận được executor nào. Khi đổi máy hoặc thêm máy, chạy lại khảo sát và sửa theo cùng quy tắc: chừa khoảng 2 GB cho Ubuntu có giao diện, 1 GB cho DataNode, cộng RAM của các dịch vụ khác đang chạy trên máy.

**Máy dùng chung với nhóm khác:** labsit-may25 đang chạy `coffeehouse-face-*` (cùng PostgreSQL, MySQL, RabbitMQ), labsit-may26 đang chạy `airflow-worker-kafka`. Không dừng, không xóa các container này. Các container đã dừng từ lâu cũng không phải của dự án, cứ để nguyên.

**Máy master:** ngoài NameNode, Spark Master và Airflow, mọi driver Spark cũng chạy trên máy này (PySpark ở standalone không hỗ trợ cluster deploy mode). Nên dừng DataNode cũ đang chạy trên master để nhường RAM; volume vẫn giữ nguyên:

```bash
ssh labsoe-11 docker stop hadoop-worker
```

Xem trước những gì script sẽ làm, không chạy thật:

```bash
bash scripts/cum/khoi_dong_may.sh --in-thu
```

### 1.5. Điều khiển cả cụm từ máy cá nhân qua SSH (tùy chọn, nên làm)

Mọi máy đã chung mạng ZeroTier nên máy cá nhân (Windows 10.68.71.59) SSH thẳng tới IP `10.68.71.x` được. Cần xin phép phòng máy trước khi bật SSH server trên máy của trường.

**Trên mỗi máy lab, làm một lần tại chỗ:**

```bash
sudo apt-get install -y openssh-server tmux
sudo systemctl enable --now ssh
sudo ufw allow in on zt+ to any port 22 proto tcp     # nếu dùng ufw: chỉ mở SSH trên giao diện ZeroTier
whoami                                                # tên tài khoản: khai báo vào TAI_KHOAN_SSH trong cau_hinh/cum.env
```

**Trên máy cá nhân, mở cửa sổ Git Bash** (menu Start → *Git Bash*). Không gõ `bash ...` trong PowerShell: lệnh đó gọi WSL chứ không phải Git Bash (lỗi `Bash/Service/RPC_S_CALL_FAILED`), và PowerShell 5.1 ghi `>` / `>>` theo mã UTF-16 làm hỏng `~/.ssh/config`.

```bash
cd "/d/BIG DATA/bd03_khuyen_nghi" && git pull                     # thư mục chứa repo trên máy Windows
ssh-keygen -t ed25519 -C "bd03"                                   # nếu chưa có khóa; Enter để giữ mặc định
bash scripts/cum/ssh_tat_ca.sh --tao-config > ~/.ssh/config       # ghi đè: Host, IP, tài khoản lấy từ cum.env
bash scripts/cum/ssh_tat_ca.sh --chep-khoa                        # nhập mật khẩu mỗi máy một lần
bash scripts/cum/ssh_tat_ca.sh hostname                           # không còn hỏi mật khẩu là xong
```

Nếu `~/.ssh/config` đang có cấu hình của việc khác, sao lưu trước (`cp ~/.ssh/config ~/.ssh/config.bak`) rồi chép phần cần giữ vào sau. Cấu hình sinh ra có `StrictHostKeyChecking accept-new`: lần đầu nối tới máy nào thì tự ghi nhận khóa của máy đó, nhưng vẫn từ chối nếu khóa đã biết bị thay đổi.

Khi đăng nhập bằng khóa đã chạy trên mọi máy, nên tắt đăng nhập bằng mật khẩu: sửa `PasswordAuthentication no` trong `/etc/ssh/sshd_config`, rồi `sudo systemctl restart ssh`. Chỉ làm khi phiên SSH bằng khóa đang mở, để không tự khóa mình ở ngoài.

**Dùng hằng ngày:**

```bash
bash scripts/cum/ssh_tat_ca.sh "cd ~/bd03_khuyen_nghi && git pull -q && git log --oneline -1"
bash scripts/cum/ssh_tat_ca.sh "cd ~/bd03_khuyen_nghi && bash scripts/cum/khoi_dong_may.sh"   # lần lượt, master trước
bash scripts/cum/ssh_tat_ca.sh --song-song "nproc; free -g | head -2"
bash scripts/cum/ssh_tat_ca.sh --tty "sudo apt-get install -y chrony"     # lệnh cần mật khẩu sudo
bash scripts/cum/ssh_tat_ca.sh --song-song --chay-tep scripts/cum/khao_sat_may.sh   # khảo sát lõi, RAM, đĩa, Docker, repo của cả 6 máy
ssh -t labsoe-11 tmux new -A -s bd03                                      # vào master trong tmux
```

Việc chạy lâu (bộ phát dữ liệu, `chay_lan_dau.sh`) phải chạy **trong tmux** trên máy đích: máy cá nhân ngủ hoặc rớt mạng thì phiên SSH đứt, nhưng tmux vẫn giữ tiến trình chạy tiếp. Gõ `Ctrl+B` rồi `D` để thoát mà không dừng; vào lại bằng đúng lệnh `tmux new -A -s bd03`.

---

## 2. Máy 1 — labsoe-11 (10.68.71.113): NameNode, Spark Master, Airflow

### 2.1. HDFS và Spark Master

```bash
cd ~/bd03_khuyen_nghi
bash scripts/cum/khoi_dong_may.sh
```

Script sinh `ha_tang/hadoop/.env`, `ha_tang/spark/.env`, rồi chạy `hadoop-master` và build ảnh `bd03/spark:3.5.3` (thêm numpy, jar Delta 3.2.0 và Kafka connector vào `apache/spark:3.5.3`). Lần build đầu cần Internet tới PyPI và Maven Central.

Script chỉ build ảnh khi máy chưa có (thêm `--build` để buộc build lại sau khi sửa `ha_tang/spark/Dockerfile`). Nếu các máy worker không ra được Internet, build một lần trên master rồi chép ảnh sang:

```bash
# Trên master
docker save bd03/spark:3.5.3 | gzip > /tmp/bd03_spark.tar.gz
scp /tmp/bd03_spark.tar.gz <user>@10.68.71.198:/tmp/      # lặp lại cho từng worker
# Trên mỗi worker, trước khi chạy khoi_dong_may.sh
gunzip -c /tmp/bd03_spark.tar.gz | docker load
```

Kiểm tra:

```bash
docker ps --format "table {{.Names}}\t{{.Status}}"
curl -s http://localhost:9870 > /dev/null && echo "HDFS UI OK"
curl -s http://localhost:8080/json/ | python3 -m json.tool | head
docker exec spark-master ls /opt/spark/jars | grep -E "delta|kafka"     # phải thấy 2 jar delta, 4 jar kafka
```

### 2.2. Airflow

```bash
cd ~/bd03_khuyen_nghi/ha_tang/airflow
cp .env.mau .env
cp mat_khau.json.mau mat_khau.json
getent group docker | cut -d: -f3          # điền vào DOCKER_GID
openssl rand -hex 32                       # điền vào AIRFLOW__API_AUTH__JWT_SECRET
python3 -c "import base64,os;print(base64.urlsafe_b64encode(os.urandom(32)).decode())"   # FERNET_KEY
nano .env              # BD03_HOST_DIR=/home/<user>/bd03_khuyen_nghi (đường dẫn tuyệt đối)
nano mat_khau.json     # {"admin": "<mật khẩu mạnh>"}
cd ~/bd03_khuyen_nghi && bash scripts/cum/khoi_dong_may.sh      # chạy lại để bật Airflow
```

Mở http://10.68.71.113:8088 (cổng 8080 đã dành cho Spark Master UI), đăng nhập `admin`. Năm DAG `kn_*` sẽ xuất hiện ở trạng thái tạm dừng. Chưa bật DAG cho tới bước 9.

Kiểm tra Airflow gọi được Spark:

```bash
docker exec bd03-airflow-airflow-scheduler-1 docker ps --format "{{.Names}}" | grep spark-master
```

---

## 3. Máy 2, 4, 5, 6 — labsit12, labsit-may25, labsit-may26, labsoe-18: DataNode + Spark Worker

```bash
cd ~/bd03_khuyen_nghi
bash scripts/cum/khoi_dong_may.sh
```

Script sinh `.env` với `NODE_IP` của chính máy, bật `hadoop-worker` (DataNode khai báo `dfs.datanode.hostname = NODE_IP`) và `spark-worker` (`--host NODE_IP --cores SO_LOI --memory BO_NHO`, `network_mode: host`).

Kiểm tra từ máy master:

```bash
docker exec hadoop-master hdfs dfsadmin -report | grep -E "Name:|Live datanodes"
curl -s http://10.68.71.113:8080/json/ | python3 -c "import json,sys;[print(w['host'],w['state'],w['cores']) for w in json.load(sys.stdin)['workers']]"
```

Mỗi worker phải hiện đúng IP ZeroTier của nó, trạng thái `ALIVE`.

---

## 4. Máy 3 — labsit (10.68.71.204): DataNode, Spark Worker, Kafka, bộ phát

### 4.1. Dịch vụ

```bash
cd ~/bd03_khuyen_nghi
bash scripts/cum/khoi_dong_may.sh        # DataNode, Spark Worker, Kafka (+ kafka-ui :8080)
bash scripts/tao_topic.sh                # retailrocket-events (giữ nếu đã có) và hien-thi, 3 phân vùng
```

Kafka quảng bá `PLAINTEXT://10.68.71.204:9092`. Bản compose mới thêm `KAFKA_LOG_DIRS=/var/lib/kafka/data` để volume thật sự giữ dữ liệu khi tạo lại container (bản cũ ghi vào `/tmp/kraft-combined-logs` bên trong container).

### 4.2. Dữ liệu cho bộ phát

```bash
mkdir -p /data/retailrocket
# Cách 1: chép từ máy master sau khi tải ở bước 7
scp <user>@10.68.71.113:/data/retailrocket/events.csv /data/retailrocket/
# Cách 2: tải trực tiếp (cần ~/.kaggle/kaggle.json)
pip3 install --user kaggle && kaggle datasets download -d retailrocket/ecommerce-dataset -p /data/retailrocket --unzip
pip3 install --user kafka-python
```

Bộ phát được bật ở bước 8.

---

## 5. Máy 7 — Ctam (10.68.71.205): web

```bash
cd ~/bd03_khuyen_nghi
# Cấu hình riêng của máy: khoi_dong_may.sh nối tệp này vào ha_tang/web/.env mỗi lần chạy.
echo "AIRFLOW_PASS=<mật khẩu admin Airflow>" > ha_tang/web/.env.rieng   # để nút "Chạy lại mô hình" gọi được DAG 5
bash scripts/cum/khoi_dong_may.sh        # build bd03/spark nếu chưa có, rồi build và chạy bd03-web
curl -s http://localhost:8000/api/suc-khoe        # {"che_do": "delta", "kafka": "GuiKafka"}
```

Web dùng `network_mode: host` vì Spark cục bộ trong web phải nói chuyện trực tiếp với các DataNode qua ZeroTier.

Trước khi có dữ liệu thật, có thể chạy web ở chế độ giả lập để làm giao diện: thêm dòng `WEB_CHE_DO=gia` vào `ha_tang/web/.env.rieng` rồi chạy lại script.

---

## 6. Máy 8 — Windows cá nhân (10.68.71.59): máy trình chiếu

1. Cài ZeroTier One cho Windows, join `633e31d8a29b038c`, chờ Authorize.
2. Mở các trang:

| Trang | Địa chỉ |
|---|---|
| Web giả lập sàn TMĐT | http://10.68.71.205:8000 |
| Spark Master | http://10.68.71.113:8080 |
| HDFS NameNode | http://10.68.71.113:9870 |
| Airflow | http://10.68.71.113:8088 |
| Kafka UI | http://10.68.71.204:8080 |

3. Các script demo chỉ dùng thư viện chuẩn của Python, chạy được trên Windows (cài Python 3.10+ từ python.org):

```powershell
git clone https://github.com/chitam31/CS411V_Final-Project_Ecommerce-Recommender-System.git bd03_khuyen_nghi
cd bd03_khuyen_nghi
python scripts\demo_vong_khep_kin.py --web http://10.68.71.205:8000 --san-pham <ma_san_pham_it_nguoi_xem>
python producer\nguoi_dung_ao.py --web http://10.68.71.205:8000 --so-luot 300
```

---

## 7. Kiểm tra toàn cụm và nạp dữ liệu (máy master)

```bash
cd ~/bd03_khuyen_nghi
bash scripts/cum/kiem_tra_cum.sh
```

Kết quả mong đợi: mọi cổng `OK`, `DataNode sống: 5`, `Worker sống: 5` (labsit12, labsit, labsit-may25, labsit-may26, labsoe-18), không có dòng `DONG`.

Tải RetailRocket và đưa lên HDFS:

```bash
pip3 install --user kaggle            # cần ~/.kaggle/kaggle.json (Kaggle → Settings → API → Create New Token)
bash scripts/tai_du_lieu.sh /data/retailrocket
docker exec hadoop-master hdfs dfs -ls -h /lake/landing/retailrocket
```

---

## 8. Chạy lần đầu

**Máy labsit** — bật bộ phát (khoảng 70 phút cho 4,5 tháng dữ liệu; nên chạy trong `tmux`):

```bash
tmux new -s phat_lai
python3 ~/bd03_khuyen_nghi/producer/phat_lai_su_kien.py --tep /data/retailrocket/events.csv
```

Muốn có dữ liệu nhanh để thử pipeline, phát hết mức bằng `--giay-moi-ngay 0`.

**Máy master** — tạo bảng, nạp danh mục, bật luồng nạp bronze và thịnh hành trong lúc bộ phát chạy:

```bash
cd ~/bd03_khuyen_nghi
docker exec hadoop-master hdfs dfs -mkdir -p /lake/landing/retailrocket /lake/models /lake/checkpoints
bash ha_tang/spark/submit.sh nhanh kiem_tra/khoi_tao_bang.py
bash ha_tang/spark/submit.sh lo transform/nhap_danh_muc.py
bash scripts/luong.sh khoi_dong tat_ca
bash scripts/luong.sh trang_thai
```

Khi bộ phát chạy xong, chạy toàn bộ pipeline lô (đúng thứ tự của DAG 1, cộng mô phỏng A/B và đo ZORDER):

```bash
bash scripts/chay_lan_dau.sh                    # đủ 27 tổ hợp tuning cho báo cáo
# hoặc LUOI=toi_thieu bash scripts/chay_lan_dau.sh   # 9 tổ hợp, nhanh hơn
```

Bước 3 trong `chay_lan_dau.sh` chạy `nap_su_kien.py --mot-lan`; nếu luồng nạp đang chạy liên tục thì bước này chỉ xử lý phần còn lại (cùng checkpoint, không trùng dữ liệu).

Theo dõi job: Spark UI của từng job ở `http://10.68.71.113:4140`–`4150` (mỗi hồ sơ một cổng, xem `ha_tang/spark/submit.sh`).

---

## 9. Bật lịch Airflow

Trong giao diện Airflow, bật (unpause) lần lượt: `kn_giam_sat_streaming`, `kn_tinh_ab`, `kn_bao_tri`, `kn_pipeline_hang_ngay`. `kn_tai_lap` là DAG thủ công, không cần bật lịch. Hoặc dùng dòng lệnh:

```bash
for d in kn_giam_sat_streaming kn_tinh_ab kn_bao_tri kn_pipeline_hang_ngay; do
  docker exec bd03-airflow-airflow-scheduler-1 airflow dags unpause $d
done
```

Chạy thử DAG 5 với phiên bản features của lần chạy đầu:

```bash
docker exec bd03-airflow-airflow-scheduler-1 airflow dags trigger kn_tai_lap -c '{"phien_ban_delta": 0, "che_do": "mo_hinh_chon"}'
```

---

## 10. Xử lý sự cố

| Triệu chứng | Nguyên nhân thường gặp | Cách xử lý |
|---|---|---|
| Worker không hiện trong Spark UI | Máy chưa được Authorize trên ZeroTier; `NODE_IP` sai; tường lửa | `zerotier-cli listnetworks`; xem `ha_tang/spark/.env`; mục 1.3 |
| Job treo ở "Initial job has not accepted any resources" | Các ứng dụng đang chạy đã chiếm hết lõi hoặc RAM của worker, hoặc RAM executor lớn hơn `bo_nho` của worker | `bash scripts/luong.sh trang_thai`; tạm dừng luồng không cần (`luong.sh dung hien_thi`); xem cột Memory trên Spark UI `:8080` |
| `khoi_dong_may.sh` báo `!! Container ... thuộc project ...` | Container cũ cùng tên được tạo từ thư mục khác | Làm theo hướng dẫn in ra: xóa container không giữ dữ liệu; với HDFS thì khai báo project cũ trong `DU_AN_HADOOP` |
| Máy lab chậm hẳn, `free -h` gần hết RAM | 7 GB RAM dùng chung với giao diện và dịch vụ khác | Đóng trình duyệt trên máy lab; giảm `bo_nho` của máy đó trong `cum.env`; chạy batch khi không chạy luồng `hien_thi` |
| `Could not obtain block` / ghi HDFS chậm rồi lỗi | Client không nối được cổng 9866 của DataNode, hoặc DataNode khai sai hostname | `hdfs dfsadmin -report` phải thấy IP ZeroTier của từng DataNode; mở tường lửa |
| Executor lỗi "Failed to connect to 10.68.71.113:404x" | Cổng driver của container spark-master chưa mở hoặc bị trùng | Compose mới mở 4041–4060; mỗi hồ sơ một cổng; không chạy hai job cùng hồ sơ |
| Log DataNode: `Retrying connect to server: 0.0.0.0/0.0.0.0:8020` | `dfs.namenode.rpc-address` trong `hdfs-site.xml` (tệp dùng chung với DataNode) để `0.0.0.0` | Để `10.68.71.113:8020`, còn `rpc-bind-host = 0.0.0.0` (đã sửa trong repo); chạy lại `khoi_dong_may.sh` trên mọi máy |
| Log Spark worker: `Connection refused: /0.0.0.0:7077` | Spark Master chạy mạng bridge với `--host 0.0.0.0`, tự quảng bá địa chỉ 0.0.0.0 | Master chạy `network_mode: host`, `--host 10.68.71.113` (đã sửa trong repo) |
| Cụm chạy rất chậm, ping giữa các máy lab hàng trăm ms | ZeroTier không nối thẳng được giữa hai phòng lab, phải đi qua máy chuyển tiếp | Mục 10b |
| Kafka: `Connection to node -1 could not be established` | Sai `KAFKA_ADVERTISED_LISTENERS` hoặc cổng 9092 bị chặn | `ha_tang/kafka/.env` phải có `NODE_IP=10.68.71.204` |
| Luồng streaming lỗi sau khi sửa mã | Checkpoint cũ không tương thích với truy vấn mới | Đổi tên checkpoint trong job (hậu tố `_v2`...) hoặc xóa `/lake/checkpoints/<ten>` |
| `ConcurrentAppendException` khi hai job ghi cùng bảng | Chạy tay một job trong lúc DAG đang chạy job đó | Chờ DAG xong; các DAG đặt `max_active_runs=1` |
| ALS báo `OutOfMemoryError` | Ma trận quá lớn so với RAM executor | `huan_luyen_als.py --so-khoi 50`; tăng `RAM_ALS`; tăng `--min-tuong-tac` ở `chuan_bi_ma_tran.py` |
| Airflow task: `permission denied ... docker.sock` | `DOCKER_GID` sai | `getent group docker`, sửa `ha_tang/airflow/.env`, `docker compose up -d` lại |
| Thịnh hành không cập nhật dù bấm nút | Luồng `tinh_thinh_hanh` không chạy, hoặc đồng hồ các máy lệch | `scripts/luong.sh log thinh_hanh`; `timedatectl` trên máy Kafka và master |
| Web báo lỗi Delta / HDFS | Web không nối được DataNode hoặc bảng chưa tạo | `kiem_tra/khoi_tao_bang.py`; web phải chạy `network_mode: host` |

### 10b. Đường nối ZeroTier giữa các máy: DIRECT hay RELAY

```bash
bash scripts/cum/ssh_tat_ca.sh --tty "sudo zerotier-cli peers"
```

Cột `link` cho biết hai máy nối thẳng (`DIRECT`, kèm địa chỉ LAN hoặc địa chỉ công cộng) hay phải đi qua máy chuyển tiếp của ZeroTier trên Internet (`RELAY`, độ trễ hàng trăm đến hơn một nghìn ms, băng thông thấp). HDFS và shuffle của Spark cần các máy trong cụm nối thẳng với nhau. Khi hai phòng lab ở hai mạng con khác nhau và mạng trường chặn UDP giữa hai phòng, ZeroTier chỉ còn đường RELAY. Cách xử lý, theo thứ tự ưu tiên: nhờ phòng máy mở UDP cổng 9993 giữa các phòng lab; hoặc đặt master và các worker trong cùng một phòng (cùng mạng LAN) để chúng nối thẳng với nhau.

---

## 11. Khi nào cần dùng server của trường

Chỉ cần khi tuning **27 tổ hợp trên toàn bộ dữ liệu** không chạy xong trong thời gian cho phép, hoặc ALS rank 50 vẫn OOM sau khi đã tăng `numBlocks` và lọc user. Không cần chuyển cả cụm: thêm server như **một Spark Worker nữa**.

1. Server join ZeroTier `633e31d8a29b038c`, ghi lại IP.
2. Thêm vào `cau_hinh/cum.env`, ví dụ: `MAY_10="server-truong|10.68.71.X|spark-worker|16|48g"`, rồi tăng `LOI_ALS`/`RAM_ALS`.
3. Trên server: clone repo, `bash scripts/cum/khoi_dong_may.sh server-truong`.

Không giao vai trò DataNode cho server nếu nó không chạy thường trực, để HDFS không mất bản sao khi server tắt.

---

## 12. Dừng cụm an toàn

```bash
# Máy master: dừng luồng trước (checkpoint bảo đảm khởi động lại không mất, không trùng)
bash scripts/luong.sh dung tat_ca
# Từng máy:
bash scripts/cum/khoi_dong_may.sh --dung
```

Thứ tự bật lại: master → các worker → labsit → Ctam, rồi `scripts/luong.sh khoi_dong tat_ca`.
