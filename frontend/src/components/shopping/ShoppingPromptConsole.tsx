import { useState } from "react";
import { Search, Sparkles, SlidersHorizontal, Loader2, ArrowRight } from "lucide-react";

interface ShoppingPromptConsoleProps {
  onSearch: (prompt: string, budget?: number, category?: string) => void;
  isLoading: boolean;
}

const PRESET_PROMPTS = [
  { label: "🎮 Gaming Laptop (RTX 4060)", prompt: "Find me the best gaming laptop with RTX 4060, 16GB RAM and 1TB SSD under $1100" },
  { label: "⚡ Cloud GPU (H100 80GB)", prompt: "Rent 1x NVIDIA H100 80GB SXM5 cloud GPU instance for LLM fine-tuning under $5" },
  { label: "🚀 Groq Llama-3 Tokens", prompt: "Procure 10M tokens of Llama-3 70B on Groq LPUs under $10" },
  { label: "💻 MacBook Pro M3", prompt: "Find Apple MacBook Pro 16GB unified memory under $1600" },
  { label: "🌐 AI Domain Registration", prompt: "Register an AI domain with free Whois privacy under $75" },
];

export function ShoppingPromptConsole({ onSearch, isLoading }: ShoppingPromptConsoleProps) {
  const [prompt, setPrompt] = useState("");
  const [budget, setBudget] = useState<string>("");
  const [category, setCategory] = useState<string>("auto");
  const [showFilters, setShowFilters] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isLoading) return;
    const numBudget = budget ? parseFloat(budget) : undefined;
    onSearch(prompt.trim(), numBudget, category);
  };

  return (
    <div className="w-full rounded-2xl border border-white/10 bg-slate-900/60 p-5 shadow-2xl backdrop-blur-xl">
      <div className="flex items-center justify-between pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/20 text-indigo-400">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-white">Autonomous Agent Shopping & Procurement</h2>
            <p className="text-xs text-slate-400">Describe what you need in natural language. Multi-agent orchestration finds, benchmarks & validates it.</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
            showFilters ? "border-indigo-500 bg-indigo-500/10 text-indigo-300" : "border-white/10 text-slate-400 hover:text-white"
          }`}
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Filters
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3.5 top-3.5 h-5 w-5 text-slate-400" />
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g. Find gaming laptop with RTX 4060, 16GB RAM under $1100..."
            className="w-full rounded-xl border border-white/10 bg-black/40 py-3 pl-11 pr-28 text-sm text-white placeholder-slate-500 shadow-inner focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !prompt.trim()}
            className="absolute right-2 top-2 flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 px-4 py-1.5 text-xs font-semibold text-white shadow-md transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Dispatching...
              </>
            ) : (
              <>
                Dispatch
                <ArrowRight className="h-3.5 w-3.5" />
              </>
            )}
          </button>
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 gap-3 rounded-xl border border-white/5 bg-black/20 p-3 sm:grid-cols-2">
            <div>
              <label className="text-[11px] font-medium text-slate-400">Target Budget Ceiling (USD)</label>
              <input
                type="number"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                placeholder="Optional limit, e.g. 1000"
                className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-1.5 text-xs text-white placeholder-slate-600 focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-[11px] font-medium text-slate-400">Category Selection</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-1.5 text-xs text-white focus:border-indigo-500 focus:outline-none"
              >
                <option value="auto">Auto-detect from prompt</option>
                <option value="Consumer Commerce">Consumer Commerce (Hardware, Electronics)</option>
                <option value="Developer & Business Procurement">Developer Procurement (Cloud, GPUs, APIs)</option>
              </select>
            </div>
          </div>
        )}

        {/* Quick Presets */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="text-[11px] font-medium text-slate-500">Quick Prompts:</span>
          {PRESET_PROMPTS.map((p, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                setPrompt(p.prompt);
                onSearch(p.prompt);
              }}
              className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-slate-300 transition hover:border-indigo-500/50 hover:bg-indigo-500/10 hover:text-white"
            >
              {p.label}
            </button>
          ))}
        </div>
      </form>
    </div>
  );
}

