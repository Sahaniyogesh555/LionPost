import { useEffect, useState, type FormEvent } from 'react'
import { Bold, CheckCircle2, CircleX, FileText, Link2, Rss } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { useLocalStorage, makeId } from '../hooks/useLocalStorage'
import AutomationCard from '../components/AutomationCard'
import { Button, Card, EmptyState, Field, MiniStat, Modal, PageHeader } from '../components/UI'

interface Blog { id: string; name: string; url: string; email: string }

export default function Blogger() {
  const { automations, addAutomation, posts, profile, notify } = useApp()
  const [blogs, setBlogs] = useLocalStorage<Blog[]>('alphapost-blogs', [])
  const [modal, setModal] = useState<'connect' | 'automation' | null>(null)
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const [topic, setTopic] = useState('')
  const blogAutos = automations.filter((item) => item.kind === 'blogger')
  const blogPosts = posts.filter((post) => post.platforms.includes('Blogger'))
  const articles = blogPosts.filter((post) => post.status === 'sent').length
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
  const thisWeek = blogPosts.filter((post) => post.status === 'sent' && new Date(post.createdAt).getTime() >= weekAgo).length
  const failed = blogPosts.filter((post) => post.status === 'failed').length

  useEffect(() => {
    setBlogs((items) => {
      const filtered = items.filter((item) => item.id !== 'blog-1')
      return filtered.length === items.length ? items : filtered
    })
  }, [setBlogs])

  const connect = (event: FormEvent) => {
    event.preventDefault()
    if (!name.trim() || !url.trim()) return notify('Add your blog name and address.', 'error')
    setBlogs((items) => [...items, { id: makeId('blog'), name: name.trim(), url: url.trim(), email: profile.email }])
    setModal(null)
    setName('')
    setUrl('')
    notify('Your Blogger blog is connected.')
  }

  const create = (event: FormEvent) => {
    event.preventDefault()
    if (!blogs.length) return setModal('connect')
    addAutomation({ kind: 'blogger', name: `${blogs[0].name} ${topic.trim() || 'Daily Insights'}`, detail: '5 articles a week · With pictures · English', platforms: ['Blogger'] })
    setModal(null)
    setTopic('')
    notify('Blog automation started.')
  }

  return <div>
    <PageHeader title="Blogger" subtitle="Your blog writes itself. Full articles on your own Blogger blog." />
    <div className="stats-cards four-cards">
      <MiniStat value={articles} label="Articles posted" icon={<CheckCircle2 />} color="green" />
      <MiniStat value={thisWeek} label="This week" icon={<FileText />} color="orange" />
      <MiniStat value={failed} label="Failed" icon={<CircleX />} color="pink" />
      <MiniStat value={blogs.length} label="Blogs connected" icon={<Bold />} color="orange" />
    </div>
    <Card className="blogger-connect-card"><span className="blogger-big-icon">B</span><div><h2>Connect your Blogger blog</h2><p>Press one button. Google asks you to allow AlphaPost, and that is it.</p><Button variant="secondary" icon={<Link2 size={16} />} onClick={() => setModal('connect')}>Connect Blogger</Button></div></Card>

    <section>
      <div className="section-title-line"><h2>Your blogs</h2><span className="count-pill">{blogs.length} of 4</span></div>
      {blogs.length ? <div className="blog-grid">{blogs.map((blog) => <Card className="blog-card" key={blog.id}><span className="blogger-big-icon">B</span><h3>{blog.name}</h3><a href={`https://${blog.url}`} target="_blank" rel="noreferrer">{blog.url}</a><dl><div><dt>Status</dt><dd>Connected</dd></div><div><dt>Google account</dt><dd>{blog.email || 'Not provided'}</dd></div></dl><div><Button size="sm" onClick={() => setModal('automation')}>Create automation</Button><Button size="sm" variant="ghost" onClick={() => { setBlogs((items) => items.filter((item) => item.id !== blog.id)); notify('Blog removed.', 'info') }}>Remove</Button></div></Card>)}</div> : <Card><EmptyState icon={<Rss />} title="No blogs connected" text="Connect your own Blogger blog to start publishing." action={<Button onClick={() => setModal('connect')}>Connect your first blog</Button>} /></Card>}
    </section>

    <section>
      <div className="section-title-line"><h2>Your blog automations</h2><span className="count-pill">{blogAutos.length} of 4</span></div>
      {blogAutos.length ? <div className="automation-list">{blogAutos.map((item) => <AutomationCard key={item.id} automation={item} />)}</div> : <Card><div className="inline-empty">No blog automations yet.</div></Card>}
    </section>

    <Modal open={modal === 'connect'} onClose={() => setModal(null)} title="Connect your Blogger blog"><form className="modal-form" onSubmit={connect}><div className="modal-platform-intro"><span className="blogger-big-icon">B</span><p>Use a blog you own. Your connection is stored only in this browser for the demo.</p></div><Field label="Blog name"><input value={name} onChange={(event) => setName(event.target.value)} placeholder="My daily blog" /></Field><Field label="Blog address"><input value={url} onChange={(event) => setUrl(event.target.value)} placeholder="myblog.blogspot.com" /></Field><Button type="submit" size="lg">Connect blog</Button></form></Modal>
    <Modal open={modal === 'automation'} onClose={() => setModal(null)} title="New blog automation"><form className="modal-form" onSubmit={create}><Field label="What should the blog write about?"><textarea value={topic} onChange={(event) => setTopic(event.target.value)} placeholder="Practical AI tools and simple tutorials for beginners" /></Field><Field label="Articles a week"><select><option>3 articles a week</option><option>5 articles a week</option><option>Every day</option></select></Field><Button type="submit" size="lg">Start writing</Button></form></Modal>
  </div>
}
