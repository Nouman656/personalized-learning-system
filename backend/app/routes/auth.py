"""
Student authentication routes (name-only accounts).
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Student
from app.schemas import StudentNameRequest, StudentResponse

router = APIRouter(prefix="/auth/student", tags=["Student Auth"])


def _normalize_name(name: str) -> str:
    return " ".join(name.strip().split())


def _placeholder_email(name: str) -> str:
    """Unique internal email for legacy DB rows that require NOT NULL email."""
    safe = "".join(c if c.isalnum() else "_" for c in name.lower())
    return f"{safe}@student.pls"


@router.post("/register", response_model=StudentResponse, status_code=status.HTTP_201_CREATED)
def register_student(payload: StudentNameRequest, db: Session = Depends(get_db)):
    """Create a student account using name only. Rejects duplicate names."""
    name = _normalize_name(payload.name)
    if not name:
        raise HTTPException(status_code=400, detail="Name cannot be empty")

    existing = db.query(Student).filter(Student.name == name).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A student with this name already exists. Please login instead.",
        )

    student = Student(name=name, email=_placeholder_email(name))
    db.add(student)
    db.commit()
    db.refresh(student)
    return student


@router.post("/login", response_model=StudentResponse)
def login_student(payload: StudentNameRequest, db: Session = Depends(get_db)):
    """Login with an existing student name."""
    name = _normalize_name(payload.name)
    student = db.query(Student).filter(Student.name == name).first()
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student not found. Create an account first.",
        )
    return student


@router.delete("/{student_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_student_account(student_id: int, db: Session = Depends(get_db)):
    """Delete student and all related quiz data."""
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    db.delete(student)
    db.commit()
    return None
