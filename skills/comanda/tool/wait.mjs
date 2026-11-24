// Prints the events of the queue for one repository and exits, so any agent in any harness can poll it:
//   REQUEST <json> :: <comment>   a request waiting for the agent (status pending)
//   ANSWER  <json> :: <answer>    the user answered a question (status answered)
//   UNDONE  <json> :: <files>     the user undid it in the panel (status undone, last 30 min)
//   WAITING                       nothing happened within the timeout: run it again
// Usage: node wait.mjs --repo <folder> [--timeout 90] [--queue <dir>]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const arg = (name, dflt) => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : dflt; };
const QUEUE = path.resolve(arg('--queue', path.join(path.dirname(fileURLToPath(import.meta.url)), 'queue')));
const TIMEOUT = Number(arg('--timeout', '90')) * 1000;
const norm = (p) => { const r = path.resolve(p); return process.platform === 'win32' ? r.toLowerCase() : r; };
const repoArg = arg('--repo', null);
const repo = repoArg ? norm(repoArg) : null;
const one = (s) => String(s ?? '').replace(/\s+/g, ' ').trim();

function events() {
  const out = [];
  let files = [];
  try { files = fs.readdirSync(QUEUE).filter((f) => f.endsWith('.json')).sort(); } catch { return out; }
  for (const f of files) {
    const full = path.join(QUEUE, f);
    let r;
    try { r = JSON.parse(fs.readFileSync(full, 'utf8')); } catch { continue; } // still being written: next poll
    if (repo && r.repo && norm(r.repo) !== repo) continue;
    if (r.status === 'pending') out.push(`REQUEST ${full} :: ${r.replyTo ? `(reply to ${r.replyTo.id}) ` : ''}${one(r.comment).slice(0, 120)}`);
    else if (r.status === 'answered') out.push(`ANSWER ${full} :: ${one(r.userAnswer).slice(0, 120)}`);
    else if (r.status === 'undone' && Date.now() - fs.statSync(full).mtimeMs < 30 * 60 * 1000) out.push(`UNDONE ${full} :: ${one((r.restored || []).join(', '))}`);
  }
  return out;
}

const until = Date.now() + TIMEOUT;
for (;;) {
  const e = events();
  if (e.length) { console.log(e.join('\n')); process.exit(0); }
  if (Date.now() >= until) { console.log('WAITING'); process.exit(0); }
  await new Promise((r) => setTimeout(r, 1000));
}
