"""Pydantic request/response models for the API layer."""

from __future__ import annotations

from pydantic import BaseModel, Field


# ---------------------------------------------------------------- Auth

class CompanySignupStart(BaseModel):
    company_name: str
    company_email: str
    password: str


class SignupCodeResponse(BaseModel):
    pending_token: str
    email: str


class CompanySignupVerify(BaseModel):
    pending_token: str
    code: str


class CompanyLogin(BaseModel):
    company_name: str
    password: str


class CandidateSignup(BaseModel):
    full_name: str
    email: str
    password: str


class CandidateLogin(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    token: str
    account_type: str
    account_id: str
    display_name: str


class SessionInfo(BaseModel):
    account_type: str
    account_id: str
    display_name: str


# ---------------------------------------------------------------- JDs

class JDCreate(BaseModel):
    title: str
    jd_text: str
    must_have_skills: str = ""
    min_experience: float = 0.0


class JDOut(BaseModel):
    jd_id: str
    company_id: str | None = None
    company_name: str | None = None
    title: str
    jd_text: str
    must_have_skills: str | None = None
    nice_to_have_skills: str | None = None
    min_experience: float | None = None
    total_candidates: int
    shortlisting_progress: int


class JDFromFileOut(BaseModel):
    jd_id: str
    title: str
    must_have_skills: str
    nice_to_have_skills: str
    min_experience: float


class ShortlistResult(BaseModel):
    total_resumes: int
    passed_embedding_filter: int
    evaluated: int
    shortlisted: int
    ready_to_call: int
    db_sync: dict
    errors: list[str]


# ---------------------------------------------------------------- Candidates

class CandidateOut(BaseModel):
    candidate_id: str
    jd_id: str
    jd_title: str | None = None
    company_id: str | None = None
    company_name: str | None = None
    name: str | None = None
    phone: str | None = None
    email: str | None = None
    resume_link: str | None = None
    resume_summary: str | None = None
    match_score: float | None = None
    verdict: str | None = None
    status: str
    match_ready: bool | None = None
    ready_to_call: bool | None = None
    call_status: str | None = None
    error_log: str | None = None


class InterviewLinkResult(BaseModel):
    sent: int
    skipped_no_email: int
    failed: int


# ---------------------------------------------------------------- Reports

class ReportRow(BaseModel):
    candidate_id: str
    name: str | None = None
    jd_title: str | None = None
    evaluation_summary: str | None = None
    transcript: str | None = None
    strengths: str | None = None
    weaknesses: str | None = None
    score: float | None = None
    selected: str


class ReportGroup(BaseModel):
    jd_title: str
    rows: list[ReportRow]


# ---------------------------------------------------------------- Settings

class CompanySettingsOut(BaseModel):
    company_id: str
    company_name: str
    email: str | None = None
    shortlist_threshold: float | None = None


class CompanySettingsUpdate(BaseModel):
    email: str | None = None
    shortlist_threshold: float | None = None


class ChangePassword(BaseModel):
    old_password: str
    new_password: str = Field(min_length=4)


# ---------------------------------------------------------------- Candidate portal

class CompanyOut(BaseModel):
    company_id: str
    company_name: str
    email: str | None = None


class ApplicationOut(BaseModel):
    candidate_id: str
    jd_id: str
    jd_title: str | None = None
    company_id: str | None = None
    company_name: str | None = None
    status: str
    match_score: float | None = None
    created_at: str | None = None
