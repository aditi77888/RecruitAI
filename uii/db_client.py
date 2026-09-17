"""Thin wrapper over the shared DB's crud layer -- reads candidates ready
to call, updates call_status as the dispatcher works through them."""

import sys
import os
from typing import Optional

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from db import crud


def get_ready_to_call_candidates(jd_id: str | None = None) -> list[dict]:
    """Every candidate with ready_to_call=True and call_status='pending',
    optionally scoped to one JD."""
    return crud.get_ready_to_call(jd_id)


def get_candidate_by_id(candidate_id: str) -> Optional[dict]:
    return crud.get_candidate(candidate_id)


def update_call_status(candidate_id: str, new_status: str) -> None:
    crud.update_candidate(candidate_id, call_status=new_status)