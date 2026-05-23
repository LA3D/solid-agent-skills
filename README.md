# solid-agent-skills

Agent-first CLI + Claude Code skills for Solid Pod interaction. Discover, browse, query, and create conformant resources on a wiki-memory L3 Pod (the canonical L3 reference profile shipped by [cogitarelink-solid](https://github.com/LA3D/cogitarelink-solid)).

Sibling repo to `cogitarelink-solid`. The Pod is the substrate; this repo is the agent-side surface.

## Install

The CLI ships as the `solid-pod` binary plus a set of skills under `skills/`. Setup is a one-time link:

```bash
git clone <this repo>
cd solid-agent-skills
npm install
npm run build          # compiles TypeScript and sets exec bit on dist/cli.js
npm link               # symlinks /opt/homebrew/bin/solid-pod -> dist/cli.js
```

Verify:

```bash
which solid-pod        # should print /opt/homebrew/bin/solid-pod (or your npm prefix's bin/)
solid-pod --version    # should print the package version
```

### Why `npm link` matters for agents

Claude Code subagents inherit a clean shell environment from the parent — they do **not** see your `.zshrc` / `.bashrc` aliases or per-user PATH additions. `npm link` puts `solid-pod` in the standard npm bin prefix (typically `/opt/homebrew/bin` on Apple Silicon Homebrew installations), which is on every subagent's default PATH. Without this step, skills that reference the `solid-pod` CLI will fail with "command not found" inside subagents, and the agent will burn tool calls discovering that `node dist/cli.js` is the workaround.

This is one-time per machine. The link survives shell restarts and persists across `npm install` runs.

### Uninstall

```bash
cd solid-agent-skills
npm unlink -g solid-agent-skills
```

## Usage

```bash
solid-pod info <pod-url>                  # storage description as JSON-LD
solid-pod read <resource-url>             # GET a resource with .meta sidecar
solid-pod sparql <url> "<query>"          # Comunica SPARQL with auto .meta discovery
solid-pod wiki-search <container> "term"  # literal-substring search via ?ext=search-grep
# ...full command list in CLAUDE.md
```

Each CLI command has a corresponding skill under `skills/<command>/SKILL.md` that bootstraps an agent into using it — pointing at the canonical wire form published by the Pod's affordance descriptor at `/meta/affordances/<name>.ttl`.

## Architecture and project context

See `CLAUDE.md` for the architectural context (substrate stratification L1/L2/L3, skill suite roadmap, Phase 7a wiki-search shipped status, sibling project relationships).

Reference Pod: `cogitarelink-solid` — `make reset` creates a working Pod at `https://pod.vardeman.me/vault/` (with `127.0.0.1 pod.vardeman.me` in `/etc/hosts`).

## TLS in development

The reference Pod uses an mkcert dev cert. Node.js (including this CLI) does not read macOS Keychain. The CLI auto-detects mkcert at startup and registers the CA via undici, so this is usually a silent no-op. If TLS errors surface:

```bash
export NODE_EXTRA_CA_CERTS="$(mkcert -CAROOT)/rootCA.pem"
```

Do not use `NODE_TLS_REJECT_UNAUTHORIZED=0` — it disables verification globally.

## Eval workspace

`eval-workspace/` holds skill-creator harness runs (Rung 1.5 evaluations). Each run is a separate iteration directory with the substantive artifacts (trajectories, outputs, gradings, benchmark). See the Rung 1.5 redesign design doc in the cogitarelink-solid repo (`docs/plans/2026-05-23-rung-1.5-redesign-design.md`) for the framing.
