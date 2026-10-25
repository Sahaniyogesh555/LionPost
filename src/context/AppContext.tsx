import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useLocalStorage, makeId } from '../hooks/useLocalStorage'
import type { AppNotification, Automation, Post, SocialAccount, ToastMessage, UserProfile } from '../types'

const defaultProfile: UserProfile = {
  name: '',
  email: '',
  about: '',
  website: '',
  phone: '',
  country: '',
}

// Remove only the fixed records shipped by the original demo. User-created
// records have timestamped IDs and are left untouched.
const legacyDemoIds = {
  posts: new Set(['post-1', 'post-2', 'post-3', 'post-4', 'post-5']),
  accounts: new Set(['account-1', 'account-2']),
  automations: new Set(['auto-pin-1', 'auto-pin-2', 'auto-pin-3', 'auto-blog-1']),
  notifications: new Set(['note-1', 'note-2', 'note-3', 'note-4']),
}

function withoutLegacyDemoData<T extends { id: string }>(items: T[], ids: Set<string>) {
  const filtered = items.filter((item) => !ids.has(item.id))
  return filtered.length === items.length ? items : filtered
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
  const [posts, setPosts] = useLocalStorage<Post[]>('alphapost-posts', [])
  const [accounts, setAccounts] = useLocalStorage<SocialAccount[]>('alphapost-accounts', [])
  const [automations, setAutomations] = useLocalStorage<Automation[]>('alphapost-automations', [])
  const [notifications, setNotifications] = useLocalStorage<AppNotification[]>('alphapost-notifications', [])
  const [profile, setProfile] = useLocalStorage<UserProfile>('alphapost-profile', defaultProfile)
  const [theme, setTheme] = useLocalStorage<'light' | 'dark'>('alphapost-theme', 'light')
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  useEffect(() => {
    setPosts((items) => withoutLegacyDemoData(items, legacyDemoIds.posts))
    setAccounts((items) => withoutLegacyDemoData(items, legacyDemoIds.accounts))
    setAutomations((items) => withoutLegacyDemoData(items, legacyDemoIds.automations))
    setNotifications((items) => {
      const withoutDemo = withoutLegacyDemoData(items, legacyDemoIds.notifications)
      const filtered = withoutDemo.filter((item) => !/community/i.test(`${item.title} ${item.body}`))
      return filtered.length === withoutDemo.length ? withoutDemo : filtered
    })
    setProfile((current) => {
      const isLegacyDemoProfile = current.name === 'Yogesh Sahani' && current.email === 'sahaniyogesh555@gmail.com'
      return isLegacyDemoProfile ? { ...defaultProfile, photo: current.photo } : current
    })
  }, [setPosts, setAccounts, setAutomations, setNotifications, setProfile])

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
