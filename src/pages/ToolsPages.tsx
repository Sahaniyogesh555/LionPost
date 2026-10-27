import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Check, Flame, RefreshCw, ShieldCheck, TrendingUp } from 'lucide-react'
import { Button, Card, EmptyState, Field, PageHeader } from '../components/UI'
import { useApp } from '../context/AppContext'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { readLiveTrends, trendRegions, type FeedItem, type TrendRegion } from '../services/feeds'

export function Trending() {
  const [region, setRegion] = useState<TrendRegion>('United States')
  const [items, setItems] = useState<FeedItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [updated, setUpdated] = useState('')
  const [reload, setReload] = useState(0)
  const navigate = useNavigate()

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    readLiveTrends(region).then((result) => {
      if (!active) return
      setItems(result.items)
      setUpdated(result.fetchedAt)
    }).catch((caught) => {
      if (!active) return
      setItems([])
      setError(caught instanceof Error ? caught.message : 'Live trends could not be loaded.')
    }).finally(() => {
      if (active) setLoading(false)
    })
    return () => { active = false }
  }, [region, reload])

  return <div>
    <PageHeader title="Trending now" subtitle={`Live Google Trends for ${region}.`} icon={<Flame />} action={<Button variant="secondary" icon={<RefreshCw size={15} className={loading ? 'spin' : ''} />} onClick={() => setReload((value) => value + 1)} disabled={loading}>Refresh</Button>} />
    <Card className="trend-controls"><Field label="Country"><select value={region} onChange={(event) => setRegion(event.target.value as TrendRegion)}>{trendRegions.map((item) => <option key={item.code}>{item.label}</option>)}</select></Field><small>{updated ? `Updated ${new Date(updated).toLocaleString()}` : 'Live data from Google Trends RSS'}</small></Card>
    {loading ? <Card><EmptyState icon={<RefreshCw className="spin" />} title="Loading live trends" text="Reading the current Google Trends feed." /></Card> : error ? <Card><EmptyState icon={<Flame />} title="Trends are unavailable" text={error} action={<Button onClick={() => setReload((value) => value + 1)}>Try again</Button>} /></Card> : <div className="trend-grid">{items.map((item, index) => <Card className="trend-card" key={item.id}><div className="trend-rank">{index + 1}</div><div className="trend-card-title"><span>LIVE TREND</span><h3>{item.title}</h3></div><div className="trend-metrics">{item.traffic && <span><TrendingUp size={14} /> {item.traffic} searches</span>}{item.published && <span>{new Date(item.published).toLocaleString()}</span>}</div>{item.news[0] && <a className="trend-news-link" href={item.news[0].url} target="_blank" rel="noreferrer">{item.news[0].source}: {item.news[0].title}</a>}<Button size="sm" onClick={() => navigate('/app/new-post', { state: { text: `${item.title}: ` } })}>Write a post <ArrowRight size={14} /></Button></Card>)}</div>}
  </div>
}

export function Plans() {
  const [plan, setPlan] = useLocalStorage<'free' | 'adfree'>('alphapost-plan', 'free')
  const { notify } = useApp()
  return <div><PageHeader title="Simple plans, no surprises" subtitle="Start free. Go ad-free when you want a quieter workspace." /><div className="pricing-grid"><Card className={`pricing-card ${plan === 'free' ? 'current' : ''}`}><span className="eyebrow">FREE FOREVER</span><h2>AlphaPost Free</h2><div className="price">$0 <small>forever</small></div><p>For creators who want useful publishing tools without another monthly bill.</p><ul><li><Check /> All creator tools</li><li><Check /> Up to 3 accounts per platform</li><li><Check /> Post scheduling and history</li><li><Check /> Local video creation</li><li><Check /> Website automation</li></ul><Button variant="secondary" size="lg" disabled={plan === 'free'} onClick={() => setPlan('free')}>{plan === 'free' ? 'Your current plan' : 'Switch to Free'}</Button></Card><Card className={`pricing-card featured ${plan === 'adfree' ? 'current' : ''}`}><span className="popular-label">MOST PEACEFUL</span><span className="eyebrow">ONE SIMPLE UPGRADE</span><h2>AlphaPost Ad Free</h2><div className="price">$4 <small>/ month</small></div><p>Everything in Free, with every advert removed and a calm place to do your best work.</p><ul><li><Check /> Everything in Free</li><li><Check /> No ads anywhere</li><li><Check /> Priority support</li><li><Check /> Early access to new tools</li><li><Check /> Cancel any time</li></ul><Button size="lg" disabled={plan === 'adfree'} onClick={() => { setPlan('adfree'); notify('Ad Free preview enabled. No payment was collected.') }}>{plan === 'adfree' ? 'Your current plan' : 'Preview Ad Free'}</Button></Card></div><p className="pricing-note"><ShieldCheck size={15} /> Demo checkout only. No payment details are requested or stored.</p></div>
}
