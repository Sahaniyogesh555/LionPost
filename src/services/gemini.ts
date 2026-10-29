const SESSION_KEY = 'lionpost-gemini-session'
const LEGACY_SESSION_KEY = 'alphapost-gemini-session'
const API_ROOT = 'https://generativelanguage.googleapis.com/v1beta'
const memoryKeys: Record<string, string> = {}

export interface GeminiModel {
  id: string
  displayName: string
}

interface GoogleError {
  error?: { message?: string }
}

function readSession(): Record<string, string> {
  try {
    const saved = sessionStorage.getItem(SESSION_KEY) ?? sessionStorage.getItem(LEGACY_SESSION_KEY)
    return { ...memoryKeys, ...JSON.parse(saved || '{}') as Record<string, string> }
  } catch {
    return { ...memoryKeys }
  }
}

function writeSession(keys: Record<string, string>) {
  Object.assign(memoryKeys, keys)
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(keys))
    sessionStorage.removeItem(LEGACY_SESSION_KEY)
  } catch {
    // The in-memory copy still works when browser storage is unavailable.
  }
}

export function saveSessionGeminiKey(id: string, key: string) {
  writeSession({ ...readSession(), [id]: key })
}

export function getSessionGeminiKey(id: string) {
  return readSession()[id] || ''
}

export function removeSessionGeminiKey(id: string) {
  const keys = readSession()
  delete keys[id]
  delete memoryKeys[id]
  writeSession(keys)
}

export function hasSessionGeminiKeys() {
  return Object.keys(readSession()).length > 0
}

async function googleError(response: Response) {
  let message = `Google Gemini returned HTTP ${response.status}.`
  try {
    const body = await response.json() as GoogleError
    if (body.error?.message) message = body.error.message
  } catch {
    // Keep the HTTP error when the response is not JSON.
  }
  return new Error(message)
}

function modelScore(model: GeminiModel) {
  const id = model.id.toLowerCase()
  if (id.includes('flash-lite')) return 1
  if (id.includes('flash')) return 0
  if (id.includes('pro')) return 2
  return 3
}

export async function listGeminiModels(apiKey: string): Promise<GeminiModel[]> {
  const response = await fetch(`${API_ROOT}/models?pageSize=100`, { headers: { 'x-goog-api-key': apiKey, Accept: 'application/json' } })
  if (!response.ok) throw await googleError(response)
  const body = await response.json() as { models?: { name?: string; displayName?: string; supportedGenerationMethods?: string[] }[] }
  const models = (body.models || []).filter((model) => model.name && model.supportedGenerationMethods?.includes('generateContent')).map((model) => ({
    id: model.name!.replace(/^models\//, ''),
    displayName: model.displayName || model.name!.replace(/^models\//, ''),
  })).filter((model) => /gemini/i.test(model.id))
  if (!models.length) throw new Error('This key did not return any Gemini text-generation models.')
  return models.sort((a, b) => modelScore(a) - modelScore(b) || a.displayName.localeCompare(b.displayName))
}

export async function validateGeminiKey(apiKey: string) {
  const models = await listGeminiModels(apiKey)
  return models.slice(0, 12)
}

export class GeminiKeyRequiredError extends Error {
  constructor() {
    super('Add a Gemini key on the Gemini page before using AI writing.')
    this.name = 'GeminiKeyRequiredError'
  }
}

async function generateWithKey(apiKey: string, prompt: string, systemInstruction: string, maxOutputTokens: number) {
  const models = await listGeminiModels(apiKey)
  let lastError: Error | null = null
  for (const model of models.slice(0, 3)) {
    const response = await fetch(`${API_ROOT}/models/${encodeURIComponent(model.id)}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey, Accept: 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemInstruction }] },
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.8, maxOutputTokens },
      }),
    })
    if (!response.ok) {
      lastError = await googleError(response)
      continue
    }
    const body = await response.json() as { candidates?: { content?: { parts?: { text?: string }[] } }[] }
    const result = body.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('').trim()
    if (result) return result
    lastError = new Error('Gemini returned an empty response. Try a more specific topic.')
  }
  throw lastError || new Error('Gemini could not generate this content.')
}

export async function generateWithGemini(prompt: string, options: { systemInstruction?: string; maxOutputTokens?: number } = {}) {
  const keys = Object.values(readSession()).filter(Boolean)
  if (!keys.length) throw new GeminiKeyRequiredError()
  let lastError: Error | null = null
  for (const key of keys) {
    try {
      return await generateWithKey(key, prompt, options.systemInstruction || 'Write accurate, useful content in clear everyday language. Return only the requested content, with no preamble or explanation.', options.maxOutputTokens || 700)
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Gemini could not generate this content.')
    }
  }
  throw lastError
}

export function generateSocialDraft(topic: string, language = 'English') {
  return generateWithGemini(`Write one original social media post about this topic: ${topic}\nLanguage: ${language}\nMake it specific and useful, with a natural hook and up to three relevant hashtags. Do not use em dashes or generic AI filler.`, { maxOutputTokens: 420 })
}

export function generateBlogDraft(topic: string, language = 'English') {
  return generateWithGemini(`Write a complete, original blog article about: ${topic}\nLanguage: ${language}\nInclude a clear title, an introduction, useful H2-style section headings, practical examples, and a short conclusion. Use plain text headings rather than Markdown symbols. Do not invent statistics, sources, or personal experiences.`, { maxOutputTokens: 1800 })
}

export function generatePinDraft(topic: string) {
  return generateWithGemini(`Write a Pinterest pin about: ${topic}\nReturn a short title on the first line, then a useful description of 2 to 4 sentences, then up to five relevant hashtags. Do not invent prices, discounts, or product claims.`, { maxOutputTokens: 420 })
}
