import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Check, Eye, EyeOff, KeyRound, MailCheck } from 'lucide-react'
import Logo from '../components/Logo'
import PlatformIcon from '../components/PlatformIcon'
import { Button, Field } from '../components/UI'
import { useApp } from '../context/AppContext'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'

function AuthIntro() {
  return <section className="auth-intro">
    <Logo size={40} />
    <h1>Write one post.<br />Send it<br />everywhere.</h1>
    <p>Connect your pages and channels once. Then prepare and publish your content from one secure workspace.</p>
    <div className="auth-platforms">{['Facebook', 'Instagram', 'X', 'Pinterest', 'Telegram', 'TikTok', 'YouTube', 'Dailymotion'].map((platform) => <PlatformIcon key={platform} platform={platform} size="lg" />)}</div>
    <ul><li><Check /> Your workspace is synced to your account</li><li><Check /> Real Telegram publishing with your own bot</li><li><Check /> Credentials are encrypted and used only for publishing</li></ul>
  </section>
}

export default function Auth({ mode }: { mode: 'login' | 'signup' }) {
  const isSignup = mode === 'signup'
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  const [loading, setLoading] = useState(false)
  const { updateProfile, notify } = useApp()
  const navigate = useNavigate()

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    setMessage('')
    if (isSignup && !name.trim()) return setError('Please tell us your name.')
    if (!/^\S+@\S+\.\S+$/.test(email)) return setError('Enter a valid email address.')
    if (password.length < 8) return setError('Your password needs at least 8 letters or numbers.')
    setLoading(true)
    try {
      if (isSignup) {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { name: name.trim() }, emailRedirectTo: `${window.location.origin}/app` },
        })
        if (signUpError) throw signUpError
        updateProfile({ email: email.trim(), name: name.trim() })
        if (!data.session) {
          setConfirmed(true)
          return
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
        if (signInError) throw signInError
        updateProfile({ email: email.trim() })
      }
      notify(isSignup ? 'Your AlphaPost account is ready.' : 'Welcome back!')
      navigate('/app')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Authentication failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const forgotPassword = async () => {
    setError('')
    setMessage('')
    if (!/^\S+@\S+\.\S+$/.test(email)) return setError('Enter your account email first.')
    setLoading(true)
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/reset-password` })
    setLoading(false)
    if (resetError) return setError(resetError.message)
    setMessage('If an account uses that email, a password reset link is on its way.')
  }

  return <main className="auth-page">
    <AuthIntro />
    <section className="auth-card">
      {confirmed ? <div className="auth-confirmation"><span className="auth-confirmation-icon"><MailCheck /></span><h2>Confirm your email</h2><p>We sent a confirmation link to <strong>{email}</strong>. Open it to activate your account, then log in.</p><Link to="/login" className="button button-primary button-lg">Back to log in</Link></div> : <>
        <h2>{isSignup ? 'Make your account' : 'Welcome back'}</h2>
        <p>{isSignup ? 'It is free and takes one minute.' : 'Log in to your account.'}</p>
        <form onSubmit={submit}>
          {isSignup && <Field label="Your name"><input value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" placeholder="Your name" /></Field>}
          <Field label="Email"><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" placeholder="you@example.com" /></Field>
          <Field label="Password" hint={isSignup ? 'At least 8 letters or numbers.' : undefined}><div className="password-input"><input type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={isSignup ? 'new-password' : 'current-password'} /><button type="button" onClick={() => setShowPassword(!showPassword)} aria-label="Show password">{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div></Field>
          {error && <div className="form-error">{error}</div>}
          {message && <div className="form-success">{message}</div>}
          <Button type="submit" size="lg" disabled={loading}>{loading ? <span className="spinner" /> : null}{loading ? 'Just a moment…' : isSignup ? 'Make account' : 'Log in'}</Button>
        </form>
        {isSignup ? <small className="auth-terms">By making an account you agree to our <a href="#terms">Terms</a> and <a href="#privacy">Privacy Policy</a>.</small> : <button className="forgot-link" onClick={forgotPassword} disabled={loading}>Forgot your password?</button>}
        <div className="auth-switch">{isSignup ? <>Have an account? <Link to="/login">Log in</Link></> : <>New here? <Link to="/signup">Make a free account</Link></>}</div>
      </>}
    </section>
  </main>
}

export function ResetPassword() {
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { session, loading: authLoading } = useAuth()
  const { notify } = useApp()
  const navigate = useNavigate()

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    if (password.length < 8) return setError('Use at least 8 letters or numbers.')
    if (password !== confirmation) return setError('The passwords do not match.')
    setLoading(true)
    const { error: updateError } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (updateError) return setError(updateError.message)
    notify('Your password has been updated.')
    navigate('/app')
  }

  return <main className="auth-page"><AuthIntro /><section className="auth-card"><span className="auth-confirmation-icon"><KeyRound /></span><h2>Choose a new password</h2>{authLoading ? <p>Checking your reset link…</p> : !session ? <><p>This reset link is invalid or has expired. Request a new one from the login page.</p><Link to="/login" className="button button-primary button-md">Back to log in</Link></> : <form onSubmit={submit}><Field label="New password"><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" /></Field><Field label="Repeat new password"><input type="password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} autoComplete="new-password" /></Field>{error && <div className="form-error">{error}</div>}<Button type="submit" size="lg" disabled={loading}>{loading ? 'Updating…' : 'Update password'}</Button></form>}</section></main>
}
