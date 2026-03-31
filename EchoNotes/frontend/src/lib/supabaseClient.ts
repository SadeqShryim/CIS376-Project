/**
 * supabaseClient.ts
 * -----------------
 * Initializes and exports a single Supabase client instance that the rest
 * of the app can import.  The client talks to our Supabase project using
 * the URL and anon (public) key stored in environment variables.
 *
 * Environment variables are loaded by Vite from the .env.local file.
 * They MUST be prefixed with VITE_ so Vite exposes them to the browser.
 *
 * If either variable is missing the app will throw immediately on startup
 * so we catch configuration errors early.
 */

import { createClient } from '@supabase/supabase-js';

// --- Read env vars ---------------------------------------------------------
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

// --- Validate --------------------------------------------------------------
if (!supabaseUrl) {
  throw new Error(
    'Missing VITE_SUPABASE_URL. ' +
    'Copy .env.example to .env.local and fill in your Supabase project URL.'
  );
}

if (!supabaseAnonKey) {
  throw new Error(
    'Missing VITE_SUPABASE_ANON_KEY. ' +
    'Copy .env.example to .env.local and fill in your Supabase anon key.'
  );
}

// --- Create & export the client --------------------------------------------
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
