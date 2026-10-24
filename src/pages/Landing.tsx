import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, Check, ChevronDown, Globe2, Heart, MessageSquare, Play, ShieldCheck, Sparkles } from 'lucide-react'
import Logo, { AlphaMark } from '../components/Logo'
import PlatformIcon from '../components/PlatformIcon'
import ToolIcon from '../components/ToolIcon'
import { Button } from '../components/UI'
import { tools } from '../data/tools'

const faqs = [
  ['Is AlphaPost free?', 'Yes. The community, publishing tools, video tools and blog tools have a generous free plan. You can start without a credit card.'],
  ['What can AlphaPost do?', 'AlphaPost helps you write once and publish everywhere, automate your content, make short videos, discover keywords and learn with other creators.'],
  ['Do I need one account for everything?', 'Yes. One AlphaPost account connects your tools and social channels in one simple workspace.'],
  ['Where do my videos go?', 'Your videos stay on your device until you choose to publish or download them.'],
  ['Is my data safe?', 'Your connected accounts and preferences are private to your workspace. You can disconnect a channel at any time.'],
  ['Is there an app?', 'AlphaPost works in your phone and desktop browser, so there is nothing to install.'],
]

const communityPosts = [
  { name: 'Naveed SHAH', time: '2h', title: 'How To Earn Your First $100 with Affiliate Marketing', tag: 'EARN', color: 'yellow' },
  { name: 'Yogesh Sahani', time: '4h', title: 'What is one tool that saves you time every day?', tag: 'DISCUSS', color: 'blue' },
  { name: 'Shreya Mehta', time: '7h', title: 'A simple content routine that finally worked for me', tag: 'LEARN', color: 'green' },
]

export default function Landing() {
  const [openFaq, setOpenFaq] = useState(0)
  const navigate = useNavigate()
  return (
    <div className="landing-page">
      <header className="landing-nav">
        <Logo size={36} />
        <nav><Link to="/app/community">Community</Link><a href="#tools">Tools</a><a href="#how-it-works">Blog</a></nav>
        <div className="landing-nav-actions"><Link to="/app/plans" className="ad-free-link">Go ad free</Link><Link to="/login" className="login-link">Log in</Link><Link to="/signup" className="button button-primary button-sm">Start free</Link></div>
      </header>

      <main>
        <section className="landing-hero">
          <div className="hero-copy">
            <span className="eyebrow-pill"><Sparkles size={14} /> Free to use. No card needed</span>
            <h1>Free tools and a community for people who <span>publish online</span></h1>
            <p>Auto post to eight social sites, write full articles on your own blog, make AI videos and shorts, and ask 5,900+ other creators what is actually working. One free account for all of it.</p>
            <div className="hero-buttons"><Link to="/app/community" className="button button-secondary button-md"><MessageSquare size={17} /> Open the community</Link><Link to="/signup" className="button button-dark button-md">Start free <ArrowRight size={17} /></Link></div>
            <div className="hero-benefits"><span><Check /> 16 free tools</span><span><Check /> No monthly plan</span><span><Check /> One account for everything</span></div>
          </div>
          <div className="hero-brand-card">
            <div className="hero-mark-wrap"><AlphaMark size={150} /></div>
            <h2>AlphaPost</h2>
            <p>One account. Every tool. And people who answer.</p>
            <div className="hero-socials">{['Facebook', 'Instagram', 'X', 'Pinterest', 'Telegram', 'TikTok', 'YouTube'].map((platform) => <PlatformIcon key={platform} platform={platform} size="sm" />)}</div>
          </div>
        </section>

        <section className="live-stats" aria-label="AlphaPost community statistics">
          <span className="live-label"><i /> LIVE NUMBERS <small>from AlphaPost right now</small></span>
          <div className="stats-grid">
            {[['5,900+', 'members'], ['104,010+', 'articles published'], ['57,960+', 'posts sent'], ['8,430+', 'videos made'], ['870+', 'community posts']].map(([value, label]) => <div key={label}><strong>{value}</strong><span>{label}</span></div>)}
          </div>
          <span className="countries"><Globe2 size={14} /> 118 countries</span>
        </section>

        <section className="landing-section community-preview">
          <div className="section-heading"><h2>The community comes first</h2><p>Most people who publish online work alone. Here they do not have to. Ask what is working, share what you built, and read before you post.</p></div>
          <div className="community-card-grid">{communityPosts.map((post) => <article className="landing-community-card" key={post.title}><div className="community-author"><span className={`avatar-dot badge-${post.color}`}>{post.name[0]}</span><div><strong>{post.name}</strong><small>{post.time} ago · Community</small></div><span className="post-tag">{post.tag}</span></div><h3>{post.title}</h3><footer><span><Heart size={14} /> {Math.floor(post.title.length / 2)}</span><span><MessageSquare size={14} /> {post.name.length % 6}</span><Link to="/app/community">Read <ArrowRight size={14} /></Link></footer></article>)}</div>
          <Link to="/app/community" className="button button-dark button-md centered-button"><MessageSquare size={17} /> Open the community</Link>
          <span className="grow-learn-earn">Grow, Learn & Earn</span>
        </section>

        <section className="landing-section tools-section" id="tools">
          <div className="section-heading"><h2>Everything AlphaPost does</h2><p>Sixteen free tools on one account, and each one has its own job.</p></div>
          <div className="landing-tools-grid">{tools.map((tool) => <Link to={tool.path} className="landing-tool-card" key={tool.name}><ToolIcon name={tool.icon} color={tool.color} /><div><h3>{tool.name} {tool.badge && <span className="new-badge">{tool.badge}</span>}</h3><p>{tool.description}</p></div><ArrowRight size={15} /></Link>)}</div>
        </section>

        <section className="landing-section how-section" id="how-it-works">
          <div className="section-heading"><h2>How it works</h2><p>Four steps, and then it runs without you.</p></div>
          <div className="steps-grid">
            {[
              ['Make a free account', 'One login opens every tool and the community. No card.'],
              ['Connect what you have', 'A Facebook Page, an Instagram account, a blog, Pinterest, Telegram, X, TikTok or YouTube.'],
              ['Add your free Gemini key', 'Bring Google AI credits to write and translate. It stays yours and stays encrypted.'],
              ['Set it and leave it', 'Pick a topic and a time. AlphaPost writes, makes and posts while you do something else.'],
            ].map(([title, text], index) => <article className="how-card" key={title}><span className="step-number">{index + 1}</span><h3>{title}</h3>{index === 0 ? <><p>{text}</p><Link to="/signup" className="text-link">Make my account <ArrowRight size={14} /></Link></> : index === 1 ? <div className="how-links"><Link to="/app/accounts">Discover more <ChevronDown size={14} /></Link><span>Social media automation</span><span>AI video maker</span><span>Blog automation tool</span></div> : index === 2 ? <div className="how-links"><Link to="/app/gemini">Discover more <ChevronDown size={14} /></Link><span>Content publishing</span><span>Free marketing tools</span><span>Social media scheduler</span></div> : <><p>{text}</p><Link to="/app/auto-post" className="text-link">Start making today <ArrowRight size={14} /></Link></>}</article>)}
          </div>
        </section>

        <section className="landing-section faq-section">
          <div className="section-heading"><h2>Questions people ask</h2></div>
          <div className="faq-list">{faqs.map(([question, answer], index) => <button className={`faq-item ${openFaq === index ? 'open' : ''}`} key={question} onClick={() => setOpenFaq(openFaq === index ? -1 : index)}><div><span>{question}</span><span className="faq-plus">{openFaq === index ? '−' : '+'}</span></div>{openFaq === index && <p>{answer}</p>}</button>)}</div>
        </section>

        <section className="landing-cta"><h2>Start with one free account</h2><p>Every tool, the community and the Android app, with no card and no trial.</p><Button variant="dark" onClick={() => navigate('/signup')}>Start free <ArrowRight size={17} /></Button></section>
      </main>

      <footer className="landing-footer"><div className="footer-main"><div className="footer-brand"><Logo size={36} /><p>Free tools and a community for people who publish online. Write once, make AI videos and full blog articles, all on one free account.</p><div className="hero-socials">{['Facebook', 'Instagram', 'X', 'Pinterest', 'YouTube'].map((platform) => <PlatformIcon key={platform} platform={platform} size="sm" />)}</div><Link to="/signup" className="button button-primary button-sm">Start free</Link><Link to="/app/learn-earn" className="footer-learn"><Play size={14} /> Learn on YouTube</Link></div><div><h3>MAKE THINGS</h3><Link to="/app/video-automation">AI video maker</Link><Link to="/app/shorts-maker">Shorts Maker</Link><Link to="/app/video-translator">Video Translator</Link><Link to="/app/pin-maker">Carousel maker</Link></div><div><h3>POST EVERYWHERE</h3><Link to="/app/accounts">Facebook Page auto post</Link><Link to="/app/auto-post">Instagram auto post</Link><Link to="/app/pin-affiliate">Pinterest tools</Link><Link to="/app/auto-post">Telegram channel auto post</Link><Link to="/app/auto-post">X (Twitter) auto post</Link></div><div><h3>BLOG AND EARN</h3><Link to="/app/blogger">Blogger automation</Link><Link to="/app/keyword-research">Keyword Research</Link><Link to="/app/aeo-checker">AEO Checker</Link><Link to="/app/website">Website to social</Link><Link to="/app/community">AI tools Community</Link><Link to="/login">Log in</Link></div></div><div className="footer-bottom"><span>© 2026 AlphaPost. Built for people who make things.</span><div><a href="#privacy">Privacy</a><a href="#terms">Terms</a><a href="mailto:hello@alphapost.app">Contact</a></div></div></footer>
    </div>
  )
}
