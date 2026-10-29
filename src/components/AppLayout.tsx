import { useEffect, useState } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Bell, ChevronRight, Cloud, CloudOff, LogOut, Menu, Moon, RefreshCw, Settings, Sun } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import Sidebar from './Sidebar'
import { BrandMark, UserAvatar } from './Logo'
import { Toasts } from './UI'
import { useApp } from '../context/AppContext'

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const { profile, theme, setTheme, notifications, notify, cloudStatus, cloudError } = useApp()
  const { signOut } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const unread = notifications.filter((item) => !item.read).length
  const cloudLabel = cloudStatus === 'loading' ? 'Loading cloud' : cloudStatus === 'syncing' ? 'Saving' : cloudStatus === 'saved' ? 'Cloud saved' : cloudStatus === 'error' ? 'Sync error' : 'Offline'

  const logout = async () => {
    setSigningOut(true)
    try {
      await signOut()
      notify('You have been logged out.', 'info')
      navigate('/')
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Could not log out.', 'error')
    } finally {
      setSigningOut(false)
    }
  }

  useEffect(() => {
    setSidebarOpen(false)
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [location.pathname])

  return (
    <div className="app-shell">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="app-main">
        <header className="topbar">
          <div className="topbar-profile-wrap">
            <button className="mobile-menu" onClick={() => setSidebarOpen(true)} aria-label="Open navigation"><Menu size={21} /></button>
            <Link to="/app/profile" className="topbar-profile"><UserAvatar name={profile.name} photo={profile.photo} size={36} /><span><strong>{profile.name || 'Your profile'}</strong><small>{profile.email || 'Set up your profile'}</small></span></Link>
          </div>
          <div className="topbar-actions">
            <span className={`cloud-status cloud-${cloudStatus}`} title={cloudError || cloudLabel}>{cloudStatus === 'loading' || cloudStatus === 'syncing' ? <RefreshCw className="spin" size={15} /> : cloudStatus === 'error' || cloudStatus === 'offline' ? <CloudOff size={15} /> : <Cloud size={15} />}<small>{cloudLabel}</small></span>
            <Link className="plan-pill" to="/app/plans"><BrandMark size={31} /><span>Go ad free<small>See plans</small></span><ChevronRight size={14} /></Link>
            <Link className="icon-button notification-button" to="/app/notifications" aria-label={`${unread} unread notifications`}><Bell size={18} />{unread > 0 && <span>{unread}</span>}</Link>
            <button className="icon-button" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} aria-label="Toggle color theme">{theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}</button>
            <Link className="icon-button" to="/app/settings" aria-label="Settings"><Settings size={18} /></Link>
            <button className="icon-button logout-icon" onClick={logout} disabled={signingOut} aria-label="Log out"><LogOut size={18} /></button>
          </div>
        </header>
        <main className="page-content">{cloudStatus === 'error' && cloudError && <div className="cloud-error-banner"><CloudOff size={16} /><span>{cloudError}</span><button onClick={() => window.location.reload()}>Retry</button></div>}<Outlet /></main>
      </div>
      <Toasts />
    </div>
  )
}
