# TikTok Production review runbook

Prepared for the LionPost Sandbox integration on 31 October 2026. This is a recording and submission checklist, not evidence of approval. Do not submit until the real recordings are complete and checked.

## Verified integration and completed real tests

- Integrated website: `https://lionpost.vercel.app/`
- Login Kit callback: `https://lionpost.vercel.app/api/tiktok/callback`
- Terms: `https://lionpost.vercel.app/terms`
- Privacy: `https://lionpost.vercel.app/privacy`
- Content Posting URL prefix: `https://lionpost.vercel.app/`
- Products/scopes to demonstrate: Login Kit, `user.info.basic`, `video.publish`, and `video.upload`.
- Real OAuth connection succeeded.
- Real Direct Post photo succeeded as `SELF_ONLY` on a private creator account.
- Real Direct Post video succeeded as `SELF_ONLY` on a private creator account.
- Real video inbox upload reached `SEND_TO_USER_INBOX`, and the notification appeared in TikTok.
- Real photo inbox upload reached `SEND_TO_USER_INBOX`, and the delayed notification appeared in TikTok.
- Public posting has not been enabled or claimed. Sandbox/unaudited Direct Post remains private.

Keep the TikTok creator account private during the demo. Do not add scopes that LionPost does not use, and do not show client secrets, access tokens, Supabase credentials, Vercel environment values, or other private credentials in a recording.

## Recording setup

TikTok permits at least one demo video and up to five videos, with a maximum of 50 MB each. Use three short recordings so each product flow stays clear and comfortably below the size limit:

1. `01-login-and-direct-post.mp4`
2. `02-video-inbox-draft.mp4`
3. `03-photo-inbox-draft.mp4`

Use 720p or 1080p and pause/resume recording while TikTok processes media. A delayed notification is not a reason to create a duplicate upload. At the start of every browser recording, keep the address bar visible long enough to show `lionpost.vercel.app`. Use original test media that you have the right to publish.

Do not show the Developer Portal client secret or cloud credential settings. Avoid recording an OAuth callback URL containing a fresh authorization code; pause while the redirect completes if necessary.

## Video 1 — Login Kit and Direct Post

### A. Login Kit and `user.info.basic`

1. Open `https://lionpost.vercel.app/app/accounts` with the domain visible.
2. On the TikTok card, select **Manage**. This starts a fresh OAuth authorization without deleting the existing LionPost account entry or post history.
3. On TikTok's authorization page, show the requested permissions and approve `user.info.basic`, `video.publish`, and `video.upload`. Do not hide or deselect a scope that will be demonstrated.
4. Return to LionPost and show the connected TikTok account and success result.
5. If TikTok immediately redirects because access was already authorized and no meaningful Login Kit interaction is visible, stop that take. Remove LionPost from the TikTok account's own app-permission settings, then record the **Manage → authorize** flow again. Do not delete the LionPost account entry merely to force a demo.

### B. Direct Post and `video.publish`

1. Open **New post** on `lionpost.vercel.app`.
2. Enter editable original text and add a short original MP4. Leave the media preview visible.
3. Select only the connected TikTok account and choose **Direct Post to TikTok profile**.
4. Clearly show:
   - the latest TikTok creator nickname;
   - the manually selected **Only me (private)** privacy option, with no preselected privacy;
   - the creator's maximum video duration and the preview;
   - Allow Comment, Allow Duet, and Allow Stitch, all opt-in;
   - Commercial content disclosure, off by default;
   - the declaration **“By posting, you agree to TikTok's Music Usage Confirmation.”**
5. Select **Publish now** to provide explicit consent and start the transfer. Do not start the upload before this click.
6. Wait for LionPost's provider status result. If necessary, use **Posts → Check TikTok status**; do not create a duplicate.
7. Show the resulting private video on the same TikTok creator profile. Explain verbally or with an on-screen note that unaudited Sandbox Direct Post is private; do not present it as a public post.

## Video 2 — Video inbox draft and `video.upload`

1. Start again on `https://lionpost.vercel.app/app/new-post` with the domain visible.
2. Add a short original MP4 and select only the connected TikTok account.
3. Choose **Upload to TikTok inbox as a draft**. Show the explanation that a video draft does not accept a LionPost caption and is not posted automatically.
4. Select **Upload TikTok draft** and wait for the actual status.
5. Show either the confirmed inbox-delivery result or **Posts → Check TikTok status**. Only `SEND_TO_USER_INBOX` is an inbox handoff; processing is not delivery.
6. On the same TikTok account, open **Inbox → System notifications**, then open the LionPost video notification.
7. Show TikTok's editing flow, add/review the caption there, and finish with private visibility. Pause and resume if the notification is delayed; never upload a duplicate merely to shorten the recording.

## Video 3 — Photo inbox draft and `video.upload`

1. Start on the real LionPost New post page with the domain visible.
2. Add an original photo and an editable title/description, then select only TikTok.
3. Choose **Upload to TikTok inbox as a draft**. Show the photo-draft explanation and select **Upload TikTok draft**.
4. Show the confirmed status or use **Check TikTok status** after processing.
5. On the same TikTok account, open the photo notification through **Inbox → System notifications**, not the ordinary profile Drafts screen.
6. Show the photo editing flow and finish privately. If delivery is delayed, pause and resume without re-uploading.

## Copy/paste review explanation

**What LionPost does**

LionPost is a browser-based content-creation and publishing workspace for creators. A creator connects an account they own, previews original content, chooses the destination and delivery mode, and expressly starts each transfer. LionPost is available as a creator tool rather than a private utility limited to accounts managed by the developer.

**Login Kit and user.info.basic**

From LionPost Accounts, the creator starts TikTok Login Kit and approves the requested permissions on TikTok. LionPost uses `user.info.basic` to identify the authorized account and display the correct connected identity in the creator's workspace. The callback establishes the creator's own connection; it does not access another user's account.

**Direct Post and video.publish**

For Direct Post, the creator adds original media and editable text, sees a preview and the latest creator nickname, and manually selects from the privacy options returned for that creator. LionPost displays opt-in interaction controls and commercial-content disclosures, enforces the creator's maximum video duration, and presents the required music-usage consent declaration before the creator selects Publish now. The server rechecks the creator options and polls the publishing status. Photo posts use a verified LionPost URL prefix; device videos use file upload. During the unaudited Sandbox demonstration, the creator account is private and visibility is SELF_ONLY. LionPost does not claim that this is public posting.

**Upload to TikTok and video.upload**

The creator separately chooses Upload to TikTok inbox as a draft. LionPost transfers the selected video or photo only after the creator clicks Upload TikTok draft. It checks the actual processing status and distinguishes processing, inbox delivery, failure, and later publication. Only SEND_TO_USER_INBOX is reported as an inbox handoff. The creator then opens the TikTok inbox notification, reviews and edits the content in TikTok, and decides whether to publish it. A video draft does not receive a LionPost caption; a photo draft carries its title and description into TikTok's editing flow. An inbox upload is never described as automatic profile publication.

**Credential and media handling**

TikTok client credentials remain server-side. Offline connection credentials are encrypted with AES-256-GCM and are not returned to the browser. Temporary media is owner-scoped. TikTok photo URLs use short-lived signed LionPost grants under the verified URL prefix; a still-downloading photo is retained until a terminal status check. The creator can disconnect the account, which deletes the stored encrypted connection credential.

**Demonstration environment**

The recordings use the actual integration at `https://lionpost.vercel.app` with the Sandbox target account. They show Login Kit and every requested scope: `user.info.basic`, `video.publish`, and `video.upload`. All posts in the demonstration remain private. No mockup, static connected state, public-posting claim, or unrelated provider flow is substituted for the TikTok integration.

## Final submission checklist

1. Check all three videos for visible UI interactions, the real domain, the correct TikTok account, and every selected product/scope. Confirm each file is below 50 MB.
2. Confirm the public landing page's visible footer links open the active Privacy Policy and Terms pages without requiring a menu.
3. In TikTok for Developers, switch to **Production → Draft → Import** and import the tested Sandbox configuration if it is not already present.
4. Recheck Production app details, icon, Web/Desktop URL, Login Kit callback, Terms, Privacy, Content Posting products, all three scopes, and verified URL properties. Do not remove `video.upload`; the demo uses it genuinely.
5. Open **App review**, provide the detailed product/scope explanation, and upload the three completed videos.
6. Save the review information. Do not submit until the recordings and configuration have been checked.
7. After submission, do not change the reviewed configuration unless TikTok requests a correction. Watch for reviewer questions and respond with real evidence.

## Only after approval

Public posting is a separate post-approval step. Before enabling it, confirm the Direct Post audit is approved. Then the creator may make their TikTok account public, LionPost can set `TIKTOK_PUBLIC_POSTING=true`, creator options can be refreshed, and a real **Everyone** post can be tested. Do not change that flag merely to bypass the Sandbox restriction.
