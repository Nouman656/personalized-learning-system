"""
Pydantic schemas for API validation.
"""

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field


# ----- Auth / Student -----


class StudentNameRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=120)


class StudentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    email: Optional[str] = None
    created_at: datetime


class StudentCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=120)
    email: Optional[str] = None


class StudentUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=120)
    email: Optional[str] = None


# ----- Admin -----


class AdminStudentSummary(BaseModel):
    id: int
    name: str
    created_at: datetime
    quiz_attempts: int = 0
    latest_score: Optional[float] = None
    weak_topic_count: int = 0
    recommendation_count: int = 0


class TopicScoreDetail(BaseModel):
    topic_id: int
    topic_name: str
    course_id: int = 0
    correct: int
    total: int
    score: float
    is_weak: bool


class AnswerDetail(BaseModel):
    question_id: int
    topic_id: int
    topic_name: str
    question_text: str
    selected_answer: str
    correct_answer: str
    is_correct: bool
    options: List[str]


class QuizResultDetail(BaseModel):
    id: int
    quiz_id: int
    score: float
    correct_count: int
    total_questions: int
    completed_at: datetime
    is_weak_topic: bool
    topic_scores: List[TopicScoreDetail] = []
    answer_details: List[AnswerDetail] = []


class StudentReportResponse(BaseModel):
    student: StudentResponse
    quiz_attempts: List[QuizResultDetail]
    latest_score: Optional[float] = None
    weak_topics: List[dict]
    recommendations: List["RecommendationResponse"]


# ----- Course & Topic -----


class TopicBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None


class TopicCreate(TopicBase):
    pass


class TopicResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    course_id: int
    name: str
    description: Optional[str] = None


class CourseBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None


class CourseCreate(CourseBase):
    topics: Optional[List[TopicCreate]] = []


class CourseUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None


class CourseResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    description: Optional[str] = None
    topics: List[TopicResponse] = []


# ----- Quiz -----


class QuestionTakeResponse(BaseModel):
    id: int
    quiz_id: int
    topic_id: int
    topic_name: str
    question_text: str
    options: List[str]


class QuizTakeResponse(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    question_count: int
    questions: List[QuestionTakeResponse]


class QuizSubmitAnswer(BaseModel):
    question_id: int
    selected_answer: str


class QuizSubmitRequest(BaseModel):
    student_id: int
    answers: List[QuizSubmitAnswer]


class QuizResultResponse(BaseModel):
    id: int
    student_id: int
    quiz_id: int
    score: float
    correct_count: int
    total_questions: int
    completed_at: datetime
    is_weak_topic: bool


class QuizSubmitResponse(BaseModel):
    result: QuizResultResponse
    correct_count: int
    total_questions: int
    weak_topics: List[str] = []
    weak_topic_details: List[TopicScoreDetail] = []
    topic_scores: List[TopicScoreDetail] = []
    answer_details: List[AnswerDetail] = []
    recommendations_created: int = 0


# ----- Recommendation -----


class RecommendationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    student_id: int
    topic_id: int
    learning_content_id: Optional[int]
    reason: str
    is_read: bool
    created_at: datetime
    topic_name: Optional[str] = None
    content_title: Optional[str] = None


class WeakTopicResponse(BaseModel):
    topic_id: int
    topic_name: str
    course_id: int
    average_score: float
    attempt_count: int = 1


class LearningContentBase(BaseModel):
    title: str
    content_type: str
    url: Optional[str] = None
    description: Optional[str] = None


class LearningContentCreate(LearningContentBase):
    pass


class LearningContentResponse(LearningContentBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    topic_id: int


class GenerateRecommendationsRequest(BaseModel):
    student_id: int


class GenerateRecommendationsResponse(BaseModel):
    student_id: int
    weak_topics: List[WeakTopicResponse]
    recommendations_created: int
    recommendations: List[RecommendationResponse]


class HealthResponse(BaseModel):
    status: str
    app_name: str
    version: str


StudentReportResponse.model_rebuild()
