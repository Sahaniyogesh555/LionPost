import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { CalendarClock, Check, FileImage, Link2, MessageSquare, Plus, Send, Sparkles, X } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { useAuth } from '../context/AuthContext'
import PlatformIcon from '../components/PlatformIcon'
import { Button, Card, CheckBox, Field, IconBadge, PageHeader } from '../components/UI'
import { isConnectedAccount, readFileAsDataUrl } from '../utils'
import { generateSocialDraft } from '../services/gemini'
import { publishToTelegram } from '../services/telegram'
import { publishToX } from '../services/x'
import { publishToInstagram } from '../services/instagram'
import { uploadPostMedia } from '../services/media'
import { cleanupPostMedia, getPinterestBoards, getTikTokOptions, publishToProvider, type PinterestBoardOption, type TikTokOptions } from '../services/providers'
import type { Platform, PublishResult, RemoteProvider, SocialAccount } from '../types'

const providerPlatforms: Record<RemoteProvider, Platform> = {
  facebook: 'Facebook',
  tiktok: 'TikTok',
  youtube: 'YouTube',
  pinterest: 'Pinterest',
  dailymotion: 'Dailymotion',
}

const privacyLabels: Record<string, string> = {
  SELF_ONLY: 'Only me (private)',
  PUBLIC_TO_EVERYONE: 'Everyone (public)',
  MUTUAL_FOLLOW_FRIENDS: 'Mutual followers',
  FOLLOWER_OF_CREATOR: 'Followers',
}

export default function NewPost() {
  const { accounts, addPost, notify } = useApp()
  const { session } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)
  const [text, setText] = useState((location.state as { text?: string } | null)?.text || '')
  const [media, setMedia] = useState('')
  const [mediaFile, setMediaFile] = useState<File | null>(null)
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image')
  const [selected, setSelected] = useState<string[]>(accounts.slice(0, 1).map((account) => account.id))
  const [branding, setBranding] = useState(true)
  const [firstComment, setFirstComment] = useState(false)
  const [comment, setComment] = useState('')
  const [when, setWhen] = useState<'publish' | 'draft' | 'later'>('draft')
  const [schedule, setSchedule] = useState(() => {
    const date = new Date(Date.now() + 86400000)
    date.setMinutes(0, 0, 0)
    return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
  })
  const [error, setError] = useState('')
  const [generating, setGenerating] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [tiktokOptions, setTikTokOptions] = useState<TikTokOptions | null>(null)
  const [tiktokOptionsError, setTikTokOptionsError] = useState('')
  const [tiktokOptionsLoading, setTikTokOptionsLoading] = useState(false)
  const [tiktokPrivacy, setTikTokPrivacy] = useState('SELF_ONLY')
  const [pinterestBoards, setPinterestBoards] = useState<PinterestBoardOption[]>([])
  const [pinterestBoardsError, setPinterestBoardsError] = useState('')
  const [pinterestBoardsLoading, setPinterestBoardsLoading] = useState(false)
  const [pinterestBoard, setPinterestBoard] = useState('')
  const [videoPrivacy, setVideoPrivacy] = useState<'private' | 'unlisted' | 'public'>('private')
  const [dailymotionVisibility, setDailymotionVisibility] = useState<'private' | 'public'>('private')
  const [madeForKids, setMadeForKids] = useState(false)

  const chosenAccounts = accounts.filter((account) => selected.includes(account.id))
  const tiktokAccount = chosenAccounts.find((account) => account.connectionType === 'tiktok')
  const pinterestAccount = chosenAccounts.find((account) => account.connectionType === 'pinterest')
  const youtubeSelected = chosenAccounts.some((account) => account.connectionType === 'youtube')
  const dailymotionSelected = chosenAccounts.some((account) => account.connectionType === 'dailymotion')

  useEffect(() => () => {
    if (media.startsWith('blob:')) URL.revokeObjectURL(media)
  }, [media])

  useEffect(() => {
    let cancelled = false
    setTikTokOptions(null)
    setTikTokOptionsError('')
    if (when !== 'publish' || !tiktokAccount?.id || !session?.access_token) {
      setTikTokOptionsLoading(false)
      return
    }
    setTikTokOptionsLoading(true)
    getTikTokOptions(session.access_token, tiktokAccount.id).then((options) => {
      if (cancelled) return
      setTikTokOptions(options)
      setTikTokPrivacy((current) => options.privacyLevelOptions.includes(current) ? current : options.privacyLevelOptions.includes('SELF_ONLY') ? 'SELF_ONLY' : options.privacyLevelOptions[0] || '')
      if (!options.privacyLevelOptions.length) setTikTokOptionsError('TikTok returned no privacy option this server is allowed to use. Complete the app audit or reconnect with the required permissions.')
    }).catch((caught) => {
      if (!cancelled) setTikTokOptionsError(caught instanceof Error ? caught.message : 'TikTok creator options could not be loaded.')
    }).finally(() => {
      if (!cancelled) setTikTokOptionsLoading(false)
    })
    return () => { cancelled = true }
  }, [when, tiktokAccount?.id, session?.access_token])

  useEffect(() => {
    let cancelled = false
    setPinterestBoards([])
    setPinterestBoardsError('')
    if (when !== 'publish' || !pinterestAccount?.id || !session?.access_token) {
      setPinterestBoardsLoading(false)
      return
    }
    setPinterestBoardsLoading(true)
    getPinterestBoards(session.access_token, pinterestAccount.id).then((boards) => {
      if (cancelled) return
      setPinterestBoards(boards)
      setPinterestBoard((current) => boards.some((board) => board.id === current) ? current : boards[0]?.id || '')
      if (!boards.length) setPinterestBoardsError('No Pinterest boards were returned. Create a board in Pinterest, then reopen this composer.')
    }).catch((caught) => {
      if (!cancelled) setPinterestBoardsError(caught instanceof Error ? caught.message : 'Pinterest boards could not be loaded.')
    }).finally(() => {
      if (!cancelled) setPinterestBoardsLoading(false)
    })
    return () => { cancelled = true }
  }, [when, pinterestAccount?.id, session?.access_token])

  const upload = async (file?: File) => {
    if (!file) return
    if (file.type.startsWith('video/')) {
      if (file.size > 100 * 1024 * 1024) return notify('Please choose a video smaller than 100 MB.', 'error')
      setMediaType('video')
      setMediaFile(file)
      setMedia(URL.createObjectURL(file))
      return
    }
    if (file.size > 3 * 1024 * 1024) return notify('For local saving, please choose an image smaller than 3 MB.', 'error')
    setMediaType('image')
    setMediaFile(file)
    setMedia(await readFileAsDataUrl(file))
  }

  const clearMedia = () => {
    setMedia('')
    setMediaFile(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (publishing) return
    setError('')
    if (!text.trim() && !media) return setError('Write something or add a photo first.')
    if (!chosenAccounts.length) return setError('Choose at least one account to post to.')
    if (when === 'later' && !schedule) return setError('Pick a date and time for your post.')
    if (when === 'publish') {
      if (!session?.access_token) return setError('Sign in again before publishing.')
      const telegramAccounts = chosenAccounts.filter((account) => account.connectionType === 'telegram')
      const xAccounts = chosenAccounts.filter((account) => account.connectionType === 'x')
      const instagramAccounts = chosenAccounts.filter((account) => account.connectionType === 'instagram')
      const remoteGroups: [RemoteProvider, SocialAccount[]][] = (['facebook', 'tiktok', 'youtube', 'pinterest', 'dailymotion'] as RemoteProvider[]).map((provider) => [provider, chosenAccounts.filter((account) => account.connectionType === provider)])
      const remoteCount = remoteGroups.reduce((total, [, group]) => total + group.length, 0)
      if (telegramAccounts.length + xAccounts.length + instagramAccounts.length + remoteCount !== chosenAccounts.length) return setError('Remove draft-only or Blogger profiles from this selection. Use the dedicated Blogger page for articles.')
      if (instagramAccounts.length && xAccounts.length) return setError('Publish to Instagram and X separately: Instagram requires media, while X publishing is currently text-only.')
      if (instagramAccounts.length && (!media || !mediaFile)) return setError('Instagram publishing requires a photo or video. Add media or remove Instagram from this selection.')
      if (xAccounts.length && media) return setError('X publishing currently supports text posts only. Remove the media or remove X from this selection.')
      if (xAccounts.length && Array.from(text.trim()).length > 280) return setError('X posts can contain at most 280 characters. Shorten this post or remove X from this selection.')
      if (telegramAccounts.length && mediaType === 'video' && media) return setError('Telegram video publishing is not connected yet. Choose an image, remove Telegram, or save a draft.')
      const facebookAccounts = remoteGroups.find(([provider]) => provider === 'facebook')?.[1] || []
      const tiktokAccounts = remoteGroups.find(([provider]) => provider === 'tiktok')?.[1] || []
      const youtubeAccounts = remoteGroups.find(([provider]) => provider === 'youtube')?.[1] || []
      const pinterestAccounts = remoteGroups.find(([provider]) => provider === 'pinterest')?.[1] || []
      const dailymotionAccounts = remoteGroups.find(([provider]) => provider === 'dailymotion')?.[1] || []
      if (facebookAccounts.length && mediaType === 'video' && mediaFile?.type === 'video/quicktime') return setError('Facebook Page video publishing requires MP4. Convert the MOV file or remove Facebook from this selection.')
      if (tiktokAccounts.length > 1 || youtubeAccounts.length > 1 || pinterestAccounts.length > 1 || dailymotionAccounts.length > 1) return setError('TikTok, YouTube, Pinterest, and Dailymotion each accept one selected account per post. Publish to additional accounts separately.')
      if (tiktokAccounts.length && (!media || !mediaFile)) return setError('TikTok publishing requires a photo or video.')
      if (youtubeAccounts.length && (!mediaFile || mediaType !== 'video')) return setError('YouTube publishing requires a video. Add one or remove YouTube from this selection.')
      if (dailymotionAccounts.length && (!mediaFile || mediaType !== 'video')) return setError('Dailymotion publishing requires a video. Add one or remove Dailymotion from this selection.')
      if (pinterestAccounts.length && (!mediaFile || mediaType !== 'image')) return setError('Pinterest currently creates image Pins. Add a photo or remove Pinterest from this selection.')
      if (pinterestAccounts.length && Array.from(text.trim()).length > 800) return setError('Pinterest descriptions can contain at most 800 characters. Shorten this post or remove Pinterest from this selection.')
      if (tiktokAccounts.length) {
        if (tiktokOptionsLoading) return setError('Wait for the current TikTok privacy options to load.')
        if (tiktokOptionsError) return setError(tiktokOptionsError)
        if (!tiktokOptions || !tiktokPrivacy || !tiktokOptions.privacyLevelOptions.includes(tiktokPrivacy)) return setError('Choose a current TikTok privacy option before publishing.')
      }
      if (pinterestAccounts.length) {
        if (pinterestBoardsLoading) return setError('Wait for your Pinterest boards to load.')
        if (pinterestBoardsError) return setError(pinterestBoardsError)
        if (!pinterestBoard || !pinterestBoards.some((board) => board.id === pinterestBoard)) return setError('Choose a current Pinterest board before publishing.')
      }
      if (firstComment && comment.trim()) return setError('First comments are not supported by connected publishing yet. Turn that option off first.')

      setPublishing(true)
      const results: PublishResult[] = []
      let mediaPath = ''
      try {
        if (mediaFile && (instagramAccounts.length || remoteGroups.some(([, group]) => group.length))) {
          try {
            mediaPath = (await uploadPostMedia(mediaFile, session.user.id, mediaType, { instagram: instagramAccounts.length > 0 })).path
          } catch (caught) {
            const message = caught instanceof Error ? caught.message : 'The media could not be uploaded.'
            setError(message)
            notify(message, 'error')
            return
          }
        }
        if (telegramAccounts.length) {
          try {
            results.push(...await publishToTelegram(session.access_token, { accountIds: telegramAccounts.map((account) => account.id), text: text.trim(), image: media || undefined }))
          } catch (caught) {
            const message = caught instanceof Error ? caught.message : 'Telegram publishing failed.'
            results.push(...telegramAccounts.map((account) => ({ accountId: account.id, platform: 'Telegram' as const, status: 'failed' as const, error: message })))
          }
        }
        if (xAccounts.length) {
          try {
            results.push(...await publishToX(session.access_token, { accountIds: xAccounts.map((account) => account.id), text: text.trim() }))
          } catch (caught) {
            const message = caught instanceof Error ? caught.message : 'X publishing failed.'
            results.push(...xAccounts.map((account) => ({ accountId: account.id, platform: 'X' as const, status: 'failed' as const, error: message })))
          }
        }
        if (instagramAccounts.length) {
          try {
            results.push(...await publishToInstagram(session.access_token, { accountIds: instagramAccounts.map((account) => account.id), text: text.trim(), mediaPath, mediaType, cleanupMedia: false }))
          } catch (caught) {
            const message = caught instanceof Error ? caught.message : 'Instagram publishing failed.'
            results.push(...instagramAccounts.map((account) => ({ accountId: account.id, platform: 'Instagram' as const, status: 'failed' as const, error: message })))
          }
        }
        for (const [provider, group] of remoteGroups) {
          if (!group.length) continue
          try {
            results.push(...await publishToProvider(provider, session.access_token, {
              accountIds: group.map((account) => account.id),
              text: text.trim(),
              mediaPath: mediaPath || undefined,
              mediaType: mediaFile ? mediaType : undefined,
              cleanupMedia: false,
              privacyLevel: tiktokPrivacy,
              boardId: pinterestBoard,
              videoPrivacy,
              dailymotionVisibility,
              madeForKids,
            }))
          } catch (caught) {
            const message = caught instanceof Error ? caught.message : `${providerPlatforms[provider]} publishing failed.`
            results.push(...group.map((account) => ({ accountId: account.id, platform: providerPlatforms[provider], status: 'failed' as const, error: message })))
          }
        }
        const failed = results.filter((result) => result.status === 'failed').length
        addPost({ text: text.trim(), platforms: chosenAccounts.map((account) => account.platform), status: failed ? 'failed' : 'sent', image: mediaType === 'image' ? media || undefined : undefined, publishResults: results })
        notify(failed ? `${results.length - failed} published; ${failed} failed. Open Posts for the provider errors.` : `Published to ${results.length} ${results.length === 1 ? 'account' : 'accounts'}.`, failed ? 'error' : 'success')
        navigate('/app/posts')
      } finally {
        if (mediaPath) {
          try { await cleanupPostMedia(session.access_token, mediaPath) } catch { /* Provider results are already determined; cleanup is best effort. */ }
        }
        setPublishing(false)
      }
      return
    }
    addPost({ text: text.trim(), platforms: chosenAccounts.map((account) => account.platform), status: when === 'later' ? 'scheduled' : 'draft', scheduledAt: when === 'later' ? new Date(schedule).toISOString() : undefined, image: mediaType === 'image' ? media || undefined : undefined, firstComment: firstComment ? comment : undefined })
    notify(when === 'later' ? 'Post saved to your cloud schedule. Background publishing is not connected yet.' : 'Draft saved to your cloud workspace.')
    navigate('/app/posts')
  }

  const generateText = async () => {
    setGenerating(true)
    setError('')
    try {
      const topic = text.trim() || 'a practical, timely insight for people who create and publish online'
      const result = await generateSocialDraft(topic)
      setText(result)
      notify('Gemini wrote a new post draft.')
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : 'Gemini could not write this post.'
      setError(message)
      notify(message, 'error')
    } finally {
      setGenerating(false)
    }
  }

  return <div className="new-post-page">
    <PageHeader title="New post" subtitle="Write it once. Pick where it goes." />
    <form className="two-column-form" onSubmit={submit}>
      <div className="form-main-column">
        <Card className="form-card" title="Your post" subtitle="Write it once. Add photos or videos. Pick where it goes." action={<IconBadge color="yellow"><Sparkles size={18} /></IconBadge>}>
          <div className="field-heading-row"><Field label="Post text" /><button type="button" className="ai-write-button" onClick={generateText} disabled={generating}>{generating ? <span className="spinner" /> : <Sparkles size={14} />} {generating ? 'Writing with Gemini…' : 'Write with Gemini'}</button></div>
          <textarea className="post-textarea" value={text} onChange={(event) => setText(event.target.value)} placeholder="What do you want to say?" maxLength={2200} />
          <div className="character-row"><span>Provider limits are checked before publishing.</span><span>{text.length} / 2200</span></div>
          {media ? <div className="upload-preview">{mediaType === 'video' ? <video src={media} controls /> : <img src={media} alt="Upload preview" />}<button type="button" onClick={clearMedia}><X size={16} /></button></div> : <button type="button" className="upload-dropzone" onClick={() => inputRef.current?.click()} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); upload(event.dataTransfer.files[0]) }}><IconBadge size="lg"><Plus size={23} /></IconBadge><strong>Add a photo or video</strong><span>Connected publishing uses one file per post. Photos are converted to JPEG; videos up to 100 MB.</span></button>}
          <input ref={inputRef} type="file" hidden accept="image/*,video/mp4,video/quicktime" onChange={(event) => upload(event.target.files?.[0])} />
          <div className="branding-check"><CheckBox checked={branding} onChange={setBranding} label={<span>Add my branding to the photos <small>Your account gets its own name, plus the “For more content, Like and Share” bar. <a href="/app/branding">Change it</a></small></span>} /></div>
          <button type="button" className="link-attachment" onClick={() => { setText((value) => `${value}${value ? '\n' : ''}https://`); notify('Paste your link into the post.', 'info') }}><Link2 size={14} /> Link, picture link, carousel, video link</button>
        </Card>
      </div>
      <div className="form-side-column">
        <Card className="form-card" title="Post to" subtitle="Tap the accounts that get this." action={<IconBadge color="blue"><Send size={18} /></IconBadge>}>
          {accounts.length ? <div className="account-selector">{accounts.map((account) => <button type="button" key={account.id} className={selected.includes(account.id) ? 'selected' : ''} onClick={() => setSelected((items) => items.includes(account.id) ? items.filter((id) => id !== account.id) : [...items, account.id])}><PlatformIcon platform={account.platform} size="sm" /><span>{account.handle}<small>{isConnectedAccount(account) ? 'Connected' : 'Draft only'}</small></span>{selected.includes(account.id) && <Check size={15} />}</button>)}</div> : <div className="inline-empty">No accounts yet. <a href="/app/accounts">Add one first</a>.</div>}
          {when === 'publish' && tiktokAccount && <Field label="TikTok privacy" hint={tiktokOptions?.publicPosting ? 'Options come directly from this TikTok creator.' : 'Private-only until the TikTok app audit. Photos also require LionPost URL/domain verification in TikTok.'}><select value={tiktokPrivacy} onChange={(event) => setTikTokPrivacy(event.target.value)} disabled={tiktokOptionsLoading || !!tiktokOptionsError}><option value="">{tiktokOptionsLoading ? 'Loading creator options…' : 'Choose privacy'}</option>{(tiktokOptions?.privacyLevelOptions || []).map((option) => <option value={option} key={option}>{privacyLabels[option] || option}</option>)}</select></Field>}
          {when === 'publish' && tiktokOptionsError && <div className="form-error">{tiktokOptionsError}</div>}
          {when === 'publish' && pinterestAccount && <Field label="Pinterest board" hint="Boards are loaded live from the connected Pinterest account."><select value={pinterestBoard} onChange={(event) => setPinterestBoard(event.target.value)} disabled={pinterestBoardsLoading || !!pinterestBoardsError}><option value="">{pinterestBoardsLoading ? 'Loading boards…' : 'Choose a board'}</option>{pinterestBoards.map((board) => <option value={board.id} key={board.id}>{board.name}{board.privacy ? ` · ${board.privacy.toLowerCase()}` : ''}</option>)}</select></Field>}
          {when === 'publish' && pinterestBoardsError && <div className="form-error">{pinterestBoardsError}</div>}
          {when === 'publish' && youtubeSelected && <Field label="YouTube visibility" hint="Private is the safe default; change it only when you intend to publish more broadly."><select value={videoPrivacy} onChange={(event) => setVideoPrivacy(event.target.value as typeof videoPrivacy)}><option value="private">Private</option><option value="unlisted">Unlisted</option><option value="public">Public</option></select></Field>}
          {when === 'publish' && dailymotionSelected && <Field label="Dailymotion visibility" hint="Choose who can watch after Dailymotion processes the upload."><select value={dailymotionVisibility} onChange={(event) => setDailymotionVisibility(event.target.value as typeof dailymotionVisibility)}><option value="private">Private</option><option value="public">Public</option></select></Field>}
          {when === 'publish' && mediaType === 'video' && media && (youtubeSelected || dailymotionSelected) && <div className="branding-check"><CheckBox checked={madeForKids} onChange={setMadeForKids} label={<span>This video is made for kids <small>Your declaration is sent to YouTube and Dailymotion as required.</small></span>} /></div>}
        </Card>
        <Card className="form-card" title="First comment" subtitle="Goes under the post, right after it is sent." action={<IconBadge color="pink"><MessageSquare size={18} /></IconBadge>}>
          <CheckBox checked={firstComment} onChange={setFirstComment} label="Add a first comment" />
          <p className="helper-text">Not available for connected publishing yet.</p>
          {firstComment && <textarea value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Write your first comment…" />}
        </Card>
        <Card className="form-card when-card" title="When" subtitle="Now, or pick a time." action={<IconBadge color="green"><CalendarClock size={18} /></IconBadge>}>
          <div className="segmented-control"><button type="button" className={when === 'publish' ? 'active' : ''} onClick={() => setWhen('publish')}><Send size={15} /> Publish now</button><button type="button" className={when === 'draft' ? 'active' : ''} onClick={() => setWhen('draft')}><FileImage size={15} /> Draft</button><button type="button" className={when === 'later' ? 'active' : ''} onClick={() => setWhen('later')}><CalendarClock size={15} /> Schedule</button></div>
          {when === 'later' && <Field label="Date and time"><input type="datetime-local" value={schedule} min={new Date().toISOString().slice(0, 16)} onChange={(event) => setSchedule(event.target.value)} /></Field>}
          <p className="helper-text">{when === 'publish' ? 'Sends immediately through your connected accounts and saves an individual result for every destination.' : 'Saved to your cloud workspace. Background scheduling is not connected yet.'}</p>
          {error && <div className="form-error">{error}</div>}
          <Button type="submit" size="lg" disabled={publishing} icon={when === 'publish' ? <Send size={17} /> : when === 'draft' ? <Check size={17} /> : <CalendarClock size={17} />}>{publishing ? 'Publishing…' : when === 'publish' ? 'Publish now' : when === 'draft' ? 'Save draft' : 'Save to schedule'}</Button>
        </Card>
      </div>
    </form>
  </div>
}
