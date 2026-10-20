import crypto from 'node:crypto';

// AES-256-GCM vault for third-party tokens. The key comes from LIONPOST_SECRET,
// or a local file is created on first boot (never committed).
import fs from 'node:fs';
import path from 'node:path';

let key;
function vaultKey() {
  if (key) return key;
  const env = process.env.LIONPOST_SECRET;
  if (env) { key = crypto.createHash('sha256').update(env).digest(); return key; }
  const file = process.env.LIONPOST_KEY_FILE
    || (process.env.VERCEL ? '/tmp/.lionpost-vault-key' : path.join(process.cwd(), 'data', '.vault-key'));
  try {
    key = Buffer.from(fs.readFileSync(file, 'utf8').trim(), 'hex');
    if (key.length !== 32) throw new Error('bad key');
  } catch {
    key = crypto.randomBytes(32);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, key.toString('hex'), { mode: 0o600 });
  }
  return key;
}

export function encrypt(plain) {
  if (plain == null || plain === '') return null;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', vaultKey(), iv);
  const enc = Buffer.concat([cipher.update(String(plain), 'utf8'), cipher.final()]);
  return ['v1', iv.toString('base64'), cipher.getAuthTag().toString('base64'), enc.toString('base64')].join(':');
}

export function decrypt(payload) {
  if (!payload) return null;
  const [v, iv, tag, data] = String(payload).split(':');
  if (v !== 'v1') return null;
  try {
    const decipher = crypto.createDecipheriv('aes-256-gcm', vaultKey(), Buffer.from(iv, 'base64'));
    decipher.setAuthTag(Buffer.from(tag, 'base64'));
    return Buffer.concat([decipher.update(Buffer.from(data, 'base64')), decipher.final()]).toString('utf8');
  } catch { return null; }
}

export function maskSecret(secret) {
  if (!secret) return '';
  const s = String(secret);
  return s.length <= 8 ? '••••' : `${s.slice(0, 4)}••••${s.slice(-4)}`;
}
