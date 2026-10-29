import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { CheckCircle2, Link2, LockKeyhole, Plus, Send, Trash2 } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { useAuth } from '../context/AuthContext'
import AccountCards from '../components/AccountCards'
import PlatformIcon from '../components/PlatformIcon'
import { Button, Card, Field, Modal, PageHeader } from '../components/UI'
import type { Platform } from '../types'
import { connectTelegramAccount } from '../services/telegram'
import { beginXConnection } from '../services/x'
import { beginInstagramConnection } from '../services/instagram'
import { beginProviderConnection, connectDailymotionProfile, type OAuthRemoteProvider } from '../services/providers'
import { isConnectedAccount } from '../utils'

const oauthProviders: Partial<Record<Platform, OAuthRemoteProvider>> = {
  Facebook: 'facebook',
  TikTok: 'tiktok',
  YouTube: 'youtube',
  Pinterest: 'pinterest',
}

const connectionMessages: Record<string, string> = {
  x: 'X account connected. You can publish text posts to it now.',
  instagram: 'Instagram account connected. You can publish photos and Reels now.',
  facebook: 'Facebook Page connected. You can publish text, photos, and MP4 videos now.',
  tiktok: 'TikTok account connected. Review the live privacy options before publishing.',
  youtube: 'YouTube channel connected. You can upload videos now.',
  pinterest: 'Pinterest account connected. Choose a board and publish image Pins now.',
}

export default function Accounts() {
  const { accounts, addAccount, removeAccount, notify } = useApp()
  const { session } = useAuth()
  const [platform, setPlatform] = useState<Platform | null>(null)
  const [name, setName] = useState('')
  const [botToken, setBotToken] = useState('')
  const [chatId, setChatId] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [apiSecret, setApiSecret] = useState('')
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState('')
  const [pageError, setPageError] = useState('')
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const connectOAuth = async (selected: 'X' | 'Instagram' | keyof typeof oauthProviders) => {
    if (connecting) return
    setPageError('')
    if (!session?.access_token) return setPageError(`Sign in again before connecting ${selected}.`)
    setConnecting(true)
    try {
      const remote = oauthProviders[selected]
      const result = selected === 'X'
        ? await beginXConnection(session.access_token)
        : selected === 'Instagram'
          ? await beginInstagramConnection(session.access_token)
          : remote
            ? await beginProviderConnection(remote, session.access_token)
            : null
      if (!result) throw new Error(`${selected} OAuth is not available.`)
      window.location.assign(result.url)
    } catch (caught) {
      setPageError(caught instanceof Error ? caught.message : `${selected} could not be connected.`)
      setConnecting(false)
    }
  }

  useEffect(() => {
    const providers = ['x', 'instagram', 'facebook', 'tiktok', 'youtube', 'pinterest']
    let changed = false
    for (const provider of providers) {
      const connected = searchParams.get(`${provider}_connected`)
      const providerError = searchParams.get(`${provider}_error`)
      if (connected) {
        const prefix = connected === '1' ? connectionMessages[provider] : `${connected} ${provider === 'facebook' ? 'Facebook Pages' : provider === 'youtube' ? 'YouTube channels' : `${provider} accounts`} connected.`
        notify(provider === 'instagram' && connected !== '1' ? `${connected} Instagram accounts connected. You can publish photos and Reels now.` : prefix || `${provider} connected.`)
      }
      if (providerError) setPageError(providerError)
      if (connected || providerError) changed = true
    }
    if (changed) setSearchParams({}, { replace: true })
  }, [searchParams, setSearchParams, notify])

  const openConnect = (selected: Platform) => {
    if (selected === 'Blogger') {
      navigate('/app/blogger')
      return
    }
    if (selected === 'X' || selected === 'Instagram' || oauthProviders[selected]) {
      void connectOAuth(selected)
      return
    }
    setPlatform(selected)
    setName('')
    setBotToken('')
    setChatId('')
    setApiKey('')
    setApiSecret('')
    setError('')
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!platform) return
    setError('')
    if (!session?.access_token) return setError(`Sign in again before connecting ${platform}.`)
    if (platform === 'Telegram') {
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
    if (platform === 'Dailymotion') {
      if (!apiKey.trim() || !apiSecret.trim()) return setError('Enter both your private API key and secret.')
      setConnecting(true)
      try {
        const connected = await connectDailymotionProfile(session.access_token, apiKey.trim(), apiSecret.trim())
        connected.forEach((account) => addAccount(account))
        setApiKey('')
        setApiSecret('')
        setPlatform(null)
        notify(`${connected.length === 1 ? 'Dailymotion profile' : `${connected.length} Dailymotion profiles`} connected. You can upload videos now.`)
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : 'Dailymotion could not be connected.')
      } finally {
        setConnecting(false)
      }
    }
  }

  return <div>
    <PageHeader title="Accounts" subtitle="Connect your provider accounts for real publishing. Blogger has its own article setup page." action={<Button icon={<Plus size={16} />} onClick={() => openConnect('Telegram')}>Connect Telegram</Button>} />
    <AccountCards accounts={accounts} onAdd={openConnect} />
    {pageError && <div className="form-error">{pageError}</div>}
    <Card className="all-accounts-card" title="All your accounts" action={<span className="count-pill">{accounts.length}</span>}>
      {accounts.length ? <div className="connected-account-list">{accounts.map((account) => <div className="connected-account" key={account.id}><PlatformIcon platform={account.platform} size="sm" /><div><strong>{account.handle}</strong><small>{account.name} · {account.platform}{account.botUsername ? ` · @${account.botUsername}` : ''}</small></div><span className={`working-badge ${!isConnectedAccount(account) ? 'local-profile-badge' : ''}`}>{isConnectedAccount(account) ? <><CheckCircle2 size={13} /> Connected</> : <><Link2 size={13} /> Draft profile</>}</span><button className="icon-button subtle-danger" onClick={async () => { const removed = await removeAccount(account.id); if (removed) notify(!isConnectedAccount(account) ? 'Local profile removed.' : `${account.platform} disconnected and its encrypted credential was deleted.`, 'info') }} aria-label={`Remove ${account.handle}`}><Trash2 size={15} /></button></div>)}</div> : <div className="inline-empty">No accounts or draft profiles yet.</div>}
    </Card>
    <Modal open={!!platform} onClose={() => { if (!connecting) setPlatform(null) }} title={platform === 'Telegram' ? 'Connect Telegram' : 'Connect Dailymotion'}>
      <form onSubmit={submit} className="modal-form">
        <div className="modal-platform-intro">{platform && <PlatformIcon platform={platform} size="lg" />}<p>{platform === 'Telegram' ? 'Use your own Telegram bot. We validate the bot and chat before saving an encrypted connection.' : 'Use a Dailymotion API v2 private key. We validate it, discover manageable profiles, and encrypt both the key and secret on the server.'}</p></div>
        {platform === 'Telegram' ? <>
          <Field label="Display name (optional)"><input value={name} onChange={(event) => setName(event.target.value)} placeholder="My news channel" /></Field>
          <Field label="Bot token" hint="Create a bot with @BotFather, then copy its token."><input type="password" value={botToken} onChange={(event) => setBotToken(event.target.value)} autoComplete="off" placeholder="123456789:AA…" /></Field>
          <Field label="Channel or group chat ID" hint="Add the bot to your chat first. Use a public @channel name or the numeric group/channel ID."><input value={chatId} onChange={(event) => setChatId(event.target.value)} placeholder="@mychannel or -100…" /></Field>
          <label className="demo-note"><LockKeyhole size={16} /> The token is sent over HTTPS, encrypted on the server, and never saved in this browser.</label>
          <a className="telegram-setup-link" href="https://t.me/BotFather" target="_blank" rel="noreferrer"><Send size={14} /> Open BotFather in Telegram</a>
        </> : <>
          <Field label="Private API key" hint="Dailymotion Studio → Settings → Account → API keys. Enable account.read, profile.read, and video.manage."><input type="password" value={apiKey} onChange={(event) => setApiKey(event.target.value)} autoComplete="off" required /></Field>
          <Field label="Private API secret" hint="Dailymotion shows this secret only once when the key is created."><input type="password" value={apiSecret} onChange={(event) => setApiSecret(event.target.value)} autoComplete="off" required /></Field>
          <label className="demo-note"><LockKeyhole size={16} /> Credentials are sent over HTTPS, validated with Dailymotion, encrypted with AES-256-GCM, and never saved in this browser.</label>
          <a className="telegram-setup-link" href="https://www.dailymotion.com/partner/api-keys/" target="_blank" rel="noreferrer"><Link2 size={14} /> Open Dailymotion API keys</a>
        </>}
        {error && <div className="form-error">{error}</div>}
        <Button type="submit" size="lg" disabled={connecting}>{connecting ? `Validating with ${platform}…` : 'Validate and connect'}</Button>
      </form>
    </Modal>
  </div>
}
