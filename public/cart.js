// cart.js — Part 1: Core API
const CART_KEY = 'cart';

function readCart() {
  try {
    const raw = localStorage.getItem(CART_KEY) || '[]';
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(item => ({
      productId: String(item.productId),
      qty: Math.max(1, Number(item.qty || 1)),
      variantId: item.variantId ? String(item.variantId) : undefined,
      addedAt: item.addedAt ? Number(item.addedAt) : Date.now()
    }));
  } catch (err) {
    console.warn('readCart: corrupted data, resetting cart', err);
    localStorage.removeItem(CART_KEY);
    return [];
  }
}

function writeCart(cart) {
  const normalized = (Array.isArray(cart) ? cart : []).map(it => ({
    productId: String(it.productId),
    qty: Math.max(1, Number(it.qty || 1)),
    variantId: it.variantId ? String(it.variantId) : undefined,
    addedAt: it.addedAt ? Number(it.addedAt) : Date.now()
  }));
  localStorage.setItem(CART_KEY, JSON.stringify(normalized));
  window.dispatchEvent(new CustomEvent('cart:updated', { detail: { cart: normalized } }));
  return normalized;
}

function addToCart(productId, qty = 1, variantId) {
  const cart = readCart();
  const existing = cart.find(it => it.productId === String(productId) && (it.variantId || '') === (variantId || ''));
  if (existing) {
    existing.qty += Math.max(1, Number(qty));
  } else {
    cart.push({ productId: String(productId), qty: Math.max(1, Number(qty)), variantId, addedAt: Date.now() });
  }
  return writeCart(cart);
}

function updateQty(productId, qty, variantId) {
  const cart = readCart();
  const idx = cart.findIndex(it => it.productId === String(productId) && (it.variantId || '') === (variantId || ''));
  if (idx !== -1) {
    if (qty <= 0) cart.splice(idx, 1);
    else cart[idx].qty = Math.max(1, Math.floor(Number(qty)));
  }
  return writeCart(cart);
}

function removeFromCart(productId, variantId) {
  const cart = readCart().filter(it => !(it.productId === String(productId) && (it.variantId || '') === (variantId || '')));
  return writeCart(cart);
}

function clearCart() {
  localStorage.removeItem(CART_KEY);
  window.dispatchEvent(new CustomEvent('cart:updated', { detail: { cart: [] } }));
  return [];
}

async function getCartTotals(productLookup) {
  const cart = readCart();
  let subtotal = 0;
  const items = cart.map(it => {
    const p = productLookup ? productLookup(it.productId) : null;
    const price = p && Number(p.price) ? Number(p.price) : 0;
    const line = price * it.qty;
    subtotal += line;
    return { ...it, price, line };
  });
  const shipping = subtotal > 0 && subtotal < 1000 ? 49 : 0;
  const tax = Math.round(subtotal * 0.05);
  const total = subtotal + shipping + tax;
  return { items, subtotal, shipping, tax, total };
}

window.cartAPI = { readCart, writeCart, addToCart, updateQty, removeFromCart, clearCart, getCartTotals };

// cart.js — Part 2: Rendering
function formatINR(n) {
  return '₹' + Number(n || 0).toLocaleString('en-IN');
}

function renderCartPanel(products) {
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

  cart.forEach(item => {
    const p = products.find(x => x.id === item.productId) || { name: 'Product', price: 0, image: '/images/placeholder.png' };
    const line = p.price * item.qty;
    const card = document.createElement('div');
    card.className = 'card mb-3';
    card.innerHTML = `
      <div class="row g-0 align-items-center">
        <div class="col-3"><img src="${p.image}" class="img-fluid rounded-start" alt="${p.name}"></div>
        <div class="col-6">
          <div class="card-body">
            <h5 class="card-title">${p.name}</h5>
            <p class="card-text text-muted">Unit ${formatINR(p.price)}</p>
            <div class="input-group input-group-sm" style="max-width:120px;">
              <button class="btn btn-outline-secondary dec" data-id="${p.id}">−</button>
              <input type="number" class="form-control text-center" min="1" value="${item.qty}">
              <button class="btn btn-outline-secondary inc" data-id="${p.id}">+</button>
            </div>
          </div>
        </div>
        <div class="col-3 text-end">
          <p class="fw-bold">${formatINR(line)}</p>
          <button class="btn btn-sm btn-danger remove-item" data-id="${p.id}">Remove</button>
        </div>
      </div>`;
    container.appendChild(card);
  });

  cartAPI.getCartTotals(id => products.find(p => p.id === id)).then(totals => {
    countEl.textContent = cart.reduce((s, i) => s + i.qty, 0);
    subtotalEl.textContent = formatINR(totals.subtotal);
    shippingEl.textContent = formatINR(totals.shipping);
    taxEl.textContent = formatINR(totals.tax);
    totalEl.textContent = formatINR(totals.total);
  });
}


// cart.js — Part 3: Events
document.addEventListener('click', (e) => {
  const dec = e.target.closest('.dec');
  const inc = e.target.closest('.inc');
  const rem = e.target.closest('.remove-item');

  if (dec || inc) {
    const ctrl = e.target.closest('.input-group');
    const input = ctrl.querySelector('input');
    let val = Number(input.value) || 1;
    if (dec) val = Math.max(1, val - 1);
    if (inc) val = val + 1;
    input.value = val;
    cartAPI.updateQty(ctrl.querySelector('.dec').dataset.id, val);
  }

  if (rem) {
    cartAPI.removeFromCart(rem.dataset.id);
  }
});

// Clear cart
document.getElementById('clearCartBtn')?.addEventListener('click', () => {
  if (confirm('Clear all items from cart?')) cartAPI.clearCart();
});

// Checkout
document.getElementById('checkoutBtn')?.addEventListener('click', () => {
  const cart = cartAPI.readCart();
  if (!cart.length) return alert('Your cart is empty');
  location.href = '/checkout.html';
});

// Continue shopping
document.getElementById('continueShop')?.addEventListener('click', () => {
  location.href = '/product.html';
});

// Refresh UI on cart updates
window.addEventListener('cart:updated', async (e) => {
  const ids = e.detail.cart.map(i => i.productId);
  let products = [];
  if (ids.length) {
    try {
      const res = await fetch('/api/products?ids=' + encodeURIComponent(ids.join(',')));
      const data = await res.json();
      products = data.products || [];
    } catch {
      products = [];
    }
  }
  renderCartPanel(products);
});
// Shop page: listen for add-to-cart clicks
document.addEventListener('click', (e) => {
  const btn = e.target.closest('.add-to-cart');
  if (!btn) return;
  const productId = btn.dataset.productId;
  const qty = Number(btn.dataset.qty || 1);
  cartAPI.addToCart(productId, qty);
  alert('Added to cart!'); // or use toast
});