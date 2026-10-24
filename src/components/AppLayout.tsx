import { useEffect, useState } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Bell, ChevronRight, LogOut, Menu, Moon, Settings, Sun } from 'lucide-react'
import Sidebar from './Sidebar'
import { AlphaMark, UserAvatar } from './Logo'
import { Toasts } from './UI'
import { useApp } from '../context/AppContext'

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { profile, theme, setTheme, notifications, notify } = useApp()
  const location = useLocation()
  const navigate = useNavigate()
  const unread = notifications.filter((item) => !item.read).length

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
            <Link to="/app/profile" className="topbar-profile"><UserAvatar name={profile.name} photo={profile.photo} size={36} /><span><strong>{profile.name}</strong><small>{profile.email}</small></span></Link>
          </div>
          <div className="topbar-actions">
            <Link className="plan-pill" to="/app/plans"><AlphaMark size={31} /><span>Go ad free<small>See plans</small></span><ChevronRight size={14} /></Link>
            <Link className="icon-button notification-button" to="/app/notifications" aria-label={`${unread} unread notifications`}><Bell size={18} />{unread > 0 && <span>{unread}</span>}</Link>
            <button className="icon-button" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} aria-label="Toggle color theme">{theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}</button>
            <Link className="icon-button" to="/app/settings" aria-label="Settings"><Settings size={18} /></Link>
            <button className="icon-button logout-icon" onClick={() => { notify('You have been logged out.', 'info'); navigate('/') }} aria-label="Log out"><LogOut size={18} /></button>
          </div>
        </header>
        <main className="page-content"><Outlet /></main>
      </div>
      <Toasts />
    </div>
  )
}
