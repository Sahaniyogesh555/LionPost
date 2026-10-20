// Keyword research engine. Offline and deterministic: every number is an
// estimate derived from the seed, clearly labelled as such in the UI.

import { hashString } from './generator.js';

const PATTERNS = [
  ['{s}', 'head'],
  ['how to {s}', 'informational'],
  ['{s} tips', 'informational'],
  ['best {s} tools', 'commercial'],
  ['{s} for beginners', 'informational'],
  ['{s} checklist', 'informational'],
  ['{s} examples', 'informational'],
  ['{s} vs alternatives', 'commercial'],
  ['is {s} worth it', 'commercial'],
  ['free {s}', 'transactional'],
  ['{s} template', 'informational'],
  ['{s} mistakes', 'informational'],
  ['{s} guide', 'informational'],
  ['{s} strategy', 'informational'],
  ['{s} automation', 'commercial'],
  ['{s} for small business', 'commercial'],
  ['{s} schedule', 'informational'],
  ['{s} ideas', 'informational'],
  ['{s} pricing', 'transactional'],
  ['{s} reviews', 'commercial'],
  ['what is {s}', 'informational'],
  ['why {s} is not working', 'informational'],
];

const MODIFIER_WEIGHT = {
  '{s}': 1.0, 'best {s} tools': 0.72, 'how to {s}': 0.66, '{s} for beginners': 0.52,
  '{s} checklist': 0.34, '{s} template': 0.38, '{s} vs alternatives': 0.44,
  'is {s} worth it': 0.4, 'free {s}': 0.48, '{s} pricing': 0.36, '{s} reviews': 0.42,
};

function rngFor(seed) {
  let a = hashString(seed);
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const round = (n, step) => Math.max(step, Math.round(n / step) * step);

export function research(rawSeed, { market = 'US', limit = 22 } = {}) {
  const seed = String(rawSeed || '').trim().toLowerCase().replace(/\s+/g, ' ');
  if (seed.length < 2) throw new Error('Enter a topic with at least two characters');
  if (seed.length > 60) throw new Error('Keep the topic under 60 characters');
  const rng = rngFor(seed + market);
  const words = seed.split(' ').length;
  const keywords = [];
  const seen = new Set();

  for (const [pattern, intent] of PATTERNS) {
    const phrase = pattern.replace('{s}', seed);
    if (seen.has(phrase)) continue;
    seen.add(phrase);
    const h = hashString(phrase + market);
    const r = rngFor(phrase + market + h);
    const base = 2400 + (h % 7600);
    const weight = MODIFIER_WEIGHT[pattern] ?? 0.3;
    const volume = round(base * weight * (words > 3 ? 0.55 : 1) * (0.7 + r() * 0.6), 10);
    const difficulty = Math.max(3, Math.min(88, Math.round(12 + weight * 58 + (h % 17) + (words > 3 ? -7 : 0))));
    const cpc = Math.round((0.15 + (h % 380) / 100 + weight * 0.6) * 100) / 100;
    const trend = Array.from({ length: 8 }, (_, i) => {
      const wobble = Math.sin((h % 20) + i * 0.9) * 0.18 + (r() - 0.5) * 0.12;
      return Math.round((1 + wobble + i * 0.012) * 100);
    });
    const direction = trend[7] >= trend[0] ? 'up' : 'down';
    const opportunity = Math.round(((volume / 1000) * (100 - difficulty) / 100) * 10) / 10;
    keywords.push({
      keyword: phrase, volume, difficulty, cpc, intent, trend, direction, opportunity,
      cluster: pattern === '{s}' ? 'head' : intent,
      note: difficulty < 25 ? 'Easy to rank' : difficulty < 50 ? 'Rankable with effort' : 'Needs authority',
    });
  }

  keywords.sort((a, b) => b.opportunity - a.opportunity);
  const picked = keywords.slice(0, limit);
  const totalVolume = picked.reduce((n, k) => n + k.volume, 0);
  const avgDifficulty = Math.round(picked.reduce((n, k) => n + k.difficulty, 0) / picked.length);
  return {
    seed, market, generatedAt: new Date().toISOString(),
    keywords: picked,
    summary: {
      totalVolume,
      avgDifficulty,
      easy: picked.filter((k) => k.difficulty < 25).length,
      questions: picked.filter((k) => /^(how|what|why|is|should)/.test(k.keyword)).length,
      estimated: true,
    },
  };
}
