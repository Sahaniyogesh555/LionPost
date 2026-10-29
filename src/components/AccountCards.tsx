import { ArrowRight, Plus } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import PlatformIcon from './PlatformIcon'
import { Button } from './UI'
import type { Platform, SocialAccount } from '../types'

export const platformDetails: { platform: Platform; title: string; description: string }[] = [
  { platform: 'Facebook', title: 'Facebook Page', description: 'Connect manageable Pages with Facebook Login for Business and publish text, photos, or MP4 videos.' },
  { platform: 'Instagram', title: 'Instagram', description: 'Connect a professional account with Meta Unified Login and publish photos or Reels.' },
  { platform: 'X', title: 'X (Twitter)', description: 'Connect with official OAuth and publish text posts through your own X developer app.' },
  { platform: 'Pinterest', title: 'Pinterest', description: 'Connect with OAuth, choose one of your boards, and create image Pins.' },
  { platform: 'Telegram', title: 'Telegram', description: 'Post to your channel or group through your own bot.' },
  { platform: 'TikTok', title: 'TikTok', description: 'Use Login Kit and Direct Post with live creator privacy options and direct video upload.' },
  { platform: 'Dailymotion', title: 'Dailymotion', description: 'Validate a private API v2 key, discover profiles, and upload videos.' },
  { platform: 'YouTube', title: 'YouTube', description: 'Use a dedicated Google OAuth client to discover channels and upload videos.' },
]

export default function AccountCards({ accounts, onAdd }: { accounts: SocialAccount[]; onAdd?: (platform: Platform) => void }) {
  const navigate = useNavigate()
  return <div className="account-platform-grid">{platformDetails.map(({ platform, title, description }) => {
    const added = accounts.filter((account) => account.platform === platform).length
    return <article className={`account-platform-card platform-card-${platform.toLowerCase()}`} key={platform}>
      <span className={`account-status ${added ? 'connected' : ''}`}>{added ? `● ${added} connected` : 'Not added'}</span>
      <PlatformIcon platform={platform} size="lg" />
      <div className="account-platform-copy"><h3>{title}</h3><p>{description}</p></div>
      <Button size="sm" onClick={() => onAdd ? onAdd(platform) : navigate('/app/accounts')}>{added ? 'Manage' : 'Add'} {added ? <ArrowRight size={14} /> : <Plus size={14} />}</Button>
    </article>
  })}</div>
}
