import os
import json
import re
from typing import Dict, Any, List
from dotenv import load_dotenv

try:
    from .product_service import filter_products, list_products, get_product
except ImportError:
    from product_service import filter_products, list_products, get_product

load_dotenv()

def _fallback_extract(query: str) -> Dict[str, Any]:
    q = query.lower()
    category = None
    if "laptop" in q or "notebook" in q:
        category = "laptop"
    elif "headphone" in q or "earbud" in q or "earphone" in q:
        category = "headphone"
    elif "smartphone" in q or "mobile" in q or re.search(r"\bphone\b", q):
        category = "smartphone"
    elif "accessor" in q or "keyboard" in q or "mouse" in q or "webcam" in q:
        category = "accessory"
    budget = None
    currency = r"(?:₹|rs\.?|inr|\$)?"
    amount = r"(\d[\d,]*(?:\.\d+)?)\s*(k|thousand|lakh|lac)?"
    m = re.search(rf"(?:under|below|less than|max(?:imum)?|budget|within)\s*{currency}\s*{amount}", q)
    if not m:
        m = re.search(rf"(?:₹|rs\.?|inr|\$)\s*{amount}", q)
    if m:
        number = float(m.group(1).replace(",", ""))
        suffix = (m.group(2) or "").lower()
        if suffix in ("k", "thousand"):
            number *= 1000
        elif suffix in ("lakh", "lac"):
            number *= 100000
        budget = number
    min_specs = {}
    ram = re.search(r"(\d+)\s*gb\s*ram", q)
    if ram: min_specs["RAM"] = f"{ram.group(1)}GB"
    storage = re.search(r"(\d+)\s*(gb|tb)\s*(ssd|storage)", q)
    if storage: min_specs["Storage"] = f"{storage.group(1)}{storage.group(2).upper()}"
    return {"category": category, "max_budget": budget, "min_specs": min_specs, "keywords": [w for w in re.findall(r"[a-zA-Z0-9]+", q) if len(w)>3][:8]}

def _call_gemini(query: str) -> Dict[str, Any]:
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key or api_key.startswith("your_"):
        raise RuntimeError("Gemini not configured")
    import google.generativeai as genai
    genai.configure(api_key=api_key)
    model = genai.GenerativeModel(os.getenv("GEMINI_MODEL", "gemini-2.0-flash"))
    prompt = f"""You are a shopping intent parser for an Indian shopping assistant. Return ONLY valid JSON with keys: category (one of laptop, smartphone, headphone, accessory, or null), max_budget (number in Indian rupees/INR or null), min_specs (object, keys like RAM, Storage, Processor), keywords (array of strings), follow_up_question (string or null).
User request: {query}
Rules: Do not invent products. Extract only what user states or clearly implies. Interpret ₹, Rs, INR, k, and lakh correctly."""
    resp = model.generate_content(prompt)
    text = resp.text or "{}"
    text = re.sub(r"^```json|^```|```$", "", text.strip(), flags=re.MULTILINE).strip()
    return json.loads(text)

def analyze_query(query: str) -> Dict[str, Any]:
    try:
        extracted = _call_gemini(query)
        source = "gemini"
    except Exception:
        extracted = _fallback_extract(query)
        source = "fallback"
    extracted.setdefault("category", None)
    extracted.setdefault("max_budget", None)
    extracted.setdefault("min_specs", {})
    extracted.setdefault("keywords", [])
    extracted.setdefault("follow_up_question", None)
    return {"extracted": extracted, "source": source}

def rank_products(matches: List[Dict[str, Any]], extracted: Dict[str, Any]) -> List[Dict[str, Any]]:
    budget = extracted.get("max_budget")
    def score(p):
        s = 0
        if budget:
            s += max(0, 30 - abs(float(p["price"]) - float(budget)) / max(1,float(budget)) * 30)
        s += float(p.get("rating", 4)) * 5
        s += min(20, len(p.get("features", [])) * 3)
        return s
    return sorted(matches, key=score, reverse=True)

def search(query: str, recommend: bool=False) -> Dict[str, Any]:
    analysis = analyze_query(query)
    extracted = analysis["extracted"]
    matches = filter_products(extracted.get("category"), extracted.get("max_budget"), extracted.get("min_specs") or None)
    if not matches and extracted.get("category"):
        # broaden: ignore specs if too strict
        matches = filter_products(extracted.get("category"), extracted.get("max_budget"), None)
    ranked = rank_products(matches, extracted)
    msg = f"Found {len(ranked)} matching item(s) in our curated demo catalogue." if ranked else "No close matches found in the curated demo catalogue. Try adjusting budget or specs."
    follow = extracted.get("follow_up_question")
    if not ranked and not extracted.get("category"):
        follow = follow or "What product category are you interested in (laptop, smartphone, headphone, or accessory)?"
    result = {
        "extracted": extracted,
        "matches": ranked[:8],
        "message": msg,
        "follow_up_question": follow,
        "source": analysis["source"],
        "currency": "INR",
        "billing_currency": "USD",
    }
    if recommend and ranked:
        best_overall = ranked[0]
        best_budget = sorted(ranked, key=lambda p: p["price"])[0]
        best_perf = sorted(ranked, key=lambda p: (p.get("rating",0), -p["price"]), reverse=True)[0]
        def enrich(p, reason):
            return {**p, "reason": reason}
        result["recommendations"] = {
            "best_overall": enrich(best_overall, "Strong balance of price, specs, and demo rating for your needs."),
            "best_budget": enrich(best_budget, "Lowest price among matching options while meeting stated constraints."),
            "best_performance": enrich(best_perf, "Highest capability/demo rating among matching options."),
        }
        result["recommendation_reason"] = "Picks are derived from catalogue specs/prices and your stated requirements (no invented data)."
    return result

def _format_inr(value: Any) -> str:
    return f"₹{float(value):,.0f}"


def compare(product_ids: List[str]) -> Dict[str, Any]:
    products = [get_product(pid) for pid in product_ids]
    products = [p for p in products if p]
    if len(products) < 2:
        raise ValueError("Need at least two valid product IDs to compare")
    comparison = []
    prices = [p["price"] for p in products]
    min_p, max_p = min(prices), max(prices)
    for p in products:
        adv, disadv = [], []
        if p["price"] == min_p: adv.append("Lowest price in this comparison")
        if p["price"] == max_p: disadv.append("Highest price in this comparison")
        ram = str(p.get("specifications",{}).get("RAM",""))
        if "32" in ram or "24" in ram: adv.append("High memory capacity")
        if ram.startswith("8"): disadv.append("Lower memory may limit heavy workloads")
        if not disadv: disadv.append("May lack some premium features versus higher-priced options")
        comparison.append({"product": p, "advantages": adv, "disadvantages": disadv})
    summary = " | ".join([f"{p['name']}: {_format_inr(p['price'])}" for p in products]) + ". Choose based on budget vs performance; prices/specs shown are from the curated demo catalogue. Prices are in INR; PayPal bills the USD equivalent at checkout."
    return {"comparison": comparison, "summary": summary, "products": products, "currency": "INR", "billing_currency": "USD"}
