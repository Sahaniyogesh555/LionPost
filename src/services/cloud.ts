import { supabase } from '../lib/supabase'
import type { AppNotification, Automation, Post, SocialAccount, UserProfile } from '../types'

export interface CloudWorkspace {
  posts: Post[]
  accounts: SocialAccount[]
  automations: Automation[]
  notifications: AppNotification[]
  profile: UserProfile
}

function check(error: { message: string } | null) {
  if (error) throw new Error(error.message)
}

function profileRow(userId: string, profile: UserProfile) {
  return {
    user_id: userId,
    name: profile.name,
    email: profile.email,
    about: profile.about,
    website: profile.website,
    phone: profile.phone,
    country: profile.country,
    photo: profile.photo || null,
    updated_at: new Date().toISOString(),
  }
}

function postRow(userId: string, post: Post) {
  return {
    user_id: userId,
    id: post.id,
    text: post.text,
    platforms: post.platforms,
    status: post.status,
    created_at: post.createdAt,
    scheduled_at: post.scheduledAt || null,
    image: post.image || null,
    first_comment: post.firstComment || null,
    publish_results: post.publishResults || [],
  }
}

function accountRow(userId: string, account: SocialAccount) {
  return {
    user_id: userId,
    id: account.id,
    platform: account.platform,
    name: account.name,
    handle: account.handle,
    status: account.status,
    connection_type: account.connectionType || 'local',
    external_id: account.externalId || null,
    bot_username: account.botUsername || null,
  }
}

function automationRow(userId: string, automation: Automation) {
  return {
    user_id: userId,
    id: automation.id,
    kind: automation.kind,
    name: automation.name,
    detail: automation.detail,
    active: automation.active,
    created_at: automation.createdAt,
    platforms: automation.platforms,
    topic: automation.topic || null,
    language: automation.language || null,
    source_url: automation.sourceUrl || null,
    seen_ids: automation.seenIds || [],
    last_run_at: automation.lastRunAt || null,
    ai_caption: automation.aiCaption ?? null,
  }
}

function notificationRow(userId: string, notification: AppNotification) {
  return {
    user_id: userId,
    id: notification.id,
    title: notification.title,
    body: notification.body,
    time: notification.time,
    read: notification.read,
    type: notification.type,
  }
}

export async function loadWorkspace(userId: string): Promise<CloudWorkspace> {
  const [profile, posts, accounts, automations, notifications] = await Promise.all([
    supabase.from('profiles').select('*').eq('user_id', userId).maybeSingle(),
    supabase.from('posts').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
    supabase.from('social_accounts').select('*').eq('user_id', userId).order('created_at', { ascending: true }),
    supabase.from('automations').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
    supabase.from('notifications').select('*').eq('user_id', userId),
  ])
  check(profile.error)
  check(posts.error)
  check(accounts.error)
  check(automations.error)
  check(notifications.error)

  return {
    profile: profile.data ? {
      name: profile.data.name || '',
      email: profile.data.email || '',
      about: profile.data.about || '',
      website: profile.data.website || '',
      phone: profile.data.phone || '',
      country: profile.data.country || '',
      photo: profile.data.photo || undefined,
    } : { name: '', email: '', about: '', website: '', phone: '', country: '' },
    posts: (posts.data || []).map((row) => ({
      id: row.id,
      text: row.text || '',
      platforms: row.platforms || [],
      status: row.status,
      createdAt: row.created_at,
      scheduledAt: row.scheduled_at || undefined,
      image: row.image || undefined,
      firstComment: row.first_comment || undefined,
      publishResults: row.publish_results || [],
    })),
    accounts: (accounts.data || []).map((row) => ({
      id: row.id,
      platform: row.platform,
      name: row.name || '',
      handle: row.handle || '',
      status: row.status,
      connectionType: row.connection_type || 'local',
      externalId: row.external_id || undefined,
      botUsername: row.bot_username || undefined,
    })),
    automations: (automations.data || []).map((row) => ({
      id: row.id,
      kind: row.kind,
      name: row.name || '',
      detail: row.detail || '',
      active: row.active,
      createdAt: row.created_at,
      platforms: row.platforms || [],
      topic: row.topic || undefined,
      language: row.language || undefined,
      sourceUrl: row.source_url || undefined,
      seenIds: row.seen_ids || [],
      lastRunAt: row.last_run_at || undefined,
      aiCaption: row.ai_caption ?? undefined,
    })),
    notifications: (notifications.data || []).map((row) => ({
      id: row.id,
      title: row.title || '',
      body: row.body || '',
      time: row.time || '',
      read: row.read,
      type: row.type,
    })),
  }
}

export async function saveWorkspace(userId: string, workspace: CloudWorkspace) {
  const writes = [
    supabase.from('profiles').upsert(profileRow(userId, workspace.profile)),
    workspace.posts.length ? supabase.from('posts').upsert(workspace.posts.map((item) => postRow(userId, item)), { onConflict: 'user_id,id' }) : Promise.resolve({ error: null }),
    workspace.accounts.length ? supabase.from('social_accounts').upsert(workspace.accounts.map((item) => accountRow(userId, item)), { onConflict: 'user_id,id' }) : Promise.resolve({ error: null }),
    workspace.automations.length ? supabase.from('automations').upsert(workspace.automations.map((item) => automationRow(userId, item)), { onConflict: 'user_id,id' }) : Promise.resolve({ error: null }),
    workspace.notifications.length ? supabase.from('notifications').upsert(workspace.notifications.map((item) => notificationRow(userId, item)), { onConflict: 'user_id,id' }) : Promise.resolve({ error: null }),
  ]
  const results = await Promise.all(writes)
  results.forEach((result) => check(result.error))
}

export const cloud = {
  upsertPost: async (userId: string, post: Post) => check((await supabase.from('posts').upsert(postRow(userId, post), { onConflict: 'user_id,id' })).error),
  deletePost: async (userId: string, id: string) => check((await supabase.from('posts').delete().eq('user_id', userId).eq('id', id)).error),
  upsertAccount: async (userId: string, account: SocialAccount) => check((await supabase.from('social_accounts').upsert(accountRow(userId, account), { onConflict: 'user_id,id' })).error),
  deleteAccount: async (userId: string, id: string) => check((await supabase.from('social_accounts').delete().eq('user_id', userId).eq('id', id)).error),
  upsertAutomation: async (userId: string, automation: Automation) => check((await supabase.from('automations').upsert(automationRow(userId, automation), { onConflict: 'user_id,id' })).error),
  deleteAutomation: async (userId: string, id: string) => check((await supabase.from('automations').delete().eq('user_id', userId).eq('id', id)).error),
  upsertProfile: async (userId: string, profile: UserProfile) => check((await supabase.from('profiles').upsert(profileRow(userId, profile))).error),
  upsertNotifications: async (userId: string, notifications: AppNotification[]) => {
    if (notifications.length) check((await supabase.from('notifications').upsert(notifications.map((item) => notificationRow(userId, item)), { onConflict: 'user_id,id' })).error)
  },
  clearWorkspace: async (userId: string) => {
    const results = await Promise.all([
      supabase.from('posts').delete().eq('user_id', userId),
      supabase.from('automations').delete().eq('user_id', userId),
      supabase.from('notifications').delete().eq('user_id', userId),
      supabase.from('social_accounts').delete().eq('user_id', userId),
      supabase.from('profiles').delete().eq('user_id', userId),
    ])
    results.forEach((result) => check(result.error))
  },
}
