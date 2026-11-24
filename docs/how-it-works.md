# How it works

Four moving parts, all on your machine:

```
browser ──► proxy 127.0.0.1:7780 ──► your dev server (localhost:5173, :8081, …)
                │
                ├── overlay.js  injected into every HTML response
                ├── queue/      one JSON per request + the files the agent saved for Undo
                └── config.json the current target (repo + url, or repo + command)
```

## The proxy

`server.mjs` serves the target site with one extra `<script src="/__le/overlay.js">` before `</body>`. That is the whole integration — the site itself is never modified. The proxy also carries the hot-reload WebSocket, so the page reloads as usual.

Nothing listens outside `127.0.0.1`, and every write endpoint (`/__le/target`, `/__le/edit`, `/__le/answer`, `/__le/undo`, `/__le/restart`) requires the request to carry Comanda's own `Origin`.

| Endpoint | What it does |
| --- | --- |
| `GET /__le/config` | current target and app state — the "is it up?" check |
| `POST /__le/target` | `{repo, url}` or `{repo, url, cmd}` — point the proxy at a site or an app command |
| `POST /__le/edit` | the overlay sends a ticket; returns `{id}` |
| `POST /__le/answer` | the user's answer to a question |
| `POST /__le/undo` | restore the files of the last request |
| `POST /__le/restart` | restart a supervised app |
| `GET /__le/` | the page to choose repository and URL by hand |

## The ticket

One JSON file per request in `queue/`, named `<id>.json`, where `id` is `<timestamp>-<random>`.

```json
{
  "id": "1790000000000-a1b2",
  "created": "2026-11-24T12:00:00.000Z",
  "status": "pending",
  "repo": "D:/code/my-site",
  "url": "http://localhost:5173",
  "route": "/pricing",
  "comment": "make this card taller and drop the shadow @1",
  "targets": [
    {
      "ref": "@1",
      "components": ["Card", "PricingGrid"],
      "html": "<div class=\"card …\">…</div>",
      "text": "Pro plan",
      "styles": { "box-shadow": "0 4px 12px rgba(0,0,0,.2)", "height": "180px" },
      "style": { "height": "180px" },
      "edits": [{ "prop": "height", "from": "180px", "to": "240px" }]
    }
  ],
  "markedArea": { "elements": [] },
  "drawing": { "image": "queue/drawings/<id>.png", "viewport": { "w": 1440, "h": 900 }, "rect": {}, "elements": [] },
  "replyTo": { "id": "1790000000000-zz99", "comment": "…", "reply": "…" }
}
```

Statuses, in the order they happen:

| Status | Who writes it | Meaning |
| --- | --- | --- |
| `pending` | the overlay | queued |
| `working` | the agent | being served |
| `question` | the agent | blocked on a question: `question: {context, text, options}` |
| `answered` | the overlay | the user answered: `userAnswer` |
| `done` | the agent | finished: `reply` |
| `error` | the agent | failed: `reply` holds the reason |
| `undone` | the proxy | the user pressed Undo: `undoneAt`, `restored` |

Side files in `queue/`: `<id>.now` (the current step, shown in the panel), `snap/<id>/` (the originals for Undo + `manifest.json`), `drawings/<id>.png`.

## The agent side

Three small scripts, no dependencies:

- **`wait.mjs`** — blocks until there is an event for one repository and prints it (`REQUEST`, `ANSWER`, `UNDONE`, or `WAITING` on timeout). Any harness can run it; there is no daemon, no socket, no MCP.
- **`snap.mjs`** — copies the files a request will change into `queue/snap/<id>/` *before* the first edit. That copy is what Undo restores. Idempotent, and it refuses paths outside the repository.
- **`install.mjs`** — copies the tool to `~/.comanda/tool`, so the queue outlives `npx skills update`.

`watch.mjs` is the push version of `wait.mjs`: it stays open and prints a line per event, for agents (Claude Code) that have a background-monitor primitive.

## Why files instead of an MCP server

The agent that will edit the code is already running in the repository, with the user's permissions, its own conventions and its own `AGENTS.md`. Handing it a JSON file and a one-line protocol keeps it in that context. An MCP server would add a process to install, a socket to secure, and a tool schema for every harness to implement. A file on disk is the same thing with fewer moving parts — and it means the skill works in any agent that can run a command.

## Supervised app mode

For a site that does not reload its own code (Python with the page embedded, Go, a binary), the target carries a `cmd` instead of a URL. Comanda spawns it in the repository (`PYTHONUNBUFFERED=1`, `BROWSER=none`, stdin closed), reads the port from its output, and restarts it whenever a request becomes `done` or `undone`, then reloads the page keeping the draft. While it starts or after a crash, the panel shows the tail of the app output with a restart link.
