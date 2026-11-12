import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Check, Scale, ShieldCheck, Star } from "lucide-react";
import { api } from "../services/api.js";
import { formatINR, formatUSD } from "../utils/currency.js";

export default function ProductDetail() {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    window.scrollTo(0, 0);
    setProduct(null);
    setError("");
    api.getProduct(id).then((data) => setProduct(data.product || data)).catch((e) => setError(e.message));
  }, [id]);

  if (error) {
    return (
      <div className="space-y-4">
        <Link to="/products" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white"><ArrowLeft size={16} /> Back to products</Link>
        <div className="rounded-xl border border-red-800 bg-red-950/40 p-4 text-red-300">{error}</div>
      </div>
    );
  }

  if (!product) {
    return <p className="text-slate-400">Loading product...</p>;
  }

  return (
    <div className="space-y-6">
      <Link to="/products" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white"><ArrowLeft size={16} /> Back to products</Link>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="glass overflow-hidden rounded-3xl">
          <img src={product.image} alt={product.name} className="aspect-[4/3] h-full w-full object-cover" />
        </div>

        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-blue-300">{product.category}</span>
            <span className="rounded-full border border-slate-700 bg-slate-900/60 px-3 py-1 text-slate-300">{product.brand}</span>
            <span className="rounded-full border border-slate-700 bg-slate-900/60 px-3 py-1 text-slate-400">Demo catalogue</span>
          </div>

          <div>
            <h1 className="text-3xl font-bold">{product.name}</h1>
            <div className="mt-2 flex items-center gap-3 text-sm text-slate-400">
              {product.rating && <span className="inline-flex items-center gap-1"><Star size={14} className="text-amber-300" /> {product.rating} (demo rating)</span>}
              <span className="font-mono text-xs">{product.id}</span>
            </div>
          </div>

          <div>
            <div className="text-3xl font-bold text-blue-300">{formatINR(product.price)} <span className="text-sm font-medium text-slate-400">INR</span></div>
            <div className="mt-1 text-xs text-slate-500">PayPal Sandbox billing: ≈ {formatUSD(product.price_usd)} USD (PayPal does not support INR transactions)</div>
          </div>

          <p className="text-slate-300">{product.description}</p>

          <div>
            <h2 className="mb-2 font-semibold">Key features</h2>
            <ul className="grid gap-2 sm:grid-cols-2">
              {(product.features || []).map((feature) => (
                <li key={feature} className="flex items-start gap-2 text-sm text-slate-300"><Check size={16} className="mt-0.5 shrink-0 text-emerald-400" /> {feature}</li>
              ))}
            </ul>
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            <Link to={`/checkout?product=${product.id}`} className="rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 px-5 py-2.5 font-semibold">Buy with PayPal</Link>
            <Link to={`/compare?ids=${product.id}`} className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-4 py-2.5 hover:bg-slate-800/60"><Scale size={16} /> Compare</Link>
          </div>

          <p className="flex items-center gap-2 text-xs text-slate-500"><ShieldCheck size={14} className="text-emerald-400" /> Prices are demo INR catalogue data. PayPal charges the USD equivalent, and the backend verifies the capture before an order is saved.</p>
        </div>
      </div>

      <div className="glass rounded-2xl p-5">
        <h2 className="mb-3 text-lg font-semibold">Specifications</h2>
        <div className="overflow-hidden rounded-xl border border-slate-800">
          <table className="w-full text-sm">
            <tbody>
              {Object.entries(product.specifications || {}).map(([key, value]) => (
                <tr key={key} className="border-b border-slate-800 last:border-0">
                  <td className="w-1/3 bg-slate-900/60 p-3 text-slate-400">{key}</td>
                  <td className="p-3 text-slate-200">{String(value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
