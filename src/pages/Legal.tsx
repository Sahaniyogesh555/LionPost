import { useEffect, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, ArrowRight, FileText, Mail, ShieldCheck } from 'lucide-react'
import Logo from '../components/Logo'

const SUPPORT_EMAIL = 'developeryogesh555@gmail.com'
const LAST_UPDATED = '29 October 2026'

function LegalSection({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return <section id={id} className="legal-section"><h2>{title}</h2>{children}</section>
}

function LegalShell({ page, title, description, children }: { page: 'privacy' | 'terms'; title: string; description: string; children: ReactNode }) {
  useEffect(() => {
    const previousTitle = document.title
    document.title = `${title} — LionPost`
    return () => { document.title = previousTitle }
  }, [title])

  return <div className="legal-page">
    <header className="legal-nav">
      <Logo size={36} />
      <nav aria-label="Legal pages"><Link className={page === 'privacy' ? 'active' : ''} to="/privacy">Privacy</Link><Link className={page === 'terms' ? 'active' : ''} to="/terms">Terms</Link></nav>
      <Link to="/login" className="button button-secondary button-sm">Log in</Link>
    </header>

    <main className="legal-main">
      <Link to="/" className="back-link standalone-back"><ArrowLeft size={14} /> Back to home</Link>
      <header className="legal-hero">
        <span className="legal-hero-icon">{page === 'privacy' ? <ShieldCheck /> : <FileText />}</span>
        <div><span className="legal-kicker">LionPost legal</span><h1>{title}</h1><p>{description}</p><small>Last updated: {LAST_UPDATED}</small></div>
      </header>

      <div className="legal-layout">
        <aside className="legal-aside">
          <div className="legal-aside-card"><span className="legal-aside-label">DOCUMENTS</span><Link className={page === 'privacy' ? 'active' : ''} to="/privacy"><ShieldCheck size={15} /> Privacy Policy</Link><Link className={page === 'terms' ? 'active' : ''} to="/terms"><FileText size={15} /> Terms of Service</Link></div>
          <div className="legal-aside-card legal-aside-contact"><Mail size={19} /><h2>Need help?</h2><p>Questions about these terms or your data?</p><a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a></div>
        </aside>
        <article className="legal-document">{children}<footer className="legal-document-footer"><span>Also read our <Link to={page === 'privacy' ? '/terms' : '/privacy'}>{page === 'privacy' ? 'Terms of Service' : 'Privacy Policy'}</Link>.</span><Link to="/" className="text-link">Back to LionPost <ArrowRight size={14} /></Link></footer></article>
      </div>
    </main>

    <footer className="legal-footer"><span>© 2026 LionPost. Built for people who make things.</span><div><Link to="/privacy">Privacy</Link><Link to="/terms">Terms</Link><a href={`mailto:${SUPPORT_EMAIL}`}>Contact</a></div></footer>
  </div>
}

export function PrivacyPolicy() {
  return <LegalShell page="privacy" title="Privacy Policy" description="How LionPost collects, uses, protects and deletes information when you create, connect and publish.">
    <LegalSection id="overview" title="1. About this policy">
      <p>This Privacy Policy applies to LionPost at <Link to="/">lionpost.vercel.app</Link>, including its account, content creation, cloud workspace and connected publishing tools. It explains the information we handle and the choices available to you.</p>
      <p>LionPost is operated as an independent publishing tool. For privacy questions or requests, contact <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.</p>
    </LegalSection>

    <LegalSection id="information" title="2. Information we collect">
      <p>We collect only the information needed to provide and protect the features you choose to use:</p>
      <ul>
        <li><strong>Account information:</strong> your name, email address and authentication details. Passwords are processed by Supabase Auth and are not stored as plain text in the LionPost application database.</li>
        <li><strong>Workspace content:</strong> drafts, posts, prompts, images, project settings, automation preferences, schedules and publishing results that you create or save.</li>
        <li><strong>Connected-account information:</strong> platform, account and blog identifiers, display names, handles, blog URLs, connection status and the credentials needed for a connection.</li>
        <li><strong>Discovery inputs:</strong> websites, feeds, topics and other source URLs that you ask LionPost to read.</li>
        <li><strong>Browser and technical information:</strong> authentication sessions, theme and workspace preferences stored in your browser. Vercel and Supabase may also process standard request, device, IP and security logs when delivering the service.</li>
      </ul>
    </LegalSection>

    <LegalSection id="use" title="3. How we use information">
      <p>We use information to authenticate you, synchronize your workspace, save your work, provide discovery and creation tools, generate content when you request it, publish only when you direct us to, maintain security, prevent abuse, troubleshoot problems and respond to support requests.</p>
      <p>We do not sell personal information or use your private workspace content for advertising profiles. LionPost does not display third-party website advertisements.</p>
    </LegalSection>

    <LegalSection id="google-data" title="4. Google user data, Blogger and YouTube">
      <p>When you choose <strong>Connect Blogger</strong>, LionPost requests Google authorization for <code>openid</code>, <code>email</code> and <code>https://www.googleapis.com/auth/blogger</code>. The Blogger permission allows LionPost to discover your available Blogger blogs and publish articles through your selected connection.</p>
      <p>When you separately choose <strong>Connect YouTube</strong>, LionPost uses a dedicated YouTube OAuth client and requests <code>https://www.googleapis.com/auth/youtube.readonly</code> and <code>https://www.googleapis.com/auth/youtube.upload</code>. These permissions allow channel discovery and the video uploads you direct. YouTube authorization is not combined with Blogger authorization.</p>
      <ul>
        <li>We use your Google email, channel metadata and basic connection metadata to identify the relevant connection in your workspace.</li>
        <li>We use Blogger blog IDs, names and URLs to let you select a blog, and YouTube channel IDs, names and handles to identify an upload destination.</li>
        <li>We use Google authorization codes and tokens only to establish the selected connection, refresh access and perform the Blogger or YouTube actions you request.</li>
        <li>Your offline Google refresh tokens are encrypted with AES-256-GCM before they are stored in our Supabase database. Google access tokens are used for authorized API requests and are not returned to your browser.</li>
      </ul>
      <p>We do not sell Google user data, use it for advertising, use it to train AI models or use it for purposes unrelated to the Google connection and publishing features you request. We do not share it with unrelated third parties.</p>
      <p>LionPost’s use and transfer to any other app of information received from Google APIs adheres to the <a href="https://developers.google.com/terms/api-services-user-data-policy#additional_requirements_for_specific_api_scopes" target="_blank" rel="noreferrer">Google API Services User Data Policy, including the Limited Use requirements</a>.</p>
    </LegalSection>

    <LegalSection id="ai-providers" title="5. Gemini, social platforms and other providers">
      <ul>
        <li><strong>Gemini:</strong> you provide your own Gemini API key. The raw key is kept in browser session storage and is not saved in the LionPost cloud database. Requests go directly from your browser to Google. Prompts and generated content may be saved in your workspace when you choose to save them.</li>
        <li><strong>Telegram:</strong> when you connect a bot and chat, LionPost validates the connection, encrypts the bot token and sends content to Telegram only for the connection and publishing actions you request.</li>
        <li><strong>Meta, X, TikTok and Pinterest:</strong> when you choose a connection, the provider returns account/profile data and authorization credentials that LionPost uses for account discovery and your requested publishing. Encryptable offline credentials are stored only in the server-side credential table. TikTok Direct Post sends content to the profile workflow you approve; TikTok inbox-draft mode instead sends media for you to review, edit and publish inside TikTok.</li>
        <li><strong>Dailymotion:</strong> you supply a private API key and secret so LionPost can validate access, discover manageable profiles and upload videos. Both values are encrypted before storage and are not saved in browser storage.</li>
        <li><strong>Temporary publishing media:</strong> uploads are kept in a private owner-scoped bucket while needed for a publishing attempt. Depending on the provider, media is transferred as bytes, Base64 or a temporary signed URL. TikTok photo publishing requires a signed LionPost URL that TikTok can fetch; anyone with that unguessable URL can read the image until it expires or the temporary object is removed.</li>
        <li><strong>Public discovery sources:</strong> when you request a website, feed, sitemap or trend lookup, the relevant source provider receives the request needed to return that public content.</li>
      </ul>
      <p>Your use of a third-party provider is also subject to that provider’s terms and privacy policy.</p>
    </LegalSection>

    <LegalSection id="sharing" title="6. When information is shared">
      <p>We share information only as needed to operate LionPost, at your direction or for legal and safety reasons:</p>
      <ul>
        <li><strong>Infrastructure providers:</strong> Supabase provides authentication and cloud database services; Vercel provides hosting and serverless functions.</li>
        <li><strong>User-directed publishing:</strong> content and the necessary connection data are sent to Google/Blogger, Telegram or another destination when you ask LionPost to connect or publish.</li>
        <li><strong>Legal and protection needs:</strong> information may be disclosed when reasonably necessary to comply with law, protect users, investigate abuse or defend the security and integrity of LionPost.</li>
      </ul>
      <p>We do not provide your encrypted credential table to browser roles, and we do not sell or rent your connected-account credentials.</p>
    </LegalSection>

    <LegalSection id="retention" title="7. Retention and deletion">
      <p>Account and workspace records are retained while your account is active and until you delete the relevant content or your account. Encrypted connection credentials are retained while the connection is active and are deleted when you disconnect that account or delete your LionPost account.</p>
      <p>Temporary publishing uploads are removed on a best-effort basis after the selected publishing attempts finish. If TikTok is still downloading a photo, its owner-scoped temporary object can remain until a terminal status check so the transfer can complete. Signed media URLs expire automatically; saved drafts, post images and publishing history remain subject to the workspace retention described above.</p>
      <p>Deleting a LionPost connection or account does not delete content already published on Blogger, Telegram or another third-party platform. You can manage that published content through the destination platform. Provider backups and security logs may take additional time to expire under the provider’s retention practices.</p>
    </LegalSection>

    <LegalSection id="security" title="8. Security">
      <p>LionPost uses HTTPS, Supabase authentication and row-level access rules, owner-scoped cloud records and AES-256-GCM encryption for connected-account credentials. Browser roles are not allowed to read the encrypted social-connections credential table.</p>
      <p>No online service can guarantee absolute security. Use a strong unique password, protect your API keys and review connected accounts regularly. Contact us if you believe your account or credentials may be at risk.</p>
    </LegalSection>

    <LegalSection id="choices" title="9. Your choices and rights">
      <p>You can review and edit your profile and workspace content, disconnect connected services, delete posts and use the account-deletion feature in LionPost. You can also clear browser storage, although this may remove local preferences or work that has not been synchronized.</p>
      <p>Depending on your location, you may have additional rights to access, correct, delete or restrict the use of personal information. Contact <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> for help with a privacy request.</p>
    </LegalSection>

    <LegalSection id="browser-storage" title="10. Cookies and browser storage">
      <p>LionPost uses browser local and session storage for authentication, security, preferences, drafts and backward-compatible migration of existing LionPost workspaces. Gemini session keys use session-only browser storage. We do not use advertising cookies on LionPost.</p>
    </LegalSection>

    <LegalSection id="international-children" title="11. International processing and children">
      <p>Our infrastructure and third-party providers may process information in countries other than yours. Their handling is also governed by their own terms and privacy commitments.</p>
      <p>LionPost is not directed to children under 13 or anyone below the minimum age required to use the relevant connected services in their jurisdiction. Do not create an account if you do not meet those requirements.</p>
    </LegalSection>

    <LegalSection id="changes-contact" title="12. Changes and contact">
      <p>We may update this policy when LionPost features or legal requirements change. The latest version will be posted on this page with a revised date, and material changes may receive additional notice where appropriate.</p>
      <p>Privacy contact: <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.</p>
    </LegalSection>
  </LegalShell>
}

export function TermsOfService() {
  return <LegalShell page="terms" title="Terms of Service" description="The rules for using LionPost, your content and connected publishing accounts.">
    <LegalSection id="agreement" title="1. Agreement and eligibility">
      <p>These Terms of Service govern your access to LionPost at <Link to="/">lionpost.vercel.app</Link>. By creating an account or using LionPost, you agree to these Terms and our <Link to="/privacy">Privacy Policy</Link>.</p>
      <p>You must be able to form a binding agreement where you live and meet the minimum age required by LionPost and any connected service. If you use LionPost for an organization, you confirm that you have authority to act for that organization.</p>
    </LegalSection>

    <LegalSection id="service" title="2. The service">
      <p>LionPost provides browser-based content creation, discovery, cloud workspace and connected publishing tools. Available features can vary by provider, account permissions, API availability and your own third-party credentials.</p>
      <p>Some tools are currently offered without charge. We may improve, change, suspend or discontinue features when necessary for maintenance, security, provider changes or the continued operation of LionPost.</p>
    </LegalSection>

    <LegalSection id="accounts" title="3. Your account and security">
      <p>Provide accurate account information and keep your password, API keys and connected-account access secure. You are responsible for activity performed through your account and for promptly notifying us if you suspect unauthorized access.</p>
      <p>Do not share account access in a way that bypasses security controls, and do not use another person’s account or credentials without permission.</p>
    </LegalSection>

    <LegalSection id="connections" title="4. Connected platforms and permissions">
      <p>When you connect Blogger, Telegram or another service, you authorize LionPost to perform only the actions covered by that connection and your requests. You must own the connected account or have permission to use it.</p>
      <p>You are responsible for reviewing connection permissions and for complying with the destination platform’s terms, API rules, content policies and usage limits. You can disconnect a provider in LionPost; content already published must be managed on that provider.</p>
    </LegalSection>

    <LegalSection id="content" title="5. Your content">
      <p>You retain ownership of the content and materials you create, upload or publish through LionPost. You give LionPost a limited, non-exclusive permission to host, process, format and transmit that content only as needed to provide the features you use.</p>
      <p>You are responsible for your content and for having the necessary rights, licenses and permissions for it. Before publishing, review titles, text, labels, links, images, destination accounts and publishing results.</p>
    </LegalSection>

    <LegalSection id="ai" title="6. AI-assisted features">
      <p>AI-generated suggestions, drafts, translations and other outputs may be inaccurate, incomplete or unsuitable for your audience. Review and edit them before use or publication. You are responsible for the final content and for ensuring that your use complies with applicable law and third-party rights.</p>
      <p>Your Gemini use requires your own valid API key and is also governed by Google’s applicable terms. Do not submit confidential information or personal data that you do not have permission to process.</p>
    </LegalSection>

    <LegalSection id="acceptable-use" title="7. Acceptable use">
      <p>You must not use LionPost to:</p>
      <ul>
        <li>publish unlawful, infringing, deceptive or harmful material, or facilitate spam and platform manipulation;</li>
        <li>harass people, violate privacy or distribute malicious code;</li>
        <li>access accounts, tokens, data or systems without authorization;</li>
        <li>probe, disrupt, overload or bypass LionPost or provider security and rate limits;</li>
        <li>misrepresent LionPost output as reviewed or endorsed by a third-party platform; or</li>
        <li>use the service in a way that violates applicable law or the rules of a connected platform.</li>
      </ul>
    </LegalSection>

    <LegalSection id="third-parties" title="8. Third-party services">
      <p>Google, Blogger, Telegram, Supabase, Vercel, feed providers and other linked services are operated by their respective providers. LionPost is not responsible for their independent outages, policy decisions, account enforcement, API changes or content practices.</p>
      <p>A connection or publishing result does not mean that a third-party platform sponsors or endorses LionPost.</p>
    </LegalSection>

    <LegalSection id="intellectual-property" title="9. LionPost intellectual property">
      <p>The LionPost interface, branding, original software and service materials are protected by applicable intellectual-property laws. These Terms do not give you ownership of LionPost’s branding or software. You may not copy, resell or misrepresent the service except where applicable law or a separate written permission allows it.</p>
    </LegalSection>

    <LegalSection id="disclaimers" title="10. Disclaimers">
      <p>LionPost is provided on an “as available” basis. We do not guarantee uninterrupted availability, error-free operation, accurate AI output, successful third-party publishing or preservation of every provider feature. You are responsible for maintaining appropriate backups of important content.</p>
      <p>Nothing in these Terms excludes a warranty or right that cannot legally be excluded in your jurisdiction.</p>
    </LegalSection>

    <LegalSection id="liability" title="11. Limitation of liability">
      <p>To the maximum extent permitted by law, the LionPost operator will not be liable for indirect, incidental, special or consequential losses, or for losses caused by third-party platform actions outside LionPost’s reasonable control.</p>
      <p>Nothing in this section limits liability that cannot lawfully be limited, including liability for intentional misconduct or other non-excludable obligations.</p>
    </LegalSection>

    <LegalSection id="termination" title="12. Suspension and account deletion">
      <p>You may stop using LionPost and delete your account through the available account controls. We may restrict or suspend access when reasonably necessary to address abuse, security risks, unlawful use, provider requirements or material violations of these Terms.</p>
      <p>Account deletion removes LionPost records covered by the deletion workflow, but it does not remove content already published to third-party platforms.</p>
    </LegalSection>

    <LegalSection id="changes-contact" title="13. Changes and contact">
      <p>We may update these Terms as LionPost evolves. The current version will be posted here with its revision date. Continued use after an update means you accept the revised Terms, subject to any notice or consent required by law.</p>
      <p>Questions about these Terms can be sent to <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.</p>
    </LegalSection>
  </LegalShell>
}
