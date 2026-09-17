from __future__ import annotations

from api import services
from api.security import require_company
from fastapi import APIRouter, Depends, Query

from api.schemas import CandidateOut

router = APIRouter(prefix="/candidates", tags=["candidates"])


@router.get("", response_model=list[CandidateOut])
def list_candidates(
    jd_title: str | None = Query(default=None),
    search: str | None = Query(default=None),
    company_id: str = Depends(require_company),
):
    candidates = services.get_shortlisted_candidates(jd_title, company_id=company_id)
    if search:
        s = search.lower()
        candidates = [
            c for c in candidates if s in (c["name"] or "").lower() or s in c["candidate_id"].lower()
        ]
    return candidates
