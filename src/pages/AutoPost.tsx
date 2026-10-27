import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Bot, CalendarClock, Check, Globe2, MessageSquare, Plus, Rss, Send, Sparkles, Zap } from 'lucide-react'
import { useApp } from '../context/AppContext'
import AutomationCard from '../components/AutomationCard'
import PlatformIcon from '../components/PlatformIcon'
import { Button, Card, CheckBox, Field, IconBadge, PageHeader, StepNumber } from '../components/UI'
import type { Platform } from '../types'
import { readWebsiteFeed, type FeedResult } from '../services/feeds'

export function AutoPost() {
  const { automations } = useApp()
  const items = automations.filter((item) => item.kind === 'ai' || item.kind === 'website')
  return <div>
    <PageHeader title="Auto post" subtitle="Let AI write posts for you, or share every new article from your website." action={<Link to="/app/auto-post/ai" className="button button-primary button-md"><Plus size={16} /> New auto post</Link>} />
    {items.length > 0 && <div className="automation-list">{items.map((item) => <AutomationCard key={item.id} automation={item} />)}</div>}
    <div className="two-choice-grid">
      <Link to="/app/auto-post/ai" className="choice-card"><IconBadge size="lg"><Sparkles size={23} /></IconBadge><h2>AI writes for me</h2><p>Tell it your topic once. It writes fresh posts with pictures and sends them all day.</p><span>Make an AI automation <Zap size={15} /></span></Link>
      <Link to="/app/auto-post/website" className="choice-card"><IconBadge size="lg"><Rss size={23} /></IconBadge><h2>Share from my website</h2><p>Every new article on your WordPress, Blogger or other site goes out by itself.</p><span>Connect a website <Globe2 size={15} /></span></Link>
    </div>
  </div>
}

export function Website() {
  const { automations } = useApp()
  const websites = automations.filter((item) => item.kind === 'website')
  return <div>
    <PageHeader title="Share from my website" subtitle="Every new article on your site goes to your social accounts by itself." icon={<Rss />} action={<Link to="/app/auto-post/website" className="button button-primary button-md"><Plus size={16} /> Add my website</Link>} />
    <Card className="website-autopilot-card"><IconBadge size="lg"><Globe2 /></IconBadge><div><h2>Put your website on autopilot</h2><ul><li><Check /> WordPress, Blogger, or any site with an RSS feed or sitemap</li><li><Check /> Each new article is shared with its picture and link</li><li><Check /> AI can write a short caption in your language</li></ul><Link to="/app/auto-post/website" className="button button-primary button-md"><Plus size={16} /> Add my website</Link></div></Card>
    {websites.length > 0 && <div className="automation-list">{websites.map((item) => <AutomationCard key={item.id} automation={item} />)}</div>}
  </div>
}

export function AutoPostForm({ type }: { type: 'ai' | 'website' }) {
  const isAI = type === 'ai'
  const { accounts, addAutomation, notify } = useApp()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [subject, setSubject] = useState('')
  const [language, setLanguage] = useState('English')
  const [length, setLength] = useState('Medium')
  const [link, setLink] = useState('')
  const [linkText, setLinkText] = useState('Read more here')
  const [series, setSeries] = useState('Off, every post is new')
  const [picture, setPicture] = useState(true)
  const [pictureStyle, setPictureStyle] = useState('Real photo of the subject')
  const [carousel, setCarousel] = useState(false)
  const [hashtags, setHashtags] = useState(true)
  const [aiCaption, setAiCaption] = useState(true)
  const [tone, setTone] = useState('')
  const [selected, setSelected] = useState(accounts.map((account) => account.id))
  const [board, setBoard] = useState('Use the board set on each account')
  const [commentEnabled, setCommentEnabled] = useState(false)
  const [comment, setComment] = useState('')
  const [commentLink, setCommentLink] = useState('')
  const [postsPerDay, setPostsPerDay] = useState('3 a day')
  const [wait, setWait] = useState('4 hours')
  const [from, setFrom] = useState('08:00')
  const [until, setUntil] = useState('22:00')
  const [error, setError] = useState('')
  const [preview, setPreview] = useState<FeedResult | null>(null)
  const [previewing, setPreviewing] = useState(false)
  const [saving, setSaving] = useState(false)

  const previewWebsite = async () => {
    if (!subject.trim()) return setError('Add your website address first.')
    setPreviewing(true)
    setError('')
    try {
      const result = await readWebsiteFeed(subject.trim())
      setPreview(result)
      notify(`${result.items.length} articles found through ${result.kind.toUpperCase()}.`, 'info')
    } catch (caught) {
      setPreview(null)
      setError(caught instanceof Error ? caught.message : 'The website feed could not be read.')
    } finally {
      setPreviewing(false)
    }
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!name.trim() || !subject.trim()) return setError(isAI ? 'Add a name and tell AI what to post about.' : 'Add a name and your website address.')
    const chosen = accounts.filter((account) => selected.includes(account.id))
    if (!chosen.length) return setError('Choose at least one social account.')
    setSaving(true)
    setError('')
    try {
      const feed = isAI ? null : await readWebsiteFeed(subject.trim())
      addAutomation({
        kind: type,
        name: name.trim(),
        detail: isAI ? `${subject} · ${postsPerDay} · ${language} · ${length} posts` : `${feed?.title || subject} · ${postsPerDay} · AI captions ${aiCaption ? 'on' : 'off'}`,
        platforms: chosen.map((account) => account.platform),
        topic: subject.trim(),
        language,
        sourceUrl: feed?.source,
        seenIds: feed?.items.map((item) => item.id) || [],
        aiCaption: isAI ? undefined : aiCaption,
      })
      notify(isAI ? 'Your AI draft automation is ready.' : 'Live feed connected. Current articles were marked as seen, so only new articles will be imported.')
      navigate(isAI ? '/app/auto-post' : '/app/website')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The automation could not be created.')
    } finally {
      setSaving(false)
    }
  }

  return <div>
    <PageHeader back title={isAI ? 'AI writes for me' : 'Share from my website'} subtitle={isAI ? 'Set it once, it posts all day.' : 'New articles go out by themselves.'} icon={isAI ? <Sparkles /> : <Rss />} />
    <form className="two-column-form auto-post-form" onSubmit={submit}>
      <div className="form-main-column">
        <Card className="form-card" title={isAI ? 'What to post' : 'Your website'} subtitle={isAI ? 'Tell the AI your subject. It writes every post for you.' : 'Every new article goes out by itself.'} action={<IconBadge><Rss size={18} /></IconBadge>}>
          <Field label="Name" hint="Only for you, to tell your auto posts apart."><input value={name} onChange={(event) => setName(event.target.value)} placeholder={isAI ? 'Daily crypto news' : 'My blog'} /></Field>
          <Field label={isAI ? 'What should the posts be about?' : 'Website address'} hint={isAI ? 'For example: crypto news and new airdrops. Or: easy healthy recipes for busy mothers. You can write in any language.' : 'WordPress, Blogger, RSS, Atom, or a sitemap. We discover the source and read the real articles.'}>{isAI ? <textarea value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="Daily crypto news and new airdrops. Keep it useful and easy to understand." /> : <input type="url" value={subject} onChange={(event) => { setSubject(event.target.value); setPreview(null) }} placeholder="https://myblog.com" />}</Field>
          {!isAI && <div className="feed-connect-row"><Button type="button" size="sm" variant="secondary" icon={<Rss size={14} />} onClick={previewWebsite} disabled={previewing}>{previewing ? 'Reading website…' : 'Find real articles'}</Button>{preview && <span className="working-badge">{preview.kind.toUpperCase()} connected</span>}</div>}
          {preview && <div className="feed-preview"><div><strong>{preview.title}</strong><small>{preview.items.length} articles found · Existing items will be marked as seen</small></div>{preview.items.slice(0, 3).map((item) => <article key={item.id}><div><strong>{item.title}</strong>{item.summary && <p>{item.summary}</p>}<small>{item.published ? new Date(item.published).toLocaleString() : 'Found in feed'}</small></div>{item.image && <img src={item.image} alt="" />}</article>)}</div>}
          {isAI ? <>
            <Field label="Language"><select value={language} onChange={(event) => setLanguage(event.target.value)}><option>English</option><option>Nepali</option><option>Hindi</option><option>Spanish</option><option>French</option><option>German</option></select></Field>
            <Field label="Post length" hint="30 to 60, 60 to 110, or 120 to 180 words."><select value={length} onChange={(event) => setLength(event.target.value)}><option>Short</option><option>Medium</option><option>Long</option></select></Field>
            <Field label="Your link (optional)" hint="Added to every post. The AI never writes links."><input type="url" value={link} onChange={(event) => setLink(event.target.value)} placeholder="https://" /></Field>
            <Field label="Text before the link"><input value={linkText} onChange={(event) => setLinkText(event.target.value)} /></Field>
            <Field label="Series" hint="One story told in parts. Each part ends in a way that makes people come back for the next one."><select value={series} onChange={(event) => setSeries(event.target.value)}><option>Off, every post is new</option><option>A 5-part series</option><option>A 10-part series</option><option>An ongoing series</option></select></Field>
          </> : <>
            <CheckBox checked={aiCaption} onChange={setAiCaption} label={<span>Let AI write the caption <small>Gemini writes a short post that makes people want to read the article.</small></span>} />
            <Field label="Caption language"><select value={language} onChange={(event) => setLanguage(event.target.value)}><option>English</option><option>Nepali</option><option>Hindi</option><option>Spanish</option></select></Field>
            <Field label="How should it sound? (optional)"><input value={tone} onChange={(event) => setTone(event.target.value)} placeholder="Friendly, simple, like talking to a friend" /></Field>
          </>}
          <CheckBox checked={picture} onChange={setPicture} label={<span>Add a picture <small>{isAI ? 'A real photo of the subject when we can find one, or a clean design card with the title.' : 'The article picture, or a design card when the article has none.'}</small></span>} />
          {isAI && picture && <Field label="Picture style" hint="Design cards suit tips, quotes and facts. Cards show English titles best."><select value={pictureStyle} onChange={(event) => setPictureStyle(event.target.value)}><option>Real photo of the subject</option><option>Clean design card</option><option>Photo or design, whichever fits</option></select></Field>}
          {isAI && <CheckBox checked={carousel} onChange={setCarousel} label={<span>Make it a carousel <small>Five short points, each with its own related photo.</small></span>} />}
          <CheckBox checked={hashtags} onChange={setHashtags} label="Add hashtags" />
        </Card>
      </div>
      <div className="form-side-column">
        <Card className="form-card" title="Post to" subtitle="Pick the accounts that get these posts." action={<IconBadge color="blue"><Send size={18} /></IconBadge>}>
          <div className="account-selector">{accounts.map((account) => <button type="button" key={account.id} className={selected.includes(account.id) ? 'selected' : ''} onClick={() => setSelected((items) => items.includes(account.id) ? items.filter((id) => id !== account.id) : [...items, account.id])}><PlatformIcon platform={account.platform} size="sm" /><span>{account.handle}</span>{selected.includes(account.id) && <Check size={15} />}</button>)}</div>
          {accounts.some((account) => account.platform === 'Pinterest') && <Field label="Pinterest board"><select value={board} onChange={(event) => setBoard(event.target.value)}><option>Use the board set on each account</option><option>Latest ideas</option><option>Creator tips</option></select></Field>}
        </Card>
        <Card className="form-card" title="First comment" subtitle="Goes under the post, right after it is sent." action={<IconBadge color="pink"><MessageSquare size={18} /></IconBadge>}>
          <CheckBox checked={commentEnabled} onChange={setCommentEnabled} label="Add a first comment" />
          {commentEnabled && <><Field label="Comment text" hint="Write {link} where you want the link to sit."><textarea value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Full story here: {link}" /></Field><Field label="Link in the comment (optional)"><input value={commentLink} onChange={(event) => setCommentLink(event.target.value)} placeholder="https://" /></Field></>}
        </Card>
        <Card className="form-card when-card" title="When" subtitle="Your own time zone." action={<IconBadge color="green"><CalendarClock size={18} /></IconBadge>}>
          <Field label="Posts a day"><select value={postsPerDay} onChange={(event) => setPostsPerDay(event.target.value)}><option>1 a day</option><option>2 a day</option><option>3 a day</option><option>5 a day</option><option>10 a day</option></select></Field>
          <Field label="Wait between posts"><select value={wait} onChange={(event) => setWait(event.target.value)}><option>1 hour</option><option>2 hours</option><option>4 hours</option><option>8 hours</option></select></Field>
          <div className="field-grid-2"><Field label="Post from"><input type="time" value={from} onChange={(event) => setFrom(event.target.value)} /></Field><Field label="Until"><input type="time" value={until} onChange={(event) => setUntil(event.target.value)} /></Field></div>
          <p className="helper-text">Your local time. Times are a little random each day so the account does not look like a robot.</p>
          {error && <div className="form-error">{error}</div>}
          <Button type="submit" size="lg" icon={<Zap size={17} />} disabled={saving}>{saving ? 'Connecting…' : isAI ? 'Start AI draft automation' : 'Connect live website feed'}</Button>
        </Card>
      </div>
    </form>
  </div>
}
