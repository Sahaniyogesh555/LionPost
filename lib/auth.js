import crypto from 'node:crypto';

const N = 16384, R = 8, P = 1, KEYLEN = 32;

export function hashPassword(password) {
  if (typeof password !== 'string' || password.length < 8) {
    throw new Error('Password must be at least 8 characters');
  }
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, KEYLEN, { N, r: R, p: P }).toString('hex');
  return `scrypt:${N}:${R}:${P}:${salt}:${hash}`;
}

export function verifyPassword(password, stored) {
  if (!stored) return false;
  const [scheme, n, r, p, salt, hash] = String(stored).split(':');
  if (scheme !== 'scrypt') return false;
  const derived = crypto.scryptSync(password, salt, KEYLEN, { N: +n, r: +r, p: +p });
  const expected = Buffer.from(hash, 'hex');
  return derived.length === expected.length && crypto.timingSafeEqual(derived, expected);
}

export const randomToken = (bytes = 32) => crypto.randomBytes(bytes).toString('hex');
export const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');

export function createSession(db, userId, userAgent = '') {
  const token = randomToken();
  const csrf = randomToken(16);
  const created = new Date();
  const expires = new Date(Date.now() + 30 * 86400000);
  db.prepare(`INSERT INTO sessions (user_id,token_hash,csrf,user_agent,created_at,expires_at)
              VALUES (?,?,?,?,?,?)`)
    .run(userId, sha256(token), csrf, String(userAgent).slice(0, 250), created.toISOString(), expires.toISOString());
  return { token, csrf, expires };
}

export function sessionFromToken(db, token) {
  if (!token) return null;
  const row = db.prepare(`SELECT s.id AS sid, s.csrf, s.expires_at, u.*
                          FROM sessions s JOIN users u ON u.id = s.user_id
                          WHERE s.token_hash = ?`).get(sha256(token));
  if (!row) return null;
  if (new Date(row.expires_at).getTime() < Date.now()) {
    db.prepare('DELETE FROM sessions WHERE id = ?').run(row.sid);
    return null;
  }
  return { ...row, session_id: row.sid, csrf_token: row.csrf };
}

export function destroySession(db, token) {
  if (token) db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(sha256(token));
}

// Simple in-memory throttle for credential stuffing and hot endpoints.
const buckets = new Map();
export function hitLimit(key, limit, windowMs) {
  const t = Date.now();
  const b = buckets.get(key) || { count: 0, reset: t + windowMs };
  if (t > b.reset) { b.count = 0; b.reset = t + windowMs; }
  b.count += 1;
  buckets.set(key, b);
  return b.count > limit;
}
export function resetLimits() { buckets.clear(); }

export function publicUser(u) {
  if (!u) return null;
  return {
    id: u.id, name: u.name, handle: u.handle, email: u.email,
    bio: u.bio, website: u.website, avatar_color: u.avatar_color, role: u.role,
    created_at: u.created_at,
  };
}

// --- password resets -------------------------------------------------------
// The raw token only ever exists in the reset link; the database keeps its
// SHA-256. One hour to live, single use, and issuing a new one retires the old.
export function issuePasswordReset(db, userId, ttlMinutes = 60) {
  const token = randomToken();
  const now = new Date();
  const expires = new Date(now.getTime() + ttlMinutes * 60000);
  db.prepare('DELETE FROM password_resets WHERE user_id = ? AND used_at IS NULL').run(userId);
  db.prepare(`INSERT INTO password_resets (user_id, token_hash, created_at, expires_at)
              VALUES (?,?,?,?)`)
    .run(userId, sha256(token), now.toISOString(), expires.toISOString());
  return { token, expires };
}

export function findPasswordReset(db, token) {
  if (!token) return null;
  const row = db.prepare(`SELECT r.*, u.email, u.name FROM password_resets r
                          JOIN users u ON u.id = r.user_id
                          WHERE r.token_hash = ?`).get(sha256(String(token)));
  if (!row) return null;
  if (row.used_at) return null;
  if (new Date(row.expires_at).getTime() < Date.now()) return null;
  return row;
}

export function consumePasswordReset(db, resetId, userId, password) {
  const now = new Date().toISOString();
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hashPassword(password), userId);
  db.prepare('UPDATE password_resets SET used_at = ? WHERE id = ?').run(now, resetId);
  db.prepare('DELETE FROM password_resets WHERE user_id = ? AND used_at IS NULL').run(userId);
  // Every existing session dies with the old password.
  db.prepare('DELETE FROM sessions WHERE user_id = ?').run(userId);
}
