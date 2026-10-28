import { useState, type FormEvent } from 'react'
import { CheckCircle2, Link2, LockKeyhole, Plus, Send, Trash2 } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { useAuth } from '../context/AuthContext'
import AccountCards from '../components/AccountCards'
import PlatformIcon from '../components/PlatformIcon'
import { Button, Card, Field, Modal, PageHeader } from '../components/UI'
import type { Platform } from '../types'
import { connectTelegramAccount } from '../services/telegram'

export default function Accounts() {
  const { accounts, addAccount, removeAccount, notify } = useApp()
  const { session } = useAuth()
  const [platform, setPlatform] = useState<Platform | null>(null)
  const [handle, setHandle] = useState('')
  const [name, setName] = useState('')
  const [botToken, setBotToken] = useState('')
  const [chatId, setChatId] = useState('')
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState('')

  const openConnect = (selected: Platform) => {
    setPlatform(selected)
    setHandle('')
    setName('')
    setBotToken('')
    setChatId('')
    setError('')
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!platform) return
    setError('')
    if (platform === 'Telegram') {
      if (!session?.access_token) return setError('Sign in again before connecting Telegram.')
      if (!botToken.trim() || !chatId.trim()) return setError('Enter both your bot token and chat ID.')
      setConnecting(true)
      try {
        const account = await connectTelegramAccount(session.access_token, botToken.trim(), chatId.trim(), name.trim())
        addAccount(account)
        setBotToken('')
        setPlatform(null)
        notify(`Telegram connected to ${account.name}. You can publish to it now.`)
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : 'Telegram could not be connected.')
      } finally {
        setConnecting(false)
      }
      return
    }
    if (!handle.trim()) return setError('Enter a username or handle.')
    addAccount({ platform, handle: handle.startsWith('@') ? handle : `@${handle}`, name: name.trim() || handle.replace('@', ''), connectionType: 'local' })
    notify(`${platform} draft profile saved.`)
    setPlatform(null)
  }

  return <div>
    <PageHeader title="Accounts" subtitle="Connect Telegram for real publishing, or save local profiles for your drafts." action={<Button icon={<Plus size={16} />} onClick={() => openConnect('Telegram')}>Connect Telegram</Button>} />
    <AccountCards accounts={accounts} onAdd={openConnect} />
    <Card className="all-accounts-card" title="All your accounts" action={<span className="count-pill">{accounts.length}</span>}>
      {accounts.length ? <div className="connected-account-list">{accounts.map((account) => <div className="connected-account" key={account.id}><PlatformIcon platform={account.platform} size="sm" /><div><strong>{account.handle}</strong><small>{account.name} · {account.platform}{account.botUsername ? ` · @${account.botUsername}` : ''}</small></div><span className={`working-badge ${account.connectionType === 'telegram' ? '' : 'local-profile-badge'}`}>{account.connectionType === 'telegram' ? <><CheckCircle2 size={13} /> Connected</> : <><Link2 size={13} /> Draft profile</>}</span><button className="icon-button subtle-danger" onClick={async () => { const removed = await removeAccount(account.id); if (removed) notify(account.connectionType === 'telegram' ? 'Telegram disconnected and its encrypted token was deleted.' : 'Local profile removed.', 'info') }} aria-label={`Remove ${account.handle}`}><Trash2 size={15} /></button></div>)}</div> : <div className="inline-empty">No accounts or draft profiles yet.</div>}
    </Card>
    <Modal open={!!platform} onClose={() => { if (!connecting) setPlatform(null) }} title={platform === 'Telegram' ? 'Connect Telegram' : `Add ${platform || ''} profile`}>
      <form onSubmit={submit} className="modal-form">
        <div className="modal-platform-intro">{platform && <PlatformIcon platform={platform} size="lg" />}<p>{platform === 'Telegram' ? 'Use your own Telegram bot. We validate the bot and chat before saving an encrypted connection.' : `Save your ${platform} display details for drafting. OAuth publishing is not connected for this platform.`}</p></div>
        <Field label="Display name (optional)"><input value={name} onChange={(event) => setName(event.target.value)} placeholder={platform === 'Telegram' ? 'My news channel' : 'My creator account'} /></Field>
        {platform === 'Telegram' ? <>
          <Field label="Bot token" hint="Create a bot with @BotFather, then copy its token."><input type="password" value={botToken} onChange={(event) => setBotToken(event.target.value)} autoComplete="off" placeholder="123456789:AA…" /></Field>
          <Field label="Channel or group chat ID" hint="Add the bot to your chat first. Use a public @channel name or the numeric group/channel ID."><input value={chatId} onChange={(event) => setChatId(event.target.value)} placeholder="@mychannel or -100…" /></Field>
          <label className="demo-note"><LockKeyhole size={16} /> The token is sent over HTTPS, encrypted on the server, and never saved in this browser.</label>
          <a className="telegram-setup-link" href="https://t.me/BotFather" target="_blank" rel="noreferrer"><Send size={14} /> Open BotFather in Telegram</a>
        </> : <>
          <Field label="Username or handle" hint="This is a draft destination only; no password is requested."><input required value={handle} onChange={(event) => setHandle(event.target.value)} placeholder="@yourhandle" /></Field>
          <label className="demo-note"><Link2 size={16} /> No password is requested or stored.</label>
        </>}
        {error && <div className="form-error">{error}</div>}
        <Button type="submit" size="lg" disabled={connecting}>{connecting ? 'Validating with Telegram…' : platform === 'Telegram' ? 'Validate and connect' : 'Save local profile'}</Button>
      </form>
    </Modal>
  </div>
}
