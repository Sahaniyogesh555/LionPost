import { useMemo, useState } from 'react'
import { CalendarClock, CheckCircle2, Copy, Download, List, Plus, RefreshCw, Search, Trash2, XCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { useAuth } from '../context/AuthContext'
import PlatformIcon from '../components/PlatformIcon'
import { Button, Card, EmptyState, PageHeader } from '../components/UI'
import { cleanupPostMedia, getTikTokPublicationStatus } from '../services/providers'
import { downloadText, formatDate, relativeDate } from '../utils'
import type { Post, PostStatus, PublishResult } from '../types'

export default function Posts() {
  const { posts, accounts, deletePost, updatePost, addPost, notify } = useApp()
  const { session } = useAuth()
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<'all' | PostStatus>('all')
  const [platform, setPlatform] = useState('all')
  const [visible, setVisible] = useState(12)
  const [checkingTikTok, setCheckingTikTok] = useState('')
  const navigate = useNavigate()
  const filtered = useMemo(() => posts.filter((post) => (status === 'all' || post.status === status) && (platform === 'all' || post.platforms.includes(platform as never)) && post.text.toLowerCase().includes(query.toLowerCase())), [posts, status, platform, query])
  const exportPosts = () => {
    const rows = [['Text', 'Platforms', 'Status', 'Created', 'Scheduled', 'Publishing'], ...filtered.map((post) => [post.text, post.platforms.join(', '), post.status, post.createdAt, post.scheduledAt || '', (post.publishResults || []).map((result) => `${result.accountId}: ${result.status}${result.delivery ? `/${result.delivery}` : ''}${result.warning ? ` (${result.warning})` : ''}${result.error ? ` (${result.error})` : ''}`).join('; ')])]
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n')
    downloadText('lionpost-posts.csv', csv, 'text/csv')
    notify('Your posts were exported.')
  }
  const checkTikTokStatus = async (post: Post, result: PublishResult) => {
    const accessToken = session?.access_token
    const publishId = result.externalId
    if (!accessToken || !publishId || checkingTikTok) return
    const key = `${post.id}:${result.accountId}`
    setCheckingTikTok(key)
    try {
      const current = await getTikTokPublicationStatus(accessToken, result.accountId, publishId)
      let next: PublishResult
      let terminal = false
      let notification = ''
      let notificationType: 'success' | 'info' | 'error' = 'info'
      if (current.status === 'SEND_TO_USER_INBOX') {
        terminal = true
        next = { ...result, status: 'sent', delivery: 'provider_draft', publishedAt: undefined, url: undefined, warning: 'TikTok confirmed that the draft notification was sent to the creator’s inbox. Open TikTok → Inbox → System notifications to finish it; it was not posted automatically.', error: undefined }
        notification = 'TikTok confirmed inbox delivery. Open TikTok → Inbox → System notifications.'
        notificationType = 'success'
      } else if (current.status === 'PUBLISH_COMPLETE') {
        terminal = true
        next = { ...result, status: 'sent', delivery: 'published', publishedAt: result.publishedAt || new Date().toISOString(), warning: 'TikTok confirms that this content was published. Private posts may not return a public URL.', error: undefined }
        notification = 'TikTok confirmed that this content was published.'
        notificationType = 'success'
      } else if (current.status === 'FAILED') {
        terminal = true
        next = { ...result, status: 'failed', delivery: undefined, publishedAt: undefined, url: undefined, warning: undefined, error: current.message || `TikTok processing failed${current.failReason ? ` [${current.failReason}]` : '.'}` }
        notification = next.error || 'TikTok processing failed.'
        notificationType = 'error'
      } else {
        const processing = ['PROCESSING_UPLOAD', 'PROCESSING_DOWNLOAD'].includes(current.status)
        next = { ...result, status: 'sent', delivery: 'provider_pending', publishedAt: undefined, url: undefined, warning: processing ? 'TikTok is still processing this upload; inbox delivery or publication is not confirmed yet. Check again later before retrying.' : `TikTok returned ${current.status || 'UNKNOWN'}. Inbox delivery or publication is not confirmed; check again later before retrying.`, error: undefined }
        notification = processing ? 'TikTok is still processing this upload. No inbox delivery has been confirmed yet.' : `TikTok returned ${current.status || 'UNKNOWN'}; no final delivery has been confirmed.`
      }
      let pendingMediaPath = result.pendingMediaPath
      if (terminal && pendingMediaPath) {
        try {
          await cleanupPostMedia(accessToken, pendingMediaPath)
          pendingMediaPath = undefined
        } catch { /* Keep the owner-scoped path so a later status check can retry cleanup. */ }
      }
      next.pendingMediaPath = pendingMediaPath
      const publishResults = (post.publishResults || []).map((item) => item === result ? next : item)
      updatePost(post.id, { publishResults, status: publishResults.some((item) => item.status === 'failed') ? 'failed' : 'sent' })
      notify(notification, notificationType)
    } catch (error) {
      notify(error instanceof Error ? error.message : 'TikTok status could not be checked.', 'error')
    } finally {
      setCheckingTikTok('')
    }
  }
  const statusLabel = (post: Post) => post.publishResults?.some((result) => result.status === 'sent') && post.publishResults.some((result) => result.status === 'failed') ? 'partial' : post.status

  return <div className="posts-page">
    <PageHeader title="Posts" subtitle="Everything you sent, planned and drafted." icon={<List />} action={<div className="header-button-group"><Button variant="secondary" icon={<Download size={16} />} onClick={exportPosts}>Export</Button><Button icon={<Plus size={16} />} onClick={() => navigate('/app/new-post')}>New post</Button></div>} />
    <Card className="post-filters"><div className="search-input"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search your posts…" />{query && <button onClick={() => setQuery('')}>Clear</button>}</div><div className="filter-tabs">{(['all', 'sent', 'scheduled', 'draft', 'failed'] as const).map((item) => <button className={status === item ? 'active' : ''} key={item} onClick={() => setStatus(item)}>{item[0].toUpperCase() + item.slice(1)}<span>{item === 'all' ? posts.length : posts.filter((post) => post.status === item).length}</span></button>)}</div><select value={platform} onChange={(event) => setPlatform(event.target.value)} aria-label="Filter by platform"><option value="all">All platforms</option>{['Pinterest', 'Instagram', 'Facebook', 'X', 'TikTok', 'Telegram', 'Blogger', 'YouTube', 'Dailymotion'].map((item) => <option key={item}>{item}</option>)}</select></Card>
    {filtered.length ? <div className="post-list">{filtered.slice(0, visible).map((post) => <Card className="post-list-item" key={post.id}>
      <div className="post-list-platforms">{post.platforms.map((item) => <PlatformIcon key={item} platform={item} size="sm" />)}</div>
      <div className="post-list-content">
        <div className="post-list-meta"><strong>{accounts.find((account) => account.platform === post.platforms[0])?.handle || post.platforms[0]}</strong><span className={`post-status status-${post.status}`}>{post.status === 'sent' ? <CheckCircle2 /> : post.status === 'scheduled' ? <CalendarClock /> : post.status === 'failed' ? <XCircle /> : null}{statusLabel(post)}</span><time>{post.status === 'scheduled' ? formatDate(post.scheduledAt) : relativeDate(post.createdAt)}</time></div>
        <p>{post.text}</p>
        {post.firstComment && <blockquote>First comment: {post.firstComment}</blockquote>}
        {!!post.publishResults?.length && <div className="publish-results">{post.publishResults.map((result) => {
          const account = accounts.find((item) => item.id === result.accountId)
          const telegramUrl = result.messageId && account?.handle.startsWith('@') ? `https://t.me/${account.handle.slice(1)}/${result.messageId}` : ''
          const publicUrl = result.status === 'sent' ? result.url || telegramUrl : ''
          const pending = result.delivery === 'provider_pending'
          const checkKey = `${post.id}:${result.accountId}`
          return <div key={result.accountId} className={result.status === 'sent' ? pending ? 'publish-result-pending' : 'publish-result-sent' : 'publish-result-failed'}>{result.status === 'sent' ? pending ? <CalendarClock size={14} /> : <CheckCircle2 size={14} /> : <XCircle size={14} />}<strong>{account?.handle || result.platform}</strong><span>{result.status === 'sent' ? result.warning || (result.delivery === 'provider_draft' ? 'Draft uploaded; finish it from the TikTok inbox.' : pending ? 'Processing; check TikTok status before retrying.' : 'Published') : result.error || 'Failed'}</span>{publicUrl && <a href={publicUrl} target="_blank" rel="noreferrer">{result.platform === 'Blogger' ? 'View article' : result.platform === 'YouTube' || result.platform === 'Dailymotion' ? 'View video' : result.platform === 'Telegram' ? 'View message' : 'View post'}</a>}{result.platform === 'TikTok' && result.externalId && <Button type="button" size="sm" variant="ghost" disabled={!!checkingTikTok} icon={<RefreshCw className={checkingTikTok === checkKey ? 'spin' : ''} size={12} />} onClick={() => checkTikTokStatus(post, result)}>{checkingTikTok === checkKey ? 'Checking…' : 'Check TikTok status'}</Button>}</div>
        })}</div>}
        <div className="post-item-actions">{post.status === 'scheduled' && <Button size="sm" onClick={() => { updatePost(post.id, { status: 'sent', scheduledAt: undefined, publishResults: undefined }); notify('Marked as sent in your history. No social network was contacted.', 'info') }} icon={<CheckCircle2 size={13} />}>Mark sent</Button>}<Button size="sm" variant="secondary" icon={<Copy size={13} />} onClick={() => { addPost({ ...post, status: 'draft', scheduledAt: undefined, publishResults: undefined }); notify('A draft copy was created.', 'info') }}>Duplicate</Button><Button size="sm" variant="ghost" icon={<Trash2 size={13} />} onClick={() => { deletePost(post.id); notify('Post deleted.', 'info') }}>Delete</Button></div>
      </div>
      {post.image && <img className="post-list-image" src={post.image} alt="Post attachment" />}
    </Card>)}</div> : <Card><EmptyState icon={<Search />} title="No posts found" text={posts.length ? 'Try changing your search or filters.' : 'Your sent and scheduled posts will appear here.'} action={<Button onClick={() => navigate('/app/new-post')}>Write your first post</Button>} /></Card>}
    {visible < filtered.length && <Button variant="secondary" className="load-more" onClick={() => setVisible((value) => value + 12)}>Load more posts</Button>}
  </div>
}
