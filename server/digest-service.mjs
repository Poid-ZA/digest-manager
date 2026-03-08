import Parser from "rss-parser";

const parser = new Parser({
  timeout: 15000,
  headers: {
    "User-Agent": "digest-manager/1.0 (+https://local.digest.manager)",
  },
});

const TOPIC_PRIORITY = ["AI", "Cybersecurity", "Engineering", "Technology"];
const MAX_ARTICLE_TEXT_LENGTH = 8000;
const NVD_API_URL = "https://services.nvd.nist.gov/rest/json/cves/2.0";

function createId(prefix) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
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

function normalizeSummary(text, mode) {
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

function articleSourceText(item) {
  return (
    item["content:encodedSnippet"] ||
    item.contentSnippet ||
    item.summary ||
    item.content ||
    item.title ||
    ""
  );
}

function articleFullText(item) {
  const text =
    stripHtml(item["content:encoded"] || item.content || item.summary || item.contentSnippet || item.title || "") ||
    "No full text was available from the source feed.";

  return text.length > MAX_ARTICLE_TEXT_LENGTH
    ? `${text.slice(0, MAX_ARTICLE_TEXT_LENGTH).trim()}...`
    : text;
}

function toIsoDate(value) {
  if (!value) {
    return new Date().toISOString();
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.valueOf())) {
    return new Date().toISOString();
  }
  return parsed.toISOString();
}

function isNvdFeed(feed) {
  return /(^https?:\/\/)?(?:services\.)?nvd\.nist\.gov\//i.test(feed.url);
}

function nvdDescription(cve) {
  return (
    cve.descriptions?.find((description) => description.lang === "en")?.value ||
    "No summary was available from NVD."
  );
}

function nvdSeverity(cve) {
  const cvssV31 = cve.metrics?.cvssMetricV31?.[0]?.cvssData?.baseSeverity;
  const cvssV30 = cve.metrics?.cvssMetricV30?.[0]?.cvssData?.baseSeverity;
  const cvssV2 = cve.metrics?.cvssMetricV2?.[0]?.baseSeverity;
  return cvssV31 || cvssV30 || cvssV2 || cve.vulnStatus || "Unknown";
}

async function fetchNvdArticles(feed, fetchedAt, summaryLength) {
  const end = new Date();
  const start = new Date(end.getTime() - 1000 * 60 * 60 * 24 * 7);
  const params = new URLSearchParams({
    resultsPerPage: "20",
    pubStartDate: start.toISOString(),
    pubEndDate: end.toISOString(),
  });
  params.append("noRejected", "");

  const response = await fetch(`${NVD_API_URL}?${params}`, {
    headers: {
      "User-Agent": "digest-manager/1.0 (+https://local.digest.manager)",
    },
  });

  if (!response.ok) {
    throw new Error(`Status code ${response.status}`);
  }

  const payload = await response.json();

  return (payload.vulnerabilities ?? [])
    .map((entry) => entry.cve)
    .filter(Boolean)
    .sort((left, right) => Date.parse(right.published) - Date.parse(left.published))
    .slice(0, 20)
    .map((cve) => {
      const description = nvdDescription(cve);
      const referenceUrl = cve.references?.[0]?.url || `${NVD_API_URL}?cveId=${cve.id}`;
      const severity = nvdSeverity(cve);

      return {
        id: createId("article"),
        feedId: feed.id,
        feedName: feed.name,
        title: `${cve.id} (${severity})`,
        url: referenceUrl,
        topic: feed.topic,
        publishedAt: toIsoDate(cve.published),
        fetchedAt,
        fullText: articleFullText({ content: description }),
        summary: normalizeSummary(description, summaryLength),
      };
    });
}

async function fetchArticlesForFeed(feed, config, fetchedAt) {
  if (isNvdFeed(feed)) {
    const articles = await fetchNvdArticles(feed, fetchedAt, config.summaryLength);
    return { feed, articles };
  }

  const parsedFeed = await parser.parseURL(feed.url);
  const items = (parsedFeed.items ?? []).slice(0, 20);
  const articles = items
    .filter((item) => item.link && item.title)
    .map((item) => ({
      id: createId("article"),
      feedId: feed.id,
      feedName: feed.name,
      title: item.title.trim(),
      url: item.link.trim(),
      topic: feed.topic,
      publishedAt: toIsoDate(item.isoDate || item.pubDate),
      fetchedAt,
      fullText: articleFullText(item),
      summary: normalizeSummary(articleSourceText(item), config.summaryLength),
    }));

  return { feed, articles };
}

function buildPreview(articles, config, generatedAt) {
  const lines = [
    "Daily Tech Digest",
    `Generated ${new Date(generatedAt).toLocaleString()}`,
    `Recipients: ${config.recipients.length}`,
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

function mergeArticles(existingArticles, incomingArticles) {
  const byUrl = new Map();

  for (const article of existingArticles) {
    byUrl.set(article.url, article);
  }

  for (const article of incomingArticles) {
    const previous = byUrl.get(article.url);
    byUrl.set(article.url, previous ? { ...previous, ...article, id: previous.id } : article);
  }

  return [...byUrl.values()].sort(
    (left, right) => Date.parse(right.publishedAt) - Date.parse(left.publishedAt),
  );
}

function selectDigestArticles(state) {
  const feedWeights = new Map(state.feeds.map((feed) => [feed.id, feed.weight]));
  const activeFeedIds = new Set(state.feeds.filter((feed) => feed.active).map((feed) => feed.id));

  const candidates = state.articles
    .filter((article) => activeFeedIds.has(article.feedId))
    .sort((left, right) => {
      const weightDiff = (feedWeights.get(right.feedId) ?? 0) - (feedWeights.get(left.feedId) ?? 0);
      if (weightDiff !== 0) {
        return weightDiff;
      }
      return Date.parse(right.publishedAt) - Date.parse(left.publishedAt);
    });

  return TOPIC_PRIORITY.flatMap((topic) =>
    candidates.filter((article) => article.topic === topic).slice(0, state.config.topicLimits[topic] ?? 0),
  );
}

export async function triggerDigestRun(state, { triggeredBy = "manual" } = {}) {
  const startedAt = Date.now();
  const fetchedAt = new Date().toISOString();
  const errors = [];
  const activeFeeds = state.feeds.filter((feed) => feed.active);

  if (activeFeeds.length === 0) {
    const run = {
      id: createId("run"),
      date: fetchedAt,
      status: "failed",
      totalArticles: 0,
      includedArticles: 0,
      duration: "0m 01s",
      errors: ["No active feeds configured."],
      triggeredBy,
    };
    return {
      nextState: { ...state, runs: [run, ...state.runs] },
      digest: { run, preview: "Digest run failed: no active feeds configured.", selectedArticleIds: [] },
    };
  }

  const fetchResults = await Promise.allSettled(
    activeFeeds.map((feed) => fetchArticlesForFeed(feed, state.config, fetchedAt)),
  );

  const incomingArticles = [];
  const successfulFeedIds = new Set();

  for (const [index, result] of fetchResults.entries()) {
    if (result.status === "fulfilled") {
      successfulFeedIds.add(result.value.feed.id);
      incomingArticles.push(...result.value.articles);
      continue;
    }
    const failedFeed = activeFeeds[index];
    const reason = result.reason instanceof Error ? result.reason.message : String(result.reason);
    errors.push(`${failedFeed?.name ?? "Feed"}: ${reason}`);
  }

  const mergedArticles = mergeArticles(state.articles, incomingArticles);
  const nextFeeds = state.feeds.map((feed) => {
    const articleCount = mergedArticles.filter((article) => article.feedId === feed.id).length;
    return {
      ...feed,
      articleCount,
      lastFetched: successfulFeedIds.has(feed.id) ? fetchedAt : feed.lastFetched,
    };
  });

  const nextStateBase = {
    ...state,
    feeds: nextFeeds,
    articles: mergedArticles.slice(0, 500),
  };

  const selectedArticles = selectDigestArticles(nextStateBase);

  if (state.config.recipients.length === 0) {
    errors.push("No digest recipients configured.");
  }
  if (selectedArticles.length === 0) {
    errors.push("No digestable articles matched the current feed/topic configuration.");
  }

  const durationSeconds = Math.max(5, Math.round((Date.now() - startedAt) / 1000));
  const run = {
    id: createId("run"),
    date: fetchedAt,
    status: selectedArticles.length === 0 ? "failed" : errors.length > 0 ? "partial" : "success",
    totalArticles: incomingArticles.length,
    includedArticles: selectedArticles.length,
    duration: `${Math.floor(durationSeconds / 60)}m ${String(durationSeconds % 60).padStart(2, "0")}s`,
    errors,
    triggeredBy,
  };

  const digest = {
    run,
    preview: buildPreview(selectedArticles, state.config, fetchedAt),
    selectedArticleIds: selectedArticles.map((article) => article.id),
  };

  return {
    nextState: {
      ...nextStateBase,
      runs: [run, ...state.runs].slice(0, 100),
    },
    digest,
  };
}

export async function createTestEmail(state, transporter) {
  const selectedArticles = selectDigestArticles(state);
  const sentAt = new Date().toISOString();
  const preview = buildPreview(selectedArticles, state.config, sentAt);
  const subject = `Daily Tech Digest Preview - ${new Date(sentAt).toLocaleDateString()}`;

  let deliveryMode = "preview_only";
  let delivered = false;

  if (transporter && state.config.recipients.length > 0) {
    await transporter.sendMail({
      from: process.env.DIGEST_FROM_EMAIL || process.env.SMTP_FROM || "digest-manager@localhost",
      to: state.config.recipients.join(", "),
      subject,
      text: preview,
    });
    deliveryMode = "smtp";
    delivered = true;
  }

  return {
    id: createId("mail"),
    sentAt,
    recipientCount: state.config.recipients.length,
    subject,
    preview,
    deliveryMode,
    delivered,
  };
}
