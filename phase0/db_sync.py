"""
Writes evaluated candidates straight into the shared DB (ai_interview_agent/db)
-- this is what sheets_sync.py used to do, minus the Sheets round-trip.

Idempotent: candidate_id is derived from (jd_id, resume_hash), so reruns
update the existing row instead of duplicating it or re-triggering a call
on someone already dispatched.
"""

from __future__ import annotations

import os
import sys

# db/ lives one level up, alongside phase0_shortlisting/, phase1_precall/, etc.
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from db import crud
from phase0.models import ResumeEvaluation


def _candidate_id(jd_id: str, resume_hash: str) -> str:
    # 16 hex chars (64 bits) of the sha256 -- collision risk is negligible
    # even at thousands of resumes, unlike the earlier 8-char version.
    return f"{jd_id}-{resume_hash[:16]}"


def _normalize_name(name: str | None) -> str:
    # Resumes often style the candidate's name header in ALL CAPS, which the
    # LLM extracts verbatim -- and this name flows straight into Dograh's
    # {{initial_context.candidate_name}} for the interview greeting, where
    # most TTS engines (including Cartesia) read an all-caps word as an
    # acronym and spell it out letter by letter instead of saying it.
    # Only touch names that are actually all-caps so an already
    # correctly-cased name (mixed case, etc.) is never altered.
    name = name or ""
    return name.title() if name.isupper() else name


# LLM verdict ("shortlist"/"reject"/"borderline") -> Candidate.status
# (kept as its own map so the status vocabulary can evolve independently
# of the LLM's JSON contract)
_VERDICT_TO_STATUS = {
    "shortlist": "shortlisted",
    "reject": "rejected",
}


def sync_evaluations_to_db(
    evaluations: list[ResumeEvaluation],
    resume_link_map: dict[str, str] | None = None,
    resume_text_map: dict[str, str] | None = None,
    candidate_account_id: str | None = None,
) -> dict:
    """
    resume_link_map: resume_hash -> resume link (local path or cloud link),
    so the candidate row has something clickable in the UI.
    resume_text_map: resume_hash -> already-extracted resume text, so phase1
    doesn't need to re-download/re-OCR the same file.
    candidate_account_id: set when this batch came from the candidate
    self-service portal (one candidate applying to one JD at a time), so
    the resulting application links back to their login account. None for
    HR-side bulk uploads (no login account behind those resumes).

    Note on ready_to_call: phase0 only sets match_ready here (its score-based
    opinion of call-worthiness). The operational ready_to_call flag that
    phase2's dispatcher polls stays False until phase1 has actually built
    the interview_context -- otherwise a call could get dispatched before
    the Dograh prompt has anything to work with.

    Returns {"inserted": n, "updated": n}.
    """
    resume_link_map = resume_link_map or {}
    resume_text_map = resume_text_map or {}
    inserted, updated = 0, 0

    for ev in evaluations:
        candidate_id = _candidate_id(ev.jd_id, ev.resume_hash)
        # Check by candidate_id (what's actually inserted), not resume_hash --
        # avoids a false "not found" if a hash-prefix collision ever happens.
        already_exists = crud.get_candidate(candidate_id) is not None

        if not already_exists:
            crud.create_candidate(
                candidate_id=candidate_id,
                jd_id=ev.jd_id,
                name=_normalize_name(ev.candidate_name),
                phone=ev.candidate_phone or "",
                email=ev.candidate_email or "",
                resume_link=resume_link_map.get(ev.resume_hash, ""),
                resume_text=resume_text_map.get(ev.resume_hash, ""),
                resume_hash=ev.resume_hash,
                candidate_account_id=candidate_account_id,
            )
            inserted += 1
        else:
            updated += 1

        crud.update_candidate(
            candidate_id,
            match_score=ev.match_score,
            verdict=ev.verdict,
            matched_skills=", ".join(ev.matched_skills),
            gaps=", ".join(ev.missing_skills),
            resume_summary=ev.resume_summary,
            status=_VERDICT_TO_STATUS.get(ev.verdict, ev.verdict),
            match_ready=ev.ready_to_call,
        )

    return {"inserted": inserted, "updated": updated}
