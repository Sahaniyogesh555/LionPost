import type { ReactNode } from 'react'
import { BrandMark } from './Logo'

export default function ToolHero({ title, description, icon, badges, theme = 'dark', children }: { title: string; description: string; icon: ReactNode; badges: string[]; theme?: 'dark' | 'blue' | 'orange' | 'yellow' | 'olive'; children?: ReactNode }) {
  return <section className={`tool-hero tool-hero-${theme}`}><div className="tool-hero-icon">{icon}</div><div className="tool-hero-copy"><h1>{title}</h1><p>{description}</p><div className="tool-hero-badges">{badges.map((badge) => <span key={badge}>{badge}</span>)}</div></div><BrandMark size={74} />{children}</section>
}
