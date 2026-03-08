create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.digest_feeds (
  id text primary key,
  name text not null,
  url text not null unique,
  topic text not null check (topic in ('AI', 'Cybersecurity', 'Engineering', 'Technology')),
  weight integer not null check (weight between 1 and 10),
  active boolean not null default true,
  last_fetched timestamptz,
  article_count integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.digest_articles (
  id text primary key,
  feed_id text not null references public.digest_feeds(id) on delete cascade,
  feed_name text not null,
  title text not null,
  url text not null unique,
  topic text not null check (topic in ('AI', 'Cybersecurity', 'Engineering', 'Technology')),
  published_at timestamptz not null,
  fetched_at timestamptz not null,
  full_text text not null,
  summary text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists digest_articles_feed_id_idx on public.digest_articles(feed_id);
create index if not exists digest_articles_published_at_idx on public.digest_articles(published_at desc);

create table if not exists public.digest_runs (
  id text primary key,
  date timestamptz not null,
  status text not null check (status in ('success', 'partial', 'failed')),
  total_articles integer not null default 0,
  included_articles integer not null default 0,
  duration text not null,
  errors jsonb not null default '[]'::jsonb,
  triggered_by text not null check (triggered_by in ('manual', 'scheduler')),
  preview text not null default '',
  selected_article_ids text[] not null default '{}',
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists digest_runs_date_idx on public.digest_runs(date desc);

create table if not exists public.digest_config (
  id integer primary key check (id = 1),
  topic_limits jsonb not null,
  summary_length text not null check (summary_length in ('brief', 'medium', 'detailed')),
  recipients jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.digest_test_emails (
  id text primary key,
  sent_at timestamptz not null,
  recipient_count integer not null default 0,
  subject text not null,
  preview text not null,
  delivery_mode text not null check (delivery_mode in ('preview_only', 'smtp', 'resend')),
  delivered boolean not null default false,
  created_at timestamptz not null default timezone('utc', now())
);

drop trigger if exists digest_feeds_set_updated_at on public.digest_feeds;
create trigger digest_feeds_set_updated_at
before update on public.digest_feeds
for each row execute function public.set_updated_at();

drop trigger if exists digest_config_set_updated_at on public.digest_config;
create trigger digest_config_set_updated_at
before update on public.digest_config
for each row execute function public.set_updated_at();

alter table public.digest_feeds enable row level security;
alter table public.digest_articles enable row level security;
alter table public.digest_runs enable row level security;
alter table public.digest_config enable row level security;
alter table public.digest_test_emails enable row level security;

drop policy if exists "digest_feeds_public_all" on public.digest_feeds;
create policy "digest_feeds_public_all" on public.digest_feeds for all
to anon, authenticated
using (true)
with check (true);

drop policy if exists "digest_articles_public_read" on public.digest_articles;
create policy "digest_articles_public_read" on public.digest_articles for select
to anon, authenticated
using (true);

drop policy if exists "digest_articles_service_write" on public.digest_articles;
create policy "digest_articles_service_write" on public.digest_articles for all
to service_role
using (true)
with check (true);

drop policy if exists "digest_runs_public_read" on public.digest_runs;
create policy "digest_runs_public_read" on public.digest_runs for select
to anon, authenticated
using (true);

drop policy if exists "digest_runs_service_write" on public.digest_runs;
create policy "digest_runs_service_write" on public.digest_runs for all
to service_role
using (true)
with check (true);

drop policy if exists "digest_config_public_all" on public.digest_config;
create policy "digest_config_public_all" on public.digest_config for all
to anon, authenticated
using (true)
with check (true);

drop policy if exists "digest_test_emails_public_read" on public.digest_test_emails;
create policy "digest_test_emails_public_read" on public.digest_test_emails for select
to anon, authenticated
using (true);

drop policy if exists "digest_test_emails_service_write" on public.digest_test_emails;
create policy "digest_test_emails_service_write" on public.digest_test_emails for all
to service_role
using (true)
with check (true);

insert into public.digest_config (id, topic_limits, summary_length, recipients)
values (
  1,
  '{"AI":3,"Cybersecurity":2,"Engineering":2,"Technology":2}'::jsonb,
  'medium',
  '[]'::jsonb
)
on conflict (id) do update
set topic_limits = excluded.topic_limits,
    summary_length = excluded.summary_length
where public.digest_config.id = 1;

insert into public.digest_feeds (id, name, url, topic, weight, active, last_fetched, article_count)
values
  ('feed-hn', 'Hacker News', 'https://news.ycombinator.com/rss', 'Technology', 10, true, null, 0),
  ('feed-mit', 'MIT Tech Review', 'https://www.technologyreview.com/feed/', 'AI', 9, true, null, 0),
  ('feed-krebs', 'Krebs on Security', 'https://krebsonsecurity.com/feed/', 'Cybersecurity', 9, true, null, 0),
  ('feed-pragmatic', 'The Pragmatic Engineer', 'https://newsletter.pragmaticengineer.com/feed', 'Engineering', 8, true, null, 0),
  ('feed-arxiv', 'ArXiv CS.AI', 'https://arxiv.org/rss/cs.AI', 'AI', 7, true, null, 0),
  ('feed-darkreading', 'Dark Reading', 'https://www.darkreading.com/rss.xml', 'Cybersecurity', 7, true, null, 0),
  ('feed-techcrunch', 'TechCrunch', 'https://techcrunch.com/feed/', 'Technology', 8, true, null, 0),
  ('feed-ars', 'Ars Technica', 'https://feeds.arstechnica.com/arstechnica/index', 'Technology', 7, true, null, 0),
  ('feed-openai', 'OpenAI News', 'https://openai.com/news/rss.xml', 'AI', 10, true, null, 0),
  ('feed-nvd', 'NIST CVE Feed', 'https://services.nvd.nist.gov/rest/json/cves/2.0', 'Cybersecurity', 6, true, null, 0)
on conflict (id) do nothing;
