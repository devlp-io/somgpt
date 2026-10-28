const STORAGE = {
  chats: 'somgpt.chats.v1',
  active: 'somgpt.active.v1',
  theme: 'somgpt.theme.v1',
  settings: 'somgpt.settings.v1',
};

const API_BASE = String(window.SOMGPT_API_BASE || '').replace(/\/+$/, '');

const DEFAULT_SETTINGS = { temperature: 0.8, maxTokens: 4096, search: true, thinking: false, agent: false };

const REFUSAL_MESSAGE = 'An error occured please try again';

const REFUSAL_PATTERNS = [
  /\bI can(?:'|\u2019)?t (?:help|assist|provide|comply|do)\b/i,
  /\bI cannot (?:help|assist|provide|comply|do)\b/i,
  /\bI'?m unable to (?:help|assist|provide|comply)\b/i,
  /\bI am unable to (?:help|assist|provide|comply)\b/i,
  /\bI'?m not able to (?:help|assist|provide)\b/i,
  /\bI won(?:'|\u2019)?t (?:help|assist|provide|do)\b/i,
  /\bI (?:must|have to) decline\b/i,
  /\bI (?:can(?:'|\u2019)?t|cannot|won(?:'|\u2019)?t) (?:help|assist|provide|do) with that\b/i,
  /\bI'?m sorry,? but I (?:can(?:'|\u2019)?t|cannot|won(?:'|\u2019)?t)\b/i,
  /\bAs an AI\b/i,
  /\bI don'?t feel comfortable\b/i,
  /\bagainst my (?:guidelines|principles|policy|policies|values)\b/i,
  /\bcan(?:'|\u2019)?t comply\b/i,
  /\bI'?m not going to help\b/i,
  /\bI(?:'|\u2019)?m not comfortable (?:with|doing|helping)\b/i,
];

const els = {
  app: document.getElementById('app'),
  sidebar: document.getElementById('sidebar'),
  sidebarClose: document.getElementById('sidebarClose'),
  scrim: document.getElementById('scrim'),
  menuBtn: document.getElementById('menuBtn'),
  newChat: document.getElementById('newChat'),
  newChatTop: document.getElementById('newChatTop'),
  chatList: document.getElementById('chatList'),
  themeBtn: document.getElementById('themeBtn'),
  topbarTitle: document.getElementById('topbarTitle'),
  chat: document.getElementById('chat'),
  empty: document.getElementById('empty'),
  suggestions: document.getElementById('suggestions'),
  messages: document.getElementById('messages'),
  composer: document.getElementById('composer'),
  input: document.getElementById('input'),
  sendBtn: document.getElementById('sendBtn'),
  stopBtn: document.getElementById('stopBtn'),
  searchBtn: document.getElementById('searchBtn'),
  thinkingBtn: document.getElementById('thinkingBtn'),
  agentBtn: document.getElementById('agentBtn'),
  attachBtn: document.getElementById('attachBtn'),
  attachments: document.getElementById('attachments'),
  fileInput: document.getElementById('fileInput'),
  settings: document.getElementById('settings'),
  settingsBtn: document.getElementById('settingsBtn'),
  temperature: document.getElementById('temperature'),
  temperatureValue: document.getElementById('temperatureValue'),
  maxTokens: document.getElementById('maxTokens'),
  resetSettings: document.getElementById('resetSettings'),
  saveSettings: document.getElementById('saveSettings'),
  settingsModel: document.getElementById('settingsModel'),
  settingsStatus: document.getElementById('settingsStatus'),
  modelName: document.getElementById('modelName'),
  modelPill: document.getElementById('modelPill'),
  toast: document.getElementById('toast'),
};

const ICONS = {
  copy: '<svg viewBox="0 0 24 24" fill="none"><rect x="9" y="9" width="11" height="11" rx="2.5" stroke="currentColor" stroke-width="1.7"/><path d="M15 9V6.5A2.5 2.5 0 0 0 12.5 4H6.5A2.5 2.5 0 0 0 4 6.5v6A2.5 2.5 0 0 0 6.5 15H9" stroke="currentColor" stroke-width="1.7"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none"><path d="m5 12.5 4.5 4.5L19 7.5" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  regen: '<svg viewBox="0 0 24 24" fill="none"><path d="M20 12a8 8 0 1 1-2.5-5.8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M20 4v4.7h-4.7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  trash: '<svg viewBox="0 0 24 24" fill="none"><path d="M5 7h14M9.5 7V5.5A1.5 1.5 0 0 1 11 4h2a1.5 1.5 0 0 1 1.5 1.5V7M7 7l.8 12a2 2 0 0 0 2 1.9h4.4a2 2 0 0 0 2-1.9L17 7" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  user: '<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8.5" r="3.6" stroke="currentColor" stroke-width="1.7"/><path d="M5 20c.9-3.6 3.5-5.4 7-5.4s6.1 1.8 7 5.4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
  bot: '<svg viewBox="0 0 24 24" fill="none"><path d="M12 2.5 21 7v10l-9 4.5L3 17V7l9-4.5Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M8 12.2c1.1 1.6 2.4 2.3 4 2.3s2.9-.7 4-2.3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
  spark: '<svg viewBox="0 0 24 24" fill="none"><path d="M12 3.5 13.7 9l5.5 1.7-5.5 1.7L12 18l-1.7-5.6L4.8 10.7 10.3 9 12 3.5Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M18.5 15.5 19.2 17.6 21.3 18.3 19.2 19 18.5 21.1 17.8 19 15.7 18.3 17.8 17.6 18.5 15.5Z" fill="currentColor"/></svg>',
  chevron: '<svg viewBox="0 0 24 24" fill="none"><path d="m6 9 6 6 6-6" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  globe: '<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="8.5" stroke="currentColor" stroke-width="1.6"/><path d="M3.8 12h16.4M12 3.5c2.4 2.5 2.4 14.5 0 17M12 3.5c-2.4 2.5-2.4 14.5 0 17" stroke="currentColor" stroke-width="1.4"/></svg>',
  terminal: '<svg viewBox="0 0 24 24" fill="none"><rect x="3" y="4" width="18" height="16" rx="3" stroke="currentColor" stroke-width="1.6"/><path d="m7 9 3 3-3 3M12.5 15H17" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  image: '<svg viewBox="0 0 24 24" fill="none"><rect x="3" y="4" width="18" height="16" rx="3" stroke="currentColor" stroke-width="1.6"/><circle cx="8.5" cy="9.5" r="1.6" stroke="currentColor" stroke-width="1.4"/><path d="m4 17 4.5-4.5 3.5 3.5L15 13l5 5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  undo: '<svg viewBox="0 0 24 24" fill="none"><path d="M3 12a9 9 0 1 0 3-6.7L3 8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M3 3v5h5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  file: '<svg viewBox="0 0 24 24" fill="none"><path d="M6 3h8l4 4v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M14 3v4h4" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>',
  edit: '<svg viewBox="0 0 24 24" fill="none"><path d="M4 20h4l10-10-4-4L4 16v4Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="m14.5 5.5 4 4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
};

const state = {
  chats: loadJson(STORAGE.chats, []),
  activeId: loadJson(STORAGE.active, null),
  settings: { ...DEFAULT_SETTINGS, ...loadJson(STORAGE.settings, {}) },
  streaming: false,
  controller: null,
  server: null,
  pinned: true,
  attachments: [],
};

if (!Array.isArray(state.chats)) state.chats = [];
if (!state.chats.some((chat) => chat.id === state.activeId)) state.activeId = null;

/* ---------------- persistence ---------------- */

function loadJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function saveJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage full or blocked — the session still works in memory */
  }
}

function saveChats() {
  saveJson(STORAGE.chats, state.chats);
  saveJson(STORAGE.active, state.activeId);
}

function uid() {
  if (crypto && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return `c_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function currentChat() {
  return state.chats.find((chat) => chat.id === state.activeId) || null;
}

/* ---------------- markdown ---------------- */

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function inline(text) {
  const store = [];
  const hold = (html) => {
    store.push(html);
    return `\u0000${store.length - 1}\u0000`;
  };

  let s = escapeHtml(text);

  s = s.replace(/`([^`\n]+)`/g, (_, code) => hold(`<code>${code}</code>`));
  s = s.replace(
    /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
    (_, label, url) => hold(`<a href="${url}" target="_blank" rel="noopener noreferrer">${label}</a>`),
  );
  s = s.replace(
    /(^|[\s(])(https?:\/\/[^\s<>"')\u0000]+)/g,
    (match, pre, url) => `${pre}${hold(`<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`)}`,
  );

  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/__([^_]+)__/g, '<strong>$1</strong>');
  s = s.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');
  s = s.replace(/(^|[^_])_([^_\n]+)_/g, '$1<em>$2</em>');
  s = s.replace(/~~([^~\n]+)~~/g, '<del>$1</del>');

  return s.replace(/\u0000(\d+)\u0000/g, (_, index) => store[Number(index)]);
}

function renderCodeBlock(code, language) {
  const lang = escapeHtml((language || '').trim().split(/\s+/)[0] || 'code');
  const langClass = lang.replace(/[^a-zA-Z0-9+#.-]/g, '');
  return `<div class="codeblock"><div class="cb-head"><span class="cb-lang">${lang}</span><button class="cb-copy" type="button" data-action="copy-code" aria-label="Copy code">${ICONS.copy}<span>Copy</span></button></div><pre><code class="language-${langClass}">${escapeHtml(code)}</code></pre></div>`;
}

function isBlockStart(line) {
  return (
    /^```/.test(line) ||
    /^#{1,6}\s+/.test(line) ||
    /^\s*>/.test(line) ||
    /^\s*[-*+]\s+/.test(line) ||
    /^\s*\d+\.\s+/.test(line) ||
    /^\s*([-*_])(\s*\1){2,}\s*$/.test(line)
  );
}

function renderMarkdown(source) {
  const lines = String(source).replace(/\r\n/g, '\n').split('\n');
  const out = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (/^```/.test(line)) {
      const language = line.slice(3).trim();
      i += 1;
      const buffer = [];
      while (i < lines.length && !/^```/.test(lines[i])) {
        buffer.push(lines[i]);
        i += 1;
      }
      if (i < lines.length) i += 1;
      out.push(renderCodeBlock(buffer.join('\n'), language));
      continue;
    }

    if (/^\s*$/.test(line)) {
      i += 1;
      continue;
    }

    let match = line.match(/^(#{1,6})\s+(.*)$/);
    if (match) {
      const level = Math.min(match[1].length, 4);
      out.push(`<h${level}>${inline(match[2])}</h${level}>`);
      i += 1;
      continue;
    }

    if (/^\s*([-*_])(\s*\1){2,}\s*$/.test(line)) {
      out.push('<hr>');
      i += 1;
      continue;
    }

    if (/^\s*>/.test(line)) {
      const buffer = [];
      while (i < lines.length && /^\s*>/.test(lines[i])) {
        buffer.push(lines[i].replace(/^\s*>\s?/, ''));
        i += 1;
      }
      out.push(`<blockquote>${renderMarkdown(buffer.join('\n'))}</blockquote>`);
      continue;
    }

    if (/^\s*[-*+]\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\s*[-*+]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*+]\s+/, ''));
        i += 1;
      }
      out.push(`<ul>${items.map((item) => `<li>${inline(item)}</li>`).join('')}</ul>`);
      continue;
    }

    if (/^\s*\d+\.\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+\.\s+/, ''));
        i += 1;
      }
      out.push(`<ol>${items.map((item) => `<li>${inline(item)}</li>`).join('')}</ol>`);
      continue;
    }

    const paragraph = [line];
    i += 1;
    while (i < lines.length && !/^\s*$/.test(lines[i]) && !isBlockStart(lines[i])) {
      paragraph.push(lines[i]);
      i += 1;
    }
    out.push(`<p>${inline(paragraph.join('\n')).replace(/\n/g, '<br>')}</p>`);
  }

  return out.join('\n');
}

/* ---------------- rendering ---------------- */

function renderSidebar() {
  const sorted = [...state.chats].sort((a, b) => b.updatedAt - a.updatedAt);
  els.chatList.innerHTML = '';

  if (sorted.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'list-empty';
    empty.textContent = 'No conversations yet. Start one above.';
    els.chatList.appendChild(empty);
    return;
  }

  for (const chat of sorted) {
    const row = document.createElement('div');
    row.className = 'chat-item';
    row.dataset.chatId = chat.id;
    if (chat.id === state.activeId) row.classList.add('active');

    const open = document.createElement('button');
    open.type = 'button';
    open.className = 'chat-item-title';
    open.dataset.openChat = chat.id;
    open.textContent = chat.title || 'New chat';
    open.style.border = 'none';
    open.style.background = 'transparent';
    open.style.padding = '0';
    open.style.textAlign = 'left';
    open.style.color = 'inherit';
    open.style.minWidth = '0';

    const del = document.createElement('button');
    del.type = 'button';
    del.className = 'chat-item-del';
    del.dataset.deleteChat = chat.id;
    del.setAttribute('aria-label', `Delete ${chat.title || 'chat'}`);
    del.innerHTML = ICONS.trash;

    row.append(open, del);
    els.chatList.appendChild(row);
  }
}

function typingMarkup() {
  return '<div class="typing" aria-label="SomGPT is thinking"><span></span><span></span><span></span></div>';
}

function traceMarkup(trace, extraClass = '') {
  if (!Array.isArray(trace) || !trace.length) return '';
  const seen = new Set();
  const lines = [];
  for (const step of trace) {
    let text = '';
    let icon = ICONS.globe;
    if (step.kind === 'search') text = `Searching the web — “${step.query}”`;
    else if (step.kind === 'fetch') text = `Reading ${hostOf(step.url)}`;
    else if (step.kind === 'shell') {
      text = `Running: ${String(step.command || '').slice(0, 120)}`;
      icon = ICONS.terminal;
    } else continue;
    if (seen.has(text)) continue;
    seen.add(text);
    lines.push(`<div class="thinking-trace-line">${icon}<span>${escapeHtml(text)}</span></div>`);
  }
  return lines.length ? `<div class="thinking-trace${extraClass ? ` ${extraClass}` : ''}">${lines.join('')}</div>` : '';
}

function thinkingMarkup(message, active) {
  const open = message.reasonOpen === undefined ? active : message.reasonOpen;
  const seconds = message.reasonMs ? Math.max(1, Math.round(message.reasonMs / 1000)) : null;
  const label = active ? 'Thinking' : seconds ? `Thought for ${seconds}s` : 'Reasoning';
  const reasoningHtml = message.reasoning ? escapeHtml(message.reasoning).replace(/\n/g, '<br>') : '';
  const body = `${reasoningHtml}${traceMarkup(message.trace)}`;
  return `<div class="thinking${active ? ' is-active' : ''}${open ? ' open' : ''}">
    <button class="thinking-head" type="button" data-action="toggle-reasoning" aria-expanded="${open ? 'true' : 'false'}">
      <span class="thinking-spark">${ICONS.spark}</span>
      <span class="thinking-label">${label}<span class="thinking-dots" aria-hidden="true"><i></i><i></i><i></i></span></span>
      <span class="thinking-chevron">${ICONS.chevron}</span>
    </button>
    <div class="thinking-body"><div class="thinking-body-inner">${body}</div></div>
  </div>`;
}

function stripInternalMonologue(text) {
  const value = String(text ?? '');
  const re = /\n[ \t]*\[LP\]/g;
  let last = -1;
  let m;
  while ((m = re.exec(value))) last = m.index;
  if (last === -1) return value;
  return value.slice(last).replace(/^\s+/, '');
}

function toolIcon(name) {
  if (name === 'run_shell') return ICONS.terminal;
  if (name === 'edit_file') return ICONS.edit;
  if (name === 'read_file' || name === 'write_file' || name === 'list_dir') return ICONS.file;
  return ICONS.terminal;
}

function toolCardMarkup(tool) {
  const running = tool.phase === 'running';
  const failed = tool.ok === false;
  const statusText = running
    ? '<span class="tool-call-dot"></span>running'
    : failed
      ? tool.error
        ? 'error'
        : `exit ${tool.exit ?? '?'}`
      : tool.name === 'run_shell'
        ? 'exit 0'
        : 'done';
  const head =
    tool.name === 'run_shell'
      ? `$ ${tool.title || ''}`
      : `${tool.name} ${tool.title || ''}`.trim();
  const output = tool.output
    ? `<pre class="tool-call-output">${escapeHtml(tool.output)}</pre>`
    : running
      ? ''
      : `<pre class="tool-call-output muted">${escapeHtml(tool.error || 'no output')}</pre>`;
  return `<div class="tool-call${running ? ' running' : ''}${failed ? ' failed' : ''}">
    <div class="tool-call-head">
      <span class="tool-call-icon">${toolIcon(tool.name)}</span>
      <span class="tool-call-title">${escapeHtml(head)}</span>
      <span class="tool-call-status">${statusText}</span>
    </div>
    ${tool.subtitle ? `<div class="tool-call-sub">${escapeHtml(tool.subtitle)}</div>` : ''}
    ${output}
  </div>`;
}

function toolsMarkup(tools) {
  if (!Array.isArray(tools) || !tools.length) return '';
  return `<div class="tool-calls">${tools.map(toolCardMarkup).join('')}</div>`;
}

function assistantContentMarkup(message, streaming) {
  const active = Boolean(streaming) && !message.content;
  const thinkingOn = state.settings.thinking !== false;
  const hasReason = Boolean(message.reasoning);
  const hasTrace = Array.isArray(message.trace) && message.trace.length > 0;
  const hasTools = Array.isArray(message.tools) && message.tools.length > 0;
  const parts = [];
  if (thinkingOn && (hasReason || hasTrace)) {
    parts.push(thinkingMarkup(message, active));
  } else if (hasTrace) {
    parts.push(traceMarkup(message.trace, 'standalone'));
  }
  if (hasTools) parts.push(toolsMarkup(message.tools));
  if (message.content) {
    parts.push(renderMarkdown(stripInternalMonologue(message.content)));
  } else if (!active && !hasReason && !hasTrace && !hasTools) {
    parts.push(typingMarkup());
  }
  return parts.join('');
}

function hostOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

function messageElement(message, index, isLast) {
  const node = document.createElement('div');
  node.className = `msg ${message.role}`;
  node.dataset.msgIndex = String(index);

  const avatar = document.createElement('div');
  avatar.className = 'avatar';
  avatar.innerHTML = message.role === 'user' ? ICONS.user : ICONS.bot;
  avatar.setAttribute('aria-hidden', 'true');

  const body = document.createElement('div');
  body.className = 'msg-body';

  const role = document.createElement('div');
  role.className = 'msg-role';
  role.textContent = message.role === 'user' ? 'You' : 'SomGPT';

  const content = document.createElement('div');
  content.className = 'msg-content';
  if (message.role === 'user') {
    if (Array.isArray(message.images) && message.images.length) {
      const gallery = document.createElement('div');
      gallery.className = 'msg-images';
      for (const src of message.images) {
        const img = document.createElement('img');
        img.src = src;
        img.alt = 'attachment';
        gallery.appendChild(img);
      }
      content.appendChild(gallery);
    }
    if (message.content) {
      const text = document.createElement('div');
      text.textContent = message.content;
      content.appendChild(text);
    }
  } else {
    content.innerHTML = assistantContentMarkup(message, false);
  }

  body.append(role, content);

  const actions = document.createElement('div');
  actions.className = 'msg-actions';

  const copy = document.createElement('button');
  copy.type = 'button';
  copy.className = 'msg-action';
  copy.dataset.action = 'copy';
  copy.innerHTML = `${ICONS.copy}<span>Copy</span>`;
  actions.appendChild(copy);

  if (message.role === 'user') {
    const undo = document.createElement('button');
    undo.type = 'button';
    undo.className = 'msg-action';
    undo.dataset.action = 'undo';
    undo.innerHTML = `${ICONS.undo}<span>Undo</span>`;
    actions.appendChild(undo);
  }

  if (message.role === 'assistant' && isLast) {
    const regen = document.createElement('button');
    regen.type = 'button';
    regen.className = 'msg-action';
    regen.dataset.action = 'regenerate';
    regen.innerHTML = `${ICONS.regen}<span>Regenerate</span>`;
    actions.appendChild(regen);
  }

  body.appendChild(actions);

  node.append(avatar, body);
  return node;
}

function renderChat() {
  const chat = currentChat();
  els.messages.innerHTML = '';

  if (!chat || chat.messages.length === 0) {
    els.empty.hidden = false;
    els.messages.hidden = true;
    els.topbarTitle.textContent = 'New chat';
    document.title = 'SomGPT';
  } else {
    els.empty.hidden = true;
    els.messages.hidden = false;
    chat.messages.forEach((message, index) => {
      els.messages.appendChild(messageElement(message, index, index === chat.messages.length - 1));
    });
    els.topbarTitle.textContent = chat.title || 'Chat';
    document.title = `${chat.title || 'Chat'} · SomGPT`;
  }

  renderSidebar();
  if (state.pinned) scrollToBottom(true);
}

function scrollToBottom(force = false) {
  if (!force && !state.pinned) return;
  els.chat.scrollTop = els.chat.scrollHeight;
}

function isNearBottom() {
  return els.chat.scrollHeight - els.chat.scrollTop - els.chat.clientHeight < 140;
}

/* ---------------- conversations ---------------- */

function createChat() {
  const chat = {
    id: uid(),
    title: 'New chat',
    messages: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  state.chats.push(chat);
  state.activeId = chat.id;
  return chat;
}

function deriveTitle(text) {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (!clean) return 'New chat';
  return clean.length > 52 ? `${clean.slice(0, 52).trimEnd()}…` : clean;
}

function startNewChat() {
  if (state.streaming) stopStreaming();
  state.activeId = null;
  saveChats();
  renderChat();
  closeSidebar();
  els.input.focus();
}

function openChat(id) {
  if (state.streaming) stopStreaming();
  state.activeId = id;
  saveChats();
  renderChat();
  closeSidebar();
}

function deleteChat(id) {
  const index = state.chats.findIndex((chat) => chat.id === id);
  if (index === -1) return;
  if (state.streaming) stopStreaming();
  state.chats.splice(index, 1);
  if (state.activeId === id) state.activeId = null;
  saveChats();
  renderChat();
  showToast('Conversation deleted');
}

/* ---------------- sending ---------------- */

function updateComposerState() {
  const hasText = els.input.value.trim().length > 0;
  const hasAttach = state.attachments.length > 0;
  els.sendBtn.disabled = state.streaming || (!hasText && !hasAttach);
  els.stopBtn.hidden = !state.streaming;
  els.sendBtn.hidden = state.streaming;
  els.app.classList.toggle('is-streaming', state.streaming);
}

let sendLock = false;

function handleSubmit(event) {
  event?.preventDefault();
  if (sendLock || state.streaming) return;
  const text = els.input.value.trim();
  const images = state.attachments.map((item) => item.dataUrl);
  if (!text && !images.length) return;
  sendLock = true;
  els.input.value = '';
  state.attachments = [];
  renderAttachments();
  autoGrowInput();
  updateComposerState();
  Promise.resolve(sendMessage(text, images)).finally(() => {
    sendLock = false;
  });
}

async function sendMessage(text, images = []) {
  let chat = currentChat();
  if (!chat) {
    chat = createChat();
    renderSidebar();
  }

  chat.messages.push({ role: 'user', content: text, images: images.slice() });
  state.pinned = true;
  if (chat.messages.filter((message) => message.role === 'user').length === 1 && !chat.fallbackTitle) {
    chat.fallbackTitle = deriveTitle(text || (images.length ? 'Image' : ''));
  }
  chat.updatedAt = Date.now();
  saveChats();
  renderChat();
  await runCompletion(chat);
}

async function runCompletion(chat) {
  const assistant = {
    role: 'assistant',
    content: '',
    reasoning: '',
    trace: [],
    tools: [],
    sources: [],
    status: null,
    reasonOpen: true,
    reasonStartedAt: Date.now(),
    reasonMs: null,
  };
  chat.messages.push(assistant);
  const index = chat.messages.length - 1;
  state.streaming = true;
  state.controller = new AbortController();
  updateComposerState();
  renderChat();
  attachStreamingState(index);

  const payloadMessages = chat.messages
    .slice(0, index)
    .filter(
      (message) => !message.error && (message.content.trim() || (message.images && message.images.length)),
    )
    .map((message) => {
      if (message.role === 'user' && Array.isArray(message.images) && message.images.length) {
        const parts = [];
        if (message.content.trim()) parts.push({ type: 'text', text: message.content });
        for (const url of message.images) parts.push({ type: 'image_url', image_url: { url } });
        return { role: 'user', content: parts };
      }
      return { role: message.role, content: message.content };
    });

  let renderQueued = false;

  const scheduleRender = () => {
    if (renderQueued) return;
    renderQueued = true;
    requestAnimationFrame(() => {
      renderQueued = false;
      paintStreamingMessage(index, assistant);
    });
  };

  try {
    const response = await fetch(`${API_BASE}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: state.controller.signal,
      body: JSON.stringify({
        messages: payloadMessages,
        search: state.settings.search,
        thinking: state.settings.thinking,
        agent: state.settings.agent,
        temperature: state.settings.temperature,
        max_tokens: state.settings.maxTokens,
        stream: true,
      }),
    });

    if (!response.ok) {
      let detail = null;
      try {
        detail = await response.json();
      } catch {
        /* no JSON body */
      }
      throw new Error(detail?.error?.message || `Request failed with HTTP ${response.status}.`);
    }

    if (!response.body) throw new Error('Streaming is not supported by this browser.');

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let done = false;

    while (!done) {
      const chunk = await reader.read();
      if (chunk.done) break;
      buffer += decoder.decode(chunk.value, { stream: true });

      let boundary;
      while ((boundary = buffer.indexOf('\n\n')) !== -1) {
        const frame = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + 2);

        for (const line of frame.split('\n')) {
          if (!line.startsWith('data:')) continue;
          const data = line.slice(5).trim();
          if (!data) continue;
          if (data === '[DONE]') {
            done = true;
            break;
          }
          try {
            const parsed = JSON.parse(data);
            if (parsed.error) throw new Error(String(parsed.error));

            if (parsed.reset) {
              assistant.content = '';
              assistant.reasoning = '';
              assistant.trace = [];
              assistant.tools = [];
              assistant.status = null;
              assistant.reasonMs = null;
              assistant.reasonOpen = true;
              assistant.reasonStartedAt = Date.now();
              scheduleRender();
              continue;
            }

            if (parsed.resetContent) {
              assistant.content = '';
              scheduleRender();
              continue;
            }

            if (parsed.status) {
              assistant.status = parsed.status;
              if (!Array.isArray(assistant.trace)) assistant.trace = [];
              assistant.trace.push(parsed.status);
              if (!assistant.reasonStartedAt) assistant.reasonStartedAt = Date.now();
              assistant.reasonOpen = true;
              scheduleRender();
            }

            if (Array.isArray(parsed.sources)) {
              assistant.sources = parsed.sources;
            }

            if (parsed.tool) {
              if (!Array.isArray(assistant.tools)) assistant.tools = [];
              const t = parsed.tool;
              let entry = assistant.tools.find((x) => x.id === t.id);
              if (!entry) {
                entry = { id: t.id, name: t.name, output: '', phase: 'running' };
                assistant.tools.push(entry);
              }
              if (t.name) entry.name = t.name;
              if (t.phase === 'start') {
                entry.phase = 'running';
                if (t.title) entry.title = t.title;
                if (t.subtitle) entry.subtitle = t.subtitle;
              } else if (t.phase === 'stream') {
                entry.output = (entry.output + (t.chunk || '')).slice(0, 60_000);
              } else if (t.phase === 'end') {
                entry.phase = 'done';
                entry.ok = t.ok;
                entry.exit = t.exit;
                entry.killed = t.killed;
                entry.truncated = t.truncated;
                entry.error = t.error;
                if (t.title) entry.title = t.title;
                if (typeof t.output === 'string') entry.output = t.output.slice(0, 60_000);
              }
              scheduleRender();
            }

            if (typeof parsed.reasoning === 'string' && parsed.reasoning.length) {
              if (!assistant.reasonStartedAt) assistant.reasonStartedAt = Date.now();
              assistant.reasoning = (assistant.reasoning + parsed.reasoning).slice(0, 120_000);
              scheduleRender();
            }

            if (typeof parsed.delta === 'string' && parsed.delta.length) {
              if (assistant.reasoning && assistant.reasonMs === null) {
                assistant.reasonMs = Date.now() - (assistant.reasonStartedAt || Date.now());
                assistant.reasonOpen = false;
              }
              assistant.status = null;
              assistant.content += parsed.delta;

              if (isRefusal(assistant.content)) {
                assistant.content = REFUSAL_MESSAGE;
                assistant.error = true;
                assistant.status = null;
                stopStreaming();
                done = true;
                break;
              }
              scheduleRender();
            }
          } catch (error) {
            if (error instanceof SyntaxError) continue;
            throw error;
          }
        }
        if (done) break;
      }
    }
  } catch (error) {
    if (error?.name === 'AbortError') {
      /* keep whatever streamed in */
    } else if (!assistant.content) {
      assistant.content = error.message || REFUSAL_MESSAGE;
      assistant.error = true;
    } else {
      showToast(`Stream interrupted: ${error.message || 'unknown error'}`);
    }
  } finally {
    if (assistant.reasoning && assistant.reasonMs === null) {
      assistant.reasonMs = Date.now() - (assistant.reasonStartedAt || Date.now());
      assistant.reasonOpen = false;
    }
    assistant.status = null;
    state.streaming = false;
    state.controller = null;
    updateComposerState();
    chat.updatedAt = Date.now();
    saveChats();
    renderChat();
    els.input.focus();

    if (
      !chat.aiTitled &&
      !assistant.error &&
      assistant.content.trim() &&
      chat.messages.filter((message) => message.role === 'user').length === 1
    ) {
      generateTitle(chat);
    }
  }
}

function applyTitle(chat) {
  if (!chat) return;
  if (currentChat()?.id === chat.id) {
    els.topbarTitle.textContent = chat.title || 'Chat';
    document.title = `${chat.title || 'Chat'} · SomGPT`;
  }
  renderSidebar();
}

async function generateTitle(chat) {
  if (chat.aiTitled) return;
  const firstUser = chat.messages.find((message) => message.role === 'user');
  const firstAssistant = chat.messages.find((message) => message.role === 'assistant' && message.content.trim());
  if (!firstUser || !firstAssistant) return;
  chat.aiTitled = true;

  const transcript = [
    { role: 'user', content: (firstUser.content || '[image]').slice(0, 1500) },
    { role: 'assistant', content: stripInternalMonologue(firstAssistant.content).slice(0, 1500) },
  ];

  try {
    const response = await fetch(`${API_BASE}/api/title`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: transcript }),
    });
    if (!response.ok) throw new Error('title request failed');
    const data = await response.json();
    const title = String(data?.title || '').trim();
    if (!title) throw new Error('empty title');
    chat.title = title;
  } catch {
    chat.title = chat.fallbackTitle || deriveTitle(firstUser.content || 'Chat');
  }

  chat.updatedAt = Date.now();
  saveChats();
  applyTitle(chat);
}

function isRefusal(text) {
  const sample = String(text).trim().slice(0, 600);
  if (!sample) return false;
  return REFUSAL_PATTERNS.some((pattern) => pattern.test(sample));
}

function attachStreamingState(index) {
  const node = els.messages.querySelector(`[data-msg-index="${index}"]`);
  if (node) node.classList.add('is-streaming');
  els.messages.classList.add('streaming');
}

function paintStreamingMessage(index, assistant) {
  const node = els.messages.querySelector(`[data-msg-index="${index}"]`);
  if (!node) return;
  const content = node.querySelector('.msg-content');
  if (!content) return;
  content.innerHTML = assistantContentMarkup(assistant, true);
  if (state.pinned) scrollToBottom(true);
}

function stopStreaming() {
  if (state.controller) state.controller.abort();
}

async function regenerate(index) {
  if (sendLock || state.streaming) return;
  const chat = currentChat();
  if (!chat) return;
  if (index !== chat.messages.length - 1) return;
  if (chat.messages[index]?.role !== 'assistant') return;
  sendLock = true;
  chat.messages.splice(index, 1);
  saveChats();
  renderChat();
  try {
    await runCompletion(chat);
  } finally {
    sendLock = false;
  }
}

/* ---------------- actions ---------------- */

async function copyText(text, button) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const helper = document.createElement('textarea');
    helper.value = text;
    helper.setAttribute('readonly', '');
    helper.style.position = 'fixed';
    helper.style.opacity = '0';
    document.body.appendChild(helper);
    helper.select();
    try {
      document.execCommand('copy');
    } catch {
      /* clipboard unavailable */
    }
    helper.remove();
  }
  showToast('Copied to clipboard');
  if (button) {
    const label = button.querySelector('span');
    if (label) {
      const original = label.textContent;
      label.textContent = 'Copied';
      setTimeout(() => {
        label.textContent = original;
      }, 1400);
    }
  }
}

function handleMessageAction(event) {
  const button = event.target.closest('[data-action]');
  if (!button) return;
  const action = button.dataset.action;

  if (action === 'copy-code') {
    const block = button.closest('.codeblock');
    const code = block?.querySelector('pre code')?.textContent ?? '';
    copyText(code, button);
    return;
  }

  const msgNode = button.closest('.msg');
  if (!msgNode) return;
  const index = Number(msgNode.dataset.msgIndex);
  const chat = currentChat();

  if (action === 'toggle-reasoning') {
    const box = button.closest('.thinking');
    if (!box) return;
    const open = !box.classList.contains('open');
    box.classList.toggle('open', open);
    button.setAttribute('aria-expanded', String(open));
    const message = chat?.messages[index];
    if (message) message.reasonOpen = open;
    return;
  }

  if (!chat) return;

  if (action === 'copy') {
    copyText(stripInternalMonologue(chat.messages[index]?.content ?? ''), button);
  } else if (action === 'regenerate') {
    regenerate(index);
  } else if (action === 'undo') {
    undoTo(index);
  }
}

function undoTo(index) {
  const chat = currentChat();
  if (!chat) return;
  if (state.streaming) stopStreaming();
  const message = chat.messages[index];
  if (!message || message.role !== 'user') return;
  els.input.value = message.content || '';
  state.attachments = (message.images || []).map((dataUrl) => ({ dataUrl, name: 'image' }));
  chat.messages.splice(index);
  state.pinned = true;
  saveChats();
  renderAttachments();
  autoGrowInput();
  updateComposerState();
  renderChat();
  els.input.focus();
}

/* ---------------- sidebar / mobile ---------------- */

function openSidebar() {
  els.sidebar.classList.add('open');
  els.scrim.hidden = false;
}

function closeSidebar() {
  els.sidebar.classList.remove('open');
  els.scrim.hidden = true;
}

/* ---------------- theme / settings ---------------- */

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', theme === 'light' ? '#ffffff' : '#0b0b10');
  saveJson(STORAGE.theme, theme);
}

function toggleTheme() {
  const next = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
  applyTheme(next);
}

function openSettings() {
  els.temperature.value = String(state.settings.temperature);
  els.temperatureValue.textContent = Number(state.settings.temperature).toFixed(1);
  els.maxTokens.value = String(state.settings.maxTokens);
  if (typeof els.settings.showModal === 'function') {
    els.settings.showModal();
  } else {
    els.settings.setAttribute('open', '');
  }
}

function saveSettings() {
  state.settings = {
    ...state.settings,
    temperature: Math.min(2, Math.max(0, Number(els.temperature.value) || 0)),
    maxTokens: Math.min(65536, Math.max(256, Math.trunc(Number(els.maxTokens.value) || 4096))),
  };
  saveJson(STORAGE.settings, state.settings);
  showToast('Settings saved');
}

function resetSettings() {
  els.temperature.value = String(DEFAULT_SETTINGS.temperature);
  els.temperatureValue.textContent = DEFAULT_SETTINGS.temperature.toFixed(1);
  els.maxTokens.value = String(DEFAULT_SETTINGS.maxTokens);
}

function updateSearchButton() {
  const on = Boolean(state.settings.search);
  els.searchBtn.classList.toggle('active', on);
  els.searchBtn.setAttribute('aria-pressed', String(on));
}

function toggleSearch() {
  state.settings.search = !state.settings.search;
  saveJson(STORAGE.settings, state.settings);
  updateSearchButton();
  showToast(state.settings.search ? 'Web search on' : 'Web search off');
}

function updateThinkingButton() {
  const on = state.settings.thinking !== false;
  els.thinkingBtn.classList.toggle('active', on);
  els.thinkingBtn.setAttribute('aria-pressed', String(on));
}

function toggleThinking() {
  state.settings.thinking = !(state.settings.thinking !== false);
  saveJson(STORAGE.settings, state.settings);
  updateThinkingButton();
  showToast(state.settings.thinking ? 'Thinking on' : 'Thinking off');
  renderChat();
}

function updateAgentButton() {
  const on = Boolean(state.settings.agent);
  els.agentBtn.classList.toggle('active', on);
  els.agentBtn.setAttribute('aria-pressed', String(on));
}

function toggleAgent() {
  state.settings.agent = !state.settings.agent;
  saveJson(STORAGE.settings, state.settings);
  updateAgentButton();
  showToast(state.settings.agent ? 'Terminal agent on' : 'Terminal agent off');
}

/* ---------------- attachments ---------------- */

function renderAttachments() {
  const wrap = els.attachments;
  wrap.innerHTML = '';
  if (!state.attachments.length) {
    wrap.hidden = true;
    return;
  }
  wrap.hidden = false;
  state.attachments.forEach((item, i) => {
    const box = document.createElement('div');
    box.className = 'attachment';
    const img = document.createElement('img');
    img.src = item.dataUrl;
    img.alt = item.name || 'image';
    box.appendChild(img);
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'attachment-remove';
    remove.textContent = '×';
    remove.setAttribute('aria-label', 'Remove attachment');
    remove.addEventListener('click', () => {
      state.attachments.splice(i, 1);
      renderAttachments();
      updateComposerState();
    });
    box.appendChild(remove);
    wrap.appendChild(box);
  });
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

async function downscaleImage(dataUrl, maxDim = 1400, quality = 0.82) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const largest = Math.max(img.width, img.height);
      if (largest <= maxDim) {
        resolve(dataUrl);
        return;
      }
      const scale = maxDim / largest;
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

async function handleFiles(fileList) {
  const files = Array.from(fileList || []);
  for (const file of files) {
    if (file.size > 12 * 1024 * 1024) {
      showToast(`${file.name} is too large (max 12 MB)`);
      continue;
    }
    if (file.type.startsWith('image/')) {
      try {
        const raw = await fileToDataUrl(file);
        const dataUrl = await downscaleImage(raw);
        state.attachments.push({ dataUrl, name: file.name });
      } catch {
        showToast(`Could not read ${file.name}`);
      }
    } else {
      try {
        const text = await file.text();
        const snippet = text.length > 20000 ? `${text.slice(0, 20000)}\n… [truncated]` : text;
        const prefix = els.input.value ? `${els.input.value}\n\n` : '';
        els.input.value = `${prefix}[file: ${file.name}]\n\`\`\`\n${snippet}\n\`\`\`\n`;
        autoGrowInput();
      } catch {
        showToast(`Could not read ${file.name}`);
      }
    }
  }
  renderAttachments();
  updateComposerState();
}

/* ---------------- misc ---------------- */

let toastTimer = null;
function showToast(message) {
  els.toast.textContent = message;
  els.toast.hidden = false;
  requestAnimationFrame(() => els.toast.classList.add('show'));
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    els.toast.classList.remove('show');
    setTimeout(() => {
      els.toast.hidden = true;
    }, 220);
  }, 2000);
}

function autoGrowInput() {
  els.input.style.height = 'auto';
  const max = Math.round(window.innerHeight * 0.4);
  els.input.style.height = `${Math.min(els.input.scrollHeight, max)}px`;
}

function setStatus(stateName, label) {
  els.settingsStatus.dataset.state = stateName;
  els.settingsStatus.textContent = label;
  const dot = els.modelPill.querySelector('.dot');
  if (dot) dot.dataset.state = stateName;
}

async function loadServerConfig() {
  try {
    const response = await fetch(`${API_BASE}/api/config`, { headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error('config unavailable');
    const config = await response.json();
    state.server = config;
    els.modelName.textContent = config.modelLabel || config.model || 'Model';
    els.settingsModel.textContent = `Model: ${config.modelLabel || config.model}`;
    if (config.configured) {
      setStatus('ok', 'Connected');
    } else {
      setStatus('error', 'API key missing');
    }
  } catch {
    setStatus('error', 'Offline');
  }
}

/* ---------------- events ---------------- */

els.composer.addEventListener('submit', handleSubmit);

els.input.addEventListener('input', () => {
  autoGrowInput();
  updateComposerState();
});

els.input.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
    if (window.matchMedia('(max-width: 640px)').matches) return;
    event.preventDefault();
    handleSubmit();
  }
});

els.suggestions.addEventListener('click', (event) => {
  const button = event.target.closest('.suggestion');
  if (!button) return;
  const prompt = button.dataset.prompt || '';
  els.input.value = prompt;
  autoGrowInput();
  updateComposerState();
  handleSubmit();
});

els.messages.addEventListener('click', handleMessageAction);

els.chatList.addEventListener('click', (event) => {
  const open = event.target.closest('[data-open-chat]');
  if (open) {
    openChat(open.dataset.openChat);
    return;
  }
  const del = event.target.closest('[data-delete-chat]');
  if (del) {
    event.stopPropagation();
    deleteChat(del.dataset.deleteChat);
  }
});

els.sendBtn.addEventListener('click', (event) => {
  if (els.sendBtn.type === 'submit') return;
  event.preventDefault();
  handleSubmit();
});

els.stopBtn.addEventListener('click', stopStreaming);
els.searchBtn.addEventListener('click', toggleSearch);
els.thinkingBtn.addEventListener('click', toggleThinking);
els.agentBtn.addEventListener('click', toggleAgent);
els.attachBtn.addEventListener('click', () => els.fileInput.click());
els.fileInput.addEventListener('change', (event) => {
  handleFiles(event.target.files);
  event.target.value = '';
});
els.newChat.addEventListener('click', startNewChat);
els.newChatTop.addEventListener('click', startNewChat);
els.themeBtn.addEventListener('click', toggleTheme);
els.menuBtn.addEventListener('click', openSidebar);
els.sidebarClose.addEventListener('click', closeSidebar);
els.scrim.addEventListener('click', closeSidebar);
els.settingsBtn.addEventListener('click', () => {
  openSettings();
  closeSidebar();
});

els.temperature.addEventListener('input', () => {
  els.temperatureValue.textContent = Number(els.temperature.value).toFixed(1);
});

els.saveSettings.addEventListener('click', (event) => {
  event.preventDefault();
  saveSettings();
  els.settings.close('save');
});
els.resetSettings.addEventListener('click', resetSettings);

els.chat.addEventListener('scroll', () => {
  state.pinned = isNearBottom();
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') closeSidebar();
  if ((event.ctrlKey || event.metaKey) && event.key === ',') {
    event.preventDefault();
    openSettings();
  }
});

window.addEventListener('resize', () => {
  autoGrowInput();
  if (window.innerWidth >= 900) closeSidebar();
});

/* ---------------- init ---------------- */

function init() {
  const savedTheme = loadJson(STORAGE.theme, null);
  applyTheme(savedTheme === 'dark' ? 'dark' : 'light');

  autoGrowInput();
  updateComposerState();
  updateSearchButton();
  updateThinkingButton();
  updateAgentButton();
  renderAttachments();
  renderChat();
  loadServerConfig();
  els.input.focus();
}

init();