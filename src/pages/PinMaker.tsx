import { useRef, useState } from 'react'
import { CalendarClock, Check, Download, Image as ImageIcon, Pin, Plus, Send, Upload, X } from 'lucide-react'
import { useApp } from '../context/AppContext'
import PlatformIcon from '../components/PlatformIcon'
import { Button, Card, Field, PageHeader } from '../components/UI'
import { makeId } from '../hooks/useLocalStorage'
import { readFileAsDataUrl } from '../utils'

interface Product { id: string; title: string; subtitle: string; link: string; description: string; image: string }
const blankProduct = (): Product => ({ id: makeId('product'), title: 'Soft Cotton Summer Dress', subtitle: 'Light, easy to wash, under 20 dollars', link: '', description: '', image: '' })
const palettes = [{ name: 'Amber', value: '#f5b900', text: '#211b08', pale: '#fff6ce' }, { name: 'Rose', value: '#e95b86', text: '#fff', pale: '#ffe8ef' }, { name: 'Sky', value: '#3296d8', text: '#fff', pale: '#e2f3ff' }, { name: 'Mint', value: '#34a47c', text: '#fff', pale: '#def7ed' }, { name: 'Flame', value: '#e85d2a', text: '#fff', pale: '#ffeadf' }, { name: 'Black', value: '#25231f', text: '#fff', pale: '#e9e7e2' }]
const styles = ['Card', 'Photo', 'Overlay', 'Slant', 'Sticker', 'Edge']

export default function PinMaker() {
  const { accounts, addPost, notify } = useApp()
  const [products, setProducts] = useState<Product[]>([blankProduct()])
  const [active, setActive] = useState(0)
  const [style, setStyle] = useState('Card')
  const [palette, setPalette] = useState(0)
  const [font, setFont] = useState('Poppins')
  const [footer, setFooter] = useState('')
  const [account, setAccount] = useState(accounts.find((item) => item.platform === 'Pinterest')?.id || '')
  const [when, setWhen] = useState<'now' | 'later'>('now')
  const [schedule, setSchedule] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const product = products[active]
  const color = palettes[palette]
  const update = (key: keyof Product, value: string) => setProducts((items) => items.map((item, index) => index === active ? { ...item, [key]: value } : item))

  const upload = async (file?: File) => { if (file) update('image', await readFileAsDataUrl(file)) }
  const publish = () => {
    if (!product.image) return notify('Add a product picture to start.', 'error')
    if (!account) return notify('Connect and choose a Pinterest account first.', 'error')
    addPost({ text: `${product.title}\n${product.subtitle}\n${product.description}${product.link ? `\n${product.link}` : ''}`, platforms: ['Pinterest'], status: when === 'now' ? 'sent' : 'scheduled', scheduledAt: when === 'later' && schedule ? new Date(schedule).toISOString() : undefined, image: product.image })
    notify(when === 'now' ? 'Your pin was published.' : 'Your pin is scheduled.')
  }
  const download = async () => {
    if (!product.image) return notify('Add a product picture before downloading.', 'error')
    const canvas = document.createElement('canvas')
    canvas.width = 1000; canvas.height = 1500
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = color.value; ctx.fillRect(0, 0, 1000, 1500)
    ctx.fillStyle = color.text; ctx.textAlign = 'center'; ctx.font = '800 72px Nunito, sans-serif'
    const words = product.title.split(' '); let line = ''; let y = 110
    for (const word of words) { if (ctx.measureText(line + word).width > 850) { ctx.fillText(line.trim(), 500, y); y += 82; line = '' } line += `${word} ` }
    ctx.fillText(line.trim(), 500, y)
    const image = new Image(); image.src = product.image
    await new Promise((resolve) => { image.onload = resolve; image.onerror = resolve })
    const top = y + 55; const height = 1500 - top - 190
    ctx.fillStyle = color.pale; ctx.beginPath(); ctx.roundRect(80, top, 840, height, 24); ctx.fill()
    if (image.width) { const scale = Math.max(800 / image.width, (height - 40) / image.height); const width = image.width * scale; const h = image.height * scale; ctx.save(); ctx.beginPath(); ctx.roundRect(100, top + 20, 800, height - 40, 18); ctx.clip(); ctx.drawImage(image, 500 - width / 2, top + 20 + (height - 40 - h) / 2, width, h); ctx.restore() }
    ctx.fillStyle = color.text; ctx.font = '700 35px Nunito, sans-serif'; ctx.fillText(product.subtitle.slice(0, 60), 500, 1435)
    const link = document.createElement('a'); link.href = canvas.toDataURL('image/png'); link.download = `${product.title.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'alphapost-pin'}.png`; link.click()
    notify('Your 1000 × 1500 pin was downloaded.')
  }

  return <div className="pin-maker-page">
    <PageHeader title="Pin Maker" subtitle="Paste a product picture, add your link, and AlphaPost makes a tall Pinterest pin. Pinterest shows 1000 by 1500 pins best." />
    <Card className="pin-designer-card">
      <span className="eyebrow">Your pin</span>
      <div className={`pin-canvas pin-style-${style.toLowerCase()}`} style={{ background: color.value, color: color.text, fontFamily: font }}><h2>{product.title || 'Your product title'}</h2><div className="pin-image-area" style={{ background: color.pale }}>{product.image ? <img src={product.image} alt={product.title} /> : <ImageIcon size={64} />}</div><p>{product.subtitle}</p>{footer && <small>{footer}</small>}</div>
      <span className="eyebrow">Style</span><div className="pin-style-grid">{styles.map((item) => <button className={style === item ? 'selected' : ''} key={item} onClick={() => setStyle(item)}><div className={`mini-pin mini-pin-${item.toLowerCase()}`} style={{ background: item === 'Photo' || item === 'Sticker' ? color.pale : item === 'Overlay' ? '#292721' : color.value, color: item === 'Photo' || item === 'Sticker' ? '#221f18' : color.text }}><strong>{product.title}</strong><span /></div><span>{item}</span></button>)}</div>
      <span className="eyebrow">Colour</span><div className="pill-choices">{palettes.map((item, index) => <button key={item.name} className={palette === index ? 'active' : ''} onClick={() => setPalette(index)}><i style={{ background: item.value }} />{item.name}</button>)}</div>
      <Field label="Font"><select value={font} onChange={(event) => setFont(event.target.value)}>{['Poppins', 'Nunito', 'Montserrat', 'Oswald', 'Playfair Display'].map((item) => <option key={item}>{item}</option>)}</select></Field>
      <Field label="Your name at the bottom" hint="Shows small at the bottom of every pin. Leave it empty for none."><input value={footer} onChange={(event) => setFooter(event.target.value)} placeholder="yoursite.com" /></Field>
    </Card>
    <Card className="products-card" title="Products" subtitle="Press the picture button on a row to choose from your gallery." action={<span className="count-pill">{products.length} of 20</span>}>
      <div className="product-tabs">{products.map((item, index) => <button className={active === index ? 'active' : ''} key={item.id} onClick={() => setActive(index)}><Pin size={14} /> Product {index + 1}{products.length > 1 && <X size={13} onClick={(event) => { event.stopPropagation(); setProducts((items) => items.filter((_, itemIndex) => itemIndex !== index)); setActive(0) }} />}</button>)}</div>
      <div className="product-form"><button className="product-image-upload" onClick={() => inputRef.current?.click()}>{product.image ? <img src={product.image} alt="Product" /> : <><Upload /><span>Add picture</span></>}</button><input ref={inputRef} type="file" hidden accept="image/*" onChange={(event) => upload(event.target.files?.[0])} /><div><Field label="Product link"><input type="url" value={product.link} onChange={(event) => update('link', event.target.value)} placeholder="https://" /></Field><Field label="Title (the AI writes this)"><input value={product.title} onChange={(event) => update('title', event.target.value)} /></Field><Field label="Small line under the picture"><input value={product.subtitle} onChange={(event) => update('subtitle', event.target.value)} /></Field><Field label="Description and tags"><textarea value={product.description} onChange={(event) => update('description', event.target.value)} /></Field></div></div>
      <div className="product-actions"><Button variant="secondary" size="sm" icon={<Plus size={14} />} onClick={() => { if (products.length >= 20) return; const item = { ...blankProduct(), title: '', subtitle: '' }; setProducts((items) => [...items, item]); setActive(products.length) }}>Add another product</Button><Button variant="secondary" size="sm" icon={<Download size={14} />} onClick={download}>Download PNG</Button></div>
    </Card>
    <Card className="pin-publish-card" title="Pin to"><div className="account-selector">{accounts.filter((item) => item.platform === 'Pinterest').map((item) => <button key={item.id} className={account === item.id ? 'selected' : ''} onClick={() => setAccount(item.id)}><PlatformIcon platform="Pinterest" size="sm" /><span>{item.handle}</span>{account === item.id && <Check size={15} />}</button>)}</div><span className="field-label">When</span><div className="segmented-control"><button className={when === 'now' ? 'active' : ''} onClick={() => setWhen('now')}><Send size={14} /> Send now</button><button className={when === 'later' ? 'active' : ''} onClick={() => setWhen('later')}><CalendarClock size={14} /> Pick a time</button></div>{when === 'later' && <input type="datetime-local" value={schedule} onChange={(event) => setSchedule(event.target.value)} />}<Button size="lg" onClick={publish}><Pin size={17} />{product.image ? when === 'now' ? 'Publish pin' : 'Schedule pin' : 'Add a product picture to start'}</Button></Card>
  </div>
}
