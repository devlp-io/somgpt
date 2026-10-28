// SomGPT runtime config.
//
// BACKEND MODE (recommended): set SOMGPT_API_BASE to your server's URL and the
// key stays server-side. Used automatically when the page is served by the Node
// server itself (local dev, Vercel).
//   window.SOMGPT_API_BASE = 'https://somgpt.vercel.app';
//
// DIRECT MODE: on static hosting (GitHub Pages) with no backend, the client can
// talk to Token Harbor straight from the browser. Token Harbor sends permissive
// CORS, so this works without a server — you paste your own API key once (stored
// only in this browser's localStorage) and it is sent only to Token Harbor.
// Set SOMGPT_DIRECT = true to force it, or leave false to auto-detect.
window.SOMGPT_API_BASE = '';
window.SOMGPT_DIRECT = false;
window.SOMGPT_DIRECT_BASE = 'https://tokenharbor.ai';
window.SOMGPT_MODEL = 'deepseek-v4.1-flash:free';

// WARNING: this key is embedded in the client and therefore PUBLIC on any site
// that serves this file (GitHub Pages included) — anyone can read and abuse it.
// Used only in direct mode. Prefer a backend (SOMGPT_API_BASE) so the key stays
// server-side, or clear this and let users paste their own key in Settings.
window.SOMGPT_DIRECT_KEY = 'thk_live_HRcbBKtPNWEEje9nI3bGO1CQiShmVUuiPqo2fBGmfKKaf5Tr9_Y3kwXvr6sN9bLF';
