// Small helpers
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

// Set current year in footer
const yearEl = $('#year');
if (yearEl) yearEl.textContent = new Date().getFullYear();

// Mobile nav toggle
const hamburger = $('#hamburger');
const navLinks = $('#navLinks');
if (hamburger && navLinks) {
  hamburger.addEventListener('click', () => {
    const open = navLinks.classList.toggle('open');
    hamburger.setAttribute('aria-expanded', open ? 'true' : 'false');
  });
}
// Testimonials slider
(function initSlider() {
  const slides = $('#slides');
  const dotsContainer = $('#sliderDots');
  if (!slides || !dotsContainer) return;

  const slideCount = slides.children.length;
  let index = 0;
  let interval = null;

  function renderDots() {
    dotsContainer.innerHTML = '';
    for (let i = 0; i < slideCount; i++) {
      const btn = document.createElement('button');
      btn.className = 'dot';
      btn.setAttribute('aria-label', `Show slide ${i + 1}`);
      btn.addEventListener('click', () => goTo(i));
      dotsContainer.appendChild(btn);
    }
  }

  function update() {
    slides.style.transform = `translateX(${-index * 100}%)`;
    const dots = Array.from(dotsContainer.children);
    dots.forEach((d, i) => d.classList.toggle('active', i === index));
  }

  function goTo(i) {
    index = (i + slideCount) % slideCount;
    update();
    restart();
  }

  function next() { goTo(index + 1); }

  function restart() {
    if (interval) clearInterval(interval);
    interval = setInterval(next, 5000);
  }

  renderDots();
  update();
  restart();

  const sliderEl = slides.parentElement;
  sliderEl.addEventListener('mouseenter', () => clearInterval(interval));
  sliderEl.addEventListener('mouseleave', restart);
})();

// Newsletter form
const newsletterForm = $('#newsletterForm');
const newsletterMsg = $('#newsletterMsg');
if (newsletterForm) {
  newsletterForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const emailInput = $('#newsletterEmail');
    const email = emailInput ? emailInput.value.trim() : '';
    if (!email || !email.includes('@')) {
      newsletterMsg.textContent = 'Please enter a valid email address.';
      newsletterMsg.style.color = 'var(--error)';
      return;
    }
    newsletterMsg.textContent = 'Thanks for subscribing! Check your inbox for a welcome note.';
    newsletterMsg.style.color = 'var(--success)';
    emailInput.value = '';
  });
}
// Product filters
let products = [];
const filterCategory = $('#filterCategory');
const filterSize = $('#filterSize');
const filterColor = $('#filterColor');
const filterOccasion = $('#filterOccasion');
const filterPrice = $('#filterPrice');
const priceLabel = $('#priceLabel');

function applyFilters() {
  const cat = filterCategory ? filterCategory.value : 'all';
  const size = filterSize ? filterSize.value : 'all';
  const color = filterColor ? filterColor.value : 'all';
  const occ = filterOccasion ? filterOccasion.value : 'all';
  const maxPrice = filterPrice ? Number(filterPrice.value) : Infinity;

  products.forEach(p => {
    const pCat = p.dataset.category || '';
    const pSize = p.dataset.size || '';
    const pColor = p.dataset.color || '';
    const pOcc = p.dataset.occasion || '';
    const pPrice = Number(p.dataset.price || 0);

    const visible = (cat === 'all' || pCat === cat)
      && (size === 'all' || pSize === size)
      && (color === 'all' || pColor === color)
      && (occ === 'all' || pOcc === occ)
      && (pPrice <= maxPrice);

    p.style.display = visible ? '' : 'none';
  });
}

if (filterCategory) filterCategory.addEventListener('change', applyFilters);
if (filterSize) filterSize.addEventListener('change', applyFilters);
if (filterColor) filterColor.addEventListener('change', applyFilters);
if (filterOccasion) filterOccasion.addEventListener('change', applyFilters);
if (filterPrice) {
  filterPrice.addEventListener('input', () => {
    if (priceLabel) priceLabel.textContent = filterPrice.value;
    applyFilters();
  });
}

// Quick view modal
const modalBackdrop = $('#modalBackdrop');
const modalImg = $('#modalImg');
const modalName = $('#modalName');
const modalPrice = $('#modalPrice');
const modalDesc = $('#modalDesc');
const modalClose = $('#modalClose');
const modalClose2 = $('#modalClose2');
const modalAdd = $('#modalAdd');

function openModalFromButton(btn) {
  if (!btn || !modalBackdrop) return;
  const id = btn.dataset.id || btn.dataset.productId || null;
  const name = btn.dataset.name || '';
  const priceRaw = btn.dataset.price || '₹0';
  const price = Number(String(priceRaw).replace(/[^\d.]/g, '')) || 0;
  const img = btn.dataset.img || '';
  const desc = btn.dataset.desc || '';

  window.currentProduct = { id, name, price, img, desc };

  modalName.textContent = name;
  modalPrice.textContent = priceRaw;
  modalImg.src = img;
  modalImg.alt = name || 'Product image';
  modalDesc.textContent = desc;

  modalBackdrop.style.display = 'flex';
  modalBackdrop.setAttribute('aria-hidden', 'false');
  modalClose.focus();
}

function closeModal() {
  modalBackdrop.style.display = 'none';
  modalBackdrop.setAttribute('aria-hidden', 'true');
}

if (modalClose) modalClose.addEventListener('click', closeModal);
if (modalClose2) modalClose2.addEventListener('click', closeModal);
if (modalBackdrop) {
  modalBackdrop.addEventListener('click', (e) => {
    if (e.target === modalBackdrop) closeModal();
  });
}
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && modalBackdrop && modalBackdrop.style.display === 'flex') closeModal();
});

// Add-to-cart behavior
if (modalAdd) {
  modalAdd.addEventListener('click', () => {
    const p = window.currentProduct;
    if (!p) return;

    const cartKey = 'cart';
    const cart = JSON.parse(localStorage.getItem(cartKey) || '[]');

    let existing = p.id ? cart.find(i => i.productId === p.id) : cart.find(i => i.name === p.name);

    if (existing) {
      existing.qty = (existing.qty || 1) + 1;
    } else {
      cart.push({ productId: p.id || null, name: p.name, price: p.price, img: p.img, qty: 1 });
    }

    localStorage.setItem(cartKey, JSON.stringify(cart));

    modalAdd.textContent = 'Added';
    modalAdd.disabled = true;
    updateCartCount();

    setTimeout(() => {
      modalAdd.textContent = 'Add to cart';
      modalAdd.disabled = false;
      closeModal();
    }, 800);
  });
}
// Update cart count badge
function updateCartCount() {
  const cart = JSON.parse(localStorage.getItem('cart') || '[]');
  const count = cart.reduce((s, i) => s + (i.qty || 0), 0);
  const badge = document.querySelector('.cart-count');
  if (badge) badge.textContent = count;
}
// Load products from product.json
async function loadProducts() {
  try {
    const response = await fetch('/product.json'); // ✅ fetch the JSON file
    const productsData = await response.json();

    const grid = $('#productGrid');
    grid.innerHTML = '';

    productsData.forEach(p => {
      const card = document.createElement('div');
      card.className = 'card product';
      card.dataset.category = p.Category;
      card.dataset.size = p.Size;
      card.dataset.color = p.Color;
      card.dataset.occasion = p.Occasion;
      card.dataset.price = p.ProductPrice;

      card.innerHTML = `
        <img src="${p.ProductImage}" alt="${p.ProductName}">
        <div class="card-body">
          <h3>${p.ProductName}</h3>
          <div class="muted">${p.ProductInfo}</div>
          <div class="price">Unit Price: ₹${p.ProductPrice}</div>
          <div class="product-actions">
            <button class="btn-outline quick-view"
              data-id="${p.ProductID}"
              data-name="${p.ProductName}"
              data-price="₹${p.ProductPrice}"
              data-img="${p.ProductImage}"
              data-desc="${p.Description}">
              Quick view
            </button>
            <button class="btn-primary add-to-cart"
              data-product-id="${p.ProductID}"
              data-name="${p.ProductName}"
              data-price="${p.ProductPrice}"
              data-img="${p.ProductImage}">
              Add to cart
            </button>
          </div>
        </div>
      `;
      grid.appendChild(card);
    });

    // Bind quick view buttons
    $$('.quick-view', grid).forEach(btn => {
      btn.addEventListener('click', (e) => {
        openModalFromButton(e.currentTarget);
      });
    });

    // Bind add-to-cart buttons
    $$('.add-to-cart', grid).forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.productId;
        const name = btn.dataset.name;
        const price = Number(btn.dataset.price);
        const img = btn.dataset.img;

        const cart = JSON.parse(localStorage.getItem('cart') || '[]');
        let existing = cart.find(i => i.productId == id);

        if (existing) {
          existing.qty += 1;
        } else {
          cart.push({ productId: id, name, price, img, qty: 1 });
        }

        localStorage.setItem('cart', JSON.stringify(cart));
        updateCartCount();

        btn.textContent = 'Added';
        setTimeout(() => btn.textContent = 'Add to cart', 800);
      });
    });

    // Update global products reference for filters
    products = $$('#productGrid .product');
    applyFilters();
  } catch (err) {
    console.error('Error loading products:', err);
  }
}

// Run once on load
updateCartCount();
document.addEventListener('DOMContentLoaded', loadProducts);