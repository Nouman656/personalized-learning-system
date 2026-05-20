"""
Seed script — Introduction to Programming course, 15 MCQ default quiz.

Usage (from backend/):
    python app/seed_data.py
    python app/seed_data.py --fresh   # drop tables and reseed
"""

from __future__ import annotations

import sys
from pathlib import Path

_BACKEND_ROOT = Path(__file__).resolve().parent.parent
if str(_BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(_BACKEND_ROOT))

from app.database import Base, SessionLocal, engine, init_db  # noqa: E402
from app.models import (  # noqa: E402
    Course,
    LearningContent,
    Question,
    Quiz,
    Topic,
)

SEED_MARKER = "[APP]"

COURSE_TITLE = f"{SEED_MARKER} Introduction to Programming"
COURSE_DESC = "Foundational programming concepts for beginners."

TOPICS = [
    "Variables",
    "Data Types",
    "Conditional Statements",
    "Loops",
    "Functions",
]

# (topic_name, question_text, options, correct_answer)
MCQ_BANK = {
    "Variables": [
        (
            "What is a variable in programming?",
            ["A constant value", "A named storage location", "A type of loop", "A function parameter only"],
            "A named storage location",
        ),
        (
            "Which is a valid variable name in most languages?",
            ["2score", "my-var", "total_count", "class"],
            "total_count",
        ),
        (
            "What does assignment `x = 10` do?",
            ["Compares x to 10", "Stores 10 in x", "Declares type of x", "Prints x"],
            "Stores 10 in x",
        ),
    ],
    "Data Types": [
        (
            "Which value is an integer?",
            ["3.14", "42", "'hello'", "True"],
            "42",
        ),
        (
            "What type is the value \"hello\"?",
            ["Integer", "Float", "String", "Boolean"],
            "String",
        ),
        (
            "Which is a boolean value?",
            ["0", "1", "False", "\"no\""],
            "False",
        ),
    ],
    "Conditional Statements": [
        (
            "Which keyword starts a conditional in Python?",
            ["loop", "if", "def", "import"],
            "if",
        ),
        (
            "What does `else` do?",
            ["Repeats code", "Runs when the if condition is false", "Defines a function", "Imports a module"],
            "Runs when the if condition is false",
        ),
        (
            "When is `elif` used?",
            ["After else only", "As an additional condition branch", "To exit a loop", "To declare variables"],
            "As an additional condition branch",
        ),
    ],
    "Loops": [
        (
            "Which loop is best when you know the number of iterations?",
            ["while", "for", "if", "try"],
            "for",
        ),
        (
            "What does a `while` loop do?",
            ["Runs once", "Runs while a condition is true", "Defines a list", "Handles errors"],
            "Runs while a condition is true",
        ),
        (
            "What is an infinite loop?",
            ["A loop that never terminates", "A loop with no body", "A loop inside a function", "A syntax error"],
            "A loop that never terminates",
        ),
    ],
    "Functions": [
        (
            "What is a function?",
            ["A data type", "A reusable block of code", "A variable name", "A comment"],
            "A reusable block of code",
        ),
        (
            "What are function parameters?",
            ["Return values", "Inputs the function accepts", "Global variables only", "Loop counters"],
            "Inputs the function accepts",
        ),
        (
            "What does `return` do?",
            ["Deletes a variable", "Sends a value back to the caller", "Starts a loop", "Imports a library"],
            "Sends a value back to the caller",
        ),
    ],
}

LEARNING_CONTENT = {
    "Variables": [
        ("article", "Variables Notes & Examples", "Review variable declaration, naming rules, and assignment."),
        ("practice", "Variables Practice Set", "Solve exercises on declaring and updating variables."),
    ],
    "Data Types": [
        ("article", "Data Types Revision Guide", "Study int, float, string, and boolean with examples."),
        ("video", "Data Types Explained", "Watch examples of type conversion and common mistakes."),
    ],
    "Conditional Statements": [
        ("practice", "If/Else Practice Problems", "Practice branching logic with real scenarios."),
        ("article", "Conditional Statements Cheat Sheet", "Review if, elif, else and comparison operators."),
    ],
    "Loops": [
        ("practice", "Loop Dry-Run Exercises", "Trace for/while loops on paper before coding."),
        ("video", "Mastering Loops", "Learn when to use for vs while loops."),
    ],
    "Functions": [
        ("practice", "Function Practice Problems", "Write functions with parameters and return values."),
        ("article", "Functions Study Guide", "Review defining, calling, and reusing functions."),
    ],
}


def seed(db):
    course = db.query(Course).filter(Course.title == COURSE_TITLE).first()
    if not course:
        course = Course(title=COURSE_TITLE, description=COURSE_DESC)
        db.add(course)
        db.flush()

    topics_by_name = {}
    for name in TOPICS:
        topic = (
            db.query(Topic)
            .filter(Topic.course_id == course.id, Topic.name == name)
            .first()
        )
        if not topic:
            topic = Topic(course_id=course.id, name=name, description=f"Topic: {name}")
            db.add(topic)
            db.flush()
        topics_by_name[name] = topic

        for ctype, title, desc in LEARNING_CONTENT.get(name, []):
            exists = (
                db.query(LearningContent)
                .filter(LearningContent.topic_id == topic.id, LearningContent.title == title)
                .first()
            )
            if not exists:
                db.add(
                    LearningContent(
                        topic_id=topic.id,
                        title=title,
                        content_type=ctype,
                        description=desc,
                    )
                )

    quiz_title = f"{SEED_MARKER} Programming Fundamentals — 15 MCQ Assessment"
    quiz = db.query(Quiz).filter(Quiz.title == quiz_title).first()
    if not quiz:
        first_topic = topics_by_name["Variables"]
        quiz = Quiz(
            title=quiz_title,
            description="15 mixed MCQs across all course topics.",
            topic_id=first_topic.id,
            is_default=True,
        )
        db.add(quiz)
        db.flush()
    else:
        quiz.is_default = True

    # Clear non-matching questions if re-seeding quiz structure
    existing_q = db.query(Question).filter(Question.quiz_id == quiz.id).count()
    if existing_q != 15:
        db.query(Question).filter(Question.quiz_id == quiz.id).delete()
        db.flush()

    for topic_name, questions in MCQ_BANK.items():
        topic = topics_by_name[topic_name]
        for qtext, options, correct in questions:
            exists = (
                db.query(Question)
                .filter(
                    Question.quiz_id == quiz.id,
                    Question.question_text == qtext,
                )
                .first()
            )
            if not exists:
                db.add(
                    Question(
                        quiz_id=quiz.id,
                        topic_id=topic.id,
                        question_text=qtext,
                        options="|".join(options),
                        correct_answer=correct,
                    )
                )

    # Ensure only one default quiz
    db.query(Quiz).filter(Quiz.id != quiz.id).update({"is_default": False})
    db.commit()
    return quiz, topics_by_name


def main():
    fresh = "--fresh" in sys.argv
    if fresh:
        Base.metadata.drop_all(bind=engine)
        print("Dropped existing PostgreSQL tables for fresh seed.")

    init_db()
    db = SessionLocal()
    try:
        quiz, topics = seed(db)
        q_count = db.query(Question).filter(Question.quiz_id == quiz.id).count()
        print("\n" + "=" * 50)
        print("  Seed complete")
        print("=" * 50)
        print(f"  Course:     {COURSE_TITLE}")
        print(f"  Topics:     {len(topics)}")
        print(f"  Quiz ID:    {quiz.id} (default)")
        print(f"  Questions:  {q_count}")
        print("=" * 50 + "\n")
    finally:
        db.close()


if __name__ == "__main__":
    main()
