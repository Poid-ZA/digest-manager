import * as localApi from "@/lib/api";
import * as supabaseApi from "@/lib/supabase-api";
import { hasSupabaseConfig } from "@/lib/supabase";

const backend = hasSupabaseConfig ? supabaseApi : localApi;

export const fetchState = backend.fetchState;
export const createFeed = backend.createFeed;
export const updateFeed = backend.updateFeed;
export const deleteFeed = backend.deleteFeed;
export const toggleFeed = backend.toggleFeed;
export const importFeeds = backend.importFeeds;
export const saveConfig = backend.saveConfig;
export const triggerRun = backend.triggerRun;
export const resetWorkspace = backend.resetWorkspace;
