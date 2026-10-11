import crypto from 'node:crypto';
import path from 'node:path';
import { openDb } from './db.js';
import { createApp } from './app.js';

const dataDir = process.env.DATA_DIR || path.resolve('data');
const db = openDb(path.join(dataDir, 'stroy-komfort.db'));

let adminPassword = process.env.ADMIN_PASSWORD;
if (!adminPassword) {
  adminPassword = crypto.randomBytes(9).toString('base64url');
  console.warn(`ADMIN_PASSWORD не задан. Временный пароль админки: ${adminPassword}`);
}
const sessionSecret = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');

const { TELEGRAM_BOT_TOKEN: tgToken, TELEGRAM_CHAT_ID: tgChat } = process.env;
async function notify(text) {
  if (!tgToken || !tgChat) return;
  await fetch(`https://api.telegram.org/bot${tgToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: tgChat, text }),
  });
}

const app = createApp({ db, adminPassword, sessionSecret, notify });
const port = Number(process.env.PORT) || 3000;
app.listen(port, () => console.log(`Строй Комфорт: http://localhost:${port}`));
