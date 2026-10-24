import { Instagram, Send, Youtube } from 'lucide-react'
import type { Platform } from '../types'

const labels: Record<string, string> = {
  Facebook: 'f', X: '𝕏', Pinterest: 'P', TikTok: '♪', Dailymotion: 'd', Blogger: 'B', LinkedIn: 'in',
}

export default function PlatformIcon({ platform, size = 'md' }: { platform: Platform | string; size?: 'sm' | 'md' | 'lg' }) {
  const slug = platform.toLowerCase().replace(/[^a-z]/g, '')
  return (
    <span className={`platform-icon platform-${slug} platform-${size}`} title={platform} aria-label={platform}>
      {platform === 'Instagram' ? <Instagram /> : platform === 'Telegram' ? <Send /> : platform === 'YouTube' ? <Youtube /> : labels[platform] || platform[0]}
    </span>
  )
}
