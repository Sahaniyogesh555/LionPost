(() => {
  const video = document.querySelector('[data-source-video]');
  const canvas = document.querySelector('[data-short-canvas]');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const file = document.querySelector('[data-video-file]');
  const startEl = document.querySelector('[data-start]');
  const endEl = document.querySelector('[data-end]');
  const statusEl = document.querySelector('[data-cut-status]');
  const cutBtn = document.querySelector('[data-cut]');
  const dlBtn = document.querySelector('[data-download-clip]');
  const csrf = () => (document.cookie.match(/(?:^|;\s*)lion_csrf=([^;]+)/) || [])[1] || '';
  let clipUrl = null;
  let busy = false;

  function drawFrame() {
    ctx.fillStyle = '#05060a';
    ctx.fillRect(0, 0, W, H);
    if (video && video.videoWidth) {
      const scale = Math.max(W / video.videoWidth, H / video.videoHeight);
      const dw = video.videoWidth * scale, dh = video.videoHeight * scale;
      ctx.drawImage(video, (W - dw) / 2, (H - dh) / 2, dw, dh);
    }
    const g = ctx.createLinearGradient(0, H * 0.55, 0, H);
    g.addColorStop(0, 'rgba(5,6,10,0)');
    g.addColorStop(1, 'rgba(5,6,10,.92)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#F5B942';
    ctx.fillRect(84, H - 300, 54, 8);
    ctx.font = '600 30px Inter, system-ui, sans-serif';
    ctx.fillStyle = '#FFF7E6';
    ctx.fillText('@yourhandle', 84, H - 200);
    ctx.font = '400 26px Inter, system-ui, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,.6)';
    ctx.fillText('Captured in LionPost', 84, H - 150);
  }

  file?.addEventListener('change', () => {
    const f = file.files[0];
    if (!f) return;
    if (clipUrl) URL.revokeObjectURL(clipUrl);
    video.src = URL.createObjectURL(f);
    video.load();
    video.addEventListener('loadedmetadata', () => {
      endEl.value = Math.min(Number(video.duration) || 20, 20).toFixed(1);
      endEl.max = video.duration;
      startEl.max = video.duration;
      drawFrame();
      if (statusEl) statusEl.textContent = `${video.duration.toFixed(1)}s loaded. Pick a range.`;
    }, { once: true });
  });

  video?.addEventListener('seeked', drawFrame);
  video?.addEventListener('loadeddata', drawFrame);

  cutBtn?.addEventListener('click', async () => {
    if (!video.src || busy) return;
    busy = true;
    cutBtn.disabled = true;
    const start = Math.max(0, Number(startEl.value) || 0);
    const end = Math.min(video.duration || 60, Number(endEl.value) || start + 10);
    if (end <= start) { statusEl.textContent = 'End has to be after start.'; busy = false; cutBtn.disabled = false; return; }
    if (statusEl) statusEl.innerHTML = '<span class="rec-dot"></span> Capturing the range…';
    video.currentTime = start;
    await new Promise((r) => video.addEventListener('seeked', r, { once: true }));

    const stream = canvas.captureStream(30);
    const chunks = [];
    const type = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'].find((m) => window.MediaRecorder?.isTypeSupported(m)) || '';
    const rec = new MediaRecorder(stream, type ? { mimeType: type, videoBitsPerSecond: 4_000_000 } : undefined);
    rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };

    const done = new Promise((resolve) => {
      rec.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        if (clipUrl) URL.revokeObjectURL(clipUrl);
        clipUrl = URL.createObjectURL(blob);
        dlBtn.disabled = false;
        if (statusEl) statusEl.textContent = `Clip ready: ${(blob.size / 1024 / 1024).toFixed(1)} MB of WebM.`;
        resolve();
      };
    });

    rec.start(200);
    await video.play();
    const loop = () => {
      drawFrame();
      if (video.currentTime >= end) { video.pause(); rec.stop(); return; }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
    await done;
    busy = false;
    cutBtn.disabled = false;
  });

  dlBtn?.addEventListener('click', () => {
    if (!clipUrl) return;
    const a = document.createElement('a');
    a.href = clipUrl;
    a.download = `lionpost-short-${Date.now()}.webm`;
    a.click();
  });

  // ---------- subtitles ----------
  const srtIn = document.querySelector('[data-srt]');
  const srtOut = document.querySelector('[data-srt-out]');
  const shiftInput = document.querySelector('[data-shift]');
  const srtStatus = document.querySelector('[data-srt-status]');
  const parseTs = (s) => {
    const m = s.match(/(\d{2}):(\d{2}):(\d{2})[,.](\d{3})/);
    if (!m) return null;
    return ((+m[1]) * 3600 + (+m[2]) * 60 + (+m[3])) * 1000 + (+m[4]);
  };
  const fmtTs = (ms) => {
    ms = Math.max(0, Math.round(ms));
    const h = String(Math.floor(ms / 3600000)).padStart(2, '0');
    const m = String(Math.floor((ms % 3600000) / 60000)).padStart(2, '0');
    const s = String(Math.floor((ms % 60000) / 1000)).padStart(2, '0');
    const t = String(ms % 1000).padStart(3, '0');
    return `${h}:${m}:${s},${t}`;
  };
  const shift = (text, seconds) => text.replace(/(\d{2}:\d{2}:\d{2}[,.]\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}[,.]\d{3})/g, (_, a, b) =>
    `${fmtTs(parseTs(a) + seconds * 1000)} --> ${fmtTs(parseTs(b) + seconds * 1000)}`);

  document.querySelector('[data-shift-apply]')?.addEventListener('click', () => {
    if (!srtIn.value.trim()) { srtStatus.textContent = 'Paste an SRT first.'; return; }
    srtOut.value = shift(srtIn.value, Number(shiftInput.value) || 0);
    srtStatus.textContent = `Shifted by ${Number(shiftInput.value) || 0}s.`;
  });

  document.querySelector('[data-download-srt]')?.addEventListener('click', () => {
    const text = srtOut.value || srtIn.value;
    if (!text.trim()) { srtStatus.textContent = 'Nothing to export yet.'; return; }
    const blob = new Blob([text], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'lionpost-subtitles.srt';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 3000);
  });

  document.querySelector('[data-translate]')?.addEventListener('click', async () => {
    if (!srtIn.value.trim()) { srtStatus.textContent = 'Paste an SRT first.'; return; }
    srtStatus.textContent = 'Translating…';
    try {
      const res = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-csrf': decodeURIComponent(csrf()) },
        body: JSON.stringify({ srt: srtIn.value, language: document.querySelector('[data-lang]').value, shift: Number(shiftInput.value) || 0 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Translation failed');
      if (data.needsKey) {
        srtStatus.textContent = data.error;
        srtOut.value = shift(srtIn.value, Number(shiftInput.value) || 0);
        return;
      }
      srtOut.value = shift(data.srt, Number(shiftInput.value) || 0);
      srtStatus.textContent = `Translated to ${data.language}. Timings preserved.`;
    } catch (err) {
      srtStatus.textContent = err.message;
    }
  });

  drawFrame();
})();
