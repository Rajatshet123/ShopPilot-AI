import { useEffect, useState } from "react";
import { api } from "../services/api.js";
import { formatINR, formatUSD, INR_PER_USD } from "../utils/currency.js";

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [productMap, setProductMap] = useState({});
  const [error, setError] = useState("");
  useEffect(() => {
    Promise.all([api.getOrders(), api.getProducts()])
      .then(([orderData, productData]) => {
        setOrders(orderData.orders || orderData);
        const list = productData.products || productData;
        setProductMap(Object.fromEntries(list.map((product) => [product.id, product])));
      })
      .catch(e => setError(e.message));
  }, []);
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-bold">Order History</h1>
        <p className="text-xs text-slate-500">Verified PayPal payments are recorded in USD. Catalogue values are shown in INR.</p>
      </div>
      {error && <p className="text-red-400">{error}</p>}
      <div className="glass rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-900/60 text-slate-400"><tr><th className="p-3 text-left">Order ID</th><th className="p-3 text-left">Product</th><th className="p-3">Total</th><th className="p-3">Status</th><th className="p-3">Date</th></tr></thead>
          <tbody>
            {orders.length === 0 && <tr><td colSpan="5" className="p-4 text-slate-500">No verified orders yet.</td></tr>}
            {orders.map(o => (
              <tr key={o.id || o.order_id} className="border-t border-slate-800">
                <td className="p-3 font-mono text-xs">{o.paypal_order_id || o.order_id}</td>
                <td className="p-3">{o.product_name}</td>
                <td className="p-3 text-center">
                  <div className="text-blue-300">{formatINR(productMap[o.product_id]?.price ?? Number(o.total_price) * INR_PER_USD)}</div>
                  <div className="text-xs text-slate-500">{formatUSD(o.total_price)} USD billed</div>
                </td>
                <td className="p-3 text-center"><span className="rounded-full bg-emerald-900/40 px-2 py-1 text-xs text-emerald-300">{o.status}</span></td>
                <td className="p-3 text-center text-slate-400">{o.created_at}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
