"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  CWD,
  HOST,
  WIDGETS_MENU,
  demos,
  inventories,
  type Color,
  type Demo,
  type InventoryItem,
  type Line,
  type Op,
} from "@/lib/demo-session";

/*
 * The hero: a replaying CPT session, drawn as real text rather than a screenshot.
 *
 * Why not an image or a video: the product is a terminal, and terminal type in a scaled-down
 * screenshot is unreadable — which is exactly what the old hero suffered from. Rendering the
 * session as DOM keeps it sharp at every size and DPI, weighs a few KB, and lets the layout
 * changes (splitting, switching views) actually animate, which is the thing being sold.
 *
 * The state is held in a ref and painted via a forced re-render. The player is a long-lived async
 * loop that mutates one object across dozens of steps; threading that through immutable setState
 * would mean rebuilding the whole tree on every typed character for no benefit, since nothing but
 * this component ever reads the state.
 */

type Pane = { id: number; kind: "term" | "inventory"; cwd: string; ai: string | null; lines: Line[]; input: string };

/** The repository a directory belongs to — its last segment, as the widget shows it. */
function repoOf(cwd: string): string {
  return cwd.split("/").filter(Boolean).pop() ?? cwd;
}
type View = { id: number; name: string; panes: Pane[]; active: number };
type Session = {
  views: View[];
  activeView: number;
  keys: string[] | null;
  /** An open title-bar menu, and which of its items is under the cursor. */
  menu: { name: string; highlight: string | null } | null;
  /** The repository whose results the inventory pane is displaying. */
  inventoryRepo: string;
  /** While set, the pane shows the scan indicator for this repo; old results stay on screen. */
  scanning: string | null;
  /** The simulated cursor: which `data-ptr` element it sits on, and whether it is clicking. */
  pointer: { at: string; click: boolean } | null;
  caption: string;
  /** Pane and view keys. Kept in the session so `stillFrame()` stays pure. */
  nextId: number;
};

const COLORS: Record<Color, string> = {
  fg: "var(--color-foreground)",
  dim: "var(--color-muted)",
  green: "#7dd88f",
  blue: "#6cb6ff",
  accent: "var(--color-accent)",
  cyan: "#56d4d4",
  magenta: "#e06c9f",
};

function initial(): Session {
  return {
    views: [{ id: 1, name: "Main", panes: [{ id: 1, kind: "term", cwd: CWD, ai: null, lines: [], input: "" }], active: 0 }],
    activeView: 0,
    keys: null,
    menu: null,
    inventoryRepo: repoOf(CWD),
    scanning: null,
    pointer: null,
    caption: "",
    nextId: 2,
  };
}

const view = (s: Session) => s.views[s.activeView];
const pane = (s: Session) => view(s).panes[view(s).active];

/** Everything an op does apart from its timing. Used verbatim to build the reduced-motion still. */
function applyInstant(s: Session, op: Op): Session {
  switch (op.k) {
    case "reset":
      return initial();
    case "caption":
      s.caption = op.text;
      return s;
    case "type":
      pane(s).input = op.text;
      return s;
    case "run": {
      const p = pane(s);
      p.lines = [...p.lines, [{ t: "", prompt: true }, { t: p.input }]];
      p.input = "";
      return s;
    }
    case "out": {
      const p = pane(s);
      p.lines = [...p.lines, ...op.lines];
      return s;
    }
    case "split": {
      const v = view(s);
      v.panes = [...v.panes, { id: s.nextId++, kind: "term", cwd: pane(s).cwd, ai: null, lines: [], input: "" }];
      v.active = v.panes.length - 1;
      return s;
    }
    case "inventory": {
      const v = view(s);
      // Docked, but focus is deliberately left on the terminal: the AI badge belongs to the pane
      // running the tool, and moving the focus ring off it would take the badge with it.
      s.inventoryRepo = repoOf(pane(s).cwd);
      s.scanning = null;
      v.panes = [...v.panes, { id: s.nextId++, kind: "inventory", cwd: "", ai: null, lines: [], input: "" }];
      return s;
    }
    case "newview": {
      s.views = [
        ...s.views,
        {
          id: s.nextId++,
          name: op.name,
          panes: [{ id: s.nextId++, kind: "term", cwd: CWD, ai: null, lines: [], input: "" }],
          active: 0,
        },
      ];
      s.activeView = s.views.length - 1;
      return s;
    }
    case "switchview":
      s.activeView = Math.min(op.index, s.views.length - 1);
      return s;
    case "ai":
      pane(s).ai = op.tool;
      return s;
    case "menu":
      s.menu = op.open ? { name: op.open, highlight: op.highlight ?? null } : null;
      return s;
    case "cwd":
      pane(s).cwd = op.path;
      return s;
    case "focus": {
      const v = view(s);
      v.active = Math.min(op.index, v.panes.length - 1);
      // The widget follows the focused terminal, so a focus change into another checkout starts a
      // scan. The old results stay up until `scanned` commits the new ones.
      const repo = repoOf(v.panes[v.active].cwd);
      const hasInventory = v.panes.some((p) => p.kind === "inventory");
      s.scanning = hasInventory && repo && repo !== s.inventoryRepo ? repo : null;
      return s;
    }
    case "pointer":
      s.pointer = op.at ? { at: op.at, click: op.click ?? false } : null;
      return s;
    case "scanned":
      if (s.scanning) s.inventoryRepo = s.scanning;
      s.scanning = null;
      return s;
    case "key":
      s.keys = op.keys;
      return s;
    case "wait":
      return s;
  }
}

/** Everything in `ops`, applied with no timing at all. */
function frameOf(ops: Op[]): Session {
  let s = initial();
  for (const op of ops) s = applyInstant(s, op);
  s.keys = null;
  s.menu = null;
  s.pointer = null;
  if (s.scanning) {
    s.inventoryRepo = s.scanning;
    s.scanning = null;
  }
  return s;
}

/** Where a clip starts: mid-task, so its point lands immediately. */
function seedFrame(d: Demo): Session {
  return frameOf(d.seed);
}

/** The frame a clip ends on — the richest one, and what we show when motion is not wanted. */
function stillFrame(d: Demo): Session {
  return frameOf([...d.seed, ...d.script]);
}

const CANCELLED = Symbol("cancelled");

export default function TerminalDemo() {
  const clips = demos;
  const [pick, setPick] = useState(0);
  const active = clips[Math.min(pick, clips.length - 1)];

  /*
   * Seeded with the finished frame, not an empty one. Server render and first paint therefore show
   * a populated workspace: no-JS visitors, slow hydration and reduced-motion users all get the
   * frame worth seeing, and the player re-seeds from there once it starts.
   */
  /*
   * `stateRef` is the working copy the player mutates dozens of times a second; `snap` is what the
   * render reads. `repaint` publishes a shallow copy of the ref, which is enough for React to see
   * a new object without rebuilding the session — the nested arrays keep their identity.
   *
   * The render used to read `stateRef.current` directly, which `react-hooks/refs` rejects: a ref
   * holding render-relevant state is invisible to React, so nothing guarantees the paint. One
   * shallow clone per frame buys that guarantee and costs nothing measurable.
   */
  const [snap, setSnap] = useState<Session>(() => stillFrame(clips[0]));
  const stateRef = useRef<Session>(snap);
  const repaint = useCallback(() => setSnap({ ...stateRef.current }), []);
  const frameRef = useRef<HTMLDivElement>(null);
  const cursorRef = useRef<HTMLDivElement>(null);
  const firstRun = useRef(true);
  const [playing, setPlaying] = useState(true);
  const [reduced, setReduced] = useState(false);

  const rootRef = useRef<HTMLDivElement>(null);
  // Gates the player without unwinding it: off-screen, backgrounded, or paused by hand.
  const gate = useRef({ blocked: false, waiters: [] as (() => void)[] });
  const visible = useRef(true);
  const wanted = useRef(true);

  const sync = useCallback(() => {
    const blocked = !visible.current || !wanted.current || document.hidden;
    gate.current.blocked = blocked;
    if (!blocked) {
      const waiters = gate.current.waiters;
      gate.current.waiters = [];
      waiters.forEach((w) => w());
    }
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => {
      // Repainting the still frame is left to the effect that depends on the selected clip, so
      // this listener only has to record the preference.
      setReduced(mq.matches);
    };
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        visible.current = entry.isIntersecting;
        sync();
      },
      { threshold: 0.15 }
    );
    io.observe(el);
    const onVisibility = () => sync();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [sync]);

  useEffect(() => {
    wanted.current = playing;
    sync();
  }, [playing, sync]);

  // With motion suppressed the player never runs, so switching clips has to repaint the frame.
  useEffect(() => {
    if (!reduced) return;
    stateRef.current = stillFrame(active);
    repaint();
  }, [reduced, active, repaint]);

  useEffect(() => {
    if (reduced) return;

    let cancelled = false;
    const timers = new Set<ReturnType<typeof setTimeout>>();
    // Captured once: the gate object is stable for the component's life, and cleanup must release
    // the same waiters this run parked there.
    const g = gate.current;

    const raw = (ms: number) =>
      new Promise<void>((resolve) => {
        const t = setTimeout(() => {
          timers.delete(t);
          resolve();
        }, ms);
        timers.add(t);
      });

    const ungate = () =>
      g.blocked ? new Promise<void>((resolve) => g.waiters.push(resolve)) : Promise.resolve();

    async function sleep(ms: number) {
      await raw(ms);
      if (cancelled) throw CANCELLED;
      await ungate();
      if (cancelled) throw CANCELLED;
    }

    const paint = () => {
      if (!cancelled) repaint();
    };

    async function step(op: Op) {
      const s = stateRef.current;

      switch (op.k) {
        case "type": {
          const perChar = 1000 / (op.cps ?? 20);
          for (let i = 1; i <= op.text.length; i++) {
            pane(s).input = op.text.slice(0, i);
            paint();
            // Human typing is uneven; a fixed interval reads as a machine.
            await sleep(perChar * (0.6 + Math.random() * 0.8));
          }
          await sleep(260);
          break;
        }
        case "out": {
          const stagger = op.stagger ?? 220;
          for (const line of op.lines) {
            applyInstant(s, { k: "out", lines: [line] });
            paint();
            await sleep(stagger);
          }
          break;
        }
        case "key": {
          applyInstant(s, op);
          paint();
          await sleep(op.hold ?? 900);
          s.keys = null;
          paint();
          break;
        }
        case "pointer": {
          applyInstant(s, op);
          paint();
          if (op.click) {
            // Long enough for the ripple to be seen, short enough to read as a click.
            await sleep(260);
            if (s.pointer) s.pointer.click = false;
            paint();
          }
          // The cursor glides via a CSS transition, so hold for roughly that long.
          await sleep(op.click ? 60 : 420);
          break;
        }
        case "wait": {
          await sleep(op.ms);
          break;
        }
        default: {
          stateRef.current = applyInstant(s, op);
          paint();
          const structural =
            op.k === "split" ||
            op.k === "newview" ||
            op.k === "switchview" ||
            op.k === "inventory" ||
            op.k === "focus";
          await sleep(structural ? 420 : 90);
        }
      }
    }

    (async () => {
      try {
        // Never ends: each pass re-seeds and replays. The seed is applied instantly, so the clip
        // opens on a workspace already mid-task rather than building one up from an empty shell.
        for (let pass = 0; ; pass++) {
          // On the very first pass, hold the server-rendered still frame long enough to be read
          // before re-seeding over it. On a deliberate clip change, start immediately.
          if (pass === 0 && firstRun.current) {
            firstRun.current = false;
            await sleep(900);
          }
          stateRef.current = seedFrame(active);
          paint();
          await sleep(500);
          for (const op of active.script) await step(op);
        }
      } catch (e) {
        if (e !== CANCELLED) throw e;
      }
    })();

    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
      timers.clear();
      g.waiters.forEach((w) => w());
      g.waiters = [];
    };
  }, [reduced, sync, active, repaint]);

  const s = snap;
  const v = view(s);

  /*
   * Positions the simulated cursor by writing to the DOM, not through state.
   *
   * The target is measured rather than written down: the frame is a different size at every
   * breakpoint, and the menu item it points at does not exist until the menu opens. There is no
   * dependency array because the target can appear on any paint — but the effect only touches
   * `style`, so it cannot cascade renders the way a `setState` here would.
   *
   * The first placement is made with transitions off. Otherwise the cursor's first appearance
   * animates in from the frame's top-left corner, which reads as a glitch rather than a move.
   *
   * Position and opacity are deliberately not in the component's `style` prop — React resets
   * anything it holds there on the next render, which wiped these out and left the cursor
   * invisible at the origin. They start in `.cpt-cursor` and are only ever written here.
   */
  useEffect(() => {
    const at = s.pointer?.at ?? null;
    const frame = frameRef.current;
    const el = cursorRef.current;
    if (!at || !frame || !el) return;

    const target = frame.querySelector<HTMLElement>(`[data-ptr="${at}"]`);
    if (!target) return; // not rendered yet — leave the cursor where it is

    const f = frame.getBoundingClientRect();
    const r = target.getBoundingClientRect();
    const placed = el.dataset.placed === "1";
    if (!placed) el.style.transition = "none";
    el.style.left = `${r.left - f.left + r.width / 2}px`;
    el.style.top = `${r.top - f.top + r.height / 2}px`;
    if (!placed) {
      void el.offsetWidth; // flush the jump before restoring the transition
      el.style.transition = "";
      el.dataset.placed = "1"; // reveals it — see .cpt-cursor in globals.css
    }
  });

  return (
    <div ref={rootRef} className="w-full">
      {/*
       * The picker. It sits above the frame rather than below it so the choice is visible before
       * the visitor decides whether to keep watching — the whole point of splitting one long reel
       * into clips is that nobody has to wait to reach the part they care about.
       */}
      {clips.length > 1 && (
        <div className="mb-3 flex flex-wrap items-center gap-2" role="tablist" aria-label="Demo">
          {clips.map((d, i) => {
            const on = i === pick;
            return (
              <button
                key={d.id}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => setPick(i)}
                className="text-xs px-3 py-1.5 rounded-full border transition-colors"
                style={{
                  borderColor: on ? "var(--color-accent)" : "var(--color-border)",
                  background: on ? "var(--color-accent-dim)" : "transparent",
                  color: on ? "var(--color-accent)" : "var(--color-muted)",
                }}
              >
                {d.label}
              </button>
            );
          })}
        </div>
      )}

      <div
        ref={frameRef}
        className="relative rounded-xl border overflow-hidden select-none"
        style={{
          borderColor: "var(--color-border)",
          background: "#0a0a0d",
          boxShadow: "0 24px 70px rgba(0,0,0,0.55)",
        }}
        role="img"
        aria-label="A Cross Platform Terminal session: a release build runs in one pane, a second pane is opened with Ctrl+Shift+T, Claude Code starts in it and the pane picks up an AI badge, an AI Inventory panel docks alongside listing the skills, agents, commands and MCP servers this repository has, then a second view is opened with Alt+T and the first view is returned to with its layout intact."
      >
        <div aria-hidden style={{ fontFamily: "var(--font-mono), ui-monospace, monospace" }}>
          {/* Title bar */}
          <div
            // z-20 so an open menu paints over the tab strip and panes that follow it in the DOM.
            className="relative z-20 flex items-center justify-between px-3 h-8 border-b text-[11px]"
            style={{ background: "#141419", borderColor: "var(--color-border)", color: "var(--color-muted)" }}
          >
            <div className="relative flex items-center gap-4">
              {/* The product's menu bar is exactly these two — File and View were removed in #6. */}
              {["Widgets", "Settings"].map((m) => (
                <span
                  key={m}
                  data-ptr={m === "Widgets" ? "menu-widgets" : undefined}
                  className="px-1 rounded-sm"
                  style={
                    s.menu?.name === m
                      ? { background: "#2f2f2f", color: "var(--color-foreground)" }
                      : undefined
                  }
                >
                  {m}
                </span>
              ))}

              {/* The open menu. Items come from TitleBar.cpp, in the order it declares them. */}
              {s.menu && (
                <div
                  className="absolute top-full left-0 mt-1 min-w-[136px] rounded-sm border py-1"
                  style={{ background: "#1f1f1f", borderColor: "#3c3c3c" }}
                >
                  {WIDGETS_MENU.map((item) => {
                    const hot = s.menu?.highlight === item;
                    return (
                      <div
                        key={item}
                        data-ptr={item === "AI Inventory" ? "menu-ai-inventory" : undefined}
                        className="px-3 py-0.5 whitespace-nowrap"
                        style={{
                          background: hot ? "#1f3a58" : "transparent",
                          color: hot ? "#cfe0f0" : "var(--color-muted)",
                        }}
                      >
                        {item}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="flex items-center gap-3 text-[10px]" style={{ opacity: 0.7 }}>
              <span>&#8211;</span>
              <span>&#9723;</span>
              <span>&#10005;</span>
            </div>
          </div>

          {/* View tabs */}
          <div
            className="flex items-end h-8 px-1 border-b text-[11px] gap-0.5"
            style={{ background: "#101015", borderColor: "var(--color-border)" }}
          >
            {s.views.map((tab, i) => {
              const on = i === s.activeView;
              return (
                <span
                  key={`${active.id}:${tab.id}`}
                  className="px-3 py-1.5 rounded-t"
                  style={{
                    color: on ? "var(--color-view-tab)" : "var(--color-muted)",
                    background: on ? "#26191a" : "transparent",
                    // Top accent, not bottom: ViewManager.cpp draws "Active: red top accent".
                    borderTop: `2px solid ${on ? "var(--color-view-tab)" : "transparent"}`,
                    transition: "color .2s, background .2s, border-color .2s",
                    animation: "cpt-tab-in .34s ease both",
                  }}
                >
                  {tab.name} <span style={{ opacity: 0.45 }}>&#10005;</span>
                </span>
              );
            })}
            <span className="px-2 py-1.5" style={{ color: "var(--color-muted)", opacity: 0.55 }}>
              +
            </span>
          </div>

          {/* Panes */}
          <div
            className="flex gap-2 p-2 h-[248px] sm:h-[300px] lg:h-[336px]"
            style={{ background: "#1a1a1a" }}
          >
            {v.panes.map((p, i) => {
              const on = i === v.active;
              const isInv = p.kind === "inventory";
              // Terminals are numbered among themselves, as the product numbers its widgets.
              const termNo = v.panes.slice(0, i + 1).filter((q) => q.kind === "term").length;
              return (
                <div
                  key={`${active.id}:${p.id}`}
                  data-ptr={`pane-${i}`}
                  className={[
                    "relative min-w-0 flex-col rounded-lg overflow-hidden",
                    isInv ? "basis-[46%] sm:basis-[30%] grow-0 shrink-0" : "flex-1",
                    /*
                     * Three panes side by side is unreadable on a phone — every line truncates to
                     * a few characters. Once a third arrives, the oldest drops out below `sm`, so
                     * a narrow screen keeps the two that carry the story: the pane running Claude
                     * and the inventory of what the repo has.
                     */
                    v.panes.length > 2 && i === 0 ? "hidden sm:flex" : "flex",
                  ].join(" ")}
                  style={{
                    background: "#0a0a0d",
                    // The product outlines the focused pane in orange and the rest in grey.
                    outline: `1px solid ${on ? "#eb832a" : "#3c3c3c"}`,
                    outlineOffset: "-1px",
                    animation: "cpt-pane-in .42s ease both",
                  }}
                >
                  <div
                    className="flex items-center justify-between gap-2 px-2.5 h-6 text-[10.5px] shrink-0"
                    style={{ background: "#1c1c1c", color: "var(--color-muted)" }}
                  >
                    <span className="flex items-center gap-1.5 min-w-0">
                      <span
                        className="truncate px-1"
                        style={{
                          color: on ? "var(--color-foreground)" : "var(--color-muted)",
                          // WidgetTabBar.cpp — "Active: blue top accent".
                          borderTop: `2px solid ${on ? "var(--color-pane-tab)" : "transparent"}`,
                        }}
                      >
                        {isInv ? "AI Inventory 1" : `Terminal ${termNo}`}{" "}
                        <span style={{ opacity: 0.45 }}>&#10005;</span>
                      </span>
                      <span style={{ opacity: 0.45 }}>+</span>
                    </span>
                    {/* Pin (Ctrl+Shift+Alt+P) and maximise, as they sit in the product. */}
                    <span className="flex items-center gap-2 shrink-0" style={{ opacity: 0.5 }}>
                      <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" d="M12 17v5M9 3h6l-1 6 3 3H7l3-3-1-6z" />
                      </svg>
                      <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                        <rect x="4" y="4" width="16" height="16" rx="1.5" />
                      </svg>
                    </span>
                  </div>
                  {/* The Workflows strip belongs to a terminal; the inventory has its own header. */}
                  {!isInv && (
                    <div
                      className="flex items-center gap-1.5 px-2.5 h-5 text-[10.5px] shrink-0"
                      style={{ background: "#111116", color: "var(--color-muted)" }}
                    >
                      <span style={{ color: "var(--color-accent)" }}>&#9679;</span>
                      <span>Workflows</span>
                    </div>
                  )}

                  {isInv ? (
                    <InventoryPanel repo={s.inventoryRepo} scanning={s.scanning} />
                  ) : (
                  <div className="flex-1 min-h-0 overflow-hidden px-2.5 py-1.5 text-[11px] sm:text-[12px] leading-[1.55]">
                    {p.lines.map((line, li) => (
                      <div key={li} className="whitespace-pre truncate">
                        {line.map((span, si) =>
                          span.prompt ? (
                            <Prompt key={si} cwd={p.cwd} />
                          ) : (
                            <span key={si} style={{ color: COLORS[span.c ?? "fg"] }}>
                              {span.t}
                            </span>
                          )
                        )}
                      </div>
                    ))}
                    <div className="whitespace-pre truncate">
                      <Prompt cwd={p.cwd} />
                      <span style={{ color: "var(--color-foreground)" }}>{p.input}</span>
                      {on && (
                        <span
                          className="inline-block align-middle"
                          style={{
                            width: "0.55em",
                            height: "1.05em",
                            background: "var(--color-foreground)",
                            marginLeft: "1px",
                            animation: "cpt-blink 1.05s steps(1) infinite",
                          }}
                        />
                      )}
                    </div>
                  </div>
                  )}

                  {/*
                   * TerminalWidget::renderAiOverlay draws this in the top-right of the pane that
                   * is running the tool — orange for Claude, blue for Copilot. It is not a
                   * status-bar item, and there is no token counter anywhere in the product.
                   */}
                  {p.ai && !isInv && (
                    <span
                      className="absolute top-8 right-2 flex items-center gap-1.5 px-2 py-1 rounded text-[10px]"
                      style={{
                        background: "rgba(180,100,45,0.78)",
                        color: "#fff",
                        animation: "cpt-pane-in .3s ease both",
                      }}
                    >
                      <span style={{ animation: "cpt-pulse 1.4s ease-in-out infinite" }}>&#9679;</span>
                      {p.ai}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Status bar */}
          <div
            className="flex items-center justify-between px-3 h-7 border-t text-[10.5px]"
            style={{ background: "#141419", borderColor: "var(--color-border)", color: "var(--color-muted)" }}
          >
            <span className="truncate">
              Views: {s.views.length} <span style={{ opacity: 0.4 }}>|</span> Active: {v.name}{" "}
              <span style={{ opacity: 0.4 }}>|</span> Widgets: {v.panes.length}
            </span>
            <span className="flex items-center gap-3 shrink-0">
              <span>100%</span>
              {/*
               * The product's status bar ends with a live key-state indicator — it echoes the
               * modifiers and letter currently held. Empty brackets when nothing is pressed.
               */}
              <span style={{ opacity: 0.55 }}>[{s.keys ? s.keys.join("+") : ""}]</span>
            </span>
          </div>
        </div>

        {/* Keycaps */}
        {/*
          * The simulated cursor. Positioned by the effect above; `left`/`top` are the element's
          * centre, so the arrow is nudged back by half its size. It starts transparent because the
          * effect has not measured it yet on the first paint.
          */}
        {s.pointer && (
          <div
            ref={cursorRef}
            aria-hidden
            className="cpt-cursor absolute z-40 pointer-events-none"
          >
            {s.pointer.click && (
              <span
                className="absolute rounded-full"
                style={{
                  left: "-9px",
                  top: "-9px",
                  width: "18px",
                  height: "18px",
                  border: "1.5px solid var(--color-accent)",
                  animation: "cpt-click .4s ease-out",
                }}
              />
            )}
            <svg
              width="14"
              height="18"
              viewBox="0 0 14 18"
              style={{ display: "block", marginLeft: "-2px", marginTop: "-2px" }}
            >
              <path
                d="M1 1l10.5 8.2H6.9l-2.1 6.4L1 1z"
                fill="#f5f5f5"
                stroke="#111"
                strokeWidth="1.2"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        )}

        {s.keys && (
          <div
            aria-hidden
            className="absolute left-1/2 bottom-12 flex items-center gap-1.5"
            style={{ transform: "translateX(-50%)", animation: "cpt-keys .18s ease both" }}
          >
            {s.keys.map((key) => (
              <kbd
                key={key}
                className="px-2.5 py-1.5 rounded-md text-[11px] font-medium border"
                style={{
                  background: "rgba(20,20,26,0.94)",
                  borderColor: "var(--color-accent)",
                  color: "var(--color-foreground)",
                  boxShadow: "0 4px 14px rgba(0,0,0,0.5)",
                  fontFamily: "var(--font-mono), monospace",
                }}
              >
                {key}
              </kbd>
            ))}
          </div>
        )}
      </div>

      {/* Caption + transport */}
      <div className="mt-3 flex items-center justify-between gap-4 min-h-[26px]">
        <p className="text-xs sm:text-sm" style={{ color: "var(--color-muted)" }} aria-live="polite">
          {s.caption || active.blurb}
        </p>
        {!reduced && (
          <button
            type="button"
            onClick={() => setPlaying((p) => !p)}
            className="shrink-0 text-xs px-2.5 py-1 rounded-md border cpt-quiet"
            style={{ borderColor: "var(--color-border)", color: "var(--color-muted)" }}
          >
            {playing ? "Pause" : "Play"} demo
          </button>
        )}
      </div>
    </div>
  );
}

/*
 * The AI Inventory widget, as it is drawn in the product — see `.product-shots/ai_inventory.png`
 * from `scripts/capture-product.sh`, which is what these colours and this layout were taken from.
 *
 * Scope is signalled twice, exactly as the widget does it: a coloured stripe down the row's left
 * edge and a badge after the name. Blue is the repo, green is ~/.claude, purple is a plugin.
 * The first letter of each group label is underlined because that letter is the group's shortcut.
 */
const SCOPE: Record<InventoryItem["scope"], string> = {
  project: "#4d9de0",
  user: "#4ea36a",
  plugin: "#a077c8",
};

function InventoryPanel({ repo, scanning }: { repo: string; scanning: string | null }) {
  const inventory = inventories[repo] ?? inventories.cpt;
  return (
    <div className="flex-1 min-h-0 overflow-hidden text-[10px] sm:text-[10.5px] leading-[1.5]">
      {/* Repository header */}
      <div className="flex items-center gap-1.5 px-2 py-1 truncate" style={{ color: "var(--color-muted)" }}>
        <span>Repository</span>
        <span className="font-semibold" style={{ color: SCOPE.project }}>
          {scanning ?? inventory.repo}
        </span>
      </div>

      {/* Filter box, with the key that focuses it */}
      <div
        className="mx-1.5 px-2 py-0.5 rounded-sm flex items-center justify-between"
        style={{ background: "#1e2f49", color: "#7f96b3" }}
      >
        <span>Filter...</span>
        <span>(F)</span>
      </div>

      <div className="px-2 py-0.5 flex items-center gap-1.5" style={{ color: "var(--color-muted)" }}>
        {scanning ? (
          <>
            <span
              className="inline-block rounded-full"
              style={{
                width: "0.7em",
                height: "0.7em",
                border: "1.5px solid var(--color-muted)",
                borderTopColor: "transparent",
                animation: "cpt-spin .7s linear infinite",
              }}
            />
            <span>Scanning {scanning}...</span>
          </>
        ) : (
          <span>{inventory.count} items</span>
        )}
      </div>

      {inventory.groups.map((g) => (
        <div key={g.label}>
          <div
            className="px-2 py-0.5 flex items-center gap-1.5"
            style={{ background: "#1f3a58", color: "#cfe0f0" }}
          >
            <span style={{ fontSize: "0.8em" }}>&#9660;</span>
            <span>
              <span style={{ textDecoration: "underline" }}>{g.label[0]}</span>
              {g.label.slice(1)}
            </span>
            <span style={{ opacity: 0.65 }}>({g.items.length})</span>
          </div>

          {g.items.map((it) => (
            <div
              key={it.name}
              className="pl-2 pr-1.5 py-0.5"
              style={{ borderLeft: `2px solid ${SCOPE[it.scope]}` }}
            >
              <div className="flex items-center gap-1.5 truncate">
                <span style={{ color: "#c8c8c8" }}>{it.name}</span>
                <span
                  className="px-1 rounded-sm shrink-0"
                  style={{
                    color: SCOPE[it.scope],
                    border: `1px solid ${SCOPE[it.scope]}`,
                    fontSize: "0.85em",
                  }}
                >
                  {it.scope}
                </span>
                {it.meta && (
                  <span className="truncate" style={{ color: "var(--color-muted)" }}>
                    {it.meta}
                  </span>
                )}
              </div>
              {it.desc && (
                <div className="truncate" style={{ color: "var(--color-muted)" }}>
                  {it.desc}
                </div>
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

/** The shell prompt for a pane. Panes can be in different checkouts, so the path is per-pane. */
function Prompt({ cwd }: { cwd: string }) {
  return (
    <>
      <span style={{ color: COLORS.green }}>{HOST}</span>
      <span style={{ color: COLORS.dim }}>:</span>
      <span style={{ color: COLORS.blue }}>{cwd}</span>
      <span style={{ color: COLORS.fg }}>$ </span>
    </>
  );
}
