"""
Quiz grading with per-topic score breakdown.
"""

import json
from collections import defaultdict
from typing import Dict, List, Tuple

from sqlalchemy.orm import Session, joinedload

from app.models import Question, Quiz, Topic
from app.services.recommendation_engine import WEAK_TOPIC_THRESHOLD, is_weak_score

OPTIONS_SEP = "|"


def parse_options(raw: str) -> List[str]:
    return [o.strip() for o in raw.split(OPTIONS_SEP) if o.strip()]


def grade_quiz_submission(
    db: Session,
    quiz: Quiz,
    answers: List[dict],
) -> Tuple[float, int, int, List[dict], List[dict]]:
    """
    Grade answers and return overall score, counts, topic_scores, answer_details.
    answers: [{question_id, selected_answer}]
    """
    questions_by_id: Dict[int, Question] = {q.id: q for q in quiz.questions}
    topics_cache: Dict[int, Topic] = {}

    topic_totals: Dict[int, dict] = defaultdict(lambda: {"correct": 0, "total": 0, "topic_name": ""})
    answer_details = []
    correct_overall = 0
    total = len(quiz.questions)

    submitted = {a["question_id"]: a["selected_answer"] for a in answers}

    for question in quiz.questions:
        selected = (submitted.get(question.id) or "").strip()
        is_correct = selected == question.correct_answer.strip()
        if is_correct:
            correct_overall += 1

        if question.topic_id not in topics_cache:
            topic = db.query(Topic).filter(Topic.id == question.topic_id).first()
            topics_cache[question.topic_id] = topic

        topic = topics_cache.get(question.topic_id)
        topic_name = topic.name if topic else f"Topic {question.topic_id}"
        bucket = topic_totals[question.topic_id]
        bucket["topic_id"] = question.topic_id
        bucket["topic_name"] = topic_name
        bucket["course_id"] = topic.course_id if topic else 0
        bucket["total"] += 1
        if is_correct:
            bucket["correct"] += 1

        answer_details.append(
            {
                "question_id": question.id,
                "topic_id": question.topic_id,
                "topic_name": topic_name,
                "question_text": question.question_text,
                "selected_answer": selected,
                "correct_answer": question.correct_answer,
                "is_correct": is_correct,
                "options": parse_options(question.options),
            }
        )

    topic_scores = []
    for tid, bucket in topic_totals.items():
        t_total = bucket["total"]
        t_correct = bucket["correct"]
        t_score = round((t_correct / t_total) * 100, 2) if t_total else 0
        topic_scores.append(
            {
                "topic_id": tid,
                "topic_name": bucket["topic_name"],
                "course_id": bucket.get("course_id", 0),
                "correct": t_correct,
                "total": t_total,
                "score": t_score,
                "is_weak": is_weak_score(t_score),
            }
        )

    topic_scores.sort(key=lambda x: x["topic_id"])
    overall = round((correct_overall / total) * 100, 2) if total else 0

    return overall, correct_overall, total, topic_scores, answer_details


def load_quiz_for_grading(db: Session, quiz_id: int) -> Quiz:
    return (
        db.query(Quiz)
        .options(joinedload(Quiz.questions))
        .filter(Quiz.id == quiz_id)
        .first()
    )


def serialize_question_for_take(q: Question, include_topic_name: str) -> dict:
    return {
        "id": q.id,
        "quiz_id": q.quiz_id,
        "topic_id": q.topic_id,
        "topic_name": include_topic_name,
        "question_text": q.question_text,
        "options": parse_options(q.options),
    }


def get_default_quiz(db: Session) -> Quiz | None:
    return (
        db.query(Quiz)
        .options(joinedload(Quiz.questions))
        .filter(Quiz.is_default.is_(True))
        .first()
    )
