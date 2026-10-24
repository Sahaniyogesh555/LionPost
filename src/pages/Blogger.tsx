import { useState, type FormEvent } from 'react'
import { Bold, CheckCircle2, CircleX, FileText, Link2, Plus, Rss, Trash2 } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { useLocalStorage, makeId } from '../hooks/useLocalStorage'
import AutomationCard from '../components/AutomationCard'
import { Button, Card, Field, MiniStat, Modal, PageHeader } from '../components/UI'

interface Blog { id: string; name: string; url: string; email: string }

export default function Blogger() {
  const { automations, addAutomation, posts, notify } = useApp()
  const [blogs, setBlogs] = useLocalStorage<Blog[]>('alphapost-blogs', [{ id: 'blog-1', name: 'SimpleAI Zone', url: 'simpleaizone.blogspot.com', email: 'sahaniyogesh555@gmail.com' }])
  const [modal, setModal] = useState<'connect' | 'automation' | null>(null)
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const [topic, setTopic] = useState('')
  const blogAutos = automations.filter((item) => item.kind === 'blogger')
  const articles = posts.filter((post) => post.platforms.includes('Blogger')).length + 14

  const connect = (event: FormEvent) => {
    event.preventDefault()
    if (!name || !url) return notify('Add your blog name and address.', 'error')
    setBlogs((items) => [...items, { id: makeId('blog'), name, url, email: 'sahaniyogesh555@gmail.com' }])
    setModal(null); setName(''); setUrl(''); notify('Your Blogger blog is connected.')
  }
  const create = (event: FormEvent) => {
    event.preventDefault()
    if (!blogs.length) return setModal('connect')
    addAutomation({ kind: 'blogger', name: `${blogs[0].name} ${topic || 'Daily Insights'}`, detail: `5 articles a week · With pictures · English`, platforms: ['Blogger'] })
    setModal(null); setTopic(''); notify('Blog automation started.')
  }

  return <div>
    <PageHeader title="Blogger" subtitle="Your blog writes itself. Full articles on your own Blogger blog." />
    <div className="stats-cards four-cards"><MiniStat value={articles} label="Articles posted" icon={<CheckCircle2 />} color="green" /><MiniStat value="14" label="This week" icon={<FileText />} color="orange" /><MiniStat value="0" label="Failed" icon={<CircleX />} color="pink" /><MiniStat value={blogs.length} label="Blog connected" icon={<Bold />} color="orange" /></div>
    <Card className="blogger-connect-card"><span className="blogger-big-icon">B</span><div><h2>Connect your Blogger blog</h2><p>Press one button. Google asks you to allow AlphaPost, and that is it.</p><Button variant="secondary" icon={<Link2 size={16} />} onClick={() => setModal('connect')}>Connect Blogger</Button></div></Card>
    <section><div className="section-title-line"><h2>Your blogs</h2><span className="count-pill">{blogs.length} of 4</span></div><div className="blog-grid">{blogs.map((blog) => <Card className="blog-card" key={blog.id}><span className="blogger-big-icon">B</span><h3>{blog.name}</h3><a href={`https://${blog.url}`} target="_blank" rel="noreferrer">{blog.url}</a><dl><div><dt>Articles</dt><dd>{articles}</dd></div><div><dt>Google account</dt><dd>{blog.email}</dd></div></dl><div><Button size="sm" onClick={() => setModal('automation')}>Create automation</Button><Button size="sm" variant="ghost" onClick={() => { setBlogs((items) => items.filter((item) => item.id !== blog.id)); notify('Blog removed.', 'info') }}>Remove</Button></div></Card>)}</div></section>
    <section><div className="section-title-line"><h2>Your blog automations</h2><span className="count-pill">{blogAutos.length} of 4</span></div><div className="automation-list">{blogAutos.map((item) => <AutomationCard key={item.id} automation={item} />)}</div></section>
    <Modal open={modal === 'connect'} onClose={() => setModal(null)} title="Connect your Blogger blog"><form className="modal-form" onSubmit={connect}><div className="modal-platform-intro"><span className="blogger-big-icon">B</span><p>Use a blog you own. Your connection is stored only in this browser for the demo.</p></div><Field label="Blog name"><input value={name} onChange={(event) => setName(event.target.value)} placeholder="My daily blog" /></Field><Field label="Blog address"><input value={url} onChange={(event) => setUrl(event.target.value)} placeholder="myblog.blogspot.com" /></Field><Button type="submit" size="lg">Connect blog</Button></form></Modal>
    <Modal open={modal === 'automation'} onClose={() => setModal(null)} title="New blog automation"><form className="modal-form" onSubmit={create}><Field label="What should the blog write about?"><textarea value={topic} onChange={(event) => setTopic(event.target.value)} placeholder="Practical AI tools and simple tutorials for beginners" /></Field><Field label="Articles a week"><select><option>3 articles a week</option><option>5 articles a week</option><option>Every day</option></select></Field><Button type="submit" size="lg">Start writing</Button></form></Modal>
  </div>
}
