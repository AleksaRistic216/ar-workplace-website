#!/usr/bin/env bash
# Capture real screenshots of CPT, so a claim on this site can be checked against the product
# instead of against a memory of the product.
#
# ## You do not need to build CPT
#
# The app screenshots itself: `cpt --profile <p> --screenshot out.bmp` renders a frame through SDL
# and writes it, with no X11, no ImageMagick and no window manager involved. So any `cpt` binary
# works — including the one attached to a GitHub release.
#
# That makes the *released build* the best thing to shoot: it is literally what a buyer downloads,
# it needs no compiler, and it cannot be a stale local build of the wrong commit. It is the
# default here. Screenshot mode does not ask for a licence.
#
# The scenarios are not defined in this repo. They are the CPT repo's own screenshot tests
# (tests/screenshot/tests/*.sh), maintained alongside the features they capture — a new widget
# arrives with a scenario for it. In --release mode they are extracted from the CPT checkout at
# the matching tag, so the scripts and the binary always agree.
#
# Usage:
#   scripts/capture-product.sh                        # latest release, the default scenario set
#   scripts/capture-product.sh --release v0.5.6       # a specific tag
#   scripts/capture-product.sh two_terminals light_theme
#   scripts/capture-product.sh --local                # a locally built binary instead
#   scripts/capture-product.sh --local --build        # build it first
#   scripts/capture-product.sh --list                 # every scenario the CPT repo defines
#
# Environment:
#   CPT_DIR   CPT checkout, needed for the scenario scripts
#             (default: ~/source/cross-platform-terminal-dev)
#   OUT_DIR   where PNGs land (default: .product-shots/, gitignored)

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CPT_DIR="${CPT_DIR:-$HOME/source/cross-platform-terminal-dev}"
OUT_DIR="${OUT_DIR:-$ROOT/.product-shots}"
RELEASE_REPO="AleksaRistic216/ar-workspace-release"

# Scenes that carry a claim the site makes. Keep this list short: each one is a capture to look at.
DEFAULT_SCENARIOS="two_terminals multiple_views ai_inventory numbered_view_tabs light_theme"

MODE="release"
TAG=""
BUILD=false
SCENARIOS=""

while [ $# -gt 0 ]; do
    case "$1" in
        --release) MODE="release"; [ $# -gt 1 ] && case "$2" in v*) TAG="$2"; shift ;; esac ;;
        --local)   MODE="local" ;;
        --build)   BUILD=true; MODE="local" ;;
        --list)    MODE="list" ;;
        -*) echo "error: unknown flag $1" >&2; exit 1 ;;
        *)  SCENARIOS="$SCENARIOS $1" ;;
    esac
    shift
done

if [ ! -d "$CPT_DIR/.git" ]; then
    echo "error: no CPT checkout at $CPT_DIR" >&2
    echo "       the scenario scripts live there, so one is needed even in --release mode." >&2
    echo "       git clone git@github.com:AleksaRistic216/cross-platform-terminal-dev.git $CPT_DIR" >&2
    echo "       or set CPT_DIR to an existing one." >&2
    exit 1
fi

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

# ---------------------------------------------------------------------------
# Scenario scripts, and the binary to run them against.
# ---------------------------------------------------------------------------

if [ "$MODE" = "release" ]; then
    git -C "$CPT_DIR" fetch --tags --quiet 2>/dev/null || true
    if [ -z "$TAG" ]; then
        TAG="$(gh release view --repo "$RELEASE_REPO" --json tagName -q .tagName)"
    fi
    echo "Release:  $TAG (from $RELEASE_REPO)"

    # Scenario scripts pinned to the same tag as the binary. A working tree that has moved on
    # would otherwise drive an older build with newer scripts.
    if git -C "$CPT_DIR" rev-parse "$TAG" >/dev/null 2>&1; then
        git -C "$CPT_DIR" archive "$TAG" tests/screenshot | tar -x -C "$WORK"
        echo "  scripts: $CPT_DIR at $TAG"
    else
        echo "  warning: $TAG is not a tag in $CPT_DIR — using its working tree scripts" >&2
        cp -r "$CPT_DIR/tests" "$WORK/"
    fi

    case "$(uname -s)" in
        MINGW*|MSYS*|CYGWIN*) PATTERN="*windows*.zip" ;;
        Darwin)               PATTERN="*macos*" ;;
        *)                    PATTERN="*linux*x86_64.tar.gz" ;;
    esac

    echo "  asset:   $PATTERN"
    ( cd "$WORK" && gh release download "$TAG" --repo "$RELEASE_REPO" -p "$PATTERN" --dir dl )
    mkdir -p "$WORK/app"
    case "$(ls "$WORK/dl")" in
        *.zip)    unzip -q "$WORK"/dl/*.zip    -d "$WORK/app" ;;
        *.tar.gz) tar -xzf "$WORK"/dl/*.tar.gz -C "$WORK/app" ;;
    esac
    APP="$(find "$WORK/app" -maxdepth 3 -name 'cpt' -o -maxdepth 3 -name 'cpt.exe' | head -1)"
    [ -n "$APP" ] || { echo "error: no cpt binary inside the release asset" >&2; exit 1; }
    chmod +x "$APP" 2>/dev/null || true
else
    cp -r "$CPT_DIR/tests" "$WORK/"
    APP="$CPT_DIR/build/cpt"
    [ -x "$APP" ] || APP="$CPT_DIR/build/cpt.exe"
    echo "Local checkout: $CPT_DIR"
    echo "  commit:  $(git -C "$CPT_DIR" log -1 --format='%h %s' 2>/dev/null || echo unknown)"
    echo "  tag:     $(git -C "$CPT_DIR" describe --tags --abbrev=0 2>/dev/null || echo none)"

    if [ "$BUILD" = true ] || [ ! -x "$APP" ]; then
        echo "Building CPT (Release)..."
        sh "$CPT_DIR/scripts/build.sh" Release >/dev/null
        APP="$CPT_DIR/build/cpt"; [ -x "$APP" ] || APP="$CPT_DIR/build/cpt.exe"
    fi
    [ -x "$APP" ] || { echo "error: no binary at $CPT_DIR/build/cpt" >&2; exit 1; }

    if [ -n "$(git -C "$CPT_DIR" status --porcelain 2>/dev/null)" ]; then
        echo "  note:    working tree is dirty; the capture may not match any released build"
    fi
fi

TESTS_DIR="$WORK/tests/screenshot/tests"

if [ "$MODE" = "list" ]; then
    cp -r "$CPT_DIR/tests" "$WORK/" 2>/dev/null || true
    echo "Scenarios defined by the CPT repo:"
    for f in "$TESTS_DIR"/*.sh; do
        name="$(basename "$f" .sh)"
        printf '  %-28s %s\n' "$name" "$(sed -n '2s/^# //p' "$f")"
    done
    exit 0
fi

echo "  binary:  $APP"
[ -n "$SCENARIOS" ] || SCENARIOS="$DEFAULT_SCENARIOS"

# ---------------------------------------------------------------------------
# BMP -> PNG. The scenarios call ImageMagick's `convert`, which is not needed for anything else
# here, so a shim stands in. Prefer bmp2png.py; fall back to .NET System.Drawing on Windows,
# because a machine can easily have no real Python (a Microsoft Store stub answers `python3`
# and then fails).
# ---------------------------------------------------------------------------

SHIM_DIR="$WORK/shim"
mkdir -p "$SHIM_DIR"

if python3 -c 'import sys' >/dev/null 2>&1; then
    cat > "$SHIM_DIR/convert" <<SHIM
#!/usr/bin/env bash
exec python3 "$ROOT/scripts/bmp2png.py" "\$1" "\$2"
SHIM
elif command -v powershell.exe >/dev/null 2>&1; then
    echo "  note:    no python3; converting BMPs with .NET System.Drawing"
    cat > "$SHIM_DIR/convert" <<'SHIM'
#!/usr/bin/env bash
in_win=$(cygpath -w "$1"); out_win=$(cygpath -w "$2")
powershell.exe -NoProfile -NonInteractive -Command \
  "Add-Type -AssemblyName System.Drawing; \$i=[System.Drawing.Image]::FromFile('$in_win'); \$i.Save('$out_win',[System.Drawing.Imaging.ImageFormat]::Png); \$i.Dispose()" >/dev/null
SHIM
else
    echo "error: need python3 or powershell.exe to convert the BMPs the app writes" >&2
    exit 1
fi
chmod +x "$SHIM_DIR/convert"
# lib.sh prefers 'magick' when present; keep it off PATH so the shim is what gets used.
export PATH="$SHIM_DIR:$PATH"

mkdir -p "$OUT_DIR"
echo

failed=""
for name in $SCENARIOS; do
    script="$TESTS_DIR/$name.sh"
    if [ ! -f "$script" ]; then
        echo "==> $name: no such scenario (try --list)" >&2
        failed="$failed $name"
        continue
    fi
    echo "==> $name"
    if bash "$script" "$APP" "$OUT_DIR/$name.png" >"$WORK/$name.log" 2>&1; then
        :
    else
        code=$?
        if [ "$code" -eq 77 ]; then
            echo "    skipped by the scenario"
        else
            echo "    FAILED (exit $code) — see $WORK/$name.log" >&2
            tail -5 "$WORK/$name.log" | sed 's/^/    /' >&2
            failed="$failed $name"
        fi
    fi
done

echo
echo "Captures in $OUT_DIR:"
ls -1 "$OUT_DIR"/*.png 2>/dev/null | sed 's/^/  /' || echo "  (none)"
echo
echo "Now OPEN them. A capture nobody looked at verifies nothing."

if [ -n "$failed" ]; then
    echo "Failed:$failed" >&2
    exit 1
fi
