from __future__ import annotations

from api import services
from api.security import require_candidate
from db import crud
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

from api.schemas import ApplicationOut, CompanyOut, JDOut, ShortlistResult

router = APIRouter(prefix="/candidate", tags=["candidate-portal"])


@router.get("/companies", response_model=list[CompanyOut])
def list_companies():
    return services.get_companies()


@router.get("/companies/{company_id}/jds", response_model=list[JDOut])
def list_company_jds(company_id: str):
    return crud.get_jds(company_id=company_id)


@router.post("/jds/{jd_id}/apply", response_model=ShortlistResult)
async def apply_to_jd(
    jd_id: str, resume: UploadFile = File(...), candidate_account_id: str = Depends(require_candidate)
):
    jd = crud.get_jd(jd_id)
    if not jd:
        raise HTTPException(status_code=404, detail="This job opening no longer exists.")
    return await services.upload_and_shortlist(jd_id, [resume], candidate_account_id=candidate_account_id)


@router.get("/applications", response_model=list[ApplicationOut])
def my_applications(candidate_account_id: str = Depends(require_candidate)):
    return services.get_my_applications(candidate_account_id)
