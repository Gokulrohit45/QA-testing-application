import time
import os
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# ── DEMO STORE HTML PAGE ─────────────────────────────────────────────────────
STORE_HTML = """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>BuildStore - E-Commerce Demo App</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #0b0f19; color: #e2e8f0; margin: 0; padding: 30px; }
        .container { max-width: 750px; margin: 0 auto; background: #161e2e; border: 1px solid #2d3748; border-radius: 16px; padding: 32px; box-shadow: 0 20px 40px rgba(0,0,0,0.6); }
        .header { border-bottom: 1px solid #2d3748; padding-bottom: 20px; margin-bottom: 24px; }
        h1 { color: #38bdf8; margin: 0; font-size: 24px; }
        p.subtitle { color: #94a3b8; font-size: 13px; margin: 6px 0 0 0; }
        .section { background: #0f172a; border: 1px solid #1e293b; border-radius: 10px; padding: 20px; margin-bottom: 20px; }
        .section h3 { margin-top: 0; color: #f1f5f9; font-size: 15px; display: flex; align-items: center; justify-content: space-between; }
        .badge { font-size: 10px; padding: 4px 8px; border-radius: 4px; font-weight: bold; background: #334155; color: #94a3b8; }
        .badge-danger { background: #7f1d1d; color: #fca5a5; }
        .badge-warning { background: #78350f; color: #fde68a; }
        label { display: block; font-size: 12px; font-weight: 600; color: #94a3b8; margin-top: 10px; text-transform: uppercase; }
        input { width: 100%; box-sizing: border-box; background: #1e293b; border: 1px solid #334155; color: white; padding: 10px; border-radius: 6px; margin-top: 4px; font-size: 14px; }
        .btn-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 12px; }
        button { background: #0284c7; color: white; border: none; padding: 11px 16px; border-radius: 6px; font-weight: 600; cursor: pointer; font-size: 13px; width: 100%; transition: all 0.2s; }
        button:hover { background: #0369a1; }
        button.btn-danger { background: #dc2626; } button.btn-danger:hover { background: #b91c1c; }
        button.btn-warning { background: #d97706; } button.btn-warning:hover { background: #b45309; }
        button.btn-success { background: #16a34a; } button.btn-success:hover { background: #15803d; }
        .console { background: #020617; border: 1px solid #1e293b; color: #38bdf8; font-family: monospace; font-size: 12px; padding: 10px; border-radius: 6px; margin-top: 10px; min-height: 24px; word-break: break-all; }
        .success-banner { background: #064e3b; border: 1px solid #047857; color: #a7f3d0; padding: 12px; border-radius: 8px; font-weight: bold; font-size: 13px; display: none; margin-top: 15px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🛍️ BuildStore - E-Commerce Demo Application</h1>
            <p class="subtitle">Isolated test app for Playwright UI & OpenTelemetry Backend Observability benchmarking.</p>
        </div>

        <!-- 1. Customer Profile Form -->
        <div class="section">
            <h3>1. Customer Profile <span class="badge badge-danger">Triggers Python Code Exception</span></h3>
            <label>Customer Name</label>
            <input type="text" id="cust-name" placeholder="Gokul">
            <label>Email Address</label>
            <input type="email" id="cust-email" placeholder="gokul@test.com">
            <label>Phone Number</label>
            <input type="text" id="cust-phone" placeholder="9876543210">
            <div style="margin-top:12px;">
                <button class="btn-danger" id="btn-save-profile" onclick="saveProfile()">Save Profile</button>
            </div>
            <div id="profile-log" class="console">Status: Ready</div>
        </div>

        <!-- 2. Product Search -->
        <div class="section">
            <h3>2. Product Search <span class="badge badge-warning">Triggers 3.5s Slow Query</span></h3>
            <label>Product Search</label>
            <input type="text" id="search-query" placeholder="Wireless Headphones">
            <div style="margin-top:12px;">
                <button class="btn-warning" id="btn-search" onclick="searchInventory()">Search Inventory</button>
            </div>
            <div id="search-log" class="console">Status: Ready</div>
        </div>

        <!-- 3. Checkout & Payment -->
        <div class="section">
            <h3>3. Package Checkout <span class="badge badge-danger">Triggers 504 Gateway Timeout</span></h3>
            <div class="btn-grid">
                <button id="btn-select-package" onclick="selectPackage()">Select Premium Package</button>
                <button class="btn-danger" id="btn-payment" onclick="processPayment()">Process Payment</button>
            </div>
            <div id="payment-log" class="console">Status: Ready</div>
        </div>

        <!-- 4. Silent Email & Order Confirmation -->
        <div class="section">
            <h3>4. Order Confirmation <span class="badge badge-danger">Triggers Silent API Failure (HTTP 500)</span></h3>
            <div class="btn-grid">
                <button class="btn-warning" id="btn-email" onclick="sendOrderEmail()">Send Order Email</button>
                <button class="btn-success" id="btn-complete" onclick="completeOrder()">Complete Order</button>
            </div>
            <div id="order-log" class="console">Status: Ready</div>
            <div id="success-banner" class="success-banner">✓ Order Confirmation Receipt Generated Successfully!</div>
        </div>
    </div>

    <script>
        async function saveProfile() {
            document.getElementById('profile-log').innerText = 'Sending POST /api/store/profile...';
            try {
                const res = await fetch('/api/store/profile', { method: 'POST' });
                const data = await res.json();
                document.getElementById('profile-log').innerText = 'Response (' + res.status + '): ' + JSON.stringify(data);
            } catch(e) {
                document.getElementById('profile-log').innerText = 'Error: ' + e.message;
            }
        }
        async function searchInventory() {
            document.getElementById('search-log').innerText = 'Searching 500,000 items (3.5s delay)...';
            try {
                const res = await fetch('/api/store/search?q=' + encodeURIComponent(document.getElementById('search-query').value));
                const data = await res.json();
                document.getElementById('search-log').innerText = 'Response (' + res.status + '): ' + JSON.stringify(data);
            } catch(e) {
                document.getElementById('search-log').innerText = 'Error: ' + e.message;
            }
        }
        function selectPackage() {
            document.getElementById('payment-log').innerText = 'Selected: Premium Package ($299)';
        }
        async function processPayment() {
            document.getElementById('payment-log').innerText = 'Connecting to Stripe Gateway (504 Timeout)...';
            try {
                const res = await fetch('/api/store/payment', { method: 'POST' });
                const data = await res.json();
                document.getElementById('payment-log').innerText = 'Response (' + res.status + '): ' + JSON.stringify(data);
            } catch(e) {
                document.getElementById('payment-log').innerText = 'Error: ' + e.message;
            }
        }
        async function sendOrderEmail() {
            document.getElementById('order-log').innerText = 'Sending background email (Silent 500 Fail)...';
            try {
                const res = await fetch('/api/store/email', { method: 'POST' });
                const data = await res.json();
                // SILENT FAILURE DEMO: UI displays success message even though API returned 500!
                document.getElementById('order-log').innerText = 'UI Notification: Email Notification Sent!';
            } catch(e) {
                document.getElementById('order-log').innerText = 'Error: ' + e.message;
            }
        }
        function completeOrder() {
            document.getElementById('success-banner').style.display = 'block';
            document.getElementById('order-log').innerText = 'Status: Order #8421 Completed';
        }
    </script>
</body>
</html>
"""

@app.route("/", methods=["GET"])
def home():
    """Renders standalone BuildStore demo app."""
    return STORE_HTML, 200, {'Content-Type': 'text/html'}


@app.route("/api/store/profile", methods=["POST", "OPTIONS"])
def store_profile():
    """Simulates a real Python Code Exception (AttributeError)."""
    if request.method == "OPTIONS":
        return jsonify({"status": "ok"}), 200
    return jsonify({
        "status": "error",
        "error_type": "AttributeError",
        "message": "'NoneType' object has no attribute 'email' at demo_app/app.py:L115",
        "stacktrace": "Traceback (most recent call last):\n  File 'demo_app/app.py', line 115, in save_profile\n    user_email = user.profile.email\nAttributeError: 'NoneType' object has no attribute 'email'"
    }), 500


@app.route("/api/store/search", methods=["GET", "OPTIONS"])
def store_search():
    """Simulates a 3.5s slow database query scan."""
    if request.method == "OPTIONS":
        return jsonify({"status": "ok"}), 200
    time.sleep(3.5)
    return jsonify({
        "status": "success",
        "query_duration_ms": 3520,
        "results_count": 42,
        "message": "Scanned 500,000 items without index."
    }), 200


@app.route("/api/store/payment", methods=["POST", "OPTIONS"])
def store_payment():
    """Simulates an API Connection Timeout (HTTP 504)."""
    if request.method == "OPTIONS":
        return jsonify({"status": "ok"}), 200
    return jsonify({
        "status": "error",
        "error_code": "GATEWAY_TIMEOUT",
        "message": "Connection to third-party Payment Gateway timed out after 10000ms."
    }), 504


@app.route("/api/store/email", methods=["POST", "OPTIONS"])
def store_email():
    """Simulates a Silent API Background Failure (HTTP 500)."""
    if request.method == "OPTIONS":
        return jsonify({"status": "ok"}), 200
    return jsonify({
        "status": "error",
        "error_code": "SMTP_CONNECT_REFUSED",
        "message": "Background order receipt email failed: SMTP server refused connection on port 587."
    }), 500


if __name__ == "__main__":
    port = int(os.getenv("DEMO_PORT", 5005))
    print(f"Starting BuildStore Demo App on http://localhost:{port}")
    app.run(host="0.0.0.0", port=port, debug=True)
