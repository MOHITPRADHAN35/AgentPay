import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { CornerDownLeft, Loader2, Sparkles, Sliders, ExternalLink, Key, Check } from "lucide-react";
import { Magnetic } from "./primitives";
import { CATALOG } from "@/lib/catalog";
import { usd } from "./format";

export function AgentDispatchConsole({
  value,
  onChange,
  onDispatch,
  busy,
  selected,
  onSelect,
}: {
  value: string;
  onChange: (v: string) => void;
  onDispatch: (apiKey?: string, provider?: string) => void;
  busy: boolean;
  selected: string | null;
  onSelect: (sku: string, prompt: string) => void;
}) {
  const max = 500;
  const [showConfig, setShowConfig] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [provider, setProvider] = useState("groq");
  const [savedBadge, setSavedBadge] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedKey = localStorage.getItem("agentpay_llm_key") || "";
      const storedProv = localStorage.getItem("agentpay_llm_provider") || "groq";
      setApiKey(storedKey);
      setProvider(storedProv);
    }
  }, []);

  const handleSaveConfig = () => {
    if (typeof window !== "undefined") {
      localStorage.setItem("agentpay_llm_key", apiKey.trim());
      localStorage.setItem("agentpay_llm_provider", provider);
      setSavedBadge(true);
      setTimeout(() => setSavedBadge(false), 2000);
    }
  };

  const handleClearKey = () => {
    setApiKey("");
    if (typeof window !== "undefined") {
      localStorage.removeItem("agentpay_llm_key");
    }
  };

  return (
    <section
      aria-labelledby="dispatch-title"
      className="panel flex flex-col rounded-2xl p-6 md:p-7"
    >
      <div className="flex items-baseline justify-between">
        <h2 id="dispatch-title" className="font-display text-xl font-bold">
          Agent dispatch console
        </h2>
        <span className="meta">01 / Instruct</span>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Describe a purchase. The agent resolves it against safety policies before any money moves.
      </p>

      {/* Reviewer Model Provider Configuration Pill */}
      <div className="mt-4 rounded-xl border border-line bg-surface/40 p-2.5">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
            <span className="font-medium text-foreground">
              {apiKey.trim() ? `Live LLM: ${provider.toUpperCase()}` : "Built-in Engine (Default)"}
            </span>
            <span className="rounded bg-line/60 px-1.5 py-0.5 text-[10px] text-muted-foreground">
              {apiKey.trim() ? "Active" : "Zero-Config"}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setShowConfig(!showConfig)}
            className="inline-flex items-center gap-1 font-mono text-[11px] text-signal hover:underline"
          >
            <Sliders className="h-3 w-3" />
            {showConfig ? "Hide Settings" : "Reviewer API Key (Optional)"}
          </button>
        </div>

        <AnimatePresence>
          {showConfig && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden border-t border-line/60 pt-3 mt-2.5 text-xs"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Provider:</span>
                  <select
                    value={provider}
                    onChange={(e) => setProvider(e.target.value)}
                    className="rounded border border-line bg-surface px-2 py-1 text-xs text-foreground outline-none"
                  >
                    <option value="groq">Groq (Free Llama-3.3 70B · Ultra Fast)</option>
                    <option value="openai">OpenAI (GPT-4o-mini)</option>
                    <option value="openrouter">OpenRouter (Free/Custom models)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-muted-foreground">API Key:</span>
                    <a
                      href="https://console.groq.com/keys"
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-warning hover:underline text-[10px]"
                    >
                      Get free Groq key <ExternalLink className="h-2.5 w-2.5" />
                    </a>
                  </div>
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="Paste optional key (e.g. gsk_... or sk-...)"
                    className="w-full rounded border border-line bg-surface px-2.5 py-1.5 font-mono text-xs text-foreground outline-none focus:border-warning"
                  />
                </div>

                <div className="flex justify-between items-center pt-1">
                  <span className="text-[10px] text-muted-foreground">
                    Stored locally in your browser. Leave blank for built-in intelligence.
                  </span>
                  <div className="flex gap-2">
                    {apiKey && (
                      <button
                        type="button"
                        onClick={handleClearKey}
                        className="rounded px-2 py-1 text-[11px] text-muted-foreground hover:bg-surface-raised"
                      >
                        Clear
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleSaveConfig}
                      className="inline-flex items-center gap-1 rounded bg-line px-2.5 py-1 text-[11px] font-medium text-foreground hover:bg-line-strong"
                    >
                      {savedBadge ? <Check className="h-3 w-3 text-verified" /> : null}
                      {savedBadge ? "Saved" : "Save"}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <form
        className="mt-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (!busy && value.trim().length >= 3) onDispatch(apiKey.trim(), provider);
        }}
      >
        <label htmlFor="instruction" className="meta mb-2 block">
          Instruction
        </label>
        <div className="surface-navy terminal-surface rounded-xl shadow-[var(--shadow-panel)] ring-2 ring-transparent transition-shadow focus-within:ring-warning">
          <div className="flex gap-2 px-3 pt-3 font-mono text-sm">
            <span className="select-none text-warning" aria-hidden>
              &gt;
            </span>
            <textarea
              id="instruction"
              rows={4}
              maxLength={max}
              value={value}
              disabled={busy}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  if (!busy && value.trim().length >= 3) onDispatch(apiKey.trim(), provider);
                }
              }}
              placeholder="Describe the resource or service you want the agent to procure..."
              className="w-full resize-none bg-transparent leading-relaxed text-foreground outline-none placeholder:text-muted-foreground/70 disabled:opacity-60"
            />
          </div>
          <div className="flex items-center justify-between border-t border-line px-3 py-2">
            <span className="tabular font-mono text-[11px] text-muted-foreground">
              {value.length}/{max}
            </span>
            <span className="hidden font-mono text-[11px] text-muted-foreground sm:inline">
              ⌘/Ctrl + Enter
            </span>
          </div>
        </div>

        <Magnetic strength={0.12}>
          <motion.button
            type="submit"
            disabled={busy || value.trim().length < 3}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.97 }}
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-warning px-4 py-3.5 text-sm font-semibold text-warning-foreground shadow-[var(--shadow-cta)] disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
          >
            {busy ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Agent Deliberating...
              </>
            ) : (
              <>
                Delegate to Agent <CornerDownLeft className="h-4 w-4" />
              </>
            )}
          </motion.button>
        </Magnetic>
      </form>

      <div className="mt-7">
        <div className="meta mb-2">Preset scenarios</div>
        <ul className="divide-y divide-line border-y border-line" role="list">
          {CATALOG.map((c, i) => {
            const active = selected === c.sku;
            return (
              <li key={c.sku}>
                <button
                  type="button"
                  onClick={() => onSelect(c.sku, c.prompt)}
                  aria-pressed={active}
                  className={`group flex w-full items-center justify-between px-2 py-3 text-left transition-colors ${
                    active ? "bg-accent/40" : "hover:bg-accent/20"
                  }`}
                >
                  <div className="flex items-baseline gap-3">
                    <span className="font-mono text-xs text-muted-foreground/70">
                      {(i + 1).toString().padStart(2, "0")}
                    </span>
                    <div>
                      <div className="text-sm font-medium leading-tight group-hover:text-foreground">
                        {c.title}
                      </div>
                      <div className="text-xs text-muted-foreground">{c.category}</div>
                    </div>
                  </div>
                  <div
                    className={`tabular font-mono text-xs ${c.price > 35 ? "text-warning" : "text-foreground"}`}
                  >
                    {usd(c.price)}
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

