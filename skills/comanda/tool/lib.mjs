import fs from 'node:fs';
import path from 'node:path';

export const OVERLAY_TAG = '<script src="/__le/overlay.js"></script>';

export function injectOverlay(html) {
  if (html.includes(OVERLAY_TAG)) return html;
  const i = html.lastIndexOf('</body>');
  return i < 0 ? html + OVERLAY_TAG : html.slice(0, i) + OVERLAY_TAG + html.slice(i);
}

// Port announced by a supervised app in its output ("http://127.0.0.1:5000/", "localhost:8000", "PORTA=5000").
export function parsePort(line) {
  const s = String(line);
  // scheme optional: "Listening on 0.0.0.0:8080" announces a port without one
  const m = s.match(/(?:https?:\/\/)?(?:127\.0\.0\.1|localhost|0\.0\.0\.0|\[::1\]):(\d{2,5})/i) || s.match(/\bPORTA?\s*[=:]\s*(\d{2,5})\b/i);
  const p = m ? Number(m[1]) : 0;
  return p > 0 && p < 65536 ? p : 0;
}

// The supervised app restarts when a request finishes (done) or is undone. prev undefined = file seen
// for the first time (server start): no restart.
export function shouldRestart(prev, cur) {
  return (cur === 'done' || cur === 'undone') && prev !== undefined && prev !== cur;
}

export const snapDir =(queue, id) => path.join(queue, 'snap', id);

export function readManifest(queue, id) {
  try { return JSON.parse(fs.readFileSync(path.join(snapDir(queue, id), 'manifest.json'), 'utf8')); } catch { return []; }
}

// The queue is written by editors and shells: a UTF-8 BOM is a normal accident and JSON.parse rejects it.
export const readJsonFile = (file) => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));

// Restores the files saved by snap.mjs: copies the original back, or deletes what the request created.
// Only touches paths inside the request's repo. Returns the list of restored relative paths.
export function restoreSnapshot(queue, r) {
  const repo = path.resolve(r.repo);
  const sd = snapDir(queue, r.id);
  const plan = [];
  // pass 1: check every entry before touching the working tree, so a bad manifest cannot leave it half reverted.
  // back to front: if the same file was added twice (different spelling of the path), the oldest copy is the last
  // one written
  for (const m of readManifest(queue, r.id).reverse()) {
    const file = path.resolve(m.file);
    const rel = path.relative(repo, file);
    if (!rel || rel.startsWith('..') || path.isAbsolute(rel)) continue;
    if (m.existed) {
      // snap.mjs is the only writer and names the copy `<n>.bak`; anything else (a crafted manifest) is skipped
      if (!/^\d+\.bak$/.test(String(m.copy))) continue;
      const copy = path.join(sd, m.copy);
      if (!fs.statSync(copy, { throwIfNoEntry: false })?.isFile()) throw new Error(`snapshot copy missing: ${copy}`);
      if (fs.statSync(file, { throwIfNoEntry: false })?.isDirectory()) throw new Error(`target is a directory: ${file}`);
      if (!fs.statSync(path.dirname(file), { throwIfNoEntry: false })?.isDirectory()) throw new Error(`target folder missing: ${path.dirname(file)}`);
    }
    plan.push([m, file, rel]);
  }
  const out = [];
  for (const [m, file, rel] of plan) {
    if (m.existed) fs.copyFileSync(path.join(sd, m.copy), file);
    else fs.rmSync(file, { force: true });
    if (!out.includes(rel)) out.push(rel);
  }
  return out.reverse();
}
