# Personalized Learning System

Full-stack learning app with admin and student roles, 15-question MCQ assessment, weak-topic detection, and personalized recommendations.

## Quick start

### 1. Backend

```powershell
cd backend
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
python app/seed_data.py          # creates course, 15 MCQs, learning content
.\venv\Scripts\uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Fresh database** (if you have schema issues):

```powershell
# Stop uvicorn first, then:
python app/seed_data.py --fresh
```

### 2. Frontend

```powershell
cd frontend
npm install
npm run dev
```

Open http://localhost:5173

## Test credentials

| Role | Credentials |
|------|-------------|
| **Admin** | Username: `admin` / Password: `adminpass` |
| **Student** | Create account with any **unique name**, then login with that name |

## Features

- **Admin**: view all students, quiz attempts, weak topics, recommendations per student
- **Student**: take 15 MCQ quiz, see score & answer review, weak topics, recommendations
- **Quiz**: Introduction to Programming — Variables, Data Types, Conditionals, Loops, Functions (3 MCQs each)
- Weak topic if topic score **< 60%**; recommendations generated automatically
