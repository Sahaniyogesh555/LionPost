import { useRef, useState } from 'react'
import { Bot, Check, ChevronRight, Clapperboard, Download, FileVideo, Globe2, Languages, Music2, Pause, Play, Plus, Scissors, Sparkles, Subtitles, Upload, Video, Wand2, X } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { useLocalStorage, makeId } from '../hooks/useLocalStorage'
import ToolHero from '../components/ToolHero'
import { Button, Card, CheckBox, Field, IconBadge, PageHeader, StepNumber, Toggle } from '../components/UI'

type StudioMode = 'automation' | 'shorts' | 'bee-grow' | 'bee-earn' | 'translator'
interface VideoJob { id: string; name: string; detail: string; date: string; status: string }

const config = {
  automation: { title: 'Video automation', description: 'Tell it your subject. It makes vertical videos with an AI voice, posted to your social pages.', theme: 'dark' as const, icon: <Video />, badges: ['Automatic video', 'AI voice and subtitles', 'Made on your device'] },
  shorts: { title: 'Shorts Maker', description: 'Turn one long video into up to 3 shorts with a hook, subtitles and an AI voice. Made on your own phone or computer.', theme: 'dark' as const, icon: <Scissors />, badges: ['Up to 3 shorts', '10, 20 or 30 seconds', 'AI finds the best parts', 'Your video never leaves your device'] },
  'bee-grow': { title: 'Bee TikTok', description: 'Short, fast clips that make people stop scrolling and follow you.', theme: 'olive' as const, icon: <Music2 />, badges: ['Up to 5 shorts at a time', '10, 20 or 30 seconds', 'AI picks the strongest hooks'] },
  'bee-earn': { title: 'Bee TikTok', description: 'Longer clips that can earn, because TikTok only pays for videos over one minute.', theme: 'olive' as const, icon: <Music2 />, badges: ['2 shorts at a time', 'Always over one minute', 'A full story to the end'] },
  translator: { title: 'Video Translator', description: 'Turn your long video into any language with a natural AI voice, and add subtitles if you want. Made on your own phone or computer.', theme: 'blue' as const, icon: <Languages />, badges: ['40 languages', 'Up to 45 minutes', 'Subtitles on or off'] },
}

export default function VideoStudio({ mode, onModeChange }: { mode: StudioMode; onModeChange?: (mode: 'bee-grow' | 'bee-earn') => void }) {
  const current = config[mode]
  const isAutomation = mode === 'automation'
  const isTranslator = mode === 'translator'
  const isBee = mode.startsWith('bee')
  const fileInput = useRef<HTMLInputElement>(null)
  const [video, setVideo] = useState<{ url: string; name: string; size: number } | null>(null)
  const [subject, setSubject] = useState('Amazing animals')
  const [count, setCount] = useState(mode === 'bee-earn' ? 2 : 3)
  const [length, setLength] = useState(mode === 'bee-earn' ? '90 sec' : 'About 30 sec')
  const [parts, setParts] = useState<'ai' | 'manual'>('ai')
  const [voiceMode, setVoiceMode] = useState<'original' | 'ai'>('original')
  const [subtitles, setSubtitles] = useState(true)
  const [cutPauses, setCutPauses] = useState(true)
  const [language, setLanguage] = useState('English')
  const [voice, setVoice] = useState(isTranslator ? 'Charon' : 'Achird')
  const [textDesign, setTextDesign] = useState('My Design')
  const [music, setMusic] = useState('No music')
  const [frame, setFrame] = useState('Fill the screen')
  const [name, setName] = useState('Sahaniyogesh555')
  const [website, setWebsite] = useState('')
  const [backgroundSound, setBackgroundSound] = useState('Keep a little')
  const [processing, setProcessing] = useState(0)
  const [jobs, setJobs] = useLocalStorage<VideoJob[]>(`alphapost-video-jobs-${mode}`, [])
  const { notify } = useApp()

  const chooseVideo = (file?: File) => {
    if (!file) return
    if (!file.type.startsWith('video/')) return notify('Please choose an MP4, MOV or WebM video.', 'error')
    if (video) URL.revokeObjectURL(video.url)
    setVideo({ url: URL.createObjectURL(file), name: file.name, size: file.size })
    notify('Video added. It stays on this device.', 'info')
  }

  const makeVideo = () => {
    if (!isAutomation && !video) return notify('Pick a video first.', 'error')
    if (isAutomation && !subject.trim()) return notify('Tell us what the video should be about.', 'error')
    let progress = 8
    setProcessing(progress)
    const timer = window.setInterval(() => {
      progress += 23
      if (progress >= 100) {
        window.clearInterval(timer)
        setProcessing(0)
        const jobName = isAutomation ? subject : video?.name || 'Untitled video'
        setJobs((items) => [{ id: makeId('job'), name: jobName, detail: isTranslator ? `${language} · ${voice} voice` : `${count} ${count === 1 ? 'clip' : 'clips'} · ${length} · ${subtitles ? 'Subtitles' : 'No subtitles'}`, date: new Date().toISOString(), status: 'Ready' }, ...items])
        notify(isTranslator ? 'Your translation is ready.' : 'Your videos are ready.')
      } else {
        setProcessing(progress)
      }
    }, 500)
  }

  return <div className="video-studio-page">
    <ToolHero title={current.title} description={current.description} icon={current.icon} badges={current.badges} theme={current.theme}>{isBee && <div className="hero-mode-switch"><button className={mode === 'bee-grow' ? 'active' : ''} onClick={() => onModeChange?.('bee-grow')}>Grow</button><button className={mode === 'bee-earn' ? 'active' : ''} onClick={() => onModeChange?.('bee-earn')}>Earn</button></div>}</ToolHero>
    <div className="video-studio-layout">
      <div className="video-form-column">
        <Card className="video-form-card" title={isAutomation ? 'Make a video' : isTranslator ? 'Translate your video' : isBee ? `Make shorts that ${mode === 'bee-earn' ? 'can earn' : 'grow your account'}` : 'Make shorts from a long video'} subtitle={isAutomation ? 'Your video is made right here on this page.' : 'Your video stays on this device. Nothing is uploaded until you post.'} action={<IconBadge color={isBee ? 'black' : 'orange'}>{isAutomation ? <Clapperboard /> : isTranslator ? <Languages /> : <Scissors />}</IconBadge>}>
          {!isAutomation && <div className="numbered-section"><StepNumber number={1} /><div><div className="section-label-row"><h3>{isTranslator ? 'Pick your video' : 'Your long video'}</h3><small>MP4 or MOV, up to 45 minutes</small></div><button className={`upload-dropzone video-dropzone ${video ? 'has-file' : ''}`} onClick={() => fileInput.current?.click()}>{video ? <><IconBadge color="green"><Check /></IconBadge><strong>{video.name}</strong><span>{(video.size / 1024 / 1024).toFixed(1)} MB · Click to change</span></> : <><IconBadge color="orange" size="lg"><Upload /></IconBadge><strong>{isTranslator ? 'Choose a video' : 'Pick a long video'}</strong><span>MP4 or MOV from your phone or computer. It never leaves your device.</span><span className="button button-primary button-sm"><Plus size={14} /> Choose video</span></>}</button><input ref={fileInput} hidden type="file" accept="video/*" onChange={(event) => chooseVideo(event.target.files?.[0])} /></div></div>}
          {isAutomation && <div className="numbered-section"><StepNumber number={1} /><div><Field label="What it is about"><textarea value={subject} onChange={(event) => setSubject(event.target.value)} /></Field><div className="topic-chips">{['Amazing animals', 'Did you know', 'Artificial intelligence', 'Health tips', 'Science experiments'].map((topic) => <button className={subject === topic ? 'active' : ''} key={topic} onClick={() => setSubject(topic)}>{topic}</button>)}</div><Field label="Or write your own topic"><input value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="Tell the AI what to make" /></Field></div></div>}
          {!isAutomation && !isTranslator && <div className="numbered-section"><StepNumber number={2} /><div><div className="section-label-row"><h3>Your shorts</h3><small>{mode === 'bee-earn' ? 'Over one minute, 2 at a time' : 'Up to 5, short and fast'}</small></div><div className="option-columns"><div><span className="field-label">How many shorts</span>{[1, 2, 3, 4, 5].map((number) => <button key={number} className={`choice-row ${count === number ? 'active' : ''}`} onClick={() => setCount(number)}>{number} {number === 1 ? 'short' : 'shorts'}</button>)}</div><div><span className="field-label">Length of each</span>{(mode === 'bee-earn' ? ['65 sec', '90 sec', '120 sec'] : ['About 10 sec', 'About 20 sec', 'About 30 sec']).map((item) => <button key={item} className={`choice-row ${length === item ? 'active' : ''}`} onClick={() => setLength(item)}>{item}</button>)}</div></div><span className="field-label">Which parts</span><div className="two-choice-grid compact"><button className={`selection-tile ${parts === 'ai' ? 'selected' : ''}`} onClick={() => setParts('ai')}><Sparkles /><strong>AI finds the best parts</strong><span>It listens and picks the moments with the strongest hooks.</span></button><button className={`selection-tile ${parts === 'manual' ? 'selected' : ''}`} onClick={() => setParts('manual')}><Scissors /><strong>I pick the parts</strong><span>Choose where each short starts.</span></button></div></div></div>}
          {isTranslator && <><div className="numbered-section"><StepNumber number={2} /><div><h3>What do you want?</h3><div className="two-choice-grid compact"><button className={`selection-tile ${voiceMode === 'ai' ? 'selected' : ''}`} onClick={() => setVoiceMode('ai')}><Music2 /><strong>New voice</strong><span>The video speaks your language.</span></button><button className={`selection-tile ${voiceMode === 'original' ? 'selected' : ''}`} onClick={() => setVoiceMode('original')}><Subtitles /><strong>Subtitles only</strong><span>Same voice, words on screen.</span></button></div></div></div><div className="numbered-section"><StepNumber number={3} /><div><Field label="Language"><select value={language} onChange={(event) => setLanguage(event.target.value)}>{['English', 'Nepali', 'Hindi', 'Spanish', 'French', 'German', 'Arabic', 'Japanese'].map((item) => <option key={item}>{item}</option>)}</select></Field></div></div></>}
          <div className="numbered-section"><StepNumber number={isTranslator ? 4 : 3} /><div><h3>{isTranslator ? 'Voice' : 'Voice and subtitles'}</h3>{!isTranslator && <div className="two-choice-grid compact"><button className={`selection-tile ${voiceMode === 'original' ? 'selected' : ''}`} onClick={() => setVoiceMode('original')}><Play /><strong>Original voice</strong><span>Keep the sound of the video.</span></button><button className={`selection-tile ${voiceMode === 'ai' ? 'selected' : ''}`} onClick={() => setVoiceMode('ai')}><Sparkles /><strong>AI voice</strong><span>A new voice says it in any language.</span></button></div>}{(voiceMode === 'ai' || isAutomation || isTranslator) && <><Field label="Language"><select value={language} onChange={(event) => setLanguage(event.target.value)}>{['English', 'Nepali', 'Hindi', 'Spanish', 'French'].map((item) => <option key={item}>{item}</option>)}</select></Field><div className="voice-grid">{['Puck', 'Charon', 'Fenrir', 'Kore', 'Aoede', 'Leda', 'Zephyr'].map((item) => <button className={voice === item ? 'active' : ''} key={item} onClick={() => setVoice(item)}><strong>{item}</strong><small>{item === 'Charon' ? 'Deep and calm' : item === 'Puck' ? 'Bright and quick' : 'Natural AI voice'}</small></button>)}</div></>}{!isTranslator && <><div className="toggle-setting"><span><strong>Subtitles</strong><small>Words show on the video as they are spoken.</small></span><Toggle checked={subtitles} onChange={setSubtitles} /></div><div className="toggle-setting"><span><strong>Cut the pauses</strong><small>Removes silent gaps so the short feels fast.</small></span><Toggle checked={cutPauses} onChange={setCutPauses} /></div></>}</div></div>
          {isTranslator && <><div className="numbered-section"><StepNumber number={5} /><div><h3>Subtitles</h3><div className="two-choice-grid compact"><button className={`selection-tile ${subtitles ? 'selected' : ''}`} onClick={() => setSubtitles(true)}><Subtitles /><strong>Yes, add subtitles</strong><span>Takes longer, made on your device.</span></button><button className={`selection-tile ${!subtitles ? 'selected' : ''}`} onClick={() => setSubtitles(false)}><ZapIcon /><strong>No subtitles</strong><span>Very fast.</span></button></div></div></div><div className="numbered-section"><StepNumber number={6} /><div><h3>Old sound in the back</h3><div className="segmented-control"><button className={backgroundSound === 'Keep a little' ? 'active' : ''} onClick={() => setBackgroundSound('Keep a little')}>Keep a little</button><button className={backgroundSound === 'Remove it' ? 'active' : ''} onClick={() => setBackgroundSound('Remove it')}>Remove it</button></div></div></div></>}
          {!isTranslator && <div className="numbered-section"><StepNumber number={4} /><div><h3>Look</h3><Field label="Text design"><select value={textDesign} onChange={(event) => setTextDesign(event.target.value)}><option>My Design</option><option>Bold Hook</option><option>Minimal Caption</option></select></Field><Field label="Background music"><select value={music} onChange={(event) => setMusic(event.target.value)}><option>No music</option><option>Calm ambient</option><option>Upbeat creator</option><option>Cinematic</option></select></Field>{!isAutomation && <><span className="field-label">Video in the frame</span><div className="segmented-control"><button className={frame === 'Fill the screen' ? 'active' : ''} onClick={() => setFrame('Fill the screen')}>Fill the screen</button><button className={frame !== 'Fill the screen' ? 'active' : ''} onClick={() => setFrame('Show all, blurred sides')}>Show all, blurred sides</button></div><Field label="Name at the bottom"><input value={name} onChange={(event) => setName(event.target.value)} /></Field><Field label="Website or handle"><input value={website} onChange={(event) => setWebsite(event.target.value)} placeholder="yoursite.com" /></Field></>}</div></div>}
          <p className="helper-text legal-note">Use your own videos, or videos you have the right to use. Reposting other people's videos can get your page limited.</p>
          <Button variant={isTranslator ? 'blue' : isBee ? 'dark' : 'primary'} size="lg" onClick={makeVideo} disabled={processing > 0}>{processing > 0 ? <><span className="spinner" /> Making your video… {processing}%</> : <>{isAutomation ? <Video /> : isTranslator ? <Languages /> : <Scissors />}{isAutomation ? 'Make my video' : isTranslator ? `Translate to ${language}` : `Make ${count} ${count === 1 ? 'short' : 'shorts'}`}<ChevronRight /></>}</Button>
          {processing > 0 && <div className="processing-bar"><span style={{ width: `${processing}%` }} /></div>}
        </Card>
      </div>
      <Card className="video-preview-card" title={isTranslator ? 'Your translation' : isAutomation ? 'Your video' : 'Your shorts'} subtitle="Pick a video to see your design here."><div className="phone-preview">{video ? <video src={video.url} controls /> : <><IconBadge color={isBee ? 'black' : 'orange'} size="lg">{isAutomation ? <Clapperboard /> : isTranslator ? <Languages /> : <Scissors />}</IconBadge><h3>Your {isTranslator ? 'translation' : isAutomation ? 'video' : 'shorts'} shows here</h3><p>{isAutomation ? 'Tell us your subject, then press Make my video.' : 'Pick a long video, then tap Make.'}</p></>}{subtitles && video && <span className="preview-subtitle">Your story starts here.</span>}</div></Card>
    </div>
    <Card className="video-history" title={isAutomation ? 'Video history' : 'My shorts on this device'} subtitle="Your latest creations. They are saved only in this browser."><div className="video-job-list">{jobs.length ? jobs.map((job) => <article key={job.id}><div className="job-thumbnail"><FileVideo /></div><div><h3>{job.name}</h3><p>{job.detail}</p><small>{new Date(job.date).toLocaleString()} · <span>{job.status}</span></small></div><Button size="sm" variant="secondary" icon={<Download size={14} />} onClick={() => video ? (window.open(video.url, '_blank'), notify('Your video opened in a new tab.')) : notify('Choose the source video to export this job.', 'info')}>Export</Button></article>) : <div className="empty-state compact"><IconBadge><Clapperboard /></IconBadge><h3>No videos yet</h3><p>Your creations will be kept here after you make them.</p></div>}</div></Card>
    <Card className="text-designs" title="Text designs" subtitle="Hooks text above and below your video. Use the top trending fonts." action={<Button size="sm" icon={<Plus size={14} />} onClick={() => notify('A new blank text design was added.', 'info')}>New design</Button>}><div className="text-design-preview"><div><img src="/assets/workspace.jpg" alt="Text design preview" /><strong>YOUR NEXT BIG IDEA</strong><span>@yourhandle</span></div><h4>My Design</h4><Button size="sm" onClick={() => notify('Text design editor opened.', 'info')}>Edit</Button></div><div className="preview-languages"><span>Preview in</span>{['English', 'Urdu', 'Hindi', 'Bangla'].map((item) => <button className={language === item ? 'active' : ''} key={item} onClick={() => setLanguage(item)}>{item}</button>)}</div></Card>
  </div>
}

export function BeeTikTok() {
  const [mode, setMode] = useState<'landing' | 'bee-grow' | 'bee-earn'>('landing')
  if (mode !== 'landing') return <><button className="back-link standalone-back" onClick={() => setMode('landing')}>← Back to Bee TikTok</button><VideoStudio mode={mode} onModeChange={setMode} /></>
  return <div><ToolHero title="Bee TikTok" description="One long video in, TikTok shorts out. Made on your own phone or computer, then posted straight to TikTok." icon={<Music2 />} badges={['Only for TikTok', 'Straight to your profile', 'Your video never leaves your device']} theme="olive" /><div className="two-choice-grid bee-choice-grid"><button className="choice-card" onClick={() => setMode('bee-grow')}><IconBadge size="lg"><Sparkles /></IconBadge><h2>Grow my TikTok account</h2><p>Short, fast clips that make people stop scrolling and follow you.</p><ul><li><Check /> Up to 5 shorts at a time</li><li><Check /> 10, 20 or 30 seconds</li><li><Check /> The AI picks the strongest hooks</li></ul><span className="button button-primary button-md">Start <ChevronRight /></span></button><button className="choice-card dark-choice" onClick={() => setMode('bee-earn')}><IconBadge color="black" size="lg"><span>$</span></IconBadge><h2>Earn money from TikTok</h2><p>Longer clips that can earn, because TikTok only pays for videos over one minute.</p><ul><li><Check /> 2 shorts at a time</li><li><Check /> Always over one minute</li><li><Check /> A full story, so people watch to the end</li></ul><span className="button button-dark button-md">Start <ChevronRight /></span></button></div><Card title="How it works"><div className="steps-grid">{[['Pick one long video', 'From your phone or computer. It never leaves your device.'], ['AlphaPost finds the best parts', 'The AI listens, then the strongest parts are picked by hook and sound.'], ['Post to TikTok in one tap', 'Straight to your profile, or send it over and TikTok notifies you.'], ['Or set the times', 'Pick many shorts, give each one a time, and they go out by themselves.']].map(([title, text], index) => <article className="how-card" key={title}><StepNumber number={index + 1} /><h3>{title}</h3><p>{text}</p></article>)}</div></Card></div>
}

function ZapIcon() { return <Sparkles /> }
