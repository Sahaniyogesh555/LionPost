# LionPost

A responsive React implementation of the authentic LionPost designs supplied in the **LionPost Design** Google Drive folder. It includes the public marketing site, real account authentication, a cloud-synced creator workspace, live content discovery, Gemini drafting, and connected social publishing.

**Production:** https://lionpost.vercel.app

**Preserved classic site:** https://lionpost-classic.vercel.app

## Run locally

```bash
npm install
cp .env.example .env.local
# Fill in the Supabase values and generate a TOKEN_ENCRYPTION_KEY.
npm run dev
```

The Vite server listens on `0.0.0.0:5173` and provides local middleware for the feed, social OAuth/publishing, temporary media, and account APIs. Generate a new 32-byte encryption key with:

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64url'))"
```

Never expose `SUPABASE_SERVICE_ROLE_KEY`, `TOKEN_ENCRYPTION_KEY`, OAuth client secrets, or Dailymotion private API secrets through a `VITE_` variable. The publishable Supabase key is the only Supabase credential intended for the browser.

## Production build

```bash
npm run build
npm run preview
```

## Functional workflows

- **Email authentication:** Supabase email signup, confirmation, login, password recovery/reset, verified password changes, and password-confirmed account deletion.
- **Cloud workspace:** Posts, social accounts, automations, notifications, and profile data are isolated by owner RLS policies. Existing browser work is migrated on first login; private browser state is cleared on logout.
- **Telegram:** Validated BotFather bot/chat connections, encrypted tokens, and text/image publishing.
- **Blogger:** Signed Google OAuth, encrypted offline tokens, blog discovery, Gemini article drafts, labels, and real Blogger API publishing.
- **X:** OAuth 2.0 + PKCE, encrypted refresh-token handling, account discovery, disconnect, and real text publishing. X is user-confirmed working; media is not currently supported.
- **Instagram:** Instagram API with Unified Login, professional-account discovery, encrypted Business Integration System User tokens, JPEG photos, MP4/MOV Reels, container processing, and permalinks.
- **Facebook Pages:** Facebook Login for Business, long-lived user/Page tokens, manageable-Page discovery, text posts, photos, and MP4 video upload through Meta's Resumable Upload API.
- **TikTok:** Login Kit OAuth, encrypted refresh tokens, live creator nickname/privacy/interaction options, manual privacy selection, commercial-content disclosures, creator-specific Direct Post duration checks and status polling, chunked MP4/MOV uploads, Direct Post or inbox-draft delivery, and photo posts/drafts through a signed LionPost media URL.
- **YouTube:** A dedicated Google OAuth client, encrypted refresh tokens, channel discovery, resumable video upload, visibility controls, and the creator's made-for-kids declaration.
- **Pinterest:** OAuth with encrypted refresh tokens, live board selection, and image Pin creation using a private upload converted to JPEG and sent as Base64.
- **Dailymotion:** API v2 private-key validation, encrypted user-supplied key/secret storage, manageable-profile discovery, upload sessions, visibility/category metadata, and made-for-kids declarations.
- **Content discovery:** Live Google Trends, RSS/Atom feeds, sitemaps, website previews, seen-item tracking, and duplicate prevention.
- **Gemini:** User-supplied API keys, model discovery/validation, and real text drafting. Raw keys remain session-only and go directly from the browser to Google.
- **Creation tools:** Branding, Pin Maker with real PNG export, video previews/history, automations, Blogger setup, notifications, dark mode, and responsive mobile layouts.

Every immediate publish saves an individual result or provider error for each selected account. Drafts and scheduled records are saved to the cloud, but **background scheduled publishing is not enabled yet**. First comments, Telegram video, X media, and Pinterest video Pins are not currently enabled; the composer rejects unsupported combinations instead of reporting false success.

> **Implementation is not activation.** New provider code does not include any provider credentials. Apart from the previously confirmed X workflow, each new OAuth connection and real publish must still be tested after the user adds credentials and completes provider-specific setup. Instagram OAuth/photo/Reel testing also remains necessary.

## Blogger OAuth activation

1. In Google Cloud, enable **Blogger API v3** and configure the OAuth consent screen.
2. Create an OAuth client of type **Web application**.
3. Add `https://lionpost.vercel.app/api/blogger/callback`. For local development, also add `http://localhost:5173/api/blogger/callback`.
4. Set `APP_URL`, `GOOGLE_CLIENT_ID`, and `GOOGLE_CLIENT_SECRET` in the server environment.
5. If the consent app is in testing mode, add each connecting Google account as a test user.

Do not add YouTube scopes to this Blogger client. Blogger brand verification and YouTube activation are intentionally separate.

## Instagram Unified Login activation

1. Create a business-portfolio-owned Meta app with **Manage messaging & content on Instagram** and an Instagram-compatible Facebook Login for Business configuration. Request `instagram_basic` and `instagram_content_publish`; retain permissions Meta marks as required, but do not add unused access.
2. Register `https://lionpost.vercel.app/api/instagram/callback` in the Unified Login configuration.
3. Set `META_APP_ID`, `META_APP_SECRET`, `META_INSTAGRAM_CONFIG_ID`, and optionally `META_GRAPH_API_VERSION` (default `v26.0`).
4. Apply the Supabase migrations. They create the private `post-media` bucket with owner-only RLS policies.
5. In Development mode, add the Instagram professional account as an Instagram Tester and accept its invitation. The account must belong to the selected business portfolio. Public client connections require the relevant Advanced Access/App Review and Live mode.

Successful OAuth alone does not prove publishing works; verify a real photo and Reel before treating the integration as live.

## Facebook Pages activation

Facebook Pages use a **separate Facebook Login for Business configuration**, not the Instagram configuration.

1. Add Facebook Login for Business to the Meta app and create a Page-publishing configuration requesting the Page permissions in `api/_lib/facebook.ts`: `pages_show_list`, `pages_read_engagement`, `pages_manage_posts`, `pages_manage_engagement`, `pages_read_user_engagement`, and `publish_video`.
2. Register `https://lionpost.vercel.app/api/facebook/callback` in that configuration.
3. Set `META_APP_ID`, `META_APP_SECRET`, and `META_FACEBOOK_CONFIG_ID`. The existing Meta app ID/secret can be shared with Instagram, but the two configuration IDs remain distinct.
4. Add the Pages to the selected business portfolio. The connecting person must be allowed to create content on each Page. LionPost discovers `/me/accounts` and, when needed, business-assigned Pages; it stores a Page token only after Meta returns one.
5. Development-mode roles and Meta App Review/Advanced Access rules still apply. A normal personal Facebook profile is not a publishing destination; this integration publishes to Pages.

Facebook text and photo posts use the Pages API. Video uploads require MP4 and use a user-token resumable upload followed by a Page-token video publish.

## TikTok activation

1. Create a TikTok developer app with **Login Kit**, **Content Posting API / Upload to TikTok**, and **Direct Post**. Request `user.info.basic`, `video.upload`, and `video.publish`. If the portal includes `video.upload` by default, retain it and demonstrate the real inbox-draft flow rather than submitting an unrelated demo.
2. Register `https://lionpost.vercel.app/api/tiktok/callback` as a Login Kit redirect URI.
3. Set `TIKTOK_CLIENT_KEY` and `TIKTOK_CLIENT_SECRET`. Keep `TIKTOK_PUBLIC_POSTING=false` initially. Reconnect existing TikTok accounts after adding `video.upload` so their encrypted grants include both content permissions.
4. **Direct Post:** before every post, LionPost queries TikTok's creator-info endpoint and displays the latest creator nickname, currently allowed privacy choices, interaction availability, and maximum video duration. Privacy has no default; interactions and commercial disclosure are opt-in. Photo posts expose Allow Comment only. The server revalidates creator settings, branded-content visibility, disclosure choices, and the MP4/MOV movie duration before sending content to TikTok.
5. **Inbox draft:** the composer offers a separate TikTok delivery mode using `video.upload`. Video drafts use `/v2/post/publish/inbox/video/init/`, accept up to 10 minutes, and do not send a LionPost caption. Photo drafts use `post_mode=MEDIA_UPLOAD` and include the title/description. After transfer, LionPost polls `/v2/post/publish/status/fetch/`: only `SEND_TO_USER_INBOX` is reported as an inbox handoff, while `PUBLISH_COMPLETE` means the creator already finished posting through TikTok's editing flow. Processing remains explicitly pending, failures include TikTok's non-secret reason, and **Posts → Check TikTok status** re-checks both new and earlier attempts by their owned account and publishing ID.
6. **Videos:** MP4/MOV bytes are uploaded directly to TikTok in sequential chunks for either delivery mode; no media-domain verification is needed for this transfer mode. LionPost requires TikTok's documented HTTP `206` for intermediate chunks and `201` for the final chunk rather than treating any 2xx response as a completed upload.
7. **Photos:** TikTok permits `PULL_FROM_URL` only for photo posts and drafts. In the TikTok app's **Production** view, open **URL properties → Verify properties → URL prefix** and verify `https://lionpost.vercel.app/` (including the trailing slash). Repeat the property verification in **Sandbox** when requested. This prefix covers LionPost's `/api/tiktok/media` photo URLs. The Production signature `public/tiktokVKnEZGubnBlhpTrJBCMgdg9dxVklCBrk.txt` and Sandbox signature `public/tiktokzBhL3mIL5nfzDP8P90KQJAzTmoKKiif4.txt` are both served at the site root; keep each property's file in place. If TikTok issues a different signature file for a property, deploy that exact file at the verified prefix before selecting **Verify**. LionPost serves the owner's private image through a two-hour HMAC-signed URL only after authorization by its signed media grant. Without this separate Content Posting URL-property verification, video publishing can work while photo publishing fails with `url_ownership_unverified`; reconnecting OAuth does not fix it.
8. Unaudited TikTok clients are restricted by TikTok, including `SELF_ONLY` Direct Post to a **TikTok account that is itself private**, plus test-user limits. If TikTok returns `unaudited_client_can_only_post_to_private_accounts`, enable **TikTok → Profile → Menu → Settings and privacy → Privacy → Private account** and retry with Only me; reconnecting does not fix that provider restriction. After a successful audit, set `TIKTOK_PUBLIC_POSTING=true` to expose the creator's non-private options. This variable cannot bypass TikTok's own enforcement.
9. First app review requires a genuine Sandbox demo on `lionpost.vercel.app`. Show Login Kit plus every selected content scope: a complete Direct Post and a separate inbox draft upload followed by the TikTok inbox editing flow. Do not describe an inbox upload as already published. Use the [TikTok Production review runbook](docs/tiktok-review.md) for the recording sequence, copy/paste scope explanations, and submission checklist.

## YouTube activation

YouTube is deliberately isolated from Blogger OAuth and Blogger branding.

1. Use a dedicated Google Cloud project or a dedicated Web OAuth client and enable **YouTube Data API v3**.
2. Add `https://lionpost.vercel.app/api/youtube/callback` as its authorized redirect URI.
3. Set `YOUTUBE_CLIENT_ID` and `YOUTUBE_CLIENT_SECRET`; do not substitute `GOOGLE_CLIENT_ID` or reuse the Blogger client.
4. The YouTube flow requests only `youtube.readonly` and `youtube.upload`, with offline access and incremental grants disabled. The connecting Google account must have a manageable YouTube channel.
5. Complete any Google verification/testing and quota requirements that apply to this separate YouTube app. No change to the Blogger brand-verification flow is required by this codebase.

The composer supports private, unlisted, or public uploads and sends the creator's made-for-kids declaration. YouTube processing can continue after a video ID is returned.

## Pinterest activation

1. Create a Pinterest developer app and register `https://lionpost.vercel.app/api/pinterest/callback` exactly as its redirect URI.
2. Request `user_accounts:read`, `boards:read`, `boards:write`, `pins:read`, and `pins:write`.
3. Set `PINTEREST_CLIENT_ID` and `PINTEREST_CLIENT_SECRET`.
4. Complete any Pinterest app access/review requirements. The connecting account must have at least one board; boards are loaded live in the composer.

This integration creates **image Pins**. Photos remain in private Supabase storage until the server reads them for the Pinterest Base64 request, then the temporary object is removed.

## Dailymotion API v2 activation

Dailymotion's current API v2 uses a private API key and client-credentials token, not a browser OAuth redirect.

1. In Dailymotion Studio, open **Settings → Account → API keys → Create API key** and choose **Private API key**.
2. Apply it to the intended profiles and enable `account.read`, `profile.read`, and `video.manage`. Save the secret immediately; Dailymotion shows it only once.
3. In LionPost **Accounts → Dailymotion**, enter the key and secret. LionPost validates them, calls `/v2/me`, discovers manageable profiles, and encrypts both values before storage. They are never written to browser storage.
4. Optionally set `DAILYMOTION_CATEGORY` on the server (default `entertainment`). No Dailymotion client secret needs to be added to Vercel.

Videos use Dailymotion upload sessions rather than external-source URLs, so the separate external-URL source entitlement is not required. Encoding can continue after the video record is created.

## Media and credential protection

- Six normalized Supabase tables use per-user ownership and cascading deletion.
- Browser roles cannot read or write the `social_connections` credential table.
- OAuth tokens and Dailymotion private credentials are encrypted with AES-256-GCM, never returned by an API, and deleted on disconnect.
- Publishing media uses the private `post-media` bucket with owner-scoped paths and policies. Images are converted to JPEG; MP4/MOV videos are limited to 100 MB.
- Meta receives short-lived signed Supabase URLs when its API needs to fetch media. TikTok video, YouTube, Pinterest, and Dailymotion use server-side byte transfers. TikTok photos alone use a signed, expiring LionPost capability URL because TikTok requires a verified public photo URL.
- When several providers share one upload, the composer defers deletion until every selected provider finishes, then calls the authenticated cleanup endpoint. A TikTok photo still being downloaded is retained with its owner-scoped publishing result and removed after a terminal status check; video bytes need no such retention. Cleanup is best effort and never rewrites an already-determined provider result.
- Account deletion verifies the current password and removes the Auth user and all owned cloud records.

## Serverless routing

`api/providers.ts` consolidates Facebook, TikTok, YouTube, Pinterest, Dailymotion, and temporary-media operations into **one** Vercel function. Explicit `vercel.json` rewrites preserve provider-specific URLs. Together with the existing routes this keeps the deployment at the Hobby plan's **12-function maximum**; do not split these providers into additional function files without changing the hosting plan.

Production callbacks:

- `https://lionpost.vercel.app/api/facebook/callback`
- `https://lionpost.vercel.app/api/tiktok/callback`
- `https://lionpost.vercel.app/api/youtube/callback`
- `https://lionpost.vercel.app/api/pinterest/callback`

Dailymotion has no callback. Existing Instagram, X, and Blogger callbacks remain unchanged.

## Integration test

```bash
npm run test:integration
```

The existing integration test requires the server environment and outbound Supabase access. It creates temporary confirmed users, checks real Auth/RLS/cloud behavior, and uses mocked Telegram and Google OAuth/Blogger APIs for deterministic success/partial-failure/photo/article flows. It does not prove live provider activation. Real OAuth and publishing checks for Instagram and the newly added providers require the user's apps, credentials, test accounts, and provider approvals.

## Stack

- React 19 + TypeScript + React Router
- Vite + Vercel Node functions
- Supabase Auth, Postgres, Storage, and row-level security
- Official provider APIs + AES-256-GCM credential encryption
- Gemini API, RSS/Atom, sitemaps, and Google Trends
- Lucide icons, self-hosted Nunito, and custom responsive CSS

## Main routes

- `/` — landing page
- `/login`, `/signup`, `/reset-password` — authentication
- `/privacy`, `/terms` — public privacy policy and terms of service
- `/app` — protected dashboard
- `/app/new-post` — composer and connected publishing
- `/app/posts` — post history and per-account publish results
- `/app/accounts` — provider connections
- `/app/auto-post` — automation hub
