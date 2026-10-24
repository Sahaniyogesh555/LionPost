import { BadgeCheck, Bot, Clapperboard, Facebook, Globe2, Image, Instagram, LayoutGrid, Link2, MessageSquare, Monitor, Music2, PenLine, Pin, Play, Rss, Scissors, Search, Send, Sparkles, Video, Youtube, Zap } from 'lucide-react'

const icons: Record<string, typeof Video> = {
  community: MessageSquare, video: Video, blogger: PenLine, facebook: Facebook, instagram: Instagram,
  shorts: Scissors, translate: Sparkles, pinterest: Pin, search: Search, x: Zap, aeo: BadgeCheck,
  carousel: LayoutGrid, website: Rss, telegram: Send, tiktok: Music2, youtube: Youtube,
  image: Image, link: Link2, bot: Bot, clip: Clapperboard, globe: Globe2, play: Play, monitor: Monitor,
}

export default function ToolIcon({ name, color = 'yellow', size = 'md' }: { name: string; color?: string; size?: 'sm' | 'md' | 'lg' }) {
  const Icon = icons[name] || Zap
  return <span className={`icon-badge badge-${color} icon-badge-${size}`}><Icon /></span>
}
