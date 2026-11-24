// Copies the tool to a stable path outside the skill folder, so the queue, the saved originals and the
// config survive `npx skills update`. Idempotent: run it again after an update.
//   node install.mjs          -> ~/.comanda/tool  (or $COMANDA_HOME/tool)
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SRC = path.dirname(fileURLToPath(import.meta.url));
const HOME = process.env.COMANDA_HOME || path.join(os.homedir(), '.comanda');
const DEST = path.join(HOME, 'tool');
// queue/ and config.json are data, not code: never copy them over the installed ones
const data = new Set(['queue', 'config.json', 'token', 'node_modules']);
if (path.resolve(SRC) !== path.resolve(DEST)) {
  fs.cpSync(SRC, DEST, { recursive: true, force: true, filter: (p) => p === SRC || !data.has(path.basename(p)) });
}
console.log(`TOOL=${DEST}`);
