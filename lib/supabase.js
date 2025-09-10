import { createClient } from '@supabase/supabase-js';

// Supabase project URL and anon key
const SUPABASE_URL = 'https://tmzyrfsxtwuyawsoagph.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRtenlyZnN4dHd1eWF3c29hZ3BoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY4MDY0NzEsImV4cCI6MjA3MjM4MjQ3MX0.btkVpuDL_YConOPIyzO5hl1TSfHSbEx2ywCl8GvK8Rk';

// Create a single supabase client for your app
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

