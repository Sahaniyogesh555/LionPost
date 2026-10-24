import { useState, type FormEvent } from 'react'
import { Check, CheckCircle2, KeyRound, LockKeyhole, Plus, RefreshCw, ShieldCheck, Sparkles, Trash2 } from 'lucide-react'
import { Button, Card, Field, PageHeader } from '../components/UI'
import { useLocalStorage, makeId } from '../hooks/useLocalStorage'
import { useApp } from '../context/AppContext'

interface GeminiKey { id: string; mask: string; added: string; usage: number }
const starterKeys: GeminiKey[] = [
  { id: 'key-1', mask: 'AIza…J14Q', added: '5 days ago', usage: 7 },
  { id: 'key-2', mask: 'AIza…f1vA', added: '6 days ago', usage: 9 },
  { id: 'key-3', mask: 'AIza…wX5w', added: '4 days ago', usage: 5 },
]
const models = ['Gemini 3.7 Flash', 'Gemini 3.6 Flash', 'Gemini Flash (latest)', 'Gemini Flash Lite (latest)', 'Gemini 2.5 Flash Lite', 'Gemini 3.0 Flash', 'Gemini 3.5 Flash', 'Gemini 3.5 Flash Lite', 'Gemini 2.5 Flash']

export default function Gemini() {
  const [keys, setKeys] = useLocalStorage<GeminiKey[]>('alphapost-gemini-keys', starterKeys)
  const [input, setInput] = useState('')
  const [checking, setChecking] = useState('')
  const { notify } = useApp()

  const addKeys = (event: FormEvent) => {
    event.preventDefault()
    const rawKeys = input.split('\n').map((key) => key.trim()).filter(Boolean)
    if (!rawKeys.length) return notify('Paste at least one API key first.', 'error')
    if (rawKeys.some((key) => key.length < 12)) return notify('One of those keys looks too short. Please check it.', 'error')
    const additions = rawKeys.map((key) => ({ id: makeId('key'), mask: `${key.slice(0, 4)}…${key.slice(-4)}`, added: 'just now', usage: 0 }))
    setKeys((items) => [...additions, ...items])
    setInput('')
    notify(`${additions.length} Gemini ${additions.length === 1 ? 'key' : 'keys'} added. Only the masked key is retained in this demo.`)
  }

  const checkModels = (id: string) => {
    setChecking(id)
    window.setTimeout(() => { setChecking(''); notify('All 9 free Gemini models are ready.') }, 800)
  }

  return <div className="gemini-page">
    <PageHeader title="Gemini" subtitle="Your own free Gemini keys write your AI posts and captions." icon={<Sparkles />} action={<span className="count-pill">{keys.length} of 10 keys</span>} />
    <div className="gemini-top-grid">
      <Card title="Add your keys">
        <form onSubmit={addKeys}><Field label="Gemini API keys" hint="You can paste several at once. Each one is tested with Google before it is saved."><textarea className="key-textarea" value={input} onChange={(event) => setInput(event.target.value)} placeholder="Paste one key on each line&#10;AIza…&#10;AIza…" /></Field><Button type="submit" icon={<Plus size={16} />}>Add keys</Button></form>
        <div className="get-key-steps"><span className="eyebrow">GET A FREE KEY</span><ol><li><span>1</span><p>Open <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer">aistudio.google.com/apikey</a> and sign in with a Google account.</p></li><li><span>2</span><p>Press Create API key and copy it.</p></li><li><span>3</span><p>Paste it above. More keys from other Google accounts give you more free posts a day.</p></li></ol></div>
      </Card>
      <div className="gemini-info-column"><Card title="How your keys are used"><ul className="info-list"><li><ZapIcon />Every free model has its own daily limit. When one model is used up, the next model takes over.</li><li><CheckCircle2 />When every model on a key is used up, the next key takes over.</li><li><RefreshCw />Google resets free limits every day. Next reset: 24 Oct 2026, 12:46.</li></ul></Card><Card title="Your keys stay safe"><ul className="info-list"><li><LockKeyhole />Locked with AES 256 encryption before saving.</li><li><ShieldCheck />Never sent to your browser. You only see the first and last letters.</li><li><KeyRound />Only used to write your own posts, never shared, never shown in any message.</li><li><Trash2 />Remove a key and it is deleted at once.</li></ul></Card></div>
    </div>
    <div className="gemini-key-list">{keys.map((key, index) => <Card className="gemini-key-card" key={key.id}><div className="gemini-key-header"><span className="key-number"><KeyRound size={17} /></span><div><h3>Key {keys.length - index} · <span>{key.mask}</span></h3><p>Added {key.added} · Last used 19 h ago · {key.usage} posts written today</p></div><span className="working-badge">9 models ready</span></div><div className="model-grid">{models.map((model, modelIndex) => <div key={model}><span><i />{model}</span><small>{(key.usage + modelIndex) % 4 === 0 ? 'Ready' : `${(key.usage + modelIndex) % 3 + 1} today`}</small></div>)}</div><div className="gemini-key-actions"><Button size="sm" variant="secondary" onClick={() => checkModels(key.id)} disabled={checking === key.id} icon={<RefreshCw className={checking === key.id ? 'spin' : ''} size={14} />}>{checking === key.id ? 'Checking…' : 'Check models'}</Button><Button size="sm" variant="secondary" onClick={() => { setKeys((items) => items.filter((item) => item.id !== key.id)); notify('Gemini key removed.', 'info') }} icon={<Trash2 size={14} />}>Remove</Button></div></Card>)}</div>
  </div>
}

function ZapIcon() { return <Sparkles size={15} /> }
