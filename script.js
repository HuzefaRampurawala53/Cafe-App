// ============================
// GLOBAL VARIABLES
// ============================
let pendingOrder = null; // temporarily store the order
let selectedPaymentMethod = null;

// ============================
// GATHER ORDER
// ============================
function gatherOrder() {
    // Example: collect order data from your form
    const items = []; // fill with selected items
    document.querySelectorAll(".item.selected").forEach(item => {
        items.push({
            name: item.dataset.name,
            price: parseFloat(item.dataset.price),
            quantity: parseInt(item.querySelector(".qty").value)
        });
    });

    const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

    return {
        items,
        total,
        paymentMethod: selectedPaymentMethod,
        timestamp: new Date().toISOString()
    };
}

// ============================
// PAY BUTTON CLICK
// ============================
function pay(paymentMethod) {
    selectedPaymentMethod = paymentMethod;
    pendingOrder = gatherOrder();

    if (!pendingOrder.items.length) {
        alert("Please select items first!");
        return;
    }

    if (paymentMethod === "UPI") {
        showUpiQr(pendingOrder);
        // Do NOT save order yet, wait for confirm button
    } else if (paymentMethod === "Cash") {
        confirmPayment(); // Cash saves immediately
    }
}

// ============================
// SHOW UPI QR
// ============================
function showUpiQr(order) {
    // Example: display the QR image returned from backend
    fetch("/generate_qr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(order)
    })
    .then(res => res.json())
    .then(data => {
        document.getElementById("qr-container").innerHTML = `<img src="${data.qr_url}" alt="UPI QR">`;
        document.getElementById("confirm-payment-btn").style.display = "inline-block";
    })
    .catch(err => console.error("QR generation failed", err));
}

// ============================
// CONFIRM PAYMENT
// ============================
function confirmPayment() {
    if (!pendingOrder) return;

    fetch("/add_order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pendingOrder)
    })
    .then(res => res.json())
    .then(data => {
        pendingOrder = null; // reset after saving
        alert("Order saved successfully!");
        updateHistoryUI();
        document.getElementById("confirm-payment-btn").style.display = "none";
        document.getElementById("qr-container").innerHTML = "";
    })
    .catch(err => console.error("Saving order failed", err));
}

// ============================
// UPDATE HISTORY UI
// ============================
function updateHistoryUI() {
    fetch("/get_orders")
    .then(res => res.json())
    .then(orders => {
        const container = document.getElementById("order-history");
        container.innerHTML = "";
        orders.forEach(order => {
            const el = document.createElement("div");
            el.classList.add("order-item");
            el.innerHTML = `
                <strong>${order.timestamp}</strong> | ${order.paymentMethod} | ₹${order.total.toFixed(2)}
            `;
            container.appendChild(el);
        });
    });
}

// ============================
// EVENT LISTENERS
// ============================
document.getElementById("pay-upi-btn").addEventListener("click", () => pay("UPI"));
document.getElementById("pay-cash-btn").addEventListener("click", () => pay("Cash"));
document.getElementById("confirm-payment-btn").addEventListener("click", confirmPayment);

// ============================
// INITIALIZE HISTORY ON PAGE LOAD
// ============================
updateHistoryUI();
