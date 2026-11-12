import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../services/api.js";
import { formatINR, formatUSD } from "../utils/currency.js";

export default function Products() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cat, setCat] = useState("all");
  const [sort, setSort] = useState("featured");

  useEffect(() => {
    api.getProducts().then(d => setProducts(d.products || d)).catch(e => setError(e.message)).finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    let list = [...products];
    if (cat !== "all") list = list.filter(p => p.category === cat);
    if (sort === "price-asc") list.sort((a,b)=>a.price-b.price);
    if (sort === "price-desc") list.sort((a,b)=>b.price-a.price);
    if (sort === "rating") list.sort((a,b)=>(b.rating||0)-(a.rating||0));
    return list;
  }, [products, cat, sort]);

  const cats = ["all", ...Array.from(new Set(products.map(p => p.category)))];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Product Discovery</h1>
          <p className="text-xs text-slate-500">Indian-market demo catalogue with INR prices. PayPal bills the USD equivalent at checkout.</p>
        </div>
        <div className="flex gap-2">
          <select value={cat} onChange={e=>setCat(e.target.value)} className="rounded-lg border border-slate-700 bg-navy-800 px-3 py-2">{cats.map(c=><option key={c} value={c}>{c}</option>)}</select>
          <select value={sort} onChange={e=>setSort(e.target.value)} className="rounded-lg border border-slate-700 bg-navy-800 px-3 py-2">
            <option value="featured">Featured</option><option value="price-asc">Price: Low to High</option><option value="price-desc">Price: High to Low</option><option value="rating">Rating (demo)</option>
          </select>
        </div>
      </div>
      {loading && <p className="text-slate-400">Loading catalogue...</p>}
      {error && <p className="text-red-400">{error}</p>}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map(p => (
          <div key={p.id} className="glass rounded-2xl p-4 flex flex-col">
            <Link to={`/product/${p.id}`} className="mb-3 block overflow-hidden rounded-xl">
              <img src={p.image} alt={p.name} loading="lazy" className="h-40 w-full object-cover transition duration-300 hover:scale-105" />
            </Link>
            <div className="flex items-start justify-between gap-2">
              <Link to={`/product/${p.id}`} className="font-semibold leading-snug hover:text-blue-300">{p.name}</Link>
              <span className="whitespace-nowrap text-right"><span className="block font-bold text-blue-300">{formatINR(p.price)}</span><span className="block text-xs font-normal text-slate-500">≈ {formatUSD(p.price_usd)} USD</span></span>
            </div>
            <p className="text-xs text-slate-400 mt-1">{p.brand} {p.rating ? `• ★ ${p.rating} (demo)` : ""}</p>
            <ul className="mt-2 text-xs text-slate-300 space-y-1 flex-1">
              {Object.entries(p.specifications || {}).slice(0,4).map(([k,v]) => <li key={k}><span className="text-slate-500">{k}:</span> {String(v)}</li>)}
            </ul>
            <div className="mt-3 flex flex-wrap gap-2 text-sm">
              <Link to={`/product/${p.id}`} className="rounded-lg border border-slate-700 px-3 py-1.5">Details</Link>
              <Link to={`/compare?ids=${p.id}`} className="rounded-lg border border-slate-700 px-3 py-1.5">Compare</Link>
              <Link to={`/checkout?product=${p.id}`} className="rounded-lg bg-blue-600 px-3 py-1.5">Buy (Sandbox)</Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
