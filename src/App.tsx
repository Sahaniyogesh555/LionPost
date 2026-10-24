import { Navigate, Route, Routes } from 'react-router-dom'
import AppLayout from './components/AppLayout'
import Landing from './pages/Landing'
import Auth from './pages/Auth'
import Home from './pages/Home'
import NewPost from './pages/NewPost'
import Accounts from './pages/Accounts'
import { AutoPost, AutoPostForm, Website } from './pages/AutoPost'
import Gemini from './pages/Gemini'
import Branding from './pages/Branding'
import Posts from './pages/Posts'
import VideoStudio, { BeeTikTok } from './pages/VideoStudio'
import PinMaker from './pages/PinMaker'
import PinAffiliate from './pages/PinAffiliate'
import Blogger from './pages/Blogger'
import Profile from './pages/Profile'
import Settings from './pages/Settings'
import Notifications from './pages/Notifications'
import { Plans, Trending } from './pages/ToolsPages'

export default function App() {
  return <Routes>
    <Route path="/" element={<Landing />} />
    <Route path="/login" element={<Auth mode="login" />} />
    <Route path="/signup" element={<Auth mode="signup" />} />
    <Route path="/app" element={<AppLayout />}>
      <Route index element={<Home />} />
      <Route path="new-post" element={<NewPost />} />
      <Route path="auto-post" element={<AutoPost />} />
      <Route path="auto-post/ai" element={<AutoPostForm type="ai" />} />
      <Route path="auto-post/website" element={<AutoPostForm type="website" />} />
      <Route path="website" element={<Website />} />
      <Route path="trending" element={<Trending />} />
      <Route path="gemini" element={<Gemini />} />
      <Route path="branding" element={<Branding />} />
      <Route path="posts" element={<Posts />} />
      <Route path="accounts" element={<Accounts />} />
      <Route path="video-automation" element={<VideoStudio mode="automation" />} />
      <Route path="shorts-maker" element={<VideoStudio mode="shorts" />} />
      <Route path="pin-affiliate" element={<PinAffiliate />} />
      <Route path="pin-maker" element={<PinMaker />} />
      <Route path="video-translator" element={<VideoStudio mode="translator" />} />
      <Route path="blogger" element={<Blogger />} />
      <Route path="bee-tiktok" element={<BeeTikTok />} />
      <Route path="profile" element={<Profile />} />
      <Route path="settings" element={<Settings />} />
      <Route path="notifications" element={<Notifications />} />
      <Route path="plans" element={<Plans />} />
    </Route>
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
}
