import { useMemo, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, BadgeCheck, BookOpen, Check, CheckCircle2, Clipboard, Clock3, Copy, Download, ExternalLink, FileText, Flame, Globe2, GraduationCap, Lightbulb, Monitor, Play, RefreshCw, Search, ShieldCheck, Sparkles, TrendingUp, XCircle, Zap } from 'lucide-react'
import ToolHero from '../components/ToolHero'
import ToolIcon from '../components/ToolIcon'
import { Button, Card, DiscoverMore, EmptyState, Field, MiniStat, PageHeader, StepNumber } from '../components/UI'
import { useApp } from '../context/AppContext'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { downloadText } from '../utils'

const trendTopics = [
  ['Rui Hachimura', 'Sports', '500K+', '+124%'], ['Iowa Football Playoffs', 'Sports', '500K+', '+89%'], ['Caitlin Clark', 'Sports', '200K+', '+76%'],
  ['Wembanyama', 'Sports', '20K+', '+62%'], ['William Contreras', 'Sports', '200K+', '+58%'], ['Grayson Allen', 'Sports', '100K+', '+44%'],
  ['AI video tools', 'Technology', '90K+', '+132%'], ['Small business ideas', 'Business', '74K+', '+38%'], ['Healthy dinner recipes', 'Food', '60K+', '+35%'],
  ['Home office makeover', 'Home', '45K+', '+31%'], ['Slow travel in Nepal', 'Travel', '22K+', '+28%'], ['Capsule wardrobe', 'Fashion', '18K+', '+24%'],
]

export function Trending() {
  const [region, setRegion] = useState('United States')
  const [category, setCategory] = useState('All')
  const [updated, setUpdated] = useState('just now')
  const navigate = useNavigate()
  const { notify } = useApp()
  const filtered = category === 'All' ? trendTopics : trendTopics.filter((topic) => topic[1] === category)
  return <div><PageHeader title="Trending now" subtitle={`What people search in ${region} today.`} icon={<Flame />} action={<Button variant="secondary" icon={<RefreshCw size={15} />} onClick={() => { setUpdated('just now'); notify('Trending topics refreshed.') }}>Refresh</Button>} /><Card className="trend-controls"><Field label="Country"><select value={region} onChange={(event) => setRegion(event.target.value)}>{['United States', 'Nepal', 'India', 'United Kingdom', 'Canada', 'Australia'].map((item) => <option key={item}>{item}</option>)}</select></Field><div><span className="field-label">Category</span><div className="filter-tabs">{['All', 'Sports', 'Technology', 'Business', 'Food', 'Travel'].map((item) => <button className={category === item ? 'active' : ''} key={item} onClick={() => setCategory(item)}>{item}</button>)}</div></div><small>Updated {updated}</small></Card><div className="trend-grid">{filtered.map(([topic, type, volume, growth], index) => <Card className="trend-card" key={topic}><div className="trend-rank">{index + 1}</div><div className="trend-card-title"><span>{type}</span><h3>{topic}</h3></div><div className="trend-metrics"><span><Search size={14} /> {volume} searches</span><span className="positive"><TrendingUp size={14} /> {growth}</span></div><div className="related-keywords"><span>{topic.toLowerCase()} news</span><span>{topic.toLowerCase()} today</span></div><Button size="sm" onClick={() => navigate('/app/new-post', { state: { text: `${topic}: here is what you need to know today. ` } })}>Write a post <ArrowRight size={14} /></Button></Card>)}</div><DiscoverMore /></div>
}

interface KeywordRow { keyword: string; volume: number; difficulty: number; cpc: string; trend: number[] }
function keywordData(topic: string): KeywordRow[] {
  const clean = topic.trim().toLowerCase()
  const modifiers = ['for beginners', 'ideas', 'tools', 'tips', 'examples', 'step by step', 'free', '2026', 'near me', 'guide', 'best practices', 'checklist']
  return [clean, ...modifiers.map((item) => `${clean} ${item}`)].map((keyword, index) => {
    const seed = [...keyword].reduce((sum, char) => sum + char.charCodeAt(0), 0)
    return { keyword, volume: 400 + ((seed * (index + 7)) % 24000), difficulty: 8 + (seed % 82), cpc: `$${((seed % 450) / 100 + 0.15).toFixed(2)}`, trend: Array.from({ length: 8 }, (_, point) => 20 + ((seed + point * index * 13) % 70)) }
  })
}

export function KeywordResearch() {
  const [topic, setTopic] = useState('')
  const [keyword, setKeyword] = useState('')
  const [results, setResults] = useState<KeywordRow[]>([])
  const [sort, setSort] = useState('volume')
  const { notify } = useApp()
  const navigate = useNavigate()
  const search = (event?: FormEvent) => {
    event?.preventDefault()
    if (!topic.trim()) return notify('Type a topic to research.', 'error')
    setKeyword(topic.trim()); setResults(keywordData(topic)); notify('Keyword ideas are ready.')
  }
  const sorted = useMemo(() => [...results].sort((a, b) => sort === 'volume' ? b.volume - a.volume : sort === 'difficulty' ? a.difficulty - b.difficulty : a.keyword.localeCompare(b.keyword)), [results, sort])
  const exportCsv = () => { downloadText('alphapost-keywords.csv', ['Keyword,Volume,Difficulty,CPC', ...sorted.map((row) => `"${row.keyword}",${row.volume},${row.difficulty},${row.cpc}`)].join('\n'), 'text/csv'); notify('Keyword report downloaded.') }
  return <div><PageHeader title="Keyword Research" subtitle="Find useful topics, clear search intent and keywords you can actually target." icon={<Search />} /><Card className="keyword-search-card"><form onSubmit={search}><div className="search-input large"><Search size={20} /><input value={topic} onChange={(event) => setTopic(event.target.value)} placeholder="Try “social media marketing” or “healthy recipes”" /><Button type="submit">Find keywords</Button></div></form><div className="suggestion-row"><span>Popular:</span>{['AI tools', 'Pinterest marketing', 'Home workout', 'Nepal travel'].map((item) => <button key={item} onClick={() => { setTopic(item); setKeyword(item); setResults(keywordData(item)) }}>{item}</button>)}</div></Card>{results.length ? <><div className="stats-cards three-cards"><MiniStat value={results.length} label="Keyword ideas" icon={<Lightbulb />} /><MiniStat value={Math.round(results.reduce((sum, row) => sum + row.volume, 0) / results.length).toLocaleString()} label="Average monthly volume" icon={<TrendingUp />} color="green" /><MiniStat value={results.filter((row) => row.difficulty < 40).length} label="Low-competition ideas" icon={<BadgeCheck />} color="blue" /></div><Card className="keyword-results" title={`Ideas for “${keyword}”`} subtitle="Sample estimates to help you compare topics and plan content." action={<div className="header-button-group"><select value={sort} onChange={(event) => setSort(event.target.value)}><option value="volume">Highest volume</option><option value="difficulty">Lowest difficulty</option><option value="keyword">Keyword A–Z</option></select><Button size="sm" variant="secondary" icon={<Download size={14} />} onClick={exportCsv}>Export</Button></div>}><div className="responsive-table"><table><thead><tr><th>Keyword</th><th>Monthly volume</th><th>Difficulty</th><th>CPC</th><th>Trend</th><th /></tr></thead><tbody>{sorted.map((row) => <tr key={row.keyword}><td><strong>{row.keyword}</strong></td><td>{row.volume.toLocaleString()}</td><td><span className={`difficulty ${row.difficulty < 35 ? 'easy' : row.difficulty < 65 ? 'medium' : 'hard'}`}>{row.difficulty} · {row.difficulty < 35 ? 'Easy' : row.difficulty < 65 ? 'Medium' : 'Hard'}</span></td><td>{row.cpc}</td><td><div className="mini-bars">{row.trend.map((value, index) => <i key={index} style={{ height: `${value}%` }} />)}</div></td><td><button className="icon-button" onClick={() => navigate('/app/new-post', { state: { text: `${row.keyword}: ` } })} title="Write a post"><ArrowRight size={15} /></button></td></tr>)}</tbody></table></div></Card></> : <Card><EmptyState icon={<Search />} title="Start with one topic" text="We will turn it into a practical list of keyword ideas, search intent and content opportunities." /></Card>}<DiscoverMore links={['Content planning basics', 'Search intent guide', 'AEO checklist']} /></div>
}

export function AeoChecker() {
  const [url, setUrl] = useState('')
  const [content, setContent] = useState('')
  const [result, setResult] = useState<{ score: number; checks: { label: string; passed: boolean; tip: string }[]; words: number } | null>(null)
  const { notify } = useApp()
  const analyze = (event: FormEvent) => {
    event.preventDefault()
    if (content.trim().length < 40) return notify('Paste at least a paragraph of your content to analyze.', 'error')
    const words = content.trim().split(/\s+/).length
    const checks = [
      { label: 'Clear question or search intent', passed: /^(who|what|why|when|where|how|can|is|are|does)/im.test(content) || content.includes('?'), tip: 'Open with a direct question your audience asks.' },
      { label: 'Concise answer near the top', passed: (content.split(/[.!?]/)[0] || '').length < 240, tip: 'Answer the main question in the first 40–60 words.' },
      { label: 'Useful content depth', passed: words >= 180, tip: 'Add examples and detail; aim for at least 180 useful words.' },
      { label: 'Scannable structure', passed: /\n#{1,4} |\n[A-Z][^\n]{2,70}\n/.test(content) || content.includes('\n\n'), tip: 'Use descriptive headings and short sections.' },
      { label: 'Lists or steps', passed: /(^|\n)\s*([-*]|\d+[.)])\s/.test(content), tip: 'Turn instructions or comparisons into a simple list.' },
      { label: 'Supporting evidence or sources', passed: /https?:\/\/|according to|research|study|data shows/i.test(content), tip: 'Support important claims with a credible source or original data.' },
      { label: 'Natural, specific language', passed: !/best|revolutionary|game[- ]changer/i.test(content) || words > 250, tip: 'Prefer specific outcomes and examples over broad marketing claims.' },
    ]
    const score = Math.round((checks.filter((check) => check.passed).length / checks.length) * 100)
    setResult({ score, checks, words }); notify('Your AEO report is ready.')
  }
  return <div><PageHeader title="AEO Checker" subtitle="Check whether your content is clear, useful and easy for AI answer engines to cite." icon={<BadgeCheck />} /><div className="aeo-layout"><Card title="Check your content" subtitle="Paste a URL for context and the content you want to improve."><form onSubmit={analyze}><Field label="Page URL (optional)"><div className="input-with-icon"><Globe2 size={16} /><input type="url" value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://yourblog.com/article" /></div></Field><Field label="Your content" hint="Headings, questions, steps and sources all help answer engines understand your page."><textarea className="aeo-textarea" value={content} onChange={(event) => setContent(event.target.value)} placeholder={'How do I plan a week of social content?\n\nStart with one useful question for your audience…\n\n1. Choose a topic\n2. Add an example\n3. End with a next step'} /></Field><Button type="submit" size="lg" icon={<Sparkles size={17} />}>Check my content</Button></form></Card><Card className="aeo-tips" title="What answer engines look for"><ul className="info-list"><li><CheckCircle2 />A direct, accurate answer</li><li><CheckCircle2 />Clear headings and structured sections</li><li><CheckCircle2 />Original examples and trustworthy sources</li><li><CheckCircle2 />Specific language, not keyword stuffing</li></ul></Card></div>{result && <Card className="aeo-report"><div className="aeo-score" style={{ '--score': `${result.score * 3.6}deg` } as React.CSSProperties}><div><strong>{result.score}</strong><span>AEO score</span></div></div><div className="aeo-report-main"><div className="section-title-line"><div><h2>{result.score >= 80 ? 'Excellent answer readiness' : result.score >= 55 ? 'Good start — a few improvements' : 'Your content needs more structure'}</h2><p>{result.words} words analyzed{url ? ` · ${url}` : ''}</p></div><Button size="sm" variant="secondary" icon={<Download size={14} />} onClick={() => { downloadText('alphapost-aeo-report.txt', `AEO score: ${result.score}/100\nWords: ${result.words}\n\n${result.checks.map((check) => `${check.passed ? 'PASS' : 'IMPROVE'}: ${check.label}\n${check.tip}`).join('\n\n')}`); notify('AEO report downloaded.') }}>Download report</Button></div><div className="aeo-check-list">{result.checks.map((check) => <div className={check.passed ? 'passed' : ''} key={check.label}>{check.passed ? <CheckCircle2 /> : <XCircle />}<span><strong>{check.label}</strong><small>{check.passed ? 'This signal is covered.' : check.tip}</small></span></div>)}</div></div></Card>}</div>
}

export function LearnEarn() {
  const [completed, setCompleted] = useLocalStorage<string[]>('alphapost-lessons', [])
  const { notify } = useApp()
  const lessons = [
    ['Start your creator workflow', '12 min', 'Learn the simple system for turning one idea into a week of content.', 'Beginner'],
    ['Earn your first $100 with affiliate marketing', '24 min', 'Choose a useful niche, find real products and make content people can trust.', 'Earn'],
    ['Pinterest SEO, without the jargon', '18 min', 'Pick searchable titles, useful boards and descriptions that keep working.', 'Growth'],
    ['Make better short videos', '16 min', 'Hooks, pacing, captions and sound — a practical guide to better retention.', 'Video'],
    ['Build a blog that answers real questions', '21 min', 'Use search intent and AEO principles to make articles worth citing.', 'AEO'],
    ['Automation without losing your voice', '14 min', 'Build a repeatable routine while keeping every post unmistakably yours.', 'Systems'],
  ]
  return <div><PageHeader title="Learn & Earn" subtitle="Short, practical lessons from people who publish online." icon={<GraduationCap />} action={<span className="count-pill">{completed.length} of {lessons.length} complete</span>} /><ToolHero title="Build skills. Make things. Earn well." description="A free learning library for creators, marketers and small businesses. No fluff — just useful steps you can apply today." icon={<BookOpen />} badges={['Practical lessons', 'Free forever', 'Learn at your pace']} theme="dark" /><div className="lesson-grid">{lessons.map(([title, duration, description, category], index) => { const done = completed.includes(title); return <Card className={`lesson-card ${done ? 'completed' : ''}`} key={title}><div className={`lesson-thumbnail badge-${['yellow', 'green', 'red', 'orange', 'blue', 'teal'][index]}`}><Play />{done && <span><Check /> Completed</span>}</div><div className="lesson-meta"><span>{category}</span><small><Clock3 size={13} /> {duration}</small></div><h2>{title}</h2><p>{description}</p><Button variant={done ? 'secondary' : 'primary'} onClick={() => { setCompleted((items) => done ? items.filter((item) => item !== title) : [...items, title]); notify(done ? 'Lesson marked as not complete.' : 'Lesson completed. Nice work!') }} icon={done ? <RefreshCw size={15} /> : <Check size={15} />}>{done ? 'Mark as incomplete' : 'Mark lesson complete'}</Button></Card>})}</div></div>
}

export function Emulator() {
  const { notify } = useApp()
  const guide = `AlphaPost Emulator Setup Guide\n\n1. Install a trusted Android emulator on your own computer.\n2. Enable virtualization in your BIOS if requested.\n3. Allocate at least 4 GB RAM and 2 CPU cores.\n4. Sign in with your own Google account.\n5. Install the social apps you want to use.\n\nOnly download software from the emulator provider's official website.`
  return <div><PageHeader title="Emulator Free" subtitle="Run your favorite Android creator apps on your own PC." /><ToolHero title="Your Android workspace, on your computer" description="A simple setup guide for running mobile publishing apps with a larger screen, a full keyboard and your own files." icon={<Monitor />} badges={['Windows and macOS', 'Free setup', 'Your own computer']} theme="blue" /><div className="stats-cards three-cards"><MiniStat value="4 GB+" label="RAM recommended" icon={<Zap />} /><MiniStat value="10 GB" label="Free storage" icon={<Monitor />} color="blue" /><MiniStat value="64-bit" label="Operating system" icon={<BadgeCheck />} color="green" /></div><Card title="Set up in four steps"><div className="steps-grid">{[['Choose an emulator', 'Pick a reputable Android emulator that supports your operating system.'], ['Enable virtualization', 'Follow the provider’s guide to enable VT-x or AMD-V if needed.'], ['Add your apps', 'Open the Play Store and install only the creator apps you use.'], ['Start creating', 'Bring your files, connect your accounts and use the bigger screen.']].map(([title, text], index) => <article className="how-card" key={title}><StepNumber number={index + 1} /><h3>{title}</h3><p>{text}</p></article>)}</div><Button icon={<Download size={16} />} onClick={() => { downloadText('alphapost-emulator-guide.txt', guide); notify('Setup guide downloaded.') }}>Download setup guide</Button></Card><Card className="safety-card" title="A quick safety note"><ShieldCheck /><p>Only download emulator software from its official provider. Never enter your social account password into an unofficial or modified app.</p></Card></div>
}

export function Plans() {
  const [plan, setPlan] = useLocalStorage<'free' | 'adfree'>('alphapost-plan', 'free')
  const { notify } = useApp()
  return <div><PageHeader title="Simple plans, no surprises" subtitle="Start free. Go ad-free when you want a quieter workspace." /><div className="pricing-grid"><Card className={`pricing-card ${plan === 'free' ? 'current' : ''}`}><span className="eyebrow">FREE FOREVER</span><h2>AlphaPost Free</h2><div className="price">$0 <small>forever</small></div><p>For creators who want useful tools and a community without another monthly bill.</p><ul><li><Check /> All 16 creator tools</li><li><Check /> Up to 3 accounts per platform</li><li><Check /> Community access</li><li><Check /> Local video creation</li><li><Check /> Keyword and AEO tools</li></ul><Button variant="secondary" size="lg" disabled={plan === 'free'} onClick={() => setPlan('free')}>{plan === 'free' ? 'Your current plan' : 'Switch to Free'}</Button></Card><Card className={`pricing-card featured ${plan === 'adfree' ? 'current' : ''}`}><span className="popular-label">MOST PEACEFUL</span><span className="eyebrow">ONE SIMPLE UPGRADE</span><h2>AlphaPost Ad Free</h2><div className="price">$4 <small>/ month</small></div><p>Everything in Free, with every advert removed and a calm place to do your best work.</p><ul><li><Check /> Everything in Free</li><li><Check /> No ads anywhere</li><li><Check /> Priority support</li><li><Check /> Early access to new tools</li><li><Check /> Cancel any time</li></ul><Button size="lg" disabled={plan === 'adfree'} onClick={() => { setPlan('adfree'); notify('Ad Free preview enabled. No payment was collected.') }}>{plan === 'adfree' ? 'Your current plan' : 'Preview Ad Free'}</Button></Card></div><p className="pricing-note"><ShieldCheck size={15} /> Demo checkout only. No payment details are requested or stored.</p></div>
}
