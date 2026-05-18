"""
Database configuration and lightweight SQLite migrations.
"""

import os
from pathlib import Path

from dotenv import load_dotenv
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import declarative_base, sessionmaker

_env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(_env_path)

_default_db = f"sqlite:///{Path(__file__).resolve().parent.parent / 'learning_system.db'}"
DATABASE_URL = os.getenv("DATABASE_URL", _default_db)

connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _column_names(table: str) -> set:
    insp = inspect(engine)
    if table not in insp.get_table_names():
        return set()
    return {c["name"] for c in insp.get_columns(table)}


def migrate_db():
    """Add new columns for app upgrade without manual DB deletion."""
    migrations = [
        ("questions", "topic_id", "INTEGER"),
        ("quizzes", "is_default", "BOOLEAN DEFAULT 0"),
        ("quiz_results", "correct_count", "INTEGER DEFAULT 0"),
        ("quiz_results", "total_questions", "INTEGER DEFAULT 0"),
        ("quiz_results", "topic_scores_json", "TEXT"),
        ("quiz_results", "answer_details_json", "TEXT"),
    ]
    with engine.begin() as conn:
        for table, column, col_type in migrations:
            if table not in inspect(engine).get_table_names():
                continue
            if column not in _column_names(table):
                conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {column} {col_type}"))

        # students: allow nullable email; unique name handled at app level for existing DBs
        student_cols = _column_names("students")
        if "students" in inspect(engine).get_table_names():
            conn.execute(
                text(
                    "CREATE UNIQUE INDEX IF NOT EXISTS ix_students_name_unique ON students (name)"
                )
            )


def init_db():
    from app import models  # noqa: F401

    Base.metadata.create_all(bind=engine)
    migrate_db()
