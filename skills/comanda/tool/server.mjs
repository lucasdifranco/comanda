// Local proxy: serves the target site with the "Edit" overlay injected and writes requests to a queue (queue/).
// The code is edited by a normal Claude Code session that follows the queue (see README).
import fs from 'node:fs';
import http from 'node:http';
import https from 'node:https';
import net from 'node:net';
import path from 'node:path';
import tls from 'node:tls';
import { execFile, execFileSync, spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { injectOverlay, parsePort, readManifest, restoreSnapshot, shouldRestart } from './lib.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.LIVE_EDIT_PORT || 7780);
const SELF_ORIGINS = [`http://127.0.0.1:${PORT}`, `http://localhost:${PORT}`];
const CONFIG = path.join(HERE, 'config.json');
const QUEUE = path.join(HERE, 'queue');
fs.mkdirSync(QUEUE, { recursive: true });

let config = { current: null, recent: [] };
try { config = JSON.parse(fs.readFileSync(CONFIG, 'utf8')); } catch {}
// { repo, url, cmd?, fixedUrl? }. With cmd, live-edit starts the app (sites without hot reload, e.g. a Python server
// with the page built in) and restarts it after each done/undone request; without fixedUrl the port comes from the app output.
let target = config.current ? { ...config.current } : null;
if (target?.cmd) { target.fixedUrl = target.url || ''; target.url = target.fixedUrl || null; }
const clients = new Set();

const send = (res, ev) => res.write(`data: ${JSON.stringify(ev)}\n\n`);
const broadcast = (ev) => { for (const res of clients) send(res, ev); };
// url = what was configured (empty = port read from the app output); appUrl = where the app is now
const publicTarget = () => target && (target.cmd
  ? { repo: target.repo, url: target.fixedUrl, cmd: target.cmd, appUrl: target.url }
  : { repo: target.repo, url: target.url, cmd: '' });

// ------------------------------------------------------------------ supervised app (optional, target with cmd)
const app = { child: null, gen: 0, status: 'stopped', log: [], timer: null };
const appInfo = () => ({ status: app.status, log: app.log.slice(-15).join('\n') });

function appLog(text) {
  for (const line of String(text).split(/\r?\n/)) {
    if (!line.trim()) continue;
    app.log.push(line);
    console.log(`[app] ${line}`);
  }
  app.log = app.log.slice(-200);
}

function setApp(status) {
  app.status = status;
  broadcast({ kind: 'app', ...appInfo() });
}

// Kills the process and its children: with a shell, child.kill() would only kill cmd.exe/sh and the app would keep the port.
function killTree(child, sync = false) {
  if (!child || child.exitCode !== null || child.signalCode !== null) return Promise.resolve();
  const exited = new Promise((resolve) => { child.once('exit', resolve); setTimeout(resolve, 5000); });
  if (process.platform === 'win32') {
    const args = ['/pid', String(child.pid), '/T', '/F'];
    if (sync) { try { execFileSync('taskkill', args, { stdio: 'ignore' }); } catch {} }
    else execFile('taskkill', args, () => {});
  } else {
    try { process.kill(-child.pid, 'SIGTERM'); } catch { try { child.kill('SIGTERM'); } catch {} }
  }
  return exited;
}

async function waitReady(gen) {
  const until = Date.now() + 180000; // the app can take a while to start (e.g. loading data before opening the port)
  while (gen === app.gen && Date.now() < until) {
    const ok = await new Promise((resolve) => {
      const u = new URL(target.url);
      const req = (u.protocol === 'https:' ? https : http).get(u, { rejectUnauthorized: false, timeout: 2000 }, (r) => { r.resume(); resolve(true); });
      req.on('error', () => resolve(false));
      req.on('timeout', () => { req.destroy(); resolve(false); });
    });
    if (gen !== app.gen) return;
    if (ok) { setApp('ready'); broadcast({ kind: 'reload' }); return; }
    await new Promise((r) => setTimeout(r, 300));
  }
  if (gen === app.gen) { appLog(`[live-edit] ${target.url} did not respond in 180 s`); setApp('error'); }
}

async function startApp() {
  const gen = ++app.gen;
  const old = app.child;
  app.child = null;
  setApp('restarting');
  await killTree(old);
  if (gen !== app.gen || !target?.cmd) { if (gen === app.gen) setApp('stopped'); return; }
  if (!target.fixedUrl) target.url = null;
  appLog(`[live-edit] starting: ${target.cmd}  (folder: ${target.repo})`);
  const child = spawn(target.cmd, {
    cwd: target.repo, shell: true, detached: process.platform !== 'win32', windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe'],
    // unbuffered output (otherwise the line with the port may not arrive) and no browser where the convention exists
    env: { ...process.env, PYTHONUNBUFFERED: '1', PYTHONIOENCODING: 'utf-8', BROWSER: 'none' },
  });
  app.child = child;
  let waiting = false;
  const onOut = (buf) => {
    if (gen !== app.gen) return;
    const text = buf.toString('utf8');
    appLog(text);
    if (!waiting && !target.fixedUrl) {
      const port = text.split(/\r?\n/).map(parsePort).find(Boolean);
      if (port) { target.url = `http://127.0.0.1:${port}`; waiting = true; waitReady(gen); }
    }
  };
  child.stdout.on('data', onOut);
  child.stderr.on('data', onOut);
  child.on('error', (e) => { if (gen === app.gen) { appLog(`[live-edit] failed to start: ${e.message}`); setApp('error'); } });
  child.on('exit', (code) => {
    if (gen !== app.gen) return; // restart requested by live-edit
    app.child = null;
    appLog(`[live-edit] the app exited (code ${code})`);
    setApp('error');
  });
  if (target.fixedUrl) { waiting = true; waitReady(gen); }
}

function scheduleRestart() {
  clearTimeout(app.timer);
  app.timer = setTimeout(startApp, 400); // several events per write on Windows
}

async function stopApp() {
  app.gen++;
  clearTimeout(app.timer);
  const old = app.child;
  app.child = null;
  await killTree(old);
  app.status = 'stopped';
}

for (const sig of ['SIGINT', 'SIGTERM', 'SIGHUP']) process.on(sig, () => process.exit(0));
process.on('exit', () => killTree(app.child, true));

const VALID_ID = /^[\w-]+$/;

// Request + what comes from side files: "now" (<id>.now, the current step written by Claude) and "files"
// (what snap.mjs saved for Undo)
function readRequest(file) {
  let r;
  try { r = JSON.parse(fs.readFileSync(path.join(QUEUE, file), 'utf8')); } catch { return null; }
  try { r.now = fs.readFileSync(path.join(QUEUE, `${r.id}.now`), 'utf8').trim().slice(0, 160); } catch {}
  const repo = path.resolve(r.repo);
  r.files = readManifest(QUEUE, r.id).map((m) => path.relative(repo, m.file));
  return r;
}

function requestsForTarget() {
  return fs.readdirSync(QUEUE).filter((f) => f.endsWith('.json')).sort().slice(-30)
    .map(readRequest).filter((r) => r && target && r.repo === target.repo);
}

// Claude updates status/reply directly in the file (and the current step in .now); the overlay gets it by SSE.
// Last status seen for each request: a request that becomes done/undone restarts the supervised app.
const lastStatus = new Map();
for (const f of fs.readdirSync(QUEUE).filter((n) => n.endsWith('.json'))) {
  try { const r = JSON.parse(fs.readFileSync(path.join(QUEUE, f), 'utf8')); lastStatus.set(r.id, r.status); } catch {}
}
fs.watch(QUEUE, (_, file) => {
  if (!file?.endsWith('.json') && !file?.endsWith('.now')) return;
  const r = readRequest(file.replace(/\.now$/, '.json'));
  if (!r) return;
  const prev = lastStatus.get(r.id);
  lastStatus.set(r.id, r.status);
  if (r.repo !== target?.repo) return;
  broadcast({ kind: 'request', request: r });
  if (target.cmd && shouldRestart(prev, r.status)) scheduleRestart();
});

function readJson(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    // up to 8 MB: the drawing comes as a PNG in a data URL
    req.on('data', (c) => { data += c; if (data.length > 8e6) req.destroy(); });
    req.on('end', () => { try { resolve(JSON.parse(data || '{}')); } catch (e) { reject(e); } });
  });
}

async function handleApi(req, res, route) {
  if (req.method === 'GET' && (route === '/' || route === '')) {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }).end(fs.readFileSync(path.join(HERE, 'home.html')));
    return;
  }
  if (req.method === 'GET' && route === '/overlay.js') {
    res.writeHead(200, { 'Content-Type': 'text/javascript; charset=utf-8', 'Cache-Control': 'no-store' }).end(fs.readFileSync(path.join(HERE, 'overlay.js')));
    return;
  }
  if (req.method === 'GET' && route === '/config') {
    res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify({ ...config, current: publicTarget(), app: appInfo() }));
    return;
  }
  if (req.method === 'GET' && route === '/events') {
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
    send(res, { kind: 'hello', target: publicTarget(), app: appInfo(), requests: requestsForTarget() });
    clients.add(res);
    req.on('close', () => clients.delete(res));
    return;
  }

  // Writes only from our own pages (blocks POSTs from other sites open in the browser)
  if (req.method !== 'POST' || !SELF_ORIGINS.includes(req.headers.origin) || !req.headers['content-type']?.startsWith('application/json')) {
    res.writeHead(403).end();
    return;
  }
  let body;
  try { body = await readJson(req); } catch { res.writeHead(400).end(); return; }

  if (route === '/target') {
    const repo = path.resolve(String(body.repo || ''));
    // cmd (optional): command that starts the app, run in the repo folder; live-edit restarts it after each done request
    const cmd = typeof body.cmd === 'string' ? body.cmd.trim() : '';
    const rawUrl = typeof body.url === 'string' ? body.url.trim() : '';
    let url = null;
    if (rawUrl || !cmd) {
      try { url = new URL(rawUrl); } catch { res.writeHead(400).end('invalid URL'); return; }
      if (!/^https?:$/.test(url.protocol)) { res.writeHead(400).end('URL must be http or https'); return; }
    }
    if (!fs.statSync(repo, { throwIfNoEntry: false })?.isDirectory()) { res.writeHead(400).end('repository folder does not exist'); return; }
    const saved = { repo, url: url ? url.origin : '', ...(cmd ? { cmd } : {}) };
    const same = (t) => t.repo === saved.repo && t.url === saved.url && (t.cmd || '') === cmd;
    config = { current: saved, recent: [saved, ...config.recent.filter((t) => !same(t))].slice(0, 8) };
    fs.writeFileSync(CONFIG, JSON.stringify(config, null, 2));
    target = cmd ? { repo, cmd, fixedUrl: saved.url, url: saved.url || null } : { repo, url: saved.url };
    if (cmd) startApp(); else await stopApp();
    res.writeHead(204).end();
  } else if (route === '/restart') {
    if (!target?.cmd) { res.writeHead(409).end('target has no command'); return; }
    startApp();
    res.writeHead(204).end();
  } else if (route === '/edit') {
    if (!target) { res.writeHead(400).end('no target'); return; }
    if (typeof body.comment !== 'string' || !body.comment.trim()) { res.writeHead(400).end(); return; }
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const request = {
      id, created: new Date().toISOString(), status: 'pending', reply: '',
      repo: target.repo, url: target.url, route: String(body.route || '/'),
      comment: body.comment.trim(), targets: Array.isArray(body.targets) ? body.targets : [],
    };
    // reply to a request already done ("Reply" in the panel): carries the id and comment of the original
    const orig = VALID_ID.test(String(body.replyTo || '')) ? readRequest(`${body.replyTo}.json`) : null;
    if (orig) request.replyTo = { id: orig.id, comment: orig.comment, reply: orig.reply };
    // drawing: transparent PNG the size of the window, only the strokes; rect and elements say what is underneath
    const png = typeof body.drawing?.png === 'string' && body.drawing.png.match(/^data:image\/png;base64,([A-Za-z0-9+/=]+)$/);
    if (png) {
      const dir = path.join(QUEUE, 'drawings');
      fs.mkdirSync(dir, { recursive: true });
      const image = path.join(dir, `${id}.png`);
      fs.writeFileSync(image, Buffer.from(png[1], 'base64'));
      request.drawing = { image, viewport: body.drawing.viewport, rect: body.drawing.rect, elements: Array.isArray(body.drawing.elements) ? body.drawing.elements : [] };
    }
    fs.writeFileSync(path.join(QUEUE, `${id}.json`), JSON.stringify(request, null, 2));
    res.writeHead(201, { 'Content-Type': 'application/json' }).end(JSON.stringify({ id }));
  } else if (route === '/undo') {
    // Undo: only the most recent request of the repo, already done, with files saved by snap.mjs
    const id = String(body.id || '');
    if (!VALID_ID.test(id)) { res.writeHead(400).end(); return; }
    const r = readRequest(`${id}.json`);
    const last = requestsForTarget().at(-1);
    if (!r || !last || last.id !== id) { res.writeHead(409).end('only the last request can be undone'); return; }
    if (r.status !== 'done') { res.writeHead(409).end('the request must be done'); return; }
    if (!r.files.length) { res.writeHead(409).end('request has no saved files'); return; }
    let restored;
    try { restored = restoreSnapshot(QUEUE, r); } catch (e) { res.writeHead(500).end(`restore failed: ${e.message}`); return; }
    const saved = JSON.parse(fs.readFileSync(path.join(QUEUE, `${id}.json`), 'utf8'));
    saved.status = 'undone';
    saved.undoneAt = new Date().toISOString();
    saved.restored = restored;
    fs.writeFileSync(path.join(QUEUE, `${id}.json`), JSON.stringify(saved, null, 2));
    res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify({ restored }));
  } else if (route === '/answer') {
    // User answer to a question from Claude ("status": "question"): goes into the JSON and watch.mjs tells the session
    const id = String(body.id || '');
    const answer = typeof body.answer === 'string' ? body.answer.trim() : '';
    if (!VALID_ID.test(id) || !answer) { res.writeHead(400).end(); return; }
    let r = null;
    try { r = JSON.parse(fs.readFileSync(path.join(QUEUE, `${id}.json`), 'utf8')); } catch {}
    if (!r || r.status !== 'question') { res.writeHead(409).end('request has no open question'); return; }
    r.userAnswer = answer;
    r.status = 'answered';
    fs.writeFileSync(path.join(QUEUE, `${id}.json`), JSON.stringify(r, null, 2));
    res.writeHead(204).end();
  } else res.writeHead(404).end();
}

function proxyHeaders(headers, t) {
  const h = { ...headers, host: t.host, 'accept-encoding': 'identity' };
  if (h.origin) h.origin = t.origin;
  if (h.referer) h.referer = h.referer.replace(/^https?:\/\/[^/]+/, t.origin);
  return h;
}

// Supervised app starting or down: page that reloads itself and shows the end of the app output
const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);
function appWaitPage(res, why) {
  const info = appInfo();
  res.writeHead(503, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' }).end(`<!doctype html>
<meta charset="utf-8"><meta http-equiv="refresh" content="${info.status === 'error' ? 5 : 1}"><title>live-edit</title>
<body style="font:14px system-ui,sans-serif;padding:24px;background:#0b0b0b;color:#eee">
<p>${esc(why)} App: <b>${esc(info.status)}</b> (<code>${esc(target.cmd)}</code>). This page reloads itself.
${info.status === 'error' ? 'Fix the error: the app restarts on the next done request, or <a style="color:#60a5fa" href="#" onclick="fetch(\'/__le/restart\',{method:\'POST\',headers:{\'Content-Type\':\'application/json\'},body:\'{}\'});return false">restart now</a>.' : ''}
<a style="color:#60a5fa" href="/__le/">change target</a></p>
<pre style="background:#161616;padding:12px;border-radius:6px;white-space:pre-wrap">${esc(info.log)}</pre></body>`);
}

function proxy(req, res) {
  if (!target.url) { appWaitPage(res, 'Waiting for the app to announce the port.'); return; }
  const t = new URL(target.url);
  const lib = t.protocol === 'https:' ? https : http;
  const up = lib.request({ hostname: t.hostname, port: t.port, path: req.url, method: req.method, headers: proxyHeaders(req.headers, t) }, (r) => {
    const headers = { ...r.headers };
    if (headers.location?.startsWith(t.origin)) headers.location = headers.location.slice(t.origin.length) || '/';
    if (!String(headers['content-type']).includes('text/html')) {
      res.writeHead(r.statusCode, headers);
      r.pipe(res);
      return;
    }
    const chunks = [];
    r.on('data', (c) => chunks.push(c));
    r.on('end', () => {
      delete headers['content-length'];
      delete headers['content-security-policy'];
      res.writeHead(r.statusCode, headers).end(injectOverlay(Buffer.concat(chunks).toString('utf8')));
    });
  });
  up.on('error', (e) => {
    if (target.cmd && !res.headersSent) { appWaitPage(res, `${target.url} did not respond (${e.code}).`); return; }
    if (!res.headersSent) res.writeHead(502, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(`Site ${target.url} did not respond (${e.code}). Is it running? Change target: /__le/`);
  });
  req.pipe(up);
}

const server = http.createServer((req, res) => {
  if (req.url.startsWith('/__le')) { handleApi(req, res, req.url.slice(5).split('?')[0]); return; }
  if (!target) { res.writeHead(302, { Location: '/__le/' }).end(); return; }
  proxy(req, res);
});

// WebSocket (dev server hot reload) passed through as a raw tunnel
server.on('upgrade', (req, socket, head) => {
  if (!target?.url) { socket.destroy(); return; }
  const t = new URL(target.url);
  const port = Number(t.port) || (t.protocol === 'https:' ? 443 : 80);
  const up = t.protocol === 'https:' ? tls.connect(port, t.hostname, { servername: t.hostname }) : net.connect(port, t.hostname);
  up.once(t.protocol === 'https:' ? 'secureConnect' : 'connect', () => {
    const h = proxyHeaders(req.headers, t);
    delete h['accept-encoding'];
    up.write([`${req.method} ${req.url} HTTP/1.1`, ...Object.entries(h).map(([k, v]) => `${k}: ${v}`)].join('\r\n') + '\r\n\r\n');
    if (head?.length) up.write(head);
    up.pipe(socket).pipe(up);
  });
  up.on('error', () => socket.destroy());
  socket.on('error', () => up.destroy());
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`live-edit at http://127.0.0.1:${PORT}  (target: ${target ? `${target.cmd ? `[${target.cmd}]` : target.url} -> ${target.repo}` : 'none, set it at /__le/'})`);
  if (target?.cmd) startApp();
});
