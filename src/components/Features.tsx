const features = [
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" />
      </svg>
    ),
    title: "Multi-View Workspace",
    body: "Named tabs, each with an independent dock layout. Reorder them by dragging, number them if you like, and inactive views suspend to near-zero resource usage.",
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
    title: "Full Terminal Emulator",
    body: "PTY-backed, full VT escape sequence support, tabbed sessions, scrollback, clipboard, font zoom.",
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    title: "AI Workflow Pipeline",
    body: "Chain steps that rewrite prompts before they reach Claude Code or Copilot - prepend, append, script, detect.",
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
      </svg>
    ),
    title: "AI Tool Detection",
    body: "When Claude Code or Copilot starts in a pane, that pane gets a live badge naming the tool and echoing its status line. A working spinner appears on the view's own tab too, so you can see which workspace is busy from anywhere. Zero config.",
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    title: "AI Inventory",
    body: "A panel listing the skills, agents, commands, hooks, MCP servers and instruction files available in the repository you are working in - each tagged project, user or plugin. It follows the focused terminal, so it re-scans when you cd somewhere else.",
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M17.657 16.657L13.414 20.9a2 2 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    title: "Pinned Panes",
    body: "Pin a pane and it keeps the size and the slot you gave it. Redistribute the layout, close a neighbour, or open another terminal - the narrow file tree or log pane stays exactly as you set it, and the rest share out what is left.",
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
      </svg>
    ),
    title: "Keyboard Navigation",
    body: "Focus, move, and resize any panel without touching the mouse. Navigate views, open terminals, pin a pane, jump between tabs - every action has a binding, and all of them rebind.",
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M9 3v2m6-2v2M9 19v2m6-2v2M3 9h2m-2 6h2m14-6h2m-2 6h2M7 7h10a2 2 0 012 2v6a2 2 0 01-2 2H7a2 2 0 01-2-2V9a2 2 0 012-2zm5 5h.01" />
      </svg>
    ),
    title: "Native Performance",
    body: "Launches instantly, stays responsive under load. Inactive views drop to near-zero CPU and memory - your machine stays free for the work that matters.",
  },
];

export default function Features() {
  return (
    <section id="features" className="py-24 px-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "var(--color-accent)" }}>
            Features
          </p>
          <h2
            className="text-3xl md:text-4xl font-bold tracking-tight"
            style={{ color: "var(--color-foreground)" }}
          >
            Everything in one window
          </h2>
          <p className="mt-4 max-w-xl mx-auto text-base" style={{ color: "var(--color-muted)" }}>
            Arrange terminals and tools exactly how you want. Navigate everything from the keyboard.
            Stays fast no matter how much you have open.
          </p>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((f) => (
            <div
              key={f.title}
              className="rounded-xl border p-6 transition-colors group"
              style={{
                background: "var(--color-surface)",
                borderColor: "var(--color-border)",
              }}
            >
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center mb-4"
                style={{
                  background: "var(--color-accent-dim)",
                  color: "var(--color-accent)",
                }}
              >
                {f.icon}
              </div>
              <h3
                className="font-semibold text-[15px] mb-2"
                style={{ color: "var(--color-foreground)" }}
              >
                {f.title}
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: "var(--color-muted)" }}>
                {f.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
