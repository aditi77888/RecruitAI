"""
Thin service layer -- every function here does exactly what
uii/pipeline_data.py already does for the Streamlit dashboard (same
underlying db/auth, db/crud, phase0/phase1/phase2 calls), adapted for
FastAPI's UploadFile instead of Streamlit's UploadedFile. No pipeline
logic is duplicated or changed -- this only adapts the I/O boundary.
"""

from __future__ import annotations

import os
import re
from pathlib import Path

from api import bootstrap  # noqa: F401  (sets up sys.path first)
from fastapi import UploadFile

from db import auth, crud, init_db

init_db()

import phase0.jd_parser as phase0_jd_parser
import phase0.pipeline as phase0_pipeline
import phase1_precall.scheduler as phase1_scheduler
from phase1_precall.resume_extractor import extract_text as _extract_file_text
from phase2_telephony import link_dispatcher as phase2_link_dispatcher
from phase4_postcall import config as _phase4_config

_HERE = os.path.dirname(__file__)
UPLOAD_DIR = Path(_HERE) / "uploaded_resumes"
UPLOAD_DIR.mkdir(exist_ok=True)


def _slugify(text: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "_", text.strip().lower()).strip("_")
    return slug[:40] or f"jd_{os.urandom(4).hex()}"


async def _save_upload(dest: Path, upload: UploadFile) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    content = await upload.read()
    with open(dest, "wb") as out:
        out.write(content)


# ---------------------------------------------------------------- Email verification (signup)

def send_verification_code(to_email: str) -> str:
    """Sends a 6-digit code to to_email and returns it (same SMTP settings
    as phase4's shortlist-notification email) so the caller can hold it
    server-side and compare it against what the candidate/company types
    back in."""
    import random
    import smtplib
    from email.mime.text import MIMEText

    code = f"{random.randint(0, 999999):06d}"
    msg = MIMEText(
        f"Your RecruitAI verification code is: {code}\n\n"
        f"This code is valid for 10 minutes. If you didn't request this, "
        f"you can ignore this email."
    )
    msg["Subject"] = "Your RecruitAI verification code"
    msg["From"] = _phase4_config.SMTP_USER
    msg["To"] = to_email

    with smtplib.SMTP(_phase4_config.SMTP_HOST, _phase4_config.SMTP_PORT) as server:
        server.starttls()
        server.login(_phase4_config.SMTP_USER, _phase4_config.SMTP_APP_PASSWORD)
        server.send_message(msg)

    return code


# ---------------------------------------------------------------- JDs

def get_jds(company_id: str | None = None) -> list[dict]:
    return crud.get_jds(company_id=company_id)


def create_jd(
    title: str,
    jd_text: str,
    must_have_skills: str = "",
    min_experience: float = 0.0,
    company_id: str | None = None,
) -> str:
    jd_id = _slugify(title)
    crud.create_jd(jd_id, title, jd_text, must_have_skills, "", min_experience, company_id=company_id)
    return jd_id


async def create_jd_from_file(upload: UploadFile, company_id: str | None = None) -> dict:
    jd_upload_dir = UPLOAD_DIR / "_jd_uploads"
    dest = jd_upload_dir / upload.filename
    await _save_upload(dest, upload)

    raw_text = _extract_file_text(dest)
    parsed = phase0_jd_parser.parse_jd_from_text(raw_text)

    jd_id = _slugify(parsed["title"])
    crud.create_jd(
        jd_id,
        parsed["title"],
        parsed["jd_text"],
        parsed["must_have_skills"],
        parsed["nice_to_have_skills"],
        parsed["min_experience"],
        company_id=company_id,
    )
    parsed["jd_id"] = jd_id
    return parsed


def delete_jd(jd_id: str, company_id: str | None = None) -> bool:
    """Returns False (no-op) if company_id is given but doesn't own this JD."""
    if company_id:
        jd = crud.get_jd(jd_id)
        if not jd or jd.get("company_id") != company_id:
            return False
    crud.delete_jd(jd_id)
    return True


async def upload_and_shortlist(
    jd_id: str, files: list[UploadFile], candidate_account_id: str | None = None
) -> dict:
    jd_dir = UPLOAD_DIR / jd_id
    file_paths = []
    for f in files:
        dest = jd_dir / f.filename
        await _save_upload(dest, f)
        file_paths.append(str(dest))

    return phase0_pipeline.run_shortlisting_for_jd(
        jd_id, file_paths, candidate_account_id=candidate_account_id
    )


# ---------------------------------------------------------------- Candidates / reports

def get_shortlisted_candidates(
    jd_title: str | None = None, company_id: str | None = None
) -> list[dict]:
    candidates = [
        c for c in crud.get_candidates(company_id=company_id) if c["status"] != "rejected"
    ]
    if jd_title:
        candidates = [c for c in candidates if c["jd_title"] == jd_title]
    return candidates


def get_reports_grouped(company_id: str | None = None) -> list[dict]:
    all_reports = crud.get_reports(company_id=company_id)
    grouped: dict[str, list[dict]] = {}
    for row in all_reports:
        grouped.setdefault(row["jd_title"], []).append(row)
    return [{"jd_title": title, "rows": rows} for title, rows in grouped.items()]


def prep_and_send_interview_links(jd_id: str) -> dict:
    phase1_scheduler.process_pending_candidates()
    return phase2_link_dispatcher.dispatch_interview_links(jd_id)


# ---------------------------------------------------------------- Candidate portal

def get_companies() -> list[dict]:
    return auth.get_all_companies()


def get_my_applications(candidate_account_id: str) -> list[dict]:
    return crud.get_applications_for_account(candidate_account_id)
