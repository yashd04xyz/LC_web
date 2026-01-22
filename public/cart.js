let cart = []; // holds items added to cart

// -------------------- Load Products from JSON --------------------
async function loadProducts() {
  try {
    const response = await fetch('/product.json'); // fetch JSON file
    const products = await response.json();

    const container = document.getElementById('productsListContainer');
    container.innerHTML = '';

    products.forEach(product => {
      const card = document.createElement('div');
      card.className = 'product-card';

      card.innerHTML = `
        <div class="product-thumb">
          <img src="${product.ProductImage}" alt="${product.ProductName}">
        </div>
        <div class="product-info">
          <h3 class="product-name">${product.ProductName}</h3>
          <div class="product-meta">${product.Description}</div>
          <div class="price">₹${product.ProductPrice}</div>
        </div>
        <div class="product-actions">
          <button class="btn btn-primary"
            onclick="addToCart('${product.ProductID}', '${product.ProductName}', ${product.ProductPrice}, '${product.ProductImage}')">
            Add to Cart
          </button>
        </div>
      `;

      container.appendChild(card);
    });
  } catch (error) {
    console.error("Error loading products:", error);
  }
}

// -------------------- Add to Cart --------------------
function addToCart(id, name, price, image) {
  const existing = cart.find(item => item.id == id); // allow string/number match
  if (existing) {
    existing.qty += 1;
  } else {
    cart.push({ id, name, price, image, qty: 1 });
  }
  updateCartUI();
  showToast(`${name} added to cart!`);
}

// -------------------- Update Quantity --------------------
function updateQuantity(id, delta) {
  const item = cart.find(p => p.id == id);
  if (!item) return;

  item.qty += delta;

  if (item.qty <= 0) {
    cart = cart.filter(p => p.id != id);
  }

  updateCartUI();
}

// -------------------- Update Cart UI --------------------
function updateCartUI() {
  const cartItemsContainer = document.getElementById('cartItems');
  cartItemsContainer.innerHTML = '';

  let subtotal = 0;

  cart.forEach(item => {
    subtotal += item.price * item.qty;

    const cartItem = document.createElement('div');
    cartItem.className = 'cart-item';

    cartItem.innerHTML = `
      <div class="cart-item-thumb">
        <img src="${item.image}" alt="${item.name}">
      </div>
      <div class="cart-item-info">
        <div class="cart-item-name">${item.name}</div>
        <div class="cart-item-controls">
          <div class="qty-control">
            <button class="qty-minus" onclick="updateQuantity('${item.id}', -1)">-</button>
            <input type="text" value="${item.qty}" readonly>
            <button class="qty-plus" onclick="updateQuantity('${item.id}', 1)">+</button>
          </div>
          <div class="line-price">₹${item.price * item.qty}</div>
          <button class="remove-link" onclick="removeItem('${item.id}')">Remove</button>
        </div>
      </div>
    `;

    cartItemsContainer.appendChild(cartItem);
  });

  // Update summary
  const shipping = subtotal > 0 ? 100 : 0;
  const tax = Math.round(subtotal * 0.18);
  const total = subtotal + shipping + tax;

  document.getElementById('subtotal').textContent = `₹${subtotal}`;
  document.getElementById('shipping').textContent = `₹${shipping}`;
  document.getElementById('tax').textContent = `₹${tax}`;
  document.getElementById('total').textContent = `₹${total}`;
  document.getElementById('cartCount').textContent = cart.length;

  localStorage.setItem('cart', JSON.stringify(cart));
}

// -------------------- Remove Item --------------------
function removeItem(id) {
  cart = cart.filter(p => p.id != id);
  updateCartUI();
}

// -------------------- Toast Message --------------------
function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2000);
}

// -------------------- Clear Cart --------------------
document.getElementById('clearCartBtn').addEventListener('click', () => {
  cart = [];
  updateCartUI();
});

// -------------------- Restore Cart + Load Products --------------------
document.addEventListener('DOMContentLoaded', () => {
  const storedCart = localStorage.getItem('cart');
  if (storedCart) {
    cart = JSON.parse(storedCart);
    updateCartUI();
  }
  //loadProducts();
});
