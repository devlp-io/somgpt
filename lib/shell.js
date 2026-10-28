import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const DEFAULT_CWD = process.env.SOMGPT_WORKDIR || process.cwd();
const SHELL = process.env.SOMGPT_SHELL || 'bash';
const DEFAULT_TIMEOUT_MS = Number(process.env.SOMGPT_SHELL_TIMEOUT_MS) || 120_000;
const DEFAULT_MAX_OUTPUT = Number(process.env.SOMGPT_SHELL_MAX_OUTPUT) || 60_000;

export const SHELL_ROOT = DEFAULT_CWD;

/** Resolve a path against the root; absolute paths are honoured (full access). */
export function resolvePath(input, base = DEFAULT_CWD) {
  const value = String(input ?? '');
  return path.isAbsolute(value) ? value : path.resolve(base, value);
}

/**
 * Run a shell command with full access. The command runs detached in its own
 * process group so a timeout kills the whole tree; output is streamed via
 * onChunk and capped.
 *
 * @param {string} command
 * @param {{ cwd?: string, timeoutMs?: number, maxOutput?: number, onChunk?: (s: string) => void }} [opts]
 */
export async function runShell(command, opts = {}) {
  const cmd = String(command ?? '').trim();
  if (!cmd) return { ok: false, code: null, killed: false, truncated: false, output: 'Empty command.', cwd: DEFAULT_CWD };

  let cwd = resolvePath(opts.cwd || DEFAULT_CWD);
  try {
    await mkdir(cwd, { recursive: true });
  } catch {
    cwd = DEFAULT_CWD;
  }

  const timeoutMs = Number(opts.timeoutMs) > 0 ? Number(opts.timeoutMs) : DEFAULT_TIMEOUT_MS;
  const maxOutput = Number(opts.maxOutput) > 0 ? Number(opts.maxOutput) : DEFAULT_MAX_OUTPUT;
  const onChunk = typeof opts.onChunk === 'function' ? opts.onChunk : null;

  return await new Promise((resolve) => {
    let child;
    try {
      child = spawn(SHELL, ['-lc', cmd], {
        cwd,
        detached: true,
        stdio: ['ignore', 'pipe', 'pipe'],
        env: { ...process.env, TERM: 'dumb', PWD: cwd },
      });
    } catch (error) {
      resolve({ ok: false, code: null, killed: false, truncated: false, output: String(error?.message || error), cwd });
      return;
    }

    let output = '';
    let truncated = false;
    let killed = false;
    let settled = false;

    const push = (chunk) => {
      const text = chunk.toString();
      if (output.length < maxOutput) {
        const room = maxOutput - output.length;
        output += text.slice(0, room);
        if (onChunk && text) onChunk(text.slice(0, room));
      }
      if (output.length >= maxOutput) truncated = true;
    };

    child.stdout.on('data', push);
    child.stderr.on('data', push);

    const timer = setTimeout(() => {
      killed = true;
      try {
        process.kill(-child.pid, 'SIGKILL');
      } catch {
        try {
          child.kill('SIGKILL');
        } catch {
          /* gone */
        }
      }
    }, timeoutMs);

    child.on('error', (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({ ok: false, code: null, killed: false, truncated, output: `${output}${error.message}`, cwd });
    });

    child.on('close', (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({ ok: code === 0, code, killed, truncated, output, cwd });
    });
  });
}
