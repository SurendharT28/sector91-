import { createClient } from '@supabase/supabase-js'
import type { Database } from './types'

// ✅ Correct Vite environment variables
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string
const EXPECTED_PROJECT_ID = import.meta.env.VITE_SUPABASE_PROJECT_ID as string

// ✅ Safety check (VERY IMPORTANT)
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    "❌ Missing Supabase environment variables. Check Vercel settings."
  )
}

// Extract project ID from URL
const getProjectIdFromUrl = (url: string) => {
  try {
    const hostname = new URL(url).hostname
    return hostname.split('.')[0]
  } catch {
    return 'unknown'
  }
}

const connectedProjectId = getProjectIdFromUrl(SUPABASE_URL)

// Debug logs
console.group("🔌 Supabase Connection Debug")
console.info(
  `%cConnected to Project ID: ${connectedProjectId}`,
  "color: #00e676; font-weight: bold;"
)

if (EXPECTED_PROJECT_ID && connectedProjectId !== EXPECTED_PROJECT_ID) {
  console.warn(
    `%c⚠️ MISMATCH DETECTED! Expected: ${EXPECTED_PROJECT_ID}, Found: ${connectedProjectId}`,
    "color: #ff3d00; font-weight: bold;"
  )
} else if (!EXPECTED_PROJECT_ID) {
  console.debug("VITE_SUPABASE_PROJECT_ID not set, skipping validation.")
} else {
  console.info("%c✅ Connection Verified Match", "color: #2979ff;")
}
console.groupEnd()

// ✅ Create Supabase client safely
export const supabase = createClient<Database>(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
)
