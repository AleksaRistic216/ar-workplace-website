/**
 * The intent pages: one per thing a developer actually types into a search box.
 *
 * These are not adverts with a question mark on top. Each one answers the question properly,
 * including with tools that are not CPT, and only then says where CPT fits. A page that sends
 * someone away with their problem solved is still worth writing — it ranks, it earns links, and
 * the one reader in twenty who wanted exactly what CPT does arrives already trusting the page.
 *
 * Content is data rather than JSX so the set stays uniform and so `scripts/vs-refresh.mjs` and the
 * sitemap can enumerate it. Inline links use a `[label](href)` form, rendered by GuideBody.
 */

export type Block =
  | { kind: "p"; text: string }
  | { kind: "h2"; text: string }
  | { kind: "list"; items: string[] }
  | { kind: "steps"; items: string[] }
  | { kind: "code"; lines: string[] }
  | { kind: "note"; text: string };

export type Guide = {
  slug: string;
  /** The <h1>. Phrased as the reader would phrase it. */
  title: string;
  /** <title> — kept close to the search phrasing without being a keyword smear. */
  metaTitle: string;
  description: string;
  /** One-line summary for the index page. */
  summary: string;
  blocks: Block[];
  related: string[];
};

export const GUIDES: Guide[] = [
  {
    slug: "same-terminal-setup-on-windows-and-linux",
    title: "Getting the same terminal setup on Windows and Linux",
    metaTitle: "The same terminal setup on Windows and Linux",
    description:
      "Synced dotfiles, WSL, a cross-platform emulator, or one app built for both — four ways to make Windows and Linux behave the same, and what each costs.",
    summary:
      "Dotfiles, WSL, a portable emulator, or one app for both — with the trade-off each one actually makes.",
    blocks: [
      {
        kind: "p",
        text: "If you work on a Windows laptop and a Linux machine, the problem is rarely the shell. It is that everything around the shell differs: the copy-paste keys, where the tabs are, whether Ctrl+W closes a pane or deletes a word, how the font renders, and which config file you are supposed to edit this time. Four approaches actually work. They are not equally good, and which one wins depends on how much of your week is spent on each machine.",
      },
      { kind: "h2", text: "1. Sync dotfiles and accept two front ends" },
      {
        kind: "p",
        text: "The cheapest option: keep your shell config in a git repository, symlink it into place on both machines, and let each OS use whatever terminal it likes. A [chezmoi](https://www.chezmoi.io/) or bare-repo setup gets you there in an afternoon.",
      },
      {
        kind: "p",
        text: "This fixes the shell and nothing else. Your prompt, aliases and functions follow you; your window chrome and keybindings do not. If you mostly live inside Neovim or tmux, that may be enough, because the part you touch is already inside the terminal rather than around it.",
      },
      { kind: "h2", text: "2. Use WSL and make Windows pretend to be Linux" },
      {
        kind: "p",
        text: "WSL2 gives you a real Linux userspace on Windows, and Windows Terminal integrates with it properly. Run the same shell, the same tools and the same dotfiles on both machines, and the difference mostly disappears.",
      },
      {
        kind: "p",
        text: "The catch is everything that crosses the boundary. Filesystem performance across /mnt/c is poor enough to be noticeable in a large repository, native Windows toolchains are awkward to reach from inside WSL, and anything that wants a GUI, a USB device or a specific driver becomes a research project. WSL is excellent when your work is entirely inside Linux and Windows is just the hardware you were issued.",
      },
      { kind: "h2", text: "3. Run one cross-platform emulator on both" },
      {
        kind: "p",
        text: "Several terminals build for both platforms, so you can carry one config across. [WezTerm](/vs/wezterm) is the strongest of these: Lua config, a built-in multiplexer, and native builds for Linux, macOS, Windows and the BSDs. [Alacritty](/vs/alacritty) does the same job with a single TOML file if you want less. Both are free and open source.",
      },
      {
        kind: "p",
        text: "This is the right answer for a lot of people, and it costs nothing. What you are signing up for is assembling the workspace yourself — the emulator gives you a fast grid, and tabs, splits, persistence and layout come from tmux, a window manager, and a config file you maintain.",
      },
      { kind: "h2", text: "4. One application, shipped identically for both" },
      {
        kind: "p",
        text: "The last option is a workspace that is the same program on both platforms rather than the same config on two programs. That is what Cross Platform Terminal is: the same shortcuts, the same dockable layout, the same settings screens, from one build per OS.",
      },
      {
        kind: "list",
        items: [
          "Extract and run. No installer on Windows, an AppImage or tarball on Linux.",
          "Dockable panels, edge rails and pinned panes, so the layout is part of the app rather than something you rebuild in tmux on each machine.",
          "Per-view layouts: each view keeps its own arrangement, and the arrangement is the same on both machines.",
          "Quirks that differ between platforms — escape sequences, input edge cases, rendering glitches — are handled inside the app rather than by you.",
        ],
      },
      {
        kind: "note",
        text: "CPT is a paid subscription with no free tier, and macOS is still in progress. If either of those is a blocker, options 1 to 3 are genuinely good and free — start there.",
      },
      { kind: "h2", text: "Which to pick" },
      {
        kind: "list",
        items: [
          "Mostly one OS, occasionally the other: sync dotfiles and stop there.",
          "Windows hardware, Linux work: WSL2 plus Windows Terminal.",
          "Both machines daily, happy to assemble the stack: WezTerm or Alacritty plus tmux.",
          "Both machines daily, want it to already be assembled: that is the gap CPT is built for.",
        ],
      },
    ],
    related: [
      "keep-a-terminal-session-alive-after-closing-the-app",
      "tmux-alternatives-on-windows",
    ],
  },
  {
    slug: "keep-a-terminal-session-alive-after-closing-the-app",
    title: "How to keep a terminal session alive after closing the terminal",
    metaTitle: "Keep a terminal session running after closing the window",
    description:
      "Why a long-running command dies when you close the terminal, and the four fixes: nohup, screen, tmux, or a terminal that detaches sessions itself.",
    summary:
      "SIGHUP, and the four standard ways around it — from nohup to a terminal that detaches by itself.",
    blocks: [
      {
        kind: "p",
        text: "Close a terminal window and the build running inside it dies. That is not a bug: the kernel sends SIGHUP to the foreground process group when the controlling terminal goes away, and most programs take the hint and exit. Everything below is a way of making sure the process is not attached to a terminal that can disappear.",
      },
      { kind: "h2", text: "nohup and disown — for one command, right now" },
      {
        kind: "code",
        lines: [
          "# start it detached from the hangup signal",
          "nohup ./long-build.sh > build.log 2>&1 &",
          "",
          "# or rescue something already running: Ctrl+Z, then",
          "bg",
          "disown -h %1",
        ],
      },
      {
        kind: "p",
        text: "This is the smallest possible fix and it works everywhere. What you lose is the session: you cannot get back to an interactive prompt, you are reading a log file instead of watching output, and anything that wants a TTY — a prompt, a progress bar, an editor — will misbehave.",
      },
      { kind: "h2", text: "screen — the old reliable" },
      {
        kind: "code",
        lines: [
          "screen -S build      # start a named session",
          "# Ctrl+A then d       detach",
          "screen -ls           # list sessions",
          "screen -r build      # reattach",
        ],
      },
      {
        kind: "p",
        text: "GNU screen keeps a real PTY alive in the background, so you get your interactive session back exactly as you left it. It is installed almost everywhere and it has been doing this since the 1980s.",
      },
      { kind: "h2", text: "tmux — what most people use" },
      {
        kind: "code",
        lines: [
          "tmux new -s build    # start a named session",
          "# Ctrl+B then d       detach",
          "tmux ls              # list sessions",
          "tmux attach -t build # reattach",
        ],
      },
      {
        kind: "p",
        text: "tmux does the same thing with a better split and window model, a scriptable config, and a large plugin ecosystem. If you are on Linux or macOS and you do this regularly, tmux is the answer, and it is free.",
      },
      {
        kind: "p",
        text: "The costs are real, though: a second keybinding layer on top of the one your terminal already has, a prefix key to press before everything, a config file to maintain, and a set of concepts — sessions, windows, panes — that sit beside the tabs and panes your terminal already draws. On Windows it is [awkward at best](/guides/tmux-alternatives-on-windows).",
      },
      { kind: "h2", text: "A terminal that detaches on its own" },
      {
        kind: "p",
        text: "The fourth option is for the terminal to run its shells outside the UI process in the first place, so closing the window is not an event the shell can notice. Cross Platform Terminal does this behind one setting — Settings, then Terminal, then “Keep shells running when the app closes”.",
      },
      {
        kind: "p",
        text: "With it on, shells run in a background daemon rather than inside the app. Close CPT with a build running, reopen it, and the session is there with its scrollback and the build still going. There is no prefix key and no second set of keybindings, because it is the same panes and tabs you were already using.",
      },
      {
        kind: "code",
        lines: [
          "cpt session ls       # sessions on this machine and profile",
          "cpt session attach   # reattach one",
          "cpt session kill     # end one",
        ],
      },
      {
        kind: "list",
        items: [
          "Closing a single terminal still ends that shell — only closing the app detaches. That distinction is deliberate: closing a pane should mean what it says.",
          "Sessions are local to the machine and to the profile. This is not a replacement for tmux over SSH, which is a different problem.",
          "They are listed in Settings under Terminal Sessions as well as from the CLI above.",
        ],
      },
      { kind: "h2", text: "Which to pick" },
      {
        kind: "list",
        items: [
          "One command, one time: nohup.",
          "Over SSH, on a server: tmux or screen. Nothing local can help you there.",
          "Every day, on your own machine, on Linux or macOS: tmux is free and very good.",
          "Every day, on your own machine, and you would rather not run a multiplexer at all: that is what CPT's detachable sessions are for.",
        ],
      },
    ],
    related: ["tmux-alternatives-on-windows", "same-terminal-setup-on-windows-and-linux"],
  },
  {
    slug: "tmux-alternatives-on-windows",
    title: "tmux alternatives on Windows",
    metaTitle: "tmux alternatives on Windows",
    description:
      "tmux has no native Windows build. What works instead: WSL, MSYS2, Windows Terminal panes, Zellij, or a terminal with session persistence built in.",
    summary:
      "What actually works when you want tmux on Windows and there is no native tmux to install.",
    blocks: [
      {
        kind: "p",
        text: "There is no native Windows build of tmux, and there is not going to be one. tmux is built on POSIX PTYs and Unix domain sockets; Windows has ConPTY, which is a different thing with different semantics. Everything below is either Linux-in-a-box or a different tool.",
      },
      { kind: "h2", text: "Run it inside WSL" },
      {
        kind: "p",
        text: "The most faithful answer. Install WSL2, install tmux inside it, and you have real tmux with your real config. It multiplexes the Linux processes inside that distribution.",
      },
      {
        kind: "p",
        text: "It does not multiplex Windows processes. Your PowerShell sessions, your MSVC builds and your native Windows tooling live outside the box tmux is running in, so if your work is genuinely on Windows rather than merely on Windows hardware, this solves the wrong half of the problem.",
      },
      { kind: "h2", text: "tmux under Git Bash or MSYS2" },
      {
        kind: "p",
        text: "MSYS2 packages tmux and it does run. Expect friction: it works with the MSYS2 PTY layer rather than ConPTY, native Windows console programs behave oddly inside it, and clipboard integration and mouse handling need coaxing. Fine for a POSIX-shaped workflow that already lives in MSYS2; frustrating as a general-purpose multiplexer.",
      },
      { kind: "h2", text: "Windows Terminal panes" },
      {
        kind: "p",
        text: "[Windows Terminal](/vs/windows-terminal) has tabs and split panes, free and built in, and they work with PowerShell, cmd and WSL alike. If what you wanted from tmux was splits, you already have them.",
      },
      {
        kind: "p",
        text: "What it does not have is persistence. Close the window and the shells go with it — there is no detach and reattach, which for many people is the entire reason they ran tmux.",
      },
      { kind: "h2", text: "Zellij" },
      {
        kind: "p",
        text: "[Zellij](https://zellij.dev/) is a modern multiplexer with a friendlier default UX than tmux. Same architectural problem, though: it is a Unix multiplexer, so on Windows it runs inside WSL and multiplexes what is in there.",
      },
      { kind: "h2", text: "A terminal with persistence built in" },
      {
        kind: "p",
        text: "The other way out is a terminal that keeps its shells outside the UI process, so there is no multiplexer to install. Cross Platform Terminal does this natively on Windows: turn on “Keep shells running when the app closes”, and shells move to a background daemon. Close the app mid-build, reopen it, and the session reattaches with scrollback and the build still running.",
      },
      {
        kind: "list",
        items: [
          "It is the app's own tabs and panes, so there is no prefix key and no second keybinding layer.",
          "It persists native Windows shells, not only WSL ones.",
          "The same build and the same shortcuts work on Linux, which is usually why the question came up in the first place.",
          "It is local only — for a session on a remote host, you still want tmux on that host.",
        ],
      },
      { kind: "h2", text: "Which to pick" },
      {
        kind: "list",
        items: [
          "Your work is Linux, Windows is just the laptop: WSL2 plus tmux. Free, faithful, done.",
          "You only wanted splits: Windows Terminal already does that, free.",
          "You wanted persistence for native Windows shells: no multiplexer will give you that, which is the gap CPT fills.",
          "You are on a remote host: tmux on the host. Nothing local applies.",
        ],
      },
    ],
    related: [
      "keep-a-terminal-session-alive-after-closing-the-app",
      "same-terminal-setup-on-windows-and-linux",
    ],
  },
  {
    slug: "see-what-your-coding-agent-is-doing-in-the-terminal",
    title: "Seeing what your coding agent is actually doing",
    metaTitle: "See your coding agent's status in the terminal",
    description:
      "Several agents in several panes and no idea which is blocked on a question. Why terminals cannot tell, the workarounds, and what per-pane status fixes.",
    summary:
      "Four agents in four panes and no idea which one is blocked on a question. What to do about it.",
    blocks: [
      {
        kind: "p",
        text: "The workflow that arrived with coding agents is several of them at once: one refactoring, one writing tests, one reading a codebase you have never seen. The failure mode arrives with it. Four panes are open, three are thinking, one has been waiting twenty minutes for you to answer a yes/no question, and there is no way to tell which without clicking through them.",
      },
      {
        kind: "p",
        text: "A terminal cannot help you by default, because it does not know what is in the pane. It has a PTY with bytes coming out of it. Whether those bytes are a compiler, a REPL or an agent waiting on approval is not something it models.",
      },
      { kind: "h2", text: "What people do about it now" },
      {
        kind: "list",
        items: [
          "Notification hooks. Claude Code and most agent CLIs can run a command on events, so you can fire a desktop notification when one stops. This works, and it is the best free option — it needs configuring per agent, per machine, and it tells you something finished without telling you which pane.",
          "Terminal bell plus a visual flash. Coarse: everything rings the same bell.",
          "A tmux status line hack that greps the pane's output. Fragile, and it breaks whenever the agent's output format changes.",
          "Clicking through the panes. What almost everyone actually does.",
        ],
      },
      { kind: "h2", text: "Why detection is harder than it looks" },
      {
        kind: "p",
        text: "The obvious approach — look at the process name in the pane — fails immediately in practice. Agents are launched through wrappers: npx, uv, a node shim, a virtualenv's bin directory. The process you find is node, or python, and the interesting name is somewhere up or down the tree, or in argv.",
      },
      {
        kind: "p",
        text: "Then there is state. “Busy” is not one bit. An agent that is working, an agent that is waiting for you to approve a tool call, and an agent that failed are three completely different things to a person glancing at a screen, and only one of them wants their attention right now.",
      },
      { kind: "h2", text: "What per-pane agent status looks like" },
      {
        kind: "p",
        text: "Cross Platform Terminal reads the process tree and argv, so an agent is found even behind npx, uv, node or a virtualenv shim. A pane running one gets a badge naming the tool and echoing its status line.",
      },
      {
        kind: "list",
          items: [
          "Recognised: Claude Code, GitHub Copilot, Codex CLI, Gemini CLI, Aider, Cursor Agent, opencode and Amp.",
          "Five states rather than one busy bit: idle, working, waiting for input, finished, failed.",
          "Tabs spin while any foreground command runs — not only agents — with a short debounce so quick commands do not flash them.",
          "Shift+Enter inserts a newline instead of submitting, which is the small thing that stops being small after the fiftieth prompt.",
          "An AI Inventory panel lists the skills, agents, commands, hooks, MCP servers and instruction files available in the repository the focused terminal is sitting in, each tagged project, user or plugin.",
        ],
      },
      {
        kind: "note",
        text: "This is deliberately not an agent of its own. CPT does not want to be the thing writing your code — it runs the CLI you already chose and tells you what it is doing. If you want the terminal itself to be the AI product, [Warp](/vs/warp) is further down that road and has a free tier.",
      },
      { kind: "h2", text: "If you are not going to change terminals" },
      {
        kind: "p",
        text: "Set up notification hooks in each agent CLI and give each pane a distinct title. It is not as good, it costs nothing, and it removes most of the twenty-minute stalls.",
      },
    ],
    related: ["same-terminal-setup-on-windows-and-linux", "gpu-accelerated-terminal-explained"],
  },
  {
    slug: "gpu-accelerated-terminal-explained",
    title: "What “GPU-accelerated terminal” actually means",
    metaTitle: "What a GPU-accelerated terminal actually does",
    description:
      "Why terminals started using the GPU, what the phrase does and does not promise, when you can feel the difference, and how the common approaches differ.",
    summary:
      "The phrase is on every terminal's front page. Here is what it does and does not buy you.",
    blocks: [
      {
        kind: "p",
        text: "Every terminal released in the last decade claims GPU acceleration, which makes the phrase close to meaningless as a differentiator. It does mean something specific, though, and it is worth knowing what — mostly so you can tell when it will not help you.",
      },
      { kind: "h2", text: "The problem it solves" },
      {
        kind: "p",
        text: "A terminal is a grid of cells. A large window is maybe 200 by 60, so 12,000 cells, each with a glyph, a foreground colour, a background colour and attributes. Redraw that on the CPU, one glyph at a time, at 120Hz while something is streaming output, and you are doing a lot of per-cell work in a loop — which is why older terminals visibly struggle when you cat a large file or scroll fast.",
      },
      {
        kind: "p",
        text: "The GPU approach: rasterise each glyph once into a texture atlas, then describe the whole grid as data and let the GPU composite it. The CPU stops touching pixels and starts describing cells.",
      },
      { kind: "h2", text: "What the approaches have in common, and where they differ" },
      {
        kind: "list",
        items: [
          "[Alacritty](/vs/alacritty) uses OpenGL and needs OpenGL ES 2.0 or better.",
          "[kitty](/vs/kitty) uses OpenGL directly with no large UI toolkit underneath.",
          "[WezTerm](/vs/wezterm) is GPU-accelerated with WebGPU front-end options and a fallback adapter.",
          "[Windows Terminal](/vs/windows-terminal) uses a DirectWrite-based text layout and rendering engine.",
          "Electron-based terminals like [Tabby](/vs/tabby) and [Hyper](/vs/hyper) go through the browser engine's compositor, which is a different set of trade-offs.",
          "Cross Platform Terminal renders the entire grid in a single draw call.",
        ],
      },
      {
        kind: "p",
        text: "The number that matters is not “does it use the GPU” but how many draw calls and state changes a frame costs. One call for the grid means frame cost is close to flat as the window grows, which is the thing you feel on a 4K display with several panes open.",
      },
      { kind: "h2", text: "When you will not notice" },
      {
        kind: "list",
        items: [
          "Reading and typing. Nothing is redrawing; every terminal here is instant.",
          "Over SSH on a slow link — the bottleneck is the network, not the renderer.",
          "In a VM or over remote desktop without GPU passthrough, where you may land on a software rasteriser and lose the benefit entirely.",
        ],
      },
      { kind: "h2", text: "When you will" },
      {
        kind: "list",
        items: [
          "Streaming output: build logs, test runners, an agent writing a long diff.",
          "Fast scrollback through a large buffer.",
          "Large windows, high DPI, and several panes redrawing at once.",
          "Ligature-heavy fonts, where glyph shaping is cached rather than recomputed.",
        ],
      },
      {
        kind: "note",
        text: "If a terminal feels slow and it already claims GPU rendering, the cause is usually elsewhere: your shell prompt shelling out to git on every keystroke, an unbounded scrollback, or a font fallback chain scanning hundreds of families. Check those before changing terminals.",
      },
    ],
    related: [
      "see-what-your-coding-agent-is-doing-in-the-terminal",
      "same-terminal-setup-on-windows-and-linux",
    ],
  },
];

export function guideBySlug(slug: string): Guide | undefined {
  return GUIDES.find((g) => g.slug === slug);
}
