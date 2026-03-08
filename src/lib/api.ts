import { DigestAppState, DigestConfig, FeedDraft, GeneratedDigest, TestEmailLog } from "@/lib/digest-types";

async function requestJson<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const response = await fetch(input, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({ error: "Request failed." }));
    throw new Error(payload.error || "Request failed.");
  }

  return response.json() as Promise<T>;
}

export function fetchState() {
  return requestJson<DigestAppState>("/api/state");
}

export function createFeed(draft: FeedDraft) {
  return requestJson<DigestAppState>("/api/feeds", {
    method: "POST",
    body: JSON.stringify(draft),
  });
}

export function updateFeed(feedId: string, draft: FeedDraft) {
  return requestJson<DigestAppState>(`/api/feeds/${feedId}`, {
    method: "PUT",
    body: JSON.stringify(draft),
  });
}

export function deleteFeed(feedId: string) {
  return requestJson<DigestAppState>(`/api/feeds/${feedId}`, {
    method: "DELETE",
  });
}

export function toggleFeed(feedId: string) {
  return requestJson<DigestAppState>(`/api/feeds/${feedId}/toggle`, {
    method: "POST",
  });
}

export function importFeeds(payload: FeedDraft[]) {
  return requestJson<{ importedCount: number; state: DigestAppState }>("/api/feeds/import", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function saveConfig(config: DigestConfig) {
  return requestJson<DigestAppState>("/api/config", {
    method: "PUT",
    body: JSON.stringify(config),
  });
}

export function triggerRun(config?: DigestConfig) {
  return requestJson<{ state: DigestAppState; digest: GeneratedDigest }>("/api/runs", {
    method: "POST",
    body: JSON.stringify(config ? { config } : {}),
  });
}

export function sendTestEmail(config?: DigestConfig) {
  return requestJson<{ state: DigestAppState; emailLog: TestEmailLog }>("/api/config/test-email", {
    method: "POST",
    body: JSON.stringify(config ? { config } : {}),
  });
}

export function resetWorkspace() {
  return requestJson<DigestAppState>("/api/reset", {
    method: "POST",
  });
}
