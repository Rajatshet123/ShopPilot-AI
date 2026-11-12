import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { api } from "../services/api.js";
import { formatINR, formatUSD } from "../utils/currency.js";

export default function Assistant() {
  const [params] = useSearchParams();
  const [input, setInput] = useState(params.get("q") || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  const runSearch = async (q) => {
    if (!q?.trim()) return;
    setLoading(true); setError("");
    try {
      const data = await api.aiSearch({ query: q });
      setResult(data);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { if (params.get("q")) runSearch(params.get("q")); }, []);

  const extracted = result?.extracted || {};
  const specs = Object.entries(extracted.min_specs || {});
  const keywords = (extracted.keywords || []).slice(0, 8);
  const category = extracted.category
    ? extracted.category.charAt(0).toUpperCase() + extracted.category.slice(1)
    : "Not specified";

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">AI Shopping Assistant</h1>
      <div className="glass rounded-2xl p-4">
        <div className="flex gap-2">
          <textarea value={input} onChange={(e) => setInput(e.target.value)} rows={3} className="w-full rounded-xl border border-slate-700 bg-navy-900/70 p-3" placeholder="e.g. I need a laptop for AI development under ₹70,000 with at least 16GB RAM" />
          <button onClick={() => runSearch(input)} disabled={loading} className="rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 px-5 font-semibold disabled:opacity-50">{loading ? "Thinking..." : "Ask"}</button>
        </div>
        {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
      </div>

      {result && (
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="glass rounded-2xl p-4 lg:col-span-1 space-y-3">
            <div>
              <h3 className="font-semibold">What the AI understood</h3>
              <p className="text-xs text-slate-500">Readable summary of your request — no raw JSON.</p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
                <div className="text-xs text-slate-500">Category</div>
                <div className="mt-1 font-medium">{category}</div>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
                <div className="text-xs text-slate-500">Max budget</div>
                <div className="mt-1 font-medium">{extracted.max_budget ? `${formatINR(extracted.max_budget)} INR` : "Flexible"}</div>
              </div>
            </div>
            {specs.length > 0 && (
              <div>
                <div className="mb-2 text-xs text-slate-500">Minimum specs</div>
                <div className="flex flex-wrap gap-2">
                  {specs.map(([key, value]) => (
                    <span key={key} className="rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-xs text-blue-200">{key}: {String(value)}</span>
                  ))}
                </div>
              </div>
            )}
            {keywords.length > 0 && (
              <div>
                <div className="mb-2 text-xs text-slate-500">Detected keywords</div>
                <div className="flex flex-wrap gap-1.5">
                  {keywords.map((word, i) => <span key={`${word}-${i}`} className="rounded-full bg-slate-800 px-2.5 py-1 text-xs text-slate-300">{word}</span>)}
                </div>
              </div>
            )}
            <p className="text-sm text-slate-300">{result.message}</p>
            <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
              <span>Parsed by {result.source === "gemini" ? "Gemini" : "built-in parser"}</span>
              <span>INR catalogue · PayPal bills USD</span>
            </div>
            {result.follow_up_question && <p className="text-sm text-amber-300">Follow-up: {result.follow_up_question}</p>}
          </div>
          <div className="lg:col-span-2 space-y-3">
            <h3 className="font-semibold">Matching Products ({result.matches?.length || 0}) <span className="text-xs text-slate-500 font-normal">Indian demo catalogue</span></h3>
            <div className="grid gap-3 md:grid-cols-2">
              {(result.matches || []).map(p => (
                <div key={p.id} className="glass rounded-xl p-4">
                  <Link to={`/product/${p.id}`} className="mb-3 block overflow-hidden rounded-lg">
                    <img src={p.image} alt={p.name} loading="lazy" className="h-32 w-full object-cover" />
                  </Link>
                  <div className="flex justify-between gap-2"><Link to={`/product/${p.id}`} className="font-semibold hover:text-blue-300">{p.name}</Link><div className="text-right"><div className="whitespace-nowrap font-bold text-blue-300">{formatINR(p.price)}</div><div className="text-xs text-slate-500">≈ {formatUSD(p.price_usd)} USD</div></div></div>
                  <div className="text-xs text-slate-400">{p.brand} • {p.category} {p.rating ? `• ★ ${p.rating} (demo)` : ""}</div>
                  <p className="text-sm mt-2 text-slate-300 line-clamp-2">{p.description}</p>
                  <div className="mt-3 flex flex-wrap gap-2 text-sm">
                    <Link to={`/checkout?product=${p.id}`} className="rounded-lg bg-blue-600 px-3 py-1.5">Select</Link>
                    <Link to={`/product/${p.id}`} className="rounded-lg border border-slate-700 px-3 py-1.5">Details</Link>
                    <Link to={`/compare?ids=${p.id}`} className="rounded-lg border border-slate-700 px-3 py-1.5">Compare</Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
