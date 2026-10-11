#!/usr/bin/env bash
# Установка и обновление «Строй Комфорт» на чистом VPS с Ubuntu (например, Beget VPS).
#
#   curl -fsSL https://raw.githubusercontent.com/Shamaich011/stroy-komfort-quiz/claude/apartment-repair-cost-calc-yty2dt/deploy/install.sh | sudo bash -s -- calc.sk-krd.ru
#
# Аргумент — домен, который уже указывает на IP сервера (A-запись). Без домена сайт откроется по http://IP.
# Повторный запуск обновляет код до последней версии ветки; пароль и заявки сохраняются.
set -euo pipefail

DOMAIN="${1:-}"
REPO="https://github.com/Shamaich011/stroy-komfort-quiz.git"
BRANCH="${BRANCH:-claude/apartment-repair-cost-calc-yty2dt}"
APP_DIR=/opt/stroy-komfort
DATA_DIR=/var/lib/stroy-komfort
ENV_FILE=/etc/stroy-komfort.env
APP_USER=stroykomfort

if [ "$(id -u)" -ne 0 ]; then echo "Запустите через sudo или от root"; exit 1; fi
export DEBIAN_FRONTEND=noninteractive

echo "==> Пакеты"
apt-get update -y
apt-get install -y curl git ca-certificates gnupg debian-keyring debian-archive-keyring apt-transport-https

if ! command -v node >/dev/null || [ "$(node -p 'process.versions.node.split(".")[0]')" -lt 22 ]; then
  echo "==> Node.js 22"
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi

if ! command -v caddy >/dev/null; then
  echo "==> Caddy (веб-сервер с автоматическим HTTPS)"
  curl -1sLf https://dl.cloudsmith.io/public/caddy/stable/gpg.key | gpg --dearmor --yes -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt > /etc/apt/sources.list.d/caddy-stable.list
  apt-get update -y
  apt-get install -y caddy
fi

echo "==> Код приложения"
id -u "$APP_USER" >/dev/null 2>&1 || useradd --system --home "$APP_DIR" --shell /usr/sbin/nologin "$APP_USER"
if [ -d "$APP_DIR/.git" ]; then
  git -C "$APP_DIR" fetch --depth 1 origin "$BRANCH"
  git -C "$APP_DIR" reset --hard FETCH_HEAD
else
  git clone --depth 1 --branch "$BRANCH" "$REPO" "$APP_DIR"
fi
cd "$APP_DIR"
npm ci --omit=dev
mkdir -p "$DATA_DIR"
chown -R "$APP_USER":"$APP_USER" "$DATA_DIR"

NEW_PASSWORD=""
if [ ! -f "$ENV_FILE" ]; then
  NEW_PASSWORD="$(node -e "console.log(require('crypto').randomBytes(9).toString('base64url'))")"
  SECRET="$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")"
  cat > "$ENV_FILE" <<EOF
PORT=3000
DATA_DIR=$DATA_DIR
ADMIN_PASSWORD=$NEW_PASSWORD
SESSION_SECRET=$SECRET
# Уведомления о заявках в Telegram:
# TELEGRAM_BOT_TOKEN=
# TELEGRAM_CHAT_ID=
EOF
  chmod 600 "$ENV_FILE"
fi

cat > /etc/systemd/system/stroy-komfort.service <<EOF
[Unit]
Description=Stroy Komfort calculator
After=network.target

[Service]
User=$APP_USER
WorkingDirectory=$APP_DIR
EnvironmentFile=$ENV_FILE
ExecStart=/usr/bin/node --disable-warning=ExperimentalWarning server/index.js
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload
systemctl enable stroy-komfort >/dev/null
systemctl restart stroy-komfort

echo "==> Веб-сервер"
if [ -n "$DOMAIN" ]; then SITE="$DOMAIN"; else SITE=":80"; fi
cat > /etc/caddy/Caddyfile <<EOF
$SITE {
  encode gzip
  reverse_proxy 127.0.0.1:3000
}
EOF
systemctl reload caddy || systemctl restart caddy

if command -v ufw >/dev/null && ufw status | grep -q "Status: active"; then
  ufw allow 80/tcp >/dev/null; ufw allow 443/tcp >/dev/null
fi

sleep 2
if curl -fsS -o /dev/null http://127.0.0.1:3000/api/catalog; then STATUS="работает"; else STATUS="НЕ ОТВЕЧАЕТ — пришлите вывод: journalctl -u stroy-komfort -n 50"; fi
IP="$(curl -fsS -4 --max-time 5 https://ifconfig.me 2>/dev/null || hostname -I | awk '{print $1}')"
URL="${DOMAIN:+https://$DOMAIN}"; URL="${URL:-http://$IP}"

echo
echo "================================================"
echo " Приложение: $STATUS"
echo " Калькулятор: $URL/calc"
echo " Админка:     $URL/admin"
if [ -n "$NEW_PASSWORD" ]; then
  echo " Пароль админки: $NEW_PASSWORD   (сохраните его)"
else
  echo " Пароль админки прежний: sudo grep ADMIN_PASSWORD $ENV_FILE"
fi
echo "================================================"
