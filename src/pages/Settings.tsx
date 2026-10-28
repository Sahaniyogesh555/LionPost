import { useState, type FormEvent } from 'react'
import { ArrowRight, Image, KeyRound, Lock, LogOut, Save, Sparkles, Trash2 } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { useAuth } from '../context/AuthContext'
import { Button, Card, Field, PageHeader } from '../components/UI'
import { supabase } from '../lib/supabase'
import { deleteCloudAccount } from '../services/account'

export default function Settings() {
  const { profile, updateProfile, notify } = useApp()
  const { session, signOut } = useAuth()
  const [name, setName] = useState(profile.name)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [deleteText, setDeleteText] = useState('')
  const [deletePassword, setDeletePassword] = useState('')
  const [savingPassword, setSavingPassword] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const navigate = useNavigate()

  const saveName = (event: FormEvent) => {
    event.preventDefault()
    if (!name.trim()) return
    updateProfile({ name: name.trim() })
    notify('Your name is saved.')
  }

  const changePassword = async (event: FormEvent) => {
    event.preventDefault()
    if (!currentPassword) return notify('Enter your current password.', 'error')
    if (newPassword.length < 8) return notify('Use at least 8 letters or numbers for the new password.', 'error')
    if (!profile.email) return notify('Your account email is missing. Sign in again.', 'error')
    setSavingPassword(true)
    const { error: verificationError } = await supabase.auth.signInWithPassword({ email: profile.email, password: currentPassword })
    if (verificationError) {
      setSavingPassword(false)
      return notify('The current password is incorrect.', 'error')
    }
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    setSavingPassword(false)
    if (error) return notify(error.message, 'error')
    setCurrentPassword('')
    setNewPassword('')
    notify('Your password was changed.')
  }

  const logout = async () => {
    try { await signOut(); navigate('/') } catch (error) { notify(error instanceof Error ? error.message : 'Could not log out.', 'error') }
  }

  const deleteAccount = async () => {
    if (deleteText !== 'DELETE') return notify('Type DELETE exactly to confirm.', 'error')
    if (!deletePassword) return notify('Enter your password to confirm.', 'error')
    if (!session?.access_token) return notify('Sign in again before deleting your account.', 'error')
    setDeleting(true)
    try {
      await deleteCloudAccount(session.access_token, deletePassword)
      await supabase.auth.signOut({ scope: 'local' })
      notify('Your account and cloud workspace were permanently deleted.', 'info')
      navigate('/')
    } catch (error) {
      notify(error instanceof Error ? error.message : 'The account could not be deleted.', 'error')
    } finally {
      setDeleting(false)
    }
  }

  return <div className="settings-page"><PageHeader title="Settings" subtitle="Your name, your password and your account." action={<Button variant="secondary" icon={<LogOut size={15} />} onClick={logout}>Log out</Button>} /><div className="settings-feature-links"><Link to="/app/gemini"><span className="icon-badge badge-yellow"><Sparkles /></span><div><h2>Gemini keys</h2><p>Add your keys and check your free limits.</p></div><ArrowRight /></Link><Link to="/app/branding"><span className="icon-badge badge-yellow"><Image /></span><div><h2>Branding</h2><p>Your page name and the “Like and Share” bar on your pictures. Colours, font, 3D or normal.</p></div><ArrowRight /></Link></div><div className="settings-grid"><div className="settings-main"><Card title="Your name" subtitle={profile.email ? `Signed in as ${profile.email}` : 'Add your name and account details'}><form onSubmit={saveName}><Field label="Name"><input value={name} onChange={(event) => setName(event.target.value)} /></Field><Button type="submit" icon={<Save size={15} />}>Save name</Button></form></Card><Card title="Change password" subtitle="Verify your current password before choosing a new one."><form onSubmit={changePassword}><Field label="Current password"><input type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} autoComplete="current-password" /></Field><Field label="New password" hint="At least 8 letters or numbers."><input type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} autoComplete="new-password" /></Field><Button type="submit" icon={<Lock size={15} />} disabled={savingPassword}>{savingPassword ? 'Verifying…' : 'Change password'}</Button></form></Card></div><div className="settings-side"><Card className="delete-account-card" title="Delete account"><p>This permanently deletes your login, cloud workspace, local profiles and encrypted publishing connections. It cannot be undone. Posts already published stay on the social sites.</p><Field label="Type DELETE to confirm"><input value={deleteText} onChange={(event) => setDeleteText(event.target.value)} placeholder="DELETE" /></Field><Field label="Your password"><input type="password" value={deletePassword} onChange={(event) => setDeletePassword(event.target.value)} autoComplete="current-password" /></Field><Button variant="danger" size="lg" icon={<Trash2 size={16} />} onClick={deleteAccount} disabled={deleting}>{deleting ? 'Deleting…' : 'Delete my account'}</Button></Card><Card title="About"><div className="about-links"><button onClick={() => notify('Your workspace is private to your account and protected by row-level security.', 'info')}>Privacy Policy</button><button onClick={() => notify('Only publish content you have the right to share.', 'info')}>Terms of Use</button><button onClick={() => notify('Account deletion removes your cloud records and encrypted connections through cascading user ownership.', 'info')}>How account deletion works</button></div></Card></div></div></div>
}
