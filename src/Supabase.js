import { createClient } from "@supabase/supabase-js";
 
const SUPABASE_URL = "https://cyrgfmejekszyzexhpez.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN5cmdmbWVqZWtzenl6ZXhocGV6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0NjEwNTUsImV4cCI6MjA5NjAzNzA1NX0.vyN9NVLjSZpekLf1YsIY6LIqzGJnEXOFgiXj0JNOZJ0";
 
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
 
export default supabase;
 