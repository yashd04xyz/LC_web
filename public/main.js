// 1. Product Database (Keep this until you fully transition to fetch from server.js)
const archiveProducts = [
    { id: 201, name: "Midnight Velvet Gown", category: "dresses", size: "M", price: 4200, img: "images/eveningdress.jpg", fabric: "Silk Velvet" },
    { id: 202, name: "Ivory Silk Blouse", category: "tops", size: "S", price: 1850, img: "images/red.jpg", fabric: "Mulberry Silk" },
    { id: 203, name: "Saffron Festive Lehenga", category: "ethnic", size: "L", price: 4800, img: "images/or.jpg", fabric: "Chanderi Silk" },
    { id: 204, name: "Cerulean Day Dress", category: "dresses", size: "M", price: 2900, img: "images/pink.jpg", fabric: "Linen Blend" },
    { id: 205, name: "Gold Plated Choker", category: "accessories", size: "all", price: 1200, img: "images/white.jpg", fabric: "Brass & Gold" }
];

// 2. Element Selectors
const grid = document.getElementById('productGrid');
const searchInput = document.getElementById('shopSearch');
const categoryFilter = document.getElementById('filterCategory');
const sizeFilter = document.getElementById('filterSize');
const priceFilter = document.getElementById('filterPrice');
const priceValDisplay = document.getElementById('priceVal');
const cartNav = document.getElementById('cartNav');
const toast = document.getElementById('toast');

// Modal Selectors
const modal = document.getElementById('quickViewModal');
const modalImg = document.getElementById('modalImg');
const modalTitle = document.getElementById('modalTitle');
const modalFabric = document.getElementById('modalFabric');
const modalPrice = document.getElementById('modalPrice');
const modalAddBtn = document.getElementById('modalAddBtn');

// 3. Render Product Grid
function renderArchive(products) {
    if (!grid) return; // Prevent errors on pages without a grid
    grid.innerHTML = '';
    
    if (products.length === 0) {
        grid.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: #666; padding: 50px; font-family: 'Playfair Display'; italic;">No pieces found in the archive.</p>`;
        return;
    }

    products.forEach(product => {
        const card = document.createElement('div');
        card.className = 'product-card';
        card.innerHTML = `
            <div class="rental-badge">READY TO SHIP</div>
            <div class="img-wrapper">
                <img src="${product.img}" alt="${product.name}" onclick="openQuickView(${product.id})">
            </div>
            <div class="product-meta">
                <div class="item-details-sub" style="font-size: 0.7rem; color: #888; text-transform: uppercase; letter-spacing: 1px;">${product.fabric} | ${product.size}</div>
                <h3 style="margin: 5px 0; font-family: 'Playfair Display';">${product.name}</h3>
                <div class="price" style="color: var(--brand-gold); font-weight: 700;">₹${product.price.toLocaleString('en-IN')}</div>
                <button class="btn-lux" onclick="addToBag(${product.id})">Add to Bag</button>
            </div>
        `;
        grid.appendChild(card);
    });
}

// 4. Filtering Logic
function filterArchive() {
    const searchTerm = searchInput.value.toLowerCase();
    const category = categoryFilter.value;
    const size = sizeFilter.value;
    const maxPrice = parseInt(priceFilter.value);

    if (priceValDisplay) priceValDisplay.innerText = maxPrice;

    const filtered = archiveProducts.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(searchTerm) || p.fabric.toLowerCase().includes(searchTerm);
        const matchesCategory = category === 'all' || p.category === category;
        const matchesSize = size === 'all' || p.size === size || p.size === 'all';
        const matchesPrice = p.price <= maxPrice;
        return matchesSearch && matchesCategory && matchesSize && matchesPrice;
    });

    renderArchive(filtered);
}

// 5. Modal Functions
window.openQuickView = (id) => {
    const product = archiveProducts.find(p => p.id === id);
    modalImg.src = product.img;
    modalTitle.innerText = product.name;
    modalFabric.innerText = `${product.fabric} | Size ${product.size}`;
    modalPrice.innerText = `₹${product.price.toLocaleString('en-IN')}`;
    
    modalAddBtn.onclick = () => {
        addToBag(product.id);
        closeQuickView();
    };

    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden'; // Prevent background scroll
};

window.closeQuickView = () => {
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
};

// 6. Cart Management
function addToBag(id) {
    const product = archiveProducts.find(p => p.id === id);
    let cart = JSON.parse(localStorage.getItem('lydia_cart')) || [];
    
    const existing = cart.find(item => item.id === id);
    if (existing) {
        // Use 'quantity' to match our cart.js logic
        existing.quantity = (existing.quantity || existing.qty || 1) + 1; 
    } else {
        cart.push({ ...product, quantity: 1 });
    }
    
    localStorage.setItem('lydia_cart', JSON.stringify(cart));
    updateCartCount();
    showToast(`${product.name} added to your selection`);
}

function updateCartCount() {
    if (!cartNav) return;
    let cart = JSON.parse(localStorage.getItem('lydia_cart')) || [];
    // Ensure we count quantity correctly
    const totalItems = cart.reduce((acc, item) => acc + (item.quantity || item.qty || 0), 0);
    cartNav.innerText = `Cart(${totalItems})`;
}

function showToast(msg) {
    if (!toast) return;
    toast.innerText = msg;
    toast.style.display = 'block';
    setTimeout(() => { toast.style.display = 'none'; }, 2500);
}

// 7. Event Listeners
[searchInput, categoryFilter, sizeFilter, priceFilter].forEach(el => {
    if (el) el.addEventListener('input', filterArchive);
});

document.addEventListener('DOMContentLoaded', () => {
    // Hamburger logic...
    const hamburger = document.getElementById('hamburger');
    const navLinks = document.getElementById('navLinks');

    if (hamburger && navLinks) {
        hamburger.addEventListener('click', () => {
            navLinks.classList.toggle('active');
            hamburger.classList.toggle('toggle');
            document.body.style.overflow = navLinks.classList.contains('active') ? 'hidden' : 'auto';
        });
    }

    renderArchive(archiveProducts);
    updateCartCount();
});