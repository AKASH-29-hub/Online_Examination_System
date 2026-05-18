# routes/question_routes.py - Question API endpoints
from flask import Blueprint, request, jsonify
from models.question_model import get_all_questions, add_question, delete_question

question_bp = Blueprint("questions", __name__)

@question_bp.route("/api/get-questions", methods=["GET"])
def get_questions():
    """GET /api/get-questions - Returns all questions (options only, no correct answer for students)."""
    try:
        admin = request.args.get("admin", "false").lower() == "true"
        questions = get_all_questions()
        # if not admin:
        #     # Strip correct answer for student-facing requests
        #     for q in questions:
        #         del q["correct"]
        return jsonify({"success": True, "questions": questions}), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@question_bp.route("/api/add-question", methods=["POST"])
def add_question_route():
    """POST /api/add-question - Add a new question."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"success": False, "error": "No data provided"}), 400

        required = ["question", "options", "correct"]
        for field in required:
            if field not in data:
                return jsonify({"success": False, "error": f"Missing field: {field}"}), 400

        if len(data["options"]) != 4:
            return jsonify({"success": False, "error": "Exactly 4 options required"}), 400

        if not (0 <= int(data["correct"]) <= 3):
            return jsonify({"success": False, "error": "Correct index must be 0-3"}), 400

        data["correct"] = int(data["correct"])  # Ensure correct is an integer
        inserted_id = add_question(data)
        return jsonify({"success": True, "id": inserted_id, "message": "Question added successfully"}), 201
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@question_bp.route("/api/delete-question/<question_id>", methods=["DELETE"])
def delete_question_route(question_id):
    """DELETE /api/delete-question/<id> - Remove a question."""
    try:
        deleted = delete_question(question_id)
        if deleted:
            return jsonify({"success": True, "message": "Question deleted"}), 200
        return jsonify({"success": False, "error": "Question not found"}), 404
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500
