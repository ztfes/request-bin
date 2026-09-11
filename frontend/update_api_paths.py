#!/usr/bin/env python3
"""Point the frontend at the /api-prefixed FastAPI backend behind CloudFront.

Run from the frontend directory (the one containing package.json):

    python3 update_api_paths.py --dry-run   # print the diff, change nothing
    python3 update_api_paths.py             # back up originals, then apply

What it changes:
  src/CreateBucket.tsx  default base /api; absolute catch-all URL under /hooks
  src/api.ts            default base /api; absolute WebSocket and catch-all URLs
  src/lib/api.ts        default base /api; absolute `base`
  src/lib/ws.ts         resolveWsUrl defaults to same-origin /api, accepts relative paths
  .env.example          VITE_API_URL=/api

Safe to re-run: edits that are already applied are skipped. If any expected
code can't be found, no files are written.
"""
import argparse
import difflib
import re
import shutil
import sys
from datetime import datetime
from pathlib import Path


class Edit:
    """One change to a file.

    old:      literal text, or a compiled regex, to find
    new:      replacement text, or a function that takes the regex match
    marker:   text that only exists once the edit is applied (lets re-runs skip it)
    optional: a missing `old` is fine (for example, a fallback that's already fixed)
    """

    def __init__(self, description, old, new, marker=None, optional=False):
        self.description = description
        self.old = old
        self.new = new
        self.marker = marker
        self.optional = optional

    def apply(self, text):
        if self.marker is not None and self.marker in text:
            return text, "already applied"
        missing = "not needed" if self.optional else "NOT FOUND"
        if isinstance(self.old, re.Pattern):
            match = self.old.search(text)
            if not match:
                return text, missing
            replacement = self.new(match) if callable(self.new) else self.new
            return text[: match.start()] + replacement + text[match.end():], "applied"
        if self.old not in text:
            return text, missing
        return text.replace(self.old, self.new, 1), "applied"


def localhost_fallback():
    """`VITE_API_URL ?? 'http://localhost:8000'` -> `VITE_API_URL || '/api'`, keeping quote style."""
    return Edit(
        "default API base: http://localhost:8000 -> /api",
        re.compile(r"""import\.meta\.env\.VITE_API_URL \?\? (["'])http://localhost:8000\1"""),
        lambda m: f"import.meta.env.VITE_API_URL || {m.group(1)}/api{m.group(1)}",
        optional=True,
    )


# --- src/CreateBucket.tsx ----------------------------------------------------

CREATE_BUCKET_BASE = 'const API_BASE = import.meta.env.VITE_API_URL || "/api";'

CREATE_BUCKET = [
    localhost_fallback(),
    Edit(
        "add absolute API base for URLs users copy",
        CREATE_BUCKET_BASE,
        CREATE_BUCKET_BASE + "\n"
        "// Absolute form of API_BASE, for URLs users copy outside the app.\n"
        r'const API_URL_ABSOLUTE = new URL(API_BASE, window.location.origin).href.replace(/\/+$/, "");',
        marker="const API_URL_ABSOLUTE =",
    ),
    Edit(
        "catch-all URL: absolute, under /hooks",
        "const catchAllUrl = bucket ? `${API_BASE}/${bucket.public_id}` : null;",
        "const catchAllUrl = bucket ? `${API_URL_ABSOLUTE}/hooks/${bucket.public_id}/` : null;",
        marker="${API_URL_ABSOLUTE}/hooks/",
    ),
    Edit(
        "display the full catch-all URL",
        '<code className="new-bucket-url">{API_BASE}/{bucket.public_id}</code>',
        '<code className="new-bucket-url">{catchAllUrl}</code>',
        marker='<code className="new-bucket-url">{catchAllUrl}</code>',
    ),
]

# --- src/api.ts --------------------------------------------------------------

API_TS_BASE = r"export const BASE_URL = (import.meta.env.VITE_API_URL || '/api').replace(/\/+$/, '')"

API_TS = [
    localhost_fallback(),
    Edit(
        "add absolute base URL",
        API_TS_BASE,
        API_TS_BASE + "\n"
        "/** BASE_URL resolved against the page origin, for URLs that must be absolute. */\n"
        r"const ABSOLUTE_BASE_URL = new URL(BASE_URL, window.location.origin).href.replace(/\/+$/, '')",
        marker="const ABSOLUTE_BASE_URL =",
    ),
    Edit(
        "WebSocket URL: build from absolute base",
        "`${BASE_URL.replace(/^http/, 'ws')}/ws/${publicId}`",
        "`${ABSOLUTE_BASE_URL.replace(/^http/, 'ws')}/ws/${publicId}`",
        marker="${ABSOLUTE_BASE_URL.replace(",
    ),
    Edit(
        "catch-all URL: absolute, under /hooks",
        "`${BASE_URL}/${publicId}/`",
        "`${ABSOLUTE_BASE_URL}/hooks/${publicId}/`",
        marker="${ABSOLUTE_BASE_URL}/hooks/",
    ),
]

# --- src/lib/api.ts ----------------------------------------------------------

LIB_API_TS = [
    localhost_fallback(),
    Edit(
        "absolute `base` (API_BASE is never empty now)",
        "const base = API_BASE || window.location.origin",
        r"const base = new URL(API_BASE, window.location.origin).href.replace(/\/+$/, '')",
        marker="const base = new URL(API_BASE, window.location.origin)",
    ),
]

# --- src/lib/ws.ts -----------------------------------------------------------

NEW_RESOLVE_WS_URL = r"""function resolveWsUrl(bucketId: string): string {
  const configured = (import.meta.env.VITE_API_URL as string | undefined)?.trim()
  let apiUrl: string
  if (configured && /^https?:\/\//.test(configured)) {
    // Absolute backend URL, e.g. https://api.example.com/api
    apiUrl = configured
  } else if (configured && configured.startsWith('/')) {
    // Relative path, e.g. /api: same origin as the page (CloudFront or the Vite proxy)
    apiUrl = window.location.origin + configured
  } else {
    // Unset, blank, or malformed: default to same-origin /api
    apiUrl = window.location.origin + DEFAULT_API_PATH
  }
  const wsUrl = apiUrl.replace(/^http/, 'ws').replace(/\/+$/, '')
  return `${wsUrl}/ws/${encodeURIComponent(bucketId)}`
}
"""

WS_TS = [
    Edit(
        "resolveWsUrl: default to same-origin /api, accept relative paths",
        re.compile(
            r"const DEFAULT_API_URL = (['\"])http://localhost:8000\1\n"
            r"(.*?)"  # constants between DEFAULT_API_URL and the function, kept as-is
            r"function resolveWsUrl\(bucketId: string\): string \{\n.*?\n\}\n",
            re.DOTALL,
        ),
        lambda m: "const DEFAULT_API_PATH = '/api'\n" + m.group(2) + NEW_RESOLVE_WS_URL,
        marker="DEFAULT_API_PATH",
    ),
]

# --- .env.example ------------------------------------------------------------

ENV_EXAMPLE = [
    Edit(
        "example VITE_API_URL -> /api",
        re.compile(r"^VITE_API_URL=http://localhost:8000/?$", re.MULTILINE),
        "VITE_API_URL=/api",
        marker="VITE_API_URL=/api",
        optional=True,
    ),
]

# (path, edits, required)
FILES = [
    ("src/CreateBucket.tsx", CREATE_BUCKET, True),
    ("src/api.ts", API_TS, True),
    ("src/lib/api.ts", LIB_API_TS, True),
    ("src/lib/ws.ts", WS_TS, True),
    (".env.example", ENV_EXAMPLE, False),
]

# `new URL('/buckets/x', base)` discards base's /api path, so flag it for review.
URL_WITH_BASE = re.compile(r"new URL\(\s*[^,()]+,\s*base\s*\)")


def read(path):
    with open(path, encoding="utf-8", newline="") as f:
        return f.read()


def write(path, text):
    with open(path, "w", encoding="utf-8", newline="") as f:
        f.write(text)


def line_of(text, index):
    return text.count("\n", 0, index) + 1


def main():
    parser = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    parser.add_argument("--dry-run", action="store_true", help="print the diff without writing files")
    args = parser.parse_args()

    root = Path.cwd()
    if not (root / "package.json").is_file() or not (root / "src").is_dir():
        sys.exit("Run this from the frontend directory (package.json and src/ not found).")

    changes = []  # (rel, path, original, updated, crlf)
    problems = []
    warnings = []

    for rel, edits, required in FILES:
        path = root / rel
        if not path.is_file():
            if required:
                problems.append(f"{rel}: file not found")
            continue

        raw = read(path)
        crlf = "\r\n" in raw
        original = raw.replace("\r\n", "\n")
        text = original

        print(rel)
        for edit in edits:
            text, status = edit.apply(text)
            print(f"  [{status}] {edit.description}")
            if status == "NOT FOUND":
                problems.append(f"{rel}: couldn't find the code for '{edit.description}'")

        if rel.startswith("src/"):
            for m in re.finditer(re.escape("localhost:8000"), text):
                problems.append(f"{rel}:{line_of(text, m.start())}: still references localhost:8000")
        if rel == "src/lib/ws.ts" and "DEFAULT_API_URL" in text:
            problems.append(f"{rel}: DEFAULT_API_URL is still referenced after the edit")
        if rel == "src/lib/api.ts":
            for m in URL_WITH_BASE.finditer(text):
                warnings.append(
                    f"{rel}:{line_of(text, m.start())}: `{m.group(0)}` drops the /api prefix when the "
                    "path starts with '/'. Consider `new URL(`${base}${path}`)` instead."
                )

        if text != original:
            changes.append((rel, path, original, text, crlf))

    # Anything else in src/ still pointing at the old backend?
    handled = {root / rel for rel, _, _ in FILES}
    for path in sorted((root / "src").rglob("*")):
        if path.is_file() and path not in handled and path.suffix in {".ts", ".tsx", ".js", ".jsx"}:
            text = read(path)
            for m in re.finditer(re.escape("localhost:8000"), text):
                warnings.append(
                    f"{path.relative_to(root)}:{line_of(text, m.start())}: references localhost:8000 "
                    "(not handled by this script)"
                )

    print()
    if problems:
        print("Problems (no files were changed):")
        for p in problems:
            print(f"  - {p}")
        print("\nPaste this output and the relevant lines, and the patterns can be adjusted.")
        sys.exit(1)

    for w in warnings:
        print(f"Warning: {w}")
    if warnings:
        print()

    if not changes:
        print("Nothing to change: all edits are already applied.")
        return

    if args.dry_run:
        for rel, _, original, updated, _ in changes:
            sys.stdout.writelines(
                difflib.unified_diff(
                    original.splitlines(keepends=True),
                    updated.splitlines(keepends=True),
                    fromfile=f"a/{rel}",
                    tofile=f"b/{rel}",
                )
            )
            print()
        print("Dry run: no files were changed. Re-run without --dry-run to apply.")
        return

    backup_dir = root / f".api-update-backup-{datetime.now():%Y%m%d-%H%M%S}"
    for rel, path, _, updated, crlf in changes:
        backup = backup_dir / rel
        backup.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(path, backup)
        write(path, updated.replace("\n", "\r\n") if crlf else updated)

    print(f"Updated {len(changes)} file(s). Originals backed up to {backup_dir.name}/")
    print(
        "\nNext:\n"
        "  npm run build\n"
        '  grep -rl "localhost:8000" dist/ || echo "clean"\n'
        "  aws s3 sync ./dist s3://YOUR_BUCKET --delete\n"
        '  aws cloudfront create-invalidation --distribution-id YOUR_DISTRIBUTION_ID --paths "/*"\n'
        "\nFor local dev, an absolute VITE_API_URL must now include /api "
        "(http://localhost:8000/api), or proxy /api to port 8000 in vite.config."
    )


if __name__ == "__main__":
    main()