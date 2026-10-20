import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { App } from './http.js';
import { sessionFromToken } from './auth.js';
import { siteRoutes } from '../routes/site.js';
import { communityRoutes } from '../routes/community.js';
import { appRoutes } from '../routes/app.js';
import { apiRoutes } from '../routes/api.js';
import { metaRoutes } from '../routes/meta.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function buildApp(db, { publicDir = path.join(__dirname, '..', 'public') } = {}) {
  const app = new App({ db, publicDir });
  app.before(async (ctx) => {
    const user = sessionFromToken(db, ctx.cookies.lion_session);
    if (user) ctx.user = user;
  });
  app.use(metaRoutes());
  app.use(siteRoutes());
  app.use(communityRoutes());
  app.use(appRoutes());
  app.use(apiRoutes());
  return app;
}
