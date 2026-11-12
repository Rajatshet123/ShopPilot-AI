# ShopPilot AI

**Shop Smarter. Decide Better. Pay Securely.**

ShopPilot AI is an AI shopping assistant built for the **PayPal AI Hackathon 2026**. It understands natural-language shopping requests, searches a curated catalogue, compares products, explains recommendations, and completes a **real PayPal Sandbox checkout** that is verified server-side before an order is saved.

> **Demo data:** The catalogue contains Indian-market products with demo INR prices, specs, ratings, and images. It is not live merchant inventory and ratings are not verified customer reviews. Prices are shown in **INR**; PayPal Sandbox charges the USD equivalent because PayPal does not support INR transactions. Payments use the PayPal **Sandbox**, not real money.

## Features

- Natural-language requirement extraction (category, budget, minimum specs) with Gemini and a deterministic fallback parser.
- Budget-aware product search and ranking across 25 Indian-market demo products (10 laptops, 5 smartphones, 5 headphones, 5 accessories) with INR prices.
- Side-by-side AI comparison with advantages, disadvantages, and a summary.
- Explainable recommendations: best overall, best budget, best performance.
- PayPal Orders API flow: create order on the backend, explicit approval in the PayPal UI, capture, then verify amount/currency/status server-side.
- SQLite order history with duplicate-capture protection.
- React + Vite + Tailwind dark UI with responsive layout, Lucide icons, filters, and sorting.

## Tech stack

| Layer | Technology |
| --- | --- |
| Frontend | React 18, Vite, JavaScript, Tailwind CSS, Lucide React, React Router |
| Backend | Python, FastAPI, Pydantic, SQLite |
| AI | Google Gemini (`google-generativeai`) with graceful fallback |
| Payments | PayPal JavaScript SDK + PayPal Orders API (Sandbox) |

## Project structure

```text
ShopPilot/
  backend/
    main.py              # FastAPI app and routes
    ai_agent.py          # Gemini intent parsing, search, ranking, compare, recommendations
    product_service.py   # Catalogue loading and filtering
    paypal_service.py    # PayPal OAuth, create/capture order, verification
    database.py          # SQLite order storage
    models.py            # Pydantic request models
    products.json        # Indian-market demo catalogue (25 products, INR prices + USD billing)
    requirements.txt
    .env.example
  frontend/
    public/images/       # Local demo product photos and illustrations
    src/
      components/Layout.jsx
      pages/             # Landing, Assistant, Products, ProductDetail, Compare, Recommendations, Checkout, Orders
      services/api.js    # API client (UI is separated from API calls)
    package.json
    .env.example
  .gitignore
  LICENSE
  README.md
```

## Prerequisites

- Python 3.10+ (tested with 3.13)
- Node.js 18+ and npm (tested with Node 24)
- Free Gemini API key (optional but recommended): https://aistudio.google.com/apikey
- PayPal Developer Sandbox account (required for checkout): https://developer.paypal.com

## 1. Backend setup

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
```

Edit `backend/.env`:

```dotenv
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-2.0-flash
PAYPAL_CLIENT_ID=your_paypal_sandbox_client_id
PAYPAL_CLIENT_SECRET=your_paypal_sandbox_client_secret
PAYPAL_BASE_URL=https://api-m.sandbox.paypal.com
FRONTEND_ORIGIN=http://localhost:5173
DATABASE_PATH=shoppilot.db
```

Start the API:

```powershell
uvicorn main:app --reload --port 8000
```

- API: http://localhost:8000
- Interactive docs: http://localhost:8000/docs
- Health check: http://localhost:8000/health

If Gemini is not configured, the app still works using the built-in rule-based parser. It will report `"source": "fallback"` in search responses.

### Getting PayPal Sandbox credentials

1. Sign in to https://developer.paypal.com/dashboard.
2. Open **Apps & Credentials** and make sure **Sandbox** is selected.
3. Create (or open the default) app.
4. Copy the **Client ID** and **Secret** into `backend/.env`.
5. Put the same **Client ID** in `frontend/.env` (the client ID is public; **never** put the secret in the frontend).

## 2. Frontend setup

```powershell
cd frontend
npm install
Copy-Item .env.example .env
```

Edit `frontend/.env`:

```dotenv
VITE_API_BASE_URL=http://localhost:8000
VITE_PAYPAL_CLIENT_ID=your_paypal_sandbox_client_id
```

Start the frontend:

```powershell
npm run dev
```

Open http://localhost:5173.

## 3. Test the full flow

1. Open the **Assistant** and try: `I need a laptop for AI development under ₹70,000 with at least 16GB RAM`.
2. Open **Products** and filter/sort the catalogue, then click any product image/name to open its detail page.
3. Open **Compare** and select 2-4 products with the product search, or click Compare on a product card and add another product.
4. Open **Picks** and request `Noise cancelling headphones for travel under ₹10,000`.
5. Open **Checkout** from a product, click the PayPal button, and log in with a **Sandbox personal** account.
6. Approve the payment. The backend captures and verifies the amount, then saves the order.
7. Open **Orders** to see the verified transaction.
8. Check http://localhost:8000/api/orders to confirm the record in SQLite.

### Sandbox test accounts

In the PayPal Developer Dashboard, go to **Testing Tools → Sandbox Accounts** to find or create a personal (buyer) sandbox account. Use those credentials in the PayPal approval window. No real money moves.

## API endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/health` | Service status and whether Gemini/PayPal are configured |
| GET | `/api/products` | List products (`category`, `max_price`, `q` filters) |
| GET | `/api/products/{product_id}` | Product details |
| POST | `/api/ai/search` | Parse a query, search, rank, and optionally recommend |
| POST | `/api/ai/compare` | Compare 2–4 product IDs |
| POST | `/api/paypal/create-order` | Create a PayPal order using the server-side USD billing price |
| POST | `/api/paypal/capture-order` | Capture, verify, and persist a PayPal order |
| GET | `/api/orders` | List verified orders |

Example requests:

```powershell
Invoke-RestMethod -Method Post http://localhost:8000/api/ai/search `
  -ContentType "application/json" `
  -Body '{"query":"laptop for AI development under ₹70,000 with 16GB RAM","recommend":true}'
```

```powershell
Invoke-RestMethod -Method Post http://localhost:8000/api/paypal/create-order `
  -ContentType "application/json" `
  -Body '{"product_id":"LP-001"}'
```

## Security notes

- PayPal client secret and Gemini key live only in `backend/.env`.
- `.env` files and the SQLite database are git-ignored.
- The frontend never sends a price to the backend. The backend looks up the catalogue INR price and its fixed USD billing amount (`price_usd`) to create the PayPal order.
- Capture verification checks PayPal order status, capture status, currency, amount, and product ID.
- Duplicate captures are rejected by looking up the PayPal order ID before capture and by a unique database constraint.
- The backend never reports success without a verified PayPal capture response.

## Deployment

### Backend on Render

1. Push this repository to GitHub.
2. On Render, create a **Web Service** from the repo.
3. Set **Root Directory** to `backend`.
4. Build command: `pip install -r requirements.txt`
5. Start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
6. Add environment variables: `GEMINI_API_KEY`, `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_BASE_URL=https://api-m.sandbox.paypal.com`, `FRONTEND_ORIGIN=https://your-frontend.vercel.app`, `DATABASE_PATH=shoppilot.db`.
7. Optional: attach a persistent disk if you want orders to survive redeploys. Free instances may reset SQLite on redeploy.

### Frontend on Vercel

1. Import the same repository.
2. Set **Root Directory** to `frontend`.
3. Framework preset: Vite. Build command: `npm run build`. Output directory: `dist`.
4. Add environment variables: `VITE_API_BASE_URL=https://your-backend.onrender.com` and `VITE_PAYPAL_CLIENT_ID=your_sandbox_client_id`.
5. Redeploy after setting `FRONTEND_ORIGIN` on Render to the Vercel URL (CORS).

## Troubleshooting

| Problem | Fix |
| --- | --- |
| `PayPal Sandbox is not configured` | Add real Sandbox client ID and secret to `backend/.env` and restart the API. |
| PayPal buttons do not appear | Check `VITE_PAYPAL_CLIENT_ID` in `frontend/.env`, then restart Vite. |
| CORS error in the browser | Set `FRONTEND_ORIGIN` in `backend/.env` to the exact frontend origin and restart. |
| AI uses fallback instead of Gemini | Check `GEMINI_API_KEY`; restart the backend; the app is designed to keep working without it. |
| Orders disappear after redeploy | SQLite is on ephemeral storage; attach a persistent disk or use a hosted database. |
| `ModuleNotFoundError` | Activate the virtual environment and run `pip install -r requirements.txt`. |
| Blank white page; DevTools requests `/src/main.tsx` or `/pwa-entry-point-loaded` | A stale service worker from another Vite PWA project on `localhost:5173` is cached in your browser. DevTools → **Application → Service Workers → Unregister**, then **Application → Storage → Clear site data**, and reload. ShopPilot uses `/src/main.jsx` and has no service worker. |

## Demo script for judges (under 3 minutes)

1. **Problem (15s):** Shoppers struggle to turn vague needs into a confident purchase.
2. **Landing (10s):** Show the tagline and natural-language search.
3. **Assistant (35s):** Ask for an AI laptop under ₹70,000 with 16GB RAM. Show extracted budget/specs and ranked matches.
4. **Compare (25s):** Compare two laptops. Highlight explainable advantages/disadvantages.
5. **Recommendations (20s):** Ask for travel headphones under ₹10,000. Show best overall/budget/performance.
6. **Checkout (45s):** Select a product, show the server-priced summary, click PayPal, log in with the Sandbox buyer, and approve.
7. **Verification (20s):** Show the confirmation returned by the backend and the **Orders** page. Emphasize that no price is trusted from the browser and no success is shown without verified capture.
8. **Close (10s):** “ShopPilot AI turns intent into a verified purchase — AI for the decision, PayPal for the trust.”

## Why this can win

- **Real integration, not a mock:** the PayPal Orders API is used with server-side amount validation and capture verification.
- **AI is doing a job:** structured intent parsing, filtering, ranking, comparison, and explainability — not just chat.
- **Trust story:** explicit approval, server-authoritative pricing, duplicate-capture protection, and a clear separation between demo catalogue data and real Sandbox payments.
- **Complete flow:** discover → decide → pay → confirm → history, all in one polished app.
- **Fallback resilience:** the demo still works if Gemini is unavailable, which protects a live presentation.

## License

MIT — see [LICENSE](LICENSE).
