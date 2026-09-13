-- Expose only the authenticated user's primary account UUID to Expo.
-- Financial rows remain behind the agent/MCP boundary.

create or replace function public.get_primary_account_id()
returns uuid
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select account.id
  from public.accounts as account
  where account.user_id = (select auth.uid())
  order by
    case account.account_type
      when 'checking' then 0
      when 'savings' then 1
      when 'credit' then 2
      else 3
    end,
    account.created_at,
    account.id
  limit 1
$$;

revoke all on function public.get_primary_account_id() from public;
revoke all on function public.get_primary_account_id() from anon;
grant execute on function public.get_primary_account_id() to authenticated;

comment on function public.get_primary_account_id() is
  'Returns only the current authenticated user primary account UUID for agent request context.';
