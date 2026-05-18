"""
Personalized Learning System — FastAPI application entry point.

AI Final Semester Project backend providing:
  - Student, course, and quiz management
  - Weak-topic detection (score < 60%)
  - Rule-based recommendation engine
  - Interactive Swagger / OpenAPI documentation
"""

import os
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import init_db
from app.routes import admin, auth, courses, quizzes, recommendations, students
from app.schemas import HealthResponse

load_dotenv()

APP_NAME = os.getenv("APP_NAME", "Personalized Learning System")
APP_VERSION = os.getenv("APP_VERSION", "1.0.0")

# Parse comma-separated CORS origins from environment
_cors_raw = os.getenv(
    "CORS_ORIGINS",
    "http://localhost:3000,http://127.0.0.1:3000,http://localhost:5173",
)
CORS_ORIGINS = [origin.strip() for origin in _cors_raw.split(",") if origin.strip()]


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Create database tables on startup."""
    init_db()
    yield


app = FastAPI(
    title=APP_NAME,
    description=(
        "Backend API for an AI-powered personalized learning platform. "
        "Tracks students, courses, quizzes, detects weak topics, and generates study recommendations."
    ),
    version=APP_VERSION,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)

# Allow frontend apps (React, Vue, etc.) to call this API during development
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API routers
app.include_router(auth.router, prefix="/api")
app.include_router(admin.router, prefix="/api")
app.include_router(students.router, prefix="/api")
app.include_router(courses.router, prefix="/api")
app.include_router(quizzes.router, prefix="/api")
app.include_router(recommendations.router, prefix="/api")


@app.get("/health", response_model=HealthResponse, tags=["Health"])
def health_check():
    """
    Health check endpoint for monitoring and deployment probes.
    Returns service name, version, and status.
    """
    return HealthResponse(status="healthy", app_name=APP_NAME, version=APP_VERSION)


@app.get("/", tags=["Root"])
def root():
    """Root route with links to API documentation."""
    return {
        "message": f"Welcome to {APP_NAME}",
        "docs": "/docs",
        "health": "/health",
    }
