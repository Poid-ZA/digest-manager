export type TopicCategory = "AI" | "Cybersecurity" | "Engineering" | "Technology";

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
  status: "success" | "partial" | "failed";
  totalArticles: number;
  includedArticles: number;
  duration: string;
  errors: string[];
  triggeredBy: "scheduler" | "manual";
  preview: string;
  selectedArticleIds: string[];
}

export interface DigestConfig {
  topicLimits: Record<TopicCategory, number>;
  summaryLength: "brief" | "medium" | "detailed";
  recipients: string[];
}

export interface TestEmailLog {
  id: string;
  sentAt: string;
  recipientCount: number;
  subject: string;
  preview: string;
  deliveryMode: "preview_only" | "smtp";
  delivered: boolean;
}

export interface DigestAppState {
  feeds: Feed[];
  articles: Article[];
  runs: DigestRun[];
  config: DigestConfig;
  testEmails: TestEmailLog[];
}

export interface FeedDraft {
  name: string;
  url: string;
  topic: TopicCategory;
  weight: number;
  active: boolean;
}

export interface GeneratedDigest {
  run: DigestRun;
  preview: string;
  selectedArticleIds: string[];
}

export const TOPICS: TopicCategory[] = ["AI", "Cybersecurity", "Engineering", "Technology"];

export const TOPIC_COLORS: Record<TopicCategory, string> = {
  AI: "bg-primary/20 text-primary",
  Cybersecurity: "bg-destructive/20 text-destructive",
  Engineering: "bg-warning/20 text-warning",
  Technology: "bg-info/20 text-info",
};

export const EMPTY_FEED_DRAFT: FeedDraft = {
  name: "",
  url: "",
  topic: "Technology",
  weight: 5,
  active: true,
};
