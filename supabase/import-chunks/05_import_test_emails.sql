begin;
insert into public.digest_test_emails (id, sent_at, recipient_count, subject, preview, delivery_mode, delivered)
values
  ('mail-9krdb5pz', '2026-03-08T15:05:44.028Z'::timestamptz, 0, 'Daily Tech Digest Preview - 2026/03/08', 'Daily Tech Digest
Generated 2026/03/08, 17:05:44
Recipients: 0

[AI] How Descript enables multilingual video dubbing at scale
Descript uses OpenAI models to scale multilingual video dubbing, optimizing translations for both meaning and timing so dubbed speech sounds natural across languages.
https://openai.com/index/descript

[AI] Codex Security: now in research preview
Codex Security is an AI application security agent that analyzes project context to detect, validate, and patch complex vulnerabilities with higher confidence and less noise.
https://openai.com/index/codex-security-now-in-research-preview

[AI] How Balyasny Asset Management built an AI research engine for investing
See how Balyasny built an AI research system with GPT-5.4, rigorous model evaluation, and agent workflows to transform investment analysis at scale.
https://openai.com/index/balyasny-asset-management

[Cybersecurity] Who is the Kimwolf Botmaster “Dort”?
In early January 2026, KrebsOnSecurity revealed how a security researcher disclosed a vulnerability that was used to build Kimwolf, the world’s largest and most disruptive botnet. Since then, the person in control of Kimwolf — who goes by the handle “Dort” — has coordinated a barrage of distributed denial-of-service (DDoS), doxing and email flooding attacks against the researcher and this author, and more recently caused a SWAT team to be sent to the researcher’s home.
https://krebsonsecurity.com/2026/02/who-is-the-kimwolf-botmaster-dort/

[Cybersecurity] ‘Starkiller’ Phishing Service Proxies Real Login Pages, MFA
Most phishing websites are little more than static copies of login pages for popular online destinations, and they are often quickly taken down by anti-abuse activists and security firms. But a stealthy new phishing-as-a-service offering lets customers sidestep both of these pitfalls: It uses cleverly disguised links to load the target brand’s real website, and then acts as a relay between the victim and the legitimate site — forwarding the victim’s username, password and multi-factor authentication (MFA) code to the legitimate site and returning its responses.
https://krebsonsecurity.com/2026/02/starkiller-phishing-service-proxies-real-login-pages-mfa/

[Engineering] The Pulse: AWS region knocked offline by drone attack in historic first
The Pulse is a series covering events, insights, and trends within Big Tech and startups. Notice an interesting event or trend?
https://newsletter.pragmaticengineer.com/p/the-pulse-164

[Engineering] Building Claude Code with Boris Cherny
Stream the latest episode Listen and watch now on YouTube, Spotify, and Apple. See the episode transcript at the top of this page, and timestamps for the episode at the bottom.
https://newsletter.pragmaticengineer.com/p/building-claude-code-with-boris-cherny

[Technology] LibreOffice: Request to the European Commission to adhere to its own guidances
Comments
https://blog.documentfoundation.org/blog/2026/03/05/cra-guidances/

[Technology] CLI RSS/Atom feed reader inspired by Taskwarrior, synced using Git
Comments
https://github.com/kantord/blogtato', 'preview_only', false)
on conflict (id) do update set
  sent_at = excluded.sent_at,
  recipient_count = excluded.recipient_count,
  subject = excluded.subject,
  preview = excluded.preview,
  delivery_mode = excluded.delivery_mode,
  delivered = excluded.delivered;
commit;
