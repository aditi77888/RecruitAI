"""
Replaces sheets_client.py. Phase1's job: for every candidate phase0 marked
'shortlisted' AND 'match_ready' (its LLM score cleared the call-worthy bar),
generate the rich interview-context JSON that Dograh's prompt uses, then
flip ready_to_call=True so phase2's dispatcher picks it up.

Deliberately mirrors the SheetsClient method names (get_pending_candidates,
mark_processing, mark_ready, mark_error) so scheduler.py's control flow
barely changes -- only the storage backend underneath does.
"""
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from db import crud


def get_pending_candidates() -> list[dict]:
    """Candidates needing an interview_context built, per candidate dict."""
    return crud.get_candidates_for_interview_prep()


def mark_processing(candidate_id: str) -> None:
    crud.update_candidate(candidate_id, status="interview_context_processing")


def mark_ready(candidate_id: str, interview_context_json: str) -> None:
    crud.update_candidate(
        candidate_id,
        interview_context=interview_context_json,
        status="ready_to_call",
        ready_to_call=True,
        call_status="pending",
        error_log="",
    )


def mark_error(candidate_id: str, error_message: str) -> None:
    crud.update_candidate(
        candidate_id,
        status="interview_context_error",
        error_log=error_message[:500],
    )