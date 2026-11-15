# Kịch bản demo 19/11/2026 – bản thực hiện

**BD03 · Hệ thống gợi ý sản phẩm TMĐT** · Lê Chí Tâm (2302220) · Lê Nguyễn Quốc Anh (2302283) · GVHD: TS. Cao Tiến Dũng
Bản 14/11/2026 (demo trước, thuyết trình sau, tại phòng lab, không giới hạn thời gian), rút gọn từ `BD03_Kich_ban_demo_19_11.docx`. Câu hỏi nhanh, số liệu cần thuộc và lý do từng thay đổi: xem bản docx.

---

## Cách dùng

- **Mỗi khung code là một lệnh.** Dòng in đậm phía trên ghi **cửa sổ nào · máy nào**. Chép từng khung, dán vào Git Bash bằng **Shift+Insert**, chờ kết quả rồi mới sang khung sau. Không dán nhiều lệnh cùng lúc.
- ✅ = kết quả phải thấy. ⚠️ = cách xử lý khi lỗi.
- Có `moi_xxxxxxxx` trong lệnh hoặc link thì thay bằng mã user thật tạo ở bước 3.
- **T** = giờ nhóm bắt đầu phần của mình (mở đầu bằng demo). Chưa biết lượt thì lấy giờ bắt đầu buổi học. T−90 = 90 phút trước T.
- Phân vai: **Tâm** gõ lệnh, bấm máy · **Quốc Anh** nói lời dẫn, nhìn đồng hồ.
- 🔒 **Không gõ mật khẩu khi màn hình đang chiếu.** Đăng nhập Airflow trước khi nối máy chiếu.

---

## Thứ tự buổi 19/11 (tại phòng lab)

| Phần | Thời lượng | Ai |
|---|---|---|
| Mở đầu (slide 1) | ~0:30 | Quốc Anh nói |
| Demo bước 0 → 6 (mục 4) | ~10 phút | Tâm bấm, Quốc Anh nói |
| Câu chuyển sang slide | ~0:30 | Quốc Anh |
| Thuyết trình (kịch bản thuyết trình chi tiết) | ~50 phút | Tâm, Quốc Anh |
| Hỏi đáp | tùy Thầy | Cả hai |

Thầy Dũng **không giới hạn thời gian**, nên làm **đủ cả các phần ghi (bỏ được)**. Mục 5 (giữ đúng giờ) chỉ dùng khi Thầy yêu cầu rút ngắn.

---

## 0. Tra cứu nhanh

### Máy và SSH

| Máy | IP | Lệnh từ laptop | Việc trong demo |
|---|---|---|---|
| labsoe-11 (master) | 10.68.71.113 | `ssh labsoe-11` (hduser) | Spark Master, HDFS, Airflow · **cửa sổ 1** |
| labsit | 10.68.71.204 | `ssh labsit` | Kafka, Kafka UI, **bộ phát** · **cửa sổ 2** |
| labsoe-18 | 10.68.71.149 | `ssh labsoe-18` | Web (`bd03-web`) · chỉ khi phải khởi động lại web |
| labsit12, labsit-may25, labsit-may26 | .198, .42, .90 | – | Worker + DataNode · không cần SSH |
| Laptop | 10.68.71.182 | – | Git Bash ở `/d/BIG DATA/bd03_khuyen_nghi` · **cửa sổ 3** |

SSH treo khi đứng ngoài lab (`banner exchange`, `KEX`): Ctrl+C, chạy lại; vẫn treo thì `ssh -J labsoe-18 labsoe-11`.

### Ba cửa sổ Git Bash

| Cửa sổ | Dấu nhắc khi đúng | Dùng cho |
|---|---|---|
| **1** · labsoe-11 | `hduser@…:~/bd03_khuyen_nghi$` | Kiểm tra cụm, mồi sản phẩm, lệnh dự phòng |
| **2** · labsit | `labsit@…:~$` | Bật / tắt bộ phát |
| **3** · laptop | có `MINGW64` và `/d/BIG DATA/bd03_khuyen_nghi` | Đường hầm, khởi động lại web |

### Tám tab trình duyệt (đúng thứ tự)

| Tab | Trang | Link | Bước |
|---|---|---|---|
| 1 | Spark Master | <http://10.68.71.113:8080> | 0 |
| 2 | HDFS · Datanodes | <http://10.68.71.113:9870/dfshealth.html#tab-datanode> | 0 |
| 3 | Kafka UI | <http://10.68.71.204:8080> → **Topics** → `retailrocket-events` | 0, 4 |
| 4 | Airflow | <http://10.68.71.113:8088/dags> | 0, 6 |
| 5 | Chất lượng mô hình | <http://10.68.71.149:8000/mo-hinh> | 1, 2 |
| 6 | Trang chủ | <http://10.68.71.149:8000/> | 3, 5 |
| 7 | Bảng điều khiển A/B | <http://10.68.71.149:8000/ab> | 5 |
| 8 | Tái lập thí nghiệm | <http://10.68.71.149:8000/tai-lap> | 6 |

### Link gõ trong lúc demo

| Việc | Link |
|---|---|
| Người dùng mới (bước 3) | Bấm nút **+ Người dùng mới (cold start)** ở tab 6 |
| Trang chủ user vừa tạo | `http://10.68.71.149:8000/?u=moi_xxxxxxxx` |
| Trang sản phẩm (bước 4) | `http://10.68.71.149:8000/san-pham/102605?u=moi_xxxxxxxx` (dự phòng `320844`) |
| Nhóm B / nhóm A (bước 5) | <http://10.68.71.149:8000/?u=270018> · <http://10.68.71.149:8000/?u=1287993> |
| User có ô 9–10 “Theo danh mục” | `http://10.68.71.149:8000/?u=________` (ghi ở mục 2.3) |
| DAG 5 trên Airflow | <http://10.68.71.113:8088/dags/kn_tai_lap> |
| Khi dùng đường hầm SSH | đổi `http://10.68.71.149:8000` thành `http://localhost:8001` |

### Số dùng trong demo

- User nhóm A `1287993` (toàn ALS) · nhóm B `270018` (ô 3, 6, 8 Thịnh hành).
- Sản phẩm vòng khép kín: `102605`, dự phòng `320844` (mồi ở T−8).
- Mô hình đang phục vụ `als_v2_r20261111T190002`: features v4, rank 50, regParam 1,0, alpha 40, NDCG@10 = 0,0680 (trùng số liệu với `als_v2_r20261110T230924` trong báo cáo).
- Bảng tái lập đã có 6 dòng **CÓ**.
- Airflow hiện giờ Việt Nam; bảng Delta, cửa sổ thịnh hành, Spark UI từng ứng dụng ghi **UTC** (cộng 7 tiếng).

---

## 1. Mở cửa sổ làm việc (mỗi lần ngồi vào máy, ~3 phút)

### 1.1 Cửa sổ 3 – laptop

Start → gõ `Git Bash` → Enter.

**[Cửa sổ 3 · laptop]**
```bash
cd "/d/BIG DATA/bd03_khuyen_nghi"
```
✅ Dấu nhắc có `MINGW64` và `/d/BIG DATA/bd03_khuyen_nghi`. Đường dẫn có dấu cách nên **phải có ngoặc kép**.

**[Cửa sổ 3 · laptop]**
```bash
bash scripts/cum/ssh_tat_ca.sh hostname
```
✅ In đủ 6 tên máy, không có dòng lỗi.

### 1.2 Cửa sổ 1 – labsoe-11

Mở Git Bash thứ hai.

**[Cửa sổ 1 · laptop]**
```bash
ssh labsoe-11
```
✅ Dấu nhắc đổi thành `hduser@…`. ⚠️ Treo quá 20 giây: Ctrl+C, chạy lại; vẫn treo: `ssh -J labsoe-18 labsoe-11`.

**[Cửa sổ 1 · labsoe-11]**
```bash
cd ~/bd03_khuyen_nghi
```
✅ Dấu nhắc kết thúc bằng `~/bd03_khuyen_nghi$`. Mọi lệnh “Cửa sổ 1” chạy ở thư mục này.

### 1.3 Cửa sổ 2 – labsit

Mở Git Bash thứ ba.

**[Cửa sổ 2 · laptop]**
```bash
ssh labsit
```
✅ Dấu nhắc đổi thành `labsit@…`. Để sẵn; chỉ dùng ở T−10 và sau demo.

### 1.4 Tám tab trình duyệt

- [ ] Đóng tab cá nhân; mở 8 link ở bảng trên, mỗi link một tab, đúng thứ tự.
- [ ] Tab 3: bấm **Topics** → `retailrocket-events` → **Overview**.
- [ ] Tab 4: đăng nhập `admin` (**chỉ khi chưa nối máy chiếu**).
- [ ] Lần đầu: **Ctrl+Shift+D** lưu cả 8 tab thành thư mục `BD03 demo`. Lần sau: **Ctrl+Shift+O** → chuột phải `BD03 demo` → **Open all**.

Thoát: gõ `exit` ở cửa sổ 1 hoặc 2. Bộ phát chạy bằng `nohup` nên vẫn chạy khi cửa sổ 2 đóng.

---

## 2. Trước ngày 19/11 (15–18/11)

### 2.1 Kiểm tra nhanh mỗi ngày (~5 phút, làm được từ nhà)

**[Cửa sổ 1 · labsoe-11]**
```bash
bash scripts/cum/kiem_tra_cum.sh
```
✅ Không có `DONG`; `DataNode sống: 5 | chết: 0`; `Worker sống: 5 | lõi: 34`; dòng cuối `== Cụm ổn`.

**[Cửa sổ 1 · labsoe-11]**
```bash
bash scripts/cum/tinh_trang.sh
```
✅ RAM master còn > 1 GB. Swap cao là bình thường; **không** dọn swap, **không** khởi động lại master.

**[Cửa sổ 1 · labsoe-11]**
```bash
bash scripts/luong.sh trang_thai
```
✅ 3 luồng: `bd03-nap-su-kien`, `bd03-tinh-thinh-hanh`, `bd03-ghi-hien-thi`. ⚠️ Thiếu luồng thì chạy lệnh dưới, chờ 1 phút, kiểm tra lại:

**[Cửa sổ 1 · labsoe-11]**
```bash
bash scripts/luong.sh khoi_dong tat_ca
```

Kiểm tra web:

**[Cửa sổ 1 · labsoe-11]**
```bash
curl -s http://10.68.71.149:8000/api/suc-khoe
```
✅ `{"che_do":"delta","kafka":"GuiKafka"}`. ⚠️ Ra `"che_do":"gia"` (số liệu giả): khởi động lại web, chờ ~30 giây, kiểm tra lại:

**[Cửa sổ 3 · laptop]**
```bash
ssh labsoe-18 "docker restart bd03-web"
```

Tab 4 Airflow <http://10.68.71.113:8088/dags>, công tắc phải đúng như sau:

| DAG | Công tắc | Ghi chú |
|---|---|---|
| `kn_pipeline_hang_ngay` (DAG 1) | **Tạm dừng** | Giữ tới khi nộp bài xong |
| `kn_giam_sat_streaming` | Tạm dừng | Có thể bật lúc bộ phát chạy ngày 19/11 |
| `kn_tinh_ab` | Bật | Mỗi giờ |
| `kn_bao_tri` | Bật | 04:00; xóa dòng thịnh hành cũ hơn 2 ngày → phải mồi sản phẩm |
| `kn_tai_lap` (DAG 5) | Bật | Chỉ chạy khi kích hoạt tay |

Ô **Triggerer** đỏ là cố ý (không có deferrable operator).

### 2.2 Buổi tập ở lab (một buổi, ~2 giờ)

- [ ] Làm mục 1 → mục 3 từ **T−45 tới T−5** → mục 4 bước 0 tới câu kết. Quốc Anh bấm giờ.
- [ ] Không cần kích hoạt DAG 5 (muốn thử thì kích hoạt **trước** khi bật bộ phát, chờ xanh).
- [ ] Quay video **toàn màn hình** bằng **OBS** (Display Capture) hoặc **Snipping Tool** chế độ quay video. **Không dùng Win+Alt+R** (chỉ quay một cửa sổ).
- [ ] Chụp màn hình tab 1–4 và 4 trang web; lưu cùng video vào laptop + USB.
- [ ] Tập xong: **tắt bộ phát** (mục 8). Ghi số giây đo ở bước 4 vào `NHAT_KY.md`.

### 2.3 Ghi lại các số đang hiện

| Mục | Mở ở đâu | Giá trị |
|---|---|---|
| Tên mô hình `trien_khai` mới nhất | Tab 5 → “Mô hình mới nhất” | ________ |
| Dòng đầu ô chọn ở trang Tái lập | Tab 8 → “Tái lập huấn luyện mô hình” | features v____ (phải là v4 mới dùng được cách B ở T−90) |
| Số tổ hợp bảng tuning | Tab 5 → “Bảng tuning…” | ____ |
| p-value CTR | Tab 7 | ________ |
| User có ô 9–10 “Theo danh mục” | Tab 6 → **Chọn người dùng mẫu…** | ________ |

### 2.4 Thử đường hầm SSH (dùng khi web treo vì đứng ngoài mạng lab)

**[Cửa sổ 3 · laptop]**
```bash
ssh -N -L 8001:localhost:8000 labsoe-18
```
✅ Cửa sổ đứng im, không in gì: **đúng**. Mở <http://localhost:8001> thấy trang chủ. Tắt: Ctrl+C. Cần lệnh laptop khác thì mở thêm Git Bash và `cd` như mục 1.1.

### 2.5 Laptop và tối 18/11

- [ ] Tắt chế độ ngủ khi cắm sạc; bật Do not disturb; thoát Zalo, Messenger, ứng dụng đồng bộ.
- [ ] Trình duyệt: đóng tab cá nhân, tab Claude; ẩn thanh dấu trang (Ctrl+Shift+B); phóng to 110–125 %.
- [ ] Git Bash: chuột phải thanh tiêu đề → Options → Text → cỡ chữ 14–16.
- [ ] USB: slide (PDF + bản trình chiếu), video + ảnh buổi tập, kịch bản (PDF), báo cáo (PDF).
- [ ] Sạc đầy laptop; mang sạc, đầu chuyển HDMI; in thẻ tóm tắt ở cuối file này.
- [ ] Buổi học ở phòng lab, nơi đặt chính các máy của cụm: nhờ Thầy Dũng nhắc lớp **không tắt, không khởi động lại, không rút mạng** 6 máy labsoe-11, labsoe-18, labsit, labsit12, labsit-may25, labsit-may26 trong buổi học.
- [ ] Dán giấy lên 6 máy đó: “Máy đang chạy cụm đồ án BD03 – xin đừng tắt / khởi động lại”.
- [ ] Bộ phát đang tắt (lệnh `pgrep` ở T−10 in `CHUA_CHAY`); DAG 1 vẫn tạm dừng.

---

## 3. Ngày 19/11: T−90 → T

Điền giờ khi biết T. Ví dụ T = 13:00 → T−90 = 11:30, T−45 = 12:15, T−10 = 12:50.

| ✓ | Mốc | Giờ | Việc | Ở đâu |
|---|---|---|---|---|
| ☐ | T−90 | ____ | **Kích hoạt DAG 5 một lần**, bộ phát **chưa** chạy | Tab 8 / cửa sổ 1 |
| ☐ | T−60 | ____ | Vào phòng, cắm máy chiếu, thử mạng | Laptop |
| ☐ | T−45 | ____ | Mở 3 cửa sổ Git Bash, kiểm tra cụm | Cửa sổ 1–3 |
| ☐ | T−30 | ____ | DAG 5 phải **xanh**; nạp sẵn web | Tab 4–8 |
| ☐ | T−20 | ____ | Đăng nhập Airflow **trước khi chiếu**; xếp 8 tab | Trình duyệt |
| ☐ | T−15 | ____ | Ghi p-value, báo Quốc Anh | Tab 7 |
| ☐ | T−10 | ____ | **Bật bộ phát** 300 giây/ngày | Cửa sổ 2 |
| ☐ | T−8 | ____ | **Mồi** 102605 và 320844 | Cửa sổ 1 |
| ☐ | T−5 | ____ | Kiểm tra lần cuối | Cửa sổ 1, tab 6, tab 3 |
| ☐ | T−2 | ____ | Chiếu slide 1 (tiêu đề); trình duyệt để sẵn ở tab 1; điện thoại im lặng | Máy chiếu |

- Nhóm lên muộn hơn T vẫn ổn: bộ phát chạy ~4 giờ; sản phẩm đã mồi vẫn dùng được.
- T vào sáng sớm: kích hoạt DAG 5 từ nhà bằng **cách B** bên dưới, hoặc tối 18/11 sau khi bộ phát đã tắt (2 dòng mới mang ngày 18/11, vẫn hợp lệ).

### T−90 · Kích hoạt DAG 5

**Cách A – trên web:** mở tab 8 <http://10.68.71.149:8000/tai-lap>

1. Kéo xuống mục **“Tái lập huấn luyện mô hình (DAG kn_tai_lap)”**.
2. Ô chọn để **dòng đầu tiên** (ví dụ `features v4 · als_v2_r20261111T190002 · NDCG 0.0680`).
3. Bấm **Kích hoạt kn_tai_lap** **đúng một lần**.

✅ Dưới nút hiện `{"dag_id":"kn_tai_lap","dag_run_id":"manual__…","trang_thai":"queued"}`.

**Cách B – một lệnh** (ở nhà hoặc web chậm; chỉ khi dòng đầu ô chọn là features v4). Chạy **một lần**:

**[Cửa sổ 1 · labsoe-11]**
```bash
curl -s -m 60 -X POST "http://10.68.71.149:8000/api/tai-lap-mo-hinh?phien_ban_delta=4"
```
✅ Cùng kết quả như cách A.

Theo dõi ở tab 4: <http://10.68.71.113:8088/dags/kn_tai_lap> → có lượt mới đang chạy, xong sau ~20–25 phút.

- Trong lúc DAG 5 chạy: **không** bật bộ phát, **không** chạy job tay, **không** kích hoạt lần nữa.
- Lỡ mốc T−90: **bỏ qua**, bước 6 dùng 6 dòng CÓ đã có.

### T−60 · Vào phòng lab, máy chiếu, thử mạng

- [ ] Đi một vòng: 6 máy cụm vẫn bật, giấy còn dán. Có bạn đang ngồi máy cụm thì nhờ đổi sang máy khác.

- [ ] Cắm máy chiếu → **Win + P** → **Duplicate** (1920×1080 hoặc 1280×720).
- [ ] Mở thử slide ở chế độ trình chiếu rồi thoát.
- [ ] Mở <http://10.68.71.149:8000/>: trang phải hiện đủ trong vài giây.
- [ ] Ở phòng lab, web thường mở thẳng được. ⚠️ Trang hiện một nửa rồi đứng: bật đường hầm (mục 2.4), đổi mọi link web sang `http://localhost:8001`.
- [ ] ⚠️ Tab 1–4 không mở được qua mạng phòng học: bước 0 dùng ảnh chụp buổi tập, nói rõ ngày chụp.

### T−45 · Mở cửa sổ, kiểm tra cụm

Làm mục 1.1–1.3, rồi ở cửa sổ 1:

**[Cửa sổ 1 · labsoe-11]**
```bash
bash scripts/cum/kiem_tra_cum.sh
```
✅ Không `DONG`, 5 DataNode, 5 worker. Spark có **4** ứng dụng nếu DAG 5 còn chạy.

**[Cửa sổ 1 · labsoe-11]**
```bash
bash scripts/luong.sh trang_thai
```
✅ 3 luồng đang chạy.

**[Cửa sổ 1 · labsoe-11]**
```bash
curl -s http://10.68.71.149:8000/api/suc-khoe
```
✅ `"che_do":"delta"`.

### T−30 · DAG 5 xanh, nạp sẵn web

- [ ] Tab 4 <http://10.68.71.113:8088/dags/kn_tai_lap>: lượt hôm nay có 2 task xanh (`chay_lai_huan_luyen`, `so_sanh_voi_lich_su`).
- [ ] Tab 8 <http://10.68.71.149:8000/tai-lap> → **Ctrl+F5**: có **2 dòng mới** (giờ UTC hôm nay), cột Trùng khớp **CÓ**.
- [ ] Ctrl+F5 lần lượt tab 6 <http://10.68.71.149:8000/>, tab 5 <http://10.68.71.149:8000/mo-hinh>, tab 7 <http://10.68.71.149:8000/ab>. **Không** mở trang sản phẩm.

⚠️ DAG 5 chưa xanh: chờ, **chưa bật bộ phát**. Tới T−10 vẫn chưa xanh: không bật bộ phát; bước 6 chỉ lượt đang chạy và các dòng cũ.

### T−20 · Đăng nhập Airflow, xếp tab

- [ ] **Chưa** chiếu (hoặc Win + P → PC screen only): đăng nhập Airflow ở tab 4.
- [ ] Đóng mọi tab khác; đủ 8 tab đúng thứ tự (thiếu thì Ctrl+Shift+O → `BD03 demo` → Open all).
- [ ] Slide ở cửa sổ riêng. **Không** mở sẵn trang sản phẩm.

### T−15 · Ghi p-value

Tab 7 <http://10.68.71.149:8000/ab> → p-value CTR: **________** → báo Quốc Anh (dùng ở bước 5).

### T−10 · Bật bộ phát

**[Cửa sổ 2 · labsit]**
```bash
pgrep -f "phat_lai_su_kie[n]" || echo CHUA_CHAY
```
✅ `CHUA_CHAY`. ⚠️ In ra một số = bộ phát đã chạy, **không** bật thêm, nhảy tới lệnh `tail`.

**[Cửa sổ 2 · labsit]**
```bash
nohup python3 -u ~/bd03_khuyen_nghi/producer/phat_lai_su_kien.py --tep ~/du_lieu/retailrocket/events.csv --tu-ngay-ms 1438387200000 --ty-le-nguoi-moi 0 --giay-moi-ngay 300 > ~/phat.log 2>&1 &
```
✅ Một dòng kiểu `[1] 3013475`.

**[Cửa sổ 2 · labsit]**
```bash
sleep 10; tail -3 ~/phat.log
```
✅ `Phát 857072 sự kiện, 48.1 ngày dữ liệu, dự kiến … phút` (~240 phút). `DeprecationWarning` là cảnh báo, không phải lỗi. ⚠️ Thấy `Traceback` thì xem mục 6.

Để nguyên cửa sổ 2. Tùy chọn: tab 4 bật `kn_giam_sat_streaming` (tắt lại sau demo).

### T−8 · Mồi 2 sản phẩm

Mỗi sản phẩm 1 lượt “xem”, để trang sản phẩm in được “ĐÃ CẬP NHẬT sau N giây” ở bước 4.

**[Cửa sổ 1 · labsoe-11]**
```bash
curl -s -m 30 -X POST http://10.68.71.149:8000/api/su-kien -H "Content-Type: application/json" -d '{"ma_nguoi_dung":"demo_moi","ma_san_pham":"102605","loai":"xem"}'
```

**[Cửa sổ 1 · labsoe-11]**
```bash
curl -s -m 30 -X POST http://10.68.71.149:8000/api/su-kien -H "Content-Type: application/json" -d '{"ma_nguoi_dung":"demo_moi","ma_san_pham":"320844","loai":"xem"}'
```
✅ Mỗi lệnh ra `{"da_gui":true,"luc_ms":…,"so_tuong_tac_phien":…}`.

### T−5 · Kiểm tra lần cuối

**[Cửa sổ 1 · labsoe-11]**
```bash
curl -s -m 120 http://10.68.71.149:8000/api/thinh-hanh/102605
```
✅ Có `cua_so_ket_thuc` và `"so_luot_them_gio": 0` (hoặc 1–2). ⚠️ Từ **3** trở lên thì bước 4 dùng `320844`. Chạy **một lần**, chờ tối đa 2 phút.

- [ ] Tab 6 → F5: khối **Đang thịnh hành** đủ 10 sản phẩm.
- [ ] Tab 3 → Overview: **Message Count** tăng sau mỗi lần F5.
- [ ] Nối máy chiếu, chiếu slide 1 (tiêu đề); trình duyệt để sẵn ở tab 1; điện thoại im lặng.

---

## 4. Demo 10 phút (bản dùng ngày 19/11)

| Phần | Tab | Tiêu chí | Thời lượng | Mốc kết thúc |
|---|---|---|---|---|
| Mở đầu | slide 1 | – | 0:30 | 0:30 |
| Bước 0 · Hạ tầng | 1–4 | – | 1:00 | 1:30 |
| Bước 1 · Chất lượng mô hình | 5 | 1, 2 | 1:30 | 3:00 |
| Bước 2 · Z-ORDER | 5 | 8 | 0:30 | **3:30** ⏱ |
| Bước 3 · Cold start | 6 | 3 | 1:30 | 5:00 |
| Bước 4 · Vòng khép kín | tab mới, 3 | 4, 5 | 2:00 | **7:00** ⏱ |
| Bước 5 · A/B | 6, 7 | 6 | 1:15 | 8:15 |
| Bước 6 · Tái lập | 8 | 7 | 1:15 | **9:30** ⏱ |
| Chuyển sang slide | slide 2 | – | 0:30 | 10:00 |

⏱ = mốc tham khảo nhịp demo. Không giới hạn thời gian nên làm đủ cả phần ghi *(bỏ được)*.

### Mở đầu (0:30) · slide 1

> Hello everyone. We are Lê Chí Tâm and Lê Nguyễn Quốc Anh, and our topic is a product recommender for e-commerce, built on the RetailRocket clickstream. We will start with a live demo on our six-machine cluster, covering all eight acceptance criteria. After that, the slides explain how the system is designed and what the numbers mean.

Tâm nhấn **Alt+Tab** sang trình duyệt, tab 1.

### Bước 0 · Hạ tầng (1:00)

1. Tab 1 <http://10.68.71.113:8080>: **Alive Workers: 5**, **Cores: 34 Total**, 3 ứng dụng `bd03-…` đang chạy.
2. Tab 2 <http://10.68.71.113:9870/dfshealth.html#tab-datanode>: 5 DataNode `In Service`. *(bỏ được: chỉ nói số)*
3. Tab 3 Kafka UI → `retailrocket-events` → **Overview**: **Message Count**, F5 thấy tăng. *(bỏ được: bước 4 sẽ mở lại)*
4. Tab 4 <http://10.68.71.113:8088/dags>: 5 DAG; `kn_pipeline_hang_ngay` tạm dừng.

> This is our cluster. Five Spark workers on five lab machines, connected by ZeroTier: thirty-four cores. Three streaming applications are running right now: event ingestion, trending, and the impression log. HDFS has five live DataNodes with replication two. Kafka is receiving a replayed clickstream, so the message count keeps growing. And Airflow holds our five DAGs; the nightly pipeline is paused so that the screens match the report.

⚠️ Có 4 ứng dụng (thêm `bd03-tai-lap-huan-luyen`): DAG 5 chưa xong, nói “the reproduction job is still running; we come back to it at the end”.

### Bước 1 · Chất lượng mô hình (1:30 · tiêu chí 1, 2)

1. Tab 5 <http://10.68.71.149:8000/mo-hinh>: bảng so sánh → dòng **Ngưỡng đạt**.
2. Cuộn xuống biểu đồ **Phân phối độ phổ biến**.
3. Cuộn xuống **Chỉ số theo phiên bản mô hình**: dòng `giu_mo_hinh_cu` (17:44 ngày 10/11).
4. Cuộn xuống **Bảng tuning**: dòng đầu rank 50, regParam 1,0, alpha 40.

> Model quality, read straight from the gold tables. ALS reaches an NDCG at ten of 0.0680: plus 1,237 percent over global best-sellers, and plus 43 percent over best-sellers of the user’s own category. The threshold line says “not met” only because of coverage, 3.4 percent; the chart shows why: recommendations concentrate on popular items. The configuration we serve, with novelty re-ranking, reaches 6.5 percent. Below is the deployment gate: on 10 November a weaker model was rejected. And the tuning table: the best configuration is rank 50, regParam 1.0, alpha 40; the full grid of 27 is in the report.

⚠️ Trang chậm > 20 giây: Quốc Anh nói tiếp lời dẫn trong lúc chờ.

### Bước 2 · Z-ORDER (0:30 · tiêu chí 8)

Tab 5, cuộn xuống mục cuối **OPTIMIZE / ZORDER**, chỉ 2 dòng `truoc` / `sau`.

> At the bottom, Z-ORDER by user id on the hottest query of the home page: each query reads about one file instead of sixty-seven, and the median time drops from 8.3 seconds to under one second.

⏱ **Mốc 3:30.**

### Bước 3 · Cold start (1:30 · tiêu chí 3)

1. Tab 6 <http://10.68.71.149:8000/> → bấm **+ Người dùng mới (cold start)**.
2. **Quốc Anh chép mã** trên thanh địa chỉ: `moi_________`.
3. Chỉ chip **ngoài thí nghiệm A/B**, **Chiến lược nguoi_moi**, 10 ô **Thịnh hành**.
4. Bấm một thẻ sản phẩm → **Thêm vào giỏ** → kéo xuống **Sản phẩm liên quan**, bấm một thẻ → **Thêm vào giỏ** → bấm **Về trang chủ**.
5. Chỉ chip **Chiến lược it_tuong_tac** (ô Theo danh mục xen kẽ Thịnh hành).
6. Item mới: mở `http://10.68.71.149:8000/?u=________` (user ghi ở mục 2.3), chỉ ô **9–10**. *(bỏ được: chỉ nói)*

> Cold start. One click creates a user who has never existed. There is no ALS vector, so all ten slots come from the newest fifteen-minute trending window, and the user stays outside the A/B test. Now the user adds two products of one category to the cart. Back home, the strategy has switched immediately to “few interactions”: best-sellers of that category, interleaved with trending. The third strategy is for new items: for known users, slots nine and ten show items that ALS has never seen, from the user’s main category.

⚠️ 10 ô ít/trùng lặp: bộ phát chưa chạy (cửa sổ 2: `tail -3 ~/phat.log`). Nhãn chưa đổi: kiểm tra còn `?u=moi_…`, F5.

### Bước 4 · Vòng khép kín ≤ 90 giây (2:00 · tiêu chí 4, 5)

1. **Ctrl+T**, dán link (**thay mã user**): `http://10.68.71.149:8000/san-pham/102605?u=moi_xxxxxxxx`
2. Đọc ô **Trạng thái trong bảng thịnh hành**: “… · thêm giỏ 0”.
3. Bấm **Thêm vào giỏ** 3 lần **liền nhau trong ~2 giây**.
4. Tab 3 Kafka UI → **Messages** → **Seek Type = Timestamp**, đúng phút vừa bấm → **Search** gõ mã user → **Submit** → bấm **+** một dòng. *(bỏ được: chỉ nói)*
5. Quay lại tab sản phẩm, chờ **“ĐÃ CẬP NHẬT sau N giây”** → **Ctrl+W** đóng tab.

> The closed loop. On a product that almost nobody views, we click “Add to cart” three times. Every click goes to Kafka; here they are in Kafka UI, keyed by our new user, with source “web”. Within about fifteen seconds the first stream writes them to bronze, so they become training data for tonight’s model. The trending stream updates its fifteen-minute window and merges into gold every twenty seconds. The page polls every five seconds and prints the delay: the target is ninety seconds, and we measured fifty-one.

⚠️ **Chờ quá 60 giây chưa thấy “ĐÃ CẬP NHẬT”:** để nguyên tab sản phẩm, làm luôn bước 5, xong quay lại đọc kết quả. Trang vẫn tự hỏi khi nằm ở tab nền và tính N từ lúc bấm, nên số giây vẫn đúng.

⚠️ **Nếu lỗi khác:**
- Số tăng nhưng không có “ĐÃ CẬP NHẬT”: quên mồi; con số vẫn là bằng chứng.
- Chỉ tăng 1–2: 3 lần bấm vắt qua ranh giới phút; các cửa sổ trước chứa đủ 3.
- Luồng có thể đã chết:

**[Cửa sổ 1 · labsoe-11]**
```bash
bash scripts/luong.sh trang_thai
```

**[Cửa sổ 1 · labsoe-11]** (chỉ khi thiếu luồng thịnh hành)
```bash
bash scripts/luong.sh khoi_dong thinh_hanh
```

- Trang sản phẩm không mở được: gửi “Thêm giỏ” qua API (tự chờ sang đầu phút kế tiếp; **thay mã user**):

**[Cửa sổ 1 · labsoe-11]**
```bash
while [ $(date +%-S) -gt 2 ]; do sleep 1; done; sleep 3; for i in 1 2 3; do curl -s -m 30 -X POST http://10.68.71.149:8000/api/su-kien -H "Content-Type: application/json" -d '{"ma_nguoi_dung":"moi_xxxxxxxx","ma_san_pham":"320844","loai":"them_gio"}'; echo; done; date
```

- Hoặc đo tự động (in “… cập nhật sau NN giây → ĐẠT”):

**[Cửa sổ 1 · labsoe-11]**
```bash
python3 scripts/demo_vong_khep_kin.py --web http://10.68.71.149:8000 --san-pham 320844 --nguoi-dung moi_xxxxxxxx --so-lan 3
```

- Có người hỏi bằng chứng đã vào bronze (job nhỏ, 1–2 phút; chạy ở phần hỏi đáp):

**[Cửa sổ 1 · labsoe-11]**
```bash
bash ha_tang/spark/submit.sh nhanh kiem_tra/tim_su_kien_bronze.py --ma-nguoi-dung moi_xxxxxxxx
```

- Không kịp: nói số 51 giây đã đo, slide sau sẽ có.

⏱ **Mốc 7:00.**

### Bước 5 · Thí nghiệm A/B (1:15 · tiêu chí 6)

1. Tab 6 <http://10.68.71.149:8000/?u=270018>: chip **Nhóm B**, ô **3, 6, 8** Thịnh hành; F5 vẫn nhóm B.
2. Tab 7 <http://10.68.71.149:8000/ab>: CTR, chuyển đổi, p-value, biểu đồ CTR theo ngày.

> The A/B test. This user is in group B: slots three, six and eight are trending items. The group comes from a hash of the user id, so reloading never changes it. The dashboard shows click-through and conversion per group with a z-test. Right now p equals **[số ghi ở T−15]**; the seven simulated days in the report give p equals 0.015: group B has a lower click-through rate, and conversion shows no difference.

### Bước 6 · Tái lập VERSION AS OF (1:15 · tiêu chí 7)

1. Tab 8 <http://10.68.71.149:8000/tai-lap>: bảng A/B, chọn một ngày cũ → **Chạy lại** (10–30 giây).
2. Chỉ cột **Lệch** = 0 và cột **Phiên bản hiện tại (không time travel)** khác số.
3. Kéo xuống **Tái lập huấn luyện mô hình**: **2 dòng mới nhất**, **CÓ**.

> Reproduction with Delta time travel. Re-running an old day reads the impression log VERSION AS OF the recorded version: every metric matches with zero deviation, while the current version, in the last column, gives different numbers. Below is DAG 5, which we triggered before class: it retrained the deployed model on the recorded feature version with the same seed, and the metrics match to within ten to the minus fifteen, which is only floating-point rounding.

⚠️ **Không** bấm Kích hoạt kn_tai_lap. DAG 5 chưa xong: chỉ 2 dòng ngày 12/11 (lệch 3,55·10⁻¹⁵ và 1,78·10⁻¹⁵). Chạy lại A/B > 30 giây: nói phần huấn luyện trước.

⏱ **Mốc 9:30.**

### Chuyển sang slide (0:30)

> That was all eight criteria, live on the cluster. Now the slides: how we designed the system, and what these numbers mean.

Tâm **Alt+Tab** về slide, sang **slide 2**. Trình duyệt để nguyên (dùng lại khi hỏi đáp).

---

## 5. Giữ đúng giờ

| Mốc | Phải xong | Trễ hơn 30 giây thì cắt |
|---|---|---|
| 3:30 | Bước 2 | Bước 3: bỏ ô item mới (chỉ nói) · Bước 4: bỏ Kafka UI |
| 7:00 | Bước 4 | Bước 5: chỉ mở tab 7, nói nhóm B bằng lời |
| 9:30 | Bước 6 | Bỏ phần huấn luyện ở bước 6, chỉ chỉ cột Lệch = 0 |

- Vòng khép kín chờ lâu: làm bước 5 trong lúc chờ (mục 4, bước 4).
- **Chỉ còn 5 phút** cho demo: bước 1 (1:00) → bước 3 chỉ tạo user mới (0:45) → bước 4 bỏ Kafka UI (1:45) → tab 7 (0:45) → bước 6 chỉ cột Lệch (0:45).
- **Chỉ còn 2 phút:** bước 3 (user mới) + tab 7. Nói số 51 giây đã đo.

---

## 6. Sự cố

| Dấu hiệu | Xử lý nhanh | Vẫn không được |
|---|---|---|
| Mọi trang web xoay | Đóng tab sản phẩm; không tải lại liên tục; chờ 1–2 phút; DAG 5 đang chạy thì chờ | Cửa sổ 3: `ssh labsoe-18 "docker restart bd03-web"`, chờ ~30 giây |
| Trang tải nửa chừng rồi treo | Đường hầm (2.4), dùng `http://localhost:8001` | Phát Wi-Fi điện thoại + đường hầm |
| `ssh` treo | Ctrl+C, chạy lại | `ssh -J labsoe-18 labsoe-11` |
| Thịnh hành chỉ 1–2 món | Cửa sổ 2: `tail -3 ~/phat.log`; cửa sổ 1: `bash scripts/luong.sh trang_thai` | Bộ phát dừng: làm lại T−10; luồng chết: `bash scripts/luong.sh khoi_dong thinh_hanh` |
| Không có “ĐÃ CẬP NHẬT” sau 90 giây | Làm bước 5 trong lúc chờ; đọc số thêm giỏ; kiểm tra luồng | Lệnh API dự phòng / `demo_vong_khep_kin.py`; nói số 51 giây đã đo |
| `curl` không in gì | Không chạy lặp; chờ 1–2 phút, chạy **một lần** với `-m 180` | Dùng giao diện |
| Kafka UI không ra tin | Seek Type = Timestamp đúng phút, gõ mã user, **Submit** | Bỏ qua, dùng trang sản phẩm |
| Giờ lệch 7 tiếng | “UTC, add seven hours” | – |
| Airflow có ô đỏ | Triggerer cố ý tắt; lỗi cũ đã ghi trong báo cáo | – |
| Mất mạng | Slide + ảnh chụp (nói ngày chụp) | Video buổi tập |
| Máy chiếu không nhận | Win + P → Duplicate; đổi độ phân giải | PDF slide từ USB trên máy phòng |

**Không bao giờ** dùng chế độ giả lập (`"che_do":"gia"`) làm bằng chứng.

---

## 7. Không làm

- ❌ Kích hoạt DAG 5 sát giờ hoặc trong demo; chạy job tay khi DAG 5 đang chạy.
- ❌ Bật / kích hoạt DAG 1 trước khi nộp bài.
- ❌ Mở sẵn hoặc để lâu tab sản phẩm; mở nhiều tab sản phẩm; chạy `curl` lặp liên tục.
- ❌ Chạy `producer/nguoi_dung_ao.py` ngày demo.
- ❌ Dừng / xóa container nhóm khác trên labsit-may25, labsit-may26; chạy `docker compose down -v`.
- ❌ Khởi động lại master (kể cả khi thấy “System restart required”).
- ❌ Mở trên màn hình: `ha_tang/*/.env`, `ha_tang/web/.env.rieng`, `ha_tang/airflow/mat_khau.json`, `kaggle.json`; gõ mật khẩu khi đang chiếu.
- ❌ Đưa token GitHub / khóa Kaggle lên máy lab; sửa mã trên máy lab ngày demo.

---

## 8. Sau demo

**[Cửa sổ 2 · labsit]**
```bash
pkill -f phat_lai_su_kien
```

**[Cửa sổ 2 · labsit]**
```bash
pgrep -f "phat_lai_su_kie[n]" || echo DA_TAT
```
✅ `DA_TAT`.

- [ ] Tab 4: tắt `kn_giam_sat_streaming` nếu đã bật.
- [ ] Ghi vào `NHAT_KY.md`: giờ demo, số giây bước 4, p-value, góp ý của Thầy, sự cố.
- [ ] 20–21/11: giữ cụm và DAG 1 tạm dừng tới khi nộp; sửa báo cáo theo góp ý; sao lưu; nộp trước 22/11.
- [ ] Trước 01/12: `bash scripts/luong.sh dung tat_ca` (cửa sổ 1); `bash scripts/cum/khoi_dong_may.sh --dung` từng máy (**không** `-v`); `sudo systemctl start cassandra` trên labsoe-11; hỏi cán bộ lab trước khi gỡ ZeroTier / openssh.

---

## Thẻ tóm tắt (in ra, cầm tay)

| ✓ | Mốc | Giờ | Việc | Ở đâu |
|---|---|---|---|---|
| ☐ | T−90 | ____ | DAG 5 **một lần** (bộ phát tắt) | Tab 8 / cửa sổ 1 |
| ☐ | T−60 | ____ | Máy chiếu, thử mạng | Laptop |
| ☐ | T−45 | ____ | `kiem_tra_cum.sh` · `luong.sh trang_thai` · `suc-khoe` | Cửa sổ 1 |
| ☐ | T−30 | ____ | DAG 5 xanh? Ctrl+F5 tab 6, 5, 7, 8 | Tab 4–8 |
| ☐ | T−20 | ____ | Đăng nhập Airflow **trước khi chiếu**; xếp 8 tab | Trình duyệt |
| ☐ | T−15 | ____ | p-value: ________ | Tab 7 |
| ☐ | T−10 | ____ | `pgrep` → `nohup … phat_lai_su_kien.py …` → `tail` | Cửa sổ 2 |
| ☐ | T−8 | ____ | Mồi 102605, 320844 | Cửa sổ 1 |
| ☐ | T−5 | ____ | `thinh-hanh/102605` (< 3) · trending đủ 10 · Message Count tăng | Cửa sổ 1, tab 6, 3 |

**Thứ tự:** mở đầu → demo (~10 phút, làm đủ cả phần “bỏ được”) → chuyển slide → thuyết trình → hỏi đáp

Mã user mới: `moi_________` · User có item mới: ________ · Nhóm lên lúc: ________
