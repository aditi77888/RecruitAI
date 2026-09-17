"""Thin wrapper over the shared DB's crud layer -- reads candidates ready
to call, updates call_status as the dispatcher works through them."""

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from db import crud


def get_ready_to_call_candidates(
    jd_id: str | None = None, stale_dialing_minutes: int = 10
) -> list[dict]:
    """Every candidate with ready_to_call=True and call_status='pending'
    (or 'failed', or stale 'dialing' -- see crud.get_ready_to_call),
    optionally scoped to one JD."""
    return crud.get_ready_to_call(jd_id, stale_dialing_minutes)


def get_candidate_by_id(candidate_id: str) -> dict | None:
    return crud.get_candidate(candidate_id)


def get_candidate_by_token(token: str) -> dict | None:
    return crud.get_candidate_by_token(token)


def set_interview_token(candidate_id: str, token: str) -> None:
    crud.set_interview_token(candidate_id, token)


def update_call_status(
    candidate_id: str, new_status: str, error_log: str | None = None
) -> None:
    fields = {"call_status": new_status}
    if error_log is not None:
        fields["error_log"] = error_log[:500]
    crud.update_candidate(candidate_id, **fields)
