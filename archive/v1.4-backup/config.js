// NUTRIPRO - 运动营养数据平台
// ============================================================

// ===== SUPABASE CONFIG =====
// Replace with your Supabase project credentials after creating the project
const SUPABASE_CONFIG = {
  url: 'https://daurcikmobtdpwowdsyg.supabase.co',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRhdXJjaWttb2J0ZHB3b3dkc3lnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA1NTM0MzEsImV4cCI6MjA5NjEyOTQzMX0.jUFk1g-rcrOalTuQLuiDW3hHuDY3IUvmk-hPoUL95Qg'
};

// ===== CONFIG — Centralized constants =====
const CONFIG = {
  // Cloud sync
  POLL_INTERVAL_MS: 30000,       // Polling fallback interval
  SDK_TIMEOUT_MS: 10000,         // Supabase SDK load timeout
  SDK_RETRY_TIMEOUT_MS: 15000,   // SDK wait before giving up
  NOTIFICATION_TIMEOUT_MS: 8000, // Auto-dismiss notifications
  // Session
  DEFAULT_SESSION_DAYS: 30,      // Default session duration
  // Food
  FOOD_GRID_LIMIT: 60,           // Max foods to render in grid
  MAX_COMPARE_FOODS: 10,         // Max foods for comparison
  RANKING_TOP_N: 100,            // Ranking top N items
  // UI
  COOKIE_EXPIRE_DAYS: 365,       // Cookie expiry for exported results
  // Auth
  MIN_PASSWORD_LENGTH: 6,        // Min password length for registration
  MIN_NEW_PASSWORD_LENGTH: 4,    // Min new password length for changes
  INVITE_CODE_LENGTH: 9,         // ABCD-1234 format
};

// ===== UTILITY FUNCTIONS =====
/** Escape HTML special characters to prevent XSS */
function escapeHtml(str) {
  if (typeof str !== 'string' && typeof str !== 'number' && typeof str !== 'boolean') return '';
  const div = document.createElement('div');
  div.appendChild(document.createTextNode(String(str)));
  return div.innerHTML;
}