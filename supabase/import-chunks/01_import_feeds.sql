begin;
insert into public.digest_feeds (id, name, url, topic, weight, active, last_fetched, article_count)
values
  ('feed-hn', 'Hacker News', 'https://news.ycombinator.com/rss', 'Technology', 10, true, '2026-03-08T15:11:45.441Z'::timestamptz, 19),
  ('feed-mit', 'MIT Tech Review', 'https://www.technologyreview.com/feed/', 'AI', 9, true, '2026-03-08T15:11:45.441Z'::timestamptz, 10),
  ('feed-krebs', 'Krebs on Security', 'https://krebsonsecurity.com/feed/', 'Cybersecurity', 9, true, '2026-03-08T15:11:45.441Z'::timestamptz, 10),
  ('feed-pragmatic', 'The Pragmatic Engineer', 'https://newsletter.pragmaticengineer.com/feed', 'Engineering', 8, true, '2026-03-08T15:11:45.441Z'::timestamptz, 20),
  ('feed-arxiv', 'ArXiv CS.AI', 'https://arxiv.org/rss/cs.AI', 'AI', 7, true, '2026-03-08T15:11:45.441Z'::timestamptz, 0),
  ('feed-darkreading', 'Dark Reading', 'https://www.darkreading.com/rss.xml', 'Cybersecurity', 7, true, '2026-03-08T15:11:45.441Z'::timestamptz, 20),
  ('feed-techcrunch', 'TechCrunch', 'https://techcrunch.com/feed/', 'Technology', 8, true, '2026-03-08T15:11:45.441Z'::timestamptz, 20),
  ('feed-ars', 'Ars Technica', 'https://feeds.arstechnica.com/arstechnica/index', 'Technology', 7, true, '2026-03-08T15:11:45.441Z'::timestamptz, 20),
  ('feed-openai', 'OpenAI News', 'https://openai.com/news/rss.xml', 'AI', 10, true, '2026-03-08T15:11:45.441Z'::timestamptz, 20),
  ('feed-nvd', 'NIST CVE Feed', 'https://services.nvd.nist.gov/rest/json/cves/2.0', 'Cybersecurity', 6, true, '2026-03-08T15:11:45.441Z'::timestamptz, 19)
on conflict (id) do update set
  name = excluded.name,
  url = excluded.url,
  topic = excluded.topic,
  weight = excluded.weight,
  active = excluded.active,
  last_fetched = excluded.last_fetched,
  article_count = excluded.article_count;
commit;
