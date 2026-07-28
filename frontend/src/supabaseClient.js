import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://rehuyaappyykhktlowuv.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJlaHV5YWFwcHl5a2hrdGxvd3V2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MzY1OTM4MywiZXhwIjoyMDk5MjM1MzgzfQ.xZ2MgbOhmFNf6tx9mb5HgELrjIxUmgm50oR70_P31To';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
