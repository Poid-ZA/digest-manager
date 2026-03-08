import { describe, expect, it } from "vitest";
import { createTestEmailLog, generateDigest, normalizeFeedDraft } from "@/lib/digest-engine";
import { DigestAppState } from "@/lib/digest-types";

function createState(): DigestAppState {
  return {
    feeds: [
      { id: "feed-1", name: "Feed 1", url: "https://example.com/rss", topic: "Technology", weight: 8, active: true, lastFetched: null, articleCount: 1 },
      { id: "feed-2", name: "Feed 2", url: "https://example.com/ai", topic: "AI", weight: 9, active: true, lastFetched: null, articleCount: 1 },
    ],
    articles: [
      {
        id: "article-1",
        feedId: "feed-1",
        feedName: "Feed 1",
        title: "Platform engineering is growing up",
        url: "https://example.com/article-1",
        topic: "Technology",
        publishedAt: "2026-03-08T08:00:00Z",
        fetchedAt: "2026-03-08T08:05:00Z",
        fullText: "Full article text",
        summary: "Platform teams are standardising delivery and infrastructure.",
      },
      {
        id: "article-2",
        feedId: "feed-2",
        feedName: "Feed 2",
        title: "Enterprise AI guardrails",
        url: "https://example.com/article-2",
        topic: "AI",
        publishedAt: "2026-03-08T09:00:00Z",
        fetchedAt: "2026-03-08T09:05:00Z",
        fullText: "Full article text",
        summary: "AI governance tools are becoming table stakes for regulated teams.",
      },
    ],
    runs: [],
    config: {
      topicLimits: { AI: 3, Cybersecurity: 2, Engineering: 2, Technology: 2 },
      summaryLength: "medium",
      recipients: ["ops@example.com"],
    },
    testEmails: [],
  };
}

describe("digest engine", () => {
  it("generates a successful digest for the current state", () => {
    const state = createState();
    const result = generateDigest(state, "manual");

    expect(result.run.status).toBe("success");
    expect(result.run.includedArticles).toBeGreaterThan(0);
    expect(result.preview).toContain("Daily Tech Digest");
  });

  it("fails when no active feeds are configured", () => {
    const state = createState();
    state.feeds = state.feeds.map((feed) => ({ ...feed, active: false }));

    const result = generateDigest(state, "manual");

    expect(result.run.status).toBe("failed");
    expect(result.run.errors).toContain("No active feeds configured.");
  });

  it("creates a test email log with delivery metadata", () => {
    const state = createState();
    const result = createTestEmailLog(state);

    expect(result.recipientCount).toBe(state.config.recipients.length);
    expect(result.subject).toContain("Daily Tech Digest Preview");
    expect(result.preview).toContain("Daily Tech Digest");
  });

  it("rejects invalid feed urls", () => {
    expect(() =>
      normalizeFeedDraft({
        name: "Bad feed",
        url: "ftp://example.com",
        topic: "Technology",
        weight: 5,
        active: true,
      }),
    ).toThrow("Feed URL must start with http:// or https://.");
  });
});
