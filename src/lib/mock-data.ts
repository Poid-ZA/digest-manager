export type TopicCategory = 'AI' | 'Cybersecurity' | 'Engineering' | 'Technology';

export interface Feed {
  id: string;
  name: string;
  url: string;
  topic: TopicCategory;
  weight: number;
  active: boolean;
  lastFetched: string | null;
  articleCount: number;
}

export interface Article {
  id: string;
  feedId: string;
  feedName: string;
  title: string;
  url: string;
  topic: TopicCategory;
  publishedAt: string;
  fetchedAt: string;
  fullText: string;
  summary: string;
}

export interface DigestRun {
  id: string;
  date: string;
  status: 'success' | 'partial' | 'failed';
  totalArticles: number;
  includedArticles: number;
  duration: string;
  errors: string[];
  triggeredBy: 'scheduler' | 'manual';
}

export interface DigestConfig {
  topicLimits: Record<TopicCategory, number>;
  summaryLength: 'brief' | 'medium' | 'detailed';
  recipients: string[];
}

export const TOPICS: TopicCategory[] = ['AI', 'Cybersecurity', 'Engineering', 'Technology'];

export const TOPIC_COLORS: Record<TopicCategory, string> = {
  AI: 'bg-primary/20 text-primary',
  Cybersecurity: 'bg-destructive/20 text-destructive',
  Engineering: 'bg-warning/20 text-warning',
  Technology: 'bg-info/20 text-info',
};

export const mockFeeds: Feed[] = [
  { id: '1', name: 'Hacker News', url: 'https://news.ycombinator.com/rss', topic: 'Technology', weight: 10, active: true, lastFetched: '2026-03-05T08:30:00Z', articleCount: 234 },
  { id: '2', name: 'MIT Tech Review', url: 'https://www.technologyreview.com/feed/', topic: 'AI', weight: 9, active: true, lastFetched: '2026-03-05T08:25:00Z', articleCount: 156 },
  { id: '3', name: 'Krebs on Security', url: 'https://krebsonsecurity.com/feed/', topic: 'Cybersecurity', weight: 9, active: true, lastFetched: '2026-03-05T07:45:00Z', articleCount: 89 },
  { id: '4', name: 'The Pragmatic Engineer', url: 'https://newsletter.pragmaticengineer.com/feed', topic: 'Engineering', weight: 8, active: true, lastFetched: '2026-03-05T06:00:00Z', articleCount: 67 },
  { id: '5', name: 'ArXiv CS.AI', url: 'https://arxiv.org/rss/cs.AI', topic: 'AI', weight: 7, active: true, lastFetched: '2026-03-05T08:00:00Z', articleCount: 412 },
  { id: '6', name: 'Dark Reading', url: 'https://www.darkreading.com/rss.xml', topic: 'Cybersecurity', weight: 7, active: true, lastFetched: '2026-03-05T07:30:00Z', articleCount: 198 },
  { id: '7', name: 'TechCrunch', url: 'https://techcrunch.com/feed/', topic: 'Technology', weight: 8, active: true, lastFetched: '2026-03-05T08:15:00Z', articleCount: 345 },
  { id: '8', name: 'Ars Technica', url: 'https://feeds.arstechnica.com/arstechnica/index', topic: 'Technology', weight: 7, active: false, lastFetched: '2026-03-04T12:00:00Z', articleCount: 278 },
  { id: '9', name: 'OpenAI Blog', url: 'https://openai.com/blog/rss.xml', topic: 'AI', weight: 10, active: true, lastFetched: '2026-03-05T06:30:00Z', articleCount: 34 },
  { id: '10', name: 'NIST CVE Feed', url: 'https://nvd.nist.gov/feeds/xml/cve/misc/nvd-rss.xml', topic: 'Cybersecurity', weight: 6, active: true, lastFetched: '2026-03-05T08:00:00Z', articleCount: 567 },
];

export const mockArticles: Article[] = [
  { id: 'a1', feedId: '2', feedName: 'MIT Tech Review', title: 'GPT-5 Achieves Human-Level Reasoning on Complex Tasks', url: '#', topic: 'AI', publishedAt: '2026-03-05T06:00:00Z', fetchedAt: '2026-03-05T08:25:00Z', fullText: 'In a breakthrough that has sent ripples through the AI research community, OpenAI has announced that GPT-5 demonstrates human-level performance on a wide range of complex reasoning benchmarks...', summary: 'GPT-5 matches human performance on complex reasoning tasks, marking a significant milestone in AI development.' },
  { id: 'a2', feedId: '3', feedName: 'Krebs on Security', title: 'Critical Zero-Day in Enterprise VPN Appliances Exploited in the Wild', url: '#', topic: 'Cybersecurity', publishedAt: '2026-03-05T04:30:00Z', fetchedAt: '2026-03-05T07:45:00Z', fullText: 'A critical zero-day vulnerability affecting multiple enterprise VPN products has been actively exploited by threat actors for at least two weeks before being discovered...', summary: 'Active exploitation of zero-day vulnerability in enterprise VPN products discovered, affecting thousands of organizations globally.' },
  { id: 'a3', feedId: '4', feedName: 'The Pragmatic Engineer', title: 'How Stripe Rebuilt Their Payment Processing Pipeline', url: '#', topic: 'Engineering', publishedAt: '2026-03-04T18:00:00Z', fetchedAt: '2026-03-05T06:00:00Z', fullText: 'Stripe recently shared details about their massive infrastructure overhaul, migrating from a monolithic architecture to an event-driven microservices approach...', summary: 'Stripe shares their journey migrating payment processing to event-driven microservices, achieving 99.999% uptime.' },
  { id: 'a4', feedId: '1', feedName: 'Hacker News', title: 'Rust 2.0 RFC Published with Major Ergonomic Improvements', url: '#', topic: 'Technology', publishedAt: '2026-03-05T07:00:00Z', fetchedAt: '2026-03-05T08:30:00Z', fullText: 'The Rust language team has published the long-awaited RFC for Rust 2.0, which includes significant improvements to the borrow checker, async/await syntax, and module system...', summary: 'Rust 2.0 RFC proposes major ergonomic improvements including a smarter borrow checker and simplified async syntax.' },
  { id: 'a5', feedId: '5', feedName: 'ArXiv CS.AI', title: 'Sparse Mixture of Experts Achieves 10x Inference Speedup', url: '#', topic: 'AI', publishedAt: '2026-03-05T02:00:00Z', fetchedAt: '2026-03-05T08:00:00Z', fullText: 'Researchers present a novel sparse mixture of experts architecture that achieves comparable performance to dense models while requiring only 10% of the computation at inference time...', summary: 'New sparse MoE architecture delivers comparable quality at 10x faster inference speeds.' },
  { id: 'a6', feedId: '6', feedName: 'Dark Reading', title: 'State-Sponsored Actors Target Critical Infrastructure with New Malware', url: '#', topic: 'Cybersecurity', publishedAt: '2026-03-05T05:00:00Z', fetchedAt: '2026-03-05T07:30:00Z', fullText: 'Security researchers have identified a sophisticated new malware strain targeting industrial control systems in critical infrastructure...', summary: 'New sophisticated ICS malware attributed to state-sponsored actors targets energy and water infrastructure.' },
];

export const mockRuns: DigestRun[] = [
  { id: 'r1', date: '2026-03-05', status: 'success', totalArticles: 127, includedArticles: 24, duration: '4m 32s', errors: [], triggeredBy: 'scheduler' },
  { id: 'r2', date: '2026-03-04', status: 'success', totalArticles: 98, includedArticles: 22, duration: '3m 58s', errors: [], triggeredBy: 'scheduler' },
  { id: 'r3', date: '2026-03-03', status: 'partial', totalArticles: 112, includedArticles: 18, duration: '5m 12s', errors: ['Feed timeout: ArXiv CS.AI', 'LLM rate limit reached for 3 articles'], triggeredBy: 'scheduler' },
  { id: 'r4', date: '2026-03-02', status: 'failed', totalArticles: 0, includedArticles: 0, duration: '0m 45s', errors: ['Database connection timeout', 'Run aborted after 3 retries'], triggeredBy: 'manual' },
  { id: 'r5', date: '2026-03-01', status: 'success', totalArticles: 105, includedArticles: 23, duration: '4m 15s', errors: [], triggeredBy: 'scheduler' },
];

export const mockConfig: DigestConfig = {
  topicLimits: { AI: 8, Cybersecurity: 6, Engineering: 5, Technology: 5 },
  summaryLength: 'medium',
  recipients: ['team@techcorp.com', 'cto@techcorp.com', 'security@techcorp.com'],
};
