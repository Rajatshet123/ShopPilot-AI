import { Link, useNavigate } from "react-router-dom";
import { Search, Sparkles, ShieldCheck, BarChart3 } from "lucide-react";
import { useState } from "react";

export default function Landing() {
  const [q, setQ] = useState("");
  const navigate = useNavigate();
  const examples = [
    "Laptop for AI development under ₹70,000 with 16GB RAM",
    "Best smartphone under ₹50,000 with a great camera",
    "Noise cancelling headphones for travel under ₹10,000",
  ];
  return (
    <div className="space-y-16">
      <section className="grid items-center gap-10 lg:grid-cols-2">
        <div>
          <p className="mb-3 inline-flex rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-xs text-blue-300">PayPal AI Hackathon 2026 Demo</p>
          <h1 className="text-4xl font-extrabold leading-tight md:text-6xl">ShopPilot AI<br /><span className="gradient-text">Shop Smarter. Decide Better. Pay Securely.</span></h1>
          <p className="mt-4 max-w-xl text-slate-300">An AI-powered shopping assistant for the Indian market. It understands rupee budgets, compares curated demo products, recommends the best fit, and guides you through a verified PayPal Sandbox checkout. Prices show in INR; PayPal bills the USD equivalent.</p>
          <div className="mt-6 flex gap-2">
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tell us what you need..." className="w-full rounded-xl border border-slate-700 bg-navy-800/70 px-4 py-3 outline-none focus:border-blue-500" />
            <button onClick={() => navigate(`/assistant?q=${encodeURIComponent(q)}`)} className="rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 px-5 font-semibold"><Search size={18} /></button>
          </div>
          <div className="mt-4 flex gap-3">
            <Link to="/assistant" className="rounded-xl bg-blue-600 px-5 py-3 font-semibold hover:bg-blue-500">Get Started</Link>
            <Link to="/products" className="rounded-xl border border-slate-700 px-5 py-3 hover:bg-slate-800/50">Browse Catalogue</Link>
          </div>
        </div>
        <div className="glass rounded-3xl p-6">
          <h3 className="mb-4 text-lg font-semibold">How it works</h3>
          <ol className="space-y-3 text-sm text-slate-300">
            <li>1. Describe what you need in natural language.</li>
            <li>2. AI extracts budget, category, and specs from curated catalogue data.</li>
            <li>3. Compare options and get explainable recommendations.</li>
            <li>4. Approve and pay securely via PayPal Sandbox (verified server-side).</li>
          </ol>
          <div className="mt-6 grid grid-cols-3 gap-3 text-center text-xs">
            <div className="rounded-xl bg-slate-900/60 p-3"><Sparkles className="mx-auto mb-1 text-violet-400" size={18}/>AI Agent</div>
            <div className="rounded-xl bg-slate-900/60 p-3"><BarChart3 className="mx-auto mb-1 text-blue-400" size={18}/>Compare</div>
            <div className="rounded-xl bg-slate-900/60 p-3"><ShieldCheck className="mx-auto mb-1 text-emerald-400" size={18}/>Verified Pay</div>
          </div>
        </div>
      </section>
      <section>
        <h2 className="mb-4 text-2xl font-bold">Try an example prompt</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {examples.map((ex) => (
            <button key={ex} onClick={() => navigate(`/assistant?q=${encodeURIComponent(ex)}`)} className="glass rounded-2xl p-4 text-left text-sm text-slate-300 hover:border-blue-500/40">{ex}</button>
          ))}
        </div>
        <p className="mt-4 text-xs text-slate-500">Product data is a curated Indian-market demo catalogue. Prices are in INR; PayPal Sandbox charges the USD equivalent.</p>
      </section>
    </div>
  );
}
