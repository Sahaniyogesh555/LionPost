import { useState } from 'react'
import { Check, Flame, ShieldCheck } from 'lucide-react'
import { Button, Card, DiscoverMore, EmptyState, Field, PageHeader } from '../components/UI'
import { useApp } from '../context/AppContext'
import { useLocalStorage } from '../hooks/useLocalStorage'

export function Trending() {
  const [region, setRegion] = useState('United States')
  const [category, setCategory] = useState('All')
  return <div><PageHeader title="Trending now" subtitle={`Trending topics for ${region}.`} icon={<Flame />} /><Card className="trend-controls"><Field label="Country"><select value={region} onChange={(event) => setRegion(event.target.value)}>{['United States', 'Nepal', 'India', 'United Kingdom', 'Canada', 'Australia'].map((item) => <option key={item}>{item}</option>)}</select></Field><div><span className="field-label">Category</span><div className="filter-tabs">{['All', 'Sports', 'Technology', 'Business', 'Food', 'Travel'].map((item) => <button className={category === item ? 'active' : ''} key={item} onClick={() => setCategory(item)}>{item}</button>)}</div></div></Card><Card><EmptyState icon={<Flame />} title="No trending topics yet" text="A live trends source has not been connected. Topics will appear here when real data is available." /></Card><DiscoverMore /></div>
}

export function Plans() {
  const [plan, setPlan] = useLocalStorage<'free' | 'adfree'>('alphapost-plan', 'free')
  const { notify } = useApp()
  return <div><PageHeader title="Simple plans, no surprises" subtitle="Start free. Go ad-free when you want a quieter workspace." /><div className="pricing-grid"><Card className={`pricing-card ${plan === 'free' ? 'current' : ''}`}><span className="eyebrow">FREE FOREVER</span><h2>AlphaPost Free</h2><div className="price">$0 <small>forever</small></div><p>For creators who want useful publishing tools without another monthly bill.</p><ul><li><Check /> All creator tools</li><li><Check /> Up to 3 accounts per platform</li><li><Check /> Post scheduling and history</li><li><Check /> Local video creation</li><li><Check /> Website automation</li></ul><Button variant="secondary" size="lg" disabled={plan === 'free'} onClick={() => setPlan('free')}>{plan === 'free' ? 'Your current plan' : 'Switch to Free'}</Button></Card><Card className={`pricing-card featured ${plan === 'adfree' ? 'current' : ''}`}><span className="popular-label">MOST PEACEFUL</span><span className="eyebrow">ONE SIMPLE UPGRADE</span><h2>AlphaPost Ad Free</h2><div className="price">$4 <small>/ month</small></div><p>Everything in Free, with every advert removed and a calm place to do your best work.</p><ul><li><Check /> Everything in Free</li><li><Check /> No ads anywhere</li><li><Check /> Priority support</li><li><Check /> Early access to new tools</li><li><Check /> Cancel any time</li></ul><Button size="lg" disabled={plan === 'adfree'} onClick={() => { setPlan('adfree'); notify('Ad Free preview enabled. No payment was collected.') }}>{plan === 'adfree' ? 'Your current plan' : 'Preview Ad Free'}</Button></Card></div><p className="pricing-note"><ShieldCheck size={15} /> Demo checkout only. No payment details are requested or stored.</p></div>
}
