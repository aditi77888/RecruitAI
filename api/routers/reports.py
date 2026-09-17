from __future__ import annotations

from api import services
from api.security import require_company
from fastapi import APIRouter, Depends

from api.schemas import ReportGroup

router = APIRouter(prefix="/reports", tags=["reports"])


@router.get("", response_model=list[ReportGroup])
def list_reports(company_id: str = Depends(require_company)):
    return services.get_reports_grouped(company_id=company_id)
