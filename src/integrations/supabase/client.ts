
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const EXPECTED_PROJECT_ID = import.meta.env.VITE_SUPABASE_PROJECT_ID;

// Extract Project ID from URL for validation
// URL format: https://<project_id>.supabase.co
const getProjectIdFromUrl = (url: string) => {
  try {
    const hostname = new URL(url).hostname;
    return hostname.split('.')[0];
  } catch (e) {
    return 'unknown';
  }
};

const connectedProjectId = getProjectIdFromUrl(SUPABASE_URL);

console.group("🔌 Supabase Connection Debug");
console.info(`%cConnected to Project ID: ${connectedProjectId}`, "color: #00e676; font-weight: bold;");

if (EXPECTED_PROJECT_ID && connectedProjectId !== EXPECTED_PROJECT_ID) {
  console.warn(
    `%c⚠️ MISMATCH DETECTED! Expected: ${EXPECTED_PROJECT_ID}, Found: ${connectedProjectId}`,
    "color: #ff3d00; font-weight: bold; font-size: 12px;"
  );
  console.warn("Please check your .env file and clear browser cache/localStorage if necessary.");
} else if (!EXPECTED_PROJECT_ID) {
  console.debug("VITE_SUPABASE_PROJECT_ID not set in .env, skipping mismatch check.");
} else {
  console.info("%c✅ Connection Verified Match", "color: #2979ff;");
}
console.groupEnd();

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});