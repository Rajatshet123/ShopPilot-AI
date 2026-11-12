import logging
import os
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import Optional

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

try:
    from . import ai_agent, database, paypal_service
    from .models import (
        AICompareRequest,
        AISearchRequest,
        CaptureOrderRequest,
        CreateOrderRequest,
    )
    from .product_service import get_product, list_products
except ImportError:
    import ai_agent
    import database
    import paypal_service
    from models import (
        AICompareRequest,
        AISearchRequest,
        CaptureOrderRequest,
        CreateOrderRequest,
    )
    from product_service import get_product, list_products

load_dotenv()
logger = logging.getLogger("shoppilot")
logging.basicConfig(level=logging.INFO)


@asynccontextmanager
async def lifespan(app: FastAPI):
    database.init_db()
    logger.info("ShopPilot database ready")
    yield


app = FastAPI(
    title="ShopPilot AI API",
    description="AI shopping assistant with verified PayPal Sandbox checkout.",
    version="1.0.0",
    lifespan=lifespan,
)

_origins_env = os.getenv("FRONTEND_ORIGIN", "")
_origins = [origin.strip() for origin in _origins_env.split(",") if origin.strip()]
if not _origins:
    _origins = ["http://localhost:5173", "http://127.0.0.1:5173"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _demo_note() -> str:
    return (
        "Prices are shown in Indian rupees (INR) from a curated demo catalogue. "
        "PayPal Sandbox bills the USD equivalent because PayPal does not support INR transactions."
    )


@app.get("/")
def root():
    return {
        "service": "ShopPilot AI API",
        "docs": "/docs",
        "health": "/health",
        "note": _demo_note(),
    }


@app.get("/health")
def health():
    gemini_key = os.getenv("GEMINI_API_KEY", "")
    return {
        "status": "ok",
        "service": "shoppilot-api",
        "time": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "gemini_configured": bool(gemini_key and not gemini_key.startswith("your_")),
        "paypal_configured": paypal_service.is_configured(),
    }


@app.get("/api/products")
def get_products(
    category: Optional[str] = Query(default=None, max_length=50),
    max_price: Optional[float] = Query(default=None, gt=0),
    q: Optional[str] = Query(default=None, max_length=100),
):
    products = list_products(category)
    if max_price is not None:
        products = [p for p in products if float(p["price"]) <= max_price]
    if q:
        term = q.lower()
        products = [
            p
            for p in products
            if term in p["name"].lower()
            or term in p["brand"].lower()
            or term in p["description"].lower()
            or any(term in feature.lower() for feature in p.get("features", []))
        ]
    return {
        "products": products,
        "count": len(products),
        "currency": "INR",
        "billing_currency": "USD",
        "demo_note": _demo_note(),
    }


@app.get("/api/products/{product_id}")
def get_product_detail(product_id: str):
    product = get_product(product_id)
    if not product:
        raise HTTPException(status_code=404, detail=f"Product {product_id} not found")
    return {"product": product, "demo_note": _demo_note()}


@app.post("/api/ai/search")
def ai_search(payload: AISearchRequest):
    try:
        result = ai_agent.search(payload.query, payload.recommend)
    except Exception as exc:
        logger.exception("AI search failed")
        raise HTTPException(status_code=500, detail=f"AI search failed: {exc}") from exc
    result["demo_note"] = _demo_note()
    return result


@app.post("/api/ai/compare")
def ai_compare(payload: AICompareRequest):
    try:
        result = ai_agent.compare(payload.product_ids)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("AI compare failed")
        raise HTTPException(status_code=500, detail=f"AI compare failed: {exc}") from exc
    result["demo_note"] = _demo_note()
    return result


@app.post("/api/paypal/create-order")
def create_paypal_order(payload: CreateOrderRequest):
    product = get_product(payload.product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    if not paypal_service.is_configured():
        raise HTTPException(
            status_code=503,
            detail="PayPal Sandbox is not configured. Add PAYPAL_CLIENT_ID and "
            "PAYPAL_CLIENT_SECRET to backend/.env.",
        )
    try:
        order = paypal_service.create_order(product)
    except paypal_service.PayPalError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message) from exc

    order["product"] = {
        "id": product["id"],
        "name": product["name"],
        "price": product["price"],
        "price_usd": product["price_usd"],
        "currency": "INR",
        "billing_currency": "USD",
    }
    return order


@app.post("/api/paypal/capture-order")
def capture_paypal_order(payload: CaptureOrderRequest):
    product = get_product(payload.product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    if not paypal_service.is_configured():
        raise HTTPException(
            status_code=503,
            detail="PayPal Sandbox is not configured. Add PAYPAL_CLIENT_ID and "
            "PAYPAL_CLIENT_SECRET to backend/.env.",
        )

    existing = database.get_order_by_paypal_id(payload.paypal_order_id)
    if existing:
        return {
            "status": "already_captured",
            "verified": True,
            "message": "This PayPal order was already captured and recorded.",
            "order": existing,
        }

    try:
        capture_data = paypal_service.capture_order(payload.paypal_order_id)
        verified = paypal_service.verify_capture(capture_data, product)
    except paypal_service.PayPalError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message) from exc

    saved = database.save_order(
        paypal_order_id=payload.paypal_order_id,
        product_id=product["id"],
        product_name=product["name"],
        total_price=verified["paid_amount"],
        currency=verified["currency"],
        status="COMPLETED",
        payer_email=verified.get("payer_email"),
        capture=capture_data,
    )

    return {
        "status": "COMPLETED",
        "verified": True,
        "message": "Payment captured and verified on the backend.",
        "paypal_order_id": payload.paypal_order_id,
        "capture_id": verified.get("capture_id"),
        "paid_amount": verified["paid_amount"],
        "currency": verified["currency"],
        "order": saved,
    }


@app.get("/api/orders")
def get_orders():
    orders = database.list_orders()
    return {"orders": orders, "count": len(orders)}
