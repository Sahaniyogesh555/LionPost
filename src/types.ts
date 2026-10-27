export type Platform = 'Facebook' | 'Instagram' | 'X' | 'Pinterest' | 'Telegram' | 'TikTok' | 'Dailymotion' | 'YouTube' | 'Blogger'

export type PostStatus = 'sent' | 'scheduled' | 'failed' | 'draft'

export interface Post {
  id: string
  text: string
  platforms: Platform[]
  status: PostStatus
  createdAt: string
  scheduledAt?: string
  image?: string
  firstComment?: string
}

export interface SocialAccount {
  id: string
  platform: Platform
  name: string
  handle: string
  status: 'working' | 'paused'
}

export interface Automation {
  id: string
  kind: 'ai' | 'website' | 'pinterest' | 'blogger'
  name: string
  detail: string
  active: boolean
  createdAt: string
  platforms: Platform[]
  topic?: string
  language?: string
  sourceUrl?: string
  seenIds?: string[]
  lastRunAt?: string
  aiCaption?: boolean
}

export interface UserProfile {
  name: string
  email: string
  about: string
  website: string
  phone: string
  country: string
  photo?: string
}

export interface AppNotification {
  id: string
  title: string
  body: string
  time: string
  read: boolean
  type: 'success' | 'info' | 'warning'
}

export interface ToastMessage {
  id: string
  message: string
  type: 'success' | 'error' | 'info'
}
