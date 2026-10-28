import { useMemo, useState } from 'react'
import { CalendarClock, CheckCircle2, Copy, Download, List, Plus, Search, Trash2, XCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import PlatformIcon from '../components/PlatformIcon'
import { Button, Card, EmptyState, PageHeader } from '../components/UI'
import { downloadText, formatDate, relativeDate } from '../utils'
import type { Post, PostStatus } from '../types'

export default function Posts() {
  const { posts, accounts, deletePost, updatePost, addPost, notify } = useApp()
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<'all' | PostStatus>('all')
  const [platform, setPlatform] = useState('all')
  const [visible, setVisible] = useState(12)
  const navigate = useNavigate()
  const filtered = useMemo(() => posts.filter((post) => (status === 'all' || post.status === status) && (platform === 'all' || post.platforms.includes(platform as never)) && post.text.toLowerCase().includes(query.toLowerCase())), [posts, status, platform, query])
  const exportPosts = () => {
    const rows = [['Text', 'Platforms', 'Status', 'Created', 'Scheduled', 'Publishing'], ...filtered.map((post) => [post.text, post.platforms.join(', '), post.status, post.createdAt, post.scheduledAt || '', (post.publishResults || []).map((result) => `${result.accountId}: ${result.status}${result.error ? ` (${result.error})` : ''}`).join('; ')])]
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n')
    downloadText('alphapost-posts.csv', csv, 'text/csv')
    notify('Your posts were exported.')
  }
  const statusLabel = (post: Post) => post.publishResults?.some((result) => result.status === 'sent') && post.publishResults.some((result) => result.status === 'failed') ? 'partial' : post.status

  return <div className="posts-page">
    <PageHeader title="Posts" subtitle="Everything you sent, planned and drafted." icon={<List />} action={<div className="header-button-group"><Button variant="secondary" icon={<Download size={16} />} onClick={exportPosts}>Export</Button><Button icon={<Plus size={16} />} onClick={() => navigate('/app/new-post')}>New post</Button></div>} />
    <Card className="post-filters"><div className="search-input"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search your posts…" />{query && <button onClick={() => setQuery('')}>Clear</button>}</div><div className="filter-tabs">{(['all', 'sent', 'scheduled', 'draft', 'failed'] as const).map((item) => <button className={status === item ? 'active' : ''} key={item} onClick={() => setStatus(item)}>{item[0].toUpperCase() + item.slice(1)}<span>{item === 'all' ? posts.length : posts.filter((post) => post.status === item).length}</span></button>)}</div><select value={platform} onChange={(event) => setPlatform(event.target.value)} aria-label="Filter by platform"><option value="all">All platforms</option>{['Pinterest', 'Instagram', 'Facebook', 'X', 'TikTok', 'Telegram', 'Blogger'].map((item) => <option key={item}>{item}</option>)}</select></Card>
    {filtered.length ? <div className="post-list">{filtered.slice(0, visible).map((post) => <Card className="post-list-item" key={post.id}>
      <div className="post-list-platforms">{post.platforms.map((item) => <PlatformIcon key={item} platform={item} size="sm" />)}</div>
      <div className="post-list-content">
        <div className="post-list-meta"><strong>{accounts.find((account) => account.platform === post.platforms[0])?.handle || post.platforms[0]}</strong><span className={`post-status status-${post.status}`}>{post.status === 'sent' ? <CheckCircle2 /> : post.status === 'scheduled' ? <CalendarClock /> : post.status === 'failed' ? <XCircle /> : null}{statusLabel(post)}</span><time>{post.status === 'scheduled' ? formatDate(post.scheduledAt) : relativeDate(post.createdAt)}</time></div>
        <p>{post.text}</p>
        {post.firstComment && <blockquote>First comment: {post.firstComment}</blockquote>}
        {!!post.publishResults?.length && <div className="publish-results">{post.publishResults.map((result) => {
          const account = accounts.find((item) => item.id === result.accountId)
          const publicUrl = result.status === 'sent' && result.messageId && account?.handle.startsWith('@') ? `https://t.me/${account.handle.slice(1)}/${result.messageId}` : ''
          return <div key={result.accountId} className={result.status === 'sent' ? 'publish-result-sent' : 'publish-result-failed'}>{result.status === 'sent' ? <CheckCircle2 size={14} /> : <XCircle size={14} />}<strong>{account?.handle || result.platform}</strong><span>{result.status === 'sent' ? 'Published' : result.error || 'Failed'}</span>{publicUrl && <a href={publicUrl} target="_blank" rel="noreferrer">View message</a>}</div>
        })}</div>}
        <div className="post-item-actions">{post.status === 'scheduled' && <Button size="sm" onClick={() => { updatePost(post.id, { status: 'sent', scheduledAt: undefined, publishResults: undefined }); notify('Marked as sent in your history. No social network was contacted.', 'info') }} icon={<CheckCircle2 size={13} />}>Mark sent</Button>}<Button size="sm" variant="secondary" icon={<Copy size={13} />} onClick={() => { addPost({ ...post, status: 'draft', scheduledAt: undefined, publishResults: undefined }); notify('A draft copy was created.', 'info') }}>Duplicate</Button><Button size="sm" variant="ghost" icon={<Trash2 size={13} />} onClick={() => { deletePost(post.id); notify('Post deleted.', 'info') }}>Delete</Button></div>
      </div>
      {post.image && <img className="post-list-image" src={post.image} alt="Post attachment" />}
    </Card>)}</div> : <Card><EmptyState icon={<Search />} title="No posts found" text={posts.length ? 'Try changing your search or filters.' : 'Your sent and scheduled posts will appear here.'} action={<Button onClick={() => navigate('/app/new-post')}>Write your first post</Button>} /></Card>}
    {visible < filtered.length && <Button variant="secondary" className="load-more" onClick={() => setVisible((value) => value + 12)}>Load more posts</Button>}
  </div>
}
