import Parser from "https://esm.sh/rss-parser@3.13.0";

const parser = new Parser({
  timeout: 15000,
  headers: {
    "User-Agent": "digest-manager/1.0 (+https://digest-manager.local)",
  },
});

const TOPIC_PRIORITY = ["AI", "Cybersecurity", "Engineering", "Technology"] as const;
const MAX_ARTICLE_TEXT_LENGTH = 8000;
const NVD_API_URL = "https://services.nvd.nist.gov/rest/json/cves/2.0";

type DigestArticleRecord = {
  id: string;
  feed_id: string;
  feed_name: string;
  title: string;
  url: string;
  topic: string;
  published_at: string;
  fetched_at: string;
  full_text: string;
  summary: string;
};

type NvdDescription = { lang: string; value: string };
type NvdReference = { url: string };
type NvdMetric = { cvssData?: { baseSeverity?: string }; baseSeverity?: string };
type NvdCve = {
  id: string;
  published?: string;
  vulnStatus?: string;
  descriptions?: NvdDescription[];
  references?: NvdReference[];
  metrics?: {
    cvssMetricV31?: NvdMetric[];
    cvssMetricV30?: NvdMetric[];
    cvssMetricV2?: NvdMetric[];
  };
};

export const defaultConfig = {
  topic_limits: { AI: 3, Cybersecurity: 2, Engineering: 2, Technology: 2 },
  summary_length: "medium" as const,
  recipients: [] as string[],
};

function createId(prefix: string) {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
}

function stripHtml(input = "") {
  return input
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeSummary(text: string, mode: "brief" | "medium" | "detailed") {
  const cleaned = stripHtml(text);
  if (!cleaned) {
    return "No summary was available from the source feed.";
  }

  const sentences = cleaned
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);

  if (mode === "brief") {
    return sentences[0] ?? cleaned;
  }
  if (mode === "detailed") {
    return sentences.slice(0, 4).join(" ") || cleaned;
  }
  return sentences.slice(0, 2).join(" ") || cleaned;
}

function articleFullText(input: string) {
  const text = stripHtml(input) || "No full text was available from the source feed.";
  return text.length > MAX_ARTICLE_TEXT_LENGTH ? `${text.slice(0, MAX_ARTICLE_TEXT_LENGTH).trim()}...` : text;
}

function toIsoDate(value?: string | null) {
  if (!value) {
    return new Date().toISOString();
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.valueOf()) ? new Date().toISOString() : parsed.toISOString();
}

function buildPreview(
  articles: Array<{ topic: string; title: string; summary: string; url: string }>,
  generatedAt: string,
) {
  const lines = [
    "Daily Tech Digest",
    `Generated ${new Date(generatedAt).toLocaleString()}`,
    "",
  ];

  for (const article of articles) {
    lines.push(`[${article.topic}] ${article.title}`);
    lines.push(article.summary);
    lines.push(article.url);
    lines.push("");
  }

  if (articles.length === 0) {
    lines.push("No articles were selected for this run.");
  }

  return lines.join("\n").trim();
}

function isNvdFeed(feed: { url: string }) {
  return /(^https?:\/\/)?(?:services\.)?nvd\.nist\.gov\//i.test(feed.url);
}

async function fetchNvdArticles(
  feed: { id: string; name: string; topic: string },
  fetchedAt: string,
  summaryLength: "brief" | "medium" | "detailed",
) {
  const end = new Date();
  const start = new Date(end.getTime() - 1000 * 60 * 60 * 24 * 7);
  const params = new URLSearchParams({
    resultsPerPage: "20",
    pubStartDate: start.toISOString(),
    pubEndDate: end.toISOString(),
  });
  params.append("noRejected", "");

  const response = await fetch(`${NVD_API_URL}?${params}`, {
    headers: { "User-Agent": "digest-manager/1.0 (+https://digest-manager.local)" },
  });

  if (!response.ok) {
    throw new Error(`Status code ${response.status}`);
  }

  const payload = await response.json() as { vulnerabilities?: Array<{ cve: NvdCve }> };
  return (payload.vulnerabilities ?? [])
    .map((entry) => entry.cve)
    .filter(Boolean)
    .slice(0, 20)
    .map((cve): DigestArticleRecord => {
      const description = cve.descriptions?.find((value) => value.lang === "en")?.value || "No summary was available from NVD.";
      const severity = cve.metrics?.cvssMetricV31?.[0]?.cvssData?.baseSeverity ||
        cve.metrics?.cvssMetricV30?.[0]?.cvssData?.baseSeverity ||
        cve.metrics?.cvssMetricV2?.[0]?.baseSeverity ||
        cve.vulnStatus ||
        "Unknown";

      return {
        id: createId("article"),
        feed_id: feed.id,
        feed_name: feed.name,
        title: `${cve.id} (${severity})`,
        url: cve.references?.[0]?.url || `${NVD_API_URL}?cveId=${cve.id}`,
        topic: feed.topic,
        published_at: toIsoDate(cve.published),
        fetched_at: fetchedAt,
        full_text: articleFullText(description),
        summary: normalizeSummary(description, summaryLength),
      };
    });
}

async function fetchRssArticles(
  feed: { id: string; name: string; url: string; topic: string },
  fetchedAt: string,
  summaryLength: "brief" | "medium" | "detailed",
) {
  const response = await fetch(feed.url, {
    headers: {
      "User-Agent": "digest-manager/1.0 (+https://digest-manager.local)",
    },
  });

  if (!response.ok) {
    throw new Error(`Status code ${response.status}`);
  }

  const xml = await response.text();
  const parsedFeed = await parser.parseString(xml);
  return (parsedFeed.items ?? [])
    .slice(0, 20)
    .filter((item) => item.link && item.title)
    .map((item) => ({
      id: createId("article"),
      feed_id: feed.id,
      feed_name: feed.name,
      title: item.title!.trim(),
      url: item.link!.trim(),
      topic: feed.topic,
      published_at: toIsoDate(item.isoDate || item.pubDate),
      fetched_at: fetchedAt,
      full_text: articleFullText(item["content:encoded"] || item.content || item.summary || item.contentSnippet || item.title || ""),
      summary: normalizeSummary(item["content:encodedSnippet"] || item.contentSnippet || item.summary || item.content || item.title || "", summaryLength),
    }));
}

export async function fetchArticlesForFeed(
  feed: { id: string; name: string; url: string; topic: string },
  fetchedAt: string,
  summaryLength: "brief" | "medium" | "detailed",
) {
  if (isNvdFeed(feed)) {
    return fetchNvdArticles(feed, fetchedAt, summaryLength);
  }
  return fetchRssArticles(feed, fetchedAt, summaryLength);
}

export function selectDigestArticles(
  feeds: Array<{ id: string; active: boolean; weight: number }>,
  articles: Array<{ id: string; feed_id: string; topic: string; published_at: string }>,
  config: typeof defaultConfig,
) {
  const feedWeights = new Map(feeds.map((feed) => [feed.id, feed.weight]));
  const activeFeedIds = new Set(feeds.filter((feed) => feed.active).map((feed) => feed.id));
  const candidates = articles
    .filter((article) => activeFeedIds.has(article.feed_id))
    .sort((left, right) => {
      const weightDiff = (feedWeights.get(right.feed_id) ?? 0) - (feedWeights.get(left.feed_id) ?? 0);
      if (weightDiff !== 0) {
        return weightDiff;
      }
      return Date.parse(right.published_at) - Date.parse(left.published_at);
    });

  return TOPIC_PRIORITY.flatMap((topic) =>
    candidates.filter((article) => article.topic === topic).slice(0, config.topic_limits[topic] ?? 0),
  );
}

export function summarizeDigestResult({
  fetchedAt,
  startedAt,
  incomingArticles,
  selectedArticles,
  config,
  errors,
  triggeredBy,
}: {
  fetchedAt: string;
  startedAt: number;
  incomingArticles: Array<{ id: string; topic: string; title: string; summary: string; url: string }>;
  selectedArticles: Array<{ id: string; topic: string; title: string; summary: string; url: string }>;
  config: typeof defaultConfig;
  errors: string[];
  triggeredBy: "manual" | "scheduler";
}) {
  if (selectedArticles.length === 0) {
    errors.push("No digestable articles matched the current feed/topic configuration.");
  }

  const durationSeconds = Math.max(5, Math.round((Date.now() - startedAt) / 1000));
  const run = {
    id: createId("run"),
    date: fetchedAt,
    status: selectedArticles.length === 0 ? "failed" : errors.length > 0 ? "partial" : "success",
    total_articles: incomingArticles.length,
    included_articles: selectedArticles.length,
    duration: `${Math.floor(durationSeconds / 60)}m ${String(durationSeconds % 60).padStart(2, "0")}s`,
    errors,
    triggered_by: triggeredBy,
    preview: buildPreview(selectedArticles, fetchedAt),
    selected_article_ids: selectedArticles.map((article) => article.id),
  };

  return {
    run,
    digest: {
      run: {
        id: run.id,
        date: run.date,
        status: run.status,
        totalArticles: run.total_articles,
        includedArticles: run.included_articles,
        duration: run.duration,
        errors: run.errors,
        triggeredBy: run.triggered_by,
        preview: run.preview,
        selectedArticleIds: run.selected_article_ids,
      },
      preview: run.preview,
      selectedArticleIds: run.selected_article_ids,
    },
  };
}
