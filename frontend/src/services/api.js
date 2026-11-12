const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.detail || data.message || "Request failed");
  return data;
}

export const api = {
  getProducts: (params = "") => request(`/api/products${params}`),
  getProduct: (id) => request(`/api/products/${id}`),
  aiSearch: (payload) => request("/api/ai/search", { method: "POST", body: JSON.stringify(payload) }),
  aiCompare: (payload) => request("/api/ai/compare", { method: "POST", body: JSON.stringify(payload) }),
  createOrder: (payload) => request("/api/paypal/create-order", { method: "POST", body: JSON.stringify(payload) }),
  captureOrder: (payload) => request("/api/paypal/capture-order", { method: "POST", body: JSON.stringify(payload) }),
  getOrders: () => request("/api/orders"),
  health: () => request("/health"),
};

export { API_BASE };
