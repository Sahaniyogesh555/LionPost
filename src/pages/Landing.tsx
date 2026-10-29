import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, Check, ChevronDown, Sparkles } from 'lucide-react'
import Logo, { BrandMark } from '../components/Logo'
import PlatformIcon from '../components/PlatformIcon'
import ToolIcon from '../components/ToolIcon'
import { Button } from '../components/UI'
import { tools } from '../data/tools'

const faqs = [
  ['Is LionPost free?', 'Yes. The publishing tools, video tools and blog tools have a generous free plan. You can start without a credit card.'],
  ['What can LionPost do?', 'LionPost helps you write once and publish everywhere, automate your content, make short videos and manage your creative workflow.'],
  ['Do I need one account for everything?', 'Yes. One LionPost account connects your tools and social channels in one simple workspace.'],
  ['Where do my videos go?', 'Your videos stay on your device until you choose to publish or download them.'],
  ['Is my data safe?', 'Your connected accounts and preferences are private to your workspace. You can disconnect a channel at any time.'],
  ['Is there an app?', 'LionPost works in your phone and desktop browser, so there is nothing to install.'],
]

export default function Landing() {
  const [openFaq, setOpenFaq] = useState(0)
  const navigate = useNavigate()
  return (
    <div className="landing-page">
      <header className="landing-nav">
        <Logo size={36} />
        <nav><a href="#tools">Tools</a><a href="#how-it-works">Blog</a></nav>
        <div className="landing-nav-actions"><Link to="/app/plans" className="ad-free-link">Go ad free</Link><Link to="/login" className="login-link">Log in</Link><Link to="/signup" className="button button-primary button-sm">Start free</Link></div>
      </header>

      <main>
        <section className="landing-hero">
          <div className="hero-copy">
            <span className="eyebrow-pill"><Sparkles size={14} /> Free to use. No card needed</span>
            <h1>Free tools for people who <span>publish online</span></h1>
            <p>Auto post to eight social sites, write full articles on your own blog, and make AI videos and shorts. One free account for all of it.</p>
            <div className="hero-buttons"><a href="#tools" className="button button-secondary button-md"><Sparkles size={17} /> Explore the tools</a><Link to="/signup" className="button button-dark button-md">Start free <ArrowRight size={17} /></Link></div>
            <div className="hero-benefits"><span><Check /> {tools.length} free tools</span><span><Check /> No monthly plan</span><span><Check /> One account for everything</span></div>
          </div>
          <div className="hero-brand-card">
            <div className="hero-mark-wrap"><BrandMark size={150} /></div>
            <h2>LionPost</h2>
            <p>One account. Every tool. Built to help you publish.</p>
            <div className="hero-socials">{['Facebook', 'Instagram', 'X', 'Pinterest', 'Telegram', 'TikTok', 'YouTube'].map((platform) => <PlatformIcon key={platform} platform={platform} size="sm" />)}</div>
          </div>
        </section>

        <section className="landing-section tools-section" id="tools">
          <div className="section-heading"><h2>Everything LionPost does</h2><p>{tools.length} free tools on one account, and each one has its own job.</p></div>
          <div className="landing-tools-grid">{tools.map((tool) => <Link to={tool.path} className="landing-tool-card" key={tool.name}><ToolIcon name={tool.icon} color={tool.color} /><div><h3>{tool.name} {tool.badge && <span className="new-badge">{tool.badge}</span>}</h3><p>{tool.description}</p></div><ArrowRight size={15} /></Link>)}</div>
        </section>

        <section className="landing-section how-section" id="how-it-works">
          <div className="section-heading"><h2>How it works</h2><p>Four steps, and then it runs without you.</p></div>
          <div className="steps-grid">
            {[
              ['Make a free account', 'One login opens every tool. No card.'],
              ['Connect what you have', 'A Facebook Page, an Instagram account, a blog, Pinterest, Telegram, X, TikTok or YouTube.'],
              ['Add your free Gemini key', 'Bring Google AI credits to write and translate. It stays yours and stays encrypted.'],
              ['Set it and leave it', 'Pick a topic and a time. LionPost writes, makes and posts while you do something else.'],
            ].map(([title, text], index) => <article className="how-card" key={title}><span className="step-number">{index + 1}</span><h3>{title}</h3>{index === 0 ? <><p>{text}</p><Link to="/signup" className="text-link">Make my account <ArrowRight size={14} /></Link></> : index === 1 ? <div className="how-links"><Link to="/app/accounts">Discover more <ChevronDown size={14} /></Link><span>Social media automation</span><span>AI video maker</span><span>Blog automation tool</span></div> : index === 2 ? <div className="how-links"><Link to="/app/gemini">Discover more <ChevronDown size={14} /></Link><span>Content publishing</span><span>Free marketing tools</span><span>Social media scheduler</span></div> : <><p>{text}</p><Link to="/app/auto-post" className="text-link">Start making today <ArrowRight size={14} /></Link></>}</article>)}
          </div>
        </section>

        <section className="landing-section faq-section">
          <div className="section-heading"><h2>Questions people ask</h2></div>
          <div className="faq-list">{faqs.map(([question, answer], index) => <button className={`faq-item ${openFaq === index ? 'open' : ''}`} key={question} onClick={() => setOpenFaq(openFaq === index ? -1 : index)}><div><span>{question}</span><span className="faq-plus">{openFaq === index ? '−' : '+'}</span></div>{openFaq === index && <p>{answer}</p>}</button>)}</div>
        </section>

        <section className="landing-cta"><h2>Start with one free account</h2><p>Every tool and the Android app, with no card and no trial.</p><Button variant="dark" onClick={() => navigate('/signup')}>Start free <ArrowRight size={17} /></Button></section>
      </main>

      <footer className="landing-footer"><div className="footer-main"><div className="footer-brand"><Logo size={36} /><p>Free tools for people who publish online. Write once, make AI videos and full blog articles, all on one free account.</p><div className="hero-socials">{['Facebook', 'Instagram', 'X', 'Pinterest', 'YouTube'].map((platform) => <PlatformIcon key={platform} platform={platform} size="sm" />)}</div><Link to="/signup" className="button button-primary button-sm">Start free</Link></div><div><h3>MAKE THINGS</h3><Link to="/app/video-automation">AI video maker</Link><Link to="/app/shorts-maker">Shorts Maker</Link><Link to="/app/video-translator">Video Translator</Link><Link to="/app/pin-maker">Carousel maker</Link></div><div><h3>POST EVERYWHERE</h3><Link to="/app/accounts">Facebook Page auto post</Link><Link to="/app/auto-post">Instagram auto post</Link><Link to="/app/pin-affiliate">Pinterest tools</Link><Link to="/app/auto-post">Telegram channel auto post</Link><Link to="/app/auto-post">X (Twitter) auto post</Link></div><div><h3>BLOG AND PUBLISH</h3><Link to="/app/blogger">Blogger automation</Link><Link to="/app/website">Website to social</Link><Link to="/app/trending">Trending topics</Link><Link to="/app/branding">Branding</Link><Link to="/login">Log in</Link></div></div><div className="footer-bottom"><span>© 2026 LionPost. Built for people who make things.</span><div><Link to="/privacy">Privacy</Link><Link to="/terms">Terms</Link><a href="mailto:developeryogesh555@gmail.com">Contact</a></div></div></footer>
    </div>
  )
}
