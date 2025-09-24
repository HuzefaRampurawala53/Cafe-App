from flask import Flask, jsonify, request, send_from_directory
import os, json, qrcode, io, base64
from datetime import datetime

app = Flask(__name__, static_folder='food-photos', static_url_path='/food-photos')

ORDERS_FILE = 'orders.json'

def load_orders():
    if os.path.exists(ORDERS_FILE):
        with open(ORDERS_FILE, 'r') as f:
            return json.load(f)
    return []

def save_orders(orders):
    with open(ORDERS_FILE, 'w') as f:
        json.dump(orders, f, indent=4)

def get_next_order_number():
    orders = load_orders()
    if not orders:
        return 1
    return orders[-1]['order_number'] + 1

@app.route('/add_order', methods=['POST'])
def add_order():
    data = request.get_json()
    orders = load_orders()
    order_number = get_next_order_number()
    order = {
        'order_number': order_number,
        'items': data.get('items'),
        'total': data.get('total'),
        'paymentMethod': data.get('paymentMethod', data.get('payment_method', '')),
        'status': 'Paid ✔️',
        'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    }
    orders.append(order)
    save_orders(orders)
    return jsonify({'message': 'Order saved', 'order_number': order_number})

@app.route('/get_orders')
def get_orders():
    return jsonify(load_orders())

@app.route('/generate_qr', methods=['POST'])
def generate_qr():
    data = request.get_json()
    total_amount = data.get('total', 0)
    order_number = data.get('order_number', '')
    upi_id = "rampurawalahuzefa6@okhdfcbank"
    payee_name = "Huzefa's Cafe"
    upi_link = f"upi://pay?pa={upi_id}&pn={payee_name}&am={total_amount}&cu=INR&tn=Order%20{order_number}"
    qr = qrcode.QRCode(version=1, box_size=10, border=4)
    qr.add_data(upi_link)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    img_str = base64.b64encode(buffer.getvalue()).decode('utf-8')
    return jsonify({'qr_image': img_str, 'order_number': order_number})

@app.route('/clear_orders', methods=['POST'])
def clear_orders():
    save_orders([])
    return jsonify({'message': 'Order history cleared!'})

@app.route('/')
def index():
    return send_from_directory('.', 'index.html')

if __name__ == "__main__":
    if not os.path.exists('food-photos'):
        os.makedirs('food-photos')
    if not os.path.exists('sounds'):
        os.makedirs('sounds')
    if not os.path.exists('orders.json'):
        save_orders([])
    app.run(debug=True, host='0.0.0.0')
