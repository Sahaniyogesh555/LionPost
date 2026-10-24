import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useLocalStorage, makeId } from '../hooks/useLocalStorage'
import type { AppNotification, Automation, Post, SocialAccount, ToastMessage, UserProfile } from '../types'

const now = new Date()
const daysAgo = (days: number, hour = 10) => {
  const date = new Date(now)
  date.setDate(date.getDate() - days)
  date.setHours(hour, 30, 0, 0)
  return date.toISOString()
}
const daysAhead = (days: number, hour = 10) => {
  const date = new Date(now)
  date.setDate(date.getDate() + days)
  date.setHours(hour, 0, 0, 0)
  return date.toISOString()
}

const starterPosts: Post[] = [
  { id: 'post-1', text: '10/20pcs Mixed Pack of Light Pink Heart-Shaped and Bow-Shaped Hair Clips — a sweet little finishing touch for every day.', platforms: ['Pinterest'], status: 'sent', createdAt: daysAgo(0, 9), image: '/assets/workspace.jpg' },
  { id: 'post-2', text: 'A calm workspace makes room for your best ideas. Save this setup for your next studio refresh.', platforms: ['Pinterest', 'Instagram'], status: 'sent', createdAt: daysAgo(1, 14), image: '/assets/workspace.jpg' },
  { id: 'post-3', text: 'Five simple habits that make your creative workflow feel lighter. Which one are you trying this week?', platforms: ['TikTok'], status: 'sent', createdAt: daysAgo(2, 11) },
  { id: 'post-4', text: 'New on the blog: a practical guide to building a content routine you can actually keep.', platforms: ['Pinterest'], status: 'scheduled', createdAt: daysAgo(0, 8), scheduledAt: daysAhead(1, 9) },
  { id: 'post-5', text: 'Behind the scenes: turning one idea into a week of useful content.', platforms: ['Instagram', 'Facebook'], status: 'scheduled', createdAt: daysAgo(0, 8), scheduledAt: daysAhead(2, 15) },
]

const starterAccounts: SocialAccount[] = [
  { id: 'account-1', platform: 'Pinterest', name: 'PinCraftSocial', handle: '@PinCraftSocial', status: 'working' },
  { id: 'account-2', platform: 'TikTok', name: 'Sahani yogesh555', handle: '@sahaniyogesh555', status: 'working' },
]

const starterAutomations: Automation[] = [
  { id: 'auto-pin-1', kind: 'pinterest', name: 'Skincare', detail: 'United States · 12 pins a day · Board: Skincare tips', active: true, createdAt: daysAgo(8), platforms: ['Pinterest'] },
  { id: 'auto-pin-2', kind: 'pinterest', name: 'Fashion', detail: 'United States · 8 pins a day · Board: Everyday style', active: true, createdAt: daysAgo(12), platforms: ['Pinterest'] },
  { id: 'auto-pin-3', kind: 'pinterest', name: 'Mix', detail: 'United States · 24 pins a day · Board: Discover', active: false, createdAt: daysAgo(15), platforms: ['Pinterest'] },
  { id: 'auto-blog-1', kind: 'blogger', name: 'SimpleAI Zone Daily AI Insights', detail: '5 articles a week · With pictures · English', active: true, createdAt: daysAgo(10), platforms: ['Blogger'] },
]

const starterNotifications: AppNotification[] = [
  { id: 'note-1', title: 'Your post is live', body: 'Your Pinterest pin was published successfully.', time: '12 min ago', read: false, type: 'success' },
  { id: 'note-2', title: 'Automation completed', body: 'Fashion published 8 new pins today.', time: '1 hour ago', read: false, type: 'success' },
  { id: 'note-3', title: 'A new community reply', body: 'Naveed replied to your affiliate marketing post.', time: '3 hours ago', read: false, type: 'info' },
  { id: 'note-4', title: 'Your weekly summary is ready', body: 'You published 42 posts across 2 channels this week.', time: 'Yesterday', read: true, type: 'info' },
]

const defaultProfile: UserProfile = {
  name: 'Yogesh Sahani',
  email: 'sahaniyogesh555@gmail.com',
  about: 'Creator, learner and builder. Sharing useful things every day.',
  website: '',
  phone: '',
  country: 'Nepal',
}

interface AppContextValue {
  posts: Post[]
  accounts: SocialAccount[]
  automations: Automation[]
  notifications: AppNotification[]
  profile: UserProfile
  theme: 'light' | 'dark'
  toasts: ToastMessage[]
  addPost: (post: Omit<Post, 'id' | 'createdAt'>) => Post
  updatePost: (id: string, update: Partial<Post>) => void
  deletePost: (id: string) => void
  addAccount: (account: Omit<SocialAccount, 'id' | 'status'>) => void
  removeAccount: (id: string) => void
  addAutomation: (automation: Omit<Automation, 'id' | 'createdAt' | 'active'>) => void
  toggleAutomation: (id: string) => void
  updateAutomation: (id: string, update: Partial<Automation>) => void
  deleteAutomation: (id: string) => void
  updateProfile: (profile: Partial<UserProfile>) => void
  setTheme: (theme: 'light' | 'dark') => void
  markNotificationsRead: () => void
  markNotificationRead: (id: string) => void
  notify: (message: string, type?: ToastMessage['type']) => void
  dismissToast: (id: string) => void
  resetApp: () => void
}

const AppContext = createContext<AppContextValue | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [posts, setPosts] = useLocalStorage<Post[]>('alphapost-posts', starterPosts)
  const [accounts, setAccounts] = useLocalStorage<SocialAccount[]>('alphapost-accounts', starterAccounts)
  const [automations, setAutomations] = useLocalStorage<Automation[]>('alphapost-automations', starterAutomations)
  const [notifications, setNotifications] = useLocalStorage<AppNotification[]>('alphapost-notifications', starterNotifications)
  const [profile, setProfile] = useLocalStorage<UserProfile>('alphapost-profile', defaultProfile)
  const [theme, setTheme] = useLocalStorage<'light' | 'dark'>('alphapost-theme', 'light')
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  const dismissToast = useCallback((id: string) => {
    setToasts((items) => items.filter((item) => item.id !== id))
  }, [])

  const notify = useCallback((message: string, type: ToastMessage['type'] = 'success') => {
    const id = makeId('toast')
    setToasts((items) => [...items, { id, message, type }])
    window.setTimeout(() => dismissToast(id), 3600)
  }, [dismissToast])

  const value = useMemo<AppContextValue>(() => ({
    posts,
    accounts,
    automations,
    notifications,
    profile,
    theme,
    toasts,
    addPost: (post) => {
      const created = { ...post, id: makeId('post'), createdAt: new Date().toISOString() }
      setPosts((items) => [created, ...items])
      return created
    },
    updatePost: (id, update) => setPosts((items) => items.map((post) => post.id === id ? { ...post, ...update } : post)),
    deletePost: (id) => setPosts((items) => items.filter((post) => post.id !== id)),
    addAccount: (account) => setAccounts((items) => [...items, { ...account, id: makeId('account'), status: 'working' }]),
    removeAccount: (id) => setAccounts((items) => items.filter((account) => account.id !== id)),
    addAutomation: (automation) => setAutomations((items) => [{ ...automation, id: makeId('auto'), createdAt: new Date().toISOString(), active: true }, ...items]),
    toggleAutomation: (id) => setAutomations((items) => items.map((item) => item.id === id ? { ...item, active: !item.active } : item)),
    updateAutomation: (id, update) => setAutomations((items) => items.map((item) => item.id === id ? { ...item, ...update } : item)),
    deleteAutomation: (id) => setAutomations((items) => items.filter((item) => item.id !== id)),
    updateProfile: (update) => setProfile((current) => ({ ...current, ...update })),
    setTheme,
    markNotificationsRead: () => setNotifications((items) => items.map((item) => ({ ...item, read: true }))),
    markNotificationRead: (id) => setNotifications((items) => items.map((item) => item.id === id ? { ...item, read: true } : item)),
    notify,
    dismissToast,
    resetApp: () => {
      setPosts([])
      setAccounts([])
      setAutomations([])
      setNotifications([])
      setProfile(defaultProfile)
    },
  }), [posts, accounts, automations, notifications, profile, theme, toasts, setPosts, setAccounts, setAutomations, setNotifications, setProfile, setTheme, notify, dismissToast])

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const context = useContext(AppContext)
  if (!context) throw new Error('useApp must be used within AppProvider')
  return context
}
