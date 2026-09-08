#!/usr/bin/env bash
# Capture real screenshots of CPT, so a claim on this site can be checked against the product
# instead of against a memory of the product.
#
# The scenarios are not defined here. They are the CPT repo's own screenshot tests
# (tests/screenshot/tests/*.sh), which are maintained alongside the features they capture — a new
# widget arrives with a scenario for it. This script only supplies the binary, an output
# directory, and a BMP-to-PNG converter, then runs them unmodified.
#
# The converter is the reason for the shim below: those scripts call ImageMagick, which is not
# needed for anything else here. `scripts/bmp2png.py` does the one conversion they want, so a
# `convert` shim on PATH lets them run on a machine without ImageMagick installed.
#
# Usage:
#   scripts/capture-product.sh                 # the default set, listed in DEFAULT_SCENARIOS
#   scripts/capture-product.sh two_terminals ai_inventory
#   scripts/capture-product.sh --list          # every scenario the CPT repo defines
#   scripts/capture-product.sh --build         # rebuild CPT first
#
# Environment:
#   CPT_DIR   CPT checkout (default: ~/source/cross-platform-terminal)
#   OUT_DIR   where PNGs land (default: .product-shots/, gitignored)

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CPT_DIR="${CPT_DIR:-$HOME/source/cross-platform-terminal}"
OUT_DIR="${OUT_DIR:-$ROOT/.product-shots}"
APP="$CPT_DIR/build/cpt"
TESTS_DIR="$CPT_DIR/tests/screenshot/tests"

# Scenes that carry a claim the site makes. Keep this list short: each one is a capture to look at.
DEFAULT_SCENARIOS="two_terminals multiple_views ai_inventory numbered_view_tabs"

BUILD=false
SCENARIOS=""

for arg in "$@"; do
    case "$arg" in
        --list)
            if [ ! -d "$TESTS_DIR" ]; then
                echo "error: no CPT checkout at $CPT_DIR (set CPT_DIR)" >&2
                exit 1
            fi
            echo "Scenarios defined by the CPT repo:"
            for f in "$TESTS_DIR"/*.sh; do
                name="$(basename "$f" .sh)"
                desc="$(sed -n '2s/^# //p' "$f")"
                printf '  %-28s %s\n' "$name" "$desc"
            done
            exit 0
            ;;
        --build) BUILD=true ;;
        -*) echo "error: unknown flag $arg" >&2; exit 1 ;;
        *) SCENARIOS="$SCENARIOS $arg" ;;
    esac
done

[ -n "$SCENARIOS" ] || SCENARIOS="$DEFAULT_SCENARIOS"

if [ ! -d "$CPT_DIR/.git" ]; then
    echo "error: no CPT checkout at $CPT_DIR" >&2
    echo "       git clone git@github.com:AleksaRistic216/cross-platform-terminal-dev.git $CPT_DIR" >&2
    echo "       or set CPT_DIR to an existing one." >&2
    exit 1
fi

# A capture is only evidence if it is of the current product. Say what is being shot.
echo "CPT checkout: $CPT_DIR"
echo "  commit:     $(git -C "$CPT_DIR" log -1 --format='%h %s' 2>/dev/null || echo unknown)"
echo "  tag:        $(git -C "$CPT_DIR" describe --tags --abbrev=0 2>/dev/null || echo none)"

if [ "$BUILD" = true ] || [ ! -x "$APP" ]; then
    echo "Building CPT (Release)..."
    sh "$CPT_DIR/scripts/build.sh" Release >/dev/null
fi

if [ ! -x "$APP" ]; then
    echo "error: no binary at $APP" >&2
    exit 1
fi

# Warn rather than fail: a stale binary still captures, it just captures the wrong thing.
if [ -n "$(git -C "$CPT_DIR" status --porcelain 2>/dev/null)" ]; then
    echo "  note:       working tree is dirty; the capture may not match any released build"
fi
newest_src="$(find "$CPT_DIR/src" -name '*.cpp' -o -name '*.h' -newer "$APP" 2>/dev/null | head -1)"
if [ -n "$newest_src" ]; then
    echo "  warning:    $APP is older than $CPT_DIR/src — re-run with --build" >&2
fi

# ImageMagick shim. See the header comment.
SHIM_DIR="$(mktemp -d)"
trap 'rm -rf "$SHIM_DIR"' EXIT
cat > "$SHIM_DIR/convert" <<SHIM
#!/usr/bin/env bash
exec python3 "$ROOT/scripts/bmp2png.py" "\$1" "\$2"
SHIM
chmod +x "$SHIM_DIR/convert"
# lib.sh prefers 'magick' when present; keep it off PATH so the shim is what gets used.
export PATH="$SHIM_DIR:$PATH"

mkdir -p "$OUT_DIR"

failed=""
for name in $SCENARIOS; do
    script="$TESTS_DIR/$name.sh"
    if [ ! -f "$script" ]; then
        echo "==> $name: no such scenario (try --list)" >&2
        failed="$failed $name"
        continue
    fi
    echo "==> $name"
    if bash "$script" "$APP" "$OUT_DIR/$name.png" 2>&1 | sed 's/^/    /'; then
        :
    else
        code=$?
        if [ "$code" -eq 77 ]; then
            echo "    skipped by the scenario"
        else
            echo "    FAILED (exit $code)" >&2
            failed="$failed $name"
        fi
    fi
done

echo
echo "Captures in $OUT_DIR:"
ls -1 "$OUT_DIR"/*.png 2>/dev/null | sed 's/^/  /' || echo "  (none)"

if [ -n "$failed" ]; then
    echo "Failed:$failed" >&2
    exit 1
fi
