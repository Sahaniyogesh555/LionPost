import { NavLink } from 'react-router-dom'
import { Home, PenLine, Zap, Rss, Flame, Sparkles, Image, Play, List, Link2, Video, Scissors, Pin, Wand2, Languages, Bold, Monitor, Music2, Search, BadgeCheck, MessageSquare, X } from 'lucide-react'
import Logo from './Logo'

const navItems = [
  { label: 'Home', path: '/app', icon: Home, color: 'yellow', end: true },
  { label: 'New post', path: '/app/new-post', icon: PenLine, color: 'blue' },
  { label: 'Auto post', path: '/app/auto-post', icon: Zap, color: 'orange' },
  { label: 'My website', path: '/app/website', icon: Rss, color: 'green' },
  { label: 'Trending', path: '/app/trending', icon: Flame, color: 'red' },
  { label: 'Gemini', path: '/app/gemini', icon: Sparkles, color: 'teal' },
  { label: 'Branding', path: '/app/branding', icon: Image, color: 'pink' },
  { label: 'Learn Earn', path: '/app/learn-earn', icon: Play, color: 'red' },
  { label: 'Posts', path: '/app/posts', icon: List, color: 'blue' },
  { label: 'Accounts', path: '/app/accounts', icon: Link2, color: 'dark' },
  { label: 'Video automation', path: '/app/video-automation', icon: Video, color: 'red' },
  { label: 'Shorts Maker', path: '/app/shorts-maker', icon: Scissors, color: 'orange', badge: 'NEW' },
  { label: 'Pin Affiliate', path: '/app/pin-affiliate', icon: Pin, color: 'red', badge: 'NEW' },
  { label: 'Pin Maker', path: '/app/pin-maker', icon: Pin, color: 'red', badge: 'NEW' },
  { label: 'Video Translator', path: '/app/video-translator', icon: Languages, color: 'blue', badge: 'NEW' },
  { label: 'Blogger', path: '/app/blogger', icon: Bold, color: 'orange', badge: 'NEW' },
  { label: 'Emulator Free', path: '/app/emulator', icon: Monitor, color: 'teal', badge: 'NEW' },
  { label: 'Bee TikTok', path: '/app/bee-tiktok', icon: Music2, color: 'black', badge: 'NEW' },
  { label: 'Keyword Research', path: '/app/keyword-research', icon: Search, color: 'blue', badge: 'NEW' },
  { label: 'AEO Checker', path: '/app/aeo-checker', icon: BadgeCheck, color: 'green', badge: 'NEW' },
  { label: 'Community', path: '/app/community', icon: MessageSquare, color: 'teal' },
]

export default function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <>
      {open && <button className="sidebar-overlay" onClick={onClose} aria-label="Close navigation" />}
      <aside className={`sidebar ${open ? 'is-open' : ''}`}>
        <div className="sidebar-brand"><Logo to="/app" size={34} /><button className="sidebar-close" onClick={onClose}><X size={19} /></button></div>
        <nav className="sidebar-nav" aria-label="Main navigation">
          {navItems.map(({ label, path, icon: Icon, color, badge, end }) => (
            <NavLink key={path} to={path} end={end} onClick={onClose} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <span className={`nav-icon badge-${color}`}><Icon size={17} strokeWidth={2.1} /></span>
              <span className="nav-label">{label}</span>
              {badge && <span className="new-badge">{badge}</span>}
            </NavLink>
          ))}
        </nav>
      </aside>
    </>
  )
}
