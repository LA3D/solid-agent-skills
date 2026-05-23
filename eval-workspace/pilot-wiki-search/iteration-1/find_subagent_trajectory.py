"""Discover the JSONL trajectory file for a subagent spawned via Claude Code's Agent tool.

Maps a subagent `description` to the corresponding `agent-<hash>.jsonl` file
under `~/.claude/projects/<project-slug>/<parent-session-uuid>/subagents/`.

Usage:
    find_subagent_trajectory.py <description> [--copy-to DEST]
"""
from __future__ import annotations

import argparse
import json
import shutil
import sys
from pathlib import Path

PROJECT_SLUG = "-Users-cvardema-dev-git-LA3D-agents-cogitarelink-solid"
PROJECTS_ROOT = Path.home() / ".claude" / "projects" / PROJECT_SLUG


def find_meta_by_description(description: str) -> list[Path]:
    "Return all meta.json files matching the given description."
    matches = []
    for meta in PROJECTS_ROOT.rglob("subagents/*.meta.json"):
        try:
            data = json.loads(meta.read_text())
            if data.get("description") == description:
                matches.append(meta)
        except (json.JSONDecodeError, OSError):
            continue
    return matches


def jsonl_for_meta(meta_path: Path) -> Path:
    return meta_path.with_name(meta_path.name.replace(".meta.json", ".jsonl"))


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("description")
    ap.add_argument("--copy-to", type=Path, help="Copy trajectory to this path")
    ap.add_argument("--newest-only", action="store_true",
                    help="If multiple matches, return the newest (default: error)")
    args = ap.parse_args()

    metas = find_meta_by_description(args.description)
    if not metas:
        print(f"No subagent found with description: {args.description!r}", file=sys.stderr)
        return 2

    if len(metas) > 1 and not args.newest_only:
        print(f"Multiple matches ({len(metas)}). Use --newest-only:", file=sys.stderr)
        for m in metas:
            print(f"  {m}", file=sys.stderr)
        return 3

    metas.sort(key=lambda p: p.stat().st_mtime, reverse=True)
    chosen_meta = metas[0]
    trajectory = jsonl_for_meta(chosen_meta)

    if not trajectory.exists():
        print(f"Trajectory missing: {trajectory}", file=sys.stderr)
        return 4

    if args.copy_to:
        args.copy_to.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy(trajectory, args.copy_to)
        print(f"copied {trajectory} -> {args.copy_to}")
    else:
        print(trajectory)
    return 0


if __name__ == "__main__":
    sys.exit(main())
