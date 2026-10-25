import { useState } from 'react'
import { Check, Edit3, Pause, Play, Sparkles, Trash2 } from 'lucide-react'
import type { Automation } from '../types'
import { useApp } from '../context/AppContext'
import { Button, Card } from './UI'
import PlatformIcon from './PlatformIcon'

export default function AutomationCard({ automation }: { automation: Automation }) {
  const { toggleAutomation, deleteAutomation, updateAutomation, addPost, notify } = useApp()
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(automation.name)
  const [detail, setDetail] = useState(automation.detail)

  const runNow = () => {
    addPost({ text: automation.kind === 'blogger' ? `A new article from ${automation.name} is ready to read.` : automation.kind === 'website' ? `Just published on ${automation.name}. Take a look and let us know what you think.` : `A fresh idea from ${automation.name}: useful, simple and made for you.`, platforms: automation.platforms, status: 'sent' })
    notify(`${automation.name} ran successfully.`)
  }

  return <Card className={`automation-card ${!automation.active ? 'is-paused' : ''}`}>
    <div className="automation-top"><PlatformIcon platform={automation.platforms[0] || 'Pinterest'} size="lg" /><div className="automation-title">{editing ? <input value={name} onChange={(event) => setName(event.target.value)} /> : <h3>{automation.name}</h3>}<span className={`status-label ${automation.active ? 'on' : ''}`}>{automation.active ? 'On' : 'Paused'}</span></div><div className="automation-actions"><Button size="sm" onClick={runNow} icon={<Play size={13} />}>{automation.kind === 'blogger' ? 'Write one now' : automation.kind === 'pinterest' ? 'Pin one now' : 'Post one now'}</Button><Button size="sm" variant="secondary" onClick={() => { if (editing) { updateAutomation(automation.id, { name, detail }); notify('Automation updated.') } setEditing(!editing) }} icon={editing ? <Check size={13} /> : <Edit3 size={13} />}>{editing ? 'Save' : 'Edit'}</Button><Button size="sm" variant="secondary" onClick={() => { toggleAutomation(automation.id); notify(automation.active ? 'Automation paused.' : 'Automation is running.', 'info') }} icon={automation.active ? <Pause size={13} /> : <Play size={13} />}>{automation.active ? 'Pause' : 'Resume'}</Button><Button size="sm" variant="danger" onClick={() => { deleteAutomation(automation.id); notify('Automation deleted.', 'info') }} icon={<Trash2 size={13} />}>Delete</Button></div></div>
    <div className="automation-detail">{editing ? <textarea value={detail} onChange={(event) => setDetail(event.target.value)} /> : <><p>{automation.detail}</p><div className="automation-meta"><span><Sparkles size={13} /> AI captions enabled</span><span>Created {new Date(automation.createdAt).toLocaleDateString()}</span></div></>}</div>
  </Card>
}
