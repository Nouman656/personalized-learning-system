"""
Course and topic management API routes.

Courses contain topics; topics anchor quizzes and learning content.
"""

from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models import Course, LearningContent, Topic
from app.schemas import (
    CourseCreate,
    CourseResponse,
    CourseUpdate,
    LearningContentCreate,
    LearningContentResponse,
    TopicCreate,
    TopicResponse,
)

router = APIRouter(prefix="/courses", tags=["Courses"])


@router.get("", response_model=List[CourseResponse])
def list_courses(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """List all courses with their topics."""
    return (
        db.query(Course)
        .options(joinedload(Course.topics))
        .offset(skip)
        .limit(limit)
        .all()
    )


@router.get("/{course_id}", response_model=CourseResponse)
def get_course(course_id: int, db: Session = Depends(get_db)):
    """Get one course including nested topics."""
    course = (
        db.query(Course)
        .options(joinedload(Course.topics))
        .filter(Course.id == course_id)
        .first()
    )
    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")
    return course


@router.post("", response_model=CourseResponse, status_code=status.HTTP_201_CREATED)
def create_course(payload: CourseCreate, db: Session = Depends(get_db)):
    """Create a course and optionally embed initial topics."""
    course = Course(title=payload.title, description=payload.description)
    db.add(course)
    db.flush()

    for topic_data in payload.topics or []:
        topic = Topic(
            course_id=course.id,
            name=topic_data.name,
            description=topic_data.description,
        )
        db.add(topic)

    db.commit()
    db.refresh(course)
    # Reload with topics for response
    return (
        db.query(Course)
        .options(joinedload(Course.topics))
        .filter(Course.id == course.id)
        .first()
    )


@router.put("/{course_id}", response_model=CourseResponse)
def update_course(course_id: int, payload: CourseUpdate, db: Session = Depends(get_db)):
    """Update course metadata."""
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")

    if payload.title is not None:
        course.title = payload.title
    if payload.description is not None:
        course.description = payload.description

    db.commit()
    return (
        db.query(Course)
        .options(joinedload(Course.topics))
        .filter(Course.id == course_id)
        .first()
    )


@router.delete("/{course_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_course(course_id: int, db: Session = Depends(get_db)):
    """Delete a course and all nested topics (cascade)."""
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")
    db.delete(course)
    db.commit()
    return None


# ----- Topics (nested under courses) -----


@router.post("/{course_id}/topics", response_model=TopicResponse, status_code=status.HTTP_201_CREATED)
def add_topic(course_id: int, payload: TopicCreate, db: Session = Depends(get_db)):
    """Add a topic to an existing course."""
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")

    topic = Topic(course_id=course_id, name=payload.name, description=payload.description)
    db.add(topic)
    db.commit()
    db.refresh(topic)
    return topic


@router.get("/{course_id}/topics", response_model=List[TopicResponse])
def list_topics(course_id: int, db: Session = Depends(get_db)):
    """List all topics for a course."""
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")
    return db.query(Topic).filter(Topic.course_id == course_id).all()


# ----- Learning content (linked to topics) -----


@router.post("/topics/{topic_id}/content", response_model=LearningContentResponse, status_code=status.HTTP_201_CREATED)
def add_learning_content(topic_id: int, payload: LearningContentCreate, db: Session = Depends(get_db)):
    """Attach study material to a topic (used by the recommendation engine)."""
    topic = db.query(Topic).filter(Topic.id == topic_id).first()
    if not topic:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Topic not found")

    # topic_id comes from the URL path, not the request body
    content = LearningContent(
        topic_id=topic_id,
        title=payload.title,
        content_type=payload.content_type,
        url=payload.url,
        description=payload.description,
    )
    db.add(content)
    db.commit()
    db.refresh(content)
    return content


@router.get("/topics/{topic_id}/content", response_model=List[LearningContentResponse])
def list_learning_content(topic_id: int, db: Session = Depends(get_db)):
    """List all learning resources for a topic."""
    topic = db.query(Topic).filter(Topic.id == topic_id).first()
    if not topic:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Topic not found")
    return db.query(LearningContent).filter(LearningContent.topic_id == topic_id).all()
