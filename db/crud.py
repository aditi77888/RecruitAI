"""
Thin CRUD layer over the models. Every phase (phase0/phase1/phase2/phase4)
and the UI call into these functions instead of writing raw SQLAlchemy
queries -- keeps the query logic in one place if the schema changes later.
"""

from datetime import datetime, timedelta

from db.database import get_session
from db.models import JD, Candidate, Evaluation

# ---------------------------------------------------------------- JDs


def create_jd(
    jd_id: str,
    title: str,
    jd_text: str,
    must_have_skills: str = "",
    nice_to_have_skills: str = "",
    min_experience: float = 0.0,
    company_id: str | None = None,
) -> None:
    with get_session() as db:
        jd = JD(
            jd_id=jd_id,
            title=title,
            jd_text=jd_text,
            must_have_skills=must_have_skills,
            nice_to_have_skills=nice_to_have_skills,
            min_experience=min_experience,
            company_id=company_id,
        )
        db.add(jd)
        db.commit()


def get_jds(company_id: str | None = None) -> list[dict]:
    """Optionally scoped to one company -- the HR dashboard only ever
    passes its own logged-in company_id; omitting it (internal/legacy use)
    returns every JD regardless of company."""
    with get_session() as db:
        q = db.query(JD)
        if company_id:
            q = q.filter(JD.company_id == company_id)
        rows = q.order_by(JD.created_at.desc()).all()
        return [_jd_to_dict(db, jd) for jd in rows]


def get_jd(jd_id: str) -> dict | None:
    with get_session() as db:
        jd = db.query(JD).filter(JD.jd_id == jd_id).first()
        return _jd_to_dict(db, jd) if jd else None


def delete_jd(jd_id: str) -> None:
    """
    Deletes a JD and everything under it (its candidates, and their
    evaluations) -- irreversible. No relationship-level cascade is
    configured on the ORM models, so this deletes bottom-up explicitly:
    evaluations -> candidates -> the JD itself.
    """
    with get_session() as db:
        candidate_ids = [
            c.candidate_id
            for c in db.query(Candidate).filter(Candidate.jd_id == jd_id).all()
        ]
        if candidate_ids:
            db.query(Evaluation).filter(
                Evaluation.candidate_id.in_(candidate_ids)
            ).delete(synchronize_session=False)
            db.query(Candidate).filter(Candidate.jd_id == jd_id).delete(
                synchronize_session=False
            )
        db.query(JD).filter(JD.jd_id == jd_id).delete(synchronize_session=False)
        db.commit()


def delete_candidates_for_jd(jd_id: str | None = None) -> int:
    """
    Deletes candidate rows (and their evaluations) WITHOUT deleting the JD
    itself -- for starting shortlisting over from scratch. If jd_id is
    None, deletes candidates for EVERY JD. Returns the count deleted.
    """
    with get_session() as db:
        q = db.query(Candidate)
        if jd_id:
            q = q.filter(Candidate.jd_id == jd_id)
        candidate_ids = [c.candidate_id for c in q.all()]
        if not candidate_ids:
            return 0
        db.query(Evaluation).filter(Evaluation.candidate_id.in_(candidate_ids)).delete(
            synchronize_session=False
        )
        db.query(Candidate).filter(Candidate.candidate_id.in_(candidate_ids)).delete(
            synchronize_session=False
        )
        db.commit()
        return len(candidate_ids)


def _jd_to_dict(db, jd: JD) -> dict:
    total = db.query(Candidate).filter(Candidate.jd_id == jd.jd_id).count()
    processed = (
        db.query(Candidate)
        .filter(
            Candidate.jd_id == jd.jd_id,
            Candidate.status != "uploaded",
        )
        .count()
    )
    progress = int((processed / total) * 100) if total else 0
    return {
        "jd_id": jd.jd_id,
        "company_id": jd.company_id,
        "company_name": jd.company.company_name if jd.company else None,
        "title": jd.title,
        "jd_text": jd.jd_text,
        "must_have_skills": jd.must_have_skills,
        "nice_to_have_skills": jd.nice_to_have_skills,
        "min_experience": jd.min_experience,
        "total_candidates": total,
        "shortlisting_progress": progress,
    }


# ---------------------------------------------------------------- Candidates


def create_candidate(
    candidate_id: str,
    jd_id: str,
    name: str = "",
    phone: str = "",
    email: str = "",
    resume_link: str = "",
    resume_text: str = "",
    resume_hash: str = "",
    candidate_account_id: str | None = None,
) -> None:
    with get_session() as db:
        c = Candidate(
            candidate_id=candidate_id,
            jd_id=jd_id,
            name=name,
            phone=phone,
            email=email,
            resume_link=resume_link,
            resume_text=resume_text,
            resume_hash=resume_hash,
            status="uploaded",
            candidate_account_id=candidate_account_id,
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


def get_candidates(
    jd_id: str | None = None, status: str | None = None, company_id: str | None = None
) -> list[dict]:
    with get_session() as db:
        q = db.query(Candidate)
        if jd_id:
            q = q.filter(Candidate.jd_id == jd_id)
        if status:
            q = q.filter(Candidate.status == status)
        if company_id:
            q = q.join(JD).filter(JD.company_id == company_id)
        return [
            _candidate_to_dict(c) for c in q.order_by(Candidate.created_at.desc()).all()
        ]


def get_applications_for_account(candidate_account_id: str) -> list[dict]:
    """
    For the candidate portal's "my applications" status view -- every JD
    this logged-in candidate has applied to, across any company, most
    recent first.
    """
    with get_session() as db:
        q = (
            db.query(Candidate)
            .filter(Candidate.candidate_account_id == candidate_account_id)
            .order_by(Candidate.created_at.desc())
        )
        return [_candidate_to_dict(c) for c in q.all()]


def get_candidates_for_interview_prep() -> list[dict]:
    """
    What phase1's scheduler polls: candidates phase0 shortlisted AND deemed
    match_ready, that don't have an interview_context yet (so a rerun
    doesn't regenerate context for candidates already done).
    """
    with get_session() as db:
        q = db.query(Candidate).filter(
            Candidate.status == "shortlisted",
            Candidate.match_ready == True,
            (Candidate.interview_context == None) | (Candidate.interview_context == ""),
        )
        return [_candidate_to_dict(c) for c in q.all()]


def get_ready_to_call(
    jd_id: str | None = None, stale_dialing_minutes: int = 10
) -> list[dict]:
    """What phase2's dispatcher polls instead of a Sheet. Optionally scoped
    to one JD (the UI dials one JD's candidates at a time).

    Retries candidates whose last attempt failed (call_status='failed'),
    not just fresh ones ('pending') -- a failed dial (bad number, trunk
    issue, Dograh error) shouldn't permanently strand a candidate.

    Also retries 'dialing' candidates once that status is stale (older than
    stale_dialing_minutes) -- 'dialing' only means Dograh's trigger endpoint
    returned HTTP 200, not that a call actually connected. If the real
    telephony call never happened (bad number, trunk issue, silently
    dropped) the candidate would otherwise be stuck in 'dialing' forever,
    since a genuinely in-progress call also looks like 'dialing'. A recent
    'dialing' (within the window) is left alone in case a call really is
    still active; only a stale one is treated as failed and retried.

    'completed' (already evaluated) is always excluded.
    """
    stale_cutoff = datetime.utcnow() - timedelta(minutes=stale_dialing_minutes)
    with get_session() as db:
        q = db.query(Candidate).filter(
            Candidate.ready_to_call == True,
            (
                Candidate.call_status.in_(["pending", "failed"])
                | (
                    (Candidate.call_status == "dialing")
                    & (Candidate.updated_at < stale_cutoff)
                )
            ),
        )
        if jd_id:
            q = q.filter(Candidate.jd_id == jd_id)
        return [_candidate_to_dict(c) for c in q.all()]


def get_candidate(candidate_id: str) -> dict | None:
    with get_session() as db:
        c = db.query(Candidate).filter(Candidate.candidate_id == candidate_id).first()
        return _candidate_to_dict(c) if c else None


def set_interview_token(candidate_id: str, token: str) -> None:
    """Assigns the opaque token used in this candidate's interview link."""
    update_candidate(candidate_id, interview_token=token)


def get_candidate_by_token(token: str) -> dict | None:
    """Looks up a candidate by their interview-link token -- what the web
    widget page uses to know who's on the other end of the link."""
    with get_session() as db:
        c = db.query(Candidate).filter(Candidate.interview_token == token).first()
        return _candidate_to_dict(c) if c else None


def resume_hash_exists(resume_hash: str, jd_id: str) -> bool:
    """Idempotency guard -- avoid reprocessing/duplicating the same resume."""
    with get_session() as db:
        return (
            db.query(Candidate)
            .filter(
                Candidate.resume_hash == resume_hash,
                Candidate.jd_id == jd_id,
            )
            .first()
            is not None
        )


def _candidate_to_dict(c: Candidate) -> dict:
    return {
        "candidate_id": c.candidate_id,
        "jd_id": c.jd_id,
        "jd_title": c.jd.title if c.jd else None,
        "company_id": c.jd.company_id if c.jd else None,
        "company_name": c.jd.company.company_name if c.jd and c.jd.company else None,
        "company_email": c.jd.company.email if c.jd and c.jd.company else None,
        "candidate_account_id": c.candidate_account_id,
        "name": c.name,
        "phone": c.phone,
        "email": c.email,
        "resume_link": c.resume_link,
        "resume_text": c.resume_text,
        "interview_token": c.interview_token,
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


def create_evaluation(
    candidate_id: str,
    transcript: str,
    score: float,
    strengths: str,
    weaknesses: str,
    evaluation_summary: str,
    selected: bool,
) -> None:
    with get_session() as db:
        ev = Evaluation(
            candidate_id=candidate_id,
            transcript=transcript,
            score=score,
            strengths=strengths,
            weaknesses=weaknesses,
            evaluation_summary=evaluation_summary,
            selected=selected,
        )
        db.add(ev)
        # keep the candidate row in sync so the Shortlisted tab's status updates too
        c = db.query(Candidate).filter(Candidate.candidate_id == candidate_id).first()
        if c:
            c.status = "evaluated"
            c.call_status = "completed"
            # Interview is genuinely done now -- disable the link so the
            # candidate can't reopen it and take the interview again.
            c.ready_to_call = False
        db.commit()


def get_reports(jd_id: str | None = None, company_id: str | None = None) -> list[dict]:
    with get_session() as db:
        q = db.query(Evaluation).join(Candidate)
        if jd_id:
            q = q.filter(Candidate.jd_id == jd_id)
        if company_id:
            q = q.join(JD, Candidate.jd_id == JD.jd_id).filter(
                JD.company_id == company_id
            )
        rows = q.order_by(Evaluation.evaluated_at.desc()).all()
        return [
            {
                "candidate_id": ev.candidate_id,
                "name": ev.candidate.name,
                "jd_title": ev.candidate.jd.title if ev.candidate.jd else None,
                "evaluation_summary": ev.evaluation_summary,
                "transcript": ev.transcript,
                "strengths": ev.strengths,
                "weaknesses": ev.weaknesses,
                "score": ev.score,
                "selected": "Yes" if ev.selected else "No",
            }
            for ev in rows
        ]
