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

/**
 * The Settings menu, verbatim from `TitleBar.cpp` including where the separators fall. `null` is
 * a separator.
 */
export const SETTINGS_MENU: (string | null)[] = [
  "Global Shortcuts",
  "Widgets",
  "Terminal Sessions",
  null,
  "Report a Bug",
  "Copy Diagnostics",
  null,
  "License",
  "About",
  "Uninstall...",
];

export const MENUS: Record<string, (string | null)[]> = {
  Widgets: WIDGETS_MENU,
  Settings: SETTINGS_MENU,
};

/**
 * A row of the Terminal Sessions dialog.
 *
 * Columns, states and button labels are taken from a capture of `SessionsWindow::render` in the
 * shipped build: Session / Shell / Directory / Age / State, then `Open` and `End`. `state` is one
 * of the four the product can print — `open here`, `detached`, `elsewhere`, `exited` — and `Open`
 * is disabled for a session already on screen, because attaching twice would give two panes
 * fighting over one grid size.
 */
export type SessionRow = {
  id: number;
  shell: string;
  dir: string;
  age: string;
  state: "open here" | "detached" | "elsewhere" | "exited";
};

/**
 * The Detached clip builds its own session rather than opening on one, so the list starts empty
 * and the row appears when the clip closes a pane and keeps its shell.
 */
export const SESSION_ROWS: SessionRow[] = [];

/** The row that closing a pane with "Keep running" leaves behind. */
export const DETACHED_ROW: SessionRow = {
  id: 1,
  shell: "bash",
  dir: "~/src/cpt",
  age: "1m",
  state: "detached",
};

/** The Settings → Widgets checkboxes the demo draws, in the order `SettingsWindow.cpp` lists them. */
export const SETTINGS_CHECKS = [
  { label: "New terminal as separate widget", on: true },
  { label: "Shell integration", on: true },
];

/** The dialog's own footer line, verbatim. */
export const SESSIONS_FOOTER =
  'Sessions keep running when the app closes. "Open" shows one in a new terminal; "End" stops its shell.';

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
   * whatever title the CLI sets — falling back to "<Name> active".
   */
  | { k: "ai"; tool: string | null; state?: AgentState }
  /**
   * Moves the running agent to another state. Targets the pane that has the badge, not the
   * focused one — the product tracks this per widget.
   */
  | { k: "agent"; state: AgentState }
  /**
   * An edge rail (#119). `widget` puts a widget on the rail; `open` expands or collapses its
   * dock. A rail with no widget takes no space, exactly as in the product.
   */
  | { k: "rail"; side: RailSide; widget?: string; open: boolean }
  /**
   * Picks a widget up by its tab in the view, which is how one gets onto a rail in the first
   * place (`WidgetTabBar.cpp:204` is the drag source, and it hands the rails the same payload a
   * rail button does). While a drag is in flight *every* rail shows its strip, including the
   * empty ones — otherwise there would be nowhere to drop.
   */
  | { k: "drag"; pane: number; label: string }
  /** Hovers a rail. The product paints the whole strip in accent while a drag is over it. */
  | { k: "dragover"; side: RailSide | null }
  /** Opens or closes the Terminal Sessions modal. */
  | { k: "dialog"; open: boolean }
  /** Opens or closes the Settings → Widgets window. */
  | { k: "settings"; open: boolean }
  /** Ticks "Keep shells running when the app closes". */
  | { k: "persist"; on: boolean }
  /**
   * Raises the "still running" question for a pane. The product only asks for a **daemon-backed**
   * session with something in the foreground (`runningSessionWork` passes `m_sessionId != 0`),
   * which is why this can only happen after persistent sessions are on.
   */
  | { k: "closeask"; pane: number; process: string }
  /** Answers that question, as its three buttons do. */
  | { k: "closeanswer"; answer: "keep" | "end" | "cancel" }
  /**
   * Reattaches a detached session, as the dialog's `Open` button does: a new terminal appears in
   * the view and the row's state changes to "open here".
   */
  | { k: "attach"; session: number }
  /** Drops on the hovered rail: the widget leaves the view and its dock opens. */
  | { k: "drop" };

/**
 * What a pane running an agent is doing (#129). The product distinguishes five; the two the demo
 * needs are the ones the badge rewords and recolours itself for.
 *
 * `TerminalWidget::renderAiOverlay` is the authority for both the wording and the colour, and the
 * colour says the *state*, not which vendor's CLI it is — a mistake this demo used to make.
 */
export type AgentState = "working" | "awaiting" | "finished" | "error";

/**
 * The product's three rails. The demo only ever *docks* onto the left, but all three are drawn
 * while a drag is in flight, so all three need naming.
 */
export type RailSide = "left" | "right" | "bottom";

/** Badge label and background, straight from `renderAiOverlay`. */
export const AGENT_BADGE: Record<AgentState, { suffix: string; bg: string }> = {
  // Idle/Working show the CLI's own status line, so the demo shows the tool's name alone.
  working: { suffix: "", bg: "rgba(45,100,180,0.85)" },
  awaiting: { suffix: " needs you", bg: "rgba(190,140,30,0.92)" },
  finished: { suffix: " finished", bg: "rgba(50,130,75,0.92)" },
  error: { suffix: " failed", bg: "rgba(170,55,50,0.92)" },
};

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

/**
 * The scrollback a reattached session comes back with. The point of the clip is that this did not
 * restart — it kept going while the app was shut, so it opens mid-run rather than at a prompt.
 */
export const ATTACHED_LINES: Line[] = [
  [{ t: " ✓ " }, d("routes/notes.test.ts "), g("(14)")],
  [d("  watching for changes...")],
  [{ t: " ✓ " }, d("re-ran 14 tests "), g("0 failed")],
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
      { k: "wait", ms: 2200 },
      /*
       * The badge earns its place here. Up to this point it has only said "Claude Code", which a
       * tab title would also do. The state is the part worth having: the agent stops to ask
       * something, and the pane you are not looking at goes amber and says so.
       */
      { k: "caption", text: "It stopped to ask you something — the badge says so from anywhere." },
      { k: "agent", state: "awaiting" },
      { k: "wait", ms: 3200 },
    ],
  },
  {
    id: "docks",
    label: "Docks",
    blurb: "Rails on the edges, for the tools that should always be within reach.",
    /*
     * Opens on a plain two-pane view with no rails at all — the frame every visitor already
     * recognises, and distinct from the other clips because the second pane is the inventory
     * rather than a terminal.
     *
     * The rails are deliberately *not* seeded. A widget sitting on a rail when the clip opens
     * would be a result with no cause, which is the mistake this demo has made before: the point
     * of the clip is that you put it there yourself, by dragging its tab out of the view.
     */
    seed: [{ k: "reset" }, ...buildDone, { k: "inventory" }],
    script: [
      { k: "caption", text: "This panel does not need a whole pane of its own." },
      { k: "wait", ms: 900 },
      { k: "pointer", at: "panetab-1" },
      { k: "wait", ms: 700 },
      { k: "drag", pane: 1, label: "AI Inventory" },
      { k: "caption", text: "Pick a widget up by its tab and every edge offers itself." },
      { k: "wait", ms: 1100 },
      { k: "pointer", at: "rail-left" },
      { k: "dragover", side: "left" },
      { k: "wait", ms: 1000 },
      { k: "pointer", at: "rail-left", click: true },
      { k: "drop" },
      { k: "pointer", at: null },
      { k: "caption", text: "Dropped on the left rail — same widget, still scanning, out of the way." },
      { k: "wait", ms: 2600 },
      { k: "caption", text: "Collapse it, and the view gets the space back." },
      { k: "pointer", at: "rail-left" },
      { k: "wait", ms: 600 },
      { k: "pointer", at: "rail-left", click: true },
      { k: "rail", side: "left", open: false },
      { k: "pointer", at: null },
      { k: "wait", ms: 1800 },
      { k: "caption", text: "And back by number, from anywhere — Ctrl+Shift+Alt+1." },
      { k: "key", keys: ["Ctrl", "Shift", "Alt", "1"], hold: 1100 },
      { k: "rail", side: "left", open: true },
      { k: "wait", ms: 2600 },
    ],
  },
  {
    id: "detached",
    label: "Detached",
    blurb: "Close the app; the shells keep running and you pick them back up.",
    /*
     * Opens on a single terminal, which is the frame a visitor reads as "I just reopened the
     * app". The point of the clip is what is *not* on screen: a second shell that has been
     * running for hours with nothing attached to it.
     */
    seed: [{ k: "reset" }, ...buildDone],
    script: [
      // 1. Turn it on. It is off by default, so the clip has to show that first or the rest of
      //    the flow would not happen at all.
      { k: "caption", text: "Shells die with the window — until you turn that off." },
      { k: "pointer", at: "menu-settings" },
      { k: "wait", ms: 550 },
      { k: "pointer", at: "menu-settings", click: true },
      { k: "menu", open: "Settings" },
      { k: "wait", ms: 450 },
      { k: "pointer", at: "menu-widgets-item" },
      { k: "menu", open: "Settings", highlight: "Widgets" },
      { k: "wait", ms: 500 },
      { k: "pointer", at: "menu-widgets-item", click: true },
      { k: "menu", open: null },
      { k: "settings", open: true },
      { k: "pointer", at: null },
      { k: "caption", text: "Settings → Widgets → Keep shells running when the app closes." },
      { k: "wait", ms: 900 },
      { k: "pointer", at: "chk-persist" },
      { k: "wait", ms: 600 },
      { k: "pointer", at: "chk-persist", click: true },
      { k: "persist", on: true },
      { k: "wait", ms: 800 },
      { k: "pointer", at: "settings-close" },
      { k: "wait", ms: 450 },
      { k: "pointer", at: "settings-close", click: true },
      { k: "settings", open: false },
      { k: "pointer", at: null },

      // 2. It applies to new terminals only, so the next one is the daemon-backed one.
      { k: "caption", text: "It applies to new terminals, so open one and give it something to do." },
      { k: "key", keys: ["Ctrl", "Shift", "T"], hold: 800 },
      { k: "split", dir: "right" },
      { k: "wait", ms: 300 },
      { k: "type", text: "npm test -- --watch", cps: 26 },
      { k: "run" },
      {
        k: "out",
        stagger: 220,
        lines: [
          [{ t: " ✓ " }, d("routes/notes.test.ts "), g("(14)")],
          [d("  watching for changes...")],
        ],
      },

      // 3. Closing that pane is now a question rather than a kill.
      { k: "caption", text: "Now closing that pane asks, because there is something worth keeping." },
      { k: "pointer", at: "paneclose-1" },
      { k: "wait", ms: 700 },
      { k: "pointer", at: "paneclose-1", click: true },
      { k: "closeask", pane: 1, process: "node" },
      { k: "pointer", at: null },
      { k: "wait", ms: 2400 },
      { k: "pointer", at: "close-keep" },
      { k: "wait", ms: 700 },
      { k: "pointer", at: "close-keep", click: true },
      { k: "closeanswer", answer: "keep" },
      { k: "pointer", at: null },
      { k: "caption", text: "The pane is gone. The shell is not." },
      { k: "wait", ms: 2000 },

      // 4. And there it is, detached, ready to be picked back up.
      { k: "caption", text: "Settings → Terminal Sessions still holds it." },
      { k: "pointer", at: "menu-settings" },
      { k: "wait", ms: 500 },
      { k: "pointer", at: "menu-settings", click: true },
      { k: "menu", open: "Settings" },
      { k: "wait", ms: 450 },
      { k: "pointer", at: "menu-terminal-sessions" },
      { k: "menu", open: "Settings", highlight: "Terminal Sessions" },
      { k: "wait", ms: 550 },
      { k: "pointer", at: "menu-terminal-sessions", click: true },
      { k: "menu", open: null },
      { k: "dialog", open: true },
      { k: "pointer", at: null },
      { k: "wait", ms: 1800 },
      { k: "caption", text: "Open it and the watcher comes back, still counting." },
      { k: "pointer", at: "sess-open-1" },
      { k: "wait", ms: 650 },
      { k: "pointer", at: "sess-open-1", click: true },
      { k: "attach", session: 1 },
      { k: "wait", ms: 1200 },
      { k: "pointer", at: "dialog-close" },
      { k: "wait", ms: 550 },
      { k: "pointer", at: "dialog-close", click: true },
      { k: "dialog", open: false },
      { k: "pointer", at: null },
      { k: "wait", ms: 2400 },
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

