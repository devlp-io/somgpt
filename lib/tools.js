import { webSearch, fetchPage } from './search.js';
import { runShell } from './shell.js';
import { readFileTool, writeFileTool, editFileTool, listDirTool } from './fs.js';

export const SEARCH_TOOLS = [
  {
    type: 'function',
    function: {
      name: 'web_search',
      description:
        'Search the public web. Use for current events, version-specific details, documentation, CVEs, advisories, tool syntax, or any fact you are not certain of. Returns a ranked list of results with title, url and snippet.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'The search query.' },
          limit: { type: 'integer', description: 'Max results to return (1-10). Default 6.' },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'fetch_url',
      description:
        'Fetch a URL and return its readable text. Use to read a specific page found via web_search when you need the full details. Follows public http/https redirects only.',
      parameters: {
        type: 'object',
        properties: {
          url: { type: 'string', description: 'Absolute http(s) URL to read.' },
        },
        required: ['url'],
      },
    },
  },
];

export const AGENT_TOOLS = [
  {
    type: 'function',
    function: {
      name: 'run_shell',
      description:
        'Run a shell command with full access and return stdout/stderr and the exit code. Use for installing, building, running, testing, git, grep/rg, and anything not covered by the file tools. Runs detached with a long timeout and capped output. Pass `cwd` to run inside a specific project directory; chain with && for multiple steps.',
      parameters: {
        type: 'object',
        properties: {
          command: { type: 'string', description: 'The shell command to execute.' },
          cwd: { type: 'string', description: 'Optional working directory (absolute or relative to the workspace root).' },
          timeout_ms: { type: 'integer', description: 'Optional timeout in milliseconds (default 120000).' },
        },
        required: ['command'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'read_file',
      description: 'Read a file as text with line numbers. Use before editing anything.',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'File path (absolute or relative).' },
          offset: { type: 'integer', description: '0-based line to start at. Default 0.' },
          limit: { type: 'integer', description: 'Max lines to return. Default: all.' },
        },
        required: ['path'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'write_file',
      description: 'Create or overwrite a file with the given content. Parent directories are created automatically.',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'File path (absolute or relative).' },
          content: { type: 'string', description: 'Full file content.' },
        },
        required: ['path', 'content'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'edit_file',
      description:
        'Surgically replace an exact string in a file. old_string must match exactly (including whitespace) and must be unique unless replace_all is true. Prefer this over rewriting whole files.',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'File path.' },
          old_string: { type: 'string', description: 'Exact text to replace.' },
          new_string: { type: 'string', description: 'Replacement text.' },
          replace_all: { type: 'boolean', description: 'Replace every occurrence (default false).' },
        },
        required: ['path', 'old_string', 'new_string'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_dir',
      description: 'List the entries of a directory (folders first). Defaults to the workspace root.',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Directory path. Defaults to the workspace root.' },
        },
      },
    },
  },
];

const clip = (text, max = 12_000) => {
  const value = String(text ?? '');
  return value.length > max ? `${value.slice(0, max)}\n… (${value.length - max} more chars)` : value;
};

/**
 * Execute a tool call.
 * @param {string} name
 * @param {object} args
 * @param {{ emit?: (event: object) => void }} [ctx] — emit streams tool events to the client.
 */
export async function runTool(name, args, ctx = {}) {
  const emit = typeof ctx.emit === 'function' ? ctx.emit : () => {};
  try {
    if (name === 'web_search') {
      const limit = clamp(args?.limit, 1, 10, 6);
      const data = await webSearch(String(args?.query ?? ''), limit);
      return {
        summary: data.results.length
          ? `Found ${data.results.length} result(s) for "${data.query}".`
          : `No results for "${data.query}".`,
        status: { kind: 'search', query: data.query, provider: data.provider, count: data.results.length },
        sources: data.results.map((result) => ({ title: result.title, url: result.url })),
        content: JSON.stringify({ query: data.query, provider: data.provider, results: data.results }),
      };
    }

    if (name === 'fetch_url') {
      const data = await fetchPage(String(args?.url ?? ''));
      return {
        summary: data.ok ? `Read ${data.url}` : `Could not read ${data.url}`,
        status: { kind: 'fetch', url: data.url },
        sources: data.ok ? [{ title: data.title || data.url, url: data.url }] : [],
        content: JSON.stringify({
          url: data.url,
          ok: data.ok,
          title: data.title || undefined,
          error: data.error || undefined,
          text: data.text || undefined,
          truncated: data.truncated || undefined,
        }),
      };
    }

    if (name === 'run_shell') {
      const command = String(args?.command ?? '');
      const cwd = args?.cwd ? String(args.cwd) : undefined;
      emit({ phase: 'start', tool: 'run_shell', title: command, subtitle: cwd ? `cwd: ${cwd}` : undefined });
      let streamed = 0;
      const result = await runShell(command, {
        cwd,
        timeoutMs: Number(args?.timeout_ms) || undefined,
        onChunk: (text) => {
          streamed += text.length;
          emit({ phase: 'stream', chunk: text });
        },
      });
      emit({
        phase: 'end',
        ok: result.ok,
        exit: result.code,
        killed: result.killed,
        truncated: result.truncated,
        output: result.output,
        streamed,
      });
      return {
        summary: result.ok ? 'Command succeeded (exit 0).' : `Command finished (exit ${result.code}).`,
        status: null,
        sources: [],
        content: JSON.stringify({
          command,
          cwd: result.cwd,
          exit_code: result.code,
          timed_out: result.killed,
          truncated: result.truncated,
          output: clip(result.output),
        }),
      };
    }

    if (name === 'read_file') {
      const path = String(args?.path ?? '');
      emit({ phase: 'start', tool: 'read_file', title: path });
      const data = await readFileTool(path, args?.offset, args?.limit);
      const output = `(${data.totalLines} lines) ${data.start + 1}-${data.start + data.shownLines}\n${data.text}`;
      emit({ phase: 'end', ok: true, output, title: data.path });
      return {
        summary: `Read ${data.path} (${data.shownLines}/${data.totalLines} lines).`,
        status: null,
        sources: [],
        content: JSON.stringify({ path: data.path, total_lines: data.totalLines, start: data.start, lines: clip(data.text) }),
      };
    }

    if (name === 'write_file') {
      const path = String(args?.path ?? '');
      const content = String(args?.content ?? '');
      emit({ phase: 'start', tool: 'write_file', title: path, subtitle: `${content.split('\n').length} lines` });
      const data = await writeFileTool(path, content);
      emit({ phase: 'end', ok: true, title: data.path, output: `Wrote ${data.lines} lines (${data.bytes} bytes) to ${data.path}` });
      return {
        summary: `Wrote ${data.path}.`,
        status: null,
        sources: [],
        content: JSON.stringify({ path: data.path, bytes: data.bytes, lines: data.lines }),
      };
    }

    if (name === 'edit_file') {
      const path = String(args?.path ?? '');
      emit({ phase: 'start', tool: 'edit_file', title: path });
      const data = await editFileTool(path, args?.old_string, args?.new_string, Boolean(args?.replace_all));
      emit({ phase: 'end', ok: true, title: data.path, output: `Applied ${data.replacements} edit(s) to ${data.path}` });
      return {
        summary: `Edited ${data.path}.`,
        status: null,
        sources: [],
        content: JSON.stringify({ path: data.path, replacements: data.replacements }),
      };
    }

    if (name === 'list_dir') {
      const path = String(args?.path ?? '.');
      emit({ phase: 'start', tool: 'list_dir', title: path });
      const data = await listDirTool(path);
      const listing = data.items.map((item) => (item.type === 'dir' ? `${item.name}/` : item.name)).join('\n');
      emit({ phase: 'end', ok: true, title: data.path, output: `${data.path}\n${listing}` });
      return {
        summary: `Listed ${data.count} entries in ${data.path}.`,
        status: null,
        sources: [],
        content: JSON.stringify({ path: data.path, count: data.count, items: data.items }),
      };
    }

    return { summary: `Unknown tool ${name}`, status: null, sources: [], content: JSON.stringify({ error: `unknown tool ${name}` }) };
  } catch (error) {
    const message = String(error?.message || error);
    emit({ phase: 'end', ok: false, error: message });
    return { summary: `Tool ${name} failed`, status: null, sources: [], content: JSON.stringify({ error: message }) };
  }
}

function clamp(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(number)));
}
