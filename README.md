# LionPost

A responsive React implementation of the authentic LionPost designs supplied in the **LionPost Design** Google Drive folder. It includes the public marketing site, real account authentication, a cloud-synced creator workspace, live content discovery, Gemini drafting, and Telegram publishing.

## Run locally

```bash
npm install
cp .env.example .env.local
# Fill in the Supabase values and generate a TOKEN_ENCRYPTION_KEY.
npm run dev
```

The Vite server listens on `0.0.0.0:5173` and provides local middleware for the feed, Telegram, and account APIs. Generate a new 32-byte encryption key with:

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64url'))"
```

Never expose `SUPABASE_SERVICE_ROLE_KEY` or `TOKEN_ENCRYPTION_KEY` through a `VITE_` variable. The publishable Supabase key is the only Supabase credential intended for the browser.

## Production build

```bash
npm run build
npm run preview
```

## Functional workflows

- **Email authentication:** Supabase email signup, confirmation, login, password recovery/reset, verified password changes, and password-confirmed account deletion.
- **Cloud workspace:** Posts, social accounts, automations, notifications, and profile data are isolated by owner RLS policies. Existing browser work is migrated on first login; private browser state is cleared on logout.
- **Telegram:** Connect a BotFather bot to a channel or group. The server validates the bot/chat and posting permission, encrypts the token with AES-256-GCM, and publishes text or uploaded images through the Bot API. Per-account results and errors appear in Post history.
- **Blogger:** Signed Google OAuth, offline refresh-token encryption, blog discovery, Gemini article drafts, and real Blogger API publishing with labels and live article links. Manual blog names/URLs are never treated as Google connections.
- **Content discovery:** Live Google Trends, RSS/Atom feeds, sitemaps, website previews, seen-item tracking, and duplicate prevention.
- **Gemini:** User-supplied API keys, model discovery/validation, and real text drafting. Raw keys remain session-only and go directly from the browser to Google.
- **Creation tools:** Branding, Pin Maker with real PNG export, video previews/history, automations, Blogger setup, notifications, dark mode, and responsive mobile layouts.

Drafts and scheduled records are saved to the cloud, but **background scheduled publishing is not enabled yet**. Non-Telegram social profiles are explicitly marked as draft-only until their real OAuth/publishing integrations exist. Full server-side video rendering and other social OAuth are separate future work. Blogger requires the Google OAuth activation below before users can connect.

## Blogger OAuth activation

The Blogger workflow is implemented, but Google does not allow publishing without an OAuth Web client. To activate it:

1. In Google Cloud, enable **Blogger API v3** and configure the OAuth consent screen.
2. Create an OAuth client of type **Web application**.
3. Add this authorized redirect URI: `https://alphapost-preview.vercel.app/api/blogger/callback`. For local development, also add `http://localhost:5173/api/blogger/callback`.
4. Set `APP_URL`, `GOOGLE_CLIENT_ID`, and `GOOGLE_CLIENT_SECRET` in the server environment. Keep the client secret sensitive and never expose it with a `VITE_` variable.
5. If the Google consent app is in testing mode, add each connecting Google account as a test user. Google verification requirements can apply to public apps using Blogger scopes.

Until those credentials are configured, **Connect Blogger** returns an explicit setup error rather than creating a fake connection.

## Data protection

- Six normalized Supabase tables use per-user ownership and cascading deletion.
- Browser roles cannot read or write the `social_connections` credential table.
- Telegram tokens are never written to browser storage or returned by an API.
- Account deletion verifies the current password and removes the Auth user and all owned cloud records.
- No website advertisements or fixed demo content are included.

## Integration test

```bash
npm run test:integration
```

The test requires the server environment and outbound Supabase access. It creates two temporary confirmed users, checks real Auth/RLS/cloud behavior, uses mocked Telegram and Google OAuth/Blogger APIs for deterministic success/partial-failure/photo/article flows, verifies encryption and cascades, and deletes the temporary users in `finally`. It does not need or use a real Telegram bot or Google OAuth client.

## Stack

- React 19 + TypeScript + React Router
- Vite + Vercel Node functions
- Supabase Auth, Postgres, and row-level security
- Telegram Bot API + AES-256-GCM credential encryption
- Gemini API, RSS/Atom, sitemaps, and Google Trends
- Lucide icons, self-hosted Nunito, and custom responsive CSS

## Main routes

- `/` — landing page
- `/login`, `/signup`, `/reset-password` — authentication
- `/app` — protected dashboard
- `/app/new-post` — composer and Telegram publishing
- `/app/posts` — post history and publish results
- `/app/accounts` — Telegram connections and draft profiles
- `/app/auto-post` — automation hub
