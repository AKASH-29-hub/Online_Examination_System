# Online Examination System with AI-Based Anti-Cheating Detection

## Overview

The Online Examination System is a web-based platform developed to conduct online examinations securely and efficiently. The system provides separate modules for students and administrators, enabling smooth exam management, automated evaluation, result generation, and suspicious activity monitoring.

The project integrates AI-based anti-cheating detection techniques using webcam monitoring to improve exam integrity during online assessments.

---

# Features

## Student Module
- Student login and authentication
- Instruction page before exam starts
- Webcam access for monitoring
- Attend online MCQ examinations
- Automatic timer management
- Instant result generation
- Submission tracking

## Admin Module
- Add new questions
- Manage question bank
- Monitor examination activities
- View student results
- Access suspicious activity logs

## AI-Based Anti-Cheating Detection
- Webcam-based monitoring
- Face detection support
- Suspicious movement tracking
- Violation logging system
- Activity monitoring during examination

---

# Technologies Used

## Frontend
- HTML5
- CSS3
- JavaScript

## Backend
- Python Flask

## Database
- MongoDB

## Additional Libraries
- Flask-CORS
- PyMongo
- Python-Dotenv

---

# Project Structure

```bash
online-exam-system/
│
├── backend/
│   ├── app.py
│   ├── db.py
│   ├── requirements.txt
│   ├── models/
│   └── routes/
│
├── frontend/
│   ├── admin/
│   ├── css/
│   ├── js/
│   ├── images/
│   └── index.html
│
└── README.md
```

---

# System Workflow

1. Student logs into the system.
2. Instruction page is displayed.
3. Camera permission is requested.
4. Student starts the examination.
5. System monitors suspicious activities through webcam.
6. Answers are submitted.
7. Result is generated automatically.
8. Admin can monitor logs and results.

---

# Installation Guide

## Prerequisites

Make sure the following software is installed:

- Python 3.x
- MongoDB
- Git

---

## Clone the Repository

```bash
git clone <repository-url>
cd online-exam-system
```

---

# Backend Setup

## Step 1: Navigate to Backend Folder

```bash
cd backend
```

## Step 2: Create Virtual Environment

### Windows

```bash
python -m venv venv
venv\Scripts\activate
```

### Linux/Mac

```bash
python3 -m venv venv
source venv/bin/activate
```

---

## Step 3: Install Dependencies

```bash
pip install -r requirements.txt
```

---

## Step 4: Configure Environment Variables

Create a `.env` file inside the backend folder.

Example:

```env
MONGO_URI=mongodb://localhost:27017/online_exam_system
SECRET_KEY=exam_secret_key
```

---

## Step 5: Start the Backend Server

```bash
python app.py
```

Server will run on:

```bash
http://127.0.0.1:5000
```

---

# Frontend Setup

The frontend files are served directly from the Flask backend.

Open the browser and visit:

```bash
http://127.0.0.1:5000
```

---

# API Endpoints

## Health Check

```http
GET /api/health
```

## Question Routes

```http
/api/questions
```

## Result Routes

```http
/api/results
```

## Log Routes

```http
/api/logs
```

## Admin Routes

```http
/api/admin
```

## Face Detection Routes

```http
/api/face
```

---

# Database Collections

The project uses MongoDB collections such as:

- questions
- results
- logs
- students
- admins

---

# Screenshots to Include

You can add screenshots for:

- Login Page
- Instruction Page
- Exam Interface
- Admin Dashboard
- Question Management
- Result Page
- Violation Detection
- Monitoring System

---

# Future Enhancements

- Advanced AI proctoring
- Audio-based cheating detection
- OTP/email verification
- Subject-wise analytics
- Performance dashboard
- Cloud deployment
- Multi-user scalability

---

# Learning Outcomes

This project helped in understanding:

- Full-stack web development
- REST API integration
- MongoDB database handling
- AI-based monitoring concepts
- Frontend and backend integration
- Online examination workflow

---

# Conclusion

The Online Examination System provides a secure and efficient platform for conducting online examinations. By integrating AI-based anti-cheating detection and automated result processing, the system improves transparency, reliability, and usability in digital assessments.

---

# Author

**Akash Swain**  
MCA Student – IMIT, Cuttack

---

# License

This project is developed for academic and educational purposes.
