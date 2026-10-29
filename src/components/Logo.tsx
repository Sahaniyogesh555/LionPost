import { Link } from 'react-router-dom'

export function BrandMark({ size = 38 }: { size?: number }) {
  return (
    <span className="brand-mark" style={{ width: size, height: size, fontSize: size * 0.58 }} aria-hidden="true">
      L
    </span>
  )
}

export default function Logo({ to = '/', compact = false, size = 38 }: { to?: string; compact?: boolean; size?: number }) {
  return (
    <Link to={to} className="brand-logo" aria-label="LionPost home">
      <BrandMark size={size} />
      {!compact && <span>Lion<span className="logo-highlight">Post</span></span>}
    </Link>
  )
}

export function UserAvatar({ name, photo, size = 38 }: { name: string; photo?: string; size?: number }) {
  const initials = name.trim() ? name.trim().split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase() : 'L'
  return (
    <span className="user-avatar" style={{ width: size, height: size, fontSize: size * 0.32 }}>
      {photo ? <img src={photo} alt={name} /> : initials}
    </span>
  )
}
