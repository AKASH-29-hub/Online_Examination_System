# routes/log_routes.py - Anti-cheating log API endpoints
from flask import Blueprint, request, jsonify
from models.log_model import save_log, get_all_logs

log_bp = Blueprint("logs", __name__)

@log_bp.route("/api/log", methods=["POST"])
def log_activity():
    """POST /api/log - Log a cheating/suspicious activity."""
    try:
        data = request.get_json()
        if not data or "action" not in data:
            return jsonify({"success": False, "error": "Missing 'action' field"}), 400

        inserted_id = save_log(data)
        return jsonify({
            "success": True,
            "id": inserted_id,
            "message": "Activity logged"
        }), 201
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@log_bp.route("/api/get-logs", methods=["GET"])
def get_logs():
    """GET /api/get-logs - Retrieve all activity logs."""
    try:
        logs = get_all_logs()
        return jsonify({"success": True, "logs": logs}), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500
