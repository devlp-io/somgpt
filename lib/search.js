import { lookup } from 'node:dns/promises';
import net from 'node:net';

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

const PROVIDER = (process.env.SEARCH_PROVIDER || 'auto').toLowerCase();
const API_KEY = process.env.SEARCH_API_KEY || '';
const ENDPOINT = (process.env.SEARCH_ENDPOINT || '').replace(/\/+$/, '');

const FETCH_TIMEOUT_MS = Number(process.env.SEARCH_TIMEOUT_MS) || 12_000;
const MAX_RESULTS = Number(process.env.SEARCH_MAX_RESULTS) || 6;
const MAX_PAGE_BYTES = Number(process.env.SEARCH_MAX_PAGE_BYTES) || 1_500_000;
const MAX_PAGE_CHARS = Number(process.env.SEARCH_MAX_PAGE_CHARS) || 8_000;

/* ------------------------------------------------------------------ */
/* Public API                                                          */
/* ------------------------------------------------------------------ */

export async function webSearch(query, limit = MAX_RESULTS) {
  const q = String(query || '').trim();
  if (!q) return { query: '', provider: 'none', results: [] };

  const providers = resolveProviders();
  for (const provider of providers) {
    try {
      const results = await provider.run(q, limit);
      if (results.length) {
        return { query: q, provider: provider.name, results: dedupe(results).slice(0, limit) };
      }
    } catch (error) {
      // Try the next provider in the chain.
      void error;
    }
  }
  return { query: q, provider: 'none', results: [] };
}

export async function fetchPage(inputUrl, maxChars = MAX_PAGE_CHARS) {
  const url = normalizeUrl(inputUrl);
  if (!url) return { url: inputUrl, ok: false, error: 'unsupported or blocked URL', text: '' };

  const response = await safeFetch(url, { accept: 'text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.5' });
  if (!response) return { url, ok: false, error: 'could not fetch page', text: '' };
  if (!response.ok) return { url, ok: false, error: `HTTP ${response.status}`, text: '' };

  const contentType = response.headers.get('content-type') || '';
  if (!/text\/|html|json|xml|plain/i.test(contentType)) {
    return { url, ok: false, error: `unsupported content type: ${contentType || 'unknown'}`, text: '' };
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let raw = '';
  let bytes = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    bytes += value.byteLength;
    raw += decoder.decode(value, { stream: true });
    if (bytes >= MAX_PAGE_BYTES) {
      await reader.cancel().catch(() => {});
      break;
    }
  }

  const text = /html/i.test(contentType) ? htmlToText(raw) : raw;
  const cleaned = text.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  return {
    url,
    ok: true,
    title: extractTitle(raw),
    text: cleaned.slice(0, maxChars),
    truncated: cleaned.length > maxChars,
  };
}

/* ------------------------------------------------------------------ */
/* Provider chain                                                      */
/* ------------------------------------------------------------------ */

function resolveProviders() {
  const configured = [];
  const keyless = [
    { name: 'duckduckgo', run: searchDuckDuckGo },
    { name: 'wikipedia', run: searchWikipedia },
  ];

  if (API_KEY && (PROVIDER === 'brave' || PROVIDER === 'auto')) configured.push({ name: 'brave', run: searchBrave });
  if (API_KEY && (PROVIDER === 'serper' || PROVIDER === 'auto')) configured.push({ name: 'serper', run: searchSerper });
  if (API_KEY && (PROVIDER === 'tavily' || PROVIDER === 'auto')) configured.push({ name: 'tavily', run: searchTavily });
  if (ENDPOINT && (PROVIDER === 'searxng' || PROVIDER === 'auto')) configured.push({ name: 'searxng', run: searchSearxng });

  if (PROVIDER === 'keyless') return keyless;
  return [...configured, ...keyless];
}

async function searchDuckDuckGo(query, limit) {
  const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
  const response = await fetchWithTimeout(url, { headers: requestHeaders({ accept: 'application/json' }) });
  if (!response.ok) return [];
  const data = await response.json();

  const results = [];
  if (data.AbstractText && data.AbstractURL) {
    results.push({ title: data.Heading || data.AbstractSource || 'DuckDuckGo', url: data.AbstractURL, snippet: data.AbstractText });
  }
  for (const item of asArray(data.Results)) {
    if (item.FirstURL && item.Text) results.push({ title: stripTags(item.Text), url: item.FirstURL, snippet: stripTags(item.Text) });
  }
  flattenTopics(data.RelatedTopics, results);
  return results;
}

function flattenTopics(topics, out) {
  for (const topic of asArray(topics)) {
    if (topic.Topics) {
      flattenTopics(topic.Topics, out);
    } else if (topic.FirstURL && topic.Text) {
      out.push({ title: stripTags(topic.Text), url: topic.FirstURL, snippet: stripTags(topic.Text) });
    }
  }
}

async function searchWikipedia(query, limit) {
  const url = `https://en.wikipedia.org/w/api.php?action=query&list=search&format=json&srlimit=${limit}&srsearch=${encodeURIComponent(query)}`;
  const response = await fetchWithTimeout(url, { headers: requestHeaders({ accept: 'application/json' }) });
  if (!response.ok) return [];
  const data = await response.json();
  return asArray(data?.query?.search).map((item) => ({
    title: item.title,
    url: `https://en.wikipedia.org/wiki/${encodeURIComponent(item.title.replace(/\s/g, '_'))}`,
    snippet: stripTags(item.snippet || ''),
  }));
}

async function searchBrave(query, limit) {
  const url = `https://api.search.brave.com/res/v1/web/search?count=${limit}&q=${encodeURIComponent(query)}`;
  const response = await fetchWithTimeout(url, {
    headers: requestHeaders({ accept: 'application/json', 'X-Subscription-Token': API_KEY }),
  });
  if (!response.ok) return [];
  const data = await response.json();
  return asArray(data?.web?.results).map((item) => ({
    title: item.title,
    url: item.url,
    snippet: stripTags(item.description || ''),
  }));
}

async function searchSerper(query, limit) {
  const response = await fetchWithTimeout('https://google.serper.dev/search', {
    method: 'POST',
    headers: requestHeaders({ accept: 'application/json', 'Content-Type': 'application/json', 'X-API-KEY': API_KEY }),
    body: JSON.stringify({ q: query, num: limit }),
  });
  if (!response.ok) return [];
  const data = await response.json();
  return asArray(data?.organic).map((item) => ({
    title: item.title,
    url: item.link,
    snippet: stripTags(item.snippet || ''),
  }));
}

async function searchTavily(query, limit) {
  const response = await fetchWithTimeout('https://api.tavily.com/search', {
    method: 'POST',
    headers: requestHeaders({ accept: 'application/json', 'Content-Type': 'application/json' }),
    body: JSON.stringify({ api_key: API_KEY, query, max_results: limit, search_depth: 'basic' }),
  });
  if (!response.ok) return [];
  const data = await response.json();
  return asArray(data?.results).map((item) => ({
    title: item.title,
    url: item.url,
    snippet: stripTags(item.content || ''),
  }));
}

async function searchSearxng(query, limit) {
  const url = `${ENDPOINT}/search?q=${encodeURIComponent(query)}&format=json`;
  const response = await fetchWithTimeout(url, { headers: requestHeaders({ accept: 'application/json' }) });
  if (!response.ok) return [];
  const data = await response.json();
  return asArray(data?.results).map((item) => ({
    title: item.title,
    url: item.url,
    snippet: stripTags(item.content || ''),
  }));
}

/* ------------------------------------------------------------------ */
/* Networking                                                          */
/* ------------------------------------------------------------------ */

function requestHeaders(extra = {}) {
  return { 'User-Agent': USER_AGENT, 'Accept-Language': 'en-US,en;q=0.9', ...extra };
}

async function fetchWithTimeout(url, options = {}, timeoutMs = FETCH_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function safeFetch(url, { accept, maxRedirects = 4 } = {}) {
  let current = url;
  for (let hop = 0; hop <= maxRedirects; hop += 1) {
    if (!(await isPublicHttpUrl(current))) return null;

    const response = await fetchWithTimeout(current, {
      headers: requestHeaders({ accept: accept || '*/*' }),
      redirect: 'manual',
    });

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      if (!location) return response;
      const next = normalizeUrl(new URL(location, current).toString());
      if (!next) return null;
      current = next;
      continue;
    }
    return response;
  }
  return null;
}

function normalizeUrl(input) {
  try {
    const url = new URL(String(input).trim());
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    url.hash = '';
    return url.toString();
  } catch {
    return null;
  }
}

/** Blocks loopback, private, link-local and other non-routable targets (SSRF guard). */
async function isPublicHttpUrl(urlString) {
  let url;
  try {
    url = new URL(urlString);
  } catch {
    return false;
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;

  const host = url.hostname.replace(/^\[|\]$/g, '').toLowerCase();
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local')) return false;

  if (net.isIP(host)) return isPublicIp(host);

  try {
    const records = await lookup(host, { all: true });
    if (!records.length) return false;
    return records.every((record) => isPublicIp(record.address));
  } catch {
    return false;
  }
}

function isPublicIp(ip) {
  const type = net.isIP(ip);
  if (type === 4) {
    const parts = ip.split('.').map(Number);
    const [a, b] = parts;
    if (a === 10 || a === 127 || a === 0) return false;
    if (a === 169 && b === 254) return false;
    if (a === 172 && b >= 16 && b <= 31) return false;
    if (a === 192 && b === 168) return false;
    if (a === 100 && b >= 64 && b <= 127) return false;
    if (a >= 224) return false;
    return true;
  }
  if (type === 6) {
    const value = ip.toLowerCase();
    if (value === '::1' || value === '::') return false;
    if (value.startsWith('fe80') || value.startsWith('fc') || value.startsWith('fd')) return false;
    const mapped = value.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return isPublicIp(mapped[1]);
    return true;
  }
  return false;
}

/* ------------------------------------------------------------------ */
/* HTML helpers                                                        */
/* ------------------------------------------------------------------ */

function htmlToText(html) {
  return stripTags(
    String(html)
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
      .replace(/<\/(p|div|section|article|li|h[1-6]|tr|br)>/gi, '\n')
      .replace(/<br\s*\/?>/gi, '\n'),
  ).replace(/\n{3,}/g, '\n\n');
}

function extractTitle(html) {
  const match = String(html).match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match ? stripTags(match[1]).trim() : '';
}

function stripTags(text) {
  return String(text)
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&#x27;/gi, "'")
    .trim();
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function dedupe(results) {
  const seen = new Set();
  const out = [];
  for (const result of results) {
    if (!result?.url || seen.has(result.url)) continue;
    seen.add(result.url);
    out.push(result);
  }
  return out;
}
