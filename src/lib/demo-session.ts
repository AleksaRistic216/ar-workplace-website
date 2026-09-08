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
 * What the inventory pane lists, per repository.
 *
 * Keyed by repo because the widget follows the focused terminal's working directory (walked up to
 * the nearest `.git`), so focusing a terminal in another checkout retargets it — see
 * `docs/widgets/ai-inventory.md` in the CPT repo. `dataviz` is deliberately in both: user-scope
 * entries live in `~/.claude` and therefore apply in every repository, which is the whole point of
 * the scope badges.
 */
export type Inventory = { repo: string; count: number; groups: InventoryGroup[] };

export const inventories: Record<string, Inventory> = {
  cpt: {
    repo: "cpt",
    count: 8,
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
  },
  "notes-api": {
    repo: "notes-api",
    count: 5,
    groups: [
      {
        label: "Skills",
        items: [
          { name: "deploy", scope: "project", desc: "Ship the service to staging." },
          { name: "dataviz", scope: "user", desc: "Use before creating any chart or dashboard." },
        ],
      },
      {
        label: "Commands",
        items: [
          { name: "/migrate", scope: "project" },
          { name: "/seed", scope: "project" },
        ],
      },
      {
        label: "Instructions",
        items: [{ name: "CLAUDE.md", scope: "project", desc: "Notes API — conventions and test layout." }],
      },
    ],
  },
};

/*
 * The Widgets menu, verbatim from `TitleBar.cpp`. Opening it is the *only* way to add an AI
 * Inventory widget — there is no shortcut and no command for it — so the demo has to show that,
 * rather than having the panel appear on its own after something is typed at a prompt.
 */
export const WIDGETS_MENU = ["Terminal", "AI Inventory"];

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
  /** Opens (or closes) a title-bar menu, optionally with one item highlighted. */
  | { k: "menu"; open: string | null; highlight?: string }
  /** Sets the focused pane's working directory. The repo name is its last path segment. */
  | { k: "cwd"; path: string }
  /**
   * Moves focus to a pane. If that changes which repository the inventory tracks, it starts the
   * scan indicator — the widget follows the focused terminal.
   */
  | { k: "focus"; index: number }
  /** Ends the scan: the pending repository's results replace the ones still on screen. */
  | { k: "scanned" }
  /**
   * Moves the simulated cursor onto the element tagged `data-ptr={at}`, or hides it with null.
   * Positions are measured from the DOM rather than hard-coded, so this survives the frame being
   * a different size at every breakpoint. `click` flashes a ripple; the player clears it.
   */
  | { k: "pointer"; at: string | null; click?: boolean }
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

/*
 * A demo is a `seed` applied instantly, then a `script` that animates and loops.
 *
 * The split exists because the demo used to be one ~25s reel that built its state up from an empty
 * shell: to see the AI inventory you had to sit through a cargo build, a pane split and a Claude
 * session first. Nobody watches a landing page for 25 seconds. Each clip now *opens* on a
 * workspace already mid-task and then does one thing, so its point lands in a couple of seconds,
 * and the visitor picks which one to watch.
 *
 * Everything a seed does goes through `applyInstant`, the same path the reduced-motion still frame
 * uses, so a seed can never drift from what the player would have produced by animating it.
 */
export type Demo = {
  id: string;
  /** Chip label. Keep it short — these sit in a row above the frame. */
  label: string;
  /** One line under the chips, describing what this clip shows. */
  blurb: string;
  seed: Op[];
  script: Op[];
};

/** The build that has "already happened" when a clip opens on a working terminal. */
const buildDone: Op[] = [
  { k: "type", text: "cargo build --release" },
  { k: "run" },
  {
    k: "out",
    lines: [
      [g("   Compiling"), { t: " cpt-render v0.9.2" }],
      [g("   Compiling"), { t: " cpt-pty v0.9.2" }],
      [g("    Finished"), { t: " `release` profile [optimized] in 12.41s" }],
    ],
  },
];

/** A plain second pane, for clips that need two terminals but are not about the AI badge. */
const secondTerminal: Op[] = [
  { k: "split", dir: "right" },
  { k: "type", text: "cargo test -p cpt-pty" },
  { k: "run" },
  {
    k: "out",
    lines: [
      [{ t: "running 24 tests" }],
      [g("test result: ok"), { t: ". 24 passed; 0 failed" }],
    ],
  },
];



export const demos: Demo[] = [
  {
    id: "panes",
    label: "Panes",
    blurb: "One window, as many terminals as the work needs.",
    seed: [{ k: "reset" }, ...buildDone],
    script: [
      { k: "caption", text: "A second pane — the same keys on Linux and Windows." },
      { k: "key", keys: ["Ctrl", "Shift", "T"], hold: 900 },
      { k: "split", dir: "right" },
      { k: "wait", ms: 400 },
      { k: "type", text: "journalctl -fu cpt", cps: 24 },
      { k: "run" },
      {
        k: "out",
        stagger: 260,
        lines: [
          [d("19:41:02 "), { t: 'cpt[4412]: pane attached pty /dev/pts/7' }],
          [d("19:41:03 "), { t: "cpt[4412]: gpu: " }, g("1 draw call"), { t: " · 3840×2160 @ 144hz" }],
        ],
      },
      { k: "caption", text: "Focus, move and resize any pane from the keyboard." },
      { k: "key", keys: ["Ctrl", "Alt", "Home"], hold: 1100 },
      { k: "wait", ms: 2200 },
    ],
  },
  {
    id: "ai",
    label: "AI tooling",
    blurb: "CPT spots the agent in the pane, and knows what the repo gives it.",
    /*
     * Two panes in two different checkouts, both seeded. The second pane's repository is the one
     * the inventory opens on; focusing the first retargets it, which is the clip's second beat.
     */
    seed: [
      { k: "reset" },
      { k: "cwd", path: "~/src/notes-api" },
      { k: "type", text: "npm test -- --run" },
      { k: "run" },
      {
        k: "out",
        lines: [
          [{ t: " ✓ " }, d("routes/notes.test.ts "), g("(14)")],
          [{ t: " ✓ " }, d("lib/store.test.ts "), g("(9)")],
          [g(" Test Files  2 passed"), d(" (2)")],
        ],
      },
      { k: "split", dir: "right" },
      { k: "cwd", path: "~/src/cpt" },
      { k: "type", text: "claude" },
      { k: "run" },
      {
        k: "out",
        lines: [
          [a("✻"), { t: " Claude Code " }, d("v2.1.4")],
          [d("  /help for help · cwd: ~/src/cpt")],
        ],
      },
      { k: "ai", tool: "Claude Code" },
      { k: "type", text: "port the win32 pty shim to the new trait" },
      { k: "run" },
      {
        k: "out",
        lines: [
          [a("●"), d(" Read src/pty/win32.rs")],
          [a("●"), { t: " Updated src/pty/win32.rs " }, g("+38"), d(" · "), { t: "−12", c: "magenta" }],
          [a("●"), { t: " cargo check " }, g("passed")],
        ],
      },
    ],
    script: [
      { k: "caption", text: "Claude Code is running here — CPT badges the pane. Zero config." },
      { k: "wait", ms: 1200 },
      { k: "caption", text: "What tooling does this repo give it? Widgets → AI Inventory." },
      // The cursor appears over the pane it is leaving, so the move to the menu is a glide rather
      // than a jump — a pointer that materialises on its target explains nothing.
      { k: "pointer", at: "pane-1" },
      { k: "wait", ms: 450 },
      { k: "pointer", at: "menu-widgets" },
      { k: "wait", ms: 650 },
      { k: "pointer", at: "menu-widgets", click: true },
      { k: "menu", open: "Widgets" },
      { k: "wait", ms: 550 },
      { k: "pointer", at: "menu-ai-inventory" },
      { k: "menu", open: "Widgets", highlight: "AI Inventory" },
      { k: "wait", ms: 650 },
      { k: "pointer", at: "menu-ai-inventory", click: true },
      { k: "menu", open: null },
      { k: "inventory" },
      { k: "pointer", at: null },
      { k: "caption", text: "Every skill, agent, command and MCP server this repo has." },
      { k: "wait", ms: 2400 },
      { k: "caption", text: "Focus the other terminal — the inventory follows it." },
      { k: "key", keys: ["Ctrl", "Alt", "Home"], hold: 900 },
      { k: "focus", index: 0 },
      // The product holds the scan indicator for kMinIndicatorMs (450ms) precisely so that
      // retargeting is visible rather than flashing past; leave it up a little longer than that.
      { k: "wait", ms: 800 },
      { k: "scanned" },
      { k: "caption", text: "Another checkout, another set of tooling." },
      { k: "wait", ms: 3000 },
    ],
  },
  {
    id: "views",
    label: "Views",
    blurb: "Separate workspaces, each with a layout of its own.",
    /*
     * Seeds with the second view already there, so the tab bar reads `Main | Logs` the moment the
     * clip is picked. It used to seed identically to the AI clip, which meant switching between
     * the two changed nothing on screen and read as a dead button.
     */
    seed: [
      { k: "reset" },
      ...buildDone,
      ...secondTerminal,
      { k: "newview", name: "Logs" },
      { k: "type", text: "journalctl -fu cpt" },
      { k: "run" },
      {
        k: "out",
        lines: [
          [d("19:41:02 "), { t: 'cpt[4412]: view "Logs" created' }],
          [d("19:41:03 "), { t: "cpt[4412]: gpu: " }, g("1 draw call"), { t: " · 3840×2160 @ 144hz" }],
        ],
      },
      { k: "switchview", index: 0 },
    ],
    script: [
      { k: "caption", text: "Each view is its own workspace — Alt+End steps to the next." },
      { k: "wait", ms: 900 },
      { k: "key", keys: ["Alt", "End"], hold: 900 },
      { k: "switchview", index: 1 },
      { k: "caption", text: "A layout entirely its own, still running." },
      { k: "wait", ms: 2000 },
      { k: "key", keys: ["Alt", "Home"], hold: 900 },
      { k: "switchview", index: 0 },
      { k: "caption", text: "Switch back — Main is exactly where you left it." },
      { k: "wait", ms: 2400 },
    ],
  },
];

