import { useEffect, useState, type FormEvent } from 'react'
import { CheckCircle2, KeyRound, LockKeyhole, Plus, RefreshCw, ShieldCheck, Sparkles, Trash2 } from 'lucide-react'
import { Button, Card, EmptyState, Field, PageHeader } from '../components/UI'
import { useLocalStorage, makeId } from '../hooks/useLocalStorage'
import { useApp } from '../context/AppContext'
import { getSessionGeminiKey, removeSessionGeminiKey, saveSessionGeminiKey, validateGeminiKey, type GeminiModel } from '../services/gemini'

interface GeminiKey {
  id: string
  mask: string
  added: string
  usage: number
  models?: GeminiModel[]
}

const legacyDemoKeyIds = new Set(['key-1', 'key-2', 'key-3'])

export default function Gemini() {
  const [keys, setKeys] = useLocalStorage<GeminiKey[]>('alphapost-gemini-keys', [])
  const [input, setInput] = useState('')
  const [checking, setChecking] = useState('')
  const [adding, setAdding] = useState(false)
  const [formError, setFormError] = useState('')
  const { notify } = useApp()

  useEffect(() => {
    setKeys((items) => {
      const filtered = items.filter((item) => !legacyDemoKeyIds.has(item.id))
      return filtered.length === items.length ? items : filtered
    })
  }, [setKeys])

  const addKeys = async (event: FormEvent) => {
    event.preventDefault()
    setFormError('')
    const rawKeys = [...new Set(input.split('\n').map((key) => key.trim()).filter(Boolean))]
    if (!rawKeys.length) return setFormError('Paste at least one API key first.')
    if (rawKeys.some((key) => key.length < 12)) return setFormError('One of those keys looks too short. Please check it.')
    if (keys.length + rawKeys.length > 10) return setFormError('You can save up to 10 keys. Remove one before adding another.')
    setAdding(true)
    const additions: GeminiKey[] = []
    const invalid: string[] = []
    const errors: string[] = []
    for (const rawKey of rawKeys) {
      try {
        const models = await validateGeminiKey(rawKey)
        const id = makeId('key')
        saveSessionGeminiKey(id, rawKey)
        additions.push({ id, mask: `${rawKey.slice(0, 4)}…${rawKey.slice(-4)}`, added: new Date().toISOString(), usage: 0, models })
      } catch (error) {
        invalid.push(rawKey)
        errors.push(error instanceof Error ? error.message : 'A key could not be validated.')
      }
    }
    if (additions.length) setKeys((items) => [...additions, ...items])
    setInput(invalid.join('\n'))
    setAdding(false)
    if (additions.length) notify(`${additions.length} Gemini ${additions.length === 1 ? 'key' : 'keys'} validated with Google and added.`)
    if (invalid.length) setFormError(`${invalid.length} ${invalid.length === 1 ? 'key was' : 'keys were'} not added. ${errors[0]}`)
  }

  const checkModels = async (id: string) => {
    const rawKey = getSessionGeminiKey(id)
    if (!rawKey) return notify('This key is not available in the current tab session. Remove it and add it again to reconnect.', 'error')
    setChecking(id)
    try {
      const models = await validateGeminiKey(rawKey)
      setKeys((items) => items.map((item) => item.id === id ? { ...item, models } : item))
      notify(`${models.length} Gemini models are available for this key.`)
    } catch (error) {
      notify(error instanceof Error ? error.message : 'The key could not be checked.', 'error')
    } finally {
      setChecking('')
    }
  }

  return <div className="gemini-page">
    <PageHeader title="Gemini" subtitle="Connect your own Google Gemini key for live AI writing." icon={<Sparkles />} action={<span className="count-pill">{keys.length} of 10 keys</span>} />
    <div className="gemini-top-grid">
      <Card title="Add your keys">
        <form onSubmit={addKeys}>
          <Field label="Gemini API keys" hint="Each key is validated with Google before it is saved. Paste several on separate lines."><textarea className="key-textarea" value={input} onChange={(event) => setInput(event.target.value)} placeholder="Paste one key on each line&#10;AIza…&#10;AIza…" /></Field>
          {formError && <div className="form-error">{formError}</div>}
          <Button type="submit" icon={<Plus size={16} />} disabled={adding}>{adding ? <><span className="spinner" /> Validating with Google…</> : 'Validate and add keys'}</Button>
        </form>
        <div className="get-key-steps"><span className="eyebrow">GET A FREE KEY</span><ol><li><span>1</span><p>Open <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer">aistudio.google.com/apikey</a> and sign in with a Google account.</p></li><li><span>2</span><p>Press Create API key and copy it.</p></li><li><span>3</span><p>Paste it above. More keys from other Google accounts give you more free posts a day.</p></li></ol></div>
      </Card>
      <div className="gemini-info-column">
        <Card title="How your keys are used"><ul className="info-list"><li><ZapIcon />The writer discovers the text models available to your key.</li><li><CheckCircle2 />If a model is unavailable or reaches a limit, the next model or key is tried.</li><li><RefreshCw />Check models again whenever your Google access changes.</li></ul></Card>
        <Card title="Session-only key storage"><ul className="info-list"><li><LockKeyhole />Raw keys are kept only in this tab’s session storage, not in persistent local storage.</li><li><ShieldCheck />Keys go directly from your browser to Google. They are not sent to an AlphaPost server.</li><li><KeyRound />Only the masked key and model list remain on this browser after the tab closes.</li><li><Trash2 />Remove a key to clear its session value and saved metadata.</li></ul></Card>
      </div>
    </div>

    {keys.length ? <div className="gemini-key-list">{keys.map((key, index) => <Card className="gemini-key-card" key={key.id}>
      <div className="gemini-key-header"><span className="key-number"><KeyRound size={17} /></span><div><h3>Key {keys.length - index} · <span>{key.mask}</span></h3><p>Added {formatAdded(key.added)}</p></div><span className="working-badge">{key.models?.length ? `${key.models.length} models ready` : 'Reconnect required'}</span></div>
      {key.models?.length ? <div className="model-grid">{key.models.map((model) => <div key={model.id}><span><i />{model.displayName}</span><small>{model.id}</small></div>)}</div> : <div className="inline-empty">Add this key again in the current tab to use it for live AI writing.</div>}
      <div className="gemini-key-actions"><Button size="sm" variant="secondary" onClick={() => checkModels(key.id)} disabled={checking === key.id} icon={<RefreshCw className={checking === key.id ? 'spin' : ''} size={14} />}>{checking === key.id ? 'Checking…' : 'Check models'}</Button><Button size="sm" variant="secondary" onClick={() => { removeSessionGeminiKey(key.id); setKeys((items) => items.filter((item) => item.id !== key.id)); notify('Gemini key removed.', 'info') }} icon={<Trash2 size={14} />}>Remove</Button></div>
    </Card>)}</div> : <Card><EmptyState icon={<KeyRound />} title="No Gemini keys yet" text="Add your own key above to enable live AI writing tools." /></Card>}
  </div>
}

function formatAdded(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString()
}

function ZapIcon() { return <Sparkles size={15} /> }
