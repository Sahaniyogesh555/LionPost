import { useState, type FormEvent } from 'react'
import { CheckCircle2, Link2, Plus, Trash2 } from 'lucide-react'
import { useApp } from '../context/AppContext'
import AccountCards from '../components/AccountCards'
import PlatformIcon from '../components/PlatformIcon'
import { Button, Card, Field, Modal, PageHeader } from '../components/UI'
import type { Platform } from '../types'

export default function Accounts() {
  const { accounts, addAccount, removeAccount, notify } = useApp()
  const [platform, setPlatform] = useState<Platform | null>(null)
  const [handle, setHandle] = useState('')
  const [name, setName] = useState('')

  const openConnect = (selected: Platform) => {
    setPlatform(selected)
    setHandle('')
    setName('')
  }
  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!platform || !handle.trim()) return
    addAccount({ platform, handle: handle.startsWith('@') ? handle : `@${handle}`, name: name.trim() || handle.replace('@', '') })
    notify(`${platform} account connected.`)
    setPlatform(null)
  }

  return <div>
    <PageHeader title="Accounts" subtitle="Pick a platform to add it. You can add up to 3 accounts on each one." action={<Button icon={<Plus size={16} />} onClick={() => openConnect('Instagram')}>Add account</Button>} />
    <AccountCards accounts={accounts} onAdd={openConnect} />
    <Card className="all-accounts-card" title="All your accounts" action={<span className="count-pill">{accounts.length}</span>}>
      {accounts.length ? <div className="connected-account-list">{accounts.map((account) => <div className="connected-account" key={account.id}><PlatformIcon platform={account.platform} size="sm" /><div><strong>{account.handle}</strong><small>{account.name} · {account.platform}</small></div><span className="working-badge"><CheckCircle2 size={13} /> Working</span><button className="icon-button subtle-danger" onClick={() => { removeAccount(account.id); notify('Account disconnected.', 'info') }} aria-label={`Remove ${account.handle}`}><Trash2 size={15} /></button></div>)}</div> : <div className="inline-empty">No accounts connected yet.</div>}
    </Card>
    <Modal open={!!platform} onClose={() => setPlatform(null)} title={`Connect ${platform || ''}`}>
      <form onSubmit={submit} className="modal-form">
        <div className="modal-platform-intro">{platform && <PlatformIcon platform={platform} size="lg" />}<p>Add your {platform} account details. In this demo, your connection is saved only in this browser.</p></div>
        <Field label="Display name"><input value={name} onChange={(event) => setName(event.target.value)} placeholder="My creator account" /></Field>
        <Field label="Username or handle" hint="You can connect up to three accounts per platform."><input required value={handle} onChange={(event) => setHandle(event.target.value)} placeholder="@yourhandle" /></Field>
        <label className="demo-note"><Link2 size={16} /> No password is requested or stored.</label>
        <Button type="submit" size="lg">Connect account</Button>
      </form>
    </Modal>
  </div>
}
