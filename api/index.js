/* Vercel entry point.
 *
 * The app is one request handler, so the whole product runs as a single Node
 * function. The instance is cached per lambda container: the schema is created
 * and seeded once, then every request in that container reuses it.
 *
 * Serverless means the SQLite file lives in /tmp and does not outlive a cold
 * start, and the scheduler worker does not run. Manual runs work; see
 * README "Deploying" for the persistence and cron options.
 */
import { getDb } from '../lib/db.js';
import { buildApp } from '../lib/app.js';

let app = null;

export default async function handler(req, res) {
  if (!app) {
    const db = getDb();
    app = buildApp(db);
  }
  return app.handle(req, res);
}
