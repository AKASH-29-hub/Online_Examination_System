# models/log_model.py - Anti-cheating log model helper
from db import logs_collection
from datetime import datetime

def serialize_log(l):
    """Convert MongoDB document to JSON-serializable dict."""
    return {
        "id": str(l["_id"]),
        "name": l.get("name", "Anonymous"),
        "action": l["action"],
        "time": l.get("time", ""),
        "timestamp": l["timestamp"].strftime("%Y-%m-%d %H:%M:%S") if isinstance(l.get("timestamp"), datetime) else str(l.get("timestamp", ""))
    }

def save_log(data):
    """Save a cheating/activity log to DB."""
    doc = {
        "name": data.get("name", "Anonymous"),
        "action": data["action"],
        "time": data.get("time", datetime.utcnow().strftime("%H:%M:%S")),
        "timestamp": datetime.utcnow()
    }
    result = logs_collection.insert_one(doc)
    return str(result.inserted_id)

def get_all_logs():
    """Retrieve all logs sorted by newest first."""
    logs = logs_collection.find().sort("timestamp", -1)
    return [serialize_log(l) for l in logs]
