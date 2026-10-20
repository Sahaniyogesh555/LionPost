(() => {
  const canvas = document.querySelector('[data-video-canvas]');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;
  const dataEl = document.querySelector('script[data-video-data]');
  const data = dataEl ? JSON.parse(dataEl.textContent) : null;
  const status = document.querySelector('[data-video-status]');
  const playBtn = document.querySelector('[data-video-play]');
  const recordBtn = document.querySelector('[data-video-record]');
  const editor = document.querySelector('[data-scene-editor]');

  const PALETTES = {
    gold: { bg: '#0B0D12', bg2: '#231a08', accent: '#F5B942', text: '#FFF7E6', muted: '#C9B68C' },
    mint: { bg: '#07110D', bg2: '#0f2a1e', accent: '#6EE7B7', text: '#ECFDF5', muted: '#8FC9B4' },
    sky: { bg: '#080E18', bg2: '#102340', accent: '#93C5FD', text: '#EFF6FF', muted: '#93AFD0' },
    rose: { bg: '#140909', bg2: '#2c1212', accent: '#FCA5A5', text: '#FFF1F2', muted: '#D6A0A0' },
  };
  const palette = PALETTES[data?.palette] || PALETTES.gold;
  let scenes = data ? data.scenes.map((s) => ({ ...s })) : [];
  let playing = false;

  function wrap(text, maxWidth, font) {
    ctx.font = font;
    const words = String(text || '').split(/\s+/);
    const lines = [];
    let line = '';
    for (const w of words) {
      const test = line ? line + ' ' + w : w;
      if (ctx.measureText(test).width > maxWidth && line) { lines.push(line); line = w; }
      else line = test;
    }
    if (line) lines.push(line);
    return lines;
  }

  function motif(kind, t) {
    ctx.save();
    const cx = W * 0.78, cy = H * 0.24;
    ctx.globalAlpha = 0.16;
    ctx.strokeStyle = palette.accent;
    ctx.fillStyle = palette.accent;
    if (kind === 'grid') {
      ctx.lineWidth = 2;
      for (let i = 0; i < 9; i++) {
        const x = W * 0.1 + i * W * 0.1;
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
      }
    } else if (kind === 'arc') {
      for (let i = 1; i <= 4; i++) {
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(cx, cy, 90 * i + Math.sin(t + i) * 8, 0, Math.PI * 2);
        ctx.stroke();
      }
    } else if (kind === 'bars') {
      for (let i = 0; i < 7; i++) {
        const h = (120 + Math.sin(t * 1.2 + i * 0.7) * 70 + i * 26);
        ctx.fillRect(W * 0.12 + i * 42, H * 0.62 - h, 22, h);
      }
    } else if (kind === 'orbit') {
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(cx, cy, 150, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(cx, cy, 230, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx + Math.cos(t) * 230, cy + Math.sin(t) * 230, 16, 0, Math.PI * 2);
      ctx.fill();
    } else {
      const r = 210 + Math.sin(t * 0.7) * 12;
      const grad = ctx.createRadialGradient(cx, cy, 10, cx, cy, r);
      grad.addColorStop(0, palette.accent);
      grad.addColorStop(1, 'transparent');
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  function draw(index, progress, totalProgress, t) {
    const scene = scenes[index] || { text: 'Add a topic to begin', sub: '' };
    const g = ctx.createLinearGradient(0, 0, W * 0.4, H);
    g.addColorStop(0, palette.bg2);
    g.addColorStop(1, palette.bg);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    ctx.globalAlpha = 1;
    motif(scene.motif || 'sun', t / 1000);

    // top brand row
    ctx.fillStyle = palette.accent;
    ctx.fillRect(84, 118, 64, 8);
    ctx.font = '600 26px ui-monospace, Menlo, monospace';
    ctx.fillStyle = palette.muted;
    ctx.letterSpacing = '3px';
    ctx.fillText('LIONPOST', 84, 178);
    ctx.letterSpacing = '0px';

    // scene counter
    ctx.textAlign = 'right';
    ctx.font = '600 26px ui-monospace, Menlo, monospace';
    ctx.fillStyle = palette.muted;
    ctx.fillText(`${String(index + 1).padStart(2, '0')} / ${String(scenes.length).padStart(2, '0')}`, W - 84, 178);
    ctx.textAlign = 'left';

    // headline
    const size = Math.round(W * 0.089);
    const lines = wrap(scene.text, W - 170, `700 ${size}px Inter, system-ui, sans-serif`);
    ctx.font = `700 ${size}px Inter, system-ui, sans-serif`;
    ctx.fillStyle = palette.text;
    let y = H * 0.42 - ((lines.length - 1) * size * 0.55);
    for (const line of lines.slice(0, 4)) { ctx.fillText(line, 84, y); y += size * 1.12; }

    // subline
    if (scene.sub) {
      const subSize = Math.round(W * 0.036);
      const subLines = wrap(scene.sub, W - 190, `400 ${subSize}px Inter, system-ui, sans-serif`);
      ctx.font = `400 ${subSize}px Inter, system-ui, sans-serif`;
      ctx.fillStyle = palette.muted;
      let sy = H * 0.73;
      for (const line of subLines.slice(0, 3)) { ctx.fillText(line, 84, sy); sy += subSize * 1.4; }
    }

    // progress
    ctx.fillStyle = 'rgba(255,255,255,.1)';
    ctx.fillRect(84, H - 92, W - 168, 8);
    ctx.fillStyle = palette.accent;
    ctx.fillRect(84, H - 92, (W - 168) * Math.min(1, totalProgress), 8);

    // frame glow
    ctx.strokeStyle = 'rgba(255,255,255,.06)';
    ctx.lineWidth = 2;
    ctx.strokeRect(24, 24, W - 48, H - 48);

    void progress;
  }

  function totalSeconds() {
    return scenes.reduce((n, s) => n + (Number(s.seconds) || 5), 0);
  }

  async function play({ record = false } = {}) {
    if (!scenes.length || playing) return;
    playing = true;
    if (playBtn) playBtn.disabled = true;
    if (recordBtn) recordBtn.disabled = true;
    const total = totalSeconds();
    const started = performance.now();

    let recorder = null;
    if (record) {
      const stream = canvas.captureStream(30);
      const type = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'].find((m) => window.MediaRecorder?.isTypeSupported(m)) || '';
      recorder = new MediaRecorder(stream, type ? { mimeType: type, videoBitsPerSecond: 4_000_000 } : undefined);
      const chunks = [];
      recorder.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `lionpost-${(data?.title || 'video').toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 32)}.webm`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 4000);
        if (status) status.textContent = 'Rendered and downloaded.';
      };
      recorder.start(250);
      if (status) status.innerHTML = '<span class="rec-dot"></span> Rendering in real time. Keep this tab visible.';
    }

    await new Promise((resolve) => {
      const loop = (now) => {
        const elapsed = (now - started) / 1000;
        const t = now - started;
        let acc = 0, idx = 0, local = 0;
        for (let i = 0; i < scenes.length; i++) {
          const d = Number(scenes[i].seconds) || 5;
          if (elapsed < acc + d) { idx = i; local = (elapsed - acc) / d; break; }
          acc += d;
          if (i === scenes.length - 1) { idx = i; local = 1; }
        }
        draw(idx, local, elapsed / total, t);
        if (elapsed >= total) { resolve(); return; }
        requestAnimationFrame(loop);
      };
      requestAnimationFrame(loop);
    });

    if (recorder && recorder.state !== 'inactive') recorder.stop();
    playing = false;
    if (playBtn) playBtn.disabled = false;
    if (recordBtn) recordBtn.disabled = false;
    if (status && !record) status.textContent = 'Preview finished.';
  }

  if (scenes.length) {
    draw(0, 0, 0, 0);
    playBtn?.removeAttribute('disabled');
    recordBtn?.removeAttribute('disabled');
    playBtn?.addEventListener('click', () => play());
    recordBtn?.addEventListener('click', () => play({ record: true }));
    editor?.querySelectorAll('[data-scene-text]').forEach((input, i) => {
      input.addEventListener('input', () => {
        scenes[i].text = input.value;
        if (!playing) draw(0, 0, 0, 0);
      });
    });
  } else {
    draw(0, 0, 0, 0);
  }
})();
