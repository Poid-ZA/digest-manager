import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import nodemailer from "nodemailer";
import { createTestEmail, triggerDigestRun } from "./digest-service.mjs";
import { getStatePath, readState, resetState, updateState } from "./store.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const distDir = path.join(rootDir, "dist");
const port = Number(process.env.API_PORT || process.env.PORT || 8788);

const app = express();
app.use(express.json({ limit: "2mb" }));

function createTransporter() {
  if (!process.env.SMTP_HOST || !process.env.SMTP_PORT) {
    return null;
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: process.env.SMTP_SECURE === "true",
    auth:
      process.env.SMTP_USER && process.env.SMTP_PASS
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
  });
}

function sanitizeFeedDraft(input) {
  return {
    name: String(input?.name ?? "").trim(),
    url: String(input?.url ?? "").trim(),
    topic: input?.topic ?? "Technology",
    weight: Number(input?.weight ?? 5),
    active: Boolean(input?.active ?? true),
  };
}

function assertFeedDraft(feed) {
  if (!feed.name) {
    throw new Error("Feed name is required.");
  }
  if (!/^https?:\/\/.+/i.test(feed.url)) {
    throw new Error("Feed URL must start with http:// or https://.");
  }
  if (!Number.isFinite(feed.weight) || feed.weight < 1 || feed.weight > 10) {
    throw new Error("Feed weight must be between 1 and 10.");
  }
}

function jsonError(res, status, message) {
  res.status(status).json({ error: message });
}

app.get("/api/health", async (_req, res) => {
  const state = await readState();
  res.json({
    ok: true,
    statePath: getStatePath(),
    feeds: state.feeds.length,
    articles: state.articles.length,
    runs: state.runs.length,
  });
});

app.get("/api/state", async (_req, res) => {
  res.json(await readState());
});

app.post("/api/feeds", async (req, res) => {
  try {
    const draft = sanitizeFeedDraft(req.body);
    assertFeedDraft(draft);
    const nextState = await updateState((state) => {
      state.feeds.unshift({
        id: `feed-${Math.random().toString(36).slice(2, 10)}`,
        ...draft,
        lastFetched: null,
        articleCount: 0,
      });
      return state;
    });
    res.status(201).json(nextState);
  } catch (error) {
    jsonError(res, 400, error instanceof Error ? error.message : "Unable to create feed.");
  }
});

app.put("/api/feeds/:feedId", async (req, res) => {
  try {
    const draft = sanitizeFeedDraft(req.body);
    assertFeedDraft(draft);
    const nextState = await updateState((state) => {
      const index = state.feeds.findIndex((feed) => feed.id === req.params.feedId);
      if (index === -1) {
        throw new Error("Feed not found.");
      }
      state.feeds[index] = { ...state.feeds[index], ...draft };
      return state;
    });
    res.json(nextState);
  } catch (error) {
    jsonError(res, error instanceof Error && error.message === "Feed not found." ? 404 : 400, error instanceof Error ? error.message : "Unable to update feed.");
  }
});

app.delete("/api/feeds/:feedId", async (req, res) => {
  try {
    const nextState = await updateState((state) => {
      state.feeds = state.feeds.filter((feed) => feed.id !== req.params.feedId);
      state.articles = state.articles.filter((article) => article.feedId !== req.params.feedId);
      return state;
    });
    res.json(nextState);
  } catch (error) {
    jsonError(res, 400, error instanceof Error ? error.message : "Unable to delete feed.");
  }
});

app.post("/api/feeds/:feedId/toggle", async (req, res) => {
  try {
    const nextState = await updateState((state) => {
      const feed = state.feeds.find((candidate) => candidate.id === req.params.feedId);
      if (!feed) {
        throw new Error("Feed not found.");
      }
      feed.active = !feed.active;
      return state;
    });
    res.json(nextState);
  } catch (error) {
    jsonError(res, error instanceof Error && error.message === "Feed not found." ? 404 : 400, error instanceof Error ? error.message : "Unable to toggle feed.");
  }
});

app.post("/api/feeds/import", async (req, res) => {
  try {
    if (!Array.isArray(req.body)) {
      throw new Error("Import payload must be an array.");
    }
    const nextState = await updateState((state) => {
      for (const rawFeed of req.body) {
        const draft = sanitizeFeedDraft(rawFeed);
        assertFeedDraft(draft);
        state.feeds.unshift({
          id: `feed-${Math.random().toString(36).slice(2, 10)}`,
          ...draft,
          lastFetched: null,
          articleCount: 0,
        });
      }
      return state;
    });
    res.json({ importedCount: req.body.length, state: nextState });
  } catch (error) {
    jsonError(res, 400, error instanceof Error ? error.message : "Unable to import feeds.");
  }
});

app.put("/api/config", async (req, res) => {
  try {
    const nextState = await updateState((state) => {
      state.config = req.body;
      return state;
    });
    res.json(nextState);
  } catch (error) {
    jsonError(res, 400, error instanceof Error ? error.message : "Unable to save config.");
  }
});

app.post("/api/config/test-email", async (req, res) => {
  try {
    const transporter = createTransporter();
    const nextState = await updateState(async (state) => {
      if (req.body?.config) {
        state.config = req.body.config;
      }
      const log = await createTestEmail(state, transporter);
      state.testEmails.unshift(log);
      state.testEmails = state.testEmails.slice(0, 25);
      state.config = req.body?.config ?? state.config;
      state.lastTestEmail = log;
      return state;
    });
    res.json({ state: nextState, emailLog: nextState.testEmails[0] });
  } catch (error) {
    jsonError(res, 400, error instanceof Error ? error.message : "Unable to generate test email.");
  }
});

app.post("/api/runs", async (req, res) => {
  try {
    const next = await updateState(async (state) => {
      if (req.body?.config) {
        state.config = req.body.config;
      }
      const result = await triggerDigestRun(state, { triggeredBy: "manual" });
      result.nextState.lastDigest = result.digest;
      return result.nextState;
    });
    res.json({ state: next, digest: next.lastDigest });
  } catch (error) {
    jsonError(res, 500, error instanceof Error ? error.message : "Unable to trigger run.");
  }
});

app.post("/api/reset", async (_req, res) => {
  res.json(await resetState());
});

app.use(express.static(distDir));
app.get("/{*path}", async (req, res, next) => {
  if (req.path.startsWith("/api")) {
    next();
    return;
  }

  res.sendFile(path.join(distDir, "index.html"), (error) => {
    if (error) {
      next();
    }
  });
});

app.listen(port, () => {
  console.log(`[digest-manager] API listening on http://127.0.0.1:${port}`);
});
