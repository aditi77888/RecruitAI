from __future__ import annotations

import csv
import io

from api import services
from api.security import require_company
from db import auth as db_auth
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse

from api.schemas import ChangePassword, CompanySettingsOut, CompanySettingsUpdate

router = APIRouter(prefix="/settings", tags=["settings"])


@router.get("", response_model=CompanySettingsOut)
def get_settings(company_id: str = Depends(require_company)):
    company = db_auth.get_company(company_id)
    if not company:
        raise HTTPException(status_code=404, detail="Company not found.")
    return company


@router.patch("", response_model=CompanySettingsOut)
def update_settings(body: CompanySettingsUpdate, company_id: str = Depends(require_company)):
    db_auth.update_company_settings(
        company_id, email=body.email, shortlist_threshold=body.shortlist_threshold
    )
    return db_auth.get_company(company_id)


@router.post("/change-password")
def change_password(body: ChangePassword, company_id: str = Depends(require_company)):
    ok = db_auth.change_company_password(company_id, body.old_password, body.new_password)
    if not ok:
        raise HTTPException(status_code=400, detail="Current password is incorrect.")
    return {"changed": True}


@router.get("/export.csv")
def export_csv(company_id: str = Depends(require_company)):
    candidates = services.get_shortlisted_candidates(company_id=company_id)
    company = db_auth.get_company(company_id)

    buffer = io.StringIO()
    fields = ["candidate_id", "name", "phone", "email", "jd_title", "match_score", "status", "call_status"]
    writer = csv.DictWriter(buffer, fieldnames=fields, extrasaction="ignore")
    writer.writeheader()
    for c in candidates:
        writer.writerow(c)
    buffer.seek(0)

    filename = f"{(company or {}).get('company_id', company_id)}_candidates.csv"
    return StreamingResponse(
        iter([buffer.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
