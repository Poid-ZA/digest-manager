import {
  DigestAppState,
  DigestConfig,
  DigestRun,
  Feed,
  FeedDraft,
  GeneratedDigest,
  TestEmailLog,
} from "@/lib/digest-types";
import { hasSupabaseConfig, supabase } from "@/lib/supabase";

type FeedRow = {
  id: string;
  name: string;
  url: string;
  topic: Feed["topic"];
  weight: number;
  active: boolean;
  last_fetched: string | null;
  article_count: number;
};

type ArticleRow = {
  id: string;
  feed_id: string;
  feed_name: string;
  title: string;
  url: string;
  topic: Feed["topic"];
  published_at: string;
  fetched_at: string;
  full_text: string;
  summary: string;
};

type RunRow = {
  id: string;
  date: string;
  status: DigestRun["status"];
  total_articles: number;
  included_articles: number;
  duration: string;
  errors: string[] | null;
  triggered_by: DigestRun["triggeredBy"];
  preview?: string;
  selected_article_ids?: string[] | null;
};

type ConfigRow = {
  id: number;
  topic_limits: DigestConfig["topicLimits"];
  summary_length: DigestConfig["summaryLength"];
  recipients: string[] | null;
};

type TestEmailRow = {
  id: string;
  sent_at: string;
  recipient_count: number;
  subject: string;
  preview: string;
  delivery_mode: TestEmailLog["deliveryMode"];
  delivered: boolean;
};

function assertSupabase() {
  if (!hasSupabaseConfig || !supabase) {
    throw new Error("Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
  }
  return supabase;
}

function nowIso() {
  return new Date().toISOString();
}

function mapFeed(row: FeedRow): Feed {
  return {
    id: row.id,
    name: row.name,
    url: row.url,
    topic: row.topic,
    weight: row.weight,
    active: row.active,
    lastFetched: row.last_fetched,
    articleCount: row.article_count,
  };
}

function mapArticle(row: ArticleRow) {
  return {
    id: row.id,
    feedId: row.feed_id,
    feedName: row.feed_name,
    title: row.title,
    url: row.url,
    topic: row.topic,
    publishedAt: row.published_at,
    fetchedAt: row.fetched_at,
    fullText: row.full_text,
    summary: row.summary,
  };
}

function mapRun(row: RunRow): DigestRun {
  return {
    id: row.id,
    date: row.date,
    status: row.status,
    totalArticles: row.total_articles,
    includedArticles: row.included_articles,
    duration: row.duration,
    errors: row.errors ?? [],
    triggeredBy: row.triggered_by,
    preview: row.preview ?? "",
    selectedArticleIds: row.selected_article_ids ?? [],
  };
}

function mapConfig(row: ConfigRow | null): DigestConfig {
  if (!row) {
    return {
      topicLimits: { AI: 3, Cybersecurity: 2, Engineering: 2, Technology: 2 },
      summaryLength: "medium",
      recipients: [],
    };
  }

  return {
    topicLimits: row.topic_limits,
    summaryLength: row.summary_length,
    recipients: row.recipients ?? [],
  };
}

function mapTestEmail(row: TestEmailRow): TestEmailLog {
  return {
    id: row.id,
    sentAt: row.sent_at,
    recipientCount: row.recipient_count,
    subject: row.subject,
    preview: row.preview,
    deliveryMode: row.delivery_mode,
    delivered: row.delivered,
  };
}

async function unwrap<T>(promise: PromiseLike<{ data: T; error: { message: string } | null }>) {
  const { data, error } = await promise;
  if (error) {
    throw new Error(error.message);
  }
  return data;
}

export async function fetchState(): Promise<DigestAppState> {
  const client = assertSupabase();
  const [feeds, articles, runs, config, testEmails] = await Promise.all([
    unwrap(client.from("digest_feeds").select("*").order("weight", { ascending: false }).order("name")),
    unwrap(client.from("digest_articles").select("*").order("published_at", { ascending: false }).limit(500)),
    unwrap(client.from("digest_runs").select("*").order("date", { ascending: false }).limit(100)),
    unwrap(client.from("digest_config").select("*").eq("id", 1).maybeSingle()),
    unwrap(client.from("digest_test_emails").select("*").order("sent_at", { ascending: false }).limit(25)),
  ]);

  return {
    feeds: (feeds as FeedRow[]).map(mapFeed),
    articles: (articles as ArticleRow[]).map(mapArticle),
    runs: (runs as RunRow[]).map(mapRun),
    config: mapConfig(config as ConfigRow | null),
    testEmails: (testEmails as TestEmailRow[]).map(mapTestEmail),
  };
}

export async function createFeed(draft: FeedDraft) {
  const client = assertSupabase();
  const timestamp = nowIso();
  await unwrap(
    client.from("digest_feeds").insert({
      id: `feed-${crypto.randomUUID().slice(0, 8)}`,
      name: draft.name,
      url: draft.url,
      topic: draft.topic,
      weight: draft.weight,
      active: draft.active,
      last_fetched: null,
      article_count: 0,
      created_at: timestamp,
      updated_at: timestamp,
    }),
  );
  return fetchState();
}

export async function updateFeed(feedId: string, draft: FeedDraft) {
  const client = assertSupabase();
  await unwrap(
    client
      .from("digest_feeds")
      .update({
        name: draft.name,
        url: draft.url,
        topic: draft.topic,
        weight: draft.weight,
        active: draft.active,
      })
      .eq("id", feedId),
  );
  return fetchState();
}

export async function deleteFeed(feedId: string) {
  const client = assertSupabase();
  await unwrap(client.from("digest_feeds").delete().eq("id", feedId));
  return fetchState();
}

export async function toggleFeed(feedId: string) {
  const client = assertSupabase();
  const current = await unwrap(
    client.from("digest_feeds").select("active").eq("id", feedId).single(),
  ) as { active: boolean };
  await unwrap(
    client.from("digest_feeds").update({ active: !current.active }).eq("id", feedId),
  );
  return fetchState();
}

export async function importFeeds(payload: FeedDraft[]) {
  const client = assertSupabase();
  await unwrap(
    client.from("digest_feeds").insert(
      payload.map((draft) => {
        const timestamp = nowIso();
        return {
          id: `feed-${crypto.randomUUID().slice(0, 8)}`,
          name: draft.name,
          url: draft.url,
          topic: draft.topic,
          weight: draft.weight,
          active: draft.active,
          last_fetched: null,
          article_count: 0,
          created_at: timestamp,
          updated_at: timestamp,
        };
      }),
    ),
  );

  return {
    importedCount: payload.length,
    state: await fetchState(),
  };
}

export async function saveConfig(config: DigestConfig) {
  const client = assertSupabase();
  const timestamp = nowIso();
  await unwrap(
    client.from("digest_config").upsert({
      id: 1,
      topic_limits: config.topicLimits,
      summary_length: config.summaryLength,
      recipients: config.recipients,
      created_at: timestamp,
      updated_at: timestamp,
    }),
  );
  return fetchState();
}

export async function triggerRun(config?: DigestConfig) {
  const client = assertSupabase();
  const { data, error } = await client.functions.invoke("trigger-digest-run", {
    body: config ? { config } : {},
  });
  if (error) {
    throw new Error(error.message);
  }
  return data as { state: DigestAppState; digest: GeneratedDigest };
}

export async function sendTestEmail(config?: DigestConfig) {
  const client = assertSupabase();
  const { data, error } = await client.functions.invoke("send-test-email", {
    body: config ? { config } : {},
  });
  if (error) {
    throw new Error(error.message);
  }
  return data as { state: DigestAppState; emailLog: TestEmailLog };
}

export async function resetWorkspace() {
  const client = assertSupabase();
  const { data, error } = await client.functions.invoke("reset-digest-state");
  if (error) {
    throw new Error(error.message);
  }
  return data as DigestAppState;
}
