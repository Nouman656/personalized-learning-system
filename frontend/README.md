# Personalized Learning System — Frontend

Professional **AI analytics dashboard** built with Vite, React, Framer Motion, and Recharts.

## Features

- Dark AI-themed responsive layout with sticky navbar
- **Recharts** analytics: quiz performance, weak topics, recommendations, student progress
- **AI insight cards**: weakest topic, average performance, students needing attention
- **Framer Motion** page transitions and card animations
- Loading **skeletons** and enhanced error states with retry
- **Student dropdown** — no hardcoded IDs; data loads per selected student
- Priority-colored recommendation cards with weak-topic highlighting

## Prerequisites

- Node.js 18+
- FastAPI backend at `http://localhost:8000`
- Seed data recommended: `cd ../backend && python app/seed_data.py`

## Setup

```bash
cd frontend
npm install
cp .env.example .env   # optional
npm run dev
```

Open **http://localhost:5173**

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |

## Environment

| Variable | Default |
|----------|---------|
| `VITE_API_URL` | `http://localhost:8000` |

## Pages

| Route | Description |
|-------|-------------|
| `/` | Analytics dashboard with charts & AI insights |
| `/students` | Student list (click Select to set active student) |
| `/courses` | Courses and topics |
| `/quiz-results` | Quiz scores for selected student |
| `/weak-topics` | Weak topics + distribution chart |
| `/recommendations` | Priority recommendation cards |

## Tech stack

- React 19 + Vite
- React Router
- Framer Motion
- Recharts
- Native Fetch API
