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


def requeue_for_retry(candidate_id: str, status: str, note: str, call_status: str) -> None:
    """Puts a candidate back in phase2's retry pool instead of writing a
    bogus evaluation -- used when a call ended without a real interview
    happening (reschedule request, early disconnect). Leaves ready_to_call
    alone: the candidate already passed that gate to get dialed once, and
    crud.get_ready_to_call() re-picks them up based on call_status alone
    ('pending'/'failed' are both retried, see its docstring)."""
    crud.update_candidate(
        candidate_id,
        status=status,
        call_status=call_status,
        error_log=note,
    )


def mark_declined(candidate_id: str, note: str) -> None:
    """Candidate explicitly opted out of the process -- terminal, not retried."""
    crud.update_candidate(candidate_id, status="declined", error_log=note)