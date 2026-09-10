#!/usr/bin/env bash
# Build short, social-sized clips out of real product captures.
#
# A terminal's selling points are motion: a layout redistributing, a theme switching, an agent
# badge changing state. A still frame undersells all three, and a screen recording made by hand is
# a different length and a different window size every time.
#
# So this composes clips from the *same* captures scripts/capture-product.sh produces — real frames
# from a real binary, usually the released one — rather than from a recording of someone's desktop.
# Each clip is a sequence of those frames with a crossfade, exported at the sizes the platforms
# actually want.
#
# ## What this cannot do
#
# CPT's screenshot mode writes single frames. Anything that needs *continuous* motion — a cursor
# moving, text streaming in, a spinner spinning — is not what this produces, and pretending
# otherwise would mean faking the product. Those need a real screen recording. What this is good
# for is before/after: two states of the same window, cut together.
#
# Usage:
#   scripts/capture-clips.sh                    # every clip below, from fresh captures
#   scripts/capture-clips.sh theme layout       # only these clips
#   scripts/capture-clips.sh --no-capture       # reuse whatever is already in .product-shots/
#   scripts/capture-clips.sh --dry-run          # print what it would run and exit
#   scripts/capture-clips.sh --list             # the clips this script knows how to build
#
# Environment:
#   OUT_DIR    where the captures live   (default: .product-shots/, gitignored)
#   CLIP_DIR   where the clips land      (default: .product-clips/, gitignored)
#   HOLD       seconds each frame is held (default: 2.2)
#   FADE       crossfade seconds          (default: 0.45)

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT_DIR="${OUT_DIR:-$ROOT/.product-shots}"
CLIP_DIR="${CLIP_DIR:-$ROOT/.product-clips}"
HOLD="${HOLD:-2.2}"
FADE="${FADE:-0.45}"

# clip name | caption | scenario frames, in order
#
# Keep each clip to two or three frames. These are read in a feed, at a glance, next to something
# louder; a four-beat story is a story nobody finishes.
CLIPS="
theme|The whole chrome, dark and light|two_terminals light_theme
layout|One view, many panes|two_terminals multiple_views
inventory|Every agent, skill and hook in the repo|two_terminals ai_inventory
tabs|Numbered view tabs, reachable by key|multiple_views numbered_view_tabs
"

# Output sizes. Square first: it is the one that survives every feed's crop.
SIZES="
square|1080:1080
wide|1920:1080
"

DRY_RUN=false
CAPTURE=true
WANTED=""

while [ $# -gt 0 ]; do
    case "$1" in
        --dry-run)    DRY_RUN=true ;;
        --no-capture) CAPTURE=false ;;
        --list)
            echo "Clips this script can build:"
            echo "$CLIPS" | while IFS='|' read -r name caption frames; do
                [ -n "$name" ] || continue
                printf '  %-10s %-46s (%s)\n' "$name" "$caption" "$frames"
            done
            exit 0
            ;;
        -*) echo "error: unknown flag $1" >&2; exit 1 ;;
        *)  WANTED="$WANTED $1" ;;
    esac
    shift
done

run() {
    if [ "$DRY_RUN" = true ]; then
        echo "  would run: $*"
    else
        "$@"
    fi
}

if [ "$DRY_RUN" = false ] && ! command -v ffmpeg >/dev/null 2>&1; then
    echo "error: ffmpeg is not on PATH, and this script is mostly ffmpeg." >&2
    echo "       winget install Gyan.FFmpeg   |   apt install ffmpeg   |   brew install ffmpeg" >&2
    echo "       Or run with --dry-run to see what it would do." >&2
    exit 1
fi

# ---------------------------------------------------------------------------
# Frames. Captured by the existing script so a clip can never show a build that
# no longer exists — see the header of scripts/capture-product.sh.
# ---------------------------------------------------------------------------

wanted_clip() {
    [ -z "$WANTED" ] && return 0
    case " $WANTED " in *" $1 "*) return 0 ;; *) return 1 ;; esac
}

needed_frames() {
    echo "$CLIPS" | while IFS='|' read -r name caption frames; do
        [ -n "$name" ] || continue
        wanted_clip "$name" || continue
        for f in $frames; do echo "$f"; done
    done | sort -u | tr '\n' ' '
}

FRAMES="$(needed_frames)"
[ -n "$(echo "$FRAMES" | tr -d ' ')" ] || { echo "error: no clips selected (try --list)" >&2; exit 1; }

if [ "$CAPTURE" = true ]; then
    echo "Capturing frames: $FRAMES"
    # shellcheck disable=SC2086
    run bash "$ROOT/scripts/capture-product.sh" $FRAMES
else
    echo "Reusing captures in $OUT_DIR"
fi

mkdir -p "$CLIP_DIR"

# ---------------------------------------------------------------------------
# Compose.
#
# Each frame is padded onto the target canvas rather than cropped: a terminal cropped to a square
# loses the pane layout, which is the thing being shown. The pad colour is the site's --color-background
# so the clip sits on the same ground as the page it links to.
# ---------------------------------------------------------------------------

BG="0x0c0c0f"
built=0
missing=""

echo
echo "$CLIPS" | while IFS='|' read -r name caption frames; do
    [ -n "$name" ] || continue
    wanted_clip "$name" || continue

    have=true
    for f in $frames; do
        [ -f "$OUT_DIR/$f.png" ] || { have=false; missing="$missing $f"; }
    done
    if [ "$have" = false ] && [ "$DRY_RUN" = false ]; then
        echo "==> $name: skipped, missing frames:$missing" >&2
        continue
    fi

    echo "$SIZES" | while IFS='|' read -r size_name dims; do
        [ -n "$size_name" ] || continue
        out="$CLIP_DIR/${name}-${size_name}.mp4"
        echo "==> $out  ($caption)"

        # One input per frame, each looped for HOLD seconds, then crossfaded in sequence.
        inputs=""
        filter=""
        idx=0
        prev=""
        for f in $frames; do
            inputs="$inputs -loop 1 -t $HOLD -i $OUT_DIR/$f.png"
            filter="$filter[$idx:v]scale=${dims}:force_original_aspect_ratio=decrease,"
            filter="${filter}pad=${dims}:(ow-iw)/2:(oh-ih)/2:color=$BG,setsar=1,fps=30[v$idx];"
            if [ -n "$prev" ]; then
                offset=$(awk "BEGIN{print $HOLD*$idx - $FADE*$idx}")
                filter="$filter[$prev][v$idx]xfade=transition=fade:duration=$FADE:offset=$offset[x$idx];"
                prev="x$idx"
            else
                prev="v$idx"
            fi
            idx=$((idx + 1))
        done
        filter="${filter%;}"

        # shellcheck disable=SC2086
        run ffmpeg -y -hide_banner -loglevel error $inputs \
            -filter_complex "$filter" -map "[$prev]" \
            -c:v libx264 -pix_fmt yuv420p -movflags +faststart "$out"

        built=$((built + 1))
    done
done

echo
if [ "$DRY_RUN" = true ]; then
    echo "Dry run. Nothing was written."
    exit 0
fi

echo "Clips in $CLIP_DIR:"
ls -1 "$CLIP_DIR"/*.mp4 2>/dev/null | sed 's/^/  /' || echo "  (none)"
echo
echo "Now WATCH them. A clip nobody looked at is a clip that ships with the wrong frame on screen."
