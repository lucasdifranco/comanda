# Launch kit

Positioning, copy, and where to put it. Everything here is in English, ready to paste.

## One-liner

> Point at the page. Say what you want. The agent edits the code.

## Pitch (3 lines)

Comanda turns your dev site into an input device: select the element, mark the area, draw on it, or change a value in the inspector — and your coding agent writes the change into the repository. It is a local proxy that injects an overlay, so nothing is installed in your site and there is nothing to configure but a dev server. Works with Claude Code, Codex, Cursor, OpenCode, Antigravity, Grok, Gemini CLI, Copilot and 70 more, because the whole protocol is a JSON file and a command.

## Where to publish

Two different jobs: **a place to host it** and **places to be seen**.

### Hosting (do this first)

| Where | What it does | Action |
| --- | --- | --- |
| **GitHub** `lucasdifranco/comanda` | the source of truth, and what every installer reads | create the repo public, add topics `agent-skills` `claude-code` `codex` `cursor` `opencode` `ai-agents` `dev-tools` `webdev`; upload a social preview |
| **skills.sh** (Vercel) | the index behind `npx skills add` | nothing to submit: a skill enters the index when people run `npx skills add lucasdifranco/comanda`. Get the first installs on day 0 so `npx skills find comanda` finds it. |

### Discovery

| Where | How | Effort |
| --- | --- | --- |
| **skills.sh** leaderboard / topic pages | installs are the rank; it also has a `Marketing` and `Agent workflows` topic | free, compounding |
| **Show HN** (`news.ycombinator.com/showhn`) | post the repo link with the title below; answer every comment for 3 hours | one morning, best single shot |
| **r/ClaudeAI**, **r/ClaudeCode**, **r/ChatGPTCoding**, **r/cursor**, **r/webdev** | a short screen recording beats a paragraph. Read each sub's self-promo rule first — several only allow it on a weekly thread | 5 posts, different angles |
| **X / Bluesky** | 15-second clip: click the card, type "make it taller", page repaints. That loop *is* the ad | one post + reply to your own with the install command |
| **VoltAgent/awesome-agent-skills** (1000+ skills), **Lum1104/awesome-agent-skills**, `awesome-skills.com` | PR adding one line: name, link, one-line description. Read each repo's contribution rule | 20 min each, permanent link |
| **anthropics/skills** and **openai/skills** | vendor-curated catalogs. Read the CONTRIBUTING of each before opening an issue/PR; they take few entries | only with a polished repo |
| **Product Hunt** | good for the "AI dev tool" audience; needs a gallery image and a 30-second video | half a day, schedule it |
| **Hacker News "Ask HN: what are you working on"** | the monthly thread, low effort, real traffic | 5 min |
| **Claude Code plugin marketplace** | third-party marketplaces are a `.claude-plugin/marketplace.json` away; it lets people run `/plugin marketplace add lucasdifranco/comanda` | next step, after the repo is stable — schema at code.claude.com/docs/en/plugin-marketplaces |

Skip for now: MCP registries (Smithery and similar). Comanda is not an MCP server, and pretending otherwise burns the first impression.

## Copy

### X / Bluesky

> I got tired of describing CSS to an agent.
>
> So I select the element on the page, type "make it taller", and the code changes. The page repaints because it's my own dev server.
>
> It's a skill — one command, works with Claude Code, Codex, Cursor, OpenCode, Antigravity.
>
> `npx skills add lucasdifranco/comanda`

### Show HN

**Title:** Show HN: Comanda – point at your dev site, the coding agent edits the code

**Body:**

> I use coding agents all day, and the slowest part was never the edit — it was describing which element I meant. "The card on the right, the second one, the shadow, no not that shadow."
>
> Comanda is a local proxy in front of your dev server. It injects an overlay, so you click the element, mark an area, or draw on the page, and write the change in the panel. A ticket lands in a queue folder as JSON. Your agent — already open in that repository — reads it, finds the code from the DOM path and the computed styles, makes the smallest change, and writes back a one-line reply. Your hot reload shows the result.
>
> No MCP server, no dependencies, nothing installed in the site, no account. The protocol is a JSON file and a command, which is why the same skill runs in Claude Code, Codex, Cursor, OpenCode, Antigravity, Grok and Gemini CLI.
>
> `npx skills add lucasdifranco/comanda`
>
> Happy to answer anything about the overlay (it is plain DOM + shadow root), the undo (it snapshots the files before the agent touches them), or why I did not build this as an MCP server.

### Reddit

> **Point at the page, let the agent edit the code**
>
> Built this because describing UI changes to an agent was slower than making them. You open your dev site through a local proxy, the page gets an edit overlay: select the element, mark an area, draw on it, or drag a value in the inspector. You type the request, the agent edits the code in your repo, your hot reload shows it.
>
> It's packaged as an agent skill, so it installs with one command and works across Claude Code / Codex / Cursor / OpenCode / Antigravity / Grok:
>
> `npx skills add lucasdifranco/comanda`
>
> Node 18+, nothing installed in your site, no account. Feedback welcome — especially edge cases on non-React sites, where I only have html/text/computed styles to locate the node.

### Product Hunt

**Tagline:** Point at the page. The agent edits the code.

## Day-0 checklist

1. Push the repo public, with topics and a social preview.
2. Install it yourself from a clean folder (`npx skills add lucasdifranco/comanda`) and record a 15-second screen capture of the loop.
3. Post the clip on X, then Show HN the next morning (US morning).
4. Open the 2–3 awesome-list PRs.
5. Reply to everything for the first 48 hours. The repo's issues page is the product page after day one.

## Honest risks

- **The demo needs a dev server.** A 15-second clip carries this project; a paragraph does not. Do not launch without it.
- **Style-first audience.** This lands with people who already use a coding agent daily. Nobody else will install it.
- **No screenshot in the loop, by design** (the browser would ask for permission). Say it before someone asks why the page is not captured.
