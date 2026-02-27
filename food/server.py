#!/usr/bin/env python3
"""Campfire Ahmedabad — Food Ordering Service (Flask server)"""

import json
import os
import time
from flask import Flask, request, jsonify, send_from_directory

app = Flask(__name__, static_folder='public', static_url_path='')

DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'data')
MENU_FILE = os.path.join(DATA_DIR, 'menu.json')
ORDERS_FILE = os.path.join(DATA_DIR, 'orders.json')

os.makedirs(DATA_DIR, exist_ok=True)

# --- Default Menu ---
DEFAULT_MENU = {
    "snacks": {
        "label": "Snacks",
        "items": [
            {"id": "s1", "name": "Popcorn", "desc": "Buttery & salted, classic movie-night style"},
            {"id": "s2", "name": "Cookies", "desc": "Fresh-baked chocolate chip cookies"},
            {"id": "s3", "name": "Cupcakes", "desc": "Vanilla frosted cupcakes with sprinkles"},
            {"id": "s4", "name": "Pretzels", "desc": "Soft pretzel bites with cheese dip"},
            {"id": "s5", "name": "Pizza Slice", "desc": "Hot cheesy pizza, perfect hackathon fuel"},
            {"id": "s6", "name": "Sandwich", "desc": "Freshly made veggie or paneer sandwich"},
            {"id": "s7", "name": "Tacos", "desc": "Crunchy tacos with all the toppings"},
            {"id": "s8", "name": "Donuts", "desc": "Glazed donuts, sugar rush guaranteed!"},
        ],
    },
    "drinks": {
        "label": "Drinks",
        "items": [
            {"id": "d1", "name": "Coffee", "desc": "Hot brewed coffee to keep you coding"},
            {"id": "d2", "name": "Chai", "desc": "Masala chai, the Indian way"},
            {"id": "d3", "name": "Juice Box", "desc": "Mixed fruit juice, refreshing & sweet"},
            {"id": "d4", "name": "Cold Drink", "desc": "Chilled soda — cola, lime, or orange"},
            {"id": "d5", "name": "Milkshake", "desc": "Thick chocolate or mango milkshake"},
            {"id": "d6", "name": "Water Bottle", "desc": "Stay hydrated, hacker!"},
        ],
    },
    "meals": {
        "label": "Meals",
        "items": [
            {"id": "m1", "name": "Dal Rice", "desc": "Comfort food — dal tadka with steamed rice"},
            {"id": "m2", "name": "Pav Bhaji", "desc": "Mumbai-style pav bhaji with butter"},
            {"id": "m3", "name": "Roti Sabzi", "desc": "Fresh roti with mixed veg sabzi"},
            {"id": "m4", "name": "Maggi", "desc": "Two-minute noodles, hackathon classic!"},
            {"id": "m5", "name": "Salad Bowl", "desc": "Fresh garden salad with dressings"},
            {"id": "m6", "name": "Biryani", "desc": "Fragrant veg biryani with raita"},
        ],
    },
}


# --- Data I/O ---
def read_json(filepath, fallback):
    try:
        if os.path.exists(filepath):
            with open(filepath, 'r') as f:
                return json.load(f)
    except Exception as e:
        print(f"Error reading {filepath}: {e}")
    return fallback


def write_json(filepath, data):
    with open(filepath, 'w') as f:
        json.dump(data, f, indent=2)


# Init default data
if not os.path.exists(MENU_FILE):
    write_json(MENU_FILE, DEFAULT_MENU)
if not os.path.exists(ORDERS_FILE):
    write_json(ORDERS_FILE, [])


# ========================
# Static Pages
# ========================
@app.route('/')
def index():
    return send_from_directory(app.static_folder, 'index.html')


@app.route('/organiser.html')
def organiser():
    return send_from_directory(app.static_folder, 'organiser.html')


# ========================
# Menu APIs
# ========================
@app.route('/api/menu', methods=['GET'])
def get_menu():
    menu = read_json(MENU_FILE, DEFAULT_MENU)
    return jsonify(menu)


@app.route('/api/menu/category', methods=['POST'])
def add_category():
    data = request.json
    key = data.get('key', '').strip()
    label = data.get('label', '').strip()
    if not key or not label:
        return jsonify({"error": "key and label required"}), 400

    menu = read_json(MENU_FILE, DEFAULT_MENU)
    if key in menu:
        return jsonify({"error": "Category already exists"}), 409

    menu[key] = {"label": label, "items": []}
    write_json(MENU_FILE, menu)
    return jsonify({"success": True, "menu": menu})


@app.route('/api/menu/category/<key>', methods=['DELETE'])
def delete_category(key):
    menu = read_json(MENU_FILE, DEFAULT_MENU)
    if key not in menu:
        return jsonify({"error": "Category not found"}), 404

    del menu[key]
    write_json(MENU_FILE, menu)
    return jsonify({"success": True, "menu": menu})


@app.route('/api/menu/<category>/item', methods=['POST'])
def add_item(category):
    data = request.json
    name = data.get('name', '').strip()
    desc = data.get('desc', '').strip()
    if not name:
        return jsonify({"error": "name is required"}), 400

    menu = read_json(MENU_FILE, DEFAULT_MENU)
    if category not in menu:
        return jsonify({"error": "Category not found"}), 404

    item_id = category[0] + hex(int(time.time() * 1000))[2:]
    item = {"id": item_id, "name": name, "desc": desc}
    menu[category]["items"].append(item)
    write_json(MENU_FILE, menu)
    return jsonify({"success": True, "item": item, "menu": menu})


@app.route('/api/menu/<category>/item/<item_id>', methods=['PUT'])
def update_item(category, item_id):
    data = request.json
    menu = read_json(MENU_FILE, DEFAULT_MENU)
    if category not in menu:
        return jsonify({"error": "Category not found"}), 404

    item = next((i for i in menu[category]["items"] if i["id"] == item_id), None)
    if not item:
        return jsonify({"error": "Item not found"}), 404

    if 'name' in data:
        item['name'] = data['name']
    if 'desc' in data:
        item['desc'] = data['desc']
    write_json(MENU_FILE, menu)
    return jsonify({"success": True, "item": item, "menu": menu})


@app.route('/api/menu/<category>/item/<item_id>', methods=['DELETE'])
def delete_item(category, item_id):
    menu = read_json(MENU_FILE, DEFAULT_MENU)
    if category not in menu:
        return jsonify({"error": "Category not found"}), 404

    items = menu[category]["items"]
    idx = next((i for i, x in enumerate(items) if x["id"] == item_id), None)
    if idx is None:
        return jsonify({"error": "Item not found"}), 404

    items.pop(idx)
    write_json(MENU_FILE, menu)
    return jsonify({"success": True, "menu": menu})


# ========================
# Order APIs
# ========================
@app.route('/api/orders', methods=['GET'])
def get_orders():
    orders = read_json(ORDERS_FILE, [])
    return jsonify(orders)


@app.route('/api/orders', methods=['POST'])
def create_order():
    data = request.json
    name = data.get('name', '').strip()
    items = data.get('items', [])
    if not name or not items:
        return jsonify({"error": "name and items required"}), 400

    orders = read_json(ORDERS_FILE, [])
    order = {
        "id": "CF-" + hex(int(time.time() * 1000))[2:].upper(),
        "name": name,
        "items": items,
        "time": time.strftime('%Y-%m-%dT%H:%M:%S.000Z', time.gmtime()),
        "status": "pending",
    }
    orders.insert(0, order)
    write_json(ORDERS_FILE, orders)
    return jsonify({"success": True, "order": order})


@app.route('/api/orders/<order_id>', methods=['PATCH'])
def update_order(order_id):
    data = request.json
    orders = read_json(ORDERS_FILE, [])
    order = next((o for o in orders if o["id"] == order_id), None)
    if not order:
        return jsonify({"error": "Order not found"}), 404

    if 'status' in data:
        order['status'] = data['status']
    write_json(ORDERS_FILE, orders)
    return jsonify({"success": True, "order": order})


@app.route('/api/orders/<order_id>', methods=['DELETE'])
def delete_order(order_id):
    orders = read_json(ORDERS_FILE, [])
    idx = next((i for i, o in enumerate(orders) if o["id"] == order_id), None)
    if idx is None:
        return jsonify({"error": "Order not found"}), 404

    orders.pop(idx)
    write_json(ORDERS_FILE, orders)
    return jsonify({"success": True})


# ========================
# Start
# ========================
if __name__ == '__main__':
    print()
    print("  Campfire Food Order Service")
    print("  ---------------------------")
    print("  Order page:      http://localhost:3000/")
    print("  Organiser panel: http://localhost:3000/organiser.html")
    print("  API base:        http://localhost:3000/api/")
    print()
    app.run(host='0.0.0.0', port=3000, debug=True)
