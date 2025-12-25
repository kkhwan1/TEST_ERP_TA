import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL || `https://${process.env.SUPABASE_PROJECT_ID}.supabase.co`;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SECRET_KEY;

if (!supabaseKey) {
  throw new Error(
    "SUPABASE_SERVICE_KEY or SUPABASE_SECRET_KEY environment variable is required."
  );
}

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseKey);

// Export for convenience
export { supabaseUrl, supabaseKey };
