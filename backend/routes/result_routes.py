# routes/result_routes.py - Result API endpoints
from flask import Blueprint, request, jsonify
from models.result_model import save_result, get_all_results, get_stats

result_bp = Blueprint("results", __name__)

@result_bp.route("/api/submit-result", methods=["POST"])
def submit_result():
    """POST /api/submit-result - Submit exam result."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"success": False, "error": "No data provided"}), 400

        required = ["score", "total"]
        for field in required:
            if field not in data:
                return jsonify({"success": False, "error": f"Missing field: {field}"}), 400

        inserted_id = save_result(data)
        return jsonify({
            "success": True,
            "id": inserted_id,
            "message": "Result saved successfully"
        }), 201
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@result_bp.route("/api/get-results", methods=["GET"])
def get_results():
    """GET /api/get-results - Retrieve all exam results."""
    try:
        results = get_all_results()
        stats = get_stats()
        return jsonify({
            "success": True,
            "results": results,
            "stats": stats
        }), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500
