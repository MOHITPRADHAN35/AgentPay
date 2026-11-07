import { useRef, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { motion, useScroll, useTransform, useInView, useReducedMotion, useMotionValueEvent, type MotionValue } from "motion/react";
import { ArrowDown, ArrowRight, Check, LockKeyhole, ShieldCheck, Wallet, Search, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AGENTS } from "@/lib/agentpay/api";
import { AGENT_ICONS } from "./agent-icons";
import { POLICY_DEFAULTS, formatUSD, requiresOverride } from "@/lib/agentpay/policy";
import { INTRO_SEEN_KEY } from "@/lib/agentpay/intro";
import intelligenceImage from "@/assets/agentpay-intelligence.jpg";
import { useEntryTransition } from "./EntryTransition";

function enterApp() {
  try { sessionStorage.setItem(INTRO_SEEN_KEY, "yes"); } catch { /* Navigation remains available without storage. */ }
}

function EntryButton({ skip = false }: { skip?: boolean }) {
  const { start, active } = useEntryTransition();
  if (skip) return <Button variant="ghost" size="sm" asChild><Link to="/dashboard" onClick={enterApp}>Skip intro<ArrowRight /></Link></Button>;
  return <Button variant="brand" size="lg" onClick={start} disabled={active}>Enter AgentPay<ArrowRight /></Button>;
}

function Chapter({ number, label, title, children, description }: { number: string; label: string; title: string; description: string; children: (progress: MotionValue<number>) => ReactNode }) {
  const ref = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, .32, .75, 1], [80, 0, 0, -60]);
  const opacity = useTransform(scrollYProgress, [0, .22, .78, 1], [.15, 1, 1, .15]);
  const visible = useInView(ref, { amount: .15 });
  return <section ref={ref} className="intro-chapter" aria-labelledby={`chapter-${number}`}>
    <div className="intro-pin">
      <div className="intro-chapter-top"><span>{number} / 07</span><span>{label}</span></div>
      <motion.div className="intro-scene-content" style={reduced ? {} : { y, opacity }}>
        <div className="intro-copy">
          <motion.span className="intro-kicker" animate={{ opacity: visible ? 1 : .4 }} transition={{ duration: reduced ? 0 : .5 }}>{label}</motion.span>
          <h2 id={`chapter-${number}`} className="intro-heading">{title.split(" ").map((word, i) => <motion.span key={`${word}-${i}`} initial={reduced ? false : { opacity: 0, y: 20 }} animate={visible ? { opacity: 1, y: 0 } : { opacity: .25, y: 20 }} transition={{ delay: reduced ? 0 : i * .035, duration: reduced ? 0 : .5 }}>{word} </motion.span>)}</h2>
          <p className="intro-description">{description}</p>
        </div>
        <div className="intro-visual">{children(scrollYProgress)}</div>
      </motion.div>
      <div className="intro-scene-footer"><span>AGENTPAY / AUTONOMOUS COMMERCE</span><ArrowDown className="size-4" /></div>
    </div>
  </section>;
}

const exampleRequest = "Find a reliable USB-C hub. Compare compatibility and total cost. Stay within my spending limits.";
function Delegation({ progress }: { progress: MotionValue<number> }) {
  const reduced = useReducedMotion();
  const [count, setCount] = useState(reduced ? exampleRequest.length : 0);
  const [request, setRequest] = useState("");
  const [editing, setEditing] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  useMotionValueEvent(progress, "change", v => { if (!reduced) setCount(Math.round(Math.min(1, Math.max(0, (v - .2) / .3)) * exampleRequest.length)); });
  return <form className="intro-tool intro-prompt" onSubmit={e => { e.preventDefault(); setSubmitted(true); }}>
    <div className="intro-tool-label"><span className="text-info">●</span> PROCUREMENT REQUEST<span className="ml-auto">PREVIEW</span></div>
    <label className="sr-only" htmlFor="intro-request">Your procurement request</label>
    <textarea id="intro-request" value={editing ? request : exampleRequest.slice(0, count)} onFocus={() => { setRequest(exampleRequest); setEditing(true); }} onChange={e => { setRequest(e.target.value); setSubmitted(false); }} rows={4} className="intro-textarea" />
    <div className="flex items-center justify-between gap-3 border-t border-border pt-5"><span className="text-xs text-muted-foreground">Your intent. Your constraints.</span><Button type="submit" variant="brand" size="icon" aria-label="Preview request" disabled={editing && !request.trim()}><ArrowRight /></Button></div>
    {submitted && <p role="status" className="mt-4 text-sm text-warning">Request captured for this preview. Connect services in the dashboard to run agents.</p>}
  </form>;
}

function Intelligence({ progress }: { progress: MotionValue<number> }) {
  const reduced = useReducedMotion();
  const pathLength = useTransform(progress, [.2, .65], [0, 1]);
  return <div className="intro-network">
    <svg viewBox="0 0 520 380" className="intro-connections" aria-hidden="true">
      {["M260 190 L100 55", "M260 190 L420 55", "M260 190 L100 325", "M260 190 L420 325"].map(d => <motion.path key={d} d={d} fill="none" stroke="var(--info)" strokeWidth="1.5" style={{ pathLength: reduced ? 1 : pathLength }} />)}
    </svg>
    {AGENTS.map((agent, i) => { const Icon = AGENT_ICONS[agent.name]; return <div key={agent.name} className={`intro-agent intro-agent-${i}`}><Icon className="size-6 text-info" /><span>{agent.name}</span><small>{agent.role}</small></div>; })}
  </div>;
}

function Discovery({ progress }: { progress: MotionValue<number> }) {
  const reduced = useReducedMotion();
  const x = useTransform(progress, [.12, .48], [100, 0]);
  const opposite = useTransform(progress, [.12, .5], [-80, 0]);
  return <div className="intro-discovery">
    <div className="intro-tool-label"><Search className="size-4" /> PROVIDER COMPARISON <span className="ml-auto text-emerald-400">API CONNECTED</span></div>
    <div className="intro-provider-grid">{["Product search", "Service discovery"].map((name, i) => <motion.div key={name} className="intro-provider" style={reduced ? {} : { x: i ? x : opposite }}>
      <div className="intro-provider-image">{i ? <SlidersHorizontal /> : <Search />}</div><h3>{name}</h3><p>Awaiting real provider results</p><dl>{["Specifications", "Price + shipping + tax", "Merchant verification"].map(field => <div key={field}><dt>{field}</dt><dd>—</dd></div>)}</dl>
    </motion.div>)}</div><p className="mt-5 text-xs text-muted-foreground">SerpApi discovery → specification and value comparison. No listings or prices are simulated.</p>
  </div>;
}

function Guardrails({ progress }: { progress: MotionValue<number> }) {
  const [amount, setAmount] = useState(0);
  const reduced = useReducedMotion();
  const scaleX = useTransform(progress, [.2, .55], [0, 1]);
  const override = requiresOverride(amount, POLICY_DEFAULTS, POLICY_DEFAULTS.dailyLimit);
  return <div className="intro-tool">
    <div className="intro-tool-label"><ShieldCheck className="size-4 text-info" /> FINANCIAL POLICY<span className="ml-auto">LOCAL PREVIEW</span></div>
    <div className="my-7 flex items-baseline justify-between"><span className="text-muted-foreground">Daily policy limit</span><strong className="font-mono text-3xl">{formatUSD(POLICY_DEFAULTS.dailyLimit)}</strong></div>
    <div className="intro-meter"><motion.div style={{ scaleX: reduced ? 1 : scaleX }} /></div>
    <div className="my-5 flex justify-between text-xs text-muted-foreground"><span>Per transaction</span><span>{formatUSD(POLICY_DEFAULTS.singleTransactionLimit)}</span></div>
    <label htmlFor="intro-amount" className="text-xs text-muted-foreground">Proposed total · {formatUSD(amount)}</label>
    <input id="intro-amount" aria-label="Proposed total" type="range" min="0" max="150" step="1" value={amount} onChange={e => setAmount(Number(e.target.value))} className="mt-3 w-full accent-primary" />
    <div role="status" className={`mt-5 flex items-center gap-2 border-t border-border pt-5 text-sm ${override ? "text-warning" : "text-info"}`}><LockKeyhole className="size-4" />{amount === 0 ? "Set a total to preview policy checks" : override ? "Exceeds policy · explicit override required" : "Within policy · human approval still required"}</div>
    <p className="mt-3 text-xs text-muted-foreground">Default policy preview, not account activity. Live enforcement requires connected services.</p>
  </div>;
}

function Authorization() {
  const [approved, setApproved] = useState(false);
  return <div className="intro-tool intro-authorization">
    <div className="intro-tool-label"><LockKeyhole className="size-4" /> HUMAN AUTHORIZATION<span className="ml-auto text-warning">PREVIEW</span></div>
    <div className="my-8 flex items-center gap-3"><span className="intro-paypal">PayPal</span><span className="border-l border-border pl-3 text-xs text-muted-foreground">Sandbox checkout</span></div>
    <div className="space-y-4 border-y border-border py-5 text-sm"><div className="flex justify-between"><span className="text-muted-foreground">Selected item</span><span>Awaiting selection</span></div><div className="flex justify-between"><span className="text-muted-foreground">Amount to authorize</span><span>—</span></div></div>
    <p className="my-5 text-sm text-muted-foreground">Agents prepare the decision. Only you can authorize the payment.</p>
    <Button variant="brand" className="w-full" onClick={() => setApproved(true)} disabled={approved}>{approved ? <Check /> : <LockKeyhole />}{approved ? "Approval checkpoint acknowledged" : "Try approval checkpoint"}</Button>
    <p role="status" className="mt-4 text-xs text-warning">{approved ? "No payment made. Connect PayPal and select a real item before checkout." : "PayPal is not connected. This preview cannot charge you."}</p>
  </div>;
}

export function CinematicIntro() {
  const hero = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll();
  const { scrollYProgress: heroProgress } = useScroll({ target: hero, offset: ["start start", "end start"] });
  const imageY = useTransform(heroProgress, [0, 1], ["0%", "20%"]);
  const titleY = useTransform(heroProgress, [0, 1], [0, -100]);
  return <div className="intro-theme">
    <header className="intro-header"><Link to="/intro" className="flex items-center gap-2 text-lg font-semibold"><Wallet className="size-5 text-info" />AgentPay<span className="text-muted-foreground">2.0</span></Link><EntryButton skip /></header>
    <motion.div className="intro-progress" style={{ scaleX: scrollYProgress }} />
    <section ref={hero} className="intro-hero">
      <motion.img src={intelligenceImage} width={1920} height={1088} alt="Five linked precision modules representing AgentPay's coordinated agent architecture" className="intro-hero-image" style={reduced ? {} : { y: imageY }} />
      <div className="intro-hero-shade" />
      <motion.div className="intro-hero-copy" style={reduced ? {} : { y: titleY }}>
        <motion.p className="intro-kicker" initial={reduced ? false : { opacity: 0 }} animate={{ opacity: 1 }}>AUTONOMOUS COMMERCE OPERATING SYSTEM</motion.p>
        <motion.h1 initial={reduced ? false : { opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .9 }}>AgentPay<span>2.0</span></motion.h1>
        <h2>Commerce is becoming autonomous.</h2>
        <p>Research. Compare. Evaluate. Purchase.<br />The work is still manual. It doesn’t have to be.</p>
        <div className="mt-7"><EntryButton /></div>
      </motion.div>
      <div className="intro-hero-bottom"><span>01 / 07 — THE SHIFT</span><a href="#delegation" className="flex items-center gap-3">Explore the system <ArrowDown className="size-4" /></a></div>
    </section>
    <div id="delegation"><Chapter number="02" label="THE DELEGATION" title="Just describe what you need." description="Turn a natural-language request into a coordinated procurement plan. Specify the need; keep the constraints.">{p => <Delegation progress={p} />}</Chapter></div>
    <Chapter number="03" label="THE INTELLIGENCE" title="Five agents. One coordinated intelligence." description="Intent, security, discovery, comparison and financial policy. Distinct responsibilities, one deliberate workflow.">{p => <Intelligence progress={p} />}</Chapter>
    <Chapter number="04" label="THE DISCOVERY" title="Real providers. Real comparisons. Better decisions." description="From products to developer services, decisions should be grounded in specifications, merchant trust and the complete cost.">{p => <Discovery progress={p} />}</Chapter>
    <Chapter number="05" label="THE GUARDRAILS" title="Autonomy without losing control." description="Per-transaction limits. Daily boundaries. Shipping and tax included. Financial policy before authorization—not after.">{p => <Guardrails progress={p} />}</Chapter>
    <Chapter number="06" label="THE HUMAN CHECKPOINT" title="The final decision is always yours." description="No silent purchases. Review the item, total and policy checks, then explicitly authorize through PayPal.">{() => <Authorization />}</Chapter>
    <section className="intro-finale"><span className="intro-kicker">07 / 07 — YOUR COMMAND CENTER</span><h2>Delegate the work.<br /><span className="text-info">Control the money.</span></h2><p>AgentPay 2.0</p><EntryButton /><span className="mt-6 text-xs text-muted-foreground">Sandbox workspace · services awaiting connection</span><footer><span>AGENTPAY / INTELLIGENCE WITH BOUNDARIES</span><span>YOUR APPROVAL. ALWAYS.</span></footer></section>
  </div>;
}