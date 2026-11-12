import os
import time
from typing import Any, Dict, Optional

import httpx
from dotenv import load_dotenv

load_dotenv()

DEFAULT_BASE_URL = "https://api-m.sandbox.paypal.com"
CURRENCY = "USD"
TIMEOUT = 20.0

_token_cache: Dict[str, Any] = {"token": None, "expires_at": 0.0}


class PayPalError(Exception):
    def __init__(self, message: str, status_code: int = 502):
        super().__init__(message)
        self.message = message
        self.status_code = status_code


def is_configured() -> bool:
    client_id = os.getenv("PAYPAL_CLIENT_ID", "")
    client_secret = os.getenv("PAYPAL_CLIENT_SECRET", "")
    return bool(client_id and client_secret and not client_id.startswith("your_"))


def _base_url() -> str:
    return (os.getenv("PAYPAL_BASE_URL") or DEFAULT_BASE_URL).rstrip("/")


def _credentials() -> tuple:
    client_id = os.getenv("PAYPAL_CLIENT_ID", "")
    client_secret = os.getenv("PAYPAL_CLIENT_SECRET", "")
    if not is_configured():
        raise PayPalError(
            "PayPal Sandbox is not configured. Set PAYPAL_CLIENT_ID and "
            "PAYPAL_CLIENT_SECRET in backend/.env.",
            status_code=503,
        )
    return client_id, client_secret


def _access_token() -> str:
    now = time.time()
    if _token_cache["token"] and now < _token_cache["expires_at"] - 30:
        return _token_cache["token"]

    client_id, client_secret = _credentials()
    try:
        response = httpx.post(
            f"{_base_url()}/v1/oauth2/token",
            data={"grant_type": "client_credentials"},
            auth=(client_id, client_secret),
            headers={"Accept": "application/json"},
            timeout=TIMEOUT,
        )
        response.raise_for_status()
    except httpx.HTTPStatusError as exc:
        raise PayPalError(
            f"PayPal authentication failed ({exc.response.status_code}). "
            "Check your Sandbox client ID and secret.",
            status_code=502,
        ) from exc
    except httpx.HTTPError as exc:
        raise PayPalError(f"Could not reach PayPal: {exc}", status_code=502) from exc

    data = response.json()
    _token_cache["token"] = data.get("access_token")
    _token_cache["expires_at"] = now + float(data.get("expires_in", 3000))
    if not _token_cache["token"]:
        raise PayPalError("PayPal did not return an access token.", status_code=502)
    return _token_cache["token"]


def _request(method: str, path: str, json_body: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    token = _access_token()
    try:
        response = httpx.request(
            method,
            f"{_base_url()}{path}",
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
                "Accept": "application/json",
                "Prefer": "return=representation",
            },
            json=json_body,
            timeout=TIMEOUT,
        )
        response.raise_for_status()
    except httpx.HTTPStatusError as exc:
        detail = ""
        try:
            payload = exc.response.json()
            detail = payload.get("message") or payload.get("error_description") or ""
            if not detail and isinstance(payload.get("details"), list):
                detail = "; ".join(
                    item.get("description", "") for item in payload["details"]
                )
        except Exception:
            detail = exc.response.text[:300]
        raise PayPalError(
            f"PayPal request failed ({exc.response.status_code}): {detail or 'unknown error'}",
            status_code=502,
        ) from exc
    except httpx.HTTPError as exc:
        raise PayPalError(f"Could not reach PayPal: {exc}", status_code=502) from exc

    if response.content:
        return response.json()
    return {}


def _catalogue_usd_price(product: Dict[str, Any]) -> float:
    value = product.get("price_usd")
    if value is None:
        raise PayPalError(
            "Product is missing a USD billing price (price_usd).", status_code=500
        )
    return float(value)


def create_order(product: Dict[str, Any]) -> Dict[str, Any]:
    amount = f"{_catalogue_usd_price(product):.2f}"
    body = {
        "intent": "CAPTURE",
        "purchase_units": [
            {
                "reference_id": product["id"],
                "custom_id": product["id"],
                "description": f"{product['name']} - ShopPilot AI demo order",
                "amount": {"currency_code": CURRENCY, "value": amount},
            }
        ],
        "application_context": {
            "brand_name": "ShopPilot AI",
            "shipping_preference": "NO_SHIPPING",
            "user_action": "PAY_NOW",
        },
    }
    data = _request("POST", "/v2/checkout/orders", body)
    order_id = data.get("id")
    if not order_id:
        raise PayPalError("PayPal did not return an order ID.", status_code=502)

    approval_url = None
    for link in data.get("links", []):
        if link.get("rel") in ("approve", "payer-action"):
            approval_url = link.get("href")
            break

    return {
        "paypal_order_id": order_id,
        "status": data.get("status"),
        "approval_url": approval_url,
        "links": data.get("links", []),
        "amount": amount,
        "currency": CURRENCY,
    }


def capture_order(paypal_order_id: str) -> Dict[str, Any]:
    return _request("POST", f"/v2/checkout/orders/{paypal_order_id}/capture")


def _find_capture(capture_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    for unit in capture_data.get("purchase_units", []) or []:
        for capture in (unit.get("payments") or {}).get("captures", []) or []:
            return capture
    return None


def verify_capture(capture_data: Dict[str, Any], product: Dict[str, Any]) -> Dict[str, Any]:
    status = capture_data.get("status")
    if status != "COMPLETED":
        raise PayPalError(
            f"Payment was not completed (PayPal status: {status}).", status_code=400
        )

    purchase_units = capture_data.get("purchase_units") or []
    if not purchase_units:
        raise PayPalError("PayPal response has no purchase units.", status_code=502)

    unit = purchase_units[0]
    custom_id = unit.get("custom_id")
    if custom_id and custom_id != product["id"]:
        raise PayPalError(
            "Paid product does not match the requested product.", status_code=400
        )

    capture = _find_capture(capture_data)
    if not capture:
        raise PayPalError("PayPal response has no capture record.", status_code=502)

    if capture.get("status") != "COMPLETED":
        raise PayPalError(
            f"Capture was not completed (status: {capture.get('status')}).",
            status_code=400,
        )

    amount = capture.get("amount") or {}
    currency = amount.get("currency_code")
    value = amount.get("value")
    expected = round(_catalogue_usd_price(product), 2)
    try:
        paid = round(float(value), 2)
    except (TypeError, ValueError):
        raise PayPalError("PayPal capture amount is invalid.", status_code=502)

    if currency != CURRENCY:
        raise PayPalError(
            f"Unexpected currency {currency}; expected {CURRENCY}.", status_code=400
        )
    if abs(paid - expected) > 0.005:
        raise PayPalError(
            f"Paid amount ${paid:.2f} does not match catalogue price ${expected:.2f}.",
            status_code=400,
        )

    payer = capture_data.get("payer") or {}
    return {
        "paid_amount": paid,
        "currency": currency,
        "capture_id": capture.get("id"),
        "capture_status": capture.get("status"),
        "payer_email": payer.get("email_address"),
    }
