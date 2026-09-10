"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  AGENT_BADGE,
  CWD,
  HOST,
  ATTACHED_LINES,
  MENUS,
  SESSIONS_FOOTER,
  DETACHED_ROW,
  SESSION_ROWS,
  SETTINGS_CHECKS,
  demos,
  inventories,
  type AgentState,
  type Color,
  type Demo,
  type InventoryItem,
  type Line,
  type Op,
  type RailSide,
  type SessionRow,
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

type Agent = { tool: string; state: AgentState };
type Pane = { id: number; kind: "term" | "inventory"; cwd: string; ai: Agent | null; lines: Line[]; input: string };
/** One edge rail: the widget parked on it, and whether its dock is expanded. */
type Rail = { widget: string | null; open: boolean };

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
  /** The edge rails (#119). Only the two the demo docks onto; the product also has a right rail. */
  rails: Record<RailSide, Rail>;
  /** A widget picked up by its tab and in flight between the view and a rail. */
  drag: { pane: number; label: string; over: RailSide | null } | null;
  /** The Terminal Sessions modal: whether it is up, and the rows it lists. */
  sessions: { open: boolean; rows: SessionRow[] };
  /** The Settings → Widgets window, and the one checkbox the demo touches. */
  settings: { open: boolean; persistent: boolean };
  /** The "still running — close anyway?" question, when a pane has raised it. */
  closeAsk: { pane: number; name: string; process: string } | null;
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
    rails: {
      left: { widget: null, open: false },
      right: { widget: null, open: false },
      bottom: { widget: null, open: false },
    },
    drag: null,
    sessions: { open: false, rows: SESSION_ROWS },
    settings: { open: false, persistent: false },
    closeAsk: null,
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
      pane(s).ai = op.tool ? { tool: op.tool, state: op.state ?? "working" } : null;
      return s;
    case "agent": {
      // The badge belongs to the widget running the agent, not to whatever has focus — the same
      // per-widget rule `renderAiOverlay` follows.
      for (const v of s.views) {
        const p = v.panes.find((q) => q.ai);
        if (p?.ai) p.ai = { ...p.ai, state: op.state };
      }
      return s;
    }
    case "rail": {
      const rail = s.rails[op.side];
      s.rails = { ...s.rails, [op.side]: { widget: op.widget ?? rail.widget, open: op.open } };
      return s;
    }
    case "dialog":
      s.sessions = { ...s.sessions, open: op.open };
      return s;
    case "settings":
      s.settings = { ...s.settings, open: op.open };
      return s;
    case "persist":
      s.settings = { ...s.settings, persistent: op.on };
      return s;
    case "closeask": {
      const v = view(s);
      const p = v.panes[op.pane];
      if (!p) return s;
      const termNo = v.panes.slice(0, op.pane + 1).filter((q) => q.kind === "term").length;
      s.closeAsk = { pane: op.pane, name: `Terminal ${termNo}`, process: op.process };
      return s;
    }
    case "closeanswer": {
      const ask = s.closeAsk;
      s.closeAsk = null;
      if (!ask || op.answer === "cancel") return s;

      const v = view(s);
      v.panes = v.panes.filter((_, i) => i !== ask.pane);
      v.active = Math.min(v.active, Math.max(v.panes.length - 1, 0));

      // "Keep running" closes the pane only and leaves the session in the daemon; "End session"
      // stops the shell, so nothing is left to list.
      if (op.answer === "keep") {
        s.sessions = { ...s.sessions, rows: [...s.sessions.rows, DETACHED_ROW] };
      }
      return s;
    }
    case "attach": {
      // What the dialog's "Open" button does: a new terminal appears in the view showing that
      // session, and the row stops being detached. The shell itself is untouched.
      const v = view(s);
      const row = s.sessions.rows.find((r) => r.id === op.session);
      v.panes = [
        ...v.panes,
        { id: s.nextId++, kind: "term", cwd: row?.dir ?? CWD, ai: null, lines: ATTACHED_LINES, input: "" },
      ];
      v.active = v.panes.length - 1;
      s.sessions = {
        ...s.sessions,
        rows: s.sessions.rows.map((r) => (r.id === op.session ? { ...r, state: "open here" } : r)),
      };
      return s;
    }
    case "drag":
      s.drag = { pane: op.pane, label: op.label, over: null };
      return s;
    case "dragover":
      if (s.drag) s.drag = { ...s.drag, over: op.side };
      return s;
    case "drop": {
      const drag = s.drag;
      s.drag = null;
      if (!drag?.over) return s;
      // The widget leaves the view and arrives on the rail with its dock open — one object
      // moving, which is why the product does not call onClose(): a terminal keeps its shell.
      const v = view(s);
      v.panes = v.panes.filter((_, i) => i !== drag.pane);
      v.active = Math.min(v.active, Math.max(v.panes.length - 1, 0));
      s.rails = { ...s.rails, [drag.over]: { widget: drag.label, open: true } };
      return s;
    }
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
  // A drag is an input affordance like the others: a still frame never shows one mid-flight.
  s.drag = null;
  // Nor an unanswered question.
  s.closeAsk = null;
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

/*
 * The `?clip=` parameter as an external store, so the picker can read it without setting state
 * in an effect. `history.replaceState` fires no event of its own, hence the local listener set
 * alongside `popstate`.
 */
const clipParamListeners = new Set<() => void>();

function subscribeToClipParam(onChange: () => void): () => void {
  clipParamListeners.add(onChange);
  window.addEventListener("popstate", onChange);
  return () => {
    clipParamListeners.delete(onChange);
    window.removeEventListener("popstate", onChange);
  };
}

/** Returns a string or null, so `useSyncExternalStore` compares snapshots by value. */
function readClipParam(): string | null {
  return new URLSearchParams(window.location.search).get("clip");
}

function emitClipParamChange(): void {
  for (const listener of clipParamListeners) listener();
}

export default function TerminalDemo() {
  const clips = demos;
  /*
   * Which clip is showing is held in the URL — `?clip=<id>` — not in component state, so a clip
   * can be linked to from the changelog, a support reply or a post.
   *
   * Two decisions worth keeping:
   *
   * **Not `useSearchParams`.** In a prerendered route it forces the client component tree up to
   * the nearest Suspense boundary to be *client-side rendered*, which would pull this component,
   * its still frame and the text alternative below it out of the served HTML — exactly the
   * content that alternative exists to put there. The parameter is not worth the page.
   *
   * **Not `useState` synced by an effect.** Setting state in an effect body causes the cascading
   * render `react-hooks/set-state-in-effect` warns about. `useSyncExternalStore` is the sanctioned
   * primitive for reading a browser API, and it gets Back and Forward right for nothing: the
   * subscription listens for `popstate` as well as our own writes.
   *
   * The server snapshot is `null`, so the prerendered HTML is always the first clip and hydration
   * cannot mismatch. A deep link therefore paints clip 0 for one frame and then swaps — a
   * visitor sees a flick, a crawler sees the whole page, which is the right way round.
   */
  const clipId = useSyncExternalStore(subscribeToClipParam, readClipParam, () => null);
  const pick = Math.max(
    0,
    clips.findIndex((d) => d.id === clipId)
  );

  /** Selects a clip by rewriting the URL. No navigation, and no history entry per click. */
  const choose = useCallback(
    (i: number) => {
      const url = new URL(window.location.href);
      // The first clip is the default, so it needs no parameter — a bare `/` stays the tidy URL.
      if (i === 0) url.searchParams.delete("clip");
      else url.searchParams.set("clip", clips[i].id);
      window.history.replaceState(null, "", url);
      // replaceState fires no event, so the store has to be told.
      emitClipParamChange();
    },
    [clips]
  );
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
                onClick={() => choose(i)}
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
        aria-label={`A Cross Platform Terminal session, showing "${active.label}": ${active.blurb}`}
      >
        <div aria-hidden style={{ fontFamily: "var(--font-mono), ui-monospace, monospace" }}>
          {/* Title bar */}
          <div
            // z-20 so an open menu paints over the tab strip and panes that follow it in the DOM.
            className="relative z-20 flex items-center justify-between px-3 h-8 border-b text-[11px]"
            style={{ background: "#141419", borderColor: "var(--color-border)", color: "var(--color-muted)" }}
          >
            <div className="relative flex items-center gap-4">
              {/*
               * The app mark. Four rounded squares at the far left of the title bar, ahead of the
               * menus — the same mark as this site's own icon. Colours sampled from a capture of
               * the shipped v0.5.6 build.
               */}
              <span className="grid grid-cols-2 gap-[1.5px] shrink-0" aria-hidden>
                {["#34D399", "#60A5FA", "#A78BFA", "#FBBF24"].map((c) => (
                  <span key={c} className="w-[5px] h-[5px] rounded-[1px]" style={{ background: c }} />
                ))}
              </span>
              {/* The left menu bar is exactly these two — File and View were removed in #6. View
                * came back in #114, but as a right-anchored pill by the window buttons rather than
                * a third menu here; it is drawn in the right-hand cluster below. */}
              {/*
               * Each menu owns its own dropdown, so the panel opens under the label that was
               * clicked. It used to be one absolutely-positioned panel pinned to the left edge,
               * which was fine while only Widgets ever opened.
               */}
              {(["Widgets", "Settings"] as const).map((m) => (
                <span
                  key={m}
                  data-ptr={m === "Widgets" ? "menu-widgets" : "menu-settings"}
                  className="relative px-1 rounded-sm"
                  style={
                    s.menu?.name === m
                      ? { background: "#2f2f2f", color: "var(--color-foreground)" }
                      : undefined
                  }
                >
                  {m}
                  {/* Items come from TitleBar.cpp, in the order it declares them. */}
                  {s.menu?.name === m && (
                    <div
                      className="absolute top-full left-0 mt-1 min-w-[136px] rounded-sm border py-1 z-30"
                      style={{ background: "#1f1f1f", borderColor: "#3c3c3c" }}
                    >
                      {MENUS[m].map((item, i) =>
                        item === null ? (
                          <div
                            key={`sep-${i}`}
                            className="my-1 border-t"
                            style={{ borderColor: "#3c3c3c" }}
                          />
                        ) : (
                          <div
                            key={item}
                            data-ptr={
                              item === "AI Inventory"
                                ? "menu-ai-inventory"
                                : item === "Terminal Sessions"
                                  ? "menu-terminal-sessions"
                                  : // The Settings menu has its own "Widgets" item, distinct
                                    // from the Widgets menu in the bar next to it.
                                    m === "Settings" && item === "Widgets"
                                    ? "menu-widgets-item"
                                    : undefined
                            }
                            className="px-3 py-0.5 whitespace-nowrap"
                            style={{
                              background: s.menu?.highlight === item ? "#1f3a58" : "transparent",
                              color:
                                s.menu?.highlight === item ? "#cfe0f0" : "var(--color-muted)",
                            }}
                          >
                            {item}
                          </div>
                        )
                      )}
                    </div>
                  )}
                </span>
              ))}
            </div>
            <div className="flex items-center gap-3 text-[10px]">
              {/*
               * The View menu (#114). Right-anchored, just left of the window buttons, and styled
               * as a dimmer pill with a chevron so it reads as a view control rather than another
               * app menu — TitleBar.cpp:181. It holds Redistribute Layout and Auto Layout Mode.
               * Never opened by the demo; it is here because the product's title bar has it.
               */}
              <span
                className="flex items-center gap-1 rounded-sm border px-1.5 py-0.5 text-[10px]"
                style={{ borderColor: "#3c3c3c", color: "var(--color-muted)", opacity: 0.85 }}
              >
                View
                <span style={{ fontSize: "7px", opacity: 0.8 }}>&#9660;</span>
              </span>
              <span style={{ opacity: 0.7 }}>&#8211;</span>
              <span style={{ opacity: 0.7 }}>&#9723;</span>
              <span style={{ opacity: 0.7 }}>&#10005;</span>
            </div>
          </div>

          {/*
           * Everything between the title bar and the status bar, at a fixed height so opening a
           * dock redistributes the space instead of resizing the frame.
           *
           * The geometry is EdgeLayout's: the bottom band spans the full width, and the left rail
           * is inset above it. That is why the view tab strip starts to the *right* of the left
           * dock rather than running the whole way across.
           */}
          <div
            className="flex flex-col h-[248px] sm:h-[300px] lg:h-[336px]"
            style={{ background: "#1a1a1a" }}
          >
            <div className="flex flex-1 min-h-0">
              {/*
               * Left rail. An empty rail takes no space — *except* while a drag is in flight,
               * when the product shows every rail so there is somewhere to drop
               * (`EdgeRailManager.cpp:386`). The whole strip is the drop target, not the button,
               * which is why `data-ptr` sits on the strip: an empty rail has no button to aim at.
               */}
              {(s.rails.left.widget || s.drag) && (
                <div
                  data-ptr="rail-left"
                  className="flex flex-col items-center pt-1.5 shrink-0 border-r"
                  style={{
                    width: 20,
                    background: s.drag?.over === "left" ? "var(--color-accent-dim)" : "#191c21",
                    borderColor:
                      s.drag?.over === "left" ? "var(--color-accent)" : "var(--color-border)",
                    boxShadow:
                      s.drag?.over === "left" ? "inset 0 0 0 1px var(--color-accent)" : undefined,
                    transition: "background .18s, border-color .18s",
                  }}
                >
                  {s.rails.left.widget && (
                    <span
                      className="flex items-center justify-center rounded-sm"
                      style={{
                        width: 15,
                        height: 15,
                        background: s.rails.left.open ? "var(--color-accent-dim)" : "transparent",
                        color: s.rails.left.open ? "var(--color-accent)" : "var(--color-muted)",
                        transition: "background .2s, color .2s",
                      }}
                    >
                      <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" d="M4 6h16M4 12h16M4 18h16" />
                      </svg>
                    </span>
                  )}
                </div>
              )}

              {/*
               * The left dock. Wider on a phone than on a desktop, for the same reason the
               * inventory *pane* is: below `sm` a third of the frame is a few characters across.
               * It must not be hidden on mobile — the caption promises a dock sliding out, so
               * hiding it would narrate something the visitor cannot see.
               */}
              {s.rails.left.open && s.rails.left.widget && (
                <div
                  className="flex flex-col shrink-0 border-r overflow-hidden w-[52%] sm:w-[34%]"
                  style={{
                    background: "#0a0a0d",
                    borderColor: "var(--color-border)",
                    animation: "cpt-pane-in .3s ease both",
                  }}
                >
                  <RailDockHeader name={s.rails.left.widget} />
                  <InventoryPanel repo={s.inventoryRepo} scanning={s.scanning} />
                </div>
              )}

              <div className="flex flex-col flex-1 min-w-0">
          {/* View tabs */}
          <div
            className="flex items-end h-8 px-1 border-b text-[11px] gap-0.5 shrink-0"
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
          <div className="flex gap-2 p-2 flex-1 min-h-0">
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
                    // A pane whose tab is being dragged reads as lifted out of the layout.
                    opacity: s.drag?.pane === i ? 0.45 : 1,
                    transition: "opacity .2s",
                    animation: "cpt-pane-in .42s ease both",
                  }}
                >
                  <div
                    className="flex items-center justify-between gap-2 px-2.5 h-6 text-[10.5px] shrink-0"
                    style={{ background: "#1c1c1c", color: "var(--color-muted)" }}
                  >
                    <span className="flex items-center gap-1.5 min-w-0">
                      {/*
                       * The tab is the drag handle: `WidgetTabBar.cpp:204` makes it a drag
                       * source handing the rails the same payload a rail button does.
                       */}
                      <span
                        data-ptr={`panetab-${i}`}
                        className="truncate px-1"
                        style={{
                          color: on ? "var(--color-foreground)" : "var(--color-muted)",
                          // WidgetTabBar.cpp — "Active: blue top accent".
                          borderTop: `2px solid ${on ? "var(--color-pane-tab)" : "transparent"}`,
                        }}
                      >
                        {isInv ? "AI Inventory 1" : `Terminal ${termNo}`}{" "}
                        <span data-ptr={`paneclose-${i}`} style={{ opacity: 0.45 }}>
                          &#10005;
                        </span>
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
                   * is running the tool. It is not a status-bar item, and there is no token
                   * counter anywhere in the product.
                   *
                   * The colour says the *state*, not the vendor — this used to be orange "for
                   * Claude", which inverted the rule the product states outright. Working is
                   * blue, awaiting-input amber, finished green, failed red, and the three
                   * non-working states reword the label rather than showing the CLI's title.
                   */}
                  {p.ai && !isInv && (
                    <span
                      className="absolute top-8 right-2 flex items-center gap-1.5 px-2 py-1 rounded text-[10px]"
                      style={{
                        background: AGENT_BADGE[p.ai.state].bg,
                        color: "#fff",
                        transition: "background .35s ease",
                        animation: "cpt-pane-in .3s ease both",
                      }}
                    >
                      {p.ai.state === "working" && (
                        <span style={{ animation: "cpt-pulse 1.4s ease-in-out infinite" }}>&#9679;</span>
                      )}
                      {p.ai.tool}
                      {AGENT_BADGE[p.ai.state].suffix}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
              </div>

              {/*
               * The right rail. The demo never docks anything here, but the product has three
               * rails and reveals all of them during a drag, so hiding this one would understate
               * where a widget can go.
               */}
              {s.drag && (
                <div
                  data-ptr="rail-right"
                  className="shrink-0 border-l"
                  style={{
                    width: 20,
                    background: s.drag.over === "right" ? "var(--color-accent-dim)" : "#191c21",
                    borderColor:
                      s.drag.over === "right" ? "var(--color-accent)" : "var(--color-border)",
                    transition: "background .18s, border-color .18s",
                  }}
                />
              )}
            </div>

            {/* Bottom band: dock above its rail, both spanning the full width. */}
            {s.rails.bottom.open && s.rails.bottom.widget && (
              <div
                className="flex flex-col shrink-0 border-t overflow-hidden"
                style={{
                  height: "38%",
                  background: "#0a0a0d",
                  borderColor: "var(--color-border)",
                  animation: "cpt-pane-in .3s ease both",
                }}
              >
                <RailDockHeader name={s.rails.bottom.widget} />
                <InventoryPanel repo={s.inventoryRepo} scanning={s.scanning} />
              </div>
            )}

            {(s.rails.bottom.widget || s.drag) && (
              <div
                data-ptr="rail-bottom"
                className="flex items-center px-1.5 shrink-0 border-t"
                style={{
                  height: 20,
                  background: s.drag?.over === "bottom" ? "var(--color-accent-dim)" : "#191c21",
                  borderColor:
                    s.drag?.over === "bottom" ? "var(--color-accent)" : "var(--color-border)",
                  boxShadow:
                    s.drag?.over === "bottom" ? "inset 0 0 0 1px var(--color-accent)" : undefined,
                  transition: "background .18s, border-color .18s",
                }}
              >
                {/* A horizontal rail has room for the widget's name; a vertical one does not. */}
                {s.rails.bottom.widget && (
                  <span
                    className="flex items-center gap-1 px-1.5 rounded-sm text-[10px]"
                    style={{
                      background: s.rails.bottom.open ? "var(--color-accent-dim)" : "transparent",
                      color: s.rails.bottom.open ? "var(--color-accent)" : "var(--color-muted)",
                      transition: "background .2s, color .2s",
                    }}
                  >
                    <svg className="w-2 h-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                      <rect x="3" y="4" width="18" height="16" rx="2" />
                      <path strokeLinecap="round" d="M3 14h18" />
                    </svg>
                    {s.rails.bottom.widget}
                  </span>
                )}
              </div>
            )}
          </div>

          {/*
           * Settings → Widgets. Drawn from a capture of the shipped build: a sidebar tree
           * (Appearance / Terminal › Settings, Shortcuts / AI Inventory › Shortcuts) beside a
           * scrolling pane of sections, with blue ticked checkboxes.
           *
           * Only the Terminal section is shown, and only the three checkboxes around the one the
           * clip is about — `SettingsWindow.cpp` lists them in this order, and the tooltip on
           * the last one is why the clip opens its terminal *after* ticking it.
           */}
          {s.settings.open && (
            <div
              className="absolute inset-0 z-30 flex items-start justify-center pt-8 px-3"
              style={{ background: "rgba(0,0,0,0.35)" }}
            >
              <div
                className="w-full max-w-[500px] rounded-md border overflow-hidden"
                style={{
                  background: "#1f2126",
                  borderColor: "#3c3c3c",
                  boxShadow: "0 18px 50px rgba(0,0,0,0.55)",
                  animation: "cpt-pane-in .22s ease both",
                }}
              >
                <div
                  className="flex items-center justify-between px-3 h-7 text-[11px]"
                  style={{ background: "#23262c", color: "var(--color-foreground)" }}
                >
                  <span>Settings - Widgets</span>
                  <span data-ptr="settings-close" className="px-1" style={{ opacity: 0.75 }}>
                    &#10005;
                  </span>
                </div>

                <div className="flex text-[10px]" style={{ minHeight: 128 }}>
                  <div
                    className="w-[112px] shrink-0 border-r py-2 px-2 flex flex-col gap-1"
                    style={{ borderColor: "#3c3c3c", color: "var(--color-muted)" }}
                  >
                    <span>Appearance</span>
                    <span>&#9660; Terminal</span>
                    <span
                      className="px-1.5 rounded-sm"
                      style={{ background: "#3a4351", color: "var(--color-foreground)" }}
                    >
                      Settings
                    </span>
                    <span className="pl-2">Shortcuts</span>
                    <span>&#9660; AI Inventory</span>
                    <span className="pl-2">Shortcuts</span>
                  </div>

                  <div className="flex-1 min-w-0 py-2 px-3">
                    <p className="mb-2" style={{ color: "var(--color-foreground)" }}>
                      Terminal
                    </p>
                    <div className="flex flex-col gap-2">
                      {SETTINGS_CHECKS.map((c) => (
                        <Check key={c.label} on={c.on} label={c.label} />
                      ))}
                      <Check
                        ptr="chk-persist"
                        on={s.settings.persistent}
                        label="Keep shells running when the app closes"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/*
           * The "still running" question (#121). Wording, button labels and their key hints are
           * verbatim from `TerminalWidget::renderCloseConfirm`; "Keep running" is the primary
           * button and "End session" the destructive one, which is the product's own emphasis.
           *
           * The product only asks this for a daemon-backed session, which is exactly why this
           * beat comes after the checkbox in the clip.
           */}
          {s.closeAsk && (
            <div
              className="absolute inset-0 z-40 flex items-center justify-center px-4"
              style={{ background: "rgba(0,0,0,0.45)" }}
            >
              <div
                className="w-full max-w-[400px] rounded-md border overflow-hidden"
                style={{
                  background: "#1f2126",
                  borderColor: "#3c3c3c",
                  boxShadow: "0 18px 50px rgba(0,0,0,0.6)",
                  animation: "cpt-pane-in .2s ease both",
                }}
              >
                <div
                  className="px-3 h-7 flex items-center text-[11px]"
                  style={{ background: "#23262c", color: "var(--color-foreground)" }}
                >
                  Close {s.closeAsk.name}?
                </div>
                <div className="p-3 text-[10px] leading-relaxed">
                  <p style={{ color: "var(--color-foreground)" }}>
                    &apos;{s.closeAsk.process}&apos; is still running in this terminal.
                  </p>
                  <p className="mt-2" style={{ color: "var(--color-muted)" }}>
                    Keeping it running closes the pane only - the session stays in Terminal
                    Sessions, where it can be opened again. Ending it stops the shell and
                    everything in it.
                  </p>
                  <div className="mt-3 flex gap-2">
                    <span
                      data-ptr="close-keep"
                      className="px-2 py-1 rounded-sm"
                      style={{ background: "var(--color-accent)", color: "#141013" }}
                    >
                      Keep running (K)
                    </span>
                    <span
                      className="px-2 py-1 rounded-sm"
                      style={{ background: "#a03731", color: "#fff" }}
                    >
                      End session (E)
                    </span>
                    <span
                      className="px-2 py-1 rounded-sm"
                      style={{ background: "#3a3f47", color: "var(--color-foreground)" }}
                    >
                      Cancel (Esc)
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/*
           * The Terminal Sessions modal (Settings → Terminal Sessions, or `--show-sessions`).
           *
           * Columns, button labels, the four possible State values and the footer line are all
           * taken from a capture of the shipped build with a daemon holding real sessions —
           * `SessionsWindow::render`. `Open` is disabled for a row already on screen, which is
           * why reattaching flips the row to "open here" and greys its button.
           *
           * It floats over the workspace rather than inside it: in the product this is a real
           * ImGui window, and the app carries on behind it.
           */}
          {s.sessions.open && (
            <div
              className="absolute inset-0 z-30 flex items-start justify-center pt-10 px-3"
              style={{ background: "rgba(0,0,0,0.35)" }}
            >
              <div
                className="w-full max-w-[520px] rounded-md border overflow-hidden"
                style={{
                  background: "#1f2126",
                  borderColor: "#3c3c3c",
                  boxShadow: "0 18px 50px rgba(0,0,0,0.55)",
                  animation: "cpt-pane-in .22s ease both",
                }}
              >
                <div
                  className="flex items-center justify-between px-3 h-7 text-[11px]"
                  style={{ background: "#23262c", color: "var(--color-foreground)" }}
                >
                  <span>Terminal Sessions</span>
                  <span data-ptr="dialog-close" className="px-1" style={{ opacity: 0.75 }}>
                    &#10005;
                  </span>
                </div>

                <div className="p-2.5">
                  <div className="text-[10px]">
                    <div
                      className="grid grid-cols-[46px_42px_1fr_30px_62px_74px] gap-x-1.5 px-1.5 py-1 border-b"
                      style={{ borderColor: "#3c3c3c", color: "var(--color-foreground)" }}
                    >
                      <span>Session</span>
                      <span>Shell</span>
                      <span>Directory</span>
                      <span>Age</span>
                      <span>State</span>
                      <span />
                    </div>
                    {s.sessions.rows.map((r, i) => {
                      const here = r.state === "open here";
                      return (
                        <div
                          key={r.id}
                          className="grid grid-cols-[46px_42px_1fr_30px_62px_74px] gap-x-1.5 items-center px-1.5 py-1 border-b"
                          style={{
                            borderColor: "#33363c",
                            background: i % 2 ? "#24272d" : "transparent",
                            color: "var(--color-muted)",
                          }}
                        >
                          <span>{r.id}</span>
                          <span>{r.shell}</span>
                          <span className="truncate">{r.dir}</span>
                          <span>{r.age}</span>
                          <span
                            style={{
                              color: r.state === "detached" ? "var(--color-accent)" : undefined,
                            }}
                          >
                            {r.state}
                          </span>
                          <span className="flex gap-1">
                            <span
                              data-ptr={here ? undefined : `sess-open-${r.id}`}
                              className="px-1.5 rounded-sm"
                              style={{
                                background: here ? "#2a2d33" : "#3a3f47",
                                color: here ? "#6b6f77" : "var(--color-foreground)",
                              }}
                            >
                              Open
                            </span>
                            <span
                              className="px-1.5 rounded-sm"
                              style={{ background: "#3a3f47", color: "var(--color-foreground)" }}
                            >
                              End
                            </span>
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  <p className="mt-2 text-[9.5px] leading-snug" style={{ color: "#6b6f77" }}>
                    {SESSIONS_FOOTER}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Status bar */}
          <div
            className="flex items-center justify-between px-3 h-7 border-t text-[10.5px]"
            style={{ background: "#141419", borderColor: "var(--color-border)", color: "var(--color-muted)" }}
          >
            {/*
             * Rewritten for #128, against a capture of the shipped build: a blue dot, the active
             * view's name bright, then the counts, dot-separated and muted. It used to read
             * `Views: 1 | Active: Main | Widgets: 2`, which is the pre-#128 status bar.
             */}
            <span className="truncate flex items-center gap-1.5">
              <span style={{ color: "#64A5EB" }}>&#9679;</span>
              <span style={{ color: "var(--color-foreground)" }}>{v.name}</span>
              <span style={{ opacity: 0.55 }}>
                &middot; {v.panes.length} {v.panes.length === 1 ? "widget" : "widgets"} &middot;{" "}
                {s.views.length} {s.views.length === 1 ? "view" : "views"}
              </span>
            </span>
            <span className="flex items-center gap-2 shrink-0">
              {/*
               * #128 turned the always-present `[]` key readout into a pill that appears only
               * while a key is actually held. Nothing is drawn here at rest.
               */}
              {s.keys && (
                <span
                  className="px-1.5 py-0.5 rounded"
                  style={{ background: "#31353d", color: "var(--color-foreground)" }}
                >
                  {s.keys.join("+")}
                </span>
              )}
              <span className="flex items-center gap-1">
                100% <span style={{ fontSize: "7px", opacity: 0.7 }}>&#9660;</span>
              </span>
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
            {/*
             * What is being carried. ImGui draws the drag payload under the cursor; without
             * something here the pane would simply dim and the widget would arrive on the rail
             * with nothing visibly crossing the gap.
             */}
            {s.drag && (
              <span
                className="absolute whitespace-nowrap px-1.5 py-0.5 rounded text-[10px]"
                style={{
                  left: 12,
                  top: 12,
                  background: "var(--color-accent-dim)",
                  color: "var(--color-accent)",
                  border: "1px solid var(--color-accent)",
                }}
              >
                {s.drag.label}
              </span>
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

      {/*
       * The demo in words.
       *
       * The frame above is `role="img"` — correct, because a simulated terminal is a picture of
       * the product rather than readable content — and only the *selected* clip is ever in the
       * DOM. Between them that means four fifths of what the demo says reaches no crawler, no
       * assistant and no screen reader. This is the text equivalent: every clip's blurb and its
       * narration, server-rendered.
       *
       * It is derived from `demos`, so it cannot drift from the clips: a caption edited above is
       * an edit here too.
       *
       * What is deliberately *not* done: rendering all five simulated frames into the DOM and
       * hiding four. That is five times the markup to publish `cargo build --release` as
       * keyword text, and `role="img"` would suppress it anyway. The sentences are the part
       * worth reading.
       */}
      <details className="mt-4 group">
        <summary
          className="cursor-pointer list-none text-xs cpt-quiet inline-flex items-center gap-1.5"
          style={{ color: "var(--color-muted)" }}
        >
          <span>What the demo shows, in words</span>
          <svg
            className="w-3 h-3 transition-transform group-open:rotate-180"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </summary>
        <ol className="mt-3 flex flex-col gap-3">
          {clips.map((d) => (
            <li key={d.id} className="text-xs leading-relaxed">
              <span style={{ color: "var(--color-foreground)" }}>{d.label}</span>
              <span style={{ color: "var(--color-muted)" }}> — {d.blurb} </span>
              <span style={{ color: "var(--color-muted)", opacity: 0.8 }}>
                {d.script
                  .filter((op): op is Extract<Op, { k: "caption" }> => op.k === "caption")
                  .map((op) => op.text)
                  .join(" ")}
              </span>
            </li>
          ))}
        </ol>
      </details>
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

/**
 * A rail dock's header. In the product every dock has one: the widget's name on the left, and an
 * auto-hide toggle and a close button on the right. Taken from a capture of the shipped build.
 */
/** A settings checkbox: a filled blue box with a tick when on, an empty one when off. */
function Check({ on, label, ptr }: { on: boolean; label: string; ptr?: string }) {
  return (
    <span className="flex items-start gap-2" style={{ color: "var(--color-muted)" }}>
      <span
        data-ptr={ptr}
        className="flex items-center justify-center shrink-0 rounded-[2px] mt-[1px]"
        style={{
          width: 11,
          height: 11,
          background: on ? "#4a90e2" : "#2a2d33",
          border: on ? "none" : "1px solid #4a4f57",
          transition: "background .18s",
        }}
      >
        {on && (
          <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={4}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </span>
      <span>{label}</span>
    </span>
  );
}

function RailDockHeader({ name }: { name: string }) {
  return (
    <div
      className="flex items-center justify-between gap-2 px-2 h-6 shrink-0 text-[10.5px]"
      style={{ background: "#1c1c1c", color: "var(--color-foreground)" }}
    >
      <span className="flex items-center gap-1.5 min-w-0 truncate">
        <svg className="w-2.5 h-2.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
        {name}
      </span>
      <span className="flex items-center gap-2 shrink-0" style={{ opacity: 0.5 }}>
        <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" d="M12 17v5M9 3h6l-1 6 3 3H7l3-3-1-6z" />
        </svg>
        <span>&#10005;</span>
      </span>
    </div>
  );
}

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
