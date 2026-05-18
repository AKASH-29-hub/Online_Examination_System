# db.py - MongoDB connection module
from pymongo import MongoClient
import os

# MongoDB connection URI - change this to your MongoDB URI if needed
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/")
DB_NAME = os.getenv("DB_NAME", "online_exam_db")

# Create a single client instance (connection pooling)
client = MongoClient(MONGO_URI)
db = client[DB_NAME]

# Collections
questions_collection = db["questions"]
results_collection = db["results"]
logs_collection = db["logs"]
admins_collection = db["admins"]

def init_db():
    """Initialize DB with default admin and sample questions if empty."""
    # Seed default admin
    if admins_collection.count_documents({}) == 0:
        admins_collection.insert_one({
            "username": "admin",
            "password": "admin123"  # In production, hash this!
        })
        print("[DB] Default admin created: admin / admin123")

    # Seed sample questions
    if questions_collection.count_documents({}) == 0:
        sample_questions = [
            {
                "question": "What does HTML stand for?",
                "options": ["Hyper Text Markup Language", "High Tech Modern Language", "Hyper Transfer Markup Language", "Home Tool Markup Language"],
                "correct": 0
            },
            {
                "question": "Which language is used for styling web pages?",
                "options": ["HTML", "Python", "CSS", "JavaScript"],
                "correct": 2
            },
            {
                "question": "What is the correct syntax to print in Python?",
                "options": ["echo('Hello')", "print('Hello')", "console.log('Hello')", "printf('Hello')"],
                "correct": 1
            },
            {
                "question": "Which data structure uses LIFO?",
                "options": ["Queue", "Linked List", "Stack", "Array"],
                "correct": 2
            },
            {
                "question": "What does CPU stand for?",
                "options": ["Central Process Unit", "Computer Personal Unit", "Central Processing Unit", "Core Processing Unit"],
                "correct": 2
            },
            {
                "question": "Which of the following is NOT a programming language?",
                "options": ["Python", "Java", "HTML", "C++"],
                "correct": 2
            },
            {
                "question": "What symbol is used for single-line comments in JavaScript?",
                "options": ["#", "//", "/* */", "--"],
                "correct": 1
            },
            {
                "question": "What does SQL stand for?",
                "options": ["Structured Query Language", "Simple Query Logic", "Sequential Query Language", "Standard Question Language"],
                "correct": 0
            },
            {
                "question": "Which HTTP method is used to send data to a server?",
                "options": ["GET", "DELETE", "PUT", "POST"],
                "correct": 3
            },
            {
                "question": "What is the time complexity of binary search?",
                "options": ["O(n)", "O(n²)", "O(log n)", "O(1)"],
                "correct": 2
            }
        ]
        questions_collection.insert_many(sample_questions)
        print(f"[DB] Seeded {len(sample_questions)} sample questions.")
