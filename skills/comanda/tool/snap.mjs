// Saves the original content of the files a request will change, for the panel's "Undo".
// Run BEFORE the first Edit/Write of each file in the request:
//   node snap.mjs <request.json> <file> [file...]
// Idempotent: a file already saved for this request keeps the original copy. A file that does not exist is recorded
// as new (undo deletes it). Copies go in queue/snap/<id>/ (no loose .json in queue/).
import fs from 'node:fs';
import path from 'node:path';
import { readJsonFile, snapDir } from './lib.mjs';

const [request, ...files] = process.argv.slice(2);
if (!request || !files.length) { console.error('usage: node snap.mjs <request.json> <file> [file...]'); process.exit(1); }
const r = readJsonFile(request);
const dir = snapDir(path.dirname(path.resolve(request)), r.id);
fs.mkdirSync(dir, { recursive: true });
const mf = path.join(dir, 'manifest.json');
let manifest = [];
try { manifest = JSON.parse(fs.readFileSync(mf, 'utf8')); } catch {}

const repo = path.resolve(r.repo);
const same = (a, b) => (process.platform === 'win32' ? a.toLowerCase() === b.toLowerCase() : a === b);
for (const f of files) {
  const file = path.resolve(repo, f);
  const rel = path.relative(repo, file);
  if (!rel || rel.startsWith('..') || path.isAbsolute(rel)) { console.error(`outside the repo, skipped: ${file}`); continue; }
  if (manifest.some((m) => same(m.file, file))) continue;
  const existed = fs.existsSync(file);
  const copy = existed ? `${manifest.length}.bak` : null;
  if (existed) fs.copyFileSync(file, path.join(dir, copy));
  manifest.push({ file, existed, copy });
  console.log(`${existed ? 'saved' : 'new'}: ${path.relative(repo, file)}`);
}
fs.writeFileSync(mf, JSON.stringify(manifest, null, 2));
