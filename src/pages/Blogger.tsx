import { useEffect, useState, type FormEvent } from 'react'
import { Bold, CheckCircle2, CircleX, FileText, Link2, LockKeyhole, Plus, Rss, Send, Sparkles } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { useAuth } from '../context/AuthContext'
import { useLocalStorage } from '../hooks/useLocalStorage'
import AutomationCard from '../components/AutomationCard'
import { Button, Card, EmptyState, Field, MiniStat, Modal, PageHeader } from '../components/UI'
import { beginBloggerConnection, publishBloggerArticle } from '../services/blogger'
import { generateBlogDraft } from '../services/gemini'

interface LegacyBlog { id: string; name: string; url: string; email: string }

function escapeHtml(value: string) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;')
}

function articleHtml(value: string) {
  if (/<\/?(?:p|h[1-6]|ul|ol|li|blockquote|div|br|strong|em|b|i|a)\b/i.test(value)) return value
  return value.split(/\n{2,}/).map((block) => {
    const text = block.trim()
    if (!text) return ''
    if (!block.includes('\n') && text.length <= 120 && !/[.!?]$/.test(text)) return `<h2>${escapeHtml(text)}</h2>`
    return `<p>${escapeHtml(text).replace(/\n/g, '<br>')}</p>`
  }).join('\n')
}

export default function Blogger() {
  const { accounts, automations, addAutomation, addAccount, removeAccount, posts, addPost, notify } = useApp()
  const { session } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [legacyBlogs, setLegacyBlogs] = useLocalStorage<LegacyBlog[]>('alphapost-blogs', [])
  const [modal, setModal] = useState<'compose' | 'automation' | null>(null)
  const [connecting, setConnecting] = useState(false)
  const [connectError, setConnectError] = useState('')
  const [selectedBlogId, setSelectedBlogId] = useState('')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [labels, setLabels] = useState('')
  const [topic, setTopic] = useState('')
  const [language, setLanguage] = useState('English')
  const [composeError, setComposeError] = useState('')
  const [generating, setGenerating] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const blogs = accounts.filter((account) => account.platform === 'Blogger' && account.connectionType === 'blogger')
  const manualBlogs = accounts.filter((account) => account.platform === 'Blogger' && account.connectionType !== 'blogger')
  const blogAutos = automations.filter((item) => item.kind === 'blogger')
  const blogPosts = posts.filter((post) => post.platforms.includes('Blogger'))
  const articles = blogPosts.filter((post) => post.status === 'sent').length
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
  const thisWeek = blogPosts.filter((post) => post.status === 'sent' && new Date(post.createdAt).getTime() >= weekAgo).length
  const failed = blogPosts.filter((post) => post.status === 'failed').length

  useEffect(() => {
    if (!legacyBlogs.length) return
    legacyBlogs.filter((blog) => blog.id !== 'blog-1').forEach((blog) => addAccount({
      id: blog.id,
      platform: 'Blogger',
      name: blog.name,
      handle: blog.url,
      connectionType: 'local',
    }))
    setLegacyBlogs([])
  }, [legacyBlogs, addAccount, setLegacyBlogs])

  useEffect(() => {
    const error = searchParams.get('error')
    const connected = searchParams.get('connected')
    if (error) setConnectError(error)
    if (connected) notify(`${connected} Blogger ${connected === '1' ? 'blog' : 'blogs'} connected through Google.`)
    if (error || connected) setSearchParams({}, { replace: true })
  }, [searchParams, setSearchParams, notify])

  const connect = async () => {
    if (!session?.access_token) return setConnectError('Sign in again before connecting Blogger.')
    setConnecting(true)
    setConnectError('')
    try {
      const result = await beginBloggerConnection(session.access_token)
      window.location.assign(result.url)
    } catch (error) {
      setConnectError(error instanceof Error ? error.message : 'Blogger could not be connected.')
      setConnecting(false)
    }
  }

  const openCompose = (blogId: string) => {
    setSelectedBlogId(blogId)
    setComposeError('')
    setModal('compose')
  }

  const generate = async () => {
    const subject = title.trim() || content.trim()
    if (!subject) return setComposeError('Enter an article topic in the title field first.')
    setGenerating(true)
    setComposeError('')
    try {
      const result = await generateBlogDraft(subject, language)
      if (!title.trim()) {
        const [first, ...rest] = result.split('\n')
        setTitle(first.trim().replace(/^#+\s*/, ''))
        setContent(rest.join('\n').trim() || result)
      } else {
        setContent(result)
      }
      notify('Gemini created an article draft. Review it before publishing.')
    } catch (error) {
      setComposeError(error instanceof Error ? error.message : 'Gemini could not write this article.')
    } finally {
      setGenerating(false)
    }
  }

  const publish = async () => {
    if (!session?.access_token) return setComposeError('Sign in again before publishing.')
    if (!selectedBlogId) return setComposeError('Choose a connected blog.')
    if (!title.trim() || !content.trim()) return setComposeError('Enter both the article title and content.')
    setPublishing(true)
    setComposeError('')
    try {
      const result = await publishBloggerArticle(session.access_token, {
        accountId: selectedBlogId,
        title: title.trim(),
        content: articleHtml(content.trim()),
        labels: labels.split(',').map((label) => label.trim()).filter(Boolean).slice(0, 10),
      })
      addPost({ text: `${title.trim()}\n\n${content.trim()}`, platforms: ['Blogger'], status: 'sent', publishResults: [result] })
      setModal(null)
      setTitle('')
      setContent('')
      setLabels('')
      notify('Article published on Blogger. Open Posts to view the live link.')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Blogger publishing failed.'
      addPost({ text: `${title.trim()}\n\n${content.trim()}`, platforms: ['Blogger'], status: 'failed', publishResults: [{ accountId: selectedBlogId, platform: 'Blogger', status: 'failed', error: message }] })
      setComposeError(message)
    } finally {
      setPublishing(false)
    }
  }

  const saveDraft = () => {
    if (!title.trim() || !content.trim()) return setComposeError('Enter both the article title and content.')
    addPost({ text: `${title.trim()}\n\n${content.trim()}`, platforms: ['Blogger'], status: 'draft' })
    setModal(null)
    notify('Article saved as a cloud draft.')
  }

  const createAutomation = (event: FormEvent) => {
    event.preventDefault()
    const blog = blogs.find((item) => item.id === selectedBlogId)
    if (!blog) return
    addAutomation({ kind: 'blogger', name: `${blog.name} ${topic.trim() || 'article drafts'}`, detail: `Manual Gemini article drafts · ${language}`, platforms: ['Blogger'], topic: topic.trim() || 'Useful, practical articles for my readers', language, sourceUrl: blog.handle })
    setModal(null)
    setTopic('')
    notify('Draft automation saved. Use Write draft for manual runs; background scheduling is not enabled.')
  }

  return <div>
    <PageHeader title="Blogger" subtitle="Connect your own blog, review AI drafts, and publish real articles through Google." action={<Button icon={<Plus size={16} />} onClick={connect} disabled={connecting}>{connecting ? 'Opening Google…' : 'Connect Blogger'}</Button>} />
    <div className="stats-cards four-cards">
      <MiniStat value={articles} label="Articles posted" icon={<CheckCircle2 />} color="green" />
      <MiniStat value={thisWeek} label="This week" icon={<FileText />} color="orange" />
      <MiniStat value={failed} label="Failed" icon={<CircleX />} color="pink" />
      <MiniStat value={blogs.length} label="Blogs connected" icon={<Bold />} color="orange" />
    </div>
    <Card className="blogger-connect-card"><span className="blogger-big-icon">B</span><div><h2>Connect with Google</h2><p>Google will ask for Blogger permission. Your Google password stays with Google; the offline refresh token is encrypted on our server.</p><Button variant="secondary" icon={<Link2 size={16} />} onClick={connect} disabled={connecting}>{connecting ? 'Opening Google…' : 'Connect Blogger'}</Button>{connectError && <div className="form-error">{connectError}</div>}</div></Card>

    <section>
      <div className="section-title-line"><h2>Your blogs</h2><span className="count-pill">{blogs.length}</span></div>
      {blogs.length ? <div className="blog-grid">{blogs.map((blog) => <Card className="blog-card" key={blog.id}><span className="blogger-big-icon">B</span><h3>{blog.name}</h3><a href={blog.handle} target="_blank" rel="noreferrer">{blog.handle}</a><dl><div><dt>Status</dt><dd>Google connected</dd></div><div><dt>Blog ID</dt><dd>{blog.externalId}</dd></div></dl><div><Button size="sm" icon={<FileText size={13} />} onClick={() => openCompose(blog.id)}>Write article</Button><Button size="sm" variant="secondary" onClick={() => { setSelectedBlogId(blog.id); setModal('automation') }}>Draft automation</Button><Button size="sm" variant="ghost" onClick={async () => { const removed = await removeAccount(blog.id); if (removed) notify('Blog removed and its encrypted Google token was deleted.', 'info') }}>Remove</Button></div></Card>)}</div> : <Card><EmptyState icon={<Rss />} title="No Google-connected blogs" text="Connect your own Blogger blog to publish. Manual names and URLs are never treated as connected accounts." action={<Button onClick={connect}>Connect your first blog</Button>} /></Card>}
      {!!manualBlogs.length && <p className="helper-text blogger-manual-note">{manualBlogs.length} older manual blog {manualBlogs.length === 1 ? 'profile is' : 'profiles are'} kept for reference only. Reconnect with Google to publish.</p>}
    </section>

    <section>
      <div className="section-title-line"><h2>Your blog draft automations</h2><span className="count-pill">{blogAutos.length}</span></div>
      {blogAutos.length ? <div className="automation-list">{blogAutos.map((item) => <AutomationCard key={item.id} automation={item} />)}</div> : <Card><div className="inline-empty">No blog draft automations yet.</div></Card>}
    </section>

    <Modal open={modal === 'compose'} onClose={() => { if (!publishing) setModal(null) }} title="Write a Blogger article">
      <div className="modal-form">
        <Field label="Publish to"><select value={selectedBlogId} onChange={(event) => setSelectedBlogId(event.target.value)}>{blogs.map((blog) => <option key={blog.id} value={blog.id}>{blog.name}</option>)}</select></Field>
        <Field label="Article title" hint="Enter a topic here, then optionally use Gemini to create a first draft."><input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="A useful article for my readers" maxLength={300} /></Field>
        <div className="article-ai-row"><Field label="Writing language"><select value={language} onChange={(event) => setLanguage(event.target.value)}><option>English</option><option>Nepali</option><option>Hindi</option><option>Spanish</option><option>French</option></select></Field><Button type="button" variant="secondary" icon={<Sparkles size={14} />} onClick={generate} disabled={generating}>{generating ? 'Writing…' : 'Write with Gemini'}</Button></div>
        <Field label="Article content" hint="Plain text becomes safe paragraphs and headings. Basic Blogger-supported HTML is also accepted."><textarea className="article-editor" value={content} onChange={(event) => setContent(event.target.value)} placeholder="Write or generate your article. Review facts and links before publishing." /></Field>
        <Field label="Labels (optional)" hint="Comma-separated, up to 10 labels."><input value={labels} onChange={(event) => setLabels(event.target.value)} placeholder="tutorials, technology" /></Field>
        <label className="demo-note"><LockKeyhole size={16} /> Publishing uses your encrypted Google refresh token. It is never returned to this browser.</label>
        {composeError && <div className="form-error">{composeError}</div>}
        <div className="modal-button-row"><Button variant="secondary" size="lg" onClick={saveDraft} disabled={publishing}>Save cloud draft</Button><Button size="lg" icon={<Send size={15} />} onClick={publish} disabled={publishing || generating}>{publishing ? 'Publishing…' : 'Publish to Blogger'}</Button></div>
      </div>
    </Modal>

    <Modal open={modal === 'automation'} onClose={() => setModal(null)} title="New blog draft automation"><form className="modal-form" onSubmit={createAutomation}><p>This creates manual Gemini drafts for review. It does not run in the background or publish without approval.</p><Field label="What should the articles be about?"><textarea value={topic} onChange={(event) => setTopic(event.target.value)} placeholder="Practical AI tools and simple tutorials for beginners" /></Field><Field label="Language"><select value={language} onChange={(event) => setLanguage(event.target.value)}><option>English</option><option>Nepali</option><option>Hindi</option><option>Spanish</option><option>French</option></select></Field><Button type="submit" size="lg">Save draft automation</Button></form></Modal>
  </div>
}
