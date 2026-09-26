#!/usr/bin/env python3
"""Fill a changelog prompt from git diffs. Copy tools/readmadeprompt.txt into ChatGPT."""

from __future__ import annotations

import subprocess
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TOOLS = Path(__file__).resolve().parent
STATE = TOOLS / ".changelog_state"
OUT = TOOLS / "readmadeprompt.txt"
START_VERSION = "1.0"

PROMPT = """\
You are writing a daily product changelog from git history.

Current version: v{version}
Repo: {repo}

Produce exactly three artifacts, in this order, nothing else:

1) Version Tag
   - Semver tag for this release (bump from current version).
   - One line, e.g. v1.1

2) Update Title
   - One short public-facing title for this day's changes.

3) changelog.md
   - Markdown body only (no extra wrapping).
   - User-facing: what changed, why it matters.
   - Group as Added / Changed / Fixed when it fits.
   - Skip noise (lockfiles, formatting-only, generated files) unless it changes behavior.

Commit messages since last changelog:
```
{log}
```

Files changed (status + line counts). Use this instead of patches:
```
{stat}
```
"""


def git(*args: str) -> str:
    return subprocess.check_output(["git", "-C", str(ROOT), *args], text=True).strip()


def load_state() -> tuple[str, str]:
    lines = STATE.read_text().splitlines() if STATE.exists() else []
    if len(lines) < 2 or not lines[0].strip() or not lines[1].strip():
        return START_VERSION, git("rev-list", "--max-parents=0", "HEAD").splitlines()[0]
    return lines[0].strip(), lines[1].strip()


def save_state(version: str, sha: str) -> None:
    STATE.write_text(f"{version}\n{sha}\n")


EXCLUDE = (
    ":!**/pnpm-lock.yaml",
    ":!**/package-lock.json",
    ":!**/*.lock",
    ":!**/.next/**",
    ":!**/node_modules/**",
)


def bump(version: str) -> str:
    parts = version.lstrip("v").split(".")
    parts[-1] = str(int(parts[-1]) + 1)
    return ".".join(parts)


def main() -> None:
    version, last_sha = load_state()
    head = git("rev-parse", "HEAD")
    log = git("log", "--format=%h %s", f"{last_sha}..HEAD") or "(no new commits)"
    names = git("diff", "--name-status", last_sha, "--", ".", *EXCLUDE) or "(no files)"
    counts = git("diff", "--stat", last_sha, "--", ".", *EXCLUDE) or "(no stat)"
    stat = f"{names}\n\n{counts}"
    prompt = PROMPT.format(version=version, repo=ROOT.name, log=log, stat=stat)
    stamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    block = f"\n\n{'#' * 80}\n# {stamp}\n{'#' * 80}\n\n{prompt}"
    if OUT.exists() and OUT.read_text().strip():
        OUT.write_text(OUT.read_text() + block)
    else:
        OUT.write_text(f"# {stamp}\n\n{prompt}")
    next_version = bump(version)
    save_state(next_version, head)
    print(f"Wrote prompt to {OUT}")
    print(f"Stored next version v{next_version} @ {head[:7]}")


if __name__ == "__main__":
    main()
