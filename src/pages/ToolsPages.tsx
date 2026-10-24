import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Check, Flame, RefreshCw, Search, ShieldCheck, TrendingUp } from 'lucide-react'
import { Button, Card, DiscoverMore, Field, PageHeader } from '../components/UI'
import { useApp } from '../context/AppContext'
import { useLocalStorage } from '../hooks/useLocalStorage'

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

export function Plans() {
  const [plan, setPlan] = useLocalStorage<'free' | 'adfree'>('alphapost-plan', 'free')
  const { notify } = useApp()
  return <div><PageHeader title="Simple plans, no surprises" subtitle="Start free. Go ad-free when you want a quieter workspace." /><div className="pricing-grid"><Card className={`pricing-card ${plan === 'free' ? 'current' : ''}`}><span className="eyebrow">FREE FOREVER</span><h2>AlphaPost Free</h2><div className="price">$0 <small>forever</small></div><p>For creators who want useful publishing tools without another monthly bill.</p><ul><li><Check /> All creator tools</li><li><Check /> Up to 3 accounts per platform</li><li><Check /> Post scheduling and history</li><li><Check /> Local video creation</li><li><Check /> Website automation</li></ul><Button variant="secondary" size="lg" disabled={plan === 'free'} onClick={() => setPlan('free')}>{plan === 'free' ? 'Your current plan' : 'Switch to Free'}</Button></Card><Card className={`pricing-card featured ${plan === 'adfree' ? 'current' : ''}`}><span className="popular-label">MOST PEACEFUL</span><span className="eyebrow">ONE SIMPLE UPGRADE</span><h2>AlphaPost Ad Free</h2><div className="price">$4 <small>/ month</small></div><p>Everything in Free, with every advert removed and a calm place to do your best work.</p><ul><li><Check /> Everything in Free</li><li><Check /> No ads anywhere</li><li><Check /> Priority support</li><li><Check /> Early access to new tools</li><li><Check /> Cancel any time</li></ul><Button size="lg" disabled={plan === 'adfree'} onClick={() => { setPlan('adfree'); notify('Ad Free preview enabled. No payment was collected.') }}>{plan === 'adfree' ? 'Your current plan' : 'Preview Ad Free'}</Button></Card></div><p className="pricing-note"><ShieldCheck size={15} /> Demo checkout only. No payment details are requested or stored.</p></div>
}
