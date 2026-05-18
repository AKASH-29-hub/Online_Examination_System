from flask import Flask, send_from_directory
from flask_cors import CORS
from db import init_db
from routes.question_routes import question_bp
from routes.result_routes import result_bp
from routes.log_routes import log_bp
from routes.admin_routes import admin_bp
from routes.face_routes import face_bp
import os

app = Flask(__name__, static_folder=os.path.join(os.path.dirname(__file__), "../frontend"))
app.secret_key = "exam_secret_key_change_in_production"

CORS(app, origins=["*"], supports_credentials=True)

app.register_blueprint(question_bp)
app.register_blueprint(result_bp)
app.register_blueprint(log_bp)
app.register_blueprint(admin_bp)
app.register_blueprint(face_bp)

# Serve frontend static files
@app.route("/")
def serve_index():
    return send_from_directory(app.static_folder, "index.html")

@app.route("/<path:filename>")
def serve_static(filename):
    return send_from_directory(app.static_folder, filename)

@app.route("/api/health", methods=["GET"])
def health():
    return {"status": "ok", "service": "online-exam-backend"}

if __name__ == "__main__":
    print("=" * 50)
    print("  Online Exam System - Backend Server")
    print("=" * 50)
    init_db()
    print("[Server] Starting on http://127.0.0.1:5000")
    app.run(debug=True, host="127.0.0.1", port=5000)