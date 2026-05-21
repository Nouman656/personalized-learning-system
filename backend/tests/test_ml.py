"""
Automated tests for ML training and prediction pipeline.
"""

import json
from unittest.mock import MagicMock

import numpy as np
import pytest

from app.services import ml_service
from app.services.ml_service import (
    ALGORITHM_NAME,
    FEATURE_NAMES,
    MIN_SAMPLES_TO_TRAIN,
    extract_training_samples,
    get_model_status,
    load_model,
    predict_weak_topics,
    train_model,
)


class FakeQuizResult:
    def __init__(self, score: float, topic_scores: list):
        self.score = score
        self._topic_scores = topic_scores

    def get_topic_scores(self):
        return self._topic_scores


def _make_results():
    """Synthetic quiz results: mix of weak and strong topics."""
    return [
        FakeQuizResult(
            55.0,
            [
                {"topic_id": 1, "topic_name": "Variables", "score": 33.0, "correct": 1, "total": 3},
                {"topic_id": 2, "topic_name": "Loops", "score": 66.0, "correct": 2, "total": 3},
            ],
        ),
        FakeQuizResult(
            80.0,
            [
                {"topic_id": 1, "topic_name": "Variables", "score": 100.0, "correct": 3, "total": 3},
                {"topic_id": 3, "topic_name": "Functions", "score": 33.0, "correct": 1, "total": 3},
            ],
        ),
        FakeQuizResult(
            45.0,
            [
                {"topic_id": 2, "topic_name": "Loops", "score": 0.0, "correct": 0, "total": 3},
                {"topic_id": 4, "topic_name": "Data Types", "score": 66.0, "correct": 2, "total": 3},
            ],
        ),
    ]


@pytest.fixture
def mock_db(monkeypatch, tmp_path):
    """Mock DB session and redirect model storage to a temp directory."""
    model_path = tmp_path / "model.joblib"
    meta_path = tmp_path / "meta.json"
    monkeypatch.setattr(ml_service, "MODEL_PATH", model_path)
    monkeypatch.setattr(ml_service, "METADATA_PATH", meta_path)
    monkeypatch.setattr(ml_service, "MODEL_DIR", tmp_path)

    db = MagicMock()
    db.query.return_value.order_by.return_value.all.return_value = _make_results()
    return db


def test_extract_training_samples(mock_db):
    X, y, count = extract_training_samples(mock_db)
    assert count == 6
    assert X.shape == (6, 3)
    assert set(y.tolist()) == {0, 1}


def test_train_model_success(mock_db):
    outcome = train_model(mock_db)
    assert outcome["success"] is True
    assert outcome["algorithm"] == ALGORITHM_NAME
    assert outcome["features"] == FEATURE_NAMES
    assert outcome["sample_count"] >= MIN_SAMPLES_TO_TRAIN
    assert load_model() is not None


def test_train_model_insufficient_data(monkeypatch, tmp_path):
    monkeypatch.setattr(ml_service, "MODEL_PATH", tmp_path / "m.joblib")
    monkeypatch.setattr(ml_service, "METADATA_PATH", tmp_path / "meta.json")
    monkeypatch.setattr(ml_service, "MODEL_DIR", tmp_path)

    db = MagicMock()
    db.query.return_value.order_by.return_value.all.return_value = []
    outcome = train_model(db)
    assert outcome["success"] is False


def test_predict_after_training(mock_db):
    train_model(mock_db)

    student_results = [
        FakeQuizResult(
            50.0,
            [
                {
                    "topic_id": 1,
                    "topic_name": "Variables",
                    "course_id": 1,
                    "score": 40.0,
                    "correct": 1,
                    "total": 3,
                },
                {
                    "topic_id": 2,
                    "topic_name": "Loops",
                    "course_id": 1,
                    "score": 90.0,
                    "correct": 3,
                    "total": 3,
                },
            ],
        )
    ]

    def query_side_effect(model):
        q = MagicMock()
        if model.__name__ == "QuizResult":
            q.filter.return_value.order_by.return_value.all.return_value = student_results
        else:
            q.filter.return_value.order_by.return_value.all.return_value = _make_results()
        return q

    mock_db.query.side_effect = query_side_effect

    outcome = predict_weak_topics(mock_db, student_id=1)
    assert outcome["student_id"] == 1
    assert outcome["model_trained"] is True
    assert len(outcome["predictions"]) == 2
    for pred in outcome["predictions"]:
        assert "probability_weak" in pred
        assert "predicted_weak" in pred
        assert pred["source"] == "ml_model"


def test_model_persistence_reload(mock_db):
    train_model(mock_db)
    bundle = load_model()
    assert bundle is not None
    assert "model" in bundle
    assert "scaler" in bundle

    X = np.array([[40.0, 50.0, 0.33], [90.0, 50.0, 1.0]])
    preds, probs = ml_service._predict_features(X, bundle)
    assert len(preds) == 2
    assert len(probs) == 2


def test_get_model_status_untrained(tmp_path, monkeypatch):
    monkeypatch.setattr(ml_service, "MODEL_PATH", tmp_path / "missing.joblib")
    status = get_model_status()
    assert status["trained"] is False


def test_get_model_status_trained(mock_db):
    train_model(mock_db)
    status = get_model_status()
    assert status["trained"] is True
    assert status["algorithm"] == ALGORITHM_NAME


def test_predict_fallback_without_model(monkeypatch, tmp_path):
    monkeypatch.setattr(ml_service, "MODEL_PATH", tmp_path / "missing.joblib")

    db = MagicMock()
    db.query.return_value.filter.return_value.order_by.return_value.all.return_value = [
        FakeQuizResult(
            55.0,
            [
                {
                    "topic_id": 1,
                    "topic_name": "Variables",
                    "course_id": 1,
                    "score": 50.0,
                    "correct": 1,
                    "total": 3,
                }
            ],
        )
    ]

    outcome = predict_weak_topics(db, student_id=99)
    assert outcome["model_trained"] is False
    assert len(outcome["predictions"]) == 1
    assert outcome["predictions"][0]["source"] == "rule_based_fallback"
