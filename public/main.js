// main.js - Frontend behavior for Lydia Creation

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

  function next() {
    goTo(index + 1);
  }

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

// Newsletter form (client-side)
const newsletterForm = $('#newsletterForm');
const newsletterMsg = $('#newsletterMsg');
if (newsletterForm) {
  newsletterForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const emailInput = $('#newsletterEmail') || newsletterForm.querySelector('input[type="email"]');
    const email = emailInput ? emailInput.value.trim() : '';
    if (!email || !email.includes('@')) {
      if (newsletterMsg) {
        newsletterMsg.textContent = 'Please enter a valid email address.';
        newsletterMsg.style.color = 'var(--error)';
      }
      return;
    }
    // Simulate success (replace with API call to /api/newsletter)
    if (newsletterMsg) {
      newsletterMsg.textContent = 'Thanks for subscribing! Check your inbox for a welcome note.';
      newsletterMsg.style.color = 'var(--success)';
    }
    if (emailInput) emailInput.value = '';
  });
}

// Product filters
const products = $$('#productGrid .product');
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
  const name = btn.dataset.name || '';
  const price = btn.dataset.price || '';
  const img = btn.dataset.img || '';
  const desc = btn.dataset.desc || '';

  if (modalName) modalName.textContent = name;
  if (modalPrice) modalPrice.textContent = price;
  if (modalImg) {
    modalImg.src = img;
    modalImg.alt = name || 'Product image';
  }
  if (modalDesc) modalDesc.textContent = desc;

  modalBackdrop.style.display = 'flex';
  modalBackdrop.setAttribute('aria-hidden', 'false');
  if (modalClose) modalClose.focus();
}

function closeModal() {
  if (!modalBackdrop) return;
  modalBackdrop.style.display = 'none';
  modalBackdrop.setAttribute('aria-hidden', 'true');
}

$$('.quick-view').forEach(btn => {
  btn.addEventListener('click', (e) => {
    openModalFromButton(e.currentTarget);
  });
});

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
if (modalAdd) {
  modalAdd.addEventListener('click', () => {
    // Demo feedback: disable briefly and close
    modalAdd.textContent = 'Added';
    modalAdd.disabled = true;
    setTimeout(() => {
      modalAdd.textContent = 'Add to cart';
      modalAdd.disabled = false;
      closeModal();
    }, 900);
  });
}

// Contact form (client-side)
const contactForm = $('#contactForm');
const contactMsg = $('#contactMsg');
if (contactForm) {
  contactForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = $('#contactName') ? $('#contactName').value.trim() : '';
    const email = $('#contactEmail') ? $('#contactEmail').value.trim() : '';
    const subject = $('#contactSubject') ? $('#contactSubject').value.trim() : '';
    const message = $('#contactMessage') ? $('#contactMessage').value.trim() : '';

    if (!name || !email || !subject || !message) {
      if (contactMsg) {
        contactMsg.textContent = 'Please fill in all fields.';
        contactMsg.style.color = 'var(--error)';
      }
      return;
    }

    // Simulate success (replace with POST /api/contact)
    if (contactMsg) {
      contactMsg.textContent = 'Thanks — your message has been sent.';
      contactMsg.style.color = 'var(--success)';
    }
    contactForm.reset();
  });
}

// "New Arrivals" quick filter (example behavior)
const filterNewBtn = $('#filterNew');
if (filterNewBtn) {
  filterNewBtn.addEventListener('click', () => {
    // Example: treat items priced <= 2000 as "new" for demo
    if (filterPrice) {
      filterPrice.value = 2000;
      if (priceLabel) priceLabel.textContent = filterPrice.value;
    }
    applyFilters();
    const shop = $('\shop.html');
    if (shop) shop.scrollIntoView({ behavior: 'smooth' });
  });
}

// Accessibility: show focus outlines when keyboard navigation is used
document.addEventListener('keyup', (e) => {
  if (e.key === 'Tab') document.body.classList.add('show-focus');
});

// Initial filter application
applyFilters();
// Ensure a global currentProduct object is set when opening the modal
function openModalFromButton(btn) {
  if (!btn || !modalBackdrop) return;
  const id = btn.dataset.id || btn.dataset.productId || null; // optional product id
  const name = btn.dataset.name || '';
  const priceRaw = btn.dataset.price || '₹0';
  const price = Number(String(priceRaw).replace(/[^\d.]/g, '')) || 0;
  const img = btn.dataset.img || '';
  const desc = btn.dataset.desc || '';

  // Save current product for modal actions
  window.currentProduct = { id, name, price, img, desc };

  if (modalName) modalName.textContent = name;
  if (modalPrice) modalPrice.textContent = priceRaw;
  if (modalImg) {
    modalImg.src = img;
    modalImg.alt = name || 'Product image';
  }
  if (modalDesc) modalDesc.textContent = desc;

  modalBackdrop.style.display = 'flex';
  modalBackdrop.setAttribute('aria-hidden', 'false');
  if (modalClose) modalClose.focus();
}

// Add-to-cart behavior for modal button
if (modalAdd) {
  modalAdd.addEventListener('click', async () => {
    const p = window.currentProduct;
    if (!p) return;

    // Read cart from localStorage
    const cartKey = 'cart';
    const cart = JSON.parse(localStorage.getItem(cartKey) || '[]');

    // Find existing item by id if available, otherwise by name
    const matchKey = p.id ? 'productId' : 'name';
    let existing;
    if (p.id) existing = cart.find(i => i.productId === p.id);
    else existing = cart.find(i => i.name === p.name);

    if (existing) {
      existing.qty = (existing.qty || 1) + 1;
    } else {
      const item = {
        productId: p.id || null,
        name: p.name,
        price: p.price,
        img: p.img,
        qty: 1
      };
      cart.push(item);
    }

    // Save locally
    localStorage.setItem(cartKey, JSON.stringify(cart));

    // Update UI feedback
    modalAdd.textContent = 'Added';
    modalAdd.disabled = true;
    updateCartCount(); // optional helper below

    // If you previously saved a cartId, persist to backend
    const cartId = localStorage.getItem('cartId');
    if (cartId) {
      try {
        await fetch('/api/cart', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cartId, items: cart })
        });
      } catch (err) {
        // ignore network errors for demo
        console.warn('Failed to sync cart with server', err);
      }
    }

    // restore button and close modal
    setTimeout(() => {
      modalAdd.textContent = 'Add to cart';

      modalAdd.disabled = false;
      closeModal();
    }, 800);
  });
}

// Optional: update a cart count badge if you have one
function updateCartCount() {
  const cart = JSON.parse(localStorage.getItem('cart') || '[]');
  const count = cart.reduce((s, i) => s + (i.qty || 0), 0);
  const badge = document.querySelector('.cart-count'); // add this element in header if desired
  if (badge) badge.textContent = count;
}

// Run once on load to show existing count
updateCartCount();
