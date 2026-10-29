import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useLocalStorage, makeId } from '../hooks/useLocalStorage'
import type { AppNotification, Automation, Post, SocialAccount, ToastMessage, UserProfile } from '../types'
import { useAuth } from './AuthContext'
import { cloud, loadWorkspace, saveWorkspace, type CloudWorkspace } from '../services/cloud'
import { disconnectTelegramAccount } from '../services/telegram'
import { disconnectBloggerAccount } from '../services/blogger'
import { disconnectXAccount } from '../services/x'

const defaultProfile: UserProfile = { name: '', email: '', about: '', website: '', phone: '', country: '' }
const OWNER_KEY = 'lionpost-workspace-owner'
const LEGACY_OWNER_KEY = 'alphapost-workspace-owner'

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

function mergeRecords<T extends { id: string }>(cloudItems: T[], localItems: T[]) {
  const ids = new Set(cloudItems.map((item) => item.id))
  return [...cloudItems, ...localItems.filter((item) => !ids.has(item.id))]
}

function mergeProfile(cloudProfile: UserProfile, localProfile: UserProfile, email: string, name: string): UserProfile {
  return {
    name: cloudProfile.name || localProfile.name || name,
    email: email || cloudProfile.email || localProfile.email,
    about: cloudProfile.about || localProfile.about,
    website: cloudProfile.website || localProfile.website,
    phone: cloudProfile.phone || localProfile.phone,
    country: cloudProfile.country || localProfile.country,
    photo: cloudProfile.photo || localProfile.photo,
  }
}

function clearPrivateCache() {
  Object.keys(localStorage).filter((key) => (
    (key.startsWith('lionpost-') || key.startsWith('alphapost-'))
    && key !== 'lionpost-theme'
    && key !== 'alphapost-theme'
  )).forEach((key) => localStorage.removeItem(key))
  sessionStorage.removeItem('lionpost-gemini-session')
  sessionStorage.removeItem('alphapost-gemini-session')
}

export type CloudStatus = 'offline' | 'loading' | 'syncing' | 'saved' | 'error'
type NewAccount = Omit<SocialAccount, 'id' | 'status'> & Partial<Pick<SocialAccount, 'id' | 'status'>>
type CloudOperation = (userId: string, accessToken: string) => Promise<void>

interface AppContextValue {
  posts: Post[]
  accounts: SocialAccount[]
  automations: Automation[]
  notifications: AppNotification[]
  profile: UserProfile
  theme: 'light' | 'dark'
  toasts: ToastMessage[]
  cloudStatus: CloudStatus
  cloudError: string
  addPost: (post: Omit<Post, 'id' | 'createdAt'>) => Post
  updatePost: (id: string, update: Partial<Post>) => void
  deletePost: (id: string) => void
  addAccount: (account: NewAccount) => SocialAccount
  removeAccount: (id: string) => Promise<boolean>
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
  const { user, session, loading: authLoading } = useAuth()
  const [posts, setPosts] = useLocalStorage<Post[]>('lionpost-posts', [])
  const [accounts, setAccounts] = useLocalStorage<SocialAccount[]>('lionpost-accounts', [])
  const [automations, setAutomations] = useLocalStorage<Automation[]>('lionpost-automations', [])
  const [notifications, setNotifications] = useLocalStorage<AppNotification[]>('lionpost-notifications', [])
  const [profile, setProfile] = useLocalStorage<UserProfile>('lionpost-profile', defaultProfile)
  const [theme, setTheme] = useLocalStorage<'light' | 'dark'>('lionpost-theme', 'light')
  const [toasts, setToasts] = useState<ToastMessage[]>([])
  const [cloudStatus, setCloudStatus] = useState<CloudStatus>('offline')
  const [cloudError, setCloudError] = useState('')
  const hydratedUser = useRef<string | null>(null)
  const previousUser = useRef<string | null>(null)
  const cloudQueue = useRef<Promise<unknown>>(Promise.resolve())
  const pendingWrites = useRef(0)

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

  useEffect(() => {
    if (authLoading) return
    let cancelled = false

    if (!user) {
      hydratedUser.current = null
      if (previousUser.current) {
        setPosts([])
        setAccounts([])
        setAutomations([])
        setNotifications([])
        setProfile(defaultProfile)
        // Let the empty-state storage effects settle, then remove the keys too.
        window.setTimeout(clearPrivateCache, 0)
      } else {
        clearPrivateCache()
      }
      previousUser.current = null
      setCloudStatus('offline')
      setCloudError('')
      return
    }

    const userId = user.id
    previousUser.current = userId
    hydratedUser.current = null
    setCloudStatus('loading')
    setCloudError('')
    const owner = localStorage.getItem(OWNER_KEY) ?? localStorage.getItem(LEGACY_OWNER_KEY)
    const localSnapshot: CloudWorkspace = { posts, accounts, automations, notifications, profile }

    loadWorkspace(userId).then(async (remote) => {
      if (cancelled) return
      const mayMigrateLocal = !owner || owner === userId
      const next: CloudWorkspace = mayMigrateLocal ? {
        posts: mergeRecords(remote.posts, localSnapshot.posts),
        accounts: mergeRecords(remote.accounts, localSnapshot.accounts),
        automations: mergeRecords(remote.automations, localSnapshot.automations),
        notifications: mergeRecords(remote.notifications, localSnapshot.notifications),
        profile: mergeProfile(remote.profile, localSnapshot.profile, user.email || '', String(user.user_metadata?.name || '')),
      } : {
        ...remote,
        profile: mergeProfile(remote.profile, defaultProfile, user.email || '', String(user.user_metadata?.name || '')),
      }
      setPosts(next.posts)
      setAccounts(next.accounts)
      setAutomations(next.automations)
      setNotifications(next.notifications)
      setProfile(next.profile)
      await saveWorkspace(userId, next)
      if (cancelled) return
      localStorage.setItem(OWNER_KEY, userId)
      localStorage.removeItem(LEGACY_OWNER_KEY)
      hydratedUser.current = userId
      setCloudStatus('saved')
    }).catch((error) => {
      if (cancelled) return
      hydratedUser.current = null
      setCloudStatus('error')
      setCloudError(error instanceof Error ? error.message : 'Your cloud workspace could not be loaded.')
    })

    return () => { cancelled = true }
    // The workspace is intentionally hydrated only when the authenticated user changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, authLoading])

  const runCloud = useCallback((operation: CloudOperation): Promise<boolean> => {
    const userId = hydratedUser.current
    const accessToken = session?.access_token
    if (!userId || !accessToken) return Promise.resolve(false)
    pendingWrites.current += 1
    setCloudStatus('syncing')
    setCloudError('')
    const task = cloudQueue.current.catch(() => undefined).then(async () => {
      try {
        await operation(userId, accessToken)
        return true
      } catch (error) {
        setCloudStatus('error')
        setCloudError(error instanceof Error ? error.message : 'A cloud change could not be saved.')
        return false
      } finally {
        pendingWrites.current = Math.max(0, pendingWrites.current - 1)
        if (pendingWrites.current === 0) {
          setCloudStatus((current) => current === 'error' ? current : 'saved')
        }
      }
    })
    cloudQueue.current = task
    return task
  }, [session?.access_token])

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
    cloudStatus,
    cloudError,
    addPost: (post) => {
      const created = { ...post, id: makeId('post'), createdAt: new Date().toISOString() }
      setPosts((items) => [created, ...items])
      void runCloud((userId) => cloud.upsertPost(userId, created))
      return created
    },
    updatePost: (id, update) => {
      const current = posts.find((post) => post.id === id)
      if (!current) return
      const updated = { ...current, ...update }
      setPosts((items) => items.map((post) => post.id === id ? updated : post))
      void runCloud((userId) => cloud.upsertPost(userId, updated))
    },
    deletePost: (id) => {
      setPosts((items) => items.filter((post) => post.id !== id))
      void runCloud((userId) => cloud.deletePost(userId, id))
    },
    addAccount: (account) => {
      const created: SocialAccount = { ...account, id: account.id || makeId('account'), status: account.status || 'working' }
      setAccounts((items) => [...items.filter((item) => item.id !== created.id), created])
      void runCloud((userId) => cloud.upsertAccount(userId, created))
      return created
    },
    removeAccount: async (id) => {
      const account = accounts.find((item) => item.id === id)
      if (!account) return false
      if (account.connectionType === 'telegram' || account.connectionType === 'blogger' || account.connectionType === 'x') {
        const saved = await runCloud(async (userId, accessToken) => {
          if (account.connectionType === 'telegram') await disconnectTelegramAccount(accessToken, id)
          else if (account.connectionType === 'blogger') await disconnectBloggerAccount(accessToken, id)
          else await disconnectXAccount(accessToken, id)
          await cloud.deleteAccount(userId, id)
        })
        if (!saved) {
          notify(`${account.platform} could not be disconnected. Your connection was kept; please try again.`, 'error')
          return false
        }
      } else {
        void runCloud((userId) => cloud.deleteAccount(userId, id))
      }
      setAccounts((items) => items.filter((item) => item.id !== id))
      return true
    },
    addAutomation: (automation) => {
      const created = { ...automation, id: makeId('auto'), createdAt: new Date().toISOString(), active: true }
      setAutomations((items) => [created, ...items])
      void runCloud((userId) => cloud.upsertAutomation(userId, created))
    },
    toggleAutomation: (id) => {
      const current = automations.find((item) => item.id === id)
      if (!current) return
      const updated = { ...current, active: !current.active }
      setAutomations((items) => items.map((item) => item.id === id ? updated : item))
      void runCloud((userId) => cloud.upsertAutomation(userId, updated))
    },
    updateAutomation: (id, update) => {
      const current = automations.find((item) => item.id === id)
      if (!current) return
      const updated = { ...current, ...update }
      setAutomations((items) => items.map((item) => item.id === id ? updated : item))
      void runCloud((userId) => cloud.upsertAutomation(userId, updated))
    },
    deleteAutomation: (id) => {
      setAutomations((items) => items.filter((item) => item.id !== id))
      void runCloud((userId) => cloud.deleteAutomation(userId, id))
    },
    updateProfile: (update) => {
      const updated = { ...profile, ...update }
      setProfile(updated)
      void runCloud((userId) => cloud.upsertProfile(userId, updated))
    },
    setTheme,
    markNotificationsRead: () => {
      const updated = notifications.map((item) => ({ ...item, read: true }))
      setNotifications(updated)
      void runCloud((userId) => cloud.upsertNotifications(userId, updated))
    },
    markNotificationRead: (id) => {
      const updated = notifications.map((item) => item.id === id ? { ...item, read: true } : item)
      setNotifications(updated)
      void runCloud((userId) => cloud.upsertNotifications(userId, updated))
    },
    notify,
    dismissToast,
    resetApp: () => {
      setPosts([])
      setAccounts([])
      setAutomations([])
      setNotifications([])
      setProfile(defaultProfile)
      void runCloud((userId) => cloud.clearWorkspace(userId))
    },
  }), [posts, accounts, automations, notifications, profile, theme, toasts, cloudStatus, cloudError, setPosts, setAccounts, setAutomations, setNotifications, setProfile, setTheme, runCloud, notify, dismissToast])

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const context = useContext(AppContext)
  if (!context) throw new Error('useApp must be used within AppProvider')
  return context
}
