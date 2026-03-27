import os
import json
import datetime
import re

import requests
from flask import Flask, render_template, request, jsonify
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
app.secret_key = os.environ.get("SECRET_KEY", "change-me-in-production")

supabase: Client = create_client(
    os.environ.get("SUPABASE_URL", ""),
    os.environ.get("SUPABASE_KEY", "")
)

def square_headers():
    return {
        "Square-Version": "2024-04-17",
        "Authorization": f"Bearer {os.environ.get('SQUARE_ACCESS_TOKEN', '')}",
        "Content-Type": "application/json",
    }

SQUARE_BASE = "https://connect.squareup.com/v2"

def spoton_headers():
    return {
        "Authorization": f"Bearer {os.environ.get('SPOTON_API_KEY', '')}",
        "Content-Type": "application/json",
    }

SPOTON_BASE = os.environ.get("SPOTON_BASE_URL", "https://api.spoton.com/v1")

def safe_float(value, default=0.0):
    try:
        if value in (None, ""):
            return default
        return float(value)
    except (TypeError, ValueError):
        return default

def money_to_amount(money_obj):
    if not money_obj:
        return 0.0
    return round(safe_float(money_obj.get("amount", 0)) / 100.0, 2)

def normalize_name(value):
    value = (value or "").strip().lower()
    value = re.sub(r"\s+", " ", value)
    value = re.sub(r"[^a-z0-9 ]+", "", value)
    return value

def line_item_display_name(item_name, variation_name):
    item_name = (item_name or "").strip()
    variation_name = (variation_name or "").strip()
    if not variation_name or variation_name.lower() in {"regular", "default"}:
        return item_name
    if variation_name.lower() in item_name.lower():
        return item_name
    return f"{item_name} - {variation_name}".strip(" -")

def fetch_square_catalog_index():
    cursor = None
    objects = []
    while True:
        params = {"types": "ITEM,ITEM_VARIATION"}
        if cursor:
            params["cursor"] = cursor
        r = requests.get(f"{SQUARE_BASE}/catalog/list", headers=square_headers(), params=params, timeout=30)
        r.raise_for_status()
        data = r.json()
        objects.extend(data.get("objects", []))
        cursor = data.get("cursor")
        if not cursor:
            break
    item_name_by_id = {}
    for obj in objects:
        if obj.get("type") == "ITEM":
            item_name_by_id[obj.get("id")] = obj.get("item_data", {}).get("name", "")
    variation_map = {}
    for obj in objects:
        if obj.get("type") != "ITEM_VARIATION":
            continue
        var_data = obj.get("item_variation_data", {})
        item_id = var_data.get("item_id")
        item_name = item_name_by_id.get(item_id, "")
        variation_name = var_data.get("name", "")
        price_money = var_data.get("price_money") or {}
        variation_map[obj.get("id")] = {
            "catalog_object_id": obj.get("id"),
            "item_id": item_id,
            "item_name": item_name,
            "variation_name": variation_name,
            "display_name": line_item_display_name(item_name, variation_name),
            "sku": var_data.get("sku", ""),
            "price": money_to_amount(price_money),
            "present_at_all_locations": obj.get("present_at_all_locations", False),
            "version": obj.get("version"),
            "is_deleted": obj.get("is_deleted", False),
        }
    return variation_map

def build_product_cost_rows():
    products_response = supabase.table("products").select("*").execute()
    products = products_response.data or []
    ingredients_response = supabase.table("ingredients").select("*").execute()
    ingredients = {i["id"]: i for i in (ingredients_response.data or [])}
    product_ingredients_response = supabase.table("product_ingredients").select("*").execute()
    product_ingredients = product_ingredients_response.data or []
    product_ing_map = {}
    for pi in product_ingredients:
        pid = pi["product_id"]
        if pid not in product_ing_map:
            product_ing_map[pid] = []
        product_ing_map[pid].append(pi)
    rows = []
    by_square_id = {}
    by_name = {}
    for product in products:
        total_cost = 0.0
        components = product_ing_map.get(product["id"], [])
        for comp in components:
            ing = ingredients.get(comp["ingredient_id"])
            if ing:
                unit_cost = safe_float(ing.get("cost_per_unit", 0))
                qty = safe_float(comp.get("quantity", 0))
                total_cost += unit_cost * qty
        sale_price = safe_float(product.get("sale_price", 0))
        row = {
            "id": product["id"],
            "name": product.get("name", ""),
            "category": product.get("category", ""),
            "square_catalog_object_id": product.get("square_catalog_object_id", ""),
            "square_item_id": product.get("square_item_id", ""),
            "square_item_name": product.get("square_item_name", ""),
            "square_variation_name": product.get("square_variation_name", ""),
            "total_cost": round(total_cost, 4),
            "sale_price": sale_price,
            "food_cost_pct": round((total_cost / sale_price * 100), 2) if sale_price else 0,
            "margin": round(sale_price - total_cost, 4),
            "units_sold": 0.0,
            "actual_revenue": 0.0,
            "actual_cogs": 0.0,
            "actual_food_cost_pct": 0.0,
        }
        rows.append(row)
        if row["square_catalog_object_id"]:
            by_square_id[row["square_catalog_object_id"]] = row
        for name_value in {row["name"], row["square_item_name"], line_item_display_name(row["square_item_name"], row["square_variation_name"])}:
            normalized = normalize_name(name_value)
            if normalized:
                by_name[normalized] = row
    return rows, by_square_id, by_name

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/api/square/locations")
def square_locations():
    try:
        r = requests.get(f"{SQUARE_BASE}/locations", headers=square_headers(), timeout=10)
        r.raise_for_status()
        return jsonify(r.json())
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/square/catalog")
def square_catalog():
    try:
        variation_map = fetch_square_catalog_index()
        return jsonify({"items": list(variation_map.values()), "count": len(variation_map)})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/square/import_menu", methods=["POST"])
def square_import_menu():
    try:
        variation_map = fetch_square_catalog_index()
        imported = 0
        skipped = 0
        for catalog_id, item_data in variation_map.items():
            existing = supabase.table("products").select("id").eq("square_catalog_object_id", catalog_id).maybeSingle().execute()
            if existing.data:
                skipped += 1
                continue
            product = {
                "name": item_data["display_name"],
                "sale_price": item_data["price"],
                "square_catalog_object_id": catalog_id,
                "square_item_id": item_data["item_id"],
                "square_item_name": item_data["item_name"],
                "square_variation_name": item_data["variation_name"],
            }
            supabase.table("products").insert(product).execute()
            imported += 1
        return jsonify({"success": True, "imported": imported, "skipped": skipped, "total": len(variation_map)})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/ingredients", methods=["GET", "POST"])
def ingredients():
    if request.method == "POST":
        item = request.get_json() or {}
        result = supabase.table("ingredients").insert(item).execute()
        return jsonify(result.data[0] if result.data else {}), 201
    response = supabase.table("ingredients").select("*").order("name").execute()
    return jsonify(response.data or [])

@app.route("/api/ingredients/<iid>", methods=["GET", "PUT", "DELETE"])
def ingredient_detail(iid):
    if request.method == "DELETE":
        supabase.table("ingredients").delete().eq("id", iid).execute()
        return jsonify({"ok": True})
    if request.method == "PUT":
        item = request.get_json() or {}
        result = supabase.table("ingredients").update(item).eq("id", iid).execute()
        return jsonify(result.data[0] if result.data else {})
    response = supabase.table("ingredients").select("*").eq("id", iid).maybeSingle().execute()
    return jsonify(response.data or {})

@app.route("/api/ingredients/import", methods=["POST"])
def import_ingredients():
    items = request.get_json() or []
    if not isinstance(items, list):
        return jsonify({"error": "Expected array of ingredients"}), 400
    imported = 0
    errors = []
    for item in items:
        try:
            if not item.get("name"):
                errors.append(f"Skipping item without name: {item}")
                continue
            existing = supabase.table("ingredients").select("id").eq("name", item["name"]).maybeSingle().execute()
            if existing.data:
                supabase.table("ingredients").update(item).eq("id", existing.data["id"]).execute()
            else:
                supabase.table("ingredients").insert(item).execute()
            imported += 1
        except Exception as e:
            errors.append(f"Error importing {item.get('name', 'unknown')}: {str(e)}")
    return jsonify({"success": True, "imported": imported, "errors": errors})

@app.route("/api/products", methods=["GET", "POST"])
def products():
    if request.method == "POST":
        item = request.get_json() or {}
        result = supabase.table("products").insert(item).execute()
        return jsonify(result.data[0] if result.data else {}), 201
    response = supabase.table("products").select("*").order("name").execute()
    return jsonify(response.data or [])

@app.route("/api/products/<pid>", methods=["GET", "PUT", "DELETE"])
def product_detail(pid):
    if request.method == "DELETE":
        supabase.table("products").delete().eq("id", pid).execute()
        return jsonify({"ok": True})
    if request.method == "PUT":
        item = request.get_json() or {}
        components = item.pop("components", None)
        result = supabase.table("products").update(item).eq("id", pid).execute()
        if components is not None:
            supabase.table("product_ingredients").delete().eq("product_id", pid).execute()
            for comp in components:
                comp["product_id"] = pid
                supabase.table("product_ingredients").insert(comp).execute()
        return jsonify(result.data[0] if result.data else {})
    response = supabase.table("products").select("*").eq("id", pid).maybeSingle().execute()
    product = response.data or {}
    if product:
        pi_response = supabase.table("product_ingredients").select("*").eq("product_id", pid).execute()
        product["components"] = pi_response.data or []
    return jsonify(product)

@app.route("/api/cost_summary")
def cost_summary():
    rows, by_square_id, by_name = build_product_cost_rows()
    return jsonify({"items": rows, "totals": {"recipes": len(rows)}, "unmatched_square_items": [], "filters": {}})

@app.route("/api/settings", methods=["GET", "POST"])
def settings():
    if request.method == "POST":
        return jsonify(request.get_json() or {})
    return jsonify({"target_pct": 30})

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 5000)), debug=False)
