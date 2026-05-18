# models/question_model.py - Question data model helper
from db import questions_collection
from bson import ObjectId

def serialize_question(q):
    """Convert MongoDB document to JSON-serializable dict."""
    return {
        "id": str(q["_id"]),
        "question": q["question"],
        "options": q["options"],
        "correct": q["correct"]
    }

def get_all_questions():
    """Retrieve all questions from DB."""
    questions = questions_collection.find()
    return [serialize_question(q) for q in questions]

def add_question(data):
    """Insert a new question into DB."""
    doc = {
        "question": data["question"],
        "options": data["options"],
        "correct": int(data["correct"])
    }
    result = questions_collection.insert_one(doc)
    return str(result.inserted_id)

def delete_question(question_id):
    """Delete a question by its ID."""
    result = questions_collection.delete_one({"_id": ObjectId(question_id)})
    return result.deleted_count > 0
