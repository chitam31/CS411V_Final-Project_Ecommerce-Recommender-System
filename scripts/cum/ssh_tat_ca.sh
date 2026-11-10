#!/usr/bin/env bash
# ssh_tat_ca.sh - điều khiển nhiều máy của cụm từ MỘT máy qua SSH.
# Windows: chạy trong cửa sổ Git Bash (có sẵn khi cài Git for Windows). KHÔNG gõ "bash ..." trong
# PowerShell: lệnh đó gọi WSL chứ không phải Git Bash, và PowerShell 5.1 ghi ">" theo UTF-16
# làm hỏng ~/.ssh/config. Linux: chạy bằng bash.
#
# Danh sách máy và IP lấy từ cau_hinh/cum.env. Tên SSH của mỗi máy chính là tên trong danh bạ
# (labsoe-11, labsit12, ...), khai báo trong ~/.ssh/config bằng --tao-config.
#
#   bash scripts/cum/ssh_tat_ca.sh --tao-config > ~/.ssh/config    # một lần (tài khoản lấy từ TAI_KHOAN_SSH)
#   bash scripts/cum/ssh_tat_ca.sh --chep-khoa                       # một lần: chép khóa công khai sang từng máy
#   bash scripts/cum/ssh_tat_ca.sh hostname                          # chạy LẦN LƯỢT trên 6 máy lab, master trước
#   bash scripts/cum/ssh_tat_ca.sh --song-song "nproc; free -g"      # chạy ĐỒNG THỜI, gom kết quả theo máy
#   bash scripts/cum/ssh_tat_ca.sh --vai-tro spark-worker "docker ps"
#   bash scripts/cum/ssh_tat_ca.sh --may labsit12,labsit "cd ~/bd03_khuyen_nghi && git pull"
#   bash scripts/cum/ssh_tat_ca.sh --tty "sudo apt-get install -y chrony"   # lệnh cần gõ mật khẩu sudo
#   bash scripts/cum/ssh_tat_ca.sh --song-song --chay-tep scripts/cum/khao_sat_may.sh   # chạy một script cục bộ trên từng máy
#
# Mặc định chọn các máy hạ tầng của cụm (namenode, datanode, spark-master, spark-worker, kafka),
# tức 6 máy lab; --tat-ca chọn thêm máy web. Máy demo (Windows) không bao giờ được chọn vì đó
# chính là máy đang điều khiển.
set -uo pipefail
THU_MUC="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
. "$THU_MUC/cau_hinh/cum.env"

SONG_SONG=0; TTY=0; TAT_CA=0; VAI_TRO=""; DS_MAY=""; TEP=""; CHE_DO="lenh"
SSH_USER_MAC_DINH="${SSH_USER:-hduser}"
KHOA="${KHOA:-$HOME/.ssh/id_ed25519.pub}"

while [ $# -gt 0 ]; do
  case "$1" in
    --song-song) SONG_SONG=1 ;;
    --tty) TTY=1 ;;
    --tat-ca) TAT_CA=1 ;;
    --vai-tro) VAI_TRO="${2:?Thiếu tên vai trò}"; shift ;;
    --may) DS_MAY="${2:?Thiếu danh sách máy}"; shift ;;
    --chay-tep) TEP="${2:?Thiếu đường dẫn tệp script}"; shift ;;
    --tao-config) CHE_DO="tao_config" ;;
    --chep-khoa) CHE_DO="chep_khoa" ;;
    --) shift; break ;;
    -*) echo "Tùy chọn không hợp lệ: $1" >&2; exit 2 ;;
    *) break ;;
  esac
  shift
done
LENH="$*"

chon_may() {  # in "ten ip" của các máy được chọn, đúng thứ tự trong danh bạ
  local bien ten ip vai
  for bien in $(compgen -v MAY_ | sort -t_ -k2 -n); do
    IFS='|' read -r ten ip vai _ _ <<< "${!bien}"
    [[ ",$vai," == *",may-demo,"* ]] && continue
    if [ -n "$DS_MAY" ]; then
      [[ ",$DS_MAY," == *",$ten,"* ]] || continue
    elif [ -n "$VAI_TRO" ]; then
      [[ ",$vai," == *",$VAI_TRO,"* ]] || continue
    elif [ "$TAT_CA" != "1" ]; then
      [[ "$vai" =~ (namenode|datanode|spark-master|spark-worker|kafka) ]] || continue
    fi
    echo "$ten $ip"
  done
}

# ---------------------------------------------------------------- sinh ~/.ssh/config
tai_khoan() {  # tài khoản SSH của máy $1 theo TAI_KHOAN_SSH trong cum.env
  local cap
  for cap in ${TAI_KHOAN_SSH:-}; do
    [ "${cap%%=*}" = "$1" ] && { echo "${cap#*=}"; return; }
  done
  echo "$SSH_USER_MAC_DINH"
}

if [ "$CHE_DO" = "tao_config" ]; then
  TAT_CA=1
  mapfile -t CAC_MAY < <(chon_may)
  echo "# --- Cụm bd03, sinh từ cau_hinh/cum.env (tài khoản theo TAI_KHOAN_SSH) ---"
  for dong in "${CAC_MAY[@]}"; do
    ten="${dong%% *}"
    [[ " ${TAI_KHOAN_SSH:-} " == *" $ten="* ]] || echo "# $ten: chưa khai báo tài khoản trong TAI_KHOAN_SSH, đang dùng mặc định"
    # accept-new: tự nhận khóa của máy lần đầu kết nối (mạng riêng ZeroTier), nhưng vẫn
    # từ chối nếu khóa của máy đã biết bị thay đổi.
    printf 'Host %s\n    HostName %s\n    User %s\n    IdentityFile ~/.ssh/id_ed25519\n    StrictHostKeyChecking accept-new\n    ServerAliveInterval 30\n\n' \
      "$ten" "${dong#* }" "$(tai_khoan "$ten")"
  done
  exit 0
fi

mapfile -t CAC_MAY < <(chon_may)
[ ${#CAC_MAY[@]} -gt 0 ] || { echo "Không có máy nào khớp điều kiện chọn" >&2; exit 2; }

# ---------------------------------------------------------------- chép khóa công khai
if [ "$CHE_DO" = "chep_khoa" ]; then
  [ -f "$KHOA" ] || { echo "Chưa có khóa $KHOA. Tạo bằng: ssh-keygen -t ed25519 -C bd03" >&2; exit 1; }
  LOI=0
  for dong in "${CAC_MAY[@]}"; do
    ten="${dong%% *}"
    echo "===== $ten (${dong#* }): nhập mật khẩu tài khoản trên máy này, chỉ cần một lần"
    # Chỉ thêm khóa nếu chưa có, nên chạy lại nhiều lần cũng không bị trùng dòng.
    ssh -o ConnectTimeout=8 "$ten" \
      'k=$(cat); mkdir -p ~/.ssh && chmod 700 ~/.ssh && touch ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys && (grep -qxF "$k" ~/.ssh/authorized_keys || echo "$k" >> ~/.ssh/authorized_keys)' \
      < "$KHOA" || { echo "!! $ten: chép khóa thất bại"; LOI=1; }
  done
  exit $LOI
fi

# ---------------------------------------------------------------- chạy lệnh
if [ -n "$TEP" ]; then
  # Gửi nội dung script cục bộ qua stdin cho bash trên máy đích: máy đích không cần có repo.
  [ -f "$TEP" ] || { echo "Không thấy tệp $TEP" >&2; exit 2; }
  [ "$TTY" = "1" ] && { echo "--tty không dùng cùng --chay-tep được" >&2; exit 2; }
  LENH="bash -s -- $LENH"
fi
[ -n "$LENH" ] || { echo "Thiếu lệnh. Ví dụ: bash scripts/cum/ssh_tat_ca.sh hostname" >&2; exit 2; }

goi_ssh() {  # $1 = tên máy, phần còn lại = tùy chọn ssh bổ sung
  local ten="$1"; shift
  if [ -n "$TEP" ]; then
    ssh "$@" -o ConnectTimeout=8 "$ten" "$LENH" < "$TEP"
  elif [ "$TTY" = "1" ]; then
    ssh -t "$@" -o ConnectTimeout=8 "$ten" "$LENH"
  else
    ssh -n "$@" -o ConnectTimeout=8 "$ten" "$LENH"
  fi
}

LOI=0
if [ "$SONG_SONG" = "1" ]; then
  [ "$TTY" = "1" ] && { echo "--tty không dùng cùng --song-song được" >&2; exit 2; }
  TAM="$(mktemp -d)"
  for dong in "${CAC_MAY[@]}"; do
    ten="${dong%% *}"
    # BatchMode: chế độ song song không hỏi mật khẩu (cần đã chép khóa), tránh treo cả lô.
    ( goi_ssh "$ten" -o BatchMode=yes > "$TAM/$ten.log" 2>&1; echo $? > "$TAM/$ten.ma" ) &
  done
  wait
  for dong in "${CAC_MAY[@]}"; do
    ten="${dong%% *}"; ma="$(cat "$TAM/$ten.ma")"
    echo "===== $ten (mã thoát $ma)"
    sed "s/^/[$ten] /" "$TAM/$ten.log"
    [ "$ma" = "0" ] || LOI=1
  done
  rm -rf "$TAM"
else
  for dong in "${CAC_MAY[@]}"; do
    ten="${dong%% *}"
    echo "===== $ten (${dong#* })"
    goi_ssh "$ten"
    ma=$?
    [ "$ma" = "0" ] || { echo "!! $ten: mã thoát $ma"; LOI=1; }
  done
fi
exit $LOI
