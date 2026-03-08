import {
  DigestAppState,
  DigestRun,
  Feed,
  FeedDraft,
  TestEmailLog,
  TopicCategory,
} from "@/lib/digest-types";

export class DigestValidationError extends Error {}

export interface GeneratedDigest {
  run: DigestRun;
  preview: string;
  selectedArticleIds: string[];
}

const TOPIC_PRIORITY: TopicCategory[] = ["AI", "Cybersecurity", "Engineering", "Technology"];

export function createId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

export function validateFeedDraft(feed: FeedDraft) {
  if (!feed.name.trim()) {
    throw new DigestValidationError("Feed name is required.");
  }
  if (!/^https?:\/\/.+/i.test(feed.url.trim())) {
    throw new DigestValidationError("Feed URL must start with http:// or https://.");
  }
  if (feed.weight < 1 || feed.weight > 10) {
    throw new DigestValidationError("Feed weight must be between 1 and 10.");
  }
}

export function normalizeFeedDraft(feed: FeedDraft) {
  validateFeedDraft(feed);
  return {
    ...feed,
    name: feed.name.trim(),
    url: feed.url.trim(),
  };
}

function summarizeText(summary: string, mode: DigestAppState["config"]["summaryLength"]) {
  if (mode === "brief") {
    return `${summary.split(".")[0]}.`;
  }
  if (mode === "detailed") {
    return `${summary} This item was prioritized for the operator digest based on feed weighting and topic limits.`;
  }
  return summary;
}

export function generateDigest(state: DigestAppState, triggeredBy: DigestRun["triggeredBy"]): GeneratedDigest {
  const now = new Date().toISOString();
  const activeFeeds = state.feeds.filter((feed) => feed.active);
  const errors: string[] = [];

  if (activeFeeds.length === 0) {
    return {
      run: {
        id: createId("run"),
        date: now,
        status: "failed",
        totalArticles: 0,
        includedArticles: 0,
        duration: "0m 03s",
        errors: ["No active feeds configured."],
        triggeredBy,
        preview: "Digest run failed: no active feeds configured.",
        selectedArticleIds: [],
      },
      preview: "Digest run failed: no active feeds configured.",
      selectedArticleIds: [],
    };
  }

  const activeFeedIds = new Set(activeFeeds.map((feed) => feed.id));
  const availableArticles = state.articles
    .filter((article) => activeFeedIds.has(article.feedId))
    .sort((left, right) => Date.parse(right.publishedAt) - Date.parse(left.publishedAt));

  const selected = TOPIC_PRIORITY.flatMap((topic) => {
    const topicArticles = availableArticles
      .filter((article) => article.topic === topic)
      .slice(0, state.config.topicLimits[topic] ?? 0);
    return topicArticles;
  });

  if (selected.length === 0) {
    errors.push("No digestable articles matched the current feed/topic configuration.");
  }

  const status: DigestRun["status"] =
    selected.length === 0 ? "failed" : errors.length > 0 ? "partial" : "success";
  const durationSeconds = Math.max(8, activeFeeds.length * 6 + selected.length * 7);
  const minutes = Math.floor(durationSeconds / 60);
  const seconds = durationSeconds % 60;

  const previewLines = [
    `Daily Tech Digest`,
    `Generated ${new Date(now).toLocaleString()}`,
    "",
  ];

  for (const article of selected) {
    previewLines.push(`[${article.topic}] ${article.title}`);
    previewLines.push(summarizeText(article.summary, state.config.summaryLength));
    previewLines.push(article.url);
    previewLines.push("");
  }

  if (selected.length === 0) {
    previewLines.push("No articles were selected for this run.");
  }

  return {
    run: {
      id: createId("run"),
      date: now,
      status,
      totalArticles: availableArticles.length,
      includedArticles: selected.length,
      duration: `${minutes}m ${seconds.toString().padStart(2, "0")}s`,
      errors,
      triggeredBy,
      preview: previewLines.join("\n").trim(),
      selectedArticleIds: selected.map((article) => article.id),
    },
    preview: previewLines.join("\n").trim(),
    selectedArticleIds: selected.map((article) => article.id),
  };
}

export function createTestEmailLog(state: DigestAppState): TestEmailLog {
  const digest = generateDigest(state, "manual");
  return {
    id: createId("mail"),
    sentAt: new Date().toISOString(),
    recipientCount: state.config.recipients.length,
    subject: `Daily Tech Digest Preview - ${new Date().toLocaleDateString()}`,
    preview: digest.preview,
    deliveryMode: "preview_only",
    delivered: false,
  };
}

export function createFeedFromDraft(draft: FeedDraft): Feed {
  const normalized = normalizeFeedDraft(draft);
  return {
    id: createId("feed"),
    ...normalized,
    articleCount: 0,
    lastFetched: null,
  };
}
