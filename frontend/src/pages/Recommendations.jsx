import { useState } from "react";
import { api } from "../services/api.js";
import { Link } from "react-router-dom";
import { formatINR, formatUSD } from "../utils/currency.js";

export default function Recommendations() {
  const [query, setQuery] = useState("Laptop for AI development under ₹70,000");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const run = async () => {
    setLoading(true); setError("");
    try { setResult(await api.aiSearch({ query, recommend: true })); }
    catch(e){ setError(e.message); } finally { setLoading(false); }
  };

  const rec = result?.recommendations || {};
  const Card = ({ title, p, tone }) => p ? (
    <div className={`glass rounded-2xl p-4 border-t-2 ${tone}`}>
      <Link to={`/product/${p.id}`} className="mb-3 block overflow-hidden rounded-xl">
        <img src={p.image} alt={p.name} loading="lazy" className="h-36 w-full object-cover" />
      </Link>
      <div className="text-sm text-slate-400 mb-1">{title}</div>
      <Link to={`/product/${p.id}`} className="font-semibold text-lg hover:text-blue-300">{p.name}</Link>
      <div className="text-blue-300 font-bold">{formatINR(p.price)}</div>
      <div className="text-xs text-slate-500">≈ {formatUSD(p.price_usd)} USD PayPal billing</div>
      <div className="text-xs text-slate-400">{p.brand} • {p.category} {p.rating ? `• ★ ${p.rating} (demo)` : ""}</div>
      <p className="text-sm text-slate-300 mt-2">{p.reason || p.description}</p>
      <div className="mt-3 flex gap-2 text-sm">
        <Link to={`/checkout?product=${p.id}`} className="rounded-lg bg-blue-600 px-3 py-1.5">Select</Link>
        <Link to={`/product/${p.id}`} className="rounded-lg border border-slate-700 px-3 py-1.5">Details</Link>
      </div>
    </div>
  ) : null;

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold">AI Recommendations</h1>
      <div className="glass rounded-2xl p-4 flex gap-2">
        <input value={query} onChange={e=>setQuery(e.target.value)} className="flex-1 rounded-xl border border-slate-700 bg-navy-900/70 px-3 py-2" />
        <button onClick={run} disabled={loading} className="rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 px-5 font-semibold disabled:opacity-50">{loading?"Analyzing...":"Recommend"}</button>
      </div>
      {error && <p className="text-red-400">{error}</p>}
      {result && (
        <div className="space-y-4">
          <div className="glass rounded-2xl p-4"><h3 className="font-semibold">Why these picks?</h3><p className="text-slate-300 mt-1">{result.recommendation_reason || result.message}</p></div>
          <div className="grid gap-4 md:grid-cols-3">
            <Card title="Best Overall" p={rec.best_overall} tone="border-violet-500" />
            <Card title="Best Budget" p={rec.best_budget} tone="border-emerald-500" />
            <Card title="Best Performance" p={rec.best_performance} tone="border-blue-500" />
          </div>
          <p className="text-xs text-slate-500">Recommendations are based on the curated Indian demo catalogue. Prices are in INR; PayPal bills the USD equivalent.</p>
        </div>
      )}
    </div>
  );
}
