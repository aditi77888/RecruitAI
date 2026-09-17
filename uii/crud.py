"""
Thin CRUD layer over the models. Every phase (phase0/phase1/phase2/phase4)
and the UI call into these functions instead of writing raw SQLAlchemy
queries -- keeps the query logic in one place if the schema changes later.
"""
from datetime import datetime

from .database import get_session
from .models import JD, Candidate, Evaluation


# ---------------------------------------------------------------- JDs

def create_jd(jd_id: str, title: str, jd_text: str,
              must_have_skills: str = "", nice_to_have_skills: str = "",
              min_experience: float = 0.0) -> None:
    with get_session() as db:
        jd = JD(
            jd_id=jd_id, title=title, jd_text=jd_text,
            must_have_skills=must_have_skills,
            nice_to_have_skills=nice_to_have_skills,
            min_experience=min_experience,
        )
        db.add(jd)
        db.commit()


def get_jds() -> list[dict]:
    with get_session() as db:
        rows = db.query(JD).order_by(JD.created_at.desc()).all()
        return [_jd_to_dict(db, jd) for jd in rows]


def get_jd(jd_id: str) -> dict | None:
    with get_session() as db:
        jd = db.query(JD).filter(JD.jd_id == jd_id).first()
        return _jd_to_dict(db, jd) if jd else None


def _jd_to_dict(db, jd: JD) -> dict:
    total = db.query(Candidate).filter(Candidate.jd_id == jd.jd_id).count()
    processed = db.query(Candidate).filter(
        Candidate.jd_id == jd.jd_id,
        Candidate.status != "uploaded",
    ).count()
    progress = int((processed / total) * 100) if total else 0
    return {
        "jd_id": jd.jd_id,
        "title": jd.title,
        "jd_text": jd.jd_text,
        "must_have_skills": jd.must_have_skills,
        "nice_to_have_skills": jd.nice_to_have_skills,
        "min_experience": jd.min_experience,
        "total_candidates": total,
        "shortlisting_progress": progress,
    }


# ---------------------------------------------------------------- Candidates

def create_candidate(candidate_id: str, jd_id: str, name: str = "",
                      phone: str = "", email: str = "",
                      resume_link: str = "", resume_text: str = "",
                      resume_hash: str = "") -> None:
    with get_session() as db:
        c = Candidate(
            candidate_id=candidate_id, jd_id=jd_id, name=name, phone=phone,
            email=email, resume_link=resume_link, resume_text=resume_text,
            resume_hash=resume_hash, status="uploaded",
        )
        db.add(c)
        db.commit()


def update_candidate(candidate_id: str, **fields) -> None:
    """Generic updater -- pass any Candidate column as a kwarg."""
    with get_session() as db:
        c = db.query(Candidate).filter(Candidate.candidate_id == candidate_id).first()
        if not c:
            return
        for key, value in fields.items():
            setattr(c, key, value)
        c.updated_at = datetime.utcnow()
        db.commit()


def get_candidates(jd_id: str | None = None, status: str | None = None) -> list[dict]:
    with get_session() as db:
        q = db.query(Candidate)
        if jd_id:
            q = q.filter(Candidate.jd_id == jd_id)
        if status:
            q = q.filter(Candidate.status == status)
        return [_candidate_to_dict(c) for c in q.order_by(Candidate.created_at.desc()).all()]


def get_candidates_for_interview_prep() -> list[dict]:
    """
    What phase1's scheduler polls: candidates phase0 shortlisted AND deemed
    match_ready, that don't have an interview_context yet (so a rerun
    doesn't regenerate context for candidates already done).
    """
    with get_session() as db:
        q = db.query(Candidate).filter(
            Candidate.status == "shortlisted",
            Candidate.match_ready == True,          # noqa: E712
            (Candidate.interview_context == None) | (Candidate.interview_context == ""),  # noqa: E711
        )
        return [_candidate_to_dict(c) for c in q.all()]


def get_ready_to_call(jd_id: str | None = None) -> list[dict]:
    """What phase2's dispatcher polls instead of a Sheet. Optionally scoped
    to one JD (the UI dials one JD's candidates at a time)."""
    with get_session() as db:
        q = db.query(Candidate).filter(
            Candidate.ready_to_call == True,          # noqa: E712
            Candidate.call_status == "pending",
        )
        if jd_id:
            q = q.filter(Candidate.jd_id == jd_id)
        return [_candidate_to_dict(c) for c in q.all()]


def get_candidate(candidate_id: str) -> dict | None:
    with get_session() as db:
        c = db.query(Candidate).filter(Candidate.candidate_id == candidate_id).first()
        return _candidate_to_dict(c) if c else None


def resume_hash_exists(resume_hash: str, jd_id: str) -> bool:
    """Idempotency guard -- avoid reprocessing/duplicating the same resume."""
    with get_session() as db:
        return db.query(Candidate).filter(
            Candidate.resume_hash == resume_hash,
            Candidate.jd_id == jd_id,
        ).first() is not None


def _candidate_to_dict(c: Candidate) -> dict:
    return {
        "candidate_id": c.candidate_id,
        "jd_id": c.jd_id,
        "jd_title": c.jd.title if c.jd else None,
        "name": c.name,
        "phone": c.phone,
        "email": c.email,
        "resume_link": c.resume_link,
        "resume_text": c.resume_text,
        "resume_summary": c.resume_summary,
        "interview_context": c.interview_context,
        "match_score": c.match_score,
        "verdict": c.verdict,
        "status": c.status,
        "match_ready": c.match_ready,
        "ready_to_call": c.ready_to_call,
        "call_status": c.call_status,
        "error_log": c.error_log,
    }


# ---------------------------------------------------------------- Evaluations

def create_evaluation(candidate_id: str, transcript: str, score: float,
                       strengths: str, weaknesses: str,
                       evaluation_summary: str, selected: bool) -> None:
    with get_session() as db:
        ev = Evaluation(
            candidate_id=candidate_id, transcript=transcript, score=score,
            strengths=strengths, weaknesses=weaknesses,
            evaluation_summary=evaluation_summary, selected=selected,
        )
        db.add(ev)
        # keep the candidate row in sync so the Shortlisted tab's status updates too
        c = db.query(Candidate).filter(Candidate.candidate_id == candidate_id).first()
        if c:
            c.status = "evaluated"
            c.call_status = "completed"
        db.commit()


def get_reports(jd_id: str | None = None) -> list[dict]:
    with get_session() as db:
        q = db.query(Evaluation).join(Candidate)
        if jd_id:
            q = q.filter(Candidate.jd_id == jd_id)
        rows = q.order_by(Evaluation.evaluated_at.desc()).all()
        return [
            {
                "candidate_id": ev.candidate_id,
                "name": ev.candidate.name,
                "jd_title": ev.candidate.jd.title if ev.candidate.jd else None,
                "evaluation_summary": ev.evaluation_summary,
                "score": ev.score,
                "selected": "Yes" if ev.selected else "No",
            }
            for ev in rows
        ]