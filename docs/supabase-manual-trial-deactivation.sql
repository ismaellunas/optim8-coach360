-- Manual trial deactivation (Supabase SQL Editor)
-- Email lives on auth.users, not public.profiles.

-- 1. Find user + subscription by email
select
  p.id as profile_id,
  u.email,
  s.tier,
  s.status,
  s.trial_ends_at,
  s.trial_used_at
from auth.users u
join public.profiles p on p.id = u.id
left join public.subscriptions s on s.profile_id = p.id
where u.email = 'user@example.com';

-- 2. End the trial (downgrade to Basic — matches Flow 9 natural expiry)
update public.subscriptions
set
  tier = 'basic',
  status = 'active',
  trial_ends_at = now(),
  updated_at = now()
where profile_id = '<profile-uuid-from-above>'
  and tier = 'trial'
  and status = 'trialing';
