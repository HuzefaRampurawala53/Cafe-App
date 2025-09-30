from flask import Flask, jsonify, request, send_from_directory
import os, json, qrcode, io, base64
from datetime import datetime

# Initialize the Flask app. 
# We explicitly set the static folder for the product images.
app = Flask(__name__, static_folder='food-photos', static_url_path='/food-photos')

ORDERS_FILE = 'orders.json'

def load_orders():
    if os.path.exists(ORDERS_FILE):
        try:
            with open(ORDERS_FILE, 'r') as f:
                return json.load(f)
        except json.JSONDecodeError:
            return []
    return []

def save_orders(orders):
    with open(ORDERS_FILE, 'w') as f:
        # Save newest orders last for easy order number tracking
        json.dump(orders, f, indent=4)

def get_next_order_number():
    orders = load_orders()
    if not orders:
        return 1001
    # Find the maximum order number used so far
    max_num = max(order.get('order_number', 0) for order in orders)
    return max_num + 1

# =======================================================
# API ROUTES
# =======================================================

@app.route('/add_order', methods=['POST'])
def add_order():
    """Saves a confirmed order to the orders.json file."""
    data = request.get_json()
    orders = load_orders()
    
    # Use the order number provided by the front-end (from pendingOrder)
    order_number = data.get('orderNumber') 
    
    order = {
        'order_number': order_number,
        'items': data.get('items'),
        'total': data.get('total'),
        'paymentMethod': data.get('paymentMethod', ''),
        'status': 'Paid ✔️',
        'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    }
    orders.append(order)
    save_orders(orders)
    return jsonify({'message': 'Order saved', 'order_number': order_number})

@app.route('/get_orders')
def get_orders():
    """Retrieves all orders, showing the newest ones first."""
    # Reverse the list to show the newest orders first in the history table
    return jsonify(load_orders()[::-1])

@app.route('/generate_qr', methods=['POST'])
def generate_qr():
    """Generates a UPI QR code based on the order total."""
    data = request.get_json()
    total_amount = data.get('total', 0)
    order_number = data.get('orderNumber', get_next_order_number())

    # Replace this with your actual UPI ID and Payee Name
    upi_id = "rampurawalahuzefa6@okhdfcbank"
    payee_name = "Huzefa's Cafe"
    
    tn = f"Order {order_number} for Rs {total_amount}"
    
    # UPI Deep Link standard format
    upi_link = f"upi://pay?pa={upi_id}&pn={payee_name}&am={total_amount}&cu=INR&tn={tn}"
    
    qr = qrcode.QRCode(version=1, box_size=10, border=4)
    qr.add_data(upi_link)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    
    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    img_str = base64.b64encode(buffer.getvalue()).decode('utf-8')
    
    return jsonify({
        'qr_image': img_str, 
        'qr_url': 'data:image/png;base64,' + img_str, # Data URL for frontend
        'order_number': order_number
    })

@app.route('/clear_orders', methods=['POST'])
def clear_orders():
    """Clears the entire order history."""
    save_orders([])
    return jsonify({'message': 'Order history cleared!'})

# =======================================================
# STATIC FILE SERVING ROUTES (Crucial for CSS/JS/HTML)
# =======================================================

@app.route('/')
def index():
    """Serves the main HTML file."""
    return send_from_directory('.', 'index.html')

@app.route('/<filename>')
def serve_root_files(filename):
    """Serves files directly in the root directory: style.css, script.js, favicon.ico"""
    return send_from_directory('.', filename)

@app.route('/sounds/<path:filename>')
def serve_sounds(filename):
    """Serves files from the 'sounds' subdirectory."""
    return send_from_directory('sounds', filename)

@app.route('/food-video/<path:filename>')
def serve_food_video(filename):
    """Serves files from the 'food-video' subdirectory."""
    return send_from_directory('food-video', filename)

# =======================================================
# RUNNER
# =======================================================

if __name__ == "__main__":
    # Ensure necessary folders exist
    for folder in ['food-photos', 'sounds', 'food-video']:
        if not os.path.exists(folder):
            os.makedirs(folder)
            
    # Initialize orders.json if it doesn't exist
    if not os.path.exists(ORDERS_FILE):
        save_orders([])
        
    app.run(debug=True, host='0.0.0.0', port=5000)