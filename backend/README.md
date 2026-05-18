# Personalized Learning System — Backend

FastAPI backend for an **AI final semester project** that delivers personalized learning through quiz analytics, weak-topic detection, and content recommendations.

## Features

- **Students** — Register and manage learner profiles
- **Courses & topics** — Organize curriculum hierarchically
- **Quizzes** — Multiple-choice assessments with automatic grading
- **Weak topic detection** — Flags topics when quiz score is **below 60%**
- **Recommendation engine** — Suggests learning content for weak topics
- **Swagger UI** — Interactive API docs at `/docs`
- **Health check** — `GET /health`

## Tech stack

- [FastAPI](https://fastapi.tiangolo.com/)
- [SQLAlchemy](https://www.sqlalchemy.org/) ORM
- SQLite database
- Pydantic validation

## Project structure

```
backend/
├── app/
│   ├── main.py              # App entry, CORS, routers
│   ├── database.py          # SQLAlchemy engine & sessions
│   ├── models.py            # ORM models
│   ├── schemas.py           # Pydantic schemas
│   ├── routes/
│   │   ├── students.py
│   │   ├── courses.py
│   │   ├── quizzes.py
│   │   └── recommendations.py
│   └── services/
│       └── recommendation_engine.py
├── requirements.txt
├── .env.example
└── README.md
```

## Setup

1. **Create a virtual environment** (recommended):

   ```bash
   cd backend
   python -m venv venv
   # Windows
   venv\Scripts\activate
   # macOS/Linux
   source venv/bin/activate
   ```

2. **Install dependencies**:

   ```bash
   pip install -r requirements.txt
   ```

3. **Configure environment**:

   ```bash
   copy .env.example .env
   ```

4. **Run the server** (from the `backend/` directory):

   ```bash
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

5. Open **Swagger UI**: [http://localhost:8000/docs](http://localhost:8000/docs)

## API overview

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| GET/POST | `/api/students` | List / create students |
| GET/POST | `/api/courses` | List / create courses |
| POST | `/api/courses/{id}/topics` | Add topic to course |
| POST | `/api/courses/topics/{id}/content` | Add learning material |
| GET/POST | `/api/quizzes` | List / create quizzes |
| POST | `/api/quizzes/{id}/submit` | Submit answers & get recommendations |
| GET | `/api/recommendations/student/{id}` | List recommendations |
| GET | `/api/recommendations/student/{id}/weak-topics` | Weak topics (avg &lt; 60%) |
| POST | `/api/recommendations/generate` | Regenerate recommendations |

## Example workflow

1. Create a **student** via `POST /api/students`
2. Create a **course** with topics via `POST /api/courses`
3. Add **learning content** to a topic
4. Create a **quiz** with questions under that topic
5. **Submit** the quiz — if score &lt; 60%, weak-topic recommendations are created automatically
6. View recommendations at `GET /api/recommendations/student/{student_id}`

## Weak topic logic

- **Per attempt**: A single quiz score below **60%** marks that quiz’s topic as weak for that submission and triggers recommendations.
- **Aggregate**: `GET .../weak-topics` lists topics where the student’s **average** score across all quizzes for that topic is below **60%**.

## License

Academic project — use for learning and demonstration purposes.
