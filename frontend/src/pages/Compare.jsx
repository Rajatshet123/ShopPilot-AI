import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../services/api.js";
import { formatINR, formatUSD } from "../utils/currency.js";

const MAX_COMPARE = 4;

const parseIds = (value) => {
  const raw = Array.isArray(value) ? value : String(value || "").split(/[\s,]+/);
  return [...new Set(raw.map((id) => String(id).trim()).filter(Boolean))].slice(0, MAX_COMPARE);
};

export default function Compare() {
  const [params, setParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [selected, setSelected] = useState(() => parseIds(params.get("ids") || ""));
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const lastAutoRun = useRef("");

  const run = async (idsToCompare = selected) => {
    const list = parseIds(idsToCompare);
    if (list.length < 2) {
      setError("Select at least two products to compare.");
      setResult(null);
      return;
    }
    setLoading(true);
    setError("");
    try {
      setResult(await api.aiCompare({ product_ids: list }));
    } catch (e) {
      setResult(null);
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    api.getProducts()
      .then((data) => setProducts(data.products || data))
      .catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    const incoming = parseIds(params.get("ids") || "");
    setSelected(incoming);
    const key = incoming.join(",");
    if (incoming.length >= 2 && lastAutoRun.current !== key) {
      lastAutoRun.current = key;
      run(incoming);
    }
    if (incoming.length < 2) setResult(null);
  }, [params]);

  const productMap = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const selectedProducts = selected.map((id) => productMap.get(id)).filter(Boolean);

  const updateSelection = (next) => {
    const list = parseIds(next);
    setSelected(list);
    setResult(null);
    setError("");
    lastAutoRun.current = list.join(",");
    setParams(list.length ? { ids: list.join(",") } : {}, { replace: true });
  };

  const addProduct = (id) => {
    if (selected.includes(id) || selected.length >= MAX_COMPARE) return;
    updateSelection([...selected, id]);
  };

  const removeProduct = (id) => updateSelection(selected.filter((item) => item !== id));

  const clearSelection = () => {
    setQuery("");
    updateSelection([]);
  };

  const searchResults = useMemo(() => {
    const term = query.trim().toLowerCase();
    return products
      .filter((p) => !selected.includes(p.id))
      .filter((p) => !term || `${p.name} ${p.brand} ${p.category}`.toLowerCase().includes(term))
      .slice(0, 8);
  }, [products, selected, query]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-bold">Product Comparison</h1>
        <p className="text-xs text-slate-500">Select 2-4 products. Prices are shown in INR; PayPal checkout bills the USD equivalent.</p>
      </div>

      <div className="glass rounded-2xl p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-semibold">Selected products ({selected.length}/{MAX_COMPARE})</h2>
            <p className="text-xs text-slate-500">Start from a product card or add products below.</p>
          </div>
          {selected.length > 0 && <button onClick={clearSelection} className="text-xs text-slate-400 hover:text-white">Clear all</button>}
        </div>

        {selected.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-700 p-3 text-sm text-slate-400">No products selected yet. Search the catalogue below to add at least two products.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {selected.map((id) => {
              const p = productMap.get(id);
              return (
                <div key={id} className="flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 py-1 pl-3 pr-1 text-sm text-blue-100">
                  <Link to={`/product/${id}`} className="max-w-[220px] truncate hover:text-white">{p?.name || id}</Link>
                  <button onClick={() => removeProduct(id)} aria-label={`Remove ${p?.name || id}`} className="rounded-full px-2 py-0.5 text-blue-200 hover:bg-blue-500/20 hover:text-white">×</button>
                </div>
              );
            })}
          </div>
        )}

        {selected.length === 1 && <p className="text-sm text-amber-300">Add one more product to enable comparison.</p>}

        <button onClick={() => run(selected)} disabled={selected.length < 2 || loading} className="rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 px-5 py-2 font-semibold disabled:cursor-not-allowed disabled:opacity-50">
          {loading ? "Comparing..." : "Compare selected products"}
        </button>
      </div>

      <div className="glass rounded-2xl p-4 space-y-3">
        <div>
          <h2 className="font-semibold">Add a product</h2>
          <p className="text-xs text-slate-500">Search by product name, brand, or category.</p>
        </div>
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="e.g. iPhone, HP laptop, Sony headphones..." className="w-full rounded-xl border border-slate-700 bg-navy-900/70 px-3 py-2" />
        <div className="grid gap-2 md:grid-cols-2">
          {searchResults.map((p) => (
            <div key={p.id} className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/50 p-2">
              <img src={p.image} alt={p.name} loading="lazy" className="h-12 w-12 shrink-0 rounded-lg object-cover" />
              <div className="min-w-0 flex-1">
                <Link to={`/product/${p.id}`} className="block truncate text-sm font-medium hover:text-blue-300">{p.name}</Link>
                <div className="truncate text-xs text-slate-500">{p.brand} • {p.category} • {formatINR(p.price)}</div>
              </div>
              <button onClick={() => addProduct(p.id)} disabled={selected.length >= MAX_COMPARE} className="shrink-0 rounded-lg border border-slate-700 px-3 py-1 text-xs hover:bg-slate-800/60 disabled:cursor-not-allowed disabled:opacity-40">Add</button>
            </div>
          ))}
          {searchResults.length === 0 && <p className="text-sm text-slate-400">No more products match your search.</p>}
        </div>
        {selected.length >= MAX_COMPARE && <p className="text-xs text-slate-500">Maximum of {MAX_COMPARE} products reached. Remove one to add another.</p>}
      </div>

      {error && <p className="text-red-400">{error}</p>}

      {result && (
        <div className="space-y-4">
          <div className="glass rounded-2xl p-4">
            <h3 className="font-semibold">AI Comparison Summary</h3>
            <p className="mt-2 text-slate-300 whitespace-pre-wrap">{result.summary}</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {result.comparison?.map((c, i) => (
              <div key={i} className="glass rounded-2xl p-4">
                {c.product?.image && (
                  <Link to={`/product/${c.product.id}`} className="mb-3 block overflow-hidden rounded-xl">
                    <img src={c.product.image} alt={c.product.name} loading="lazy" className="h-36 w-full object-cover" />
                  </Link>
                )}
                <div className="flex justify-between gap-2"><Link to={`/product/${c.product?.id}`} className="font-semibold hover:text-blue-300">{c.product?.name}</Link><div className="text-right"><div className="whitespace-nowrap text-blue-300">{formatINR(c.product?.price || 0)}</div>{c.product?.price_usd && <div className="text-xs text-slate-500">≈ {formatUSD(c.product.price_usd)} USD</div>}</div></div>
                <div className="text-xs text-slate-400">{c.product?.brand} • {c.product?.category}</div>
                <div className="mt-2 text-sm text-slate-300"><div className="font-medium text-emerald-300">Advantages</div><ul className="list-disc ml-5">{(c.advantages||[]).map((x,j)=><li key={j}>{x}</li>)}</ul></div>
                <div className="mt-2 text-sm text-slate-300"><div className="font-medium text-amber-300">Disadvantages</div><ul className="list-disc ml-5">{(c.disadvantages||[]).map((x,j)=><li key={j}>{x}</li>)}</ul></div>
                <Link to={`/product/${c.product?.id}`} className="mt-3 inline-block rounded-lg border border-slate-700 px-3 py-1.5 text-sm">View details</Link>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
