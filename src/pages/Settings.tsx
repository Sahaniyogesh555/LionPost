import { useState, type FormEvent } from 'react'
import { ArrowRight, Image, KeyRound, Lock, LogOut, Save, Shield, Sparkles, Trash2 } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { Button, Card, Field, PageHeader } from '../components/UI'

export default function Settings() {
  const { profile, updateProfile, notify, resetApp } = useApp()
  const [name, setName] = useState(profile.name)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [deleteText, setDeleteText] = useState('')
  const [deletePassword, setDeletePassword] = useState('')
  const navigate = useNavigate()
  const saveName = (event: FormEvent) => { event.preventDefault(); if (!name.trim()) return; updateProfile({ name }); notify('Your name is saved.') }
  const changePassword = (event: FormEvent) => { event.preventDefault(); if (!currentPassword) return notify('Enter your current password.', 'error'); if (newPassword.length < 8) return notify('Use at least 8 letters or numbers for the new password.', 'error'); setCurrentPassword(''); setNewPassword(''); notify('Your password was changed for this demo.') }
  const deleteAccount = () => {
    if (deleteText !== 'DELETE') return notify('Type DELETE exactly to confirm.', 'error')
    if (!deletePassword) return notify('Enter your password to confirm.', 'error')
    resetApp(); localStorage.removeItem('alphapost-auth'); notify('Your local demo account and data were deleted.', 'info'); navigate('/')
  }

  return <div className="settings-page"><PageHeader title="Settings" subtitle="Your name, your password and your account." action={<Button variant="secondary" icon={<LogOut size={15} />} onClick={() => navigate('/')}>Log out</Button>} /><div className="settings-feature-links"><Link to="/app/gemini"><span className="icon-badge badge-yellow"><Sparkles /></span><div><h2>Gemini keys</h2><p>Add your keys and check your free limits.</p></div><ArrowRight /></Link><Link to="/app/branding"><span className="icon-badge badge-yellow"><Image /></span><div><h2>Branding</h2><p>Your page name and the “Like and Share” bar on your pictures. Colours, font, 3D or normal.</p></div><ArrowRight /></Link></div><div className="settings-grid"><div className="settings-main"><Card title="Your name" subtitle={profile.email ? `Signed in as ${profile.email}` : 'Add your name and account details'}><form onSubmit={saveName}><Field label="Name"><input value={name} onChange={(event) => setName(event.target.value)} /></Field><Button type="submit" icon={<Save size={15} />}>Save name</Button></form></Card><Card title="Change password"><form onSubmit={changePassword}><Field label="Current password"><input type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} /></Field><Field label="New password" hint="At least 8 letters or numbers."><input type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} /></Field><Button type="submit" icon={<Lock size={15} />}>Change password</Button></form></Card></div><div className="settings-side"><Card className="delete-account-card" title="Delete account"><p>This deletes your account, every account you added and all your posts, right away. It cannot be undone. Posts that already went out stay on the social sites.</p><Field label="Type DELETE to confirm"><input value={deleteText} onChange={(event) => setDeleteText(event.target.value)} placeholder="DELETE" /></Field><Field label="Your password"><input type="password" value={deletePassword} onChange={(event) => setDeletePassword(event.target.value)} /></Field><Button variant="danger" size="lg" icon={<Trash2 size={16} />} onClick={deleteAccount}>Delete my account</Button></Card><Card title="About"><div className="about-links"><button onClick={() => notify('Your content is stored locally in this demo.', 'info')}>Privacy Policy</button><button onClick={() => notify('Only publish content you have the right to share.', 'info')}>Terms of Use</button><button onClick={() => notify('Deleting your demo account clears posts, accounts, automations and preferences from this browser.', 'info')}>How account deletion works</button></div></Card></div></div></div>
}
