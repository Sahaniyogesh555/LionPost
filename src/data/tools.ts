export interface ToolDefinition {
  name: string
  description: string
  path: string
  icon: string
  color: string
  badge?: string
}

export const tools: ToolDefinition[] = [
  { name: 'AI video maker', description: 'Turn an idea into a narrated vertical video.', path: '/app/video-automation', icon: 'video', color: 'red' },
  { name: 'Blogger automation', description: 'Publish useful articles to your own blog.', path: '/app/blogger', icon: 'blogger', color: 'orange' },
  { name: 'Facebook Page auto post', description: 'Keep your Facebook Page active automatically.', path: '/app/auto-post', icon: 'facebook', color: 'blue', badge: 'Coming soon' },
  { name: 'Instagram auto post and reels', description: 'Share photos, carousels and reels on a schedule.', path: '/app/auto-post', icon: 'instagram', color: 'pink', badge: 'Coming soon' },
  { name: 'Shorts Maker', description: 'Turn one long video into up to five short clips.', path: '/app/shorts-maker', icon: 'shorts', color: 'orange', badge: 'NEW' },
  { name: 'Video Translator', description: 'Translate your video with a natural AI voice.', path: '/app/video-translator', icon: 'translate', color: 'blue', badge: 'NEW' },
  { name: 'Pinterest auto post', description: 'Fresh, useful pins while you focus on creating.', path: '/app/pin-affiliate', icon: 'pinterest', color: 'red', badge: 'Coming soon' },
  { name: 'X (Twitter) auto post', description: 'Write once and publish text posts to X without the busywork.', path: '/app/auto-post', icon: 'x', color: 'black' },
  { name: 'Carousel maker', description: 'Design a useful carousel for Instagram and Facebook.', path: '/app/pin-maker', icon: 'carousel', color: 'pink' },
  { name: 'Website to social', description: 'Send every new article to your social channels.', path: '/app/website', icon: 'website', color: 'green' },
  { name: 'Telegram channel auto post', description: 'Keep your channel useful, active and consistent.', path: '/app/auto-post', icon: 'telegram', color: 'blue' },
  { name: 'TikTok auto post', description: 'Turn long videos into clips and post them to TikTok.', path: '/app/bee-tiktok', icon: 'tiktok', color: 'black', badge: 'Coming soon' },
  { name: 'YouTube and Dailymotion', description: 'Share your videos to more places automatically.', path: '/app/accounts', icon: 'youtube', color: 'red', badge: 'Coming soon' },
]
