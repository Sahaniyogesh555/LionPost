import { ArrowRight, CalendarClock, CheckCircle2, CircleX, Clock3, Link2, Plus, Send, TrendingUp } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import AccountCards from '../components/AccountCards'
import PlatformIcon from '../components/PlatformIcon'
import ToolIcon from '../components/ToolIcon'
import { Button, Card, DiscoverMore, MiniStat, PageHeader } from '../components/UI'
import { formatDate, relativeDate } from '../utils'

const homeTools = [
  ['Post from my gallery', 'Photo, video or text, now or later', '/app/new-post', 'image', 'blue'],
  ['AI writes for me', 'Fresh posts all day by itself', '/app/auto-post/ai', 'bot', 'orange'],
  ['Share from my website', 'Every new article goes out', '/app/website', 'website', 'green'],
  ['Turn a link into posts', 'One link, many posts', '/app/new-post', 'link', 'teal'],
  ['Bee TikTok', 'Long video into TikTok shorts', '/app/bee-tiktok', 'tiktok', 'black'],
  ['Video automation', 'Short videos made on your device', '/app/video-automation', 'video', 'red'],
  ['Shorts Maker', 'Turn a long video into shorts', '/app/shorts-maker', 'shorts', 'orange'],
  ['Video Translator', 'Your voice in any language', '/app/video-translator', 'translate', 'blue'],
  ['Pin Affiliate', 'Earn from Pinterest pins', '/app/pin-affiliate', 'pinterest', 'red'],
  ['Pin Maker', 'Product photo into a tall pin', '/app/pin-maker', 'carousel', 'red'],
  ['Blogger', 'Full articles on your own blog', '/app/blogger', 'blogger', 'orange'],
]

export default function Home() {
  const { profile, posts, accounts, notify } = useApp()
  const navigate = useNavigate()
  const sent = posts.filter((post) => post.status === 'sent').length
  const scheduled = posts.filter((post) => post.status === 'scheduled')
  const failed = posts.filter((post) => post.status === 'failed').length
  const latest = posts.filter((post) => post.status === 'sent').slice(0, 5)

  return <div className="home-page">
    <PageHeader title={`Hi ${profile.name.split(' ')[0]}`} subtitle="Here is how your posts are doing." action={<Button icon={<Plus size={17} />} onClick={() => navigate('/app/new-post')}>New post</Button>} />
    <div className="stats-cards four-cards">
      <MiniStat value={accounts.length} label="Accounts added" icon={<Link2 size={18} />} />
      <MiniStat value={scheduled.length} label="Posts waiting" icon={<Clock3 size={18} />} color="orange" />
      <MiniStat value={sent + 37} label="Sent, last 30 days" icon={<Send size={18} />} color="yellow" />
      <MiniStat value={failed} label="Failed, last 30 days" icon={<CircleX size={18} />} color="red" />
    </div>

    <div className="home-tools-grid">{homeTools.map(([title, description, path, icon, color], index) => <Link to={path} className="home-tool-card" key={title}><ToolIcon name={icon} color={color} /><div><h3>{title}</h3><p>{description}</p></div>{[1, 4, 5, 6, 7, 8, 9, 10].includes(index) && <span className="new-badge">NEW</span>}</Link>)}</div>

    <DiscoverMore links={['Social media marketing', 'Social posting tool', 'Multi-channel posting']} />

    <section className="home-section"><div className="section-title-line"><h2>Your social accounts</h2><Link to="/app/accounts">See all</Link></div><AccountCards accounts={accounts} /></section>

    <Card className="trending-preview" title="Trending now" subtitle="What people search in United States today" action={<Link to="/app/trending" className="small-link">See all</Link>}>
      <div className="trend-chip-list">{['Rui Hachimura 500+', 'Iowa Football Playoffs 500+', 'Caitlin Clark 200+', 'Wembanyama 20k', 'William Contreras 200k', 'Grayson Allen 100k'].map((topic) => <button key={topic} onClick={() => { navigate('/app/new-post', { state: { text: `${topic.split(/ \d/)[0]}: ` } }) }}>{topic}</button>)}</div>
    </Card>

    <section className="home-section"><div className="section-title-line"><h2>Coming up</h2><Link to="/app/posts">All posts</Link></div><Card>{scheduled.length === 0 ? <div className="inline-empty">Nothing waiting. <Link to="/app/new-post">Plan a post</Link></div> : <div className="compact-post-list">{scheduled.slice(0, 3).map((post) => <div className="compact-post" key={post.id}><PlatformIcon platform={post.platforms[0]} /><div><p>{post.text}</p><small><CalendarClock size={13} /> {formatDate(post.scheduledAt)}</small></div></div>)}</div>}</Card></section>

    <section className="home-section"><div className="section-title-line"><h2>Latest posts</h2><Link to="/app/posts">All posts</Link></div><div className="latest-posts">{latest.map((post) => <article className="latest-post" key={post.id}><div className="latest-post-top"><PlatformIcon platform={post.platforms[0]} /><div><span className="post-account-name">{accounts.find((account) => account.platform === post.platforms[0])?.handle || `@${post.platforms[0].toLowerCase()}`}</span><p>{post.text}</p><small><CheckCircle2 size={13} /> Sent · {relativeDate(post.createdAt)}</small></div>{post.image ? <img src={post.image} alt="Post" /> : <span className="post-placeholder"><TrendingUp /></span>}</div></article>)}</div></section>
    <div className="home-help"><span>Need a hand?</span><button onClick={() => notify('Support is online. Send us a message any time.', 'info')}>Contact support <ArrowRight size={14} /></button></div>
  </div>
}
