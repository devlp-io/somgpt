// SomGPT runtime config.
//
// BACKEND MODE (recommended): set SOMGPT_API_BASE to your server's URL and the
// key stays server-side. Used automatically when the page is served by the Node
// server itself (local dev, Vercel).
//   window.SOMGPT_API_BASE = 'https://somgpt.vercel.app';
//
// DIRECT MODE: on static hosting (GitHub Pages) with no backend, the client can
// talk to the provider straight from the browser. The provider must send
// permissive CORS (OpenRouter and Token Harbor both do). The key is injected at
// deploy time from the SOMGPT_DIRECT_KEY Actions secret — it is NOT stored in
// this repo. Locally you can hardcode it here (that file is gitignored? no —
// keep secrets out of git; use the env/workflow instead).
window.SOMGPT_API_BASE = '';
window.SOMGPT_DIRECT = false;
window.SOMGPT_DIRECT_BASE = 'https://openrouter.ai/api';
window.SOMGPT_MODEL = 'deepseek/deepseek-v3.2';

// Injected at deploy time by .github/workflows/pages.yml from the repo secret
// SOMGPT_DIRECT_KEY. Empty in the repo on purpose — never commit the real key.
window.SOMGPT_DIRECT_KEY = '';
