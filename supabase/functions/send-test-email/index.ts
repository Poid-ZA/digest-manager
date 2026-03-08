import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type PreviewArticle = { topic: string; title: string; summary: string; url: string };

function buildPreview(articles: PreviewArticle[], config: { recipients: string[] }, generatedAt: string) {
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
      await client.from("digest_config").upsert({
        id: 1,
        topic_limits: payload.config.topicLimits,
        summary_length: payload.config.summaryLength,
        recipients: payload.config.recipients,
      });
    }

    const [{ data: configRow }, { data: articles }] = await Promise.all([
      client.from("digest_config").select("*").eq("id", 1).single(),
      client.from("digest_articles").select("*").order("published_at", { ascending: false }).limit(20),
    ]);

    const config = {
      topicLimits: configRow?.topic_limits ?? { AI: 3, Cybersecurity: 2, Engineering: 2, Technology: 2 },
      summaryLength: configRow?.summary_length ?? "medium",
      recipients: configRow?.recipients ?? [],
    };

    const selectedArticles = (articles ?? []).slice(0, 9);
    const sentAt = new Date().toISOString();
    const preview = buildPreview(selectedArticles, config, sentAt);
    const subject = `Daily Tech Digest Preview - ${new Date(sentAt).toLocaleDateString()}`;

    let deliveryMode: "preview_only" | "resend" = "preview_only";
    let delivered = false;

    if (Deno.env.get("RESEND_API_KEY") && config.recipients.length > 0) {
      const resendResponse = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${Deno.env.get("RESEND_API_KEY")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: Deno.env.get("DIGEST_FROM_EMAIL") ?? "digest-manager@localhost",
          to: config.recipients,
          subject,
          text: preview,
        }),
      });

      if (!resendResponse.ok) {
        throw new Error(`Resend request failed with status ${resendResponse.status}`);
      }

      deliveryMode = "resend";
      delivered = true;
    }

    const log = {
      id: `mail-${crypto.randomUUID().slice(0, 8)}`,
      sent_at: sentAt,
      recipient_count: config.recipients.length,
      subject,
      preview,
      delivery_mode: deliveryMode,
      delivered,
    };

    await client.from("digest_test_emails").insert(log);

    const [{ data: feeds }, { data: runs }, { data: testEmails }] = await Promise.all([
      client.from("digest_feeds").select("*").order("weight", { ascending: false }).order("name"),
      client.from("digest_runs").select("*").order("date", { ascending: false }).limit(100),
      client.from("digest_test_emails").select("*").order("sent_at", { ascending: false }).limit(25),
    ]);

    return Response.json(
      {
        state: {
          feeds: (feeds ?? []).map((feed) => ({
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
          })),
          config,
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
        emailLog: {
          id: log.id,
          sentAt: log.sent_at,
          recipientCount: log.recipient_count,
          subject: log.subject,
          preview: log.preview,
          deliveryMode: log.delivery_mode,
          delivered: log.delivered,
        },
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
