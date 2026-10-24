import { ArrowRight, Plus } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import PlatformIcon from './PlatformIcon'
import { Button } from './UI'
import type { Platform, SocialAccount } from '../types'

export const platformDetails: { platform: Platform; title: string; description: string }[] = [
  { platform: 'Facebook', title: 'Facebook Page', description: 'Post to your Facebook Page with a System User token.' },
  { platform: 'Instagram', title: 'Instagram', description: 'Business or Creator account, through your own Meta app.' },
  { platform: 'X', title: 'X (Twitter)', description: 'Post with one browser cookie. No paid API, no developer app.' },
  { platform: 'Pinterest', title: 'Pinterest', description: 'One click connect. Pins are public, no app to make.' },
  { platform: 'Telegram', title: 'Telegram', description: 'Post to your channel or group through your own bot.' },
  { platform: 'TikTok', title: 'TikTok', description: 'Post straight to your TikTok profile, or send it over and post.' },
  { platform: 'Dailymotion', title: 'Dailymotion', description: 'Your videos go to your Dailymotion channel.' },
]

export default function AccountCards({ accounts, onAdd }: { accounts: SocialAccount[]; onAdd?: (platform: Platform) => void }) {
  const navigate = useNavigate()
  return <div className="account-platform-grid">{platformDetails.map(({ platform, title, description }) => {
    const added = accounts.filter((account) => account.platform === platform).length
    return <article className={`account-platform-card platform-card-${platform.toLowerCase()}`} key={platform}>
      <span className={`account-status ${added ? 'connected' : ''}`}>{added ? `● ${added} of 3 added` : 'Not added'}</span>
      <PlatformIcon platform={platform} size="lg" />
      <div className="account-platform-copy"><h3>{title}</h3><p>{description}</p></div>
      <Button size="sm" onClick={() => onAdd ? onAdd(platform) : navigate('/app/accounts')}>{added ? 'Open' : 'Add'} {added ? <ArrowRight size={14} /> : <Plus size={14} />}</Button>
    </article>
  })}</div>
}
