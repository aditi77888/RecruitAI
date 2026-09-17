"""
Resumable JSONL checkpoint -- same pattern as Compliance Master's judge
output. Lets a 100-resume batch survive a Groq rate-limit crash halfway
through without re-evaluating already-done resumes.
"""

from __future__ import annotations

import json
import os

from phase0.models import ResumeEvaluation
from phase0.shortlist_config import (
    CHECKPOINT_DIR,
    READY_TO_CALL_SCORE_THRESHOLD,
    SHORTLIST_SCORE_THRESHOLD,
)


def _checkpoint_path(jd_id: str) -> str:
    os.makedirs(CHECKPOINT_DIR, exist_ok=True)
    return os.path.join(CHECKPOINT_DIR, f"{jd_id}.jsonl")


def load_done_hashes(jd_id: str) -> set[str]:
    """Resume hashes already evaluated for this JD -- skip these on rerun."""
    path = _checkpoint_path(jd_id)
    if not os.path.exists(path):
        return set()
    done = set()
    with open(path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                done.add(json.loads(line)["resume_hash"])
            except (json.JSONDecodeError, KeyError):
                continue  # skip corrupted line rather than crash the whole load
    return done


def append_result(jd_id: str, evaluation: ResumeEvaluation) -> None:
    path = _checkpoint_path(jd_id)
    with open(path, "a", encoding="utf-8") as f:
        f.write(evaluation.model_dump_json() + "\n")


def load_all_results(
    jd_id: str,
    shortlist_threshold: float | None = None,
    ready_to_call_threshold: float | None = None,
) -> list[ResumeEvaluation]:
    """
    Loads every checkpointed evaluation for this JD. verdict and
    ready_to_call are always recomputed from the stored match_score using
    TODAY's thresholds -- not whatever was written at evaluation time --
    so a threshold change (like a company adjusting their own shortlist
    threshold in Settings) self-heals old entries instead of leaving them
    stuck on stale rules (or, for genuinely old schema values like
    "borderline", failing to load at all).

    shortlist_threshold / ready_to_call_threshold: pass the calling
    company's own threshold -- falls back to the global config default
    when not provided.
    """
    shortlist_threshold = (
        SHORTLIST_SCORE_THRESHOLD
        if shortlist_threshold is None
        else shortlist_threshold
    )
    ready_to_call_threshold = (
        READY_TO_CALL_SCORE_THRESHOLD
        if ready_to_call_threshold is None
        else ready_to_call_threshold
    )

    path = _checkpoint_path(jd_id)
    if not os.path.exists(path):
        return []
    results = []
    with open(path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            data = json.loads(line)
            score = data.get("match_score", 0)
            data["verdict"] = "shortlist" if score > shortlist_threshold else "reject"
            data["ready_to_call"] = score > ready_to_call_threshold
            results.append(ResumeEvaluation(**data))
    return results
