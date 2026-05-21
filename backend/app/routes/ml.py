"""
Machine learning API — train weak-topic model and predict per student.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Student
from app.schemas import MLPredictResponse, MLTrainResponse, MLStatusResponse
from app.services.ml_service import (
    ensure_model_trained,
    get_model_status,
    predict_weak_topics,
    train_model,
)

router = APIRouter(prefix="/ml", tags=["Machine Learning"])


@router.get("/status", response_model=MLStatusResponse)
def ml_status():
    """Return whether a model is trained and which algorithm/features are used."""
    return MLStatusResponse(**get_model_status())


@router.post("/train", response_model=MLTrainResponse)
def ml_train(db: Session = Depends(get_db)):
    """Train (or retrain) the weak-topic classifier from all quiz topic scores."""
    outcome = train_model(db)
    return MLTrainResponse(**outcome)


@router.get("/predict/{student_id}", response_model=MLPredictResponse)
def ml_predict_get(student_id: int, db: Session = Depends(get_db)):
    """Predict weak topics for a student (GET)."""
    return _predict_for_student(student_id, db)


@router.post("/predict", response_model=MLPredictResponse)
def ml_predict_post(student_id: int, db: Session = Depends(get_db)):
    """
    Predict weak topics for a student (POST).
    Query param: student_id (e.g. POST /api/ml/predict?student_id=1).
    """
    return _predict_for_student(student_id, db)


def _predict_for_student(student_id: int, db: Session) -> MLPredictResponse:
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")

    ensure_model_trained(db)
    outcome = predict_weak_topics(db, student_id)
    return MLPredictResponse(**outcome)
