"""
Personalized recommendation API routes.

Exposes weak-topic analysis and generated study suggestions.
"""

from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models import Recommendation, Student
from app.schemas import (
    GenerateRecommendationsRequest,
    GenerateRecommendationsResponse,
    RecommendationResponse,
    WeakTopicResponse,
)
from app.services.recommendation_engine import (
    generate_recommendations_for_student,
    get_weak_topics_for_student,
)

router = APIRouter(prefix="/recommendations", tags=["Recommendations"])


def _to_recommendation_response(rec: Recommendation) -> RecommendationResponse:
    """Enrich recommendation with topic and content titles for the API."""
    topic_name = rec.topic.name if rec.topic else None
    content_title = rec.learning_content.title if rec.learning_content else None
    return RecommendationResponse(
        id=rec.id,
        student_id=rec.student_id,
        topic_id=rec.topic_id,
        learning_content_id=rec.learning_content_id,
        reason=rec.reason,
        is_read=rec.is_read,
        created_at=rec.created_at,
        topic_name=topic_name,
        content_title=content_title,
    )


@router.get("/student/{student_id}", response_model=List[RecommendationResponse])
def list_student_recommendations(
    student_id: int,
    unread_only: bool = False,
    db: Session = Depends(get_db),
):
    """Get all recommendations for a student."""
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")

    query = (
        db.query(Recommendation)
        .options(
            joinedload(Recommendation.topic),
            joinedload(Recommendation.learning_content),
        )
        .filter(Recommendation.student_id == student_id)
        .order_by(Recommendation.created_at.desc())
    )
    if unread_only:
        query = query.filter(Recommendation.is_read.is_(False))

    return [_to_recommendation_response(r) for r in query.all()]


@router.get("/student/{student_id}/weak-topics", response_model=List[WeakTopicResponse])
def get_weak_topics(student_id: int, db: Session = Depends(get_db)):
    """
    Return topics where the student's average quiz score is below 60%.
    This powers the personalized learning dashboard.
    """
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")

    weak = get_weak_topics_for_student(db, student_id)
    return [WeakTopicResponse(**wt) for wt in weak]


@router.post("/generate", response_model=GenerateRecommendationsResponse)
def generate_recommendations(payload: GenerateRecommendationsRequest, db: Session = Depends(get_db)):
    """
    Analyze all quiz history for a student and create recommendations for every weak topic.
    """
    student = db.query(Student).filter(Student.id == payload.student_id).first()
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")

    weak_topics, created = generate_recommendations_for_student(db, payload.student_id)
    db.commit()

    # Reload recommendations with relationships for response
    rec_ids = [r.id for r in created]
    recommendations = []
    if rec_ids:
        recommendations = (
            db.query(Recommendation)
            .options(
                joinedload(Recommendation.topic),
                joinedload(Recommendation.learning_content),
            )
            .filter(Recommendation.id.in_(rec_ids))
            .all()
        )

    return GenerateRecommendationsResponse(
        student_id=payload.student_id,
        weak_topics=[WeakTopicResponse(**wt) for wt in weak_topics],
        recommendations_created=len(created),
        recommendations=[_to_recommendation_response(r) for r in recommendations],
    )


@router.patch("/{recommendation_id}/read", response_model=RecommendationResponse)
def mark_recommendation_read(recommendation_id: int, db: Session = Depends(get_db)):
    """Mark a recommendation as read by the student."""
    rec = (
        db.query(Recommendation)
        .options(
            joinedload(Recommendation.topic),
            joinedload(Recommendation.learning_content),
        )
        .filter(Recommendation.id == recommendation_id)
        .first()
    )
    if not rec:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Recommendation not found")

    rec.is_read = True
    db.commit()
    db.refresh(rec)
    return _to_recommendation_response(rec)
