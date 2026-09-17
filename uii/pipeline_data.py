"""
Real data layer for the UI -- replaces mock_data.py. Function signatures
match what app.py already calls, so wiring this in is a one-line import
change plus a couple of button handlers passing real data through.
"""

from __future__ import annotations

import os
import re
import sys
from pathlib import Path

_HERE = os.path.dirname(__file__)
_ROOT = os.path.join(_HERE, "..")
sys.path.insert(
    0, _ROOT
)  # for `from db import ...` and `from phase2_telephony import ...`
sys.path.insert(
    0, os.path.join(_ROOT, "phase0_shortlisting")
)  # for `import pipeline` (phase0)
sys.path.insert(
    0, os.path.join(_ROOT, "phase1_precall")
)  # for `import scheduler` (phase1)

from db import auth, crud, init_db

init_db()


def _slugify(text: str) -> str:
    """
    Turns a JD title into a safe jd_id: only lowercase letters/digits/
    underscores survive. Anything else (/, \\, :, punctuation, unicode,
    multiple spaces...) collapses to a single underscore.

    A jd_id gets used as a literal filename component (checkpoints/<jd_id>.jsonl,
    uploaded_resumes/<jd_id>/...) -- a raw "/" or "\\" from a title like
    "AI / Generative AI Intern" would otherwise be read as a path separator
    and break file access on both Windows and Linux.
    """
    slug = re.sub(r"[^a-z0-9]+", "_", text.strip().lower()).strip("_")
    return slug[:40] or f"jd_{os.urandom(4).hex()}"


import phase0.jd_parser as phase0_jd_parser  # phase0_shortlisting/jd_parser.py
import phase0.pipeline as phase0_pipeline  # phase0_shortlisting/pipeline.py
import phase1_precall.scheduler as phase1_scheduler  # phase1_precall/scheduler.py
from phase1_precall.resume_extractor import (
    extract_text as _extract_file_text,  # phase1's generic PDF/DOCX extractor, reused for JD files too
)
from phase2_telephony import link_dispatcher as phase2_link_dispatcher
from phase4_postcall import (
    config as _phase4_config,  # reuse the same SMTP settings for verification emails
)

UPLOAD_DIR = Path(_HERE) / "uploaded_resumes"
UPLOAD_DIR.mkdir(exist_ok=True)


# ---------------------------------------------------------------- Email verification (signup)


def send_verification_code(to_email: str) -> str:
    """
    Sends a 6-digit code to to_email and returns it so the caller (the
    Streamlit signup form) can hold it in st.session_state and compare it
    against what the user types back in -- no DB table needed for this,
    since it's scoped to one continuous signup flow in one browser session.
    """
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


# ---------------------------------------------------------------- Company auth


def company_name_taken(company_name: str) -> bool:
    return auth.company_exists(company_name)


def company_signup(company_name: str, password: str, email: str = "") -> str:
    """Raises ValueError if the name is taken -- let the UI show that message."""
    return auth.create_company(company_name, password, email)


def get_company_settings(company_id: str) -> dict | None:
    return auth.get_company(company_id)


def update_company_settings(
    company_id: str, email: str | None = None, shortlist_threshold: float | None = None
) -> None:
    auth.update_company_settings(
        company_id, email=email, shortlist_threshold=shortlist_threshold
    )


def change_company_password(
    company_id: str, old_password: str, new_password: str
) -> bool:
    return auth.change_company_password(company_id, old_password, new_password)


def company_login(company_name: str, password: str) -> str | None:
    return auth.authenticate_company(company_name, password)


# ---------------------------------------------------------------- Candidate auth


def candidate_signup(email: str, password: str, full_name: str = "") -> str:
    """Raises ValueError if the email is taken -- let the UI show that message."""
    return auth.create_candidate_account(email, password, full_name)


def candidate_login(email: str, password: str) -> str | None:
    return auth.authenticate_candidate(email, password)


def get_candidate_account(candidate_account_id: str) -> dict | None:
    return auth.get_candidate_account(candidate_account_id)


def get_companies() -> list[dict]:
    """For the candidate portal's company picker."""
    return auth.get_all_companies()


# ---------------------------------------------------------------- JDs


def get_jds(company_id: str | None = None) -> list[dict]:
    return crud.get_jds(company_id=company_id)


def create_jd(
    title: str,
    jd_text: str,
    must_have_skills: str = "",
    nice_to_have_skills: str = "",
    min_experience: float = 0.0,
    company_id: str | None = None,
) -> str:
    jd_id = _slugify(title)
    crud.create_jd(
        jd_id,
        title,
        jd_text,
        must_have_skills,
        nice_to_have_skills,
        min_experience,
        company_id=company_id,
    )
    return jd_id


def delete_jd(jd_id: str, company_id: str | None = None) -> None:
    """
    Deletes a JD and every candidate/evaluation under it -- irreversible.
    If company_id is given, refuses (silently no-ops) unless that company
    actually owns this JD -- defense in depth so one company's logged-in
    session can't delete another company's JD even by a crafted request.
    """
    if company_id:
        jd = crud.get_jd(jd_id)
        if not jd or jd.get("company_id") != company_id:
            return
    crud.delete_jd(jd_id)


def create_jd_from_file(uploaded_file, company_id: str | None = None) -> dict:
    """
    uploaded_file: Streamlit UploadedFile (a JD PDF/DOCX).
    Extracts text (same extractor used for resumes), then a single Groq
    call structures it into title/skills/experience -- same pattern as
    phase0's resume evaluation. Returns the parsed fields + jd_id so the
    UI can show what got auto-filled.
    """
    jd_upload_dir = UPLOAD_DIR / "_jd_uploads"
    jd_upload_dir.mkdir(parents=True, exist_ok=True)
    dest = jd_upload_dir / uploaded_file.name
    with open(dest, "wb") as out:
        out.write(uploaded_file.getbuffer())

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


# ---------------------------------------------------------------- Shortlisted


def get_shortlisted_candidates(
    jd_title: str | None = None, company_id: str | None = None
) -> list[dict]:
    """Everyone phase0 did NOT reject -- excludes status='rejected' so the
    Shortlisted page only shows candidates who actually passed shortlisting.
    company_id scopes to one company FIRST (so a jd_title match is only
    ever compared within that company's own JDs, since two different
    companies could otherwise happen to use the same JD title)."""
    candidates = [
        c
        for c in crud.get_candidates(company_id=company_id)
        if c["status"] != "rejected"
    ]
    if jd_title:
        candidates = [c for c in candidates if c["jd_title"] == jd_title]
    return candidates


# ---------------------------------------------------------------- Reports


def get_reports(jd_title: str, company_id: str | None = None) -> list[dict]:
    return [
        r for r in crud.get_reports(company_id=company_id) if r["jd_title"] == jd_title
    ]


def get_all_report_jds(company_id: str | None = None) -> list[str]:
    seen = []
    for r in crud.get_reports(company_id=company_id):
        if r["jd_title"] not in seen:
            seen.append(r["jd_title"])
    return seen


# ---------------------------------------------------------------- Upload -> Shortlisting (phase0)


def upload_and_shortlist(
    jd_id: str, uploaded_files: list, candidate_account_id: str | None = None
) -> dict:
    """
    uploaded_files: Streamlit UploadedFile objects from st.file_uploader.
    Saves them locally, then runs the real phase0 pipeline (embedding
    filter + LLM evaluation + DB write) against them.

    candidate_account_id: set when called from the candidate self-service
    portal (a single candidate applying to this one JD), so the resulting
    application links back to their login account. None for the HR
    Dashboard's bulk upload (unaffected -- exactly as before).
    """
    jd_dir = UPLOAD_DIR / jd_id
    jd_dir.mkdir(parents=True, exist_ok=True)

    file_paths = []
    for f in uploaded_files:
        dest = jd_dir / f.name
        with open(dest, "wb") as out:
            out.write(f.getbuffer())
        file_paths.append(str(dest))

    return phase0_pipeline.run_shortlisting_for_jd(
        jd_id, file_paths, candidate_account_id=candidate_account_id
    )


# ---------------------------------------------------------------- Candidate portal


def get_my_applications(candidate_account_id: str) -> list[dict]:
    """Every JD this logged-in candidate has applied to, across any
    company -- for the candidate portal's status view."""
    return crud.get_applications_for_account(candidate_account_id)


# ---------------------------------------------------------------- Interview context + Send links (phase1 + phase2)


def prep_and_send_interview_links(jd_id: str) -> dict:
    """
    Manual trigger for testing from the UI: runs phase1's interview-context
    generation for anything shortlisted-but-not-ready (across all JDs --
    that's phase1's normal batch-job scope), then emails an interview link
    to everyone now ready_to_call in THIS jd_id (web-widget flow -- no
    telephony account needed, see phase2_telephony/link_dispatcher.py).
    """
    phase1_scheduler.process_pending_candidates()
    result = phase2_link_dispatcher.dispatch_interview_links(jd_id)
    return result
