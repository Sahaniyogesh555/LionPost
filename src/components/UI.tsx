import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { ArrowLeft, Check, CheckCircle2, Info, X, XCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'

export const Button = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'blue' | 'dark'; size?: 'sm' | 'md' | 'lg'; icon?: ReactNode }>(
  function Button({ variant = 'primary', size = 'md', icon, className = '', children, ...props }, ref) {
    return <button ref={ref} className={`button button-${variant} button-${size} ${className}`} {...props}>{icon}{children}</button>
  },
)

export function IconBadge({ children, color = 'yellow', size = 'md' }: { children: ReactNode; color?: string; size?: 'sm' | 'md' | 'lg' }) {
  return <span className={`icon-badge badge-${color} icon-badge-${size}`}>{children}</span>
}

export function PageHeader({ title, subtitle, icon, action, back }: { title: string; subtitle?: string; icon?: ReactNode; action?: ReactNode; back?: boolean }) {
  const navigate = useNavigate()
  return (
    <div className="page-header">
      <div className="page-heading-wrap">
        {back && <button className="back-link" onClick={() => navigate(-1)}><ArrowLeft size={16} /> Back</button>}
        <div className="page-title-row">
          {icon && <IconBadge size="lg">{icon}</IconBadge>}
          <div><h1>{title}</h1>{subtitle && <p>{subtitle}</p>}</div>
        </div>
      </div>
      {action && <div className="page-action">{action}</div>}
    </div>
  )
}

export function Card({ children, className = '', title, subtitle, action }: { children: ReactNode; className?: string; title?: string; subtitle?: string; action?: ReactNode }) {
  return (
    <section className={`card ${className}`}>
      {(title || action) && <div className="card-header"><div>{title && <h2>{title}</h2>}{subtitle && <p>{subtitle}</p>}</div>{action}</div>}
      {children}
    </section>
  )
}

export function Field({ label, hint, children, className = '' }: { label?: string; hint?: string; children?: ReactNode; className?: string }) {
  return <label className={`field ${className}`}>{label && <span className="field-label">{label}</span>}{children}{hint && <small>{hint}</small>}</label>
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (checked: boolean) => void; label?: string }) {
  return <label className="toggle-row"><button type="button" role="switch" aria-checked={checked} className={`toggle ${checked ? 'is-on' : ''}`} onClick={() => onChange(!checked)}><span /></button>{label && <span>{label}</span>}</label>
}

export function CheckBox({ checked, onChange, label }: { checked: boolean; onChange: (checked: boolean) => void; label: ReactNode }) {
  return <label className="checkbox-row"><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} /><span className="custom-check">{checked && <Check size={13} strokeWidth={3} />}</span><span>{label}</span></label>
}

export function Modal({ open, onClose, title, children, className = '' }: { open: boolean; onClose: () => void; title: string; children: ReactNode; className?: string }) {
  if (!open) return null
  return (
    <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <div className={`modal ${className}`} role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-header"><h2>{title}</h2><button className="icon-button" onClick={onClose} aria-label="Close"><X size={19} /></button></div>
        {children}
      </div>
    </div>
  )
}

export function EmptyState({ icon, title, text, action }: { icon: ReactNode; title: string; text: string; action?: ReactNode }) {
  return <div className="empty-state"><IconBadge size="lg">{icon}</IconBadge><h3>{title}</h3><p>{text}</p>{action}</div>
}

export function Toasts() {
  const { toasts, dismissToast } = useApp()
  return <div className="toast-stack" aria-live="polite">{toasts.map((toast) => <button key={toast.id} className={`toast toast-${toast.type}`} onClick={() => dismissToast(toast.id)}>{toast.type === 'success' ? <CheckCircle2 /> : toast.type === 'error' ? <XCircle /> : <Info />}<span>{toast.message}</span><X size={15} /></button>)}</div>
}

export function StepNumber({ number }: { number: number }) {
  return <span className="step-number">{number}</span>
}

export function MiniStat({ value, label, icon, color = 'yellow' }: { value: string | number; label: string; icon: ReactNode; color?: string }) {
  return <Card className="mini-stat"><IconBadge color={color}>{icon}</IconBadge><div><strong>{value}</strong><span>{label}</span></div></Card>
}
