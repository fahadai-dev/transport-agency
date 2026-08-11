// ============================================================
// Hosneara Transport Agency — Supabase Config
// এখানে তোমার Supabase প্রজেক্টের URL আর anon key বসাও।
// Supabase Dashboard → Project Settings → API থেকে পাবে।
// ============================================================

const SUPABASE_URL = "https://gclfqfocfzijhhdvkbdt.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdjbGZxZm9jZnppamhoZHZrYmR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY0MDQ3NjMsImV4cCI6MjEwMTk4MDc2M30.pY-EQ-rVk9HRr1ZNjwy6B7SzeJZ4QNDoFKkOYr4ZwLQ";

// গ্লোবালি অ্যাক্সেসযোগ্য supabase client — সব পেজে এটাই ব্যবহার হবে
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
