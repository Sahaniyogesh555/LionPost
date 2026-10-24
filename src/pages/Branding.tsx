import { useState } from 'react'
import { Check, Image as ImageIcon, Save } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { Button, Card, CheckBox, Field, PageHeader, Toggle } from '../components/UI'

interface BrandingSettings {
  everyAuto: boolean
  ownPhotos: boolean
  showName: boolean
  bottomText: string
  color: string
  barColor: string
  textColor: string
  font: string
  look: string
  headline: boolean
}
const defaults: BrandingSettings = { everyAuto: true, ownPhotos: true, showName: true, bottomText: 'For more content, Like and Share', color: 'yellow', barColor: '#ffd62e', textColor: '#171710', font: 'Nunito', look: '3D', headline: false }
const colors = [{ name: 'yellow', value: '#ffd62e', text: '#171710' }, { name: 'white', value: '#ffffff', text: '#171710' }, { name: 'black', value: '#171717', text: '#ffffff' }, { name: 'red', value: '#f43f5e', text: '#ffffff' }, { name: 'blue', value: '#2387ee', text: '#ffffff' }, { name: 'green', value: '#10b981', text: '#ffffff' }, { name: 'pink', value: '#ec4899', text: '#ffffff' }, { name: 'orange', value: '#f97316', text: '#ffffff' }]

export default function Branding() {
  const [saved, setSaved] = useLocalStorage<BrandingSettings>('alphapost-branding', defaults)
  const [settings, setSettings] = useState(saved)
  const [account, setAccount] = useState('Pinterest: @PinCraftSocial')
  const { accounts, notify } = useApp()
  const update = <K extends keyof BrandingSettings>(key: K, value: BrandingSettings[K]) => setSettings((current) => ({ ...current, [key]: value }))
  const save = () => { setSaved(settings); notify('Your branding is saved.') }

  return <div className="branding-page">
    <PageHeader title="Branding" subtitle="Each account's own name and a “Like and Share” bar on every picture you post." icon={<ImageIcon />} />
    <div className="branding-layout">
      <Card className="branding-controls">
        <span className="eyebrow">WHERE</span>
        <CheckBox checked={settings.everyAuto} onChange={(value) => update('everyAuto', value)} label={<span>On every auto post picture <small>Real photos and our design cards from AI and website auto posts.</small></span>} />
        <CheckBox checked={settings.ownPhotos} onChange={(value) => update('ownPhotos', value)} label={<span>Offer it on my own photos <small>New post shows a tick to add it to the photo you upload.</small></span>} />
        <span className="eyebrow">TEXT</span>
        <CheckBox checked={settings.showName} onChange={(value) => update('showName', value)} label={<span>Show the account name at the top <small>Each account shows its own name, your Telegram channel name or Facebook Page name.</small></span>} />
        <p className="helper-text">Want a different name on some accounts? Tick them and write it.</p>
        <div className="branding-account-list">{accounts.map((item) => <div key={item.id}><span className="platform-dot" /> <strong>{item.handle}</strong><small>{item.platform} · shows “{item.handle.replace('@', '')}”</small></div>)}</div>
        <Field label="Text at the bottom" hint="Default: For more content, Like and Share"><input value={settings.bottomText} onChange={(event) => update('bottomText', event.target.value)} /></Field>
        <span className="eyebrow">COLOUR</span>
        <div className="color-swatches">{colors.map((color) => <button key={color.name} className={settings.color === color.name ? 'selected' : ''} style={{ background: color.value, color: color.text }} onClick={() => { update('color', color.name); update('barColor', color.value); update('textColor', color.text) }}>Aa{settings.color === color.name && <Check size={12} />}</button>)}</div>
        <Field label="Bar colour"><input type="color" value={settings.barColor} onChange={(event) => update('barColor', event.target.value)} /></Field>
        <Field label="Text colour"><input type="color" value={settings.textColor} onChange={(event) => update('textColor', event.target.value)} /></Field>
        <span className="eyebrow">FONT</span>
        <div className="font-choices">{['Nunito', 'Poppins', 'Montserrat', 'Oswald', 'Bebas Neue', 'Playfair Display', 'Roboto Slab', 'Baloo 2', 'Lobster'].map((font) => <button className={settings.font === font ? 'selected' : ''} key={font} onClick={() => update('font', font)}>{font}</button>)}</div>
        <span className="eyebrow">LOOK</span><div className="segmented-control small"><button className={settings.look === '3D' ? 'active' : ''} onClick={() => update('look', '3D')}>3D</button><button className={settings.look === 'Normal' ? 'active' : ''} onClick={() => update('look', 'Normal')}>Normal</button></div>
        <div className="news-look"><span className="eyebrow">NEWS LOOK</span><h3>Put the headline on the photo</h3><p>Takes the hook from your post text and writes it big under the photo.</p><Toggle checked={settings.headline} onChange={(value) => update('headline', value)} /></div>
      </Card>
      <div className="branding-preview-column"><Card title="Preview for"><Field><select value={account} onChange={(event) => setAccount(event.target.value)}>{accounts.map((item) => <option key={item.id}>{item.platform}: {item.handle}</option>)}</select></Field><span className="eyebrow">ON A REAL PHOTO</span><div className="brand-photo-preview"><img src="/assets/workspace.jpg" alt="Branding preview" />{settings.showName && <span className="preview-name" style={{ background: settings.barColor, color: settings.textColor }}>{account.split(': ')[1] || '@youraccount'}</span>}<span className="preview-bar" style={{ background: settings.barColor, color: settings.textColor, fontFamily: settings.font }}>{settings.bottomText}</span></div><span className="eyebrow">ON A DESIGN CARD</span><div className="brand-design-preview" style={{ fontFamily: settings.font }}><span className="design-name" style={{ background: settings.barColor, color: settings.textColor }}>{account.split(': ')[1] || '@youraccount'}</span><div><small>CREATOR NOTES</small><h3>Five easy ways to grow your page this week</h3></div><span className="preview-bar" style={{ background: settings.barColor, color: settings.textColor }}>{settings.bottomText}</span></div></Card><Button size="lg" icon={<Save size={17} />} onClick={save}>Save branding</Button></div>
    </div>
  </div>
}
