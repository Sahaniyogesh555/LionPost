# AlphaPost

A responsive React implementation of the AlphaPost designs supplied in the **LionPost Design** Google Drive folder. It includes the public marketing site, authentication screens, and a broad creator workspace with a warm cream background, rounded cards, colorful tool icons, and yellow primary actions.

## Run locally

```bash
npm install
npm run dev
```

The Vite server listens on `0.0.0.0:5173`.

## Production build

```bash
npm run build
npm run preview
```

## Included screens

- Public landing page with tools, community preview, statistics, FAQ, and calls to action
- Login and account creation with client-side validation
- Home dashboard with live post/account counts, quick tools, upcoming posts, and recent activity
- New Post composer with account selection, media upload, first comment, send-now, and scheduling
- Post history with search, filters, duplication, send-now, deletion, and CSV export
- Social account connection and removal workflows
- AI and website auto-post setup, scheduling, editing, pausing, running, and deletion
- Gemini key management with masked-key display and model status UI
- Branding editor with live photo/design-card previews and saved preferences
- Video Automation, Shorts Maker, Bee TikTok, and Video Translator workspaces with local video previews and creation history
- Pin Maker with multiple products, six visual styles, palettes, live preview, publishing, and real 1000 × 1500 PNG export
- Pinterest Affiliate automation management and setup guide
- Blogger connections and article automations
- Trends, keyword research, AEO content analysis, Learn & Earn, and emulator guide
- Community discussions, likes, replies, search, and new posts
- Profile, settings, notifications, dark mode, and plan selection

## Data and integrations

The app is a fully interactive front-end implementation. Demo account data, posts, preferences, automations, community activity, and history are stored in browser `localStorage`. No credentials are transmitted to a server.

Real social-network OAuth/publishing, Gemini API generation, AliExpress/Blogger APIs, and server-side AI video rendering require production credentials and backend services. The UI is structured so those integrations can be connected next.

## Stack

- React 19 + TypeScript
- React Router
- Vite
- Lucide icons
- Nunito variable font (self-hosted through Fontsource)
- Custom responsive CSS with light and dark themes

## Main routes

- `/` — landing page
- `/login` and `/signup` — authentication
- `/app` — dashboard
- `/app/new-post` — composer
- `/app/posts` — post history
- `/app/accounts` — social accounts
- `/app/auto-post` — automation hub
- `/app/community` — creator community
