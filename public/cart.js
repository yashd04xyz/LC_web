// cart.js
// Client-side cart management + UI rendering

const CART_KEY = 'cart';

// --- Core API ---
function readCart() {
  try {
    const raw = localStorage.getItem(CART_KEY) || '[]';
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    localStorage.removeItem(CART_KEY);
    return [];
  }
}

function writeCart(cart) {
  const normalized = (Array.isArray(cart) ? cart : []).map(it => ({
    productId: String(it.productId),
    qty: Math.max(1, Number(it.qty || 1)),
    variantId: it.variantId ? String(it.variantId) : undefined,
    addedAt: it.addedAt || Date.now()
  }));
  localStorage.setItem(CART_KEY, JSON.stringify(normalized));
  window.dispatchEvent(new CustomEvent('cart:updated', { detail: { cart: normalized } }));
  return normalized;
}

function addToCart(productId, qty = 1, variantId) {
  const cart = readCart();
  const existing = cart.find(it => it.productId === productId && it.variantId === variantId);
  if (existing) {
    existing.qty += Math.max(1, Number(qty));
  } else {
    cart.push({ productId, qty: Math.max(1, Number(qty)), variantId, addedAt: Date.now() });
  }
  return writeCart(cart);
}

function updateQty(productId, qty, variantId) {
  const cart = readCart();
  const idx = cart.findIndex(it => it.productId === productId && it.variantId === variantId);
  if (idx !== -1) {
    if (qty <= 0) cart.splice(idx, 1);
    else cart[idx].qty = Math.max(1, Math.floor(Number(qty)));
  }
  return writeCart(cart);
}

function removeFromCart(productId, variantId) {
  const cart = readCart().filter(it => !(it.productId === productId && it.variantId === variantId));
  return writeCart(cart);
}

function clearCart() {
  localStorage.removeItem(CART_KEY);
  window.dispatchEvent(new CustomEvent('cart:updated', { detail: { cart: [] } }));
  return [];
}

async function getCartTotals() {
  const cart = readCart();
  if (!cart.length) return { items: [], subtotal: 0, shipping: 0, tax: 0, total: 0 };

  try {
    const ids = cart.map(i => i.productId).join(',');
    const res = await fetch('/api/products?ids=' + encodeURIComponent(ids));
    const data = await res.json();
    const products = data.products || [];

    let subtotal = 0;
    const items = cart.map(it => {
      const p = products.find(x => x.id === it.productId) || { price: 0 };
      const line = p.price * it.qty;
      subtotal += line;
      return { ...it, price: p.price, line };
    });

    const shipping = subtotal > 0 && subtotal < 1000 ? 49 : 0;
    const tax = Math.round(subtotal * 0.05);
    const total = subtotal + shipping + tax;

    return { items, subtotal, shipping, tax, total };
  } catch {
    return { items: [], subtotal: 0, shipping: 0, tax: 0, total: 0 };
  }
}

window.cartAPI = { readCart, writeCart, addToCart, updateQty, removeFromCart, clearCart, getCartTotals };

// --- Rendering ---
function formatINR(n) {
  return '₹' + Number(n || 0).toLocaleString('en-IN');
}

async function renderCartPanel() {
  const cart = cartAPI.readCart();
  const container = document.getElementById('cartItems');
  const countEl = document.getElementById('cartCount');
  const subtotalEl = document.getElementById('subtotal');
  const shippingEl = document.getElementById('shipping');
  const taxEl = document.getElementById('tax');
  const totalEl = document.getElementById('total');

  container.innerHTML = '';
  if (!cart.length) {
    container.innerHTML = `<div class="alert alert-info">No items in cart</div>`;
    countEl.textContent = '0';
    subtotalEl.textContent = formatINR(0);
    shippingEl.textContent = formatINR(0);
    taxEl.textContent = formatINR(0);
    totalEl.textContent = formatINR(0);
    return;
  }

  const totals = await cartAPI.getCartTotals();
  totals.items.forEach(item => {
    const card = document.createElement('div');
    card.className = 'card mb-3';
    card.innerHTML = `
      <div class="row g-0 align-items-center">
        <div class="col-3"><img src="${item.image || '/images/placeholder.png'}" class="img-fluid rounded-start" alt="${item.name || 'Product'}"></div>
        <div class="col-6">
          <div class="card-body">
            <h5 class="card-title">${item.name || 'Product'}</h5>
            <p class="card-text text-muted">Unit ${formatINR(item.price)}</p>
            <div class="input-group input-group-sm" style="max-width:120px;">
              <button class="btn btn-outline-secondary dec" data-id="${item.productId}" data-variant="${item.variantId || ''}">−</button>
              <input type="number" class="form-control text-center" min="1" value="${item.qty}">
              <button class="btn btn-outline-secondary inc" data-id="${item.productId}" data-variant="${item.variantId || ''}">+</button>
            </div>
          </div>
        </div>
        <div class="col-3 text-end">
          <p class="fw-bold">${formatINR(item.line)}</p>
          <button class="btn btn-sm btn-danger remove-item" data-id="${item.productId}" data-variant="${item.variantId || ''}">Remove</button>
        </div>
      </div>`;
    container.appendChild(card);
  });

  countEl.textContent = cart.reduce((s, i) => s + i.qty, 0);
  subtotalEl.textContent = formatINR(totals.subtotal);
  shippingEl.textContent = formatINR(totals.shipping);
  taxEl.textContent = formatINR(totals.tax);
  totalEl.textContent = formatINR(totals.total);
}

// --- Events ---
document.addEventListener('click', (e) => {
  const dec = e.target.closest('.dec');
  const inc = e.target.closest('.inc');
  const rem = e.target.closest('.remove-item');
  const addBtn = e.target.closest('.add-to-cart');

  if (dec || inc) {
    const ctrl = e.target.closest('.input-group');
    const input = ctrl.querySelector('input');
    let val = Number(input.value) || 1;
    if (dec) val = Math.max(1, val - 1);
    if (inc) val = val + 1;
    input.value = val;
    cartAPI.updateQty((dec || inc).dataset.id, val, (dec || inc).dataset.variant || undefined);
  }

  if (rem) {
    cartAPI.removeFromCart(rem.dataset.id, rem.dataset.variant || undefined);
  }

  if (addBtn) {
    const productId = addBtn.dataset.productId;
    const qty = Number(addBtn.dataset.qty || 1);
    cartAPI.addToCart(productId, qty, addBtn.dataset.variant || undefined);
    if (addBtn) {
  const productId = addBtn.dataset.productId;
  const qty = Number(addBtn.dataset.qty || 1);
  cartAPI.addToCart(productId, qty, addBtn.dataset.variant || undefined);

  // Auto‑open cart panel
  document.getElementById('cartDrawer')?.classList.add('open');
}
  }
});

// Clear cart
document.getElementById('clearCartBtn')?.addEventListener('click', () => {
  if (confirm('Clear all items from cart?')) cartAPI.clearCart();
});

// Checkout
document.getElementById('checkoutBtn')?.addEventListener('click', async () => {
  const cart = cartAPI.readCart();
  if (!cart.length) return alert('Your cart is empty');
  try {
    const res = await fetch('/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cart })
    });
    const data = await res.json();
    alert(data.message + ' (Order ID: ' + data.orderId + ')');
    cartAPI.clearCart();
    location.href = '/checkout.html';
  } catch {
    alert('Checkout failed');
  }
});

// Continue shopping
document.getElementById('continueShop')?.addEventListener('click', () => {
  location.href = '/shop.html';
});

// Refresh UI on cart updates
window.addEventListener('cart:updated', () => renderCartPanel());

// Initial render
renderCartPanel();
// API: GET /api/products
app.get('/api/products', [
  query('category').optional().isString(),
  query('size').optional().isString(),
  query('color').optional().isString(),
  query('occasion').optional().isString(),
  query('maxPrice').optional().isInt({ min: 0 }),
  query('q').optional().isString(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 })
], asyncHandler(async (req, res) => {
  const db = await readDb();
  let products = db.products || [];

  const { category, size, color, occasion, maxPrice, q } = req.query;

  // Filters
  if (category && category !== 'all') products = products.filter(p => p.category.toLowerCase() === category.toLowerCase());
  if (size && size !== 'all') products = products.filter(p => p.size.toLowerCase() === size.toLowerCase());
  if (color && color !== 'all') products = products.filter(p => p.color.toLowerCase() === color.toLowerCase());
  if (occasion && occasion !== 'all') products = products.filter(p => p.occasion.toLowerCase() === occasion.toLowerCase());
  if (maxPrice) products = products.filter(p => Number(p.price) <= Number(maxPrice));

  // Keyword search
  if (q) {
    const term = q.toLowerCase();
    products = products.filter(p =>
      p.name.toLowerCase().includes(term) ||
      (p.desc && p.desc.toLowerCase().includes(term))
    );
  }

  // Pagination
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const total = products.length;
  const pages = Math.ceil(total / limit);
  const start = (page - 1) * limit;
  const paginated = products.slice(start, start + limit);

  res.json({
    success: true,
    total,
    page,
    pages,
    products: paginated
  });
}));

// Refresh UI on cart updates
window.addEventListener('cart:updated', () => renderCartPanel());

// Initial render
renderCartPanel();
