// 1. Load the bag from localStorage
let cart = JSON.parse(localStorage.getItem('lydia_cart')) || [];

/**
 * Initialize the Checkout Summary
 */
function initCheckout() {
    if (cart.length === 0) {
        window.location.href = 'shop.html';
        return;
    }

    const list = document.getElementById('checkoutItemsList');
    if (!list) return;

    let subtotal = 0;

    // Render the mini-summary
    list.innerHTML = cart.map(item => {
        const itemTotal = item.price * (item.quantity || 1);
        subtotal += itemTotal;
        return `
            <div class="summary-item" style="display:flex; justify-content:space-between; margin-bottom:12px; font-size:0.85rem;">
                <span style="color: #888;">${item.name} (x${item.quantity || 1})</span>
                <span style="font-weight: 700;">₹${itemTotal.toLocaleString('en-IN')}</span>
            </div>`;
    }).join('');

    const discount = subtotal * 0.10; // 10% Boutique Discount
    const finalTotal = subtotal - discount;

    document.getElementById('checkSubtotal').innerText = `₹${subtotal.toLocaleString('en-IN')}`;
    document.getElementById('checkDiscount').innerText = `-₹${discount.toLocaleString('en-IN')}`;
    document.getElementById('checkTotal').innerText = `₹${finalTotal.toLocaleString('en-IN')}`;
}

/**
 * Handle Order Submission
 */
const orderForm = document.getElementById('finalOrderForm');

if (orderForm) {
    orderForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        // 1. Show Loading State on Button
        const submitBtn = e.target.querySelector('button[type="submit"]');
        const originalBtnText = submitBtn.innerText;
        submitBtn.innerText = "PROCESSING ORDER...";
        submitBtn.disabled = true;

        // 2. Collect Data
        const orderPayload = {
            customer: {
                name: document.getElementById('custName').value,
                email: document.getElementById('custEmail').value,
                phone: document.getElementById('custPhone').value,
                address: document.getElementById('custAddress').value
            },
            measurements: {
                bust: document.getElementById('mBust').value,
                waist: document.getElementById('mWaist').value,
                hips: document.getElementById('mHips').value,
                length: document.getElementById('mLength').value || 'Standard'
            },
            items: cart,
            totalAmount: document.getElementById('checkTotal').innerText,
            currency: "INR",
            createdAt: new Date().toISOString()
        };

        try {
            // 3. Send to Node.js Backend
            const response = await fetch('/api/orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(orderPayload)
            });
            
            const data = await response.json();

            if (data.success) {
                // Clear local selection and redirect to success page
                localStorage.removeItem('lydia_cart');
                window.location.href = `success.html?id=${data.orderId}`;
            } else {
                throw new Error(data.message || "Order failed");
            }

        } catch (err) {
            console.error("Checkout Error:", err);
            alert("The studio server is currently busy. Your measurements are saved locally; please try again in a moment.");
            
            // Re-enable button
            submitBtn.innerText = originalBtnText;
            submitBtn.disabled = false;
        }
    });
}

// Run on load
initCheckout();