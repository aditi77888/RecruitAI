"""
Pydantic schemas. ResumeEvaluation is the core structured-output contract
for the Stage-2 LLM call -- it does scoring + summary + call-readiness in
ONE shot so there's no separate summarization pass later.
"""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class JDRecord(BaseModel):
    jd_id: str
    title: str
    raw_text: str
    must_have_skills: list[str] = Field(default_factory=list)
    nice_to_have_skills: list[str] = Field(default_factory=list)
    min_experience_years: float | None = None


class ResumeRecord(BaseModel):
    resume_hash: str  # sha256 of file bytes -- dedupe key
    candidate_name: str | None = None
    file_path: str
    resume_link: str | None = None  # Drive/cloud link, filled after upload
    raw_text: str
    extracted_at: str  # ISO timestamp


class EmbeddingFilterResult(BaseModel):
    resume_hash: str
    jd_id: str
    similarity_score: float
    passed_filter: bool


class ResumeEvaluation(BaseModel):
    """
    Structured output from the Stage-2 LLM call. One object per
    (resume_hash, jd_id) pair. This IS the row that gets persisted to the DB.
    """

    model_config = ConfigDict(
        protected_namespaces=()
    )  # allow the "model_used" field name below

    resume_hash: str
    jd_id: str
    candidate_name: str | None = None
    candidate_phone: str | None = None
    candidate_email: str | None = None
    match_score: float = Field(ge=0, le=100)
    verdict: Literal["shortlist", "reject"]
    matched_skills: list[str] = Field(default_factory=list)
    missing_skills: list[str] = Field(default_factory=list)
    experience_years_estimate: float | None = None
    resume_summary: (
        str  # 2-4 sentence summary -> Candidate.resume_summary column directly
    )
    ready_to_call: bool
    reasoning_note: str  # short internal note, not shown to the UI
    model_used: str  # which model in MODEL_CHAIN actually answered
