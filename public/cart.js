// 1. Load Data
let cart = JSON.parse(localStorage.getItem('lydia_cart')) || [];

/**
 * 2. Quantity & Removal Logic
 */
window.updateQty = function(index, change) {
    if (cart[index]) {
        const newQty = (cart[index].quantity || 1) + change;
        if (newQty > 0) {
            cart[index].quantity = newQty;
            saveCart();
        } else {
            window.removeItem(index);
        }
    }
};

window.removeItem = function(index) {
    cart.splice(index, 1);
    saveCart();
};

function saveCart() {
    localStorage.setItem('lydia_cart', JSON.stringify(cart));
    renderCart(); 
    renderRecommendations(); // Refresh recommendations whenever cart changes
    if (typeof updateCartCount === 'function') updateCartCount();
}

/**
 * 3. Rendering Logic
 */
function renderCart() {
    const listContainer = document.getElementById('cartItemsList');
    if (!listContainer) return;

    if (cart.length === 0) {
        listContainer.innerHTML = `
            <div style="padding: 60px 20px; text-align: center; color: #555;">
                <p style="font-family: 'Playfair Display'; font-style: italic; font-size: 1.2rem;">Your archive is currently empty.</p>
                <a href="shop.html" style="color: var(--brand-gold); text-decoration: none; font-size: 0.75rem; letter-spacing: 2px; text-transform: uppercase; border-bottom: 1px solid var(--brand-gold); padding-bottom: 5px;">Return to Collection</a>
            </div>`;
        updateSummary(0, 0);
        return;
    }

    let subtotal = 0;
    let totalItems = 0;

    listContainer.innerHTML = cart.map((item, index) => {
        const qty = item.quantity || 1;
        subtotal += item.price * qty;
        totalItems += qty;

        return `
        <div class="cart-item" style="display: flex; gap: 20px; padding: 20px 0; border-bottom: 1px solid #1a1a1a;">
            <div class="item-img-container" style="width: 100px; height: 130px; overflow: hidden; background: #111;">
                <img src="${item.image}" alt="${item.name}" style="width: 100%; height: 100%; object-fit: cover;">
            </div>
            <div style="flex: 1;">
                <h3 style="margin:0; font-family: 'Playfair Display'; font-weight: 400; font-size: 1.1rem;">${item.name}</h3>
                <p style="color: var(--brand-gold); font-size: 14px; margin: 5px 0;">₹${item.price.toLocaleString()}</p>
                
                <div style="display: flex; align-items: center; gap: 15px; margin-top: 15px;">
                    <button onclick="updateQty(${index}, -1)" style="background: transparent; border: 1px solid #333; color: white; width: 25px; height: 25px; cursor: pointer;">-</button>
                    <span style="font-size: 0.9rem;">${qty}</span>
                    <button onclick="updateQty(${index}, 1)" style="background: transparent; border: 1px solid #333; color: white; width: 25px; height: 25px; cursor: pointer;">+</button>
                </div>
                
                <button onclick="removeItem(${index})" style="margin-top: 15px; background: none; border: none; color: #888; cursor: pointer; font-size: 10px; letter-spacing: 1px; text-transform: uppercase;">Remove</button>
            </div>
        </div>`;
    }).join('');

    updateSummary(subtotal, totalItems);
}

function updateSummary(subtotal, count) {
    const discount = subtotal * 0.10;
    const finalTotal = subtotal - discount;

    if(document.getElementById('countTop')) document.getElementById('countTop').innerText = count;
    if(document.getElementById('countSummary')) document.getElementById('countSummary').innerText = count;
    if(document.getElementById('subtotal')) document.getElementById('subtotal').innerText = `₹${subtotal.toLocaleString()}`;
    if(document.getElementById('discount')) document.getElementById('discount').innerText = `-₹${discount.toLocaleString()}`;
    if(document.getElementById('total')) document.getElementById('total').innerText = `₹${finalTotal.toLocaleString()}`;
}

/**
 * 4. Boutique Recommendations logic
 */
async function renderRecommendations() {
    const recGrid = document.getElementById('recommendationGrid');
    if (!recGrid) return;

    try {
        const response = await fetch('/api/products');
        const data = await response.json();
        
        const cartIds = cart.map(item => Number(item.id));
        const suggestions = data.products
            .filter(p => !cartIds.includes(Number(p.id)))
            .sort(() => 0.5 - Math.random())
            .slice(0, 4);

        if (suggestions.length === 0) {
            recGrid.innerHTML = `<p style="color: #555; font-size: 12px; text-align: center; width: 100%;">Checking the archive for more pieces...</p>`;
            return;
        }

        recGrid.innerHTML = suggestions.map(prod => `
            <div class="rec-item" style="text-align: center; background: #0a0a0a; border: 1px solid #1a1a1a; padding: 15px; transition: 0.3s;">
                <div style="height: 180px; overflow: hidden; margin-bottom: 15px;">
                    <img src="${prod.image}" alt="${prod.name}" style="width: 100%; height: 100%; object-fit: cover;">
                </div>
                <h4 style="font-size: 13px; margin: 0 0 5px; font-family: 'Playfair Display'; font-weight: 400; color: #fff;">${prod.name}</h4>
                <p style="font-size: 12px; color: var(--brand-gold); margin-bottom: 10px;">₹${prod.price.toLocaleString()}</p>
                <button onclick="addToCartFromRecs(${prod.id})" 
                    style="background: transparent; border: 1px solid var(--brand-gold); color: var(--brand-gold); padding: 8px 0; font-size: 10px; cursor: pointer; width: 100%; text-transform: uppercase; letter-spacing: 1px;">
                    Add to Archive
                </button>
            </div>
        `).join('');
    } catch (err) {
        console.error("Recommendations currently unavailable");
    }
}

window.addToCartFromRecs = async (id) => {
    try {
        const response = await fetch(`/api/products/${id}`);
        const data = await response.json();
        if(data.success) {
            const existing = cart.find(item => Number(item.id) === Number(id));
            if (existing) {
                existing.quantity = (existing.quantity || 1) + 1;
            } else {
                cart.push({ ...data.product, quantity: 1 });
            }
            saveCart();
            if (typeof showToast === 'function') showToast("Added to your selection");
        }
    } catch (err) {
        console.error("Error adding recommendation to cart:", err);
    }
};

/**
 * 5. Cloud Sync Logic
 */
window.syncCartWithServer = async function() {
    const syncBtn = document.getElementById('syncBtn');
    if (!cart.length) return alert("Archive is empty.");

    syncBtn.innerText = "SAVING...";
    try {
        const response = await fetch('/api/cart', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                cartId: localStorage.getItem('lydia_cart_id') || `user_${Date.now()}`,
                items: cart
            })
        });
        const data = await response.json();
        if (data.success) {
            localStorage.setItem('lydia_cart_id', data.cartId);
            alert("Archive synced to cloud successfully.");
        }
    } catch (err) {
        alert("Sync failed. Ensure server.js is running.");
    } finally {
        syncBtn.innerText = "SYNC TO CLOUD";
    }
};

/**
 * 6. Order Processing Logic
 */
async function processOrder() {
    if (cart.length === 0) return alert("Your bag is empty.");

    const orderData = {
        customer: { name: "Guest User" }, // Replace with form data later
        items: cart,
        total: cart.reduce((acc, item) => acc + (item.price * item.quantity), 0)
    };

    try {
        const response = await fetch('/api/orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(orderData)
        });
        
        const data = await response.json();

        if (data.success) {
            // 1. Clear the local cart now that the order is successful
            localStorage.removeItem('lydia_cart');
            
            // 2. Redirect to success page with the Order ID for confirmation
            window.location.href = `success.html?id=${data.orderId}`;
        } else {
            alert("Order processing failed. Please try again.");
        }
    } catch (err) {
        console.error("Checkout Error:", err);
        alert("Unable to connect to the studio server. Please ensure your backend is running.");
    }
}

/**
 * 7. Initialization
 * Ensures the cart and recommendations load as soon as the DOM is ready
 */
document.addEventListener('DOMContentLoaded', () => {
    // Initial UI render
    renderCart();
    
    // Load recommendations from server
    renderRecommendations();
    
    // Sync navigation count
    if (typeof updateCartCount === 'function') {
        updateCartCount();
    }
});