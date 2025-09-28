// --- Configura tus credenciales ---
const SUPABASE_URL = "https://zteiessixmzfdlihrwvb.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp0ZWllc3NpeG16ZmRsaWhyd3ZiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwNzMzODgsImV4cCI6MjA3NDY0OTM4OH0.1ButehR2IXCzlFbV7ag3uAIjemPhyNzADGr2V9AGvMU";

// --- Cliente Supabase v2 ---
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true }
});

// helpers
const toast = (text, type="info") => {
  Toastify({
    text, gravity:"top", position:"right",
    className: type==="error" ? "to-error" : type==="ok" ? "to-ok" : "to-info",
    close:true, duration:3000
  }).showToast();
};
