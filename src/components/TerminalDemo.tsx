"use client";

import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { CWD, HOST, demo, type Color, type Line, type Op } from "@/lib/demo-session";

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

type Pane = { id: number; kind: "term" | "inventory"; lines: Line[]; input: string };
type View = { id: number; name: string; panes: Pane[]; active: number; ai: string | null };
type Session = {
  views: View[];
  activeView: number;
  keys: string[] | null;
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
    views: [{ id: 1, name: "Main", panes: [{ id: 1, kind: "term", lines: [], input: "" }], active: 0, ai: null }],
    activeView: 0,
    keys: null,
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
      v.panes = [...v.panes, { id: s.nextId++, kind: "term", lines: [], input: "" }];
      v.active = v.panes.length - 1;
      return s;
    }
    case "inventory": {
      const v = view(s);
      // Docked, but focus is deliberately left on the terminal: the AI badge belongs to the pane
      // running the tool, and moving the focus ring off it would take the badge with it.
      v.panes = [...v.panes, { id: s.nextId++, kind: "inventory", lines: [], input: "" }];
      return s;
    }
    case "newview": {
      s.views = [
        ...s.views,
        {
          id: s.nextId++,
          name: op.name,
          panes: [{ id: s.nextId++, kind: "term", lines: [], input: "" }],
          active: 0,
          ai: null,
        },
      ];
      s.activeView = s.views.length - 1;
      return s;
    }
    case "switchview":
      s.activeView = Math.min(op.index, s.views.length - 1);
      return s;
    case "ai":
      view(s).ai = op.tool;
      return s;
    case "key":
      s.keys = op.keys;
      return s;
    case "wait":
      return s;
  }
}

/** The frame the demo ends on — the richest one, and what we show when motion is not wanted. */
function stillFrame(): Session {
  let s = initial();
  for (const op of demo) s = applyInstant(s, op);
  s.keys = null;
  return s;
}

const CANCELLED = Symbol("cancelled");

export default function TerminalDemo() {
  /*
   * Seeded with the finished frame, not an empty one. Server render and first paint therefore show
   * a populated workspace: no-JS visitors, slow hydration and reduced-motion users all get the
   * frame worth seeing, and the player's opening `reset` restarts from there.
   */
  const stateRef = useRef<Session>(stillFrame());
  const [, repaint] = useReducer((n: number) => n + 1, 0);
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
      setReduced(mq.matches);
      if (mq.matches) {
        stateRef.current = stillFrame();
        repaint();
      }
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
        case "wait": {
          await sleep(op.ms);
          break;
        }
        default: {
          stateRef.current = applyInstant(s, op);
          paint();
          const structural = op.k === "split" || op.k === "newview" || op.k === "switchview";
          await sleep(structural ? 420 : 90);
        }
      }
    }

    (async () => {
      try {
        // Never ends: the last op is a long pause, and the reset at the top wipes the session.
        for (;;) {
          for (const op of demo) await step(op);
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
  }, [reduced, sync]);

  const s = stateRef.current;
  const v = view(s);

  return (
    <div ref={rootRef} className="w-full">
      <div
        className="relative rounded-xl border overflow-hidden select-none"
        style={{
          borderColor: "var(--color-border)",
          background: "#0a0a0d",
          boxShadow: "0 24px 70px rgba(0,0,0,0.55)",
        }}
        role="img"
        aria-label="A Cross Platform Terminal session: a release build runs in one pane, a second pane is opened with Ctrl+Shift+T, Claude Code starts in it and the pane picks up an AI badge, then a second view is opened with Alt+T and the first view is returned to with its layout intact."
      >
        <div aria-hidden style={{ fontFamily: "var(--font-mono), ui-monospace, monospace" }}>
          {/* Title bar */}
          <div
            className="flex items-center justify-between px-3 h-8 border-b text-[11px]"
            style={{ background: "#141419", borderColor: "var(--color-border)", color: "var(--color-muted)" }}
          >
            <div className="flex items-center gap-4">
              {/* The product's menu bar is exactly these two — File and View were removed in #6. */}
              {["Widgets", "Settings"].map((m) => (
                <span key={m}>{m}</span>
              ))}
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
                  key={tab.id}
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
              return (
                <div
                  key={p.id}
                  className="relative flex-1 min-w-0 flex flex-col rounded-lg overflow-hidden"
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
                        Terminal {i + 1} <span style={{ opacity: 0.45 }}>&#10005;</span>
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
                  <div
                    className="flex items-center gap-1.5 px-2.5 h-5 text-[10.5px] shrink-0"
                    style={{ background: "#111116", color: "var(--color-muted)" }}
                  >
                    <span style={{ color: "var(--color-accent)" }}>&#9679;</span>
                    <span>Workflows</span>
                  </div>

                  <div className="flex-1 min-h-0 overflow-hidden px-2.5 py-1.5 text-[11px] sm:text-[12px] leading-[1.55]">
                    {p.lines.map((line, li) => (
                      <div key={li} className="whitespace-pre truncate">
                        {line.map((span, si) =>
                          span.prompt ? (
                            <Prompt key={si} />
                          ) : (
                            <span key={si} style={{ color: COLORS[span.c ?? "fg"] }}>
                              {span.t}
                            </span>
                          )
                        )}
                      </div>
                    ))}
                    <div className="whitespace-pre truncate">
                      <Prompt />
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

                  {/*
                   * TerminalWidget::renderAiOverlay draws this in the top-right of the pane that
                   * is running the tool — orange for Claude, blue for Copilot. It is not a
                   * status-bar item, and there is no token counter anywhere in the product.
                   */}
                  {on && v.ai && (
                    <span
                      className="absolute top-8 right-2 flex items-center gap-1.5 px-2 py-1 rounded text-[10px]"
                      style={{
                        background: "rgba(180,100,45,0.78)",
                        color: "#fff",
                        animation: "cpt-pane-in .3s ease both",
                      }}
                    >
                      <span style={{ animation: "cpt-pulse 1.4s ease-in-out infinite" }}>&#9679;</span>
                      {v.ai}
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
          {s.caption}
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

function Prompt() {
  return (
    <>
      <span style={{ color: COLORS.green }}>{HOST}</span>
      <span style={{ color: COLORS.dim }}>:</span>
      <span style={{ color: COLORS.blue }}>{CWD}</span>
      <span style={{ color: COLORS.fg }}>$ </span>
    </>
  );
}
