import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { defaultConfig, fetchArticlesForFeed, selectDigestArticles, summarizeDigestResult } from "./digest.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type PersistedArticle = {
  id: string;
  url: string;
  feed_id: string;
  published_at: string;
  created_at?: string;
};

function throwIfError(error: { message: string } | null, context: string) {
  if (error) {
    throw new Error(`${context}: ${error.message}`);
  }
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const client = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const payload = await request.json().catch(() => ({}));
    if (payload.config) {
      const { error: configError } = await client.from("digest_config").upsert({
        id: 1,
        topic_limits: payload.config.topicLimits,
        summary_length: payload.config.summaryLength,
        recipients: payload.config.recipients,
      });
      throwIfError(configError, "Failed to update digest config");
    }

    const [{ data: feeds }, { data: configRow }, { data: existingArticles }] = await Promise.all([
      client.from("digest_feeds").select("*"),
      client.from("digest_config").select("*").eq("id", 1).single(),
      client.from("digest_articles").select("*").order("published_at", { ascending: false }).limit(500),
    ]);

    const config = configRow
      ? {
          topic_limits: configRow.topic_limits,
          summary_length: configRow.summary_length,
          recipients: configRow.recipients ?? [],
        }
      : defaultConfig;

    const activeFeeds = (feeds ?? []).filter((feed) => feed.active);
    const fetchedAt = new Date().toISOString();
    const startedAt = Date.now();
    const errors: string[] = [];
    const successfulFeedIds = new Set<string>();
    const incomingArticles: PersistedArticle[] = [];

    for (const feed of activeFeeds) {
      try {
        const articles = await fetchArticlesForFeed(feed, fetchedAt, config.summary_length);
        incomingArticles.push(...articles);
        successfulFeedIds.add(feed.id);
      } catch (error) {
        errors.push(`${feed.name}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    const byUrl = new Map<string, PersistedArticle>();
    for (const article of existingArticles ?? []) {
      byUrl.set(article.url, article);
    }
    for (const article of incomingArticles) {
      const previous = byUrl.get(article.url);
      byUrl.set(
        article.url,
        previous
          ? {
              ...previous,
              ...article,
              id: previous.id,
              created_at: previous.created_at ?? article.created_at ?? fetchedAt,
            }
          : article,
      );
    }
    const mergedArticles = [...byUrl.values()]
      .sort((left, right) => Date.parse(right.published_at) - Date.parse(left.published_at))
      .slice(0, 500);

    const { error: articleUpsertError } = await client.from("digest_articles").upsert(mergedArticles, { onConflict: "url" });
    throwIfError(articleUpsertError, "Failed to persist digest articles");

    const nextFeeds = (feeds ?? []).map((feed) => ({
      ...feed,
      article_count: mergedArticles.filter((article) => article.feed_id === feed.id).length,
      last_fetched: successfulFeedIds.has(feed.id) ? fetchedAt : feed.last_fetched,
    }));
    const { error: feedUpsertError } = await client.from("digest_feeds").upsert(nextFeeds);
    throwIfError(feedUpsertError, "Failed to update feed status");

    const selectedArticles = selectDigestArticles(nextFeeds, mergedArticles, config);
    const { run, digest } = summarizeDigestResult({
      fetchedAt,
      startedAt,
      incomingArticles,
      selectedArticles,
      config,
      errors,
      triggeredBy: "manual",
    });

    const { error: runInsertError } = await client.from("digest_runs").insert(run);
    throwIfError(runInsertError, "Failed to store digest run");

    const [{ data: articles }, { data: runs }, { data: testEmails }] = await Promise.all([
      client.from("digest_articles").select("*").order("published_at", { ascending: false }).limit(500),
      client.from("digest_runs").select("*").order("date", { ascending: false }).limit(100),
      client.from("digest_test_emails").select("*").order("sent_at", { ascending: false }).limit(25),
    ]);

    return Response.json(
      {
        state: {
          feeds: nextFeeds.map((feed) => ({
            id: feed.id,
            name: feed.name,
            url: feed.url,
            topic: feed.topic,
            weight: feed.weight,
            active: feed.active,
            lastFetched: feed.last_fetched,
            articleCount: feed.article_count,
          })),
          articles: (articles ?? []).map((article) => ({
            id: article.id,
            feedId: article.feed_id,
            feedName: article.feed_name,
            title: article.title,
            url: article.url,
            topic: article.topic,
            publishedAt: article.published_at,
            fetchedAt: article.fetched_at,
            fullText: article.full_text,
            summary: article.summary,
          })),
          runs: (runs ?? []).map((row) => ({
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
          })),
          config: {
            topicLimits: config.topic_limits,
            summaryLength: config.summary_length,
            recipients: config.recipients,
          },
          testEmails: (testEmails ?? []).map((row) => ({
            id: row.id,
            sentAt: row.sent_at,
            recipientCount: row.recipient_count,
            subject: row.subject,
            preview: row.preview,
            deliveryMode: row.delivery_mode,
            delivered: row.delivered,
          })),
        },
        digest,
      },
      { headers: corsHeaders },
    );
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500, headers: corsHeaders },
    );
  }
});
