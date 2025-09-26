// ============================
// MENU DATA (UPDATED WITH YOUR IMAGE FILE NAMES)
// ============================
const menuItems = [
    { id: 1, name: "Coffee", price: 150, image: "coffee.png" },
    { id: 2, name: "Tea", price: 100, image: "tea.png" },
    { id: 3, name: "Burger", price: 200, image: "burger.png" },
    { id: 4, name: "Pizza Slice", price: 120, image: "pizza.png" },
    { id: 5, name: "Salad", price: 180, image: "salad.png" },
    { id: 6, name: "Soda", price: 50, image: "soda.png" }
];

// ============================
// GLOBAL STATE VARIABLES
// ============================
let currentOrder = []; // The list of items currently selected
let pendingOrder = null; // Used to temporarily store the order during payment flow
let orderHistory = []; // Local history cache
let currentOrderNumber = 1000; // Starting order number (will be updated on fetch)

// ============================
// UI AND SOUND HELPERS
// ============================

function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.style.display = 'block';
    setTimeout(() => {
        toast.style.display = 'none';
    }, 2000);
}

function playButtonSound() {
    const sound = document.getElementById('button-sound');
    if (sound) {
        // Autoplay policy fix: ensure sound is played only after user interaction
        sound.play().catch(e => console.log("Sound play prevented:", e));
    }
}

function playOrderSound() {
    const sound = document.getElementById('order-sound');
    if (sound) {
        sound.play().catch(e => console.log("Sound play prevented:", e));
    }
}

function closePopup() {
    document.getElementById('popup-overlay').style.display = 'none';
    const popup = document.getElementById('popup-box');
    popup.classList.remove('show');
    resetOrder();
}

function showPopup(orderNum) {
    document.getElementById('order-number-popup').textContent = orderNum;
    const popup = document.getElementById('popup-box');
    const overlay = document.getElementById('popup-overlay');
    overlay.style.display = 'flex';
    setTimeout(() => {
        popup.classList.add('show');
    }, 10);
}

// ============================
// ORDER LOGIC
// ============================

function addToOrder(itemId) {
    playButtonSound();

    const item = menuItems.find(i => i.id === itemId);
    if (!item) return;

    const existingItem = currentOrder.find(i => i.id === itemId);

    if (existingItem) {
        existingItem.quantity++;
    } else {
        // Deep copy the item to ensure quantity is tracked locally
        currentOrder.push({ ...item, quantity: 1 });
    }

    updateOrderUI();
    showToast(`${item.name} added!`);
}

function updateOrderUI() {
    const orderList = document.getElementById('order-list');
    const totalSpan = document.getElementById('total');
    let total = 0;

    orderList.innerHTML = '';

    currentOrder.forEach((item, index) => {
        const itemTotal = item.price * item.quantity;
        total += itemTotal;

        const li = document.createElement('li');
        li.innerHTML = `
            ${item.name} x ${item.quantity} 
            <span style="float:right;">
                ₹${itemTotal.toFixed(2)}
                <button class="delete-btn" onclick="removeItem(${index})">X</button>
            </span>
        `;
        orderList.appendChild(li);
    });

    totalSpan.textContent = total.toFixed(2);
    
    // Enable payment buttons if total > 0
    const isDisabled = total === 0;
    document.getElementById('pay-cash').disabled = isDisabled;
    document.getElementById('pay-upi').disabled = isDisabled;
}

function removeItem(index) {
    playButtonSound();
    const removedItem = currentOrder[index];
    
    if (removedItem.quantity > 1) {
        removedItem.quantity--;
    } else {
        currentOrder.splice(index, 1);
    }
    
    updateOrderUI();
    showToast(`${removedItem.name} updated.`);
}

function resetOrder() {
    currentOrder = [];
    pendingOrder = null;
    updateOrderUI();
    
    document.getElementById('qr-section').style.display = 'none';
    document.getElementById('after-upi').style.display = 'none';
    document.getElementById('qr-code').src = "";
    
    const resetSound = document.getElementById('reset-sound');
    if (resetSound) {
         resetSound.play().catch(e => console.log("Sound play prevented:", e));
    }
}

// ============================
// PAYMENT LOGIC
// ============================

function choosePayment(method) {
    if (currentOrder.length === 0) {
        showToast("Order is empty!");
        return;
    }

    const total = currentOrder.reduce((sum, item) => sum + item.price * item.quantity, 0);
    currentOrderNumber++; // Increment order number locally

    // Prepare the pending order object for payment/saving
    pendingOrder = {
        orderNumber: currentOrderNumber,
        items: JSON.parse(JSON.stringify(currentOrder)), 
        total: total,
        paymentMethod: method,
        timestamp: new Date().toLocaleTimeString()
    };

    if (method === 'cash') {
        confirmPayment(pendingOrder); 
    } else if (method === 'upi') {
        showUpiQr(pendingOrder);
    }
}

async function showUpiQr(order) {
    const qrSection = document.getElementById('qr-section');
    const qrCodeImg = document.getElementById('qr-code');
    const orderNumberDisplay = document.getElementById('order-number');
    const afterUpi = document.getElementById('after-upi');

    try {
        const response = await fetch('/generate_qr', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(order)
        });

        const data = await response.json();
        
        qrCodeImg.src = data.qr_url; // Use the base64 data URL from the backend
        orderNumberDisplay.textContent = `Order #${data.order_number}`;

        qrSection.style.display = 'block';
        afterUpi.style.display = 'block';
        showToast('UPI QR Generated. Awaiting confirmation.');

    } catch(error) {
        console.error("QR generation failed:", error);
        showToast('Failed to generate UPI QR.');
    }
}

async function confirmPayment(orderToSave) {
    // If not passed an order (i.e., called by confirmUPIPayment), use the pending one
    const order = orderToSave || pendingOrder;

    if (!order) return;

    try {
        const response = await fetch('/add_order', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(order)
        });
        
        const data = await response.json();

        // 1. Save to History (Update local cache from server)
        await showOrderHistory(); 

        // 2. Play Sound and show confirmation
        playOrderSound();
        showPopup(data.order_number);

        // Reset is handled by closePopup()
        
    } catch(error) {
        console.error("Failed to save order:", error);
        showToast('Error: Could not save the order.');
    }
}

// For UPI, this function is bound to the "Confirm Payment" button
function confirmUPIPayment() {
    confirmPayment(pendingOrder);
}


// ============================
// HISTORY LOGIC
// ============================

async function showOrderHistory() {
    const historyContent = document.getElementById('order-history-content');
    
    try {
        const response = await fetch('/get_orders');
        const orders = await response.json();
        orderHistory = orders; // Update local cache

        if (orders.length === 0) {
            historyContent.innerHTML = '<p>No past orders.</p>';
            return;
        }

        let tableHTML = `
            <table>
                <thead>
                    <tr>
                        <th>Order #</th>
                        <th>Time</th>
                        <th>Items</th>
                        <th>Total</th>
                        <th>Method</th>
                    </tr>
                </thead>
                <tbody>
        `;

        orders.forEach(order => {
            const itemsList = order.items.map(i => `${i.name} (${i.quantity})`).join(', ');
            tableHTML += `
                <tr>
                    <td>#${order.orderNumber || order.order_number}</td>
                    <td>${order.timestamp.split(' ')[1] || order.timestamp}</td>
                    <td>${itemsList}</td>
                    <td>₹${order.total.toFixed(2)}</td>
                    <td>${order.paymentMethod.toUpperCase()}</td>
                </tr>
            `;
        });

        tableHTML += '</tbody></table>';
        historyContent.innerHTML = tableHTML;
    } catch (error) {
        console.error("Failed to fetch order history:", error);
        historyContent.innerHTML = '<p>Error loading history.</p>';
    }
}

async function clearOrderHistory() {
    try {
        await fetch('/clear_orders', { method: 'POST' });
        orderHistory = [];
        showOrderHistory();
        showToast('Order history cleared!');
    } catch(error) {
        console.error("Failed to clear history:", error);
        showToast('Error: Could not clear history.');
    }
}

// ============================
// INIT FUNCTION (TO BUILD THE MENU)
// ============================
function initMenu() {
    const menuGrid = document.getElementById('menu');
    menuItems.forEach(item => {
        const div = document.createElement('div');
        div.className = 'dish';
        div.setAttribute('onclick', `addToOrder(${item.id})`); 
        div.innerHTML = `
            <img src="/food-photos/${item.image}" alt="${item.name}">
            
            <div class="dish-info">
                <h4>${item.name}</h4>
                <p class="price">₹${item.price.toFixed(2)}</p>
            </div>
        `;
        menuGrid.appendChild(div);
    });
}


// ============================
// INITIALIZATION
// ============================

function initApp() {
    // 1. Build the menu grid
    initMenu(); 
    
    // 2. Load the history from the backend
    showOrderHistory();
}

// Attach the main initialization function to run once the DOM is ready
document.addEventListener('DOMContentLoaded', initApp);