#!/usr/bin/env bash
# do_mang.sh - đo chất lượng mạng ZeroTier giữa các máy của cụm, chạy từ máy điều khiển (Git Bash).
# Chỉ đọc, không cần sudo, không đụng tới container nào.
#
#   bash scripts/cum/do_mang.sh              # phần 1 (Wi-Fi, IP LAN, ping chéo) + phần 2 (tốc độ tải)
#   bash scripts/cum/do_mang.sh --chi-ping   # chỉ phần 1, xong trong vài giây
#   bash scripts/cum/do_mang.sh --nguon labsit12        # đo tốc độ tải từ labsit12 thay vì từ master
#   KICH_THUOC_MB=64 bash scripts/cum/do_mang.sh        # tệp thử lớn hơn (mặc định 16 MB)
#
# Phần 1, trên từng máy: mạng Wi-Fi đang nối, cường độ sóng, IP LAN, rồi ping IP ZeroTier của mọi
#   máy khác. Độ trễ trung bình dưới 20 ms gần như chắc chắn là đường nối thẳng (DIRECT); từ vài
#   chục ms trở lên thường là đi qua máy chuyển tiếp của ZeroTier (RELAY). Muốn xác nhận chắc
#   chắn: bash scripts/cum/ssh_tat_ca.sh --tty "sudo zerotier-cli peers".
# Phần 2: máy nguồn (mặc định master) phát một tệp ngẫu nhiên qua HTTP trên IP ZeroTier của nó;
#   từng máy còn lại lần lượt tải về và báo MB/s. Đây là con số quyết định tốc độ HDFS và shuffle.
set -uo pipefail

# ------------------------------------------------ phần chạy TRÊN máy đích (gửi qua stdin)
tren_may() {  # $@ = danh sách IP ZeroTier của các máy cần ping
  local zt wifi ssid song toc dich kq mat tb nhan_xet
  zt="$(ip -4 -o addr show 2>/dev/null | grep -o '10\.68\.71\.[0-9]*' | head -1)"
  echo "IP ZeroTier: ${zt:-KHONG THAY (may chua vao mang ttunet?)}"
  if command -v nmcli > /dev/null; then
    # --rescan no: đọc kết quả quét sẵn có, không bắt card Wi-Fi quét lại (gây trễ chốc lát)
    wifi="$(nmcli -t -f IN-USE,SSID,SIGNAL,RATE dev wifi list --rescan no 2>/dev/null | grep '^\*' | head -1)"
    IFS=: read -r _ ssid song toc <<< "$wifi"
    echo "Wi-Fi: ${ssid:-(khong noi Wi-Fi)} | song ${song:-?}% | toc do lien ket ${toc:-?}"
    nmcli -t -f DEVICE,TYPE,STATE dev 2>/dev/null | awk -F: '$2=="ethernet"{print "Cong mang day " $1 ": " $3}'
  fi
  ip -4 -o addr show scope global 2>/dev/null \
    | awk '$2 !~ /^(docker|br-|veth|zt)/ {print "IP LAN " $2 ": " $4}'
  echo "Gateway: $(ip route 2>/dev/null | awk '/^default/{print $3; exit}')"
  for dich in "$@"; do
    [ "$dich" = "$zt" ] && continue
    kq="$(ping -c 5 -i 0.3 -W 2 -q "$dich" 2>/dev/null)"
    mat="$(grep -o '[0-9.]*% packet loss' <<< "$kq" | cut -d% -f1)"
    tb="$(awk -F/ '/^(rtt|round-trip)/{print $5}' <<< "$kq")"
    if [ -z "$tb" ]; then nhan_xet="KHONG PING DUOC"
    elif awk -v t="$tb" 'BEGIN{exit !(t < 20)}'; then nhan_xet="nhanh (noi thang)"
    else nhan_xet="CHAM (nghi di qua relay)"
    fi
    printf 'ping %-14s tb %8s ms  mat %3s%%  %s\n' "$dich" "${tb:--}" "${mat:-100}" "$nhan_xet"
  done
}

tai_ve() {  # $1 = URL; in số MB, thời gian và tốc độ
  python3 - "$1" <<'PY'
import sys, time, urllib.request
bat_dau = time.time()
n = 0
try:
    with urllib.request.urlopen(sys.argv[1], timeout=180) as r:
        while True:
            khoi = r.read(1 << 20)
            if not khoi:
                break
            n += len(khoi)
except Exception as loi:
    print("LOI tai ve: %s" % loi)
    sys.exit(1)
giay = max(time.time() - bat_dau, 1e-3)
mb = n / 1048576
print("%.1f MB trong %.1f s = %.2f MB/s" % (mb, giay, mb / giay))
PY
}

case "${1:-}" in
  --tren-may) shift; tren_may "$@"; exit 0 ;;
  --tai-ve) tai_ve "${2:?Thiếu URL}"; exit $? ;;
esac

# ------------------------------------------------ phần chạy trên máy điều khiển
TEP_NAY="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/$(basename "${BASH_SOURCE[0]}")"
THU_MUC="$(cd "$(dirname "$TEP_NAY")/../.." && pwd)"
SSH_TAT_CA=(bash "$THU_MUC/scripts/cum/ssh_tat_ca.sh")
TUY_CHON_NOI=(-o "ConnectTimeout=${SSH_CHO:-20}" -o ConnectionAttempts=3 -o BatchMode=yes)
MB="${KICH_THUOC_MB:-16}"
CONG=18099
TAM_XA=/tmp/bd03_do_mang
CHI_PING=0; NGUON=""
while [ $# -gt 0 ]; do
  case "$1" in
    --chi-ping) CHI_PING=1 ;;
    --nguon) NGUON="${2:?Thiếu tên máy nguồn}"; shift ;;
    *) echo "Tùy chọn không hợp lệ: $1" >&2; exit 2 ;;
  esac
  shift
done

mapfile -t CAC_MAY < <("${SSH_TAT_CA[@]}" --liet-ke)
[ ${#CAC_MAY[@]} -gt 0 ] || { echo "Danh bạ cau_hinh/cum.env không có máy nào" >&2; exit 2; }
CAC_IP=(); for dong in "${CAC_MAY[@]}"; do CAC_IP+=("${dong#* }"); done

echo "################ Phần 1: Wi-Fi, IP LAN và ping chéo giữa ${#CAC_MAY[@]} máy"
"${SSH_TAT_CA[@]}" --song-song --chay-tep "$TEP_NAY" -- --tren-may "${CAC_IP[@]}"
[ "$CHI_PING" = "1" ] && exit 0

[ -n "$NGUON" ] || NGUON="${CAC_MAY[0]%% *}"
IP_NGUON=""
for dong in "${CAC_MAY[@]}"; do [ "${dong%% *}" = "$NGUON" ] && IP_NGUON="${dong#* }"; done
[ -n "$IP_NGUON" ] || { echo "Không có máy $NGUON trong danh bạ" >&2; exit 2; }
URL="http://$IP_NGUON:$CONG/f"

echo
echo "################ Phần 2: tải tệp $MB MB từ $NGUON ($IP_NGUON) về từng máy, lần lượt từng máy"
don_dep() { ssh -n "${TUY_CHON_NOI[@]}" "$NGUON" "pkill -f 'http[.]server $CONG' ; rm -rf $TAM_XA" > /dev/null 2>&1; }
trap don_dep EXIT
# setsid + chuyển hết vào/ra: phiên SSH kết thúc ngay, máy chủ HTTP vẫn chạy. timeout 900: dù
# script bị ngắt giữa chừng, máy chủ tạm cũng tự tắt sau 15 phút.
if ! ssh -n "${TUY_CHON_NOI[@]}" "$NGUON" "mkdir -p $TAM_XA && head -c ${MB}M /dev/urandom > $TAM_XA/f && cd $TAM_XA \
     && (setsid timeout 900 python3 -m http.server $CONG --bind $IP_NGUON > /dev/null 2>&1 < /dev/null &) && sleep 2"; then
  echo "!! Không dựng được máy chủ tải thử trên $NGUON"; exit 1
fi
for dong in "${CAC_MAY[@]}"; do
  ten="${dong%% *}"
  [ "$ten" = "$NGUON" ] && continue
  printf '%-14s ' "$ten"
  ssh "${TUY_CHON_NOI[@]}" "$ten" "bash -s -- --tai-ve $URL" < "$TEP_NAY" 2>&1 | tail -1
done
if command -v curl > /dev/null; then
  printf '%-14s ' "may-dieu-khien"
  curl -s -o /dev/null --max-time 180 -w '%{size_download} %{time_total}\n' "$URL" \
    | awk '$1 > 0 && $2 > 0 {m = $1/1048576; printf "%.1f MB trong %.1f s = %.2f MB/s\n", m, $2, m/$2; next} {print "LOI tai ve"}'
fi
echo
echo "Mốc so sánh: ngày 10/11/2026, khi phòng labsit dùng Wi-Fi \"TTU Open\" (đường RELAY), ghi 100 MB"
echo "vào HDFS mất 248 s, tức khoảng 0,4 MB/s. Cụm chạy được dữ liệu thật khi các máy đạt vài MB/s trở lên."
