# models/result_model.py - Result data model helper
from db import results_collection
from datetime import datetime

def serialize_result(r):
    """Convert MongoDB document to JSON-serializable dict."""
    return {
        "id": str(r["_id"]),
        "name": r.get("name", "Anonymous"),
        "score": r["score"],
        "total": r["total"],
        "warnings": r["warnings"],
        "percentage": round((r["score"] / r["total"]) * 100, 2) if r["total"] > 0 else 0,
        "timestamp": r["timestamp"].strftime("%Y-%m-%d %H:%M:%S") if isinstance(r["timestamp"], datetime) else str(r["timestamp"])
    }

def save_result(data):
    """Save exam result to DB."""
    doc = {
        "name": data.get("name", "Anonymous"),
        "score": int(data["score"]),
        "total": int(data["total"]),
        "warnings": int(data.get("warnings", 0)),
        "timestamp": datetime.utcnow()
    }
    result = results_collection.insert_one(doc)
    return str(result.inserted_id)

def get_all_results():
    """Retrieve all results sorted by newest first."""
    results = results_collection.find().sort("timestamp", -1)
    return [serialize_result(r) for r in results]

def get_stats():
    """Get aggregate stats for dashboard."""
    pipeline = [
        {
            "$group": {
                "_id": None,
                "totalExams": {"$sum": 1},
                "avgScore": {"$avg": {"$divide": ["$score", "$total"]}},
                "totalWarnings": {"$sum": "$warnings"}
            }
        }
    ]
    stats = list(results_collection.aggregate(pipeline))
    if stats:
        s = stats[0]
        return {
            "totalExams": s["totalExams"],
            "avgScore": round(s["avgScore"] * 100, 1),
            "totalWarnings": s["totalWarnings"]
        }
    return {"totalExams": 0, "avgScore": 0, "totalWarnings": 0}
