// ============================
// MENU DATA
// ============================
const menuItems = [
    { id: 1, name: "Coffee", price: 150, image: "coffee.png", subItems: [
        { name: "Hot Coffee", price: 150 },
        { name: "Cold Coffee - Latte", price: 160 },
        { name: "Cold Coffee - Cappuccino", price: 170 },
        { name: "Cold Coffee - Mocha", price: 175 }
    ] },
    { id: 2, name: "Tea", price: 10, image: "tea.png" },
    { id: 3, name: "Burger", price: 200, image: "burger.png", subItems: [
        { name: "Classic Burger", price: 200 },
        { name: "Mexican Burger", price: 220 },
        { name: "Cheese Burger", price: 210 }
    ] },
    { id: 4, name: "Pizza Slice", price: 120, image: "pizza.png", subItems: [
        { name: "Margherita Pizza", price: 120 },
        { name: "Pepperoni Pizza", price: 140 },
        { name: "Veggie Pizza", price: 130 }
    ] },
    { id: 5, name: "Salad", price: 180, image: "salad.png", subItems: [
        { name: "Chicken Salad", price: 180 },
        { name: "Veg Salad", price: 170 }
    ] },
    { id: 6, name: "Soda", price: 50, image: "soda.png", subItems: [
        { name: "Coca Cola", price: 50 },
        { name: "Thumbs Up", price: 50 },
        { name: "Sprite", price: 50 },
        { name: "Campa Cola", price: 50 },
        { name: "Pepsi", price: 50 }
    ] }
];

// ============================
// SERVICES DATA
// ============================
const services = [
    { name: "Coffee", imageUrl: "food-photos/coffee.png", href: "#" },
    { name: "Tea", imageUrl: "food-photos/tea.png", href: "#" },
    { name: "Burger", imageUrl: "food-photos/burger.png", href: "#" },
    { name: "Pizza", imageUrl: "food-photos/pizza.png", href: "#" },
    { name: "Pasta", imageUrl: "food-photos/pasta.png", href: "#" },
    { name: "Salad", imageUrl: "food-photos/salad.png", href: "#" },
    { name: "Soda", imageUrl: "food-photos/soda.png", href: "#" },
];

// ============================
// GLOBAL STATE
// ============================
let currentOrder = [];

// ============================
// UI HELPERS
// ============================
function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.style.display = 'block';
    setTimeout(() => toast.style.display = 'none', 2000);
}

function playButtonSound() {
    const sound = document.getElementById('button-sound');
    if (sound) sound.play().catch(() => {});
}
function playOrderSound() {
    const sound = document.getElementById('order-sound');
    if (sound) sound.play().catch(() => {});
}

function closePopup() {
    document.getElementById('popup-overlay').style.display = 'none';
    document.getElementById('popup-box').classList.remove('show');
    resetOrder();
}

function showPopup(orderNum) {
    document.getElementById('order-number-popup').textContent = orderNum;
    const overlay = document.getElementById('popup-overlay');
    const popup = document.getElementById('popup-box');
    overlay.style.display = 'flex';
    setTimeout(() => popup.classList.add('show'), 10);
}

// ============================
// ORDER LOGIC
// ============================
function addToOrder(itemId, subName, subPrice) {
    playButtonSound();
    const item = menuItems.find(i => i.id === itemId);
    if (!item) return;

    const name = subName || item.name;
    const price = subPrice || item.price;
    const existingItem = currentOrder.find(i => i.id === itemId && i.name === name);

    if (existingItem) {
        existingItem.quantity++;
    } else {
        currentOrder.push({ id: itemId, name, price, quantity: 1 });
    }
    updateOrderUI();
    showToast(`${name} added!`);
}

function updateOrderUI() {
    const orderList = document.getElementById('order-list');
    const totalSpan = document.getElementById('total');
    orderList.innerHTML = '';
    let total = 0;

    currentOrder.forEach((item, index) => {
        const itemTotal = item.price * item.quantity;
        total += itemTotal;
        const li = document.createElement('li');
        li.innerHTML = `
            ${item.name} x ${item.quantity}
            <span style="float:right;">₹${itemTotal.toFixed(2)}
            <button class="delete-btn" onclick="removeItem(${index})">X</button></span>
        `;
        orderList.appendChild(li);
    });

    totalSpan.textContent = total.toFixed(2);
    document.getElementById('pay-cash').disabled = total === 0;
    document.getElementById('pay-upi').disabled = total === 0;
}

function removeItem(index) {
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
    updateOrderUI();
}

// ============================
// PAYMENT (SIMPLE DEMO VERSION)
// ============================
let pendingOrder = null;

function choosePayment(method) {
    if (currentOrder.length === 0) {
        showToast("Order is empty!");
        return;
    }
    playButtonSound();
    pendingOrder = {
        method: method,
        items: [...currentOrder],
        total: parseFloat(document.getElementById('total').textContent)
    };
    if (method === 'cash') {
        playOrderSound();
        const orderNum = Math.floor(1000 + Math.random() * 9000);
        const now = new Date();
        const orderData = {
            id: orderNum,
            items: pendingOrder.items,
            total: pendingOrder.total,
            paymentMethod: method,
            timestamp: now.toLocaleString(),
            status: 'Successful'
        };
        let history = JSON.parse(localStorage.getItem('orderHistory') || '[]');
        history.unshift(orderData);
        localStorage.setItem('orderHistory', JSON.stringify(history));
        showPopup(orderNum);
        loadOrderHistory();
        resetOrder();
    } else if (method === 'upi') {
        document.getElementById('upi-total').textContent = pendingOrder.total.toFixed(2);
        const upiData = `upi://pay?pa=rampurawalahuzefa6@okhdfcbank&am=${pendingOrder.total}&tn=Huzefa's Cafe Order&cu=INR`;
        if (typeof QRCode !== 'undefined') {
            QRCode.toCanvas(document.getElementById('qrcode'), upiData, { width: 200, margin: 1, color: { dark: '#000000', light: '#FFFFFF' } }, function (error) {
                if (error) {
                    console.error('QR Code generation error:', error);
                    document.getElementById('qrcode').innerHTML = '<p>QR Code generation failed. Please try again.</p>';
                }
            });
        } else {
            console.error('QRCode library not loaded');
            document.getElementById('qrcode').innerHTML = '<p>QR Code library not available. Please refresh the page.</p>';
        }
        document.getElementById('upi-modal-overlay').style.display = 'flex';
        setTimeout(() => document.getElementById('upi-modal-box').classList.add('show'), 10);
    }
}

function closeUPIModal() {
    document.getElementById('upi-modal-overlay').style.display = 'none';
    document.getElementById('upi-modal-box').classList.remove('show');
    pendingOrder = null;
}

function confirmPaid() {
    if (!pendingOrder) return;
    const orderNum = Math.floor(1000 + Math.random() * 9000);
    const now = new Date();
    const orderData = {
        id: orderNum,
        items: pendingOrder.items,
        total: pendingOrder.total,
        paymentMethod: pendingOrder.method,
        timestamp: now.toLocaleString(),
        status: 'Successful'
    };
    let history = JSON.parse(localStorage.getItem('orderHistory') || '[]');
    history.unshift(orderData);
    localStorage.setItem('orderHistory', JSON.stringify(history));
    closeUPIModal();
    showPopup(orderNum);
    loadOrderHistory();
    resetOrder();
}

// ============================
// SUB-MENU LOGIC
// ============================
function showSubMenu(itemId) {
    const item = menuItems.find(i => i.id === itemId);
    if (!item || !item.subItems) return;

    const overlay = document.createElement('div');
    overlay.className = 'sub-menu-overlay';
    overlay.onclick = (e) => { if (e.target === overlay) closeSubMenu(); };

    const subMenuBox = document.createElement('div');
    const className = item.name.toLowerCase().split(' ')[0]; // e.g. burger, pizza, coffee
    subMenuBox.className = `sub-menu-box ${className}`;

    const header = document.createElement('div');
    header.className = 'sub-menu-header';
    header.innerHTML = `<h3>Choose ${item.name}</h3>
        <span class="close-btn" onclick="closeSubMenu()">×</span>`;
    subMenuBox.appendChild(header);

    const optionsDiv = document.createElement('div');
    optionsDiv.className = 'sub-menu-options';
    item.subItems.forEach(subItem => {
        const option = document.createElement('div');
        option.className = 'sub-menu-option';
        option.innerHTML = `<h4>${subItem.name}</h4>
            <p class="price">₹${subItem.price.toFixed(2)}</p>`;
        option.onclick = () => { addToOrder(itemId, subItem.name, subItem.price); closeSubMenu(); };
        optionsDiv.appendChild(option);
    });
    subMenuBox.appendChild(optionsDiv);

    overlay.appendChild(subMenuBox);
    document.body.appendChild(overlay);
}

// ============================
// ORDER HISTORY
// ============================
function loadOrderHistory() {
    const history = JSON.parse(localStorage.getItem('orderHistory') || '[]');
    const tableBody = document.getElementById('order-history-body');
    if (!tableBody) return;
    tableBody.innerHTML = '';
    history.forEach(order => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${order.timestamp}</td>
            <td>${order.id}</td>
            <td>${order.paymentMethod}</td>
            <td>${order.status}</td>
            <td>₹${order.total.toFixed(2)}</td>
        `;
        tableBody.appendChild(row);
    });
}

function clearHistory() {
    const overlay = document.getElementById('confirm-clear-overlay');
    const popup = document.getElementById('confirm-clear-box');
    overlay.style.display = 'flex';
    setTimeout(() => popup.classList.add('show'), 10);
}

function closeConfirmClear() {
    const overlay = document.getElementById('confirm-clear-overlay');
    const popup = document.getElementById('confirm-clear-box');
    popup.classList.remove('show');
    setTimeout(() => overlay.style.display = 'none', 300);
}

function confirmClear() {
    localStorage.removeItem('orderHistory');
    loadOrderHistory();
    closeConfirmClear();
    showToast('Order history cleared successfully!');
}

function closeSubMenu() {
    const overlay = document.querySelector('.sub-menu-overlay');
    if (overlay) overlay.remove();
}

// ============================
// INIT
// ============================
function initServices() {
    const grid = document.getElementById('services-grid');
    // Append services twice for seamless loop
    [...services, ...services].forEach(service => {
        const div = document.createElement('div');
        div.className = 'service';
        div.innerHTML = `
            <a href="${service.href}">
                <img src="${service.imageUrl}" alt="${service.name}">
                <div class="service-info">
                    <h4>${service.name}</h4>
                </div>
            </a>
        `;
        grid.appendChild(div);
    });
}

function initMenu() {
    const menuGrid = document.getElementById('menu');
    menuItems.forEach(item => {
        const div = document.createElement('div');
        div.className = 'dish';
        div.setAttribute('onclick', item.subItems ? `showSubMenu(${item.id})` : `addToOrder(${item.id})`);
        div.innerHTML = `
            <img src="food-photos/${item.image}" alt="${item.name}">
            <div class="dish-info">
                <h4>${item.name}</h4>
                <p class="price">₹${item.price.toFixed(2)}</p>
            </div>`;
        menuGrid.appendChild(div);
    });
}

document.addEventListener('DOMContentLoaded', () => {
    initServices();
    initMenu();
    loadOrderHistory();
});
