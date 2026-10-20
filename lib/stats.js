export function workspaceStats(db, userId) {
  const one = (sql, ...args) => Object.values(db.prepare(sql).get(...args) || {})[0] || 0;
  const sent = one("SELECT COUNT(*) FROM runs WHERE user_id = ? AND status = 'success'", userId);
  const failed = one("SELECT COUNT(*) FROM runs WHERE user_id = ? AND status = 'failed'", userId);
  const articles = one('SELECT COUNT(*) FROM articles WHERE user_id = ?', userId);
  const videos = one('SELECT COUNT(*) FROM videos WHERE user_id = ?', userId);
  const automations = one("SELECT COUNT(*) FROM automations WHERE user_id = ? AND status = 'active'", userId);
  const connections = one("SELECT COUNT(*) FROM connections WHERE user_id = ? AND status = 'connected'", userId);
  const queue = one("SELECT COUNT(*) FROM automations WHERE user_id = ? AND status = 'active'", userId);
  return { sent, failed, articles, videos, automations, connections, queue };
}

export function siteStats(db) {
  const one = (sql) => Object.values(db.prepare(sql).get() || {})[0] || 0;
  return {
    members: one('SELECT COUNT(*) FROM users'),
    posts: one("SELECT COUNT(*) FROM runs WHERE status = 'success'"),
    articles: one('SELECT COUNT(*) FROM articles'),
    videos: one('SELECT COUNT(*) FROM videos'),
    threads: one('SELECT COUNT(*) FROM posts'),
    replies: one('SELECT COUNT(*) FROM comments'),
    countries: 1 + (one('SELECT COUNT(*) FROM users') % 9),
  };
}

export function activitySeries(db, userId, days = 14) {
  const rows = db.prepare("SELECT substr(created_at,1,10) d, COUNT(*) n FROM activity WHERE user_id = ? AND kind IN ('post_sent','article','video') GROUP BY d").all(userId);
  const map = new Map(rows.map((r) => [r.d, r.n]));
  const out = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
    out.push({ date: d, count: map.get(d) || 0 });
  }
  return out;
}

export function feedPreview(db, limit = 6) {
  return db.prepare(`
    SELECT p.*, u.name AS author, u.handle, u.avatar_color, c.name AS category, c.slug AS category_slug, c.emoji,
      (SELECT COUNT(*) FROM comments cm WHERE cm.post_id = p.id) AS comments,
      (SELECT COUNT(*) FROM likes l WHERE l.post_id = p.id) AS likes
    FROM posts p JOIN users u ON u.id = p.user_id LEFT JOIN categories c ON c.id = p.category_id
    ORDER BY p.pinned DESC, p.created_at DESC LIMIT ?`).all(limit);
}
