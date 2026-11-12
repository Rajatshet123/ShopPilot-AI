import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../services/api.js";
import { formatINR, formatUSD, INR_PER_USD, usdFromInr } from "../utils/currency.js";

function loadPayPalScript(clientId) {
  return new Promise((resolve, reject) => {
    if (window.paypal) return resolve(window.paypal);
    if (!clientId) return reject(new Error("Missing VITE_PAYPAL_CLIENT_ID"));
    const s = document.createElement("script");
    s.src = `https://www.paypal.com/sdk/js?client-id=${clientId}&currency=USD`;
    s.onload = () => resolve(window.paypal);
    s.onerror = () => reject(new Error("Failed to load PayPal SDK"));
    document.body.appendChild(s);
  });
}

export default function Checkout() {
  const [params] = useSearchParams();
  const [product, setProduct] = useState(null);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [confirmation, setConfirmation] = useState(null);
  const paypalRef = useRef(null);
  const clientId = import.meta.env.VITE_PAYPAL_CLIENT_ID;
  const usdPrice = product ? Number(product.price_usd ?? usdFromInr(product.price)) : 0;

  useEffect(() => {
    const id = params.get("product");
    if (id) api.getProduct(id).then(d => setProduct(d.product || d)).catch(e => setError(e.message));
  }, [params]);

  useEffect(() => {
    if (!product || !paypalRef.current) return;
    paypalRef.current.innerHTML = "";
    loadPayPalScript(clientId).then(paypal => {
      paypal.Buttons({
        createOrder: async () => {
          setStatus("Creating order on backend...");
          const data = await api.createOrder({ product_id: product.id });
          return data.paypal_order_id;
        },
        onApprove: async (data) => {
          try {
            setStatus("Capturing and verifying payment on backend...");
            const res = await api.captureOrder({ paypal_order_id: data.orderID, product_id: product.id });
            setConfirmation(res);
            setStatus("Payment verified and saved.");
          } catch (e) { setError(e.message); setStatus(""); }
        },
        onCancel: () => setStatus("Payment cancelled by user."),
        onError: (err) => { setError(err?.message || "PayPal error"); setStatus(""); }
      }).render(paypalRef.current);
    }).catch(e => setError(e.message));
  }, [product, clientId]);

  return (
    <div className="max-w-3xl space-y-4">
      <h1 className="text-3xl font-bold">PayPal Checkout</h1>
      <p className="text-xs text-slate-500">Prices are shown in INR. PayPal Sandbox charges the USD equivalent because PayPal does not support INR transactions. You must explicitly approve payment, and the backend verifies the capture before confirming.</p>
      {error && <div className="rounded-xl border border-red-800 bg-red-950/40 p-3 text-red-300">{error}</div>}
      {status && <div className="rounded-xl border border-blue-800 bg-blue-950/30 p-3 text-blue-200">{status}</div>}
      {!product && <p className="text-slate-400">Select a product from Products or Assistant to begin checkout.</p>}
      {product && (
        <div className="glass rounded-2xl p-5 space-y-3">
          <h2 className="text-xl font-semibold">Order Summary</h2>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link to={`/product/${product.id}`} className="w-full shrink-0 overflow-hidden rounded-xl sm:w-36">
              <img src={product.image} alt={product.name} className="h-24 w-full object-cover" />
            </Link>
            <div className="flex-1">
              <Link to={`/product/${product.id}`} className="font-semibold hover:text-blue-300">{product.name}</Link>
              <div className="text-xs text-slate-400">{product.brand} • {product.category} • {product.id}</div>
              <div className="mt-1 text-sm text-slate-400">Ships from demo warehouse</div>
            </div>
            <div className="whitespace-nowrap text-xl font-bold text-blue-300">{formatINR(product.price)}</div>
          </div>
          <div className="space-y-1 border-t border-slate-800 pt-3">
            <div className="flex justify-between text-sm text-slate-400"><span>Subtotal</span><span>{formatINR(product.price)}</span></div>
            <div className="flex justify-between text-sm text-slate-400"><span>Taxes/Shipping (demo)</span><span>{formatINR(0)}</span></div>
            <div className="flex justify-between font-semibold"><span>Total</span><span>{formatINR(product.price)} INR</span></div>
            <div className="flex justify-between text-sm text-blue-200"><span>PayPal billing (USD)</span><span>{formatUSD(usdPrice)}</span></div>
            <p className="pt-1 text-xs text-slate-500">Demo conversion: ₹{INR_PER_USD} ≈ $1 USD. PayPal does not support INR as a transaction currency.</p>
          </div>
          <div className="pt-2">
            <div className="mb-2 text-sm text-slate-300">Explicit customer approval required:</div>
            <div ref={paypalRef} />
            {!clientId && <p className="text-amber-300 text-sm mt-2">Set VITE_PAYPAL_CLIENT_ID in frontend/.env to load PayPal Sandbox buttons.</p>}
          </div>
        </div>
      )}
      {confirmation && (
        <div className="glass rounded-2xl p-5 border border-emerald-700/50">
          <h3 className="text-lg font-semibold text-emerald-300">Payment Confirmed (Backend Verified)</h3>
          <div className="mt-2 space-y-1 text-sm text-slate-300">
            <div>Status: <span className="font-medium text-emerald-300">{confirmation.status}</span></div>
            {confirmation.paypal_order_id && <div>PayPal order: <span className="font-mono text-xs">{confirmation.paypal_order_id}</span></div>}
            {confirmation.paid_amount && <div>Paid: {formatUSD(confirmation.paid_amount)} {confirmation.currency}</div>}
            {product && <div>Catalogue total: {formatINR(product.price)} INR</div>}
            {confirmation.order?.id && <div>Saved order: <span className="font-mono text-xs">#{confirmation.order.id}</span></div>}
          </div>
          <div className="mt-3 flex flex-wrap gap-2 text-sm">
            <Link to="/orders" className="rounded-lg bg-emerald-600 px-3 py-1.5 font-medium">View orders</Link>
            <Link to="/products" className="rounded-lg border border-slate-700 px-3 py-1.5">Continue shopping</Link>
          </div>
          <details className="mt-3">
            <summary className="cursor-pointer text-xs text-slate-500">Developer verification details</summary>
            <pre className="mt-2 text-xs text-slate-300 whitespace-pre-wrap">{JSON.stringify(confirmation, null, 2)}</pre>
          </details>
        </div>
      )}
    </div>
  );
}
