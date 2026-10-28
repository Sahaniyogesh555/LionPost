import { useState } from 'react'
import { Check, Edit3, Pause, Play, RefreshCw, Sparkles, Trash2 } from 'lucide-react'
import type { Automation } from '../types'
import { useApp } from '../context/AppContext'
import { Button, Card } from './UI'
import PlatformIcon from './PlatformIcon'
import { readWebsiteFeed } from '../services/feeds'
import { generateBlogDraft, generatePinDraft, generateSocialDraft, generateWithGemini, hasSessionGeminiKeys } from '../services/gemini'

export default function AutomationCard({ automation }: { automation: Automation }) {
  const { toggleAutomation, deleteAutomation, updateAutomation, addPost, notify } = useApp()
  const [editing, setEditing] = useState(false)
  const [running, setRunning] = useState(false)
  const [name, setName] = useState(automation.name)
  const [detail, setDetail] = useState(automation.detail)

  const runNow = async () => {
    if (running) return
    setRunning(true)
    try {
      if (automation.kind === 'website') {
        if (!automation.sourceUrl) throw new Error('This automation needs a website URL. Create it again with the live feed setup.')
        const result = await readWebsiteFeed(automation.sourceUrl)
        const seen = new Set(automation.seenIds || [])
        const article = result.items.find((item) => !seen.has(item.id))
        if (!article) {
          updateAutomation(automation.id, { lastRunAt: new Date().toISOString() })
          notify(`No new articles found on ${result.title}.`, 'info')
          return
        }
        let text = `${article.title}${article.summary ? `\n\n${article.summary}` : ''}${article.link ? `\n${article.link}` : ''}`
        if (automation.aiCaption && hasSessionGeminiKeys()) {
          const caption = await generateWithGemini(`Write a short, natural social caption for this article. Include only the caption, not the link.\nTitle: ${article.title}\nArticle: ${article.summary}`, { maxOutputTokens: 260 })
          text = `${caption}${article.link ? `\n${article.link}` : ''}`
        }
        addPost({ text, platforms: automation.platforms, status: 'draft', image: article.image })
        updateAutomation(automation.id, { seenIds: [article.id, ...seen].slice(0, 500), lastRunAt: new Date().toISOString() })
        notify('New article imported as a draft for review.')
      } else {
        const topic = automation.topic || automation.name
        const text = automation.kind === 'blogger'
          ? await generateBlogDraft(topic, automation.language)
          : automation.kind === 'pinterest'
            ? await generatePinDraft(topic)
            : await generateSocialDraft(topic, automation.language)
        addPost({ text, platforms: automation.platforms, status: 'draft' })
        updateAutomation(automation.id, { lastRunAt: new Date().toISOString() })
        notify('Gemini created a new draft for review.')
      }
    } catch (error) {
      notify(error instanceof Error ? error.message : 'The automation could not run.', 'error')
    } finally {
      setRunning(false)
    }
  }

  const runLabel = automation.kind === 'website' ? 'Check now' : automation.kind === 'pinterest' ? 'Write pin draft' : 'Write draft'

  return <Card className={`automation-card ${!automation.active ? 'is-paused' : ''}`}>
    <div className="automation-top"><PlatformIcon platform={automation.platforms[0] || 'Pinterest'} size="lg" /><div className="automation-title">{editing ? <input value={name} onChange={(event) => setName(event.target.value)} /> : <h3>{automation.name}</h3>}<span className={`status-label ${automation.active ? 'on' : ''}`}>{automation.active ? 'On' : 'Paused'}</span></div><div className="automation-actions"><Button size="sm" onClick={runNow} disabled={running} icon={running ? <RefreshCw className="spin" size={13} /> : <Play size={13} />}>{running ? 'Working…' : runLabel}</Button><Button size="sm" variant="secondary" onClick={() => { if (editing) { updateAutomation(automation.id, { name, detail }); notify('Automation updated.') } setEditing(!editing) }} icon={editing ? <Check size={13} /> : <Edit3 size={13} />}>{editing ? 'Save' : 'Edit'}</Button><Button size="sm" variant="secondary" onClick={() => { toggleAutomation(automation.id); notify(automation.active ? 'Automation paused.' : 'Automation enabled for manual runs.', 'info') }} icon={automation.active ? <Pause size={13} /> : <Play size={13} />}>{automation.active ? 'Pause' : 'Resume'}</Button><Button size="sm" variant="danger" onClick={() => { deleteAutomation(automation.id); notify('Automation deleted.', 'info') }} icon={<Trash2 size={13} />}>Delete</Button></div></div>
    <div className="automation-detail">{editing ? <textarea value={detail} onChange={(event) => setDetail(event.target.value)} /> : <><p>{automation.detail}</p><div className="automation-meta"><span><Sparkles size={13} /> {automation.kind === 'website' ? automation.aiCaption ? 'AI captions when Gemini is available' : 'Original feed captions' : 'Gemini drafts'}</span>{automation.lastRunAt && <span>Last checked {new Date(automation.lastRunAt).toLocaleString()}</span>}<span>Created {new Date(automation.createdAt).toLocaleDateString()}</span></div></>}</div>
  </Card>
}
