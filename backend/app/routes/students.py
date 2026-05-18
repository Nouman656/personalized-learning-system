"""Student list/detail routes (used by admin and legacy clients)."""

from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Student
from app.schemas import StudentCreate, StudentResponse, StudentUpdate

router = APIRouter(prefix="/students", tags=["Students"])


@router.get("", response_model=List[StudentResponse])
def list_students(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return db.query(Student).order_by(Student.name).offset(skip).limit(limit).all()


@router.get("/{student_id}", response_model=StudentResponse)
def get_student(student_id: int, db: Session = Depends(get_db)):
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    return student


@router.post("", response_model=StudentResponse, status_code=status.HTTP_201_CREATED)
def create_student(payload: StudentCreate, db: Session = Depends(get_db)):
    name = payload.name.strip()
    existing = db.query(Student).filter(Student.name == name).first()
    if existing:
        raise HTTPException(status_code=409, detail="Student name already exists")
    student = Student(name=name, email=payload.email)
    db.add(student)
    db.commit()
    db.refresh(student)
    return student


@router.put("/{student_id}", response_model=StudentResponse)
def update_student(student_id: int, payload: StudentUpdate, db: Session = Depends(get_db)):
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    if payload.name is not None:
        student.name = payload.name.strip()
    if payload.email is not None:
        student.email = payload.email
    db.commit()
    db.refresh(student)
    return student


@router.delete("/{student_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_student(student_id: int, db: Session = Depends(get_db)):
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    db.delete(student)
    db.commit()
    return None
