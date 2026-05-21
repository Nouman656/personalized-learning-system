"""
Recommendation engine — weak topics and personalized content suggestions.
"""

import json
from typing import List, Optional, Tuple

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models import LearningContent, Quiz, QuizResult, Recommendation, Topic
from app.services.ml_service import get_ml_predicted_weak_topics

WEAK_TOPIC_THRESHOLD = 60.0


def is_weak_score(score: float) -> bool:
    return score < WEAK_TOPIC_THRESHOLD


def get_weak_topics_for_student(db: Session, student_id: int) -> List[dict]:
    """
    Weak topics from latest quiz attempt topic breakdowns.
    Falls back to historical per-topic averages if JSON not stored.
    """
    results = (
        db.query(QuizResult)
        .filter(QuizResult.student_id == student_id)
        .order_by(QuizResult.completed_at.desc())
        .all()
    )

    topic_latest: dict[int, dict] = {}
    for result in results:
        for row in result.get_topic_scores():
            tid = row["topic_id"]
            if tid not in topic_latest:
                topic_latest[tid] = {
                    "topic_id": tid,
                    "topic_name": row["topic_name"],
                    "course_id": row.get("course_id", 0),
                    "average_score": row["score"],
                    "attempt_count": 1,
                }

    weak = [t for t in topic_latest.values() if is_weak_score(t["average_score"])]

    if weak:
        return weak

    # Legacy fallback: average quiz scores via quiz.topic_id
    rows = (
        db.query(
            Topic.id.label("topic_id"),
            Topic.name.label("topic_name"),
            Topic.course_id.label("course_id"),
            func.avg(QuizResult.score).label("average_score"),
            func.count(QuizResult.id).label("attempt_count"),
        )
        .join(Quiz, Quiz.id == QuizResult.quiz_id)
        .join(Topic, Topic.id == Quiz.topic_id)
        .filter(QuizResult.student_id == student_id, Quiz.topic_id.isnot(None))
        .group_by(Topic.id, Topic.name, Topic.course_id)
        .having(func.avg(QuizResult.score) < WEAK_TOPIC_THRESHOLD)
        .all()
    )
    return [
        {
            "topic_id": row.topic_id,
            "topic_name": row.topic_name,
            "course_id": row.course_id,
            "average_score": round(float(row.average_score), 2),
            "attempt_count": int(row.attempt_count),
        }
        for row in rows
    ]


def create_recommendations_for_topic(
    db: Session,
    student_id: int,
    topic: Topic,
    reason_prefix: str = "You scored below 60% on",
) -> List[Recommendation]:
    contents = db.query(LearningContent).filter(LearningContent.topic_id == topic.id).all()
    created: List[Recommendation] = []

    if not contents:
        existing = (
            db.query(Recommendation)
            .filter(
                Recommendation.student_id == student_id,
                Recommendation.topic_id == topic.id,
                Recommendation.learning_content_id.is_(None),
            )
            .first()
        )
        if not existing:
            rec = Recommendation(
                student_id=student_id,
                topic_id=topic.id,
                learning_content_id=None,
                reason=f"{reason_prefix} '{topic.name}'. Review the course materials for this topic.",
            )
            db.add(rec)
            created.append(rec)
        return created

    for content in contents:
        existing = (
            db.query(Recommendation)
            .filter(
                Recommendation.student_id == student_id,
                Recommendation.topic_id == topic.id,
                Recommendation.learning_content_id == content.id,
            )
            .first()
        )
        if existing:
            continue
        rec = Recommendation(
            student_id=student_id,
            topic_id=topic.id,
            learning_content_id=content.id,
            reason=(
                f"{reason_prefix} '{topic.name}'. "
                f"Suggested {content.content_type}: '{content.title}'."
            ),
        )
        db.add(rec)
        created.append(rec)
    return created


def process_quiz_submission(
    db: Session,
    student_id: int,
    quiz_id: int,
    score: float,
    correct_count: int,
    total_questions: int,
    topic_scores: List[dict],
    answer_details: List[dict],
) -> Tuple[QuizResult, List[str], int, List[dict]]:
    """Persist result and create recommendations for each weak topic."""
    quiz_result = QuizResult(
        student_id=student_id,
        quiz_id=quiz_id,
        score=score,
        correct_count=correct_count,
        total_questions=total_questions,
        topic_scores_json=json.dumps(topic_scores),
        answer_details_json=json.dumps(answer_details),
    )
    db.add(quiz_result)
    db.flush()

    weak_names: List[str] = []
    weak_details: List[dict] = []
    rec_count = 0

    handled_topic_ids: set[int] = set()

    for ts in topic_scores:
        if not ts.get("is_weak"):
            continue
        topic = db.query(Topic).filter(Topic.id == ts["topic_id"]).first()
        if not topic:
            continue
        handled_topic_ids.add(topic.id)
        weak_names.append(topic.name)
        weak_details.append(ts)
        new_recs = create_recommendations_for_topic(
            db,
            student_id,
            topic,
            reason_prefix="You scored below 60% on",
        )
        rec_count += len(new_recs)

    rec_count += _create_ml_recommendations(
        db, student_id, handled_topic_ids, weak_names, weak_details
    )

    return quiz_result, weak_names, rec_count, weak_details


def _create_ml_recommendations(
    db: Session,
    student_id: int,
    already_handled: set[int],
    weak_names: List[str],
    weak_details: List[dict],
) -> int:
    """
    Add recommendations for ML-predicted weak topics not already covered by the 60% rule.
    Keeps rule-based recommendations unchanged; ML augments borderline / early-risk topics.
    """
    try:
        ml_weak = get_ml_predicted_weak_topics(db, student_id)
    except Exception:
        return 0

    added = 0
    for pred in ml_weak:
        tid = pred["topic_id"]
        if tid in already_handled:
            continue
        topic = db.query(Topic).filter(Topic.id == tid).first()
        if not topic:
            continue
        already_handled.add(tid)
        prob = pred.get("probability_weak", 0)
        weak_names.append(topic.name)
        weak_details.append(
            {
                "topic_id": tid,
                "topic_name": topic.name,
                "score": pred.get("topic_score", 0),
                "is_weak": True,
                "ml_predicted": True,
            }
        )
        new_recs = create_recommendations_for_topic(
            db,
            student_id,
            topic,
            reason_prefix=(
                f"ML model predicts you may need help on (confidence {prob:.0%})"
            ),
        )
        added += len(new_recs)
    return added


def generate_recommendations_for_student(db: Session, student_id: int) -> Tuple[List[dict], List[Recommendation]]:
    weak_topics = get_weak_topics_for_student(db, student_id)
    all_created: List[Recommendation] = []
    handled_ids: set[int] = set()

    for wt in weak_topics:
        topic = db.query(Topic).filter(Topic.id == wt["topic_id"]).first()
        if topic:
            handled_ids.add(topic.id)
            all_created.extend(
                create_recommendations_for_topic(
                    db, student_id, topic, reason_prefix="Your performance is below 60% on"
                )
            )

    try:
        for pred in get_ml_predicted_weak_topics(db, student_id):
            tid = pred["topic_id"]
            if tid in handled_ids:
                continue
            topic = db.query(Topic).filter(Topic.id == tid).first()
            if topic:
                handled_ids.add(tid)
                prob = pred.get("probability_weak", 0)
                all_created.extend(
                    create_recommendations_for_topic(
                        db,
                        student_id,
                        topic,
                        reason_prefix=(
                            f"ML model suggests extra practice (confidence {prob:.0%}) on"
                        ),
                    )
                )
    except Exception:
        pass

    return weak_topics, all_created
