alter table public.social_accounts drop constraint if exists social_accounts_connection_type_check;
alter table public.social_accounts add constraint social_accounts_connection_type_check
  check (connection_type in (
    'local',
    'telegram',
    'blogger',
    'x',
    'instagram',
    'facebook',
    'tiktok',
    'youtube',
    'pinterest',
    'dailymotion'
  ));

-- Provider credentials continue to use the server-only social_connections
-- table. No browser RLS policy is added: tokens and private API secrets remain
-- encrypted and inaccessible to anon/authenticated database roles.
-- Temporary publishing media continues to use the private post-media bucket
-- and its owner-only storage policies from 202610290002.
