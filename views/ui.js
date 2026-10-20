// Tiny escaping template engine plus shared UI atoms.
export class Safe {
  constructor(value) { this.value = String(value); }
  toString() { return this.value; }
}
export const raw = (v) => new Safe(v ?? '');
export const esc = (v) => String(v ?? '')
  .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;').replaceAll("'", '&#39;');

const renderValue = (v) => {
  if (v == null || v === false) return '';
  if (v instanceof Safe) return v.value;
  if (Array.isArray(v)) return v.map(renderValue).join('');
  return esc(v);
};

export function html(strings, ...values) {
  let out = strings[0];
  for (let i = 0; i < values.length; i++) out += renderValue(values[i]) + strings[i + 1];
  return new Safe(out);
}
export const page = (v) => String(v);

const ICONS = {
  spark: '<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3z"/><path d="M18.5 15.5l.9 2.1 2.1.9-2.1.9-.9 2.1-.9-2.1-2.1-.9 2.1-.9.9-2.1z"/>',
  bolt: '<path d="M13 2L4.5 13.5H11l-1 8.5 8.5-11.5H12l1-8.5z"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M8 3v4M16 3v4M3 10h18"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/>',
  chart: '<path d="M4 20V9M10 20V4M16 20v-7M22 20H2"/>',
  users: '<circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.2 2.7-5.5 6-5.5s6 2.3 6 5.5"/><path d="M16 5.2a3.2 3.2 0 010 5.9M17.5 14.8c2.2.6 3.8 2.4 3.8 4.7"/>',
  grid: '<rect x="3" y="3" width="7.5" height="7.5" rx="2"/><rect x="13.5" y="3" width="7.5" height="7.5" rx="2"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="2"/><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="2"/>',
  pen: '<path d="M4 20l4.5-1 10-10a2.6 2.6 0 00-3.7-3.7l-10 10L4 20z"/><path d="M13.5 6.5l3.7 3.7"/>',
  image: '<rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="8.5" cy="9" r="1.6"/><path d="M21 16l-5-5L7 20"/>',
  video: '<rect x="2.5" y="5" width="13" height="14" rx="3"/><path d="M15.5 10l6-3.5v11l-6-3.5"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
  link: '<path d="M10.5 13.5a4 4 0 005.7 0l2.3-2.3a4 4 0 00-5.7-5.7L11.5 7"/><path d="M13.5 10.5a4 4 0 00-5.7 0l-2.3 2.3a4 4 0 005.7 5.7l1.3-1.3"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.6 3 2.6 15 0 18M12 3c-2.6 3-2.6 15 0 18"/>',
  shield: '<path d="M12 3l7.5 3v6c0 4.2-3 7.6-7.5 9-4.5-1.4-7.5-4.8-7.5-9V6L12 3z"/><path d="M9 12l2 2 4-4"/>',
  check: '<path d="M5 13l4 4L19 7"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  play: '<path d="M8 5.5l11 6.5-11 6.5v-13z"/>',
  pause: '<rect x="7" y="5" width="3.5" height="14" rx="1"/><rect x="13.5" y="5" width="3.5" height="14" rx="1"/>',
  trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 00.3 1.9l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.9-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.9.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.9 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1A1.7 1.7 0 004.6 9a1.7 1.7 0 00-.3-1.9l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.9.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.9-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.9V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z"/>',
  logout: '<path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4"/><path d="M10 8l-4 4 4 4M6 12h11"/>',
  home: '<path d="M3 11l9-8 9 8v9a1.5 1.5 0 01-1.5 1.5H15v-7H9v7H4.5A1.5 1.5 0 013 20v-9z"/>',
  heart: '<path d="M12 20s-7.5-4.6-9.2-9A5.2 5.2 0 0112 5.6 5.2 5.2 0 0121.2 11c-1.7 4.4-9.2 9-9.2 9z"/>',
  comment: '<path d="M21 12a8 8 0 01-8 8H8l-5 3V12a8 8 0 018-8h2a8 8 0 018 8z"/>',
  pin: '<path d="M12 21s7-6.3 7-11a7 7 0 10-14 0c0 4.7 7 11 7 11z"/><circle cx="12" cy="10" r="2.6"/>',
  lock: '<rect x="4" y="10" width="16" height="11" rx="3"/><path d="M8 10V7a4 4 0 018 0v3"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a1 1 0 011-1h9"/>',
  download: '<path d="M12 3v12M7 10l5 5 5-5M4 21h16"/>',
  wand: '<path d="M4 20l10-10M14 4l1 3 3 1-3 1-1 3-1-3-3-1 3-1 1-3z"/><path d="M19 13l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7.7-2z"/>',
  refresh: '<path d="M20 11a8 8 0 10-1.6 5.6"/><path d="M20 5v6h-6"/>',
  eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="2.8"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="3"/><path d="M4 7l8 6 8-6"/>',
  fire: '<path d="M12 22c4 0 7-3 7-7 0-4-3-6-4-9-2 2-3 4-3 6-1-1-2-2-2-4-2 2-5 5-5 8 0 4 3 6 7 6z"/>',
  folder: '<path d="M3 7a2 2 0 012-2h4l2 3h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z"/>',
};

export function icon(name, size = 18, cls = '') {
  return raw(`<svg class="i ${cls}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ICONS.spark}</svg>`);
}

export function logo(size = 34) {
  return raw(`<svg class="logo-mark" width="${size}" height="${size}" viewBox="0 0 40 40" aria-hidden="true">
    <defs><linearGradient id="lp-gold" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#FFD97A"/><stop offset="1" stop-color="#E89B1C"/></linearGradient></defs>
    <path d="M20 2.5l4.1 3.6 5.3-1.3 1.3 5.3 4.5 4.1-3.2 4.5 1 5.4-5.4 1-3.1 4.5-4.5-3-4.5 3-3.1-4.5-5.4-1 1-5.4L3.8 18.2l4.5-4.1 1.3-5.3 5.3 1.3L20 2.5z" fill="url(#lp-gold)"/>
    <circle cx="20" cy="20" r="9.4" fill="#0B0D12"/>
    <circle cx="16.6" cy="18.4" r="1.5" fill="#FFD97A"/>
    <circle cx="23.4" cy="18.4" r="1.5" fill="#FFD97A"/>
    <path d="M16.4 23.4c2.2 1.7 5 1.7 7.2 0" stroke="#FFD97A" stroke-width="1.7" stroke-linecap="round" fill="none"/>
  </svg>`);
}

export function brand(size = 34) {
  return html`<a class="brand" href="/">${logo(size)}<span class="brand-word">Lion<strong>Post</strong></span></a>`;
}

export function avatar(user, size = 36) {
  const initials = String(user?.name || '?').split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
  const color = user?.avatar_color || '#F5B942';
  return raw(`<span class="avatar" style="--av:${esc(color)};--av-size:${size}px" title="${esc(user?.name || '')}"><span>${esc(initials)}</span></span>`);
}

export function chip(text, tone = 'neutral') {
  return html`<span class="chip ${tone}">${text}</span>`;
}

export function timeAgo(iso) {
  if (!iso) return '';
  const then = new Date(iso).getTime();
  const diff = Math.max(0, Date.now() - then);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: days > 300 ? 'numeric' : undefined });
}

export function dateLong(iso) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function number(n) {
  const x = Number(n) || 0;
  if (x >= 1000000) return (x / 1000000).toFixed(1).replace('.0', '') + 'M';
  if (x >= 1000) return (x / 1000).toFixed(1).replace('.0', '') + 'k';
  return String(x);
}

export function field({ label, name, type = 'text', value = '', placeholder = '', hint = '', required = false, autocomplete = '', rows = 0, attrs = '' }) {
  const id = `f_${name}`;
  return html`<label class="field" for="${id}">
    <span class="field-label">${label}${required ? raw('<i class="req">*</i>') : ''}</span>
    ${rows
      ? html`<textarea id="${id}" name="${name}" rows="${rows}" placeholder="${placeholder}" ${required ? raw('required') : ''} ${raw(attrs)}>${value}</textarea>`
      : html`<input id="${id}" name="${name}" type="${type}" value="${value}" placeholder="${placeholder}"
          ${required ? raw('required') : ''} ${autocomplete ? raw(`autocomplete="${esc(autocomplete)}"`) : ''} ${raw(attrs)}>`}
    ${hint ? html`<span class="field-hint">${hint}</span>` : ''}
  </label>`;
}

export const flashMessages = (flash) => {
  if (!flash) return '';
  const tones = { ok: 'ok', error: 'bad', info: 'info' };
  return html`<div class="flash ${tones[flash.tone] || 'info'}" role="status">${flash.text}</div>`;
};
