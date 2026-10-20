(() => {
  const canvas = document.querySelector('[data-deck-canvas]');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const dataEl = document.querySelector('script[data-deck]');
  const deck = dataEl ? JSON.parse(dataEl.textContent) : null;

  const PALETTES = {
    gold: { bg: '#0B0D12', bg2: '#1a1408', accent: '#F5B942', soft: 'rgba(245,185,66,.16)', text: '#FFF7E6', muted: '#C9B68C' },
    mint: { bg: '#07110D', bg2: '#0d1f17', accent: '#6EE7B7', soft: 'rgba(110,231,183,.14)', text: '#ECFDF5', muted: '#8FC9B4' },
    sky: { bg: '#080E18', bg2: '#0d1a2e', accent: '#93C5FD', soft: 'rgba(147,197,253,.14)', text: '#EFF6FF', muted: '#93AFD0' },
    rose: { bg: '#140909', bg2: '#241010', accent: '#FCA5A5', soft: 'rgba(252,165,165,.14)', text: '#FFF1F2', muted: '#D6A0A0' },
    violet: { bg: '#0C0917', bg2: '#181231', accent: '#C4B5FD', soft: 'rgba(196,181,253,.14)', text: '#F5F3FF', muted: '#A99BD0' },
  };

  let slides = deck ? deck.slides.map((s) => ({ ...s })) : [];
  let index = 0;
  const palette = PALETTES[deck?.palette] || PALETTES.gold;
  const handle = deck?.handle || '@lionpost';

  const W = canvas.width;
  const H = canvas.height;

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

  function draw() {
    if (!slides.length) return;
    const s = slides[index];
    const g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, palette.bg2);
    g.addColorStop(1, palette.bg);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    // dotted texture
    ctx.fillStyle = 'rgba(255,255,255,.045)';
    for (let y = 40; y < H; y += 46) for (let x = 40; x < W; x += 46) ctx.fillRect(x, y, 2, 2);

    // accent block
    ctx.fillStyle = palette.accent;
    ctx.fillRect(80, 90, 92, 10);
    ctx.font = '600 26px ui-monospace, Menlo, monospace';
    ctx.fillStyle = palette.accent;
    ctx.letterSpacing = '4px';
    ctx.fillText(String(s.kicker || 'NOTE').toUpperCase(), 80, 160);
    ctx.letterSpacing = '0px';

    // title
    const titleFont = `700 ${Math.round(W * 0.082)}px Inter, system-ui, sans-serif`;
    const titleLines = wrap(s.title, W - 160, titleFont);
    ctx.font = titleFont;
    ctx.fillStyle = palette.text;
    const titleSize = Math.round(W * 0.082);
    let y = H * 0.34 - (titleLines.length - 1) * titleSize * 0.55;
    for (const line of titleLines.slice(0, 5)) { ctx.fillText(line, 80, y); y += titleSize * 1.1; }

    // body
    if (s.body) {
      const bodyFont = `400 ${Math.round(W * 0.038)}px Inter, system-ui, sans-serif`;
      const bodyLines = wrap(s.body, W - 170, bodyFont);
      ctx.font = bodyFont;
      ctx.fillStyle = palette.muted;
      let by = Math.max(y + titleSize * 0.9, H * 0.62);
      for (const line of bodyLines.slice(0, 6)) { ctx.fillText(line, 80, by); by += Math.round(W * 0.052); }
    }

    // footer
    ctx.fillStyle = palette.soft;
    ctx.fillRect(0, H - 150, W, 150);
    ctx.fillStyle = palette.text;
    ctx.font = '600 28px Inter, system-ui, sans-serif';
    ctx.fillText(handle, 80, H - 62);
    ctx.textAlign = 'right';
    ctx.fillStyle = palette.muted;
    ctx.font = '600 24px ui-monospace, Menlo, monospace';
    ctx.fillText(`${String(index + 1).padStart(2, '0')} / ${String(slides.length).padStart(2, '0')}`, W - 80, H - 62);
    ctx.textAlign = 'left';

    // corner mark
    ctx.beginPath();
    ctx.arc(W - 96, 108, 30, 0, Math.PI * 2);
    ctx.fillStyle = palette.accent;
    ctx.fill();
    ctx.fillStyle = palette.bg;
    ctx.font = '800 26px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('L', W - 96, 118);
    ctx.textAlign = 'left';
  }

  function syncForm() {
    const s = slides[index];
    const t = document.querySelector('[data-edit-title]');
    const b = document.querySelector('[data-edit-body]');
    const k = document.querySelector('[data-edit-kicker]');
    if (t) t.value = s.title || '';
    if (b) b.value = s.body || '';
    if (k) k.value = s.kicker || '';
    document.querySelectorAll('[data-slide]').forEach((el, i) => el.classList.toggle('on', i === index));
    const label = document.querySelector('[data-slide-label]');
    if (label) label.textContent = `Slide ${index + 1} of ${slides.length}`;
    draw();
  }

  if (slides.length) {
    document.querySelectorAll('[data-slide]').forEach((btn) => btn.addEventListener('click', () => {
      index = Number(btn.dataset.slide);
      syncForm();
    }));
    document.querySelector('[data-prev-slide]')?.addEventListener('click', () => { index = (index - 1 + slides.length) % slides.length; syncForm(); });
    document.querySelector('[data-next-slide]')?.addEventListener('click', () => { index = (index + 1) % slides.length; syncForm(); });
    ['[data-edit-title]', '[data-edit-body]', '[data-edit-kicker]'].forEach((sel, i) => {
      const el = document.querySelector(sel);
      el?.addEventListener('input', () => {
        const key = ['title', 'body', 'kicker'][i];
        slides[index][key] = el.value;
        draw();
      });
    });

    const download = (i, delay = 0) => setTimeout(() => {
      if (i !== index) { index = i; syncForm(); }
      canvas.toBlob((blob) => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `lionpost-${deck?.topic ? deck.topic.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 30) : 'deck'}-${i + 1}.png`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 3000);
      }, 'image/png');
    }, delay);

    document.querySelector('[data-download-slide]')?.addEventListener('click', () => download(index));
    document.querySelector('[data-download-all]')?.addEventListener('click', () => {
      slides.forEach((_, i) => download(i, i * 500));
    });
    syncForm();
  } else {
    // A branded placeholder so the stage never looks broken.
    ctx.fillStyle = '#0d1018';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#F5B942';
    ctx.fillRect(80, 90, 92, 10);
    ctx.fillStyle = '#FFF7E6';
    ctx.font = `700 ${Math.round(W * 0.075)}px Inter, system-ui, sans-serif`;
    ctx.fillText('Your deck', 80, H * 0.4);
    ctx.fillText('starts here.', 80, H * 0.4 + W * 0.085);
    ctx.fillStyle = '#8b8577';
    ctx.font = `400 ${Math.round(W * 0.038)}px Inter, system-ui, sans-serif`;
    ctx.fillText('Add a topic on the left and build.', 80, H * 0.4 + W * 0.16);
  }
})();
