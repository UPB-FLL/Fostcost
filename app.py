
import os, json, datetime, requests
from flask import Flask, render_template, request, jsonify, redirect, url_for, session, flash
from functools import wraps

app = Flask(__name__)
app.secret_key = os.environ.get("SECRET_KEY", "change-me-in-production")

# ── helpers ──────────────────────────────────────────────────────────────────

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

# ── routes ───────────────────────────────────────────────────────────────────

@app.route("/")
def index():
    return render_template("index.html")

# ── SQUARE ────────────────────────────────────────────────────────────────────

@app.route("/api/square/locations")
def square_locations():
    try:
        r = requests.get(f"{SQUARE_BASE}/locations", headers=square_headers(), timeout=10)
        r.raise_for_status()
        return jsonify(r.json())
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/square/orders", methods=["POST"])
def square_orders():
    """Fetch orders for a location + date range."""
    body = request.get_json()
    location_id = body.get("location_id")
    start_at    = body.get("start_at")   # RFC3339
    end_at      = body.get("end_at")

    payload = {
        "location_ids": [location_id],
        "query": {
            "filter": {
                "date_time_filter": {
                    "created_at": {"start_at": start_at, "end_at": end_at}
                },
                "state_filter": {"states": ["COMPLETED"]}
            }
        },
        "limit": 500
    }
    try:
        r = requests.post(f"{SQUARE_BASE}/orders/search", headers=square_headers(),
                          json=payload, timeout=15)
        r.raise_for_status()
        return jsonify(r.json())
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/square/catalog")
def square_catalog():
    """Pull all ITEM_VARIATION entries (menu items with prices)."""
    try:
        r = requests.get(f"{SQUARE_BASE}/catalog/list?types=ITEM_VARIATION",
                         headers=square_headers(), timeout=15)
        r.raise_for_status()
        return jsonify(r.json())
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ── SPOTON ────────────────────────────────────────────────────────────────────

@app.route("/api/spoton/locations")
def spoton_locations():
    try:
        r = requests.get(f"{SPOTON_BASE}/locations", headers=spoton_headers(), timeout=10)
        r.raise_for_status()
        return jsonify(r.json())
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/spoton/sales", methods=["POST"])
def spoton_sales():
    body = request.get_json()
    params = {
        "location_id": body.get("location_id"),
        "start_date":  body.get("start_date"),
        "end_date":    body.get("end_date"),
    }
    try:
        r = requests.get(f"{SPOTON_BASE}/reports/sales", headers=spoton_headers(),
                         params=params, timeout=15)
        r.raise_for_status()
        return jsonify(r.json())
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/spoton/menu")
def spoton_menu():
    try:
        r = requests.get(f"{SPOTON_BASE}/menu/items", headers=spoton_headers(), timeout=15)
        r.raise_for_status()
        return jsonify(r.json())
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ── FOOD COST TRACKER (local DB helpers) ─────────────────────────────────────

DB_FILE = os.path.join(os.path.dirname(__file__), "food_costs.json")

def load_db():
    if os.path.exists(DB_FILE):
        with open(DB_FILE) as f:
            return json.load(f)
    return {"ingredients": [], "recipes": [], "entries": []}

def save_db(db):
    with open(DB_FILE, "w") as f:
        json.dump(db, f, indent=2)

# --- ingredients ---
@app.route("/api/ingredients", methods=["GET", "POST"])
def ingredients():
    db = load_db()
    if request.method == "POST":
        item = request.get_json()
        item["id"] = str(int(datetime.datetime.utcnow().timestamp() * 1000))
        db["ingredients"].append(item)
        save_db(db)
        return jsonify(item), 201
    return jsonify(db["ingredients"])

@app.route("/api/ingredients/<iid>", methods=["PUT", "DELETE"])
def ingredient_detail(iid):
    db = load_db()
    idx = next((i for i, x in enumerate(db["ingredients"]) if x["id"] == iid), None)
    if idx is None:
        return jsonify({"error": "not found"}), 404
    if request.method == "DELETE":
        db["ingredients"].pop(idx)
        save_db(db)
        return jsonify({"ok": True})
    db["ingredients"][idx].update(request.get_json())
    save_db(db)
    return jsonify(db["ingredients"][idx])

# --- recipes ---
@app.route("/api/recipes", methods=["GET", "POST"])
def recipes():
    db = load_db()
    if request.method == "POST":
        item = request.get_json()
        item["id"] = str(int(datetime.datetime.utcnow().timestamp() * 1000))
        db["recipes"].append(item)
        save_db(db)
        return jsonify(item), 201
    return jsonify(db["recipes"])

@app.route("/api/recipes/<rid>", methods=["GET", "PUT", "DELETE"])
def recipe_detail(rid):
    db = load_db()
    idx = next((i for i, x in enumerate(db["recipes"]) if x["id"] == rid), None)
    if idx is None:
        return jsonify({"error": "not found"}), 404
    if request.method == "DELETE":
        db["recipes"].pop(idx)
        save_db(db)
        return jsonify({"ok": True})
    if request.method == "PUT":
        db["recipes"][idx].update(request.get_json())
        save_db(db)
    return jsonify(db["recipes"][idx])

# --- cost summary ---
@app.route("/api/cost_summary")
def cost_summary():
    db = load_db()
    ing_map = {i["id"]: i for i in db["ingredients"]}
    results = []
    for recipe in db["recipes"]:
        total_cost = 0.0
        for comp in recipe.get("components", []):
            ing = ing_map.get(comp.get("ingredient_id"))
            if ing:
                unit_cost = float(ing.get("cost_per_unit", 0))
                qty       = float(comp.get("quantity", 0))
                total_cost += unit_cost * qty
        sale_price = float(recipe.get("sale_price", 0))
        food_cost_pct = (total_cost / sale_price * 100) if sale_price else 0
        results.append({
            "id":             recipe["id"],
            "name":           recipe.get("name", ""),
            "total_cost":     round(total_cost, 4),
            "sale_price":     sale_price,
            "food_cost_pct":  round(food_cost_pct, 2),
            "margin":         round(sale_price - total_cost, 4),
        })
    return jsonify(results)

# ── settings ──────────────────────────────────────────────────────────────────

@app.route("/api/settings", methods=["GET", "POST"])
def settings():
    db = load_db()
    if request.method == "POST":
        db["settings"] = request.get_json()
        save_db(db)
        return jsonify(db["settings"])
    return jsonify(db.get("settings", {}))

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 5000)), debug=False)
