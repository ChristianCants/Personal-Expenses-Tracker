
import { createClient } from '@supabase/supabase-js';

// It is crucial to use environment variables for these values in a real application.
// For this self-contained demo, we are hardcoding them, but you should
// replace these with a secure environment variable management solution for production.
const supabaseUrl = 'https://ghvbjjlzrlxlbxqelcnk.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdodmJqamx6cmx4bGJ4cWVsY25rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU3NDA5NjQsImV4cCI6MjA3MTMxNjk2NH0.ThyEZNEAndWn_O4MGQm5sh733soyd12ZDBGx_ubmlRw';

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Supabase URL and anonymous key are not set. Please check your environment variables.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
