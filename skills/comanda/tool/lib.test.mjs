import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { injectOverlay, OVERLAY_TAG, parsePort, readJsonFile, readManifest, restoreSnapshot, shouldRestart } from './lib.mjs';

test('snap.mjs saves the original and undo restores it, deleting what the request created', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'le-'));
  const repo = path.join(tmp, 'repo'), queue = path.join(tmp, 'queue');
  fs.mkdirSync(repo); fs.mkdirSync(queue);
  fs.writeFileSync(path.join(repo, 'a.txt'), 'before');
  const request = path.join(queue, 'p1.json');
  fs.writeFileSync(request, JSON.stringify({ id: 'p1', repo }));
  const snap = fileURLToPath(new URL('./snap.mjs', import.meta.url));
  // a.txt exists, b.txt will be created, ../outside.txt is outside the repo
  execFileSync(process.execPath, [snap, request, 'a.txt', 'b.txt', '../outside.txt'], { stdio: 'pipe' });
  fs.writeFileSync(path.join(repo, 'a.txt'), 'after');
  execFileSync(process.execPath, [snap, request, 'a.txt'], { stdio: 'pipe' }); // idempotent: keeps "before"
  fs.writeFileSync(path.join(repo, 'b.txt'), 'new');
  assert.equal(readManifest(queue, 'p1').length, 2);
  const restored = restoreSnapshot(queue, { id: 'p1', repo });
  assert.deepEqual(restored.sort(), ['a.txt', 'b.txt']);
  assert.equal(fs.readFileSync(path.join(repo, 'a.txt'), 'utf8'), 'before');
  assert.equal(fs.existsSync(path.join(repo, 'b.txt')), false);
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('injects before the last </body>', () => {
  assert.equal(injectOverlay('<body><p></p></body></html>'), `<body><p></p>${OVERLAY_TAG}</body></html>`);
});

test('without </body> appends at the end', () => {
  assert.equal(injectOverlay('<div></div>'), `<div></div>${OVERLAY_TAG}`);
});

test('parsePort finds the port in the app output', () => {
  assert.equal(parsePort('Página: http://127.0.0.1:55869/'), 55869);
  assert.equal(parsePort(' * Running on http://localhost:5000 (Press CTRL+C)'), 5000);
  assert.equal(parsePort('PORTA=61234'), 61234);
  assert.equal(parsePort('Uvicorn running on http://0.0.0.0:8000'), 8000);
  assert.equal(parsePort('ZeraLVD - pasta: D:\\x'), 0);
  assert.equal(parsePort('https://example.com:443/'), 0);
  // no scheme: the shape Go, Express and some Python servers print
  assert.equal(parsePort('Listening on 0.0.0.0:8080'), 8080);
  assert.equal(parsePort('Server started at 127.0.0.1:3000'), 3000);
  assert.equal(parsePort('at 12:30 the job ran'), 0);
});

test('readJsonFile ignores a UTF-8 BOM', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'le-bom-'));
  const file = path.join(tmp, 'r.json');
  fs.writeFileSync(file, '\uFEFF{"status":"done"}');
  assert.deepEqual(readJsonFile(file), { status: 'done' });
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('shouldRestart only on the transition to done/undone', () => {
  assert.equal(shouldRestart('working', 'done'), true);
  assert.equal(shouldRestart('done', 'undone'), true);
  assert.equal(shouldRestart('done', 'done'), false);
  assert.equal(shouldRestart(undefined, 'done'), false);
  assert.equal(shouldRestart('pending', 'working'), false);
});

test('does not inject twice', () => {
  const once = injectOverlay('<body></body>');
  assert.equal(injectOverlay(once), once);
});
