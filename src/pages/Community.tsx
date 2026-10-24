import { useState, type FormEvent } from 'react'
import { ArrowRight, Check, Heart, MessageSquare, MoreHorizontal, Plus, Search, Send, Sparkles, TrendingUp, Users } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { useLocalStorage, makeId } from '../hooks/useLocalStorage'
import { Button, Card, Field, Modal, PageHeader } from '../components/UI'

interface Comment { id: string; author: string; text: string }
interface CommunityItem { id: string; author: string; avatar: string; time: string; tag: string; title: string; body: string; likes: number; liked?: boolean; comments: Comment[] }
const starter: CommunityItem[] = [
  { id: 'c1', author: 'Naveed SHAH', avatar: 'NS', time: '2 hours ago', tag: 'EARN', title: 'How To Earn Your First $100 with Affiliate Marketing', body: 'Start with one problem you already understand. Recommend products you would genuinely use, show the result, and make the next step clear. Here is the simple framework I wish I had when I started…', likes: 38, comments: [{ id: 'cc1', author: 'Mina K.', text: 'The part about trust over volume really helped. Thank you!' }] },
  { id: 'c2', author: 'Yogesh Sahani', avatar: 'YS', time: '4 hours ago', tag: 'DISCUSS', title: 'What is one tool that saves you time every day?', body: 'Mine is a simple content calendar. It keeps me from making five decisions before I write one sentence. What is yours?', likes: 24, comments: [] },
  { id: 'c3', author: 'Shreya Mehta', avatar: 'SM', time: '7 hours ago', tag: 'LEARN', title: 'A simple content routine that finally worked for me', body: 'I stopped chasing daily inspiration. Every Monday I collect ten audience questions, pick three, and answer each in a different format. Small system, huge difference.', likes: 51, comments: [{ id: 'cc2', author: 'Arun P.', text: 'Trying this next week!' }] },
  { id: 'c4', author: 'Liam Chen', avatar: 'LC', time: 'Yesterday', tag: 'SHOWCASE', title: 'I turned one tutorial into 12 posts — my exact process', body: 'One long answer became a carousel, two short videos, three text posts and six Pinterest pins. The key was changing the format, not copying the same caption everywhere.', likes: 67, comments: [] },
]

export default function Community() {
  const [items, setItems] = useLocalStorage<CommunityItem[]>('alphapost-community', starter)
  const [tab, setTab] = useState('Latest')
  const [query, setQuery] = useState('')
  const [modal, setModal] = useState(false)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [tag, setTag] = useState('DISCUSS')
  const [openComments, setOpenComments] = useState<string[]>([])
  const [comment, setComment] = useState<Record<string, string>>({})
  const { profile, notify } = useApp()
  const visible = items.filter((item) => `${item.title} ${item.body}`.toLowerCase().includes(query.toLowerCase())).sort((a, b) => tab === 'Top' ? b.likes - a.likes : 0)

  const publish = (event: FormEvent) => {
    event.preventDefault()
    if (!title.trim() || !body.trim()) return notify('Add a title and a little more detail.', 'error')
    setItems((current) => [{ id: makeId('community'), author: profile.name, avatar: profile.name.split(' ').map((part) => part[0]).join('').slice(0, 2), time: 'just now', tag, title, body, likes: 0, comments: [] }, ...current])
    setModal(false); setTitle(''); setBody(''); notify('Your discussion is live in the community.')
  }
  const addComment = (id: string) => {
    if (!comment[id]?.trim()) return
    setItems((current) => current.map((item) => item.id === id ? { ...item, comments: [...item.comments, { id: makeId('comment'), author: profile.name, text: comment[id].trim() }] } : item))
    setComment((current) => ({ ...current, [id]: '' })); notify('Reply added.')
  }

  return <div className="community-page"><PageHeader title="Community" subtitle="Ask what is working, share what you built, and grow together." icon={<Users />} action={<Button icon={<Plus size={16} />} onClick={() => setModal(true)}>Start a discussion</Button>} /><div className="community-layout"><div className="community-feed"><Card className="community-filters"><div className="search-input"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search discussions…" /></div><div className="filter-tabs">{['Latest', 'Top', 'Following'].map((item) => <button className={tab === item ? 'active' : ''} key={item} onClick={() => setTab(item)}>{item}</button>)}</div></Card>{visible.map((item) => <Card className="discussion-card" key={item.id}><div className="discussion-author"><span className="avatar-dot badge-yellow">{item.avatar}</span><div><strong>{item.author}</strong><small>{item.time} · Community</small></div><span className="post-tag">{item.tag}</span><button className="icon-button"><MoreHorizontal size={17} /></button></div><h2>{item.title}</h2><p>{item.body}</p><div className="discussion-actions"><button className={item.liked ? 'liked' : ''} onClick={() => setItems((current) => current.map((post) => post.id === item.id ? { ...post, liked: !post.liked, likes: post.likes + (post.liked ? -1 : 1) } : post))}><Heart size={17} fill={item.liked ? 'currentColor' : 'none'} /> {item.likes}</button><button onClick={() => setOpenComments((current) => current.includes(item.id) ? current.filter((id) => id !== item.id) : [...current, item.id])}><MessageSquare size={17} /> {item.comments.length}</button><button onClick={() => { navigator.clipboard?.writeText(item.title); notify('Discussion title copied.', 'info') }}><Send size={16} /> Share</button></div>{openComments.includes(item.id) && <div className="comments-section">{item.comments.map((entry) => <div className="comment" key={entry.id}><span className="avatar-dot badge-teal">{entry.author[0]}</span><div><strong>{entry.author}</strong><p>{entry.text}</p></div></div>)}<form onSubmit={(event) => { event.preventDefault(); addComment(item.id) }}><input value={comment[item.id] || ''} onChange={(event) => setComment((current) => ({ ...current, [item.id]: event.target.value }))} placeholder="Write a helpful reply…" /><Button type="submit" size="sm"><Send size={14} /></Button></form></div>}</Card>)}{visible.length === 0 && <Card><div className="empty-state"><Search /><h3>No discussions found</h3><p>Try another search, or start the conversation yourself.</p></div></Card>}</div><aside className="community-sidebar"><Card title="Community this week"><div className="community-week-stats"><div><strong>5,900+</strong><span>members</span></div><div><strong>870+</strong><span>discussions</span></div><div><strong>118</strong><span>countries</span></div></div></Card><Card title="Community guidelines"><ul className="guidelines"><li><Check /> Be generous and specific</li><li><Check /> Share real experience</li><li><Check /> No spam or misleading claims</li><li><Check /> Make everyone feel welcome</li></ul></Card><Card className="community-cta"><Sparkles /><h3>Have a question?</h3><p>Someone here has probably solved it already.</p><Button onClick={() => setModal(true)}>Ask the community</Button></Card></aside></div><Modal open={modal} onClose={() => setModal(false)} title="Start a discussion"><form className="modal-form" onSubmit={publish}><Field label="Topic"><div className="pill-choices">{['DISCUSS', 'LEARN', 'EARN', 'SHOWCASE'].map((item) => <button type="button" className={tag === item ? 'active' : ''} key={item} onClick={() => setTag(item)}>{item}</button>)}</div></Field><Field label="Title"><input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="What would you like to talk about?" /></Field><Field label="Your post" hint="A little context makes it easier for others to help."><textarea className="large-textarea" value={body} onChange={(event) => setBody(event.target.value)} placeholder="Share your question, experience or idea…" /></Field><Button type="submit" size="lg">Publish discussion</Button></form></Modal></div>
}
