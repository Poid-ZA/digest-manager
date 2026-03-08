begin;
insert into public.digest_config (id, topic_limits, summary_length, recipients)
values (
  1,
  '{"AI":3,"Cybersecurity":2,"Engineering":2,"Technology":2}'::jsonb,
  'medium',
  '[]'::jsonb
)
on conflict (id) do update set
  topic_limits = excluded.topic_limits,
  summary_length = excluded.summary_length,
  recipients = excluded.recipients;
commit;
