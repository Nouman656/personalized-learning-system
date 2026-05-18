"""
SQLAlchemy ORM models for the Personalized Learning System.
"""

import json
from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from app.database import Base


class Student(Base):
    """Learner identified by unique name (no email required for student accounts)."""

    __tablename__ = "students"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(120), nullable=False, unique=True, index=True)
    email = Column(String(255), unique=True, nullable=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    quiz_results = relationship("QuizResult", back_populates="student", cascade="all, delete-orphan")
    recommendations = relationship("Recommendation", back_populates="student", cascade="all, delete-orphan")


class Course(Base):
    __tablename__ = "courses"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)

    topics = relationship("Topic", back_populates="course", cascade="all, delete-orphan")


class Topic(Base):
    __tablename__ = "topics"

    id = Column(Integer, primary_key=True, index=True)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=False)
    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)

    course = relationship("Course", back_populates="topics")
    quizzes = relationship("Quiz", back_populates="topic", cascade="all, delete-orphan")
    learning_contents = relationship("LearningContent", back_populates="topic", cascade="all, delete-orphan")
    recommendations = relationship("Recommendation", back_populates="topic")
    questions = relationship("Question", back_populates="topic")


class Quiz(Base):
    __tablename__ = "quizzes"

    id = Column(Integer, primary_key=True, index=True)
    topic_id = Column(Integer, ForeignKey("topics.id"), nullable=True)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    is_default = Column(Boolean, default=False)

    topic = relationship("Topic", back_populates="quizzes")
    questions = relationship("Question", back_populates="quiz", cascade="all, delete-orphan")
    results = relationship("QuizResult", back_populates="quiz", cascade="all, delete-orphan")


class Question(Base):
    __tablename__ = "questions"

    id = Column(Integer, primary_key=True, index=True)
    quiz_id = Column(Integer, ForeignKey("quizzes.id"), nullable=False)
    topic_id = Column(Integer, ForeignKey("topics.id"), nullable=False)
    question_text = Column(Text, nullable=False)
    options = Column(Text, nullable=False)
    correct_answer = Column(String(500), nullable=False)

    quiz = relationship("Quiz", back_populates="questions")
    topic = relationship("Topic", back_populates="questions")


class QuizResult(Base):
    __tablename__ = "quiz_results"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    quiz_id = Column(Integer, ForeignKey("quizzes.id"), nullable=False)
    score = Column(Float, nullable=False)
    correct_count = Column(Integer, default=0)
    total_questions = Column(Integer, default=0)
    topic_scores_json = Column(Text, nullable=True)
    answer_details_json = Column(Text, nullable=True)
    completed_at = Column(DateTime, default=datetime.utcnow)

    student = relationship("Student", back_populates="quiz_results")
    quiz = relationship("Quiz", back_populates="results")

    def get_topic_scores(self):
        if not self.topic_scores_json:
            return []
        return json.loads(self.topic_scores_json)

    def get_answer_details(self):
        if not self.answer_details_json:
            return []
        return json.loads(self.answer_details_json)


class LearningContent(Base):
    __tablename__ = "learning_contents"

    id = Column(Integer, primary_key=True, index=True)
    topic_id = Column(Integer, ForeignKey("topics.id"), nullable=False)
    title = Column(String(200), nullable=False)
    content_type = Column(String(50), nullable=False)
    url = Column(String(500), nullable=True)
    description = Column(Text, nullable=True)

    topic = relationship("Topic", back_populates="learning_contents")
    recommendations = relationship("Recommendation", back_populates="learning_content")


class Recommendation(Base):
    __tablename__ = "recommendations"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    topic_id = Column(Integer, ForeignKey("topics.id"), nullable=False)
    learning_content_id = Column(Integer, ForeignKey("learning_contents.id"), nullable=True)
    reason = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    student = relationship("Student", back_populates="recommendations")
    topic = relationship("Topic", back_populates="recommendations")
    learning_content = relationship("LearningContent", back_populates="recommendations")
