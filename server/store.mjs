import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createDefaultState } from "./default-state.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.resolve(__dirname, "../data");
const statePath = path.join(dataDir, "digest-state.json");
const LEGACY_NVD_RSS_URL = "https://nvd.nist.gov/feeds/xml/cve/misc/nvd-rss.xml";
const NVD_API_URL = "https://services.nvd.nist.gov/rest/json/cves/2.0";

function normalizeState(state) {
  let changed = false;

  const feeds = state.feeds.map((feed) => {
    if (feed.id === "feed-nvd" && feed.url === LEGACY_NVD_RSS_URL) {
      changed = true;
      return { ...feed, url: NVD_API_URL };
    }
    return feed;
  });

  return {
    state: changed ? { ...state, feeds } : state,
    changed,
  };
}

async function ensureDataFile() {
  await fs.mkdir(dataDir, { recursive: true });
  try {
    await fs.access(statePath);
  } catch {
    await fs.writeFile(statePath, JSON.stringify(createDefaultState(), null, 2));
  }
}

export async function readState() {
  await ensureDataFile();
  const raw = await fs.readFile(statePath, "utf-8");
  const normalized = normalizeState(JSON.parse(raw));
  if (normalized.changed) {
    await writeState(normalized.state);
  }
  return normalized.state;
}

export async function writeState(state) {
  await ensureDataFile();
  await fs.writeFile(statePath, JSON.stringify(state, null, 2));
  return state;
}

export async function updateState(mutator) {
  const current = await readState();
  const next = await mutator(structuredClone(current));
  await writeState(next);
  return next;
}

export async function resetState() {
  const state = createDefaultState();
  await writeState(state);
  return state;
}

export function getStatePath() {
  return statePath;
}
