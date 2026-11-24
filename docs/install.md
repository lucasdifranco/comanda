# Install

Comanda is one folder: `skills/comanda/`, with `SKILL.md` and the tool in `tool/`. Anything that reads a `SKILL.md` can use it.

## One command (recommended)

```bash
npx skills add lucasdifranco/comanda        # this project
npx skills add lucasdifranco/comanda -g     # every project
```

The CLI asks which agents you have and copies the skill into the right folder. It supports 80 agents, including all the ones below. Node.js 22.20+ for the CLI itself.

## Path of each agent

Copy `skills/comanda/` into the folder on the right. `.` is the root of the project where you run the agent; `~` is your home.

| Agent | Project | Global |
| --- | --- | --- |
| Claude Code | `.claude/skills/` | `~/.claude/skills/` |
| Codex | `.agents/skills/` | `~/.agents/skills/` |
| Cursor | `.agents/skills/` | `~/.cursor/skills/` |
| OpenCode | `.opencode/skills/` | `~/.config/opencode/skills/` |
| Antigravity (App, CLI, IDE) | `.agents/skills/` | `~/.gemini/config/skills/` |
| Grok Build | `.grok/skills/` | `~/.grok/skills/` |
| Gemini CLI | `.agents/skills/` | `~/.gemini/skills/` |
| GitHub Copilot | `.agents/skills/` | `~/.copilot/skills/` |
| Windsurf | `.windsurf/skills/` | `~/.codeium/windsurf/skills/` |
| Cline | `.agents/skills/` | `~/.agents/skills/` |
| Amp | `.agents/skills/` | `~/.config/agents/skills/` |
| Kiro CLI | `.kiro/skills/` | `~/.kiro/skills/` |
| OpenHands | `.openhands/skills/` | `~/.openhands/skills/` |
| Trae | `.trae/skills/` | `~/.trae/skills/` |
| Qwen Code | `.qwen/skills/` | `~/.qwen/skills/` |
| Zed | `.agents/skills/` | `~/.agents/skills/` |

Source of these paths: [`docs/agents.md`](https://github.com/vercel-labs/skills/blob/main/docs/agents.md) of the skills CLI, which follows the [Agent Skills specification](https://agentskills.io/specification).

### Notes per harness

- **Claude Code** also accepts a plugin-style skill in `.claude/skills/comanda/SKILL.md`; `disable-model-invocation: true` is already in the frontmatter, so it only runs when you type `/comanda`.
- **OpenCode** reads `.claude/skills/` and `.agents/skills/` too, so a project already set up for another agent works without copying anything.
- **Codex** also reads `agents/openai.yaml` from the skill folder: it sets the display name and turns off implicit invocation.
- **Antigravity** reads `.agents/skills/` in every parent folder up to the repository root, and turns each skill into a `/comanda` slash command.

## After installing

The first run of `/comanda` copies the tool to `~/.comanda/tool`, which is where the queue lives — outside the skill folder, so `npx skills update` never touches your requests or your undo snapshots. To do it yourself:

```bash
node ~/.claude/skills/comanda/tool/install.mjs   # or wherever the skill landed
```

Set `COMANDA_HOME` to install somewhere else.

## Requirements

- **Node.js 18+** on the PATH.
- A **dev server already running** for the site you want to edit (or an app command, for sites without hot reload).
- Nothing else. No `npm install`, no MCP server, no account.
