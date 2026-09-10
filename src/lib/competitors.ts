/**
 * The comparison pages' source of truth: one entry per terminal CPT gets compared against.
 *
 * ## The rule for this file
 *
 * Every claim about somebody else's product is checked against *their* documentation before it
 * is written here, and `sources` records where it was checked. These pages are read by people who
 * already use the competitor — a wrong claim about WezTerm on our own domain is the thing that
 * gets screenshotted, and it costs more than the page earns.
 *
 * `verifiedOn` is the date the facts below were last read off those sources. Re-run
 * `scripts/vs-refresh.mjs` when it goes stale; it diffs the live docs against this file and
 * reports what moved rather than editing anything itself.
 *
 * `wins` is not a courtesy. Each entry names where the competitor genuinely beats CPT, in its own
 * terms. A page that only flatters CPT converts worse than one a skeptic can trust, and half of
 * these terminals are free and excellent.
 */

export type Competitor = {
  slug: string;
  name: string;
  url: string;
  /** Neutral one-liner, close to how the project describes itself. */
  what: string;
  platforms: string;
  /** Windows story specifically — the axis CPT is built around. */
  windows: string;
  licence: string;
  price: string;
  rendering: string;
  config: string;
  /** Do shells survive the app closing, and what does it take? */
  persistence: string;
  /** What it knows about a coding agent running inside it. */
  agents: string;
  /** Where this one is the better choice. Written to be true, not to be gracious. */
  wins: string[];
  /** Where CPT is the better choice. */
  cptWins: string[];
  /** Two sentences: who should pick which. Shown as the page's conclusion. */
  verdict: string;
  sources: { label: string; url: string }[];
  /** ISO date the facts above were last verified against `sources`. */
  verifiedOn: string;
};

/** CPT's own column in every table, so the product's facts are written down once. */
export const CPT_ROW = {
  name: "Cross Platform Terminal",
  platforms: "Linux, Windows (macOS in progress)",
  windows: "Native, identical to the Linux build",
  licence: "Proprietary",
  price: "€7.49/month or €67.41/year, no free tier",
  rendering: "GPU, whole grid in one draw call",
  config: "In-app settings, per-profile",
  persistence: "Opt-in detachable sessions, no multiplexer needed",
  agents: "Detects 8 agent CLIs and reports five states per pane",
};

export const COMPETITORS: Competitor[] = [
  {
    slug: "wezterm",
    name: "WezTerm",
    url: "https://wezterm.org",
    what: "A GPU-accelerated cross-platform terminal emulator and multiplexer written in Rust.",
    platforms: "Linux, macOS, Windows 10, FreeBSD, NetBSD",
    windows: "Native, and a first-class target",
    licence: "MIT, open source",
    price: "Free",
    rendering: "GPU-accelerated, with WebGPU front-end options",
    config: "Lua, with a large scripting API",
    persistence:
      "Built-in multiplexer over unix domain sockets, SSH or TLS — panes survive the window, and reach remote hosts",
    agents: "None specifically — a pane is a pane",
    wins: [
      "Free, open source and mature, with an unusually deep Lua config surface.",
      "Runs on macOS, FreeBSD and NetBSD today. CPT does not.",
      "Its multiplexer reaches remote hosts over SSH and TLS. CPT's detachable sessions are local to the machine and profile.",
    ],
    cptWins: [
      "Agent awareness: CPT names the agent in a pane and distinguishes idle, working, waiting-for-input, finished and failed. WezTerm shows you a running process.",
      "A dockable workspace — edge rails, pinned panes, per-view layouts — rather than terminal panes alone.",
      "Persistence with nothing to configure: one settings toggle, no multiplexer concepts, no Lua.",
    ],
    verdict:
      "WezTerm is the stronger choice if you want free software, macOS or BSD, or a config you script in Lua. CPT is the stronger choice if you live in AI CLIs and want the terminal to understand them, or want a workspace rather than an emulator.",
    sources: [
      { label: "Features", url: "https://wezterm.org/features.html" },
      { label: "Repository", url: "https://github.com/wezterm/wezterm" },
      { label: "LICENSE.md", url: "https://github.com/wezterm/wezterm/blob/main/LICENSE.md" },
    ],
    verifiedOn: "2026-09-10",
  },
  {
    slug: "alacritty",
    name: "Alacritty",
    url: "https://alacritty.org",
    what: "A fast, minimal, OpenGL terminal emulator that deliberately leaves features to other tools.",
    platforms: "Linux, BSD, macOS, Windows",
    windows: "Native",
    licence: "Apache-2.0 and MIT, open source",
    price: "Free",
    rendering: "OpenGL, requiring OpenGL ES 2.0 or better",
    config: "A single TOML file",
    persistence: "None built in — by design, that is tmux's job",
    agents: "None",
    wins: [
      "Free, and the lightest thing here. It starts fast and stays out of the way.",
      "The minimalism is a stated principle, not a gap: the FAQ says you will not find tabs or splits, because those are “best left to a window manager or terminal multiplexer”.",
      "If you already run tmux and a tiling WM, most of what CPT adds is duplicated by tools you have.",
    ],
    cptWins: [
      "Tabs, splits, dockable panels and per-view layouts, without assembling them from three other programs.",
      "Sessions that survive closing the app without tmux in the loop.",
      "Agent detection and per-pane status. Alacritty is deliberately not in this business.",
    ],
    verdict:
      "Alacritty plus tmux plus a tiling window manager is a genuinely good setup, and it is free. CPT is for people who would rather that stack were one application that behaves the same on a Windows laptop and a Linux box.",
    sources: [
      { label: "Repository and FAQ", url: "https://github.com/alacritty/alacritty" },
    ],
    verifiedOn: "2026-09-10",
  },
  {
    slug: "kitty",
    name: "kitty",
    url: "https://sw.kovidgoyal.net/kitty/",
    what: "A GPU-based terminal emulator built around OpenGL, with its own graphics protocol and a scripting layer called kittens.",
    platforms: "Linux and macOS (Unix-like systems)",
    windows: "Not supported",
    licence: "GPL-3.0, open source",
    price: "Free",
    rendering: "OpenGL, with no large UI toolkit underneath",
    config: "A single human-editable kitty.conf",
    persistence: "Session files and remote control, including across a network",
    agents: "None",
    wins: [
      "Free, fast, and years ahead on terminal graphics — its image protocol is the one other tools implement.",
      "Kittens give it a real extension story: image viewing, diffing, unicode input, and anything you write yourself.",
      "Seven built-in layouts and deep shell integration for zsh, fish and bash.",
    ],
    cptWins: [
      "It runs on Windows. kitty does not, and that is the whole reason CPT exists.",
      "Detachable sessions that reattach with scrollback intact, from a settings toggle.",
      "Agent detection, per-pane status and the AI Inventory panel.",
    ],
    verdict:
      "On Linux or macOS alone, kitty is excellent and free, and the graphics protocol is a real advantage. CPT is the answer only if part of your week is spent on Windows and you want that half to behave identically.",
    sources: [
      { label: "Overview", url: "https://sw.kovidgoyal.net/kitty/overview/" },
      { label: "LICENSE", url: "https://github.com/kovidgoyal/kitty/blob/master/LICENSE" },
    ],
    verifiedOn: "2026-09-10",
  },
  {
    slug: "ghostty",
    name: "Ghostty",
    url: "https://ghostty.org",
    what: "A fast, feature-rich terminal that uses genuinely native UI on each platform — AppKit and SwiftUI on macOS, GTK4 on Linux.",
    platforms: "macOS 13+ and Linux",
    windows: "Not supported — the download page lists no Windows build",
    licence: "MIT, open source",
    price: "Free",
    rendering: "GPU-accelerated, over a shared Zig core (libghostty)",
    config: "A text config file",
    persistence: "None built in",
    agents: "None",
    wins: [
      "Free, and the best native feel on macOS of anything here — real AppKit and SwiftUI, Quick Look, force touch.",
      "On Linux it is GTK4, so it matches the desktop instead of drawing its own approximation of it.",
      "It is on macOS today, which CPT is not.",
    ],
    cptWins: [
      "Windows. Ghostty publishes macOS and Linux builds only.",
      "Identical chrome across platforms is the point of CPT; Ghostty's stated goal is the opposite — to be native to each one, and so to differ between them.",
      "Detachable sessions, dockable panels, and agent-aware panes.",
    ],
    verdict:
      "If your machines are macOS and Linux and you want each to feel like itself, Ghostty is the better fit and costs nothing. If you need Windows in the set, or want the three to feel like one machine, that is the trade CPT makes.",
    sources: [
      { label: "About", url: "https://ghostty.org/docs/about" },
      { label: "Download", url: "https://ghostty.org/download" },
      { label: "LICENSE", url: "https://github.com/ghostty-org/ghostty/blob/main/LICENSE" },
    ],
    verifiedOn: "2026-09-10",
  },
  {
    slug: "windows-terminal",
    name: "Windows Terminal",
    url: "https://github.com/microsoft/terminal",
    what: "Microsoft's tabbed terminal host for Windows, connecting to command-line apps through ConPTY.",
    platforms: "Windows 10 build 19041+ and Windows 11",
    windows: "Native — it ships with the OS",
    licence: "MIT, open source",
    price: "Free",
    rendering: "DirectWrite-based text layout and rendering, 24-bit colour",
    config: "A JSON settings file",
    persistence: "None built in",
    agents: "None",
    wins: [
      "Free, already installed, and the best possible WSL and PowerShell integration — it is Microsoft's own console host.",
      "Tabs, panes, themes and profiles, maintained by the platform vendor.",
      "If Windows is your only machine, there is very little reason to pay for anything.",
    ],
    cptWins: [
      "It only runs on Windows. Your Linux box gets something else, with different shortcuts and a different layout — which is the specific problem CPT is built to remove.",
      "Detachable sessions, dockable panels, edge rails and pinned panes.",
      "Agent detection with real per-pane states.",
    ],
    verdict:
      "Windows-only developers should use Windows Terminal; it is free and it is very good. CPT earns its price the moment you have a Linux machine as well and are tired of maintaining two different muscle memories.",
    sources: [{ label: "Repository", url: "https://github.com/microsoft/terminal" }],
    verifiedOn: "2026-09-10",
  },
  {
    slug: "warp",
    name: "Warp",
    url: "https://www.warp.dev",
    what: "An AI-first terminal with its own agent, cloud features and team collaboration layer.",
    platforms: "macOS 10.14+, Linux, Windows 10 and 11 (x64 and ARM64)",
    windows: "Native",
    licence: "Proprietary",
    price:
      "Free tier; Build $20/month; Max $200/month; Business $50/user/month; Enterprise on request",
    rendering: "GPU-accelerated",
    config: "In-app settings, with cloud-synced Warp Drive",
    persistence: "Not a detach/reattach model",
    agents: "Its own — Warp Agent, plus cloud agents on paid tiers",
    wins: [
      "The far larger AI feature surface: its own agent, cloud agents, Warp Drive, team collaboration.",
      "There is a free tier, and it runs on macOS today.",
      "Blocks, the command palette and the editing model are genuinely better than a plain terminal for a lot of people.",
    ],
    cptWins: [
      "CPT does not want to be your agent. It surfaces the agents you already run — Claude Code, Copilot, Codex, Gemini, Aider, Cursor, opencode, Amp — and tells you what each one is doing. Warp is best when you use Warp's agent.",
      "Price: €7.49/month against $20/month for Warp's first paid tier.",
      "A dockable workspace with edge rails, pinned panes and per-view layouts, plus detachable local sessions.",
    ],
    verdict:
      "Warp is the closer competitor here, and if you want the terminal itself to be the AI product, Warp is further down that road with a free tier. CPT bets the other way: bring your own agent CLI, and the terminal's job is to show you its state and stay out of the way.",
    sources: [{ label: "Pricing", url: "https://www.warp.dev/pricing" }],
    verifiedOn: "2026-09-10",
  },
  {
    slug: "tabby",
    name: "Tabby",
    url: "https://tabby.sh",
    what: "A highly configurable Electron terminal with integrated SSH, serial and Telnet clients.",
    platforms: "Windows, macOS, Linux",
    windows: "Native",
    licence: "MIT, open source",
    price: "Free",
    rendering: "Electron; the project makes no GPU rendering claim",
    config: "In-app settings, profiles and a plugin manager",
    persistence: "Saved connections rather than detachable local shells",
    agents: "None",
    wins: [
      "Free, on all three desktop platforms, with the best connection manager here — SSH with jump hosts, port forwarding and agent forwarding, plus serial and Telnet.",
      "A real plugin and theme ecosystem, installable from inside the app.",
      "Nested split panes, tabs on any edge, and a Quake-style dropdown.",
    ],
    cptWins: [
      "Rendering: CPT draws the whole grid in one GPU call. Tabby is an Electron app and does not claim GPU text rendering.",
      "Detachable sessions that keep a long-running command alive after the app closes.",
      "Agent detection and per-pane status.",
    ],
    verdict:
      "If most of your day is SSH into managed boxes and serial consoles, Tabby does that better and costs nothing. CPT is aimed at the local workstation: fast rendering, persistent shells, and agents you can see the state of.",
    sources: [{ label: "Repository", url: "https://github.com/Eugeny/tabby" }],
    verifiedOn: "2026-09-10",
  },
  {
    slug: "hyper",
    name: "Hyper",
    url: "https://hyper.is",
    what: "An Electron terminal built on web standards, designed around a JavaScript plugin system.",
    platforms: "macOS, Windows, Linux",
    windows: "Native",
    licence: "MIT, open source",
    price: "Free",
    rendering: "Electron and web technologies",
    config: "A JavaScript config file, extended by plugins",
    persistence: "None built in",
    agents: "None",
    wins: [
      "Free, on all three platforms, and the plugin model is plain JavaScript — if you write web code, you can extend your terminal in an afternoon.",
      "A large catalogue of community themes and plugins.",
    ],
    cptWins: [
      "Rendering performance: a single GPU draw call for the grid against a DOM-based renderer.",
      "Detachable sessions, dockable panels, pinned panes and per-view layouts.",
      "Active release cadence — CPT ships accepted fixes usually the same day, listed with dates at /changelog. Hyper's latest tagged release is v3.4.1, from January 2023.",
    ],
    verdict:
      "Hyper is worth it for the plugin story if you want to script your terminal in JavaScript, and it is free. If you want speed, persistence and a maintained release cadence, that is the case for CPT.",
    sources: [
      { label: "Repository", url: "https://github.com/vercel/hyper" },
      { label: "Latest release", url: "https://github.com/vercel/hyper/releases/latest" },
    ],
    verifiedOn: "2026-09-10",
  },
];

export function competitorBySlug(slug: string): Competitor | undefined {
  return COMPETITORS.find((c) => c.slug === slug);
}

/** The rows every comparison table renders, paired with the accessor for the competitor's cell. */
export const COMPARISON_ROWS: { label: string; cpt: string; of: (c: Competitor) => string }[] = [
  { label: "Platforms", cpt: CPT_ROW.platforms, of: (c) => c.platforms },
  { label: "Windows", cpt: CPT_ROW.windows, of: (c) => c.windows },
  { label: "Licence", cpt: CPT_ROW.licence, of: (c) => c.licence },
  { label: "Price", cpt: CPT_ROW.price, of: (c) => c.price },
  { label: "Rendering", cpt: CPT_ROW.rendering, of: (c) => c.rendering },
  { label: "Configuration", cpt: CPT_ROW.config, of: (c) => c.config },
  { label: "Session persistence", cpt: CPT_ROW.persistence, of: (c) => c.persistence },
  { label: "Agent awareness", cpt: CPT_ROW.agents, of: (c) => c.agents },
];
