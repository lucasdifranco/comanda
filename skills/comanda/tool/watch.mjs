// Prints one line per pending request in the queue (existing and new ones) and one per user answer to a
// question from Claude. Made for the Claude Code Monitor: each line becomes a notification in the session.
//   REQUEST <file> :: <comment>        new request ("status": "pending")
//   ANSWER <file> :: <answer>          the user answered on the page ("status": "answered")
//   UNDONE <file> :: <files>           the user undid the request in the panel ("status": "undone")
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const QUEUE = path.join(path.dirname(fileURLToPath(import.meta.url)), 'queue');
fs.mkdirSync(QUEUE, { recursive: true });
const seen = new Set();     // requests already announced
const answered = new Set(); // answers already announced (file + text)
const undone = new Set();   // undone requests already announced (those already undone at start are not announced)
// --repo <folder>: only requests for that repository (other sessions may be handling others)
const norm = (p) => { const r = path.resolve(p); return process.platform === 'win32' ? r.toLowerCase() : r; };
const i = process.argv.indexOf('--repo');
const repo = i > 0 ? norm(process.argv[i + 1]) : null;
const one = (s) => String(s).replace(/\s+/g, ' ').slice(0, 200);

function check(file) {
  if (!file?.endsWith('.json')) return;
  const full = path.join(QUEUE, file);
  let r;
  try { r = JSON.parse(fs.readFileSync(full, 'utf8')); } catch { return; } // file still being written: the next event picks it up
  if (repo && norm(r.repo) !== repo) return;
  if (!seen.has(file)) {
    seen.add(file);
    if (r.status === 'undone') undone.add(file);
    if (r.status === 'pending') console.log(`REQUEST ${full} :: ${r.replyTo ? `(reply to ${r.replyTo.id}) ` : ''}${one(r.comment).slice(0, 120)}`);
  }
  if (r.status === 'undone' && !undone.has(file)) {
    undone.add(file);
    console.log(`UNDONE ${full} :: ${one((r.restored || []).join(', '))}`);
  }
  const key = `${file}|${r.userAnswer}`;
  if (r.status === 'answered' && r.userAnswer && !answered.has(key)) {
    answered.add(key);
    console.log(`ANSWER ${full} :: ${one(r.userAnswer)}`);
  }
}

fs.readdirSync(QUEUE).sort().forEach(check);
fs.watch(QUEUE, (_, file) => check(file));
