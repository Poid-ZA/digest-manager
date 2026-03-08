const now = () => new Date().toISOString();

export const defaultFeeds = [
  { id: "feed-hn", name: "Hacker News", url: "https://news.ycombinator.com/rss", topic: "Technology", weight: 10, active: true, lastFetched: null, articleCount: 0 },
  { id: "feed-mit", name: "MIT Tech Review", url: "https://www.technologyreview.com/feed/", topic: "AI", weight: 9, active: true, lastFetched: null, articleCount: 0 },
  { id: "feed-krebs", name: "Krebs on Security", url: "https://krebsonsecurity.com/feed/", topic: "Cybersecurity", weight: 9, active: true, lastFetched: null, articleCount: 0 },
  { id: "feed-pragmatic", name: "The Pragmatic Engineer", url: "https://newsletter.pragmaticengineer.com/feed", topic: "Engineering", weight: 8, active: true, lastFetched: null, articleCount: 0 },
  { id: "feed-arxiv", name: "ArXiv CS.AI", url: "https://arxiv.org/rss/cs.AI", topic: "AI", weight: 7, active: true, lastFetched: null, articleCount: 0 },
  { id: "feed-darkreading", name: "Dark Reading", url: "https://www.darkreading.com/rss.xml", topic: "Cybersecurity", weight: 7, active: true, lastFetched: null, articleCount: 0 },
  { id: "feed-techcrunch", name: "TechCrunch", url: "https://techcrunch.com/feed/", topic: "Technology", weight: 8, active: true, lastFetched: null, articleCount: 0 },
  { id: "feed-ars", name: "Ars Technica", url: "https://feeds.arstechnica.com/arstechnica/index", topic: "Technology", weight: 7, active: true, lastFetched: null, articleCount: 0 },
  { id: "feed-openai", name: "OpenAI News", url: "https://openai.com/news/rss.xml", topic: "AI", weight: 10, active: true, lastFetched: null, articleCount: 0 },
  { id: "feed-nvd", name: "NIST CVE Feed", url: "https://services.nvd.nist.gov/rest/json/cves/2.0", topic: "Cybersecurity", weight: 6, active: true, lastFetched: null, articleCount: 0 },
];

export const defaultConfig = {
  topicLimits: { AI: 3, Cybersecurity: 2, Engineering: 2, Technology: 2 },
  summaryLength: "medium",
  recipients: [],
};

export function createDefaultState() {
  return {
    feeds: structuredClone(defaultFeeds),
    articles: [],
    runs: [],
    config: structuredClone(defaultConfig),
    testEmails: [],
    meta: {
      initializedAt: now(),
      version: 1,
    },
  };
}
