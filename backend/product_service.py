import json
import re
from pathlib import Path
from typing import List, Optional, Dict, Any

DATA_PATH = Path(__file__).parent / "products.json"

_cache: List[Dict[str, Any]] = []

def load_products() -> List[Dict[str, Any]]:
    global _cache
    if not _cache:
        with open(DATA_PATH, "r", encoding="utf-8") as f:
            _cache = json.load(f)
    return _cache

def list_products(category: Optional[str] = None) -> List[Dict[str, Any]]:
    products = load_products()
    if category:
        products = [p for p in products if p["category"].lower() == category.lower()]
    return products

def get_product(product_id: str) -> Optional[Dict[str, Any]]:
    for p in load_products():
        if p["id"] == product_id:
            return p
    return None

def _capacity_gb(value: Any) -> Optional[float]:
    match = re.search(r"([\d.]+)\s*(tb|gb)", str(value), re.IGNORECASE)
    if not match:
        return None
    number = float(match.group(1))
    return number * 1024 if match.group(2).lower() == "tb" else number


def filter_products(category: Optional[str]=None, max_price: Optional[float]=None, min_specs: Optional[Dict[str, Any]]=None) -> List[Dict[str, Any]]:
    results = list_products(category)
    if max_price is not None:
        results = [p for p in results if float(p["price"]) <= float(max_price)]
    if min_specs:
        def meets(p):
            specs = {k.lower(): v for k,v in (p.get("specifications") or {}).items()}
            for k, req in min_specs.items():
                val = specs.get(k.lower())
                if val is None: return False
                vnum = _capacity_gb(val)
                rnum = _capacity_gb(req)
                if vnum is not None and rnum is not None:
                    if vnum < rnum: return False
                    continue
                if str(req).lower() not in str(val).lower() and str(val).lower() not in str(req).lower():
                    return False
            return True
        results = [p for p in results if meets(p)]
    return results
