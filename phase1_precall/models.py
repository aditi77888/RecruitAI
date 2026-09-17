"""
ORM models -- single source of truth for the whole pipeline.

jds          -- one row per job opening, created via the UI's "+ Add JD" form
candidates   -- one row per resume, moves through status as it goes through
                phase0 (shortlisting) -> phase1 (interview-context prep) ->
                phase2 (call dispatch) -> phase4 (post-call eval)
evaluations  -- one row per completed call, written by phase4's webhook

status values on Candidate (informal enum, kept as plain string so we don't
fight SQLite over enum migrations):
    uploaded -> shortlisted / rejected / borderline -> ready_to_call ->
    called -> evaluated
"""

from datetime import datetime

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()


class JD(Base):
    __tablename__ = "jds"

    jd_id = Column(String, primary_key=True)
    title = Column(String, nullable=False)
    jd_text = Column(Text, nullable=False)
    must_have_skills = Column(String)  # comma-separated
    nice_to_have_skills = Column(String)  # comma-separated
    min_experience = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow)

    candidates = relationship("Candidate", back_populates="jd")


class Candidate(Base):
    __tablename__ = "candidates"

    candidate_id = Column(String, primary_key=True)
    jd_id = Column(String, ForeignKey("jds.jd_id"), nullable=False)

    name = Column(String)
    phone = Column(String)
    email = Column(String)

    resume_link = Column(String)  # Drive link or local path
    resume_text = Column(Text)  # raw extracted text
    resume_hash = Column(String, index=True)  # for de-dupe on re-upload

    match_score = Column(Float)  # phase0's 0-100 score
    verdict = Column(String)  # shortlist / reject / borderline
    matched_skills = Column(Text)  # comma-separated
    gaps = Column(Text)  # comma-separated
    resume_summary = Column(Text)  # phase0's match-quality summary

    interview_context = Column(Text)  # phase1's Dograh-prompt JSON

    status = Column(String, default="uploaded")
    match_ready = Column(
        Boolean, default=False
    )  # phase0's score-based signal (>= READY_TO_CALL_SCORE_THRESHOLD)
    ready_to_call = Column(
        Boolean, default=False
    )  # operational gate phase2 polls -- only True once phase1 has built interview_context
    call_status = Column(String, default="pending")  # pending/dialing/completed/failed
    error_log = Column(
        Text
    )  # last error message, if any phase failed on this candidate

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    jd = relationship("JD", back_populates="candidates")
    evaluations = relationship("Evaluation", back_populates="candidate")


class Evaluation(Base):
    __tablename__ = "evaluations"

    id = Column(Integer, primary_key=True, autoincrement=True)
    candidate_id = Column(String, ForeignKey("candidates.candidate_id"), nullable=False)

    transcript = Column(Text)
    score = Column(Float)
    strengths = Column(Text)
    weaknesses = Column(Text)
    evaluation_summary = Column(Text)
    selected = Column(Boolean)

    evaluated_at = Column(DateTime, default=datetime.utcnow)

    candidate = relationship("Candidate", back_populates="evaluations")
