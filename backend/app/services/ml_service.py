"""
Machine learning service — weak-topic prediction using scikit-learn.

Algorithm: LogisticRegression (binary classification).
Features per topic-quiz sample:
  - topic_score: percentage correct on that topic in one attempt
  - overall_score: whole-quiz percentage for that attempt
  - correct_ratio: correct / total questions for that topic
Labels: is_weak (1 if topic_score < 60%, else 0) from historical quiz data.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import List, Optional, Tuple

import joblib
import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler
from sqlalchemy.orm import Session

from app.models import QuizResult

WEAK_TOPIC_THRESHOLD = 60.0


def is_weak_score(score: float) -> bool:
    return score < WEAK_TOPIC_THRESHOLD


MODEL_DIR = Path(__file__).resolve().parents[2] / "models_storage"
MODEL_PATH = MODEL_DIR / "weak_topic_model.joblib"
METADATA_PATH = MODEL_DIR / "weak_topic_model_meta.json"

ALGORITHM_NAME = "LogisticRegression"
FEATURE_NAMES = ["topic_score", "overall_score", "correct_ratio"]
MIN_SAMPLES_TO_TRAIN = 4
PREDICTION_THRESHOLD = 0.5


def _ensure_model_dir() -> None:
    MODEL_DIR.mkdir(parents=True, exist_ok=True)


def extract_training_samples(db: Session) -> Tuple[np.ndarray, np.ndarray, int]:
    """
    Build feature matrix X and label vector y from all quiz topic breakdowns.
    Each row is one (student attempt, topic) pair.
    """
    results = db.query(QuizResult).order_by(QuizResult.completed_at.asc()).all()
    rows: List[List[float]] = []
    labels: List[int] = []

    for result in results:
        overall = float(result.score)
        for ts in result.get_topic_scores():
            total = ts.get("total") or 0
            correct = ts.get("correct") or 0
            topic_score = float(ts.get("score", 0))
            correct_ratio = (correct / total) if total else 0.0
            rows.append([topic_score, overall, correct_ratio])
            labels.append(1 if is_weak_score(topic_score) else 0)

    if not rows:
        return np.empty((0, 3)), np.array([]), 0

    return np.array(rows, dtype=np.float64), np.array(labels, dtype=np.int32), len(rows)


def train_model(db: Session) -> dict:
    """Train LogisticRegression on quiz data and persist to disk."""
    X, y, sample_count = extract_training_samples(db)

    if sample_count < MIN_SAMPLES_TO_TRAIN:
        return {
            "success": False,
            "message": f"Need at least {MIN_SAMPLES_TO_TRAIN} topic samples to train (found {sample_count}).",
            "sample_count": sample_count,
            "algorithm": ALGORITHM_NAME,
            "features": FEATURE_NAMES,
        }

    if len(set(y.tolist())) < 2:
        return {
            "success": False,
            "message": "Training data must include both weak and strong topic samples.",
            "sample_count": sample_count,
            "algorithm": ALGORITHM_NAME,
            "features": FEATURE_NAMES,
        }

    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    model = LogisticRegression(max_iter=1000, random_state=42)
    model.fit(X_scaled, y)

    _ensure_model_dir()
    joblib.dump({"model": model, "scaler": scaler}, MODEL_PATH)

    weak_count = int(y.sum())
    meta = {
        "algorithm": ALGORITHM_NAME,
        "features": FEATURE_NAMES,
        "sample_count": sample_count,
        "weak_samples": weak_count,
        "strong_samples": sample_count - weak_count,
        "threshold": WEAK_TOPIC_THRESHOLD,
        "prediction_threshold": PREDICTION_THRESHOLD,
    }
    METADATA_PATH.write_text(json.dumps(meta, indent=2), encoding="utf-8")

    return {"success": True, "message": "Model trained and saved.", **meta}


def load_model() -> Optional[dict]:
    """Load persisted model bundle from disk."""
    if not MODEL_PATH.exists():
        return None
    try:
        return joblib.load(MODEL_PATH)
    except Exception:
        return None


def get_model_status() -> dict:
    """Return metadata about the stored model."""
    bundle = load_model()
    if bundle is None:
        return {
            "trained": False,
            "algorithm": ALGORITHM_NAME,
            "features": FEATURE_NAMES,
            "message": "No trained model on disk. Call POST /api/ml/train first.",
        }

    meta = {}
    if METADATA_PATH.exists():
        try:
            meta = json.loads(METADATA_PATH.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            pass

    return {
        "trained": True,
        "algorithm": ALGORITHM_NAME,
        "features": FEATURE_NAMES,
        "model_path": str(MODEL_PATH),
        **meta,
    }


def _predict_features(features: np.ndarray, bundle: dict) -> Tuple[np.ndarray, np.ndarray]:
    scaler = bundle["scaler"]
    model = bundle["model"]
    X_scaled = scaler.transform(features)
    probabilities = model.predict_proba(X_scaled)[:, 1]
    predictions = (probabilities >= PREDICTION_THRESHOLD).astype(int)
    return predictions, probabilities


def get_student_topic_features(db: Session, student_id: int) -> List[dict]:
    """
    Latest per-topic scores for a student (one row per topic for prediction).
    """
    results = (
        db.query(QuizResult)
        .filter(QuizResult.student_id == student_id)
        .order_by(QuizResult.completed_at.desc())
        .all()
    )

    topic_latest: dict[int, dict] = {}
    for result in results:
        overall = float(result.score)
        for ts in result.get_topic_scores():
            tid = ts["topic_id"]
            if tid not in topic_latest:
                total = ts.get("total") or 0
                correct = ts.get("correct") or 0
                topic_latest[tid] = {
                    "topic_id": tid,
                    "topic_name": ts.get("topic_name", f"Topic {tid}"),
                    "course_id": ts.get("course_id", 0),
                    "topic_score": float(ts.get("score", 0)),
                    "overall_score": overall,
                    "correct_ratio": (correct / total) if total else 0.0,
                    "rule_weak": is_weak_score(float(ts.get("score", 0))),
                }

    return list(topic_latest.values())


def predict_weak_topics(db: Session, student_id: int) -> dict:
    """
    Predict weak topics for a student using the trained model.
    Falls back to rule-based labels when no model is available.
    """
    topics = get_student_topic_features(db, student_id)
    if not topics:
        return {
            "student_id": student_id,
            "model_trained": False,
            "algorithm": ALGORITHM_NAME,
            "features": FEATURE_NAMES,
            "predictions": [],
            "message": "No quiz data for this student yet.",
        }

    bundle = load_model()
    if bundle is None:
        predictions = [
            {
                "topic_id": t["topic_id"],
                "topic_name": t["topic_name"],
                "course_id": t["course_id"],
                "topic_score": t["topic_score"],
                "probability_weak": 1.0 if t["rule_weak"] else 0.0,
                "predicted_weak": t["rule_weak"],
                "rule_weak": t["rule_weak"],
                "source": "rule_based_fallback",
            }
            for t in topics
        ]
        return {
            "student_id": student_id,
            "model_trained": False,
            "algorithm": ALGORITHM_NAME,
            "features": FEATURE_NAMES,
            "predictions": predictions,
            "message": "Model not trained; using rule-based threshold (< 60%).",
        }

    X = np.array(
        [[t["topic_score"], t["overall_score"], t["correct_ratio"]] for t in topics],
        dtype=np.float64,
    )
    preds, probs = _predict_features(X, bundle)

    predictions = []
    for i, t in enumerate(topics):
        predictions.append(
            {
                "topic_id": t["topic_id"],
                "topic_name": t["topic_name"],
                "course_id": t["course_id"],
                "topic_score": round(t["topic_score"], 2),
                "probability_weak": round(float(probs[i]), 4),
                "predicted_weak": bool(preds[i]),
                "rule_weak": t["rule_weak"],
                "source": "ml_model",
            }
        )

    return {
        "student_id": student_id,
        "model_trained": True,
        "algorithm": ALGORITHM_NAME,
        "features": FEATURE_NAMES,
        "predictions": predictions,
        "message": "Predictions from trained LogisticRegression model.",
    }


def get_ml_predicted_weak_topics(db: Session, student_id: int) -> List[dict]:
    """Topics the ML model flags as likely weak (probability >= threshold)."""
    result = predict_weak_topics(db, student_id)
    return [p for p in result["predictions"] if p["predicted_weak"]]


def ensure_model_trained(db: Session) -> bool:
    """Train model if enough data exists and no model is on disk."""
    if load_model() is not None:
        return True
    outcome = train_model(db)
    return bool(outcome.get("success"))
