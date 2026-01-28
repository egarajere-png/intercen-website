import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/supabase';

const supabaseUrl = 'https://nnljrawwhibazudjudht.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ubGpyYXd3aGliYXp1ZGp1ZGh0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkwNjc1ODQsImV4cCI6MjA4NDY0MzU4NH0.wMMeffZGj7mbStjglTE5ZOknO-QKjX9aAG1xcjKBl5c';

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

