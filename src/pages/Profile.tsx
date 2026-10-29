import { useRef, useState, type FormEvent } from 'react'
import { Bell, Camera, Check, ChevronRight, FileText, Gem, Globe2, Heart, Image, KeyRound, LogOut, MessageSquare, Rss, Save, Settings as SettingsIcon, Shield, Trash2, Upload, X } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { useAuth } from '../context/AuthContext'
import { UserAvatar } from '../components/Logo'
import { Button, Card, Field, PageHeader } from '../components/UI'
import { readFileAsDataUrl } from '../utils'

export default function Profile() {
  const { profile, updateProfile, notify } = useApp()
  const { signOut } = useAuth()
  const [form, setForm] = useState(profile)
  const fileRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()
  const logout = async () => {
    try { await signOut(); navigate('/') } catch (error) { notify(error instanceof Error ? error.message : 'Could not log out.', 'error') }
  }
  const update = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }))
  const submit = (event: FormEvent) => { event.preventDefault(); updateProfile(form); notify('Your profile is saved.') }
  const upload = async (file?: File) => { if (!file) return; if (file.size > 2 * 1024 * 1024) return notify('Please choose a profile photo smaller than 2 MB.', 'error'); const photo = await readFileAsDataUrl(file); update('photo', photo); updateProfile({ photo }); notify('Profile photo updated.') }

  return <div className="profile-page"><PageHeader title="Profile" subtitle="Your photo and your details." /><div className="profile-layout"><Card className="profile-form-card"><form onSubmit={submit}><div className="profile-photo-wrap"><UserAvatar name={form.name} photo={form.photo} size={112} /><button type="button" className="photo-edit-badge" onClick={() => fileRef.current?.click()}><Camera size={17} /></button></div><input ref={fileRef} type="file" hidden accept="image/*" onChange={(event) => upload(event.target.files?.[0])} /><Button type="button" size="sm" variant="secondary" icon={<Upload size={14} />} onClick={() => fileRef.current?.click()}>Change photo</Button><h2>{form.name || 'Your profile'}</h2><p className="profile-email">{form.email || 'Add your account details below'}</p><Field label="Your name"><input value={form.name} onChange={(event) => update('name', event.target.value)} /></Field><Field label="About you"><textarea value={form.about} onChange={(event) => update('about', event.target.value)} placeholder="A line or two about you or your pages" /></Field><Field label="Website"><input type="url" value={form.website} onChange={(event) => update('website', event.target.value)} placeholder="https://" /></Field><Field label="Phone or WhatsApp"><input value={form.phone} onChange={(event) => update('phone', event.target.value)} /></Field><Field label="Country"><input value={form.country} onChange={(event) => update('country', event.target.value)} /></Field><Button type="submit" icon={<Save size={16} />}>Save profile</Button></form></Card><div className="profile-side"><Card className="ad-free-card"><Heart /><h2>Go ad free</h2><p>No ads in the app or on the web, and you support LionPost.</p><Link to="/app/plans" className="button button-primary button-md"><Heart size={15} /> See plans</Link></Card><Card title="More"><div className="settings-link-list"><Link to="/app/notifications"><Bell />Notifications<ChevronRight /></Link><Link to="/app/settings"><SettingsIcon />Settings and password<ChevronRight /></Link><Link to="/app/branding"><Image />Branding<ChevronRight /></Link><Link to="/app/gemini"><KeyRound />Gemini keys<ChevronRight /></Link><Link to="/app/website"><Rss />Share from my website<ChevronRight /></Link></div></Card><Card title="Help and legal"><div className="settings-link-list"><button onClick={() => notify('Privacy Policy: your workspace is stored in your Supabase account. Publishing credentials are encrypted and readable only by the server.', 'info')}><Shield />Privacy Policy<ChevronRight /></button><button onClick={() => notify('Terms of Use: create responsibly and only share content you have the right to use.', 'info')}><FileText />Terms of Use<ChevronRight /></button><Link to="/app/settings"><Trash2 />How to delete your account<ChevronRight /></Link><Link to="/app/settings"><X />Delete my account now<ChevronRight /></Link><a href="mailto:support@lionpost.app"><MessageSquare />Contact support<ChevronRight /></a></div><p className="helper-text">LionPost by Naveed Ali Shah.<br />Posts made by AI can be reported from the Posts page.</p></Card><Card><Button variant="secondary" size="lg" icon={<LogOut size={16} />} onClick={logout}>Log out</Button></Card></div></div></div>
}
