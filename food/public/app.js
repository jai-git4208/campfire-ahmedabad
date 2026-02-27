// ===== Campfire Food Ordering Service — app.js =====

// --- State ---
let MENU = {};
let cart = {};
let userName = '';
let activeCategory = '';

// --- DOM Helpers ---
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

// --- API Helpers ---
async function api(url, method = 'GET', body = null) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(url, opts);
  return res.json();
}

// --- Initialization ---
document.addEventListener('DOMContentLoaded', async () => {
  // Restore user name if saved
  const savedName = localStorage.getItem('campfire_food_name');
  if (savedName) {
    userName = savedName;
    showMainApp();
  }

  // Load menu from server
  MENU = await api('/api/menu');
  const categories = Object.keys(MENU);
  activeCategory = categories[0] || '';

  renderCategoryTabs();
  renderMenu();
  renderCart();
  loadOrders();

  // Name form
  $('#name-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const input = $('#name-input');
    const name = input.value.trim();
    if (name) {
      userName = name;
      localStorage.setItem('campfire_food_name', name);
      showMainApp();
    }
  });

  // Place order button
  $('#place-order-btn').addEventListener('click', placeOrder);
});

// --- Show/Hide Name vs Main App ---
function showMainApp() {
  $('#name-section').classList.add('hidden');
  $('#user-greeting').classList.remove('hidden');
  $('#greeting-name').textContent = userName;
}

function showNameSection() {
  $('#name-section').classList.remove('hidden');
  $('#user-greeting').classList.add('hidden');
  userName = '';
  localStorage.removeItem('campfire_food_name');
}
window.showNameSection = showNameSection;

// --- Category Tabs ---
function renderCategoryTabs() {
  const container = $('#category-tabs');
  container.innerHTML = '';

  Object.entries(MENU).forEach(([key, cat]) => {
    const btn = document.createElement('button');
    btn.className = `category-tab${key === activeCategory ? ' active' : ''}`;
    btn.textContent = cat.label;
    btn.id = `tab-${key}`;
    btn.addEventListener('click', () => {
      activeCategory = key;
      $$('.category-tab').forEach((t) => t.classList.remove('active'));
      btn.classList.add('active');
      renderMenu();
    });
    container.appendChild(btn);
  });
}

// --- Menu Rendering ---
function renderMenu() {
  const grid = $('#menu-grid');
  grid.innerHTML = '';

  if (!MENU[activeCategory]) return;
  const items = MENU[activeCategory].items;

  items.forEach((item) => {
    const card = document.createElement('div');
    card.className = 'food-card';
    card.id = `card-${item.id}`;

    const qty = cart[item.id] || 0;

    card.innerHTML = `
      <div class="food-card-icon">${item.name.charAt(0)}</div>
      <div class="food-card-name">${item.name}</div>
      <div class="food-card-desc">${item.desc}</div>
      <div class="food-card-price">FREE</div>
      <div class="food-card-actions">
        ${qty > 0 ? `
          <button class="qty-btn" onclick="updateCart('${item.id}', -1)" aria-label="Remove one">&minus;</button>
          <span class="qty-display">${qty}</span>
          <button class="qty-btn" onclick="updateCart('${item.id}', 1)" aria-label="Add one">+</button>
        ` : `
          <button class="add-btn" onclick="updateCart('${item.id}', 1)" id="add-${item.id}">Add to Order</button>
        `}
      </div>
    `;

    grid.appendChild(card);
  });
}

// --- Cart Logic ---
function updateCart(itemId, delta) {
  const current = cart[itemId] || 0;
  const newQty = current + delta;

  if (newQty <= 0) {
    delete cart[itemId];
  } else {
    cart[itemId] = newQty;
  }

  renderMenu();
  renderCart();
}
window.updateCart = updateCart;

function getCartItems() {
  const items = [];
  Object.entries(cart).forEach(([id, qty]) => {
    for (const cat of Object.values(MENU)) {
      const item = cat.items.find((i) => i.id === id);
      if (item) {
        items.push({ ...item, qty });
        break;
      }
    }
  });
  return items;
}

function renderCart() {
  const container = $('#cart-items');
  const totalEl = $('#cart-total-count');
  const orderBtn = $('#place-order-btn');
  const cartItems = getCartItems();

  if (cartItems.length === 0) {
    container.innerHTML = '<div class="cart-empty">Your order is empty — browse the menu above!</div>';
    totalEl.textContent = '0 items';
    orderBtn.disabled = true;
    return;
  }

  orderBtn.disabled = false;
  let totalCount = 0;

  container.innerHTML = cartItems
    .map((item) => {
      totalCount += item.qty;
      return `
        <div class="cart-item">
          <div class="cart-item-icon">${item.name.charAt(0)}</div>
          <div class="cart-item-info">
            <div class="cart-item-name">${item.name}</div>
            <div class="cart-item-qty">${item.qty > 1 ? 'x' + item.qty : ''}</div>
          </div>
          <div class="cart-item-controls">
            <button class="cart-qty-btn remove" onclick="updateCart('${item.id}', -1)" aria-label="Remove one">&minus;</button>
            <span class="cart-item-count">${item.qty}</span>
            <button class="cart-qty-btn" onclick="updateCart('${item.id}', 1)" aria-label="Add one">+</button>
          </div>
        </div>
      `;
    })
    .join('');

  totalEl.textContent = `${totalCount} item${totalCount !== 1 ? 's' : ''}`;
}

// --- Order Placement ---
async function placeOrder() {
  if (!userName) {
    alert('Please enter your name first!');
    return;
  }

  const cartItems = getCartItems();
  if (cartItems.length === 0) return;

  const result = await api('/api/orders', 'POST', {
    name: userName,
    items: cartItems.map((i) => ({ name: i.name, qty: i.qty })),
  });

  if (result.success) {
    showConfirmation(result.order);
    cart = {};
    renderMenu();
    renderCart();
    loadOrders();
  }
}

// --- Confirmation Modal ---
function showConfirmation(order) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'order-modal';

  const itemSummary = order.items
    .map((i) => `${i.name}${i.qty > 1 ? ' x' + i.qty : ''}`)
    .join(', ');

  overlay.innerHTML = `
    <div class="modal-content">
      <div class="modal-icon">&#10003;</div>
      <div class="modal-title">Order Placed!</div>
      <div class="modal-message">
        Thanks <strong>${order.name}</strong>! Your order for<br>
        <strong>${itemSummary}</strong><br>
        has been sent to the kitchen!
      </div>
      <div class="modal-order-id">Order #${order.id}</div>
      <br>
      <button class="modal-close-btn" onclick="closeModal()">Awesome!</button>
    </div>
  `;

  document.body.appendChild(overlay);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal();
  });
}

function closeModal() {
  const modal = $('#order-modal');
  if (modal) {
    modal.style.animation = 'fadeIn 0.2s ease reverse';
    setTimeout(() => modal.remove(), 200);
  }
}
window.closeModal = closeModal;

// --- Order History ---
async function loadOrders() {
  const orders = await api('/api/orders');
  renderOrders(orders);
}

function renderOrders(orders) {
  const container = $('#orders-list');

  if (!orders || orders.length === 0) {
    container.innerHTML = '<div class="no-orders">No orders yet — be the first!</div>';
    return;
  }

  container.innerHTML = orders
    .slice(0, 20)
    .map((order) => {
      const time = new Date(order.time);
      const timeStr = time.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
      const dateStr = time.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

      return `
        <div class="order-card">
          <div class="order-card-header">
            <span class="order-card-name">${order.name}</span>
            <span class="order-card-time">${dateStr}, ${timeStr}</span>
          </div>
          <div class="order-card-items">
            ${order.items
          .map((i) => `<span class="order-chip">${i.name}${i.qty > 1 ? ' x' + i.qty : ''}</span>`)
          .join('')}
          </div>
          <span class="order-status ${order.status}">${order.status === 'pending' ? 'Preparing' : 'Ready'}</span>
        </div>
      `;
    })
    .join('');
}
