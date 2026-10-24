import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Check, Eye, EyeOff } from 'lucide-react'
import Logo from '../components/Logo'
import PlatformIcon from '../components/PlatformIcon'
import { Button, Field } from '../components/UI'
import { useApp } from '../context/AppContext'

export default function Auth({ mode }: { mode: 'login' | 'signup' }) {
  const isSignup = mode === 'signup'
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { updateProfile, notify } = useApp()
  const navigate = useNavigate()

  const submit = (event: FormEvent) => {
    event.preventDefault()
    setError('')
    if (isSignup && !name.trim()) return setError('Please tell us your name.')
    if (!/^\S+@\S+\.\S+$/.test(email)) return setError('Enter a valid email address.')
    if (password.length < 8) return setError('Your password needs at least 8 letters or numbers.')
    setLoading(true)
    window.setTimeout(() => {
      localStorage.setItem('alphapost-auth', JSON.stringify({ email, loggedIn: true }))
      updateProfile({ email, ...(isSignup ? { name } : {}) })
      notify(isSignup ? 'Your free account is ready. Welcome to AlphaPost!' : 'Welcome back!')
      navigate('/app')
    }, 650)
  }

  return (
    <main className="auth-page">
      <section className="auth-intro">
        <Logo size={40} />
        <h1>Write one post.<br />Send it<br />everywhere.</h1>
        <p>Connect your pages and channels once. Then post to all of them from one screen, now or later.</p>
        <div className="auth-platforms">{['Facebook', 'Instagram', 'X', 'Pinterest', 'Telegram', 'TikTok', 'YouTube', 'Dailymotion'].map((platform) => <PlatformIcon key={platform} platform={platform} size="lg" />)}</div>
        <ul><li><Check /> Facebook, Instagram, X, Pinterest and Telegram</li><li><Check /> Pick a day and time, we post it for you</li><li><Check /> Your keys are locked and only used to post</li></ul>
      </section>
      <section className="auth-card">
        <h2>{isSignup ? 'Make your account' : 'Welcome back'}</h2>
        <p>{isSignup ? 'It is free and takes one minute.' : 'Log in to your account.'}</p>
        <form onSubmit={submit}>
          {isSignup && <Field label="Your name"><input value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" placeholder="Your name" /></Field>}
          <Field label="Email"><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" placeholder="you@example.com" /></Field>
          <Field label="Password" hint={isSignup ? 'At least 8 letters or numbers.' : undefined}><div className="password-input"><input type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={isSignup ? 'new-password' : 'current-password'} /><button type="button" onClick={() => setShowPassword(!showPassword)} aria-label="Show password">{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div></Field>
          {error && <div className="form-error">{error}</div>}
          <Button type="submit" size="lg" disabled={loading}>{loading ? <span className="spinner" /> : null}{loading ? 'Just a moment…' : isSignup ? 'Make account' : 'Log in'}</Button>
        </form>
        {isSignup ? <small className="auth-terms">By making an account you agree to our <a href="#terms">Terms</a> and <a href="#privacy">Privacy Policy</a>.</small> : <button className="forgot-link" onClick={() => notify('Enter your email above and we will send a reset link.', 'info')}>Forgot your password?</button>}
        <div className="auth-switch">{isSignup ? <>Have an account? <Link to="/login">Log in</Link></> : <>New here? <Link to="/signup">Make a free account</Link></>}</div>
      </section>
    </main>
  )
}
