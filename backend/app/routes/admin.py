"""
Admin API routes — student overview and detailed reports.
"""

from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models import QuizResult, Recommendation, Student
from app.routes.recommendations import _to_recommendation_response
from app.schemas import (
    AdminStudentSummary,
    AnswerDetail,
    QuizResultDetail,
    StudentReportResponse,
    StudentResponse,
    TopicScoreDetail,
)
from app.services.recommendation_engine import get_weak_topics_for_student, is_weak_score

router = APIRouter(prefix="/admin", tags=["Admin"])


def _result_to_detail(result: QuizResult) -> QuizResultDetail:
    topic_scores = [TopicScoreDetail(**t) for t in result.get_topic_scores()]
    answer_details = [AnswerDetail(**a) for a in result.get_answer_details()]
    return QuizResultDetail(
        id=result.id,
        quiz_id=result.quiz_id,
        score=result.score,
        correct_count=result.correct_count or 0,
        total_questions=result.total_questions or 0,
        completed_at=result.completed_at,
        is_weak_topic=is_weak_score(result.score),
        topic_scores=topic_scores,
        answer_details=answer_details,
    )


@router.get("/students", response_model=List[AdminStudentSummary])
def list_students_admin(db: Session = Depends(get_db)):
    """List all students with summary stats for admin dashboard."""
    students = db.query(Student).order_by(Student.name).all()
    summaries = []

    for student in students:
        results = (
            db.query(QuizResult)
            .filter(QuizResult.student_id == student.id)
            .order_by(QuizResult.completed_at.desc())
            .all()
        )
        weak = get_weak_topics_for_student(db, student.id)
        recs = db.query(Recommendation).filter(Recommendation.student_id == student.id).count()

        summaries.append(
            AdminStudentSummary(
                id=student.id,
                name=student.name,
                created_at=student.created_at,
                quiz_attempts=len(results),
                latest_score=results[0].score if results else None,
                weak_topic_count=len(weak),
                recommendation_count=recs,
            )
        )
    return summaries


@router.get("/students/{student_id}/report", response_model=StudentReportResponse)
def get_student_report(student_id: int, db: Session = Depends(get_db)):
    """Full student report: attempts, weak topics, recommendations."""
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    results = (
        db.query(QuizResult)
        .filter(QuizResult.student_id == student_id)
        .order_by(QuizResult.completed_at.desc())
        .all()
    )
    weak_topics = get_weak_topics_for_student(db, student_id)
    recommendations = (
        db.query(Recommendation)
        .options(
            joinedload(Recommendation.topic),
            joinedload(Recommendation.learning_content),
        )
        .filter(Recommendation.student_id == student_id)
        .order_by(Recommendation.created_at.desc())
        .all()
    )

    return StudentReportResponse(
        student=StudentResponse.model_validate(student),
        quiz_attempts=[_result_to_detail(r) for r in results],
        latest_score=results[0].score if results else None,
        weak_topics=weak_topics,
        recommendations=[_to_recommendation_response(r) for r in recommendations],
    )
