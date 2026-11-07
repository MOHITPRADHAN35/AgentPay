import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useNavigate, useRouter } from "@tanstack/react-router";
import { motion, useReducedMotion } from "motion/react";
import { INTRO_SEEN_KEY } from "@/lib/agentpay/intro";

const EntryContext = createContext({ start: () => {}, active: false });
export const useEntryTransition = () => useContext(EntryContext);

// Deterministic, lightly offset lattice: diagonal distance coordinates the heartbeat wave.
const nodes = Array.from({ length: 35 }, (_, index) => {
  const column = index % 7;
  const row = Math.floor(index / 7);
  return { x: 2 + column * 15.2 + (row % 2 ? 3 : 0), y: 3 + row * 23 + (column ? Math.sin(index * 2) * 2 : 0), delay: (column / 6 + row / 4) * .4 };
});

function NeuralCurtain({ onCovered, onDone, revealing }: { onCovered: () => void; onDone: () => void; revealing: boolean }) {
  const reduced = useReducedMotion();
  const covered = useRef(false);
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const htmlOverflow = html.style.overflow;
    const bodyOverflow = body.style.overflow;
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    const prevent = (event: Event) => event.preventDefault();
    const preventKeys = (event: KeyboardEvent) => {
      if (["Tab", " ", "ArrowDown", "ArrowUp", "PageDown", "PageUp", "Home", "End"].includes(event.key)) event.preventDefault();
    };
    window.addEventListener("wheel", prevent, { passive: false });
    window.addEventListener("touchmove", prevent, { passive: false });
    window.addEventListener("keydown", preventKeys);
    return () => {
      html.style.overflow = htmlOverflow;
      body.style.overflow = bodyOverflow;
      window.removeEventListener("wheel", prevent);
      window.removeEventListener("touchmove", prevent);
      window.removeEventListener("keydown", preventKeys);
    };
  }, []);
  return <motion.div className="entry-transition" data-phase={revealing ? "reveal" : "heartbeat"} role="status" aria-label="Entering AgentPay" initial={{ opacity: 1 }} animate={{ opacity: revealing ? 0 : 1 }} transition={{ duration: reduced ? .15 : .3 }} onAnimationComplete={() => { if (revealing) onDone(); }}>
    <motion.div className="entry-cover" initial={reduced ? { opacity: 0 } : { clipPath: "circle(0% at 2% 3%)" }} animate={reduced ? { opacity: 1 } : { clipPath: "circle(150% at 2% 3%)" }} transition={{ duration: reduced ? .15 : 1.4, ease: [.48, 0, .22, 1] }} onAnimationComplete={() => { if (!covered.current) { covered.current = true; onCovered(); } }} />
    {!reduced && <>
      <svg className="entry-connections" aria-hidden="true">
        {nodes.flatMap((node, i) => [i % 7 < 6 ? i + 1 : -1, i < 28 ? i + 7 : -1].filter(index => index >= 0).map(index => {
          const next = nodes[index];
          if (!next) return null;
          return <motion.line key={`${i}-${index}`} x1={`${node.x}%`} y1={`${node.y}%`} x2={`${next.x}%`} y2={`${next.y}%`} initial={{ opacity: 0, pathLength: 0 }} animate={{ opacity: [0, .55, .16], pathLength: 1 }} transition={{ duration: .5, delay: .12 + next.delay, ease: "easeOut" }} />;
        }))}
      </svg>
      {nodes.map((node, i) => <motion.span key={i} className={`entry-neuron ${i === 0 ? "entry-origin" : ""}`} style={{ left: `${node.x}%`, top: `${node.y}%` }} initial={{ opacity: 0, scale: .1, y: -4 }} animate={{ opacity: [0, 1, .5, 1, .35], scale: [.1, 1.5, .7, 1.15, .8], y: 0 }} transition={{ duration: i === 0 ? 1.5 : .7, delay: node.delay * 1.05, times: [0, .2, .38, .55, 1], ease: "easeInOut" }} />)}
    </>}
    <span className="sr-only">Entering AgentPay</span>
  </motion.div>;
}

export function EntryTransitionProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const router = useRouter();
  useEffect(() => {
    void router.preloadRoute({ to: "/dashboard" }).catch(() => { /* Optional warm-up; navigation still works. */ });
  }, [router]);
  const [active, setActive] = useState(false);
  const [revealing, setRevealing] = useState(false);
  const running = useRef(false);
  async function onCovered() {
    try { sessionStorage.setItem(INTRO_SEEN_KEY, "yes"); } catch { /* Optional navigation preference. */ }
    try {
      await navigate({ to: "/dashboard" });
      // Keep the opaque curtain while the new route paints underneath it.
      await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    } finally { setRevealing(true); }
  }
  function start() {
    if (running.current) return;
    running.current = true;
    void router.preloadRoute({ to: "/dashboard" }).catch(() => { /* Navigation retains its own error boundary. */ });
    setRevealing(false);
    setActive(true);
  }
  function finish() { setActive(false); running.current = false; }
  return <EntryContext.Provider value={{ start, active }}>
    <div inert={active} aria-hidden={active ? true : undefined}>{children}</div>
    {active && <NeuralCurtain onCovered={() => { void onCovered(); }} onDone={finish} revealing={revealing} />}
  </EntryContext.Provider>;
}