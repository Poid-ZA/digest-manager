import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { defaultConfig, defaultFeeds } from "./defaults.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const client = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    await client.from("digest_articles").delete().neq("id", "__never__");
    await client.from("digest_runs").delete().neq("id", "__never__");
    await client.from("digest_test_emails").delete().neq("id", "__never__");
    await client.from("digest_feeds").delete().neq("id", "__never__");
    await client.from("digest_feeds").insert(defaultFeeds);
    await client.from("digest_config").upsert({ id: 1, ...defaultConfig });

    return Response.json(
      {
        feeds: defaultFeeds.map((feed) => ({
          id: feed.id,
          name: feed.name,
          url: feed.url,
          topic: feed.topic,
          weight: feed.weight,
          active: feed.active,
          lastFetched: feed.last_fetched,
          articleCount: feed.article_count,
        })),
        articles: [],
        runs: [],
        config: {
          topicLimits: defaultConfig.topic_limits,
          summaryLength: defaultConfig.summary_length,
          recipients: defaultConfig.recipients,
        },
        testEmails: [],
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
