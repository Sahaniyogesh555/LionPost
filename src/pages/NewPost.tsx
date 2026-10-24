import { useRef, useState, type FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { CalendarClock, Check, FileImage, ImagePlus, Link2, MessageSquare, Plus, Send, Sparkles, Upload, X, Zap } from 'lucide-react'
import { useApp } from '../context/AppContext'
import PlatformIcon from '../components/PlatformIcon'
import { Button, Card, CheckBox, DiscoverMore, Field, IconBadge, PageHeader } from '../components/UI'
import { readFileAsDataUrl } from '../utils'

export default function NewPost() {
  const { accounts, addPost, notify } = useApp()
  const location = useLocation()
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)
  const [text, setText] = useState((location.state as { text?: string } | null)?.text || '')
  const [media, setMedia] = useState('')
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image')
  const [selected, setSelected] = useState<string[]>(accounts.slice(0, 1).map((account) => account.id))
  const [branding, setBranding] = useState(true)
  const [firstComment, setFirstComment] = useState(false)
  const [comment, setComment] = useState('')
  const [when, setWhen] = useState<'now' | 'later'>('now')
  const [schedule, setSchedule] = useState(() => {
    const date = new Date(Date.now() + 86400000)
    date.setMinutes(0, 0, 0)
    return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
  })
  const [error, setError] = useState('')

  const upload = async (file?: File) => {
    if (!file) return
    if (file.type.startsWith('video/')) {
      if (file.size > 100 * 1024 * 1024) return notify('Please choose a video smaller than 100 MB.', 'error')
      setMediaType('video')
      setMedia(URL.createObjectURL(file))
      return
    }
    if (file.size > 3 * 1024 * 1024) return notify('For local saving, please choose an image smaller than 3 MB.', 'error')
    setMediaType('image')
    setMedia(await readFileAsDataUrl(file))
  }

  const submit = (event: FormEvent) => {
    event.preventDefault()
    setError('')
    const chosenAccounts = accounts.filter((account) => selected.includes(account.id))
    if (!text.trim() && !media) return setError('Write something or add a photo first.')
    if (!chosenAccounts.length) return setError('Choose at least one account to post to.')
    if (when === 'later' && !schedule) return setError('Pick a date and time for your post.')
    addPost({ text: text.trim(), platforms: chosenAccounts.map((account) => account.platform), status: when === 'now' ? 'sent' : 'scheduled', scheduledAt: when === 'later' ? new Date(schedule).toISOString() : undefined, image: mediaType === 'image' ? media || undefined : undefined, firstComment: firstComment ? comment : undefined })
    notify(when === 'now' ? 'Your post was sent successfully.' : 'Your post is scheduled.')
    navigate('/app/posts')
  }

  const generateText = () => {
    const ideas = [
      'Small steps, shared consistently, become something remarkable. What are you working on today? ✨',
      'A little behind the scenes from today. Creating is messy, joyful and always worth it. #CreatorLife',
      'Save this for later: three simple ways to make your content more useful — teach one thing, show one example, and leave one clear next step.',
    ]
    setText(ideas[Math.floor(Math.random() * ideas.length)])
    notify('A fresh writing idea is ready.', 'info')
  }

  return <div className="new-post-page">
    <PageHeader title="New post" subtitle="Write it once. Pick where it goes." />
    <form className="two-column-form" onSubmit={submit}>
      <div className="form-main-column">
        <Card className="form-card" title="Your post" subtitle="Write it once. Add photos or videos. Pick where it goes." action={<IconBadge color="yellow"><Sparkles size={18} /></IconBadge>}>
          <div className="field-heading-row"><Field label="Post text" /><button type="button" className="ai-write-button" onClick={generateText}><Sparkles size={14} /> Write an idea</button></div>
          <textarea className="post-textarea" value={text} onChange={(event) => setText(event.target.value)} placeholder="What do you want to say?" maxLength={2200} />
          <div className="character-row"><span>Each platform cuts long text at a word by itself.</span><span>{text.length} / 2200</span></div>
          {media ? <div className="upload-preview">{mediaType === 'video' ? <video src={media} controls /> : <img src={media} alt="Upload preview" />}<button type="button" onClick={() => setMedia('')}><X size={16} /></button></div> : <button type="button" className="upload-dropzone" onClick={() => inputRef.current?.click()} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); upload(event.dataTransfer.files[0]) }}><IconBadge size="lg"><Plus size={23} /></IconBadge><strong>Add photos and videos</strong><span>One file makes one post. Many files make many posts, each at its own time. Up to 20.</span></button>}
          <input ref={inputRef} type="file" hidden accept="image/*,video/*" onChange={(event) => upload(event.target.files?.[0])} />
          <div className="branding-check"><CheckBox checked={branding} onChange={setBranding} label={<span>Add my branding to the photos <small>Your account gets its own name, plus the “For more content, Like and Share” bar. <a href="/app/branding">Change it</a></small></span>} /></div>
          <button type="button" className="link-attachment" onClick={() => { setText((value) => `${value}${value ? '\n' : ''}https://`); notify('Paste your link into the post.', 'info') }}><Link2 size={14} /> Link, picture link, carousel, video link</button>
        </Card>
      </div>
      <div className="form-side-column">
        <Card className="form-card" title="Post to" subtitle="Tap the accounts that get this." action={<IconBadge color="blue"><Send size={18} /></IconBadge>}>
          {accounts.length ? <div className="account-selector">{accounts.map((account) => <button type="button" key={account.id} className={selected.includes(account.id) ? 'selected' : ''} onClick={() => setSelected((items) => items.includes(account.id) ? items.filter((id) => id !== account.id) : [...items, account.id])}><PlatformIcon platform={account.platform} size="sm" /><span>{account.handle}</span>{selected.includes(account.id) && <Check size={15} />}</button>)}</div> : <div className="inline-empty">No accounts yet. <a href="/app/accounts">Add one first</a>.</div>}
        </Card>
        <Card className="form-card" title="First comment" subtitle="Goes under the post, right after it is sent." action={<IconBadge color="pink"><MessageSquare size={18} /></IconBadge>}>
          <CheckBox checked={firstComment} onChange={setFirstComment} label="Add a first comment" />
          <p className="helper-text">Facebook Pages only for now. Your token needs pages_manage_engagement.</p>
          {firstComment && <textarea value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Write your first comment…" />}
        </Card>
        <Card className="form-card when-card" title="When" subtitle="Now, or pick a time." action={<IconBadge color="green"><CalendarClock size={18} /></IconBadge>}>
          <div className="segmented-control"><button type="button" className={when === 'now' ? 'active' : ''} onClick={() => setWhen('now')}><Zap size={15} /> Send now</button><button type="button" className={when === 'later' ? 'active' : ''} onClick={() => setWhen('later')}><CalendarClock size={15} /> Pick a time</button></div>
          {when === 'later' && <Field label="Date and time"><input type="datetime-local" value={schedule} min={new Date().toISOString().slice(0, 16)} onChange={(event) => setSchedule(event.target.value)} /></Field>}
          {error && <div className="form-error">{error}</div>}
          <Button type="submit" size="lg" icon={when === 'now' ? <Send size={17} /> : <CalendarClock size={17} />}>{when === 'now' ? 'Send post' : 'Schedule post'}</Button>
        </Card>
      </div>
    </form>
    <DiscoverMore />
  </div>
}
