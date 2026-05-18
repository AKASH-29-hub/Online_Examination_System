from flask import Blueprint, request, jsonify
from datetime import datetime
from pymongo import MongoClient

face_bp = Blueprint("face", __name__)

client = MongoClient("mongodb://localhost:27017/")
db = client["exam_system"]
logs = db["face_logs"]

@face_bp.route("/api/face-event", methods=["POST"])
def face_event():
    data = request.json

    student_id = data.get("studentId")
    event = data.get("event")

    # Save event in MongoDB
    logs.insert_one({
        "studentId": student_id,
        "event": event,
        "time": datetime.utcnow()
    })

    # ✅ Reset violations if face is normal
    if event == "SINGLE_FACE":
        logs.delete_many({
            "studentId": student_id,
            "event": {"$in": ["NO_FACE", "MULTIPLE_FACES"]}
        })
        return jsonify({"success": True, "action": "NONE"})

    # ✅ Count ONLY cheating events
    count = logs.count_documents({
        "studentId": student_id,
        "event": {"$in": ["NO_FACE", "MULTIPLE_FACES"]}
    })

    print(f"[Face] {student_id} → {event} | Violations: {count}")

    # ✅ Allow some tolerance
    if count >= 5:
        return jsonify({
            "success": True,
            "action": "AUTO_SUBMIT"
        })

    return jsonify({"success": True, "action": "NONE"})