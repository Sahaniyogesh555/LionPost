# Recon: AlphaPost (alphapost.io)

Date: 2026-10-20. Method: public pages only (home, tools index and individual
tool pages, community index, blog, signup). No account was used, no login wall
was crossed, nothing was scraped beyond ordinary page reads.

## What the product is

A free, account-based social automation suite: one login, sixteen tools, plus a
creator forum. The automation model is "bring your own AI key" (Google Gemini)
and "connect your own pages". Nothing is billed; there is no pricing page.

## Surfaces

| Surface | Notes |
| --- | --- |
| Marketing site | `alphapost.io`: home, `/tools/{slug}` (one page per tool), `/community`, `/blog`, legal pages |
| App | `app.alphapost.io`: register, login, dashboard, one route per tool (`/keywords`, `/aeo`, `/videos`, `/carousel`, `/free/website-to-social-media-auto-post`) |
| Community | Public read. Post and comment require an account. Categories, pinned posts, likes, comments, profiles at `/u/{handle}` |
| Android app | Google Play listing referenced, not inspected |

## Screens (inferred)

Public: home, tools index, 16 tool pages, community feed, category feed, post
detail, profile, blog index, blog article, register, login, legal.
App: dashboard, composer, schedule, connections, keyword research, AEO checker,
video maker, carousel maker, shorts maker, translator, pin maker, webhook feed,
settings.

## Flows

1. Visitor reads the home page, opens a tool page, registers.
2. New account connects a Facebook Page / Instagram / X / Pinterest / Telegram /
   TikTok / YouTube and pastes a Gemini key.
3. User writes one post, selects several connected channels, ships now or
   schedules a time.
4. User creates an automation: topic + cadence, the system writes and posts.
5. User runs keyword research, saves a list.
6. User runs the AEO checker on a URL, gets a score and fixes.
7. User makes a video or carousel on-device and downloads or schedules it.
8. User points the site at an RSS feed; each new item is shared.
9. Member posts in the forum, gets replies and likes, earns a badge.

## Data model (inferred)

users, sessions, connections (encrypted tokens), posts (social posts and queue
items), schedules, automations, runs, articles, feeds, keywords, aeo_reports,
community_posts, comments, likes, notifications, media.

## What is out of scope for the clone

- Other people's social accounts and their OAuth apps: the clone ships adapters
  and a verifiable webhook target; live posting needs the user's own keys.
- AlphaPost's own AI providers and photo catalogue: the clone ships its own
  generator and lets the user bring a Gemini key.
- The Android app.
- Their community content, copy, logo, wolf mark and blog posts.

## Size

Medium. The interesting work is the scheduler, the content engine and the
forum. Everything else is CRUD plus three client-side canvases.

## Legal notes

Clean-room rebuild of functionality only. No AlphaPost copy, markup, assets,
trademarks or content is reused. The clone is branded LionPost with its own
palette, words and logo. See `../memory.md` and the pack's fine print.
