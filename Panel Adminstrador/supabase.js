// --- Configura tus credenciales ---
const SUPABASE_URL = "https://rjzvulcelalcmgbakxof.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJqenZ1bGNlbGFsY21nYmFreG9mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkxMTMwNTEsImV4cCI6MjA3NDY4OTA1MX0.T-11naAXpTHiN9D1uRpV-VoduHNFmfyrUY8vYjNMV1Q";

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
