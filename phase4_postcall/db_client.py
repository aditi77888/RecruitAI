"""Thin wrapper over the shared DB's crud layer -- looks up a candidate
by id and writes their post-call evaluation."""

import sys
import os
from typing import Optional

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from db import crud


def get_candidate_by_id(candidate_id: str) -> Optional[dict]:
    return crud.get_candidate(candidate_id)


def write_evaluation(
    candidate_id: str,
    transcript: str,
    score: int,
    strengths: str,
    weaknesses: str,
    shortlist: bool,
    summary: str,
) -> None:
    """Writes into the shared evaluations table. crud.create_evaluation also
    flips the candidate's own status to 'evaluated' and call_status to
    'completed', so the Shortlisted page's status column updates too."""
    crud.create_evaluation(
        candidate_id=candidate_id,
        transcript=transcript,
        score=score,
        strengths=strengths,
        weaknesses=weaknesses,
        evaluation_summary=summary,
        selected=shortlist,
    )