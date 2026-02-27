const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;

// --- Middleware ---
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// --- Data Files ---
const MENU_FILE = path.join(__dirname, 'data', 'menu.json');
const ORDERS_FILE = path.join(__dirname, 'data', 'orders.json');

// Ensure data directory exists
if (!fs.existsSync(path.join(__dirname, 'data'))) {
    fs.mkdirSync(path.join(__dirname, 'data'));
}

// --- Helpers ---
function readJSON(filepath, fallback) {
    try {
        if (fs.existsSync(filepath)) {
            return JSON.parse(fs.readFileSync(filepath, 'utf-8'));
        }
    } catch (e) {
        console.error(`Error reading ${filepath}:`, e.message);
    }
    return fallback;
}

function writeJSON(filepath, data) {
    fs.writeFileSync(filepath, JSON.stringify(data, null, 2), 'utf-8');
}

// --- Initialize default menu if not present ---
function getDefaultMenu() {
    return {
        snacks: {
            label: 'Snacks',
            items: [
                { id: 's1', name: 'Popcorn', desc: 'Buttery & salted, classic movie-night style' },
                { id: 's2', name: 'Cookies', desc: 'Fresh-baked chocolate chip cookies' },
                { id: 's3', name: 'Cupcakes', desc: 'Vanilla frosted cupcakes with sprinkles' },
                { id: 's4', name: 'Pretzels', desc: 'Soft pretzel bites with cheese dip' },
                { id: 's5', name: 'Pizza Slice', desc: 'Hot cheesy pizza, perfect hackathon fuel' },
                { id: 's6', name: 'Sandwich', desc: 'Freshly made veggie or paneer sandwich' },
                { id: 's7', name: 'Tacos', desc: 'Crunchy tacos with all the toppings' },
                { id: 's8', name: 'Donuts', desc: 'Glazed donuts, sugar rush guaranteed!' },
            ],
        },
        drinks: {
            label: 'Drinks',
            items: [
                { id: 'd1', name: 'Coffee', desc: 'Hot brewed coffee to keep you coding' },
                { id: 'd2', name: 'Chai', desc: 'Masala chai, the Indian way' },
                { id: 'd3', name: 'Juice Box', desc: 'Mixed fruit juice, refreshing & sweet' },
                { id: 'd4', name: 'Cold Drink', desc: 'Chilled soda — cola, lime, or orange' },
                { id: 'd5', name: 'Milkshake', desc: 'Thick chocolate or mango milkshake' },
                { id: 'd6', name: 'Water Bottle', desc: 'Stay hydrated, hacker!' },
            ],
        },
        meals: {
            label: 'Meals',
            items: [
                { id: 'm1', name: 'Dal Rice', desc: 'Comfort food — dal tadka with steamed rice' },
                { id: 'm2', name: 'Pav Bhaji', desc: 'Mumbai-style pav bhaji with butter' },
                { id: 'm3', name: 'Roti Sabzi', desc: 'Fresh roti with mixed veg sabzi' },
                { id: 'm4', name: 'Maggi', desc: 'Two-minute noodles, hackathon classic!' },
                { id: 'm5', name: 'Salad Bowl', desc: 'Fresh garden salad with dressings' },
                { id: 'm6', name: 'Biryani', desc: 'Fragrant veg biryani with raita' },
            ],
        },
    };
}

if (!fs.existsSync(MENU_FILE)) {
    writeJSON(MENU_FILE, getDefaultMenu());
}
if (!fs.existsSync(ORDERS_FILE)) {
    writeJSON(ORDERS_FILE, []);
}

// ============================
// API Routes
// ============================

// --- Menu APIs ---

// GET /api/menu — get entire menu
app.get('/api/menu', (req, res) => {
    const menu = readJSON(MENU_FILE, getDefaultMenu());
    res.json(menu);
});

// POST /api/menu/category — add a new category
app.post('/api/menu/category', (req, res) => {
    const { key, label } = req.body;
    if (!key || !label) return res.status(400).json({ error: 'key and label required' });

    const menu = readJSON(MENU_FILE, getDefaultMenu());
    if (menu[key]) return res.status(409).json({ error: 'Category already exists' });

    menu[key] = { label, items: [] };
    writeJSON(MENU_FILE, menu);
    res.json({ success: true, menu });
});

// DELETE /api/menu/category/:key — delete a category
app.delete('/api/menu/category/:key', (req, res) => {
    const menu = readJSON(MENU_FILE, getDefaultMenu());
    if (!menu[req.params.key]) return res.status(404).json({ error: 'Category not found' });

    delete menu[req.params.key];
    writeJSON(MENU_FILE, menu);
    res.json({ success: true, menu });
});

// POST /api/menu/:category/item — add item to category
app.post('/api/menu/:category/item', (req, res) => {
    const { name, desc } = req.body;
    const { category } = req.params;
    if (!name) return res.status(400).json({ error: 'name is required' });

    const menu = readJSON(MENU_FILE, getDefaultMenu());
    if (!menu[category]) return res.status(404).json({ error: 'Category not found' });

    const id = category[0] + Date.now().toString(36);
    menu[category].items.push({ id, name, desc: desc || '' });
    writeJSON(MENU_FILE, menu);
    res.json({ success: true, item: { id, name, desc: desc || '' }, menu });
});

// PUT /api/menu/:category/item/:id — update an item
app.put('/api/menu/:category/item/:id', (req, res) => {
    const { name, desc } = req.body;
    const { category, id } = req.params;

    const menu = readJSON(MENU_FILE, getDefaultMenu());
    if (!menu[category]) return res.status(404).json({ error: 'Category not found' });

    const item = menu[category].items.find((i) => i.id === id);
    if (!item) return res.status(404).json({ error: 'Item not found' });

    if (name !== undefined) item.name = name;
    if (desc !== undefined) item.desc = desc;
    writeJSON(MENU_FILE, menu);
    res.json({ success: true, item, menu });
});

// DELETE /api/menu/:category/item/:id — delete an item
app.delete('/api/menu/:category/item/:id', (req, res) => {
    const { category, id } = req.params;

    const menu = readJSON(MENU_FILE, getDefaultMenu());
    if (!menu[category]) return res.status(404).json({ error: 'Category not found' });

    const idx = menu[category].items.findIndex((i) => i.id === id);
    if (idx === -1) return res.status(404).json({ error: 'Item not found' });

    menu[category].items.splice(idx, 1);
    writeJSON(MENU_FILE, menu);
    res.json({ success: true, menu });
});

// --- Order APIs ---

// GET /api/orders — get all orders
app.get('/api/orders', (req, res) => {
    const orders = readJSON(ORDERS_FILE, []);
    res.json(orders);
});

// POST /api/orders — place a new order
app.post('/api/orders', (req, res) => {
    const { name, items } = req.body;
    if (!name || !items || !items.length) {
        return res.status(400).json({ error: 'name and items required' });
    }

    const orders = readJSON(ORDERS_FILE, []);
    const order = {
        id: 'CF-' + Date.now().toString(36).toUpperCase(),
        name,
        items,
        time: new Date().toISOString(),
        status: 'pending',
    };

    orders.unshift(order);
    writeJSON(ORDERS_FILE, orders);
    res.json({ success: true, order });
});

// PATCH /api/orders/:id — update order status
app.patch('/api/orders/:id', (req, res) => {
    const { status } = req.body;
    const orders = readJSON(ORDERS_FILE, []);
    const order = orders.find((o) => o.id === req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    order.status = status;
    writeJSON(ORDERS_FILE, orders);
    res.json({ success: true, order });
});

// DELETE /api/orders/:id — delete an order
app.delete('/api/orders/:id', (req, res) => {
    const orders = readJSON(ORDERS_FILE, []);
    const idx = orders.findIndex((o) => o.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Order not found' });

    orders.splice(idx, 1);
    writeJSON(ORDERS_FILE, orders);
    res.json({ success: true });
});

// --- Start Server ---
app.listen(PORT, () => {
    console.log(`\n  Campfire Food Order Service`);
    console.log(`  ---------------------------`);
    console.log(`  Order page:     http://localhost:${PORT}/`);
    console.log(`  Organiser panel: http://localhost:${PORT}/organiser.html`);
    console.log(`  API base:       http://localhost:${PORT}/api/\n`);
});
