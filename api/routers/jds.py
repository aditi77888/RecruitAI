from __future__ import annotations

from api import services
from api.security import require_company
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

from api.schemas import JDCreate, JDFromFileOut, JDOut, ShortlistResult

router = APIRouter(prefix="/jds", tags=["jds"])


@router.get("", response_model=list[JDOut])
def list_jds(company_id: str = Depends(require_company)):
    return services.get_jds(company_id=company_id)


@router.post("", response_model=JDOut)
def create_jd(body: JDCreate, company_id: str = Depends(require_company)):
    if not (body.title and body.jd_text):
        raise HTTPException(status_code=400, detail="Title and description are required.")
    jd_id = services.create_jd(
        body.title, body.jd_text, body.must_have_skills, body.min_experience, company_id=company_id
    )
    jds = services.get_jds(company_id=company_id)
    return next(jd for jd in jds if jd["jd_id"] == jd_id)


@router.post("/from-file", response_model=JDFromFileOut)
async def create_jd_from_file(file: UploadFile = File(...), company_id: str = Depends(require_company)):
    parsed = await services.create_jd_from_file(file, company_id=company_id)
    return parsed


@router.delete("/{jd_id}")
def delete_jd(jd_id: str, company_id: str = Depends(require_company)):
    ok = services.delete_jd(jd_id, company_id=company_id)
    if not ok:
        raise HTTPException(status_code=404, detail="JD not found or not owned by this company.")
    return {"deleted": True}


@router.post("/{jd_id}/upload-resumes", response_model=ShortlistResult)
async def upload_resumes(
    jd_id: str, files: list[UploadFile] = File(...), company_id: str = Depends(require_company)
):
    jd = next((j for j in services.get_jds(company_id=company_id) if j["jd_id"] == jd_id), None)
    if not jd:
        raise HTTPException(status_code=404, detail="JD not found or not owned by this company.")
    if not files:
        raise HTTPException(status_code=400, detail="Upload at least one resume first.")
    return await services.upload_and_shortlist(jd_id, files)


@router.post("/{jd_id}/send-interview-links")
def send_interview_links(jd_id: str, company_id: str = Depends(require_company)):
    jd = next((j for j in services.get_jds(company_id=company_id) if j["jd_id"] == jd_id), None)
    if not jd:
        raise HTTPException(status_code=404, detail="JD not found or not owned by this company.")
    return services.prep_and_send_interview_links(jd_id)
