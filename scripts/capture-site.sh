#!/usr/bin/env bash
# Screenshot the running site, so the hero demo can be compared against a capture of the real
# product (scripts/capture-product.sh).
#
# Why the reduced-motion preference is forced:
#
#   The demo's tabs and panes animate in from opacity 0 (`cpt-tab-in`, `cpt-pane-in`, both with
#   `animation-fill-mode: both`). A headless screenshot renders a single frame at animation time
#   zero, so every one of those elements captures as invisible — the chrome looks empty and the
#   page looks broken when it is not. Under `prefers-reduced-motion: reduce`, globals.css collapses
#   every animation to 0.01ms, so they land on their final frame immediately. That preference also
#   makes the demo render its still frame (the end of the script), which is the richest one and the
#   only deterministic one — the player is a timing loop, so without this you photograph whatever
#   step it happened to be on.
#
# Usage:
#   scripts/capture-site.sh                          # http://localhost:3000 -> .site-shots/home.png
#   scripts/capture-site.sh /download download.png
#
# Needs the dev server running (npm run dev) and firefox on PATH.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BASE_URL="${BASE_URL:-http://localhost:3000}"
OUT_DIR="${OUT_DIR:-$ROOT/.site-shots}"
WINDOW="${WINDOW:-1280,1500}"

PATH_PART="${1:-/}"
OUT_NAME="${2:-home.png}"

command -v firefox >/dev/null 2>&1 || { echo "error: firefox not on PATH" >&2; exit 1; }

if ! curl -sfo /dev/null "$BASE_URL"; then
    echo "error: nothing serving at $BASE_URL — start it with 'npm run dev'" >&2
    exit 1
fi

mkdir -p "$OUT_DIR"

# A dedicated profile: an already-running Firefox refuses a second instance otherwise, and this is
# where the reduced-motion preference is set.
PROFILE="$(mktemp -d)"
trap 'rm -rf "$PROFILE"' EXIT
echo 'user_pref("ui.prefersReducedMotion", 1);' > "$PROFILE/user.js"

echo "Capturing $BASE_URL$PATH_PART -> $OUT_DIR/$OUT_NAME"
firefox --headless --profile "$PROFILE" --no-remote \
        --window-size="$WINDOW" \
        --screenshot "$OUT_DIR/$OUT_NAME" \
        "$BASE_URL$PATH_PART" 2>&1 | grep -v "running in headless mode" || true

if [ ! -f "$OUT_DIR/$OUT_NAME" ]; then
    echo "error: no screenshot written" >&2
    exit 1
fi

echo "Wrote $OUT_DIR/$OUT_NAME"
echo "Zoom into a region with:"
echo "  python3 scripts/pngcrop.py $OUT_DIR/$OUT_NAME crop.png <x0> <y0> <x1> <y1> 2"
