import { readFile, writeFile, readdir, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { resolvePath, SHELL_ROOT } from './shell.js';

export const FS_ROOT = SHELL_ROOT;

export async function readFileTool(target, offset = 0, limit = 0) {
  const file = resolvePath(target);
  const data = await readFile(file, 'utf8');
  const lines = data.split('\n');
  const start = Math.max(0, Math.trunc(Number(offset) || 0));
  const count = Math.trunc(Number(limit) || 0);
  const end = count > 0 ? start + count : lines.length;
  const slice = lines.slice(start, end);
  const numbered = slice.map((line, i) => `${String(start + i + 1).padStart(5)}  ${line}`).join('\n');
  return {
    path: file,
    totalLines: lines.length,
    shownLines: slice.length,
    start,
    text: numbered,
  };
}

export async function writeFileTool(target, content) {
  const file = resolvePath(target);
  await mkdir(path.dirname(file), { recursive: true });
  const body = String(content ?? '');
  await writeFile(file, body, 'utf8');
  return { path: file, bytes: Buffer.byteLength(body), lines: body.split('\n').length };
}

export async function editFileTool(target, oldString, newString, replaceAll = false) {
  const file = resolvePath(target);
  const data = await readFile(file, 'utf8');
  const find = String(oldString ?? '');
  const replace = String(newString ?? '');
  if (!find) throw new Error('old_string is required');

  const matches = data.split(find).length - 1;
  if (matches === 0) throw new Error('old_string was not found in the file');
  if (matches > 1 && !replaceAll) {
    throw new Error(`old_string is not unique (${matches} matches). Add more surrounding context or set replace_all.`);
  }

  const next = replaceAll ? data.split(find).join(replace) : data.replace(find, replace);
  await writeFile(file, next, 'utf8');
  return { path: file, replacements: replaceAll ? matches : 1 };
}

export async function listDirTool(target = '.') {
  const dir = resolvePath(target);
  const entries = await readdir(dir, { withFileTypes: true });
  const items = entries
    .map((entry) => ({ name: entry.name, type: entry.isDirectory() ? 'dir' : 'file' }))
    .sort((a, b) => (a.type === b.type ? a.name.localeCompare(b.name) : a.type === 'dir' ? -1 : 1));
  return { path: dir, count: items.length, items };
}
