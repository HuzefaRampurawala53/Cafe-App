const menuContainer = document.getElementById('menu');
const orderList = document.getElementById('order-list');
const totalDisplay = document.getElementById('total');
const qrSection = document.getElementById('qr-section');
const qrCodeImg = document.getElementById('qr-code');
const orderNumberDisplay = document.getElementById('order-number');
const orderNumberPopupDisplay = document.getElementById('order-number-popup');
const toast = document.getElementById('toast');
const payCashBtn = document.getElementById('pay-cash');
const payUpiBtn = document.getElementById('pay-upi');
const afterUpi = document.getElementById('after-upi');

const buttonSound = document.getElementById('button-sound');
const orderSound = document.getElementById('order-sound');
const resetSound = document.getElementById('reset-sound');

let menu = {
    Pizza: { price: 100, img: "food-photos/pizza.png" },
    Burger: { price: 55, img: "food-photos/burger.png" },
    Pasta: { price: 80, img: "food-photos/pasta.png" },
    Salad: { price: 30, img: "food-photos/salad.png" },
    Soda: { price: 20, img: "food-photos/soda.png" },
    Coffee: { price: 25, img: "food-photos/coffee.png" },
    Tea: { price: 15, img: "food-photos/tea.png" }
};

let total = 0;
let orderedItems = {};
let currentOrderNumber = '';

function loadMenu() { renderMenu(); }

function renderMenu() {
    for (let dish in menu) {
        const div = document.createElement('div');
        div.className = 'dish';
        div.innerHTML = `<img src="${menu[dish].img}" alt="${dish}">
        <div class="dish-info"><h4>${dish}</h4><p class="price">₹${menu[dish].price}</p></div>`;
        div.onclick = () => addToOrder(dish);
        menuContainer.appendChild(div);
    }
}

function addToOrder(item) {
    buttonSound.play();
    orderedItems[item] = (orderedItems[item] || 0) + 1;
    updateSummary();
    showToast(`${item} added to order`);
}

function updateSummary() {
    orderList.innerHTML = "";
    total = 0;
    for (let item in orderedItems) {
        const qty = orderedItems[item];
        const price = menu[item].price;
        total += price * qty;
        const li = document.createElement('li');
        li.innerHTML = `${item} ×${qty} - ₹${price * qty} <button class="delete-btn" onclick="removeFromOrder('${item}')">🗑️</button>`;
        orderList.appendChild(li);
    }
    totalDisplay.textContent = total;
    const hasItems = Object.keys(orderedItems).length > 0;
    payCashBtn.disabled = !hasItems;
    payUpiBtn.disabled = !hasItems;
}

function removeFromOrder(item) {
    if (orderedItems[item]) {
        orderedItems[item] -= 1;
        if (orderedItems[item] <= 0) delete orderedItems[item];
        updateSummary();
        showToast(`Removed one ${item} from order`);
    }
}

async function choosePayment(method) {
    if (total === 0) { showToast('Add items first!'); return; }
    try {
        const order_data = { items: { ...orderedItems }, total, payment_method: method.toUpperCase() };
        const res = await fetch('/api/save_order', {
            method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(order_data)
        });
        const data = await res.json();
        currentOrderNumber = data.order_number;

        if (method === 'cash') {
            showPopup();
            confirmCashPayment();
            showOrderHistory();
        } else if (method === 'upi') {
            const qrRes = await fetch('/api/generate_qr', {
                method: 'POST',
                headers: {'Content-Type':'application/json'},
                body: JSON.stringify({ total: total, order_number: currentOrderNumber })
            });
            const qrData = await qrRes.json();
            qrCodeImg.src = 'data:image/png;base64,' + qrData.qr_image;
            orderNumberDisplay.textContent = `#${qrData.order_number}`;
            qrSection.style.display = 'block';
            afterUpi.style.display = 'block';
        }

    } catch(err){ console.error(err); showToast('Payment failed'); }
}

async function confirmUPIPayment() {
    await showOrderHistory();
    resetOrder();
    showToast('UPI Payment Confirmed');
}
function confirmCashPayment() { resetOrder(); showToast('Cash Payment Confirmed'); }

function resetOrder() {
    resetSound.play();
    orderedItems = {};
    total = 0;
    updateSummary();
    qrSection.style.display = 'none';
    afterUpi.style.display = 'none';
    closePopup();
}

function showPopup() {
    orderSound.play();
    const popup = document.getElementById('popup-overlay');
    orderNumberPopupDisplay.textContent = `#${currentOrderNumber}`;
    popup.style.display = 'flex';
    setTimeout(() => popup.querySelector('.popup-box').classList.add('show'), 50);
}

function closePopup() {
    const popup = document.getElementById('popup-overlay');
    popup.querySelector('.popup-box').classList.remove('show');
    setTimeout(()=>{ popup.style.display='none'; },300);
}

function showToast(message) {
    toast.textContent = message;
    toast.style.display='block';
    setTimeout(()=>{toast.style.display='none';},2000);
}

document.addEventListener('keydown', function(e) {
    const popup = document.getElementById('popup-overlay');
    if(popup.style.display==='flex'&&(e.key==='Escape'||e.key==='Enter')) closePopup();
});

document.getElementById('popup-overlay').addEventListener('click', function(e){
    if(e.target===this) closePopup();
});

// Order History Functions
async function showOrderHistory() {
    try {
        const res = await fetch('/api/orders');
        const orders = await res.json();
        const container = document.getElementById('order-history-content');
        if(!orders.length){ container.innerHTML='<p>No past orders.</p>'; return; }

        let table = `<table>
        <tr><th>Order No</th><th>Items</th><th>Total (₹)</th><th>Payment</th><th>Status</th><th>Time</th></tr>`;

        orders.forEach(o=>{
            const items = Object.entries(o.items).map(([k,v])=>`${k}×${v}`).join(', ');
            table+=`<tr>
            <td>#${o.order_number}</td>
            <td>${items}</td>
            <td>₹${o.total}</td>
            <td>${o.payment_method}</td>
            <td>${o.status}</td>
            <td>${o.timestamp}</td>
            </tr>`;
        });
        table+='</table>';
        container.innerHTML=table;

    } catch(err){ console.error(err); showToast('Failed to fetch history'); }
}

async function clearOrderHistory() {
    if(!confirm('Are you sure you want to delete all order history?')) return;
    try {
        const res = await fetch('/api/clear_orders',{method:'POST'});
        const data = await res.json();
        showToast(data.message||'History cleared!');
        showOrderHistory();
    } catch { showToast('Failed to clear history'); }
}

// Init
loadMenu();
showOrderHistory();
