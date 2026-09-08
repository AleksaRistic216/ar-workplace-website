/**
 * The scripted session that plays in the hero.
 *
 * This is data, not markup: `TerminalDemo` walks the op list and mutates a small state machine, so
 * changing what the demo shows means editing this file only.
 *
 * Every keystroke used here is a real binding, doing what the demo says it does — keep it that
 * way. The list lives in `CrossPlatform.tsx`; if a shortcut is not in that table it must not appear
 * in the demo. Switching views is done by clicking the tab for exactly this reason: there is no
 * documented binding for it.
 *
 * This beat used to press Ctrl+Shift+F captioned "Split the pane". The binding existed, so the
 * table-membership rule passed — but Ctrl+Shift+F is Fullscreen Terminal, and the hero was showing
 * it doing something else. Ctrl+Shift+T is the one that opens a second pane (Settings → Terminal
 * decides pane vs. tab; pane is the default). Check the effect, not just the binding.
 */

export type Color = "fg" | "dim" | "green" | "blue" | "accent" | "cyan" | "magenta";

export type Span = {
  t: string;
  c?: Color;
  /** Draw the shell prompt in place of `t`. Set by the player when a typed line is committed. */
  prompt?: true;
};
export type Line = Span[];

/** A row in the AI Inventory pane. Scope drives the stripe and badge colour, as in the product. */
export type InventoryItem = {
  name: string;
  scope: "project" | "user" | "plugin";
  /** The dim text after the badge — "model: opus", "tools: Bash, Read". */
  meta?: string;
  desc?: string;
};

export type InventoryGroup = {
  /** Displayed with its first letter underlined: that letter is the group's shortcut. */
  label: string;
  items: InventoryItem[];
};

/*
 * What the demo's inventory pane lists. Shaped like a real scan of this repo — the product reads
 * `.claude/` in whatever directory the focused terminal is in, and tags each row by where it came
 * from: the repo (project), ~/.claude (user), or an enabled plugin.
 */
export const inventory: { repo: string; count: number; groups: InventoryGroup[] } = {
  repo: "cpt",
  count: 9,
  groups: [
    {
      label: "Skills",
      items: [
        { name: "commit", scope: "project", desc: "Create a git commit with a conventional subject." },
        { name: "worktree", scope: "project", desc: "Set up an isolated git worktree." },
        { name: "dataviz", scope: "user", desc: "Use before creating any chart or dashboard." },
      ],
    },
    {
      label: "Agents",
      items: [
        { name: "reviewer", scope: "project", meta: "model: opus", desc: "Reviews the diff for correctness bugs." },
        { name: "code-explorer", scope: "plugin", meta: "feature-dev", desc: "Maps unfamiliar code." },
      ],
    },
    {
      label: "Commands",
      items: [
        { name: "/release", scope: "project" },
        { name: "/git:sync", scope: "project" },
      ],
    },
    {
      label: "MCP Servers",
      items: [{ name: "figma", scope: "project", meta: "npx figma-mcp" }],
    },
  ],
};

export type Op =
  /** Back to the opening frame — one view, one pane, nothing running. */
  | { k: "reset" }
  /** Caption under the terminal. Doubles as the demo's accessible narration. */
  | { k: "caption"; text: string }
  | { k: "wait"; ms: number }
  /** Types into the focused pane's prompt, character by character. */
  | { k: "type"; text: string; cps?: number }
  /** Commits the typed line to scrollback, as the shell would. */
  | { k: "run" }
  /** Streams output lines into the focused pane. */
  | { k: "out"; lines: Line[]; stagger?: number }
  /** Floating keycaps, e.g. ["Ctrl", "Shift", "F"]. */
  | { k: "key"; keys: string[]; hold?: number }
  | { k: "split"; dir: "right" | "down" }
  /** Docks an AI Inventory pane into the active view, as Widgets → AI Inventory does. */
  | { k: "inventory" }
  | { k: "newview"; name: string }
  | { k: "switchview"; index: number }
  /**
   * The AI status badge. In the product this is an overlay in the top-right of the *pane*
   * running the tool (`TerminalWidget::renderAiOverlay`), not a status-bar item, and its label is
   * whatever title the CLI sets — falling back to "Claude active" / "Copilot active".
   */
  | { k: "ai"; tool: string | null };

const g = (t: string): Span => ({ t, c: "green" });
const d = (t: string): Span => ({ t, c: "dim" });
const a = (t: string): Span => ({ t, c: "accent" });

export const HOST = "you@laptop";
export const CWD = "~/src/cpt";

export const demo: Op[] = [
  // The component paints the *last* frame before the player starts, so that a visitor who has not
  // hydrated yet still sees a populated workspace rather than an empty terminal. This pause lets
  // that frame be read before the loop wipes it.
  { k: "wait", ms: 900 },
  { k: "reset" },
  { k: "caption", text: "One workspace, one pane. Your shell, unchanged." },
  { k: "wait", ms: 900 },

  { k: "type", text: "cargo build --release", cps: 21 },
  { k: "run" },
  {
    k: "out",
    stagger: 280,
    lines: [
      [g("   Compiling"), { t: " cpt-render v0.9.2" }],
      [g("   Compiling"), { t: " cpt-pty v0.9.2" }],
      [g("    Finished"), { t: " `release` profile [optimized] in 12.41s" }],
    ],
  },
  { k: "wait", ms: 650 },

  { k: "caption", text: "A second pane. The same keys on Linux and Windows." },
  { k: "key", keys: ["Ctrl", "Shift", "T"], hold: 950 },
  { k: "split", dir: "right" },
  { k: "wait", ms: 450 },

  { k: "type", text: "claude", cps: 13 },
  { k: "run" },
  {
    k: "out",
    stagger: 220,
    lines: [
      [a("✻"), { t: " Claude Code " }, d("v2.1.4")],
      [d("  /help for help · cwd: " + CWD)],
    ],
  },
  { k: "ai", tool: "Claude Code" },
  { k: "caption", text: "CPT notices the AI tool and badges the pane. Zero config." },
  { k: "wait", ms: 1200 },

  { k: "type", text: "port the win32 pty shim to the new trait", cps: 34 },
  { k: "run" },
  {
    k: "out",
    stagger: 340,
    lines: [
      [a("●"), d(" Read src/pty/win32.rs")],
      [a("●"), { t: " Updated src/pty/win32.rs " }, g("+38"), d(" · "), { t: "−12", c: "magenta" }],
      [a("●"), { t: " cargo check " }, g("passed")],
    ],
  },
  { k: "wait", ms: 900 },

  { k: "caption", text: "What AI tooling does this repo have? CPT already knows." },
  { k: "inventory" },
  { k: "wait", ms: 2600 },

  { k: "caption", text: "A second view, with a layout entirely its own." },
  { k: "key", keys: ["Alt", "T"], hold: 950 },
  { k: "newview", name: "Logs" },
  { k: "type", text: "journalctl -fu cpt", cps: 22 },
  { k: "run" },
  {
    k: "out",
    stagger: 300,
    lines: [
      [d("19:41:02 "), { t: "cpt[4412]: view \"Logs\" created" }],
      [d("19:41:02 "), { t: "cpt[4412]: pane attached pty /dev/pts/7" }],
      [d("19:41:03 "), { t: "cpt[4412]: gpu: " }, g("1 draw call"), { t: " · 3840×2160 @ 144hz" }],
    ],
  },
  { k: "wait", ms: 900 },

  { k: "caption", text: "Switch back — Main is exactly where you left it." },
  { k: "switchview", index: 0 },
  { k: "wait", ms: 2600 },
];
