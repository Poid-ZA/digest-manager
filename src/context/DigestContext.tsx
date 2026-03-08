import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  createFeed,
  deleteFeed as deleteFeedRequest,
  fetchState,
  importFeeds as importFeedsRequest,
  resetWorkspace,
  saveConfig as saveConfigRequest,
  toggleFeed,
  triggerRun as triggerRunRequest,
  updateFeed,
} from "@/lib/backend-api";
import { DigestAppState, DigestConfig, FeedDraft, GeneratedDigest } from "@/lib/digest-types";

const EMPTY_STATE: DigestAppState = {
  feeds: [],
  articles: [],
  runs: [],
  config: {
    topicLimits: { AI: 3, Cybersecurity: 2, Engineering: 2, Technology: 2 },
    summaryLength: "medium",
    recipients: [],
  },
  testEmails: [],
};

interface DigestContextValue extends DigestAppState {
  loading: boolean;
  refreshing: boolean;
  exportFeeds: () => string;
  importFeeds: (payload: string) => Promise<number>;
  saveFeed: (draft: FeedDraft, feedId?: string) => Promise<void>;
  deleteFeed: (feedId: string) => Promise<void>;
  toggleFeedActive: (feedId: string) => Promise<void>;
  saveConfig: (config: DigestConfig) => Promise<void>;
  triggerRun: (config?: DigestConfig) => Promise<GeneratedDigest>;
  resetWorkspace: () => Promise<void>;
}

const DigestContext = createContext<DigestContextValue | null>(null);

export function DigestProvider({ children }: PropsWithChildren) {
  const [state, setState] = useState<DigestAppState>(EMPTY_STATE);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const next = await fetchState();
    setState(next);
  }, []);

  useEffect(() => {
    load()
      .catch((error) => {
        console.error("Failed to load digest state", error);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [load]);

  const withRefresh = useCallback(async <T,>(work: () => Promise<T>) => {
    setRefreshing(true);
    try {
      return await work();
    } finally {
      setRefreshing(false);
    }
  }, []);

  const exportFeeds = useCallback(() => JSON.stringify(state.feeds, null, 2), [state.feeds]);

  const importFeeds = useCallback(async (payload: string) => {
    const parsed = JSON.parse(payload);
    if (!Array.isArray(parsed)) {
      throw new Error("Import file must contain an array of feeds.");
    }
    const response = await withRefresh(() => importFeedsRequest(parsed));
    setState(response.state);
    return response.importedCount;
  }, [withRefresh]);

  const saveFeed = useCallback(async (draft: FeedDraft, feedId?: string) => {
    const nextState = await withRefresh(() => (feedId ? updateFeed(feedId, draft) : createFeed(draft)));
    setState(nextState);
  }, [withRefresh]);

  const deleteFeed = useCallback(async (feedId: string) => {
    const nextState = await withRefresh(() => deleteFeedRequest(feedId));
    setState(nextState);
  }, [withRefresh]);

  const toggleFeedActive = useCallback(async (feedId: string) => {
    const nextState = await withRefresh(() => toggleFeed(feedId));
    setState(nextState);
  }, [withRefresh]);

  const saveConfig = useCallback(async (config: DigestConfig) => {
    const nextState = await withRefresh(() => saveConfigRequest(config));
    setState(nextState);
  }, [withRefresh]);

  const triggerRun = useCallback(async (config?: DigestConfig) => {
    const response = await withRefresh(() => triggerRunRequest(config));
    setState((current) => {
      const nextRuns = [
        response.digest.run,
        ...response.state.runs.filter((run) => run.id !== response.digest.run.id),
      ].sort((left, right) => Date.parse(right.date) - Date.parse(left.date));

      return {
        ...response.state,
        runs: nextRuns,
      };
    });
    return response.digest;
  }, [withRefresh]);

  const handleResetWorkspace = useCallback(async () => {
    const nextState = await withRefresh(() => resetWorkspace());
    setState(nextState);
  }, [withRefresh]);

  const value = useMemo(
    () => ({
      ...state,
      loading,
      refreshing,
      exportFeeds,
      importFeeds,
      saveFeed,
      deleteFeed,
      toggleFeedActive,
      saveConfig,
      triggerRun,
      resetWorkspace: handleResetWorkspace,
    }),
    [
      state,
      loading,
      refreshing,
      exportFeeds,
      importFeeds,
      saveFeed,
      deleteFeed,
      toggleFeedActive,
      saveConfig,
      triggerRun,
      handleResetWorkspace,
    ],
  );

  return <DigestContext.Provider value={value}>{children}</DigestContext.Provider>;
}

export function useDigest() {
  const context = useContext(DigestContext);
  if (!context) {
    throw new Error("useDigest must be used inside a DigestProvider.");
  }
  return context;
}
