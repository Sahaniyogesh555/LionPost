alter table public.social_accounts drop constraint if exists social_accounts_connection_type_check;
alter table public.social_accounts add constraint social_accounts_connection_type_check
  check (connection_type in ('local', 'telegram', 'blogger'));
