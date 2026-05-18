# routes/admin_routes.py - Admin authentication endpoints
from flask import Blueprint, request, jsonify, session
from db import admins_collection

admin_bp = Blueprint("admin", __name__)

@admin_bp.route("/api/admin-login", methods=["POST"])
def admin_login():
    """POST /api/admin-login - Authenticate admin user."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"success": False, "error": "No data provided"}), 400

        username = data.get("username", "").strip()
        password = data.get("password", "").strip()

        if not username or not password:
            return jsonify({"success": False, "error": "Username and password required"}), 400

        # Find admin in DB
        admin = admins_collection.find_one({
            "username": username,
            "password": password  # In production: use bcrypt hashing!
        })

        if admin:
            return jsonify({
                "success": True,
                "message": "Login successful",
                "admin": username
            }), 200
        else:
            return jsonify({
                "success": False,
                "error": "Invalid credentials"
            }), 401
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500
