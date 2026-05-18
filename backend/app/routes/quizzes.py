"""Quiz routes — available quiz, take, submit, results."""

from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models import Question, Quiz, QuizResult, Student, Topic
from app.schemas import (
    QuizResultResponse,
    QuizSubmitRequest,
    QuizSubmitResponse,
    QuizTakeResponse,
    QuestionTakeResponse,
    TopicScoreDetail,
    AnswerDetail,
)
from app.services.quiz_grading import (
    get_default_quiz,
    grade_quiz_submission,
    load_quiz_for_grading,
    serialize_question_for_take,
)
from app.services.recommendation_engine import is_weak_score, process_quiz_submission

router = APIRouter(prefix="/quizzes", tags=["Quizzes"])


@router.get("/available", response_model=QuizTakeResponse)
def get_available_quiz(db: Session = Depends(get_db)):
    """Return the default 15-question MCQ quiz (no correct answers)."""
    quiz = get_default_quiz(db)
    if not quiz:
        raise HTTPException(status_code=404, detail="No quiz available. Run seed_data.py.")

    topics = {t.id: t for t in db.query(Topic).all()}
    questions = []
    for q in sorted(quiz.questions, key=lambda x: (x.topic_id, x.id)):
        tname = topics.get(q.topic_id).name if q.topic_id in topics else ""
        questions.append(
            QuestionTakeResponse(**serialize_question_for_take(q, tname))
        )

    return QuizTakeResponse(
        id=quiz.id,
        title=quiz.title,
        description=quiz.description,
        question_count=len(questions),
        questions=questions,
    )


@router.get("/{quiz_id}/take", response_model=QuizTakeResponse)
def take_quiz(quiz_id: int, db: Session = Depends(get_db)):
    quiz = load_quiz_for_grading(db, quiz_id)
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    topics = {t.id: t for t in db.query(Topic).all()}
    questions = [
        QuestionTakeResponse(
            **serialize_question_for_take(
                q, topics.get(q.topic_id).name if q.topic_id in topics else ""
            )
        )
        for q in sorted(quiz.questions, key=lambda x: (x.topic_id, x.id))
    ]
    return QuizTakeResponse(
        id=quiz.id,
        title=quiz.title,
        description=quiz.description,
        question_count=len(questions),
        questions=questions,
    )


@router.post("/{quiz_id}/submit", response_model=QuizSubmitResponse)
def submit_quiz(quiz_id: int, payload: QuizSubmitRequest, db: Session = Depends(get_db)):
    quiz = load_quiz_for_grading(db, quiz_id)
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")

    student = db.query(Student).filter(Student.id == payload.student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    if not quiz.questions:
        raise HTTPException(status_code=400, detail="Quiz has no questions")

    answers = [a.model_dump() for a in payload.answers]
    score, correct_count, total, topic_scores, answer_details = grade_quiz_submission(
        db, quiz, answers
    )

    quiz_result, weak_names, rec_count, weak_details = process_quiz_submission(
        db,
        payload.student_id,
        quiz_id,
        score,
        correct_count,
        total,
        topic_scores,
        answer_details,
    )
    db.commit()
    db.refresh(quiz_result)

    return QuizSubmitResponse(
        result=QuizResultResponse(
            id=quiz_result.id,
            student_id=quiz_result.student_id,
            quiz_id=quiz_result.quiz_id,
            score=quiz_result.score,
            correct_count=correct_count,
            total_questions=total,
            completed_at=quiz_result.completed_at,
            is_weak_topic=is_weak_score(score),
        ),
        correct_count=correct_count,
        total_questions=total,
        weak_topics=weak_names,
        weak_topic_details=[TopicScoreDetail(**t) for t in weak_details],
        topic_scores=[TopicScoreDetail(**t) for t in topic_scores],
        answer_details=[AnswerDetail(**a) for a in answer_details],
        recommendations_created=rec_count,
    )


@router.get("/results/student/{student_id}", response_model=List[QuizResultResponse])
def get_student_results(student_id: int, db: Session = Depends(get_db)):
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    results = (
        db.query(QuizResult)
        .filter(QuizResult.student_id == student_id)
        .order_by(QuizResult.completed_at.desc())
        .all()
    )
    return [
        QuizResultResponse(
            id=r.id,
            student_id=r.student_id,
            quiz_id=r.quiz_id,
            score=r.score,
            correct_count=r.correct_count or 0,
            total_questions=r.total_questions or 0,
            completed_at=r.completed_at,
            is_weak_topic=is_weak_score(r.score),
        )
        for r in results
    ]


@router.get("/results/{result_id}/detail")
def get_result_detail(result_id: int, db: Session = Depends(get_db)):
    result = db.query(QuizResult).filter(QuizResult.id == result_id).first()
    if not result:
        raise HTTPException(status_code=404, detail="Result not found")
    return {
        "id": result.id,
        "score": result.score,
        "correct_count": result.correct_count,
        "total_questions": result.total_questions,
        "topic_scores": result.get_topic_scores(),
        "answer_details": result.get_answer_details(),
        "completed_at": result.completed_at,
    }
