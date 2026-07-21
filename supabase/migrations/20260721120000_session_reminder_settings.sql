-- STORY-6.3 / Q 3.7 — admin-configurable session reminder timing (default 24h).

insert into public.platform_settings (key, value)
values ('session_reminder_hours_before', '24'::jsonb)
on conflict (key) do nothing;
