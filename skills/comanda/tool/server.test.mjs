// The write gate and /undo touch the user's files, so they are the endpoints that need a test. Runs the real server
// from a temporary copy of the tool (HERE defines queue/ and config.json), on a port found by this test.
import assert from 'node:assert/strict';
import { execFileSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const TOOL = path.dirname(fileURLToPath(import.meta.url));
const freePort = () => new Promise((done) => {
  const probe = net.createServer().listen(0, '127.0.0.1', () => {
    const { port } = probe.address();
    probe.close(() => done(port));
  });
});
const call = (port, route, body, origin) => new Promise((done, fail) => {
  const req = http.request({ host: '127.0.0.1', port, path: `/__le${route}`, method: 'POST',
    headers: { 'content-type': 'application/json', ...(origin ? { origin } : {}) } }, (r) => {
    let out = '';
    r.on('data', (c) => { out += c; });
    r.on('end', () => done({ status: r.statusCode, body: out }));
  });
  req.setTimeout(5000, () => req.destroy(new Error('timeout')));
  req.on('error', fail);
  req.end(body === undefined ? '' : JSON.stringify(body));
});

test('403 without Origin, and /undo only on the last done request', async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'le-srv-'));
  const tool = path.join(tmp, 'tool'), repo = path.join(tmp, 'repo'), queue = path.join(tool, 'queue');
  let child = null;
  try {
    fs.mkdirSync(tool); fs.mkdirSync(repo);
    for (const f of ['server.mjs', 'lib.mjs', 'snap.mjs']) fs.copyFileSync(path.join(TOOL, f), path.join(tool, f));
    fs.writeFileSync(path.join(tool, 'config.json'), JSON.stringify({ current: { repo, url: '' }, recent: [] }));
    fs.writeFileSync(path.join(repo, 'a.txt'), 'before');
    fs.writeFileSync(path.join(repo, 'b.txt'), 'b-before');

    const port = await freePort();
    child = spawn(process.execPath, [path.join(tool, 'server.mjs')],
      { env: { ...process.env, LIVE_EDIT_PORT: String(port) }, stdio: ['ignore', 'pipe', 'inherit'] });
    await new Promise((done, fail) => {
      let up = false;
      child.stdout.on('data', (b) => { if (!up && String(b).includes('live-edit at')) { up = true; done(); } });
      child.on('exit', (code) => { if (!up) fail(new Error(`server exited ${code}`)); });
    });

    // a POST from another origin (or from no origin) writes nothing
    assert.equal((await call(port, '/edit', { comment: 'x' })).status, 403);

    // two done requests, the second one the newest: what the agent leaves in the queue
    for (const [id, file] of [['1-old', 'b.txt'], ['2-last', 'a.txt']]) {
      const request = path.join(queue, `${id}.json`);
      fs.writeFileSync(request, JSON.stringify({ id, repo, status: 'done' }));
      execFileSync(process.execPath, [path.join(tool, 'snap.mjs'), request, file], { stdio: 'pipe' });
    }

    const notLast = await call(port, '/undo', { id: '1-old' }, `http://127.0.0.1:${port}`);
    assert.equal(notLast.status, 409);
    assert.match(notLast.body, /only the last request/);
    assert.equal(fs.readFileSync(path.join(repo, 'b.txt'), 'utf8'), 'b-before');

    fs.writeFileSync(path.join(repo, 'a.txt'), 'after');
    const undone = await call(port, '/undo', { id: '2-last' }, `http://127.0.0.1:${port}`);
    assert.equal(undone.status, 200);
    assert.deepEqual(JSON.parse(undone.body).restored, ['a.txt']);
    assert.equal(fs.readFileSync(path.join(repo, 'a.txt'), 'utf8'), 'before');
  } finally {
    child?.kill();
    try { fs.rmSync(tmp, { recursive: true, force: true }); } catch {}
  }
});
