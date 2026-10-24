import { useState, type FormEvent } from 'react'
import { Check, CheckCircle2, Copy, Download, KeyRound, Link2, Pin, Plus, ShieldCheck, ShoppingBag } from 'lucide-react'
import { useApp } from '../context/AppContext'
import AutomationCard from '../components/AutomationCard'
import ToolHero from '../components/ToolHero'
import { Button, Card, Field, Modal, PageHeader, StepNumber } from '../components/UI'
import { downloadText } from '../utils'

export default function PinAffiliate() {
  const { automations, addAutomation, notify } = useApp()
  const pins = automations.filter((item) => item.kind === 'pinterest')
  const [keysAdded, setKeysAdded] = useState(true)
  const [modal, setModal] = useState<'keys' | 'automation' | null>(null)
  const [key, setKey] = useState('')
  const [secret, setSecret] = useState('')
  const [tracking, setTracking] = useState('')
  const [name, setName] = useState('')
  const [topic, setTopic] = useState('')
  const copy = (value: string) => { navigator.clipboard?.writeText(value); notify('Copied to clipboard.', 'info') }

  const saveKeys = (event: FormEvent) => {
    event.preventDefault()
    if (!key || !secret || !tracking) return notify('Fill in all three AliExpress values.', 'error')
    setKeysAdded(true); setModal(null); setKey(''); setSecret(''); setTracking(''); notify('AliExpress keys connected.')
  }
  const createAutomation = (event: FormEvent) => {
    event.preventDefault()
    if (!name || !topic) return notify('Add a name and product subject.', 'error')
    addAutomation({ kind: 'pinterest', name, detail: `${topic} · United States · 12 pins a day · Board: ${name}`, platforms: ['Pinterest'] })
    setModal(null); setName(''); setTopic(''); notify('Pin automation started.')
  }

  return <div className="pin-affiliate-page">
    <PageHeader title="Pin Affiliate" subtitle="Real AliExpress products, your affiliate link, posted for you." />
    <ToolHero title="Earn from Pinterest while you sleep" description="Connect your Pinterest board, add your AliExpress affiliate keys and pick a subject. AlphaPost finds real products, writes the pin and posts it with your affiliate link, all day, by itself." icon={<ShoppingBag />} badges={['Real products', 'Your affiliate link', 'Automatic pinning']} theme="yellow" />
    <Card className="affiliate-keys-card" title="Your AliExpress keys" subtitle="Your own keys, so every sale is yours." action={<span className="icon-badge badge-green"><KeyRound /></span>}>{keysAdded ? <div className="keys-connected"><span><CheckCircle2 /> Keys added and working</span><small>App key •••• 9402 · Tracking ID: AlphaPost</small><Button size="sm" variant="secondary" onClick={() => setModal('keys')}>Change</Button><Button size="sm" variant="danger" onClick={() => { setKeysAdded(false); notify('AliExpress keys removed.', 'info') }}>Remove</Button></div> : <Button icon={<Plus size={15} />} onClick={() => setModal('keys')}>Add AliExpress keys</Button>}</Card>
    <Card className="automation-limit"><CheckCircle2 /><div><strong>You have {pins.length} pin automations</strong><p>{pins.length >= 3 ? 'That is the most allowed. Edit or delete one below to make another.' : 'Choose real products and let AlphaPost pin them for you.'}</p></div>{pins.length < 3 && <Button size="sm" onClick={() => setModal('automation')}>Add automation</Button>}</Card>
    <section><div className="section-title-line"><h2>Your pin automations</h2><span className="count-pill">{pins.length} of 3</span></div><div className="automation-list">{pins.map((item) => <AutomationCard key={item.id} automation={item} />)}</div></section>
    <p className="helper-text">Every pin also shows in <a href="/app/posts">Posts</a>.</p>
    <Card className="affiliate-guide" title="How to get your 3 AliExpress keys" subtitle="About 15 minutes, one time, free.">
      {[
        ['Join the affiliate program', 'Open portals.aliexpress.com and sign up. Your Tracking ID is under Account.'],
        ['Ask for API access', 'Open openservice.aliexpress.com. Add Dropshipping/Affiliates Developer, then Affiliates (Individual). Add your ID card. On the data questions answer No, except “can you delete or correct data”, answer Yes.'],
        ['Make your app', 'When the approval email comes, open App Console (not Create Account), then App Management, then Create App, and pick Affiliates API. Fill it like this:'],
        ['Copy your keys here', 'In App Management press Management next to your app. Copy the App Key and App Secret into the box above, with your Tracking ID.'],
      ].map(([title, text], index) => <div className="guide-step" key={title}><StepNumber number={index + 1} /><div><h3>{title}</h3><p>{text}</p>{index === 2 && <div className="copy-field-list">{[['APP NAME', 'AlphaPost'], ['CALLBACK URL', 'https://app.alphapost.io/api/social/aliexpress'], ['APP DESCRIPTION', 'AlphaPost shares AliExpress products with my affiliate tracking link on my own Pinterest boards and social media pages.'], ['APP LOGO', 'alphapost-logo.png']].map(([label, value]) => <div key={label}><label>{label}</label><span>{value}</span><Button size="sm" onClick={() => label === 'APP LOGO' ? downloadText('alphapost-logo.svg', '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="16" fill="%23ffd62e"/><text x="18" y="48" font-size="48">α</text></svg>', 'image/svg+xml') : copy(value)} icon={label === 'APP LOGO' ? <Download size={13} /> : <Copy size={13} />}>{label === 'APP LOGO' ? 'Download' : 'Copy'}</Button></div>)}</div>}{index === 3 && <Button onClick={() => setModal('keys')} icon={<Link2 size={15} />}>Add my keys</Button>}</div></div>)}
      <p className="legal-note">AliExpress pays the commission straight to you. AlphaPost never touches your money and never sees your AliExpress password.</p>
    </Card>
    <Modal open={modal === 'keys'} onClose={() => setModal(null)} title="Connect AliExpress"><form className="modal-form" onSubmit={saveKeys}><p>Paste the values from your AliExpress Affiliates API app. This demo does not transmit them to a server.</p><Field label="App key"><input value={key} onChange={(event) => setKey(event.target.value)} /></Field><Field label="App secret"><input type="password" value={secret} onChange={(event) => setSecret(event.target.value)} /></Field><Field label="Tracking ID"><input value={tracking} onChange={(event) => setTracking(event.target.value)} /></Field><Button type="submit" size="lg">Save and check keys</Button></form></Modal>
    <Modal open={modal === 'automation'} onClose={() => setModal(null)} title="New pin automation"><form className="modal-form" onSubmit={createAutomation}><Field label="Automation name"><input value={name} onChange={(event) => setName(event.target.value)} placeholder="Home office finds" /></Field><Field label="What products should we find?"><textarea value={topic} onChange={(event) => setTopic(event.target.value)} placeholder="Desk accessories, warm lighting and useful workspace gadgets" /></Field><Button type="submit" size="lg">Start pinning</Button></form></Modal>
  </div>
}
