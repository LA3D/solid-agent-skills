# pod-curator triggering eval — corrected mechanism (2026-05-24)

Runs each query in `../../../skills/pod-curator/evals/trigger-eval.json` through
`claude -p` with pod-curator installed as a real auto-triggerable skill under
`.claude/skills/` (NOT a `.claude/commands/` slash command, which never auto-fires
— the bug that floored skill-creator's run_eval at recall 0).

Detection: a `tool_use` with `name: "Skill"` and `input.skill: "pod-curator"` in
the stream-json = triggered. `context: fork` execution is separately confirmable
via the subagent trajectory at `~/.claude/projects/<slug>/<session_id>/subagents/`.

Result (n=1/query, Claude Code 2.1.150): **precision 100% · recall 100% · 20/20**.
All 10 should-trigger fired; all 10 near-miss negatives stayed quiet. Contrast:
the old .claude/commands mechanism scored recall 0% for every description.

Run: `python harness.py` from the solid-agent-skills repo root.
