"""
Stage 2: LLM judged evaluation. Only resumes that passed the embedding
filter reach here. One structured call per (resume, jd) pair returns
score + summary + ready_to_call together -- same "single judged call"
pattern as Compliance Master's obligation checker.
"""

from __future__ import annotations

import json
import time

from groq import APIStatusError, Groq, RateLimitError

from phase0.models import JDRecord, ResumeEvaluation, ResumeRecord
from phase0.shortlist_config import (
    GROQ_API_KEY,
    MODEL_CHAIN,
    READY_TO_CALL_SCORE_THRESHOLD,
    SHORTLIST_SCORE_THRESHOLD,
)

client = Groq(api_key=GROQ_API_KEY)

SYSTEM_PROMPT = """You are a technical recruiter screening resumes against a job description.
Evaluate strictly on evidence in the resume text -- do not assume skills that aren't stated
or clearly implied. Be skeptical of keyword-stuffed resumes; look for actual project/work
evidence of each skill.

Also extract the candidate's contact details if they appear anywhere in the resume text
(usually near the top -- header/contact block). If a field genuinely isn't present, use null;
do not guess or fabricate a name/phone/email.

Respond with ONLY a JSON object, no markdown fences, no preamble, matching exactly this shape:
{
  "candidate_name": <string or null>,
  "candidate_phone": <string or null>,
  "candidate_email": <string or null>,
  "match_score": <float 0-100>,
  "matched_skills": [<string>, ...],
  "missing_skills": [<string>, ...],
  "experience_years_estimate": <float or null>,
  "resume_summary": "<2-4 sentence summary of the candidate, written for a recruiter who has not read the resume>",
  "reasoning_note": "<1-2 sentence internal note on why this score>"
}"""

USER_PROMPT_TEMPLATE = """JOB DESCRIPTION ({jd_title}):
{jd_text}

Must-have skills: {must_have}
Nice-to-have skills: {nice_to_have}
Minimum experience: {min_exp} years

---

CANDIDATE RESUME:
{resume_text}
"""


def _build_user_prompt(resume: ResumeRecord, jd: JDRecord) -> str:
    return USER_PROMPT_TEMPLATE.format(
        jd_title=jd.title,
        jd_text=jd.raw_text,
        must_have=", ".join(jd.must_have_skills) or "none specified",
        nice_to_have=", ".join(jd.nice_to_have_skills) or "none specified",
        min_exp=jd.min_experience_years or "not specified",
        resume_text=resume.raw_text,
    )


def evaluate_resume(
    resume: ResumeRecord,
    jd: JDRecord,
    max_retries_per_model: int = 2,
    shortlist_threshold: float | None = None,
    ready_to_call_threshold: float | None = None,
) -> ResumeEvaluation:
    """
    Runs the structured eval call, falling back through MODEL_CHAIN on
    rate-limit or transient errors. Raises if every model in the chain fails.

    shortlist_threshold / ready_to_call_threshold: pass the calling
    company's own HR-adjustable threshold (Company.shortlist_threshold) --
    falls back to the global config default when not provided (e.g. the
    old CLI/test path with no company context).
    """
    shortlist_threshold = (
        SHORTLIST_SCORE_THRESHOLD
        if shortlist_threshold is None
        else shortlist_threshold
    )
    ready_to_call_threshold = (
        READY_TO_CALL_SCORE_THRESHOLD
        if ready_to_call_threshold is None
        else ready_to_call_threshold
    )

    user_prompt = _build_user_prompt(resume, jd)
    last_error = None

    for model_name in MODEL_CHAIN:
        for attempt in range(max_retries_per_model):
            try:
                response = client.chat.completions.create(
                    model=model_name,
                    messages=[
                        {"role": "system", "content": SYSTEM_PROMPT},
                        {"role": "user", "content": user_prompt},
                    ],
                    temperature=0.1,
                    response_format={"type": "json_object"},
                )
                raw = response.choices[0].message.content
                parsed = json.loads(raw)

                score = float(parsed["match_score"])
                # verdict is decided deterministically from the score, not
                # by the LLM's own judgment -- guarantees "score > threshold
                # = shortlisted" always holds, rather than depending on the
                # model's own (sometimes inconsistent) classification.
                ready = score > ready_to_call_threshold
                verdict = "shortlist" if score > shortlist_threshold else "reject"

                return ResumeEvaluation(
                    resume_hash=resume.resume_hash,
                    jd_id=jd.jd_id,
                    candidate_name=parsed.get("candidate_name")
                    or resume.candidate_name,
                    candidate_phone=parsed.get("candidate_phone"),
                    candidate_email=parsed.get("candidate_email"),
                    match_score=score,
                    verdict=verdict,
                    matched_skills=parsed.get("matched_skills", []),
                    missing_skills=parsed.get("missing_skills", []),
                    experience_years_estimate=parsed.get("experience_years_estimate"),
                    resume_summary=parsed.get("resume_summary", ""),
                    ready_to_call=ready,
                    reasoning_note=parsed.get("reasoning_note", ""),
                    model_used=model_name,
                )

            except RateLimitError as e:
                last_error = e
                time.sleep(2**attempt)  # backoff, then fall through to next model
                continue
            except (APIStatusError, json.JSONDecodeError, KeyError, ValueError) as e:
                last_error = e
                continue  # try next attempt / model rather than crashing the batch

    raise RuntimeError(
        f"All models in MODEL_CHAIN failed for resume={resume.resume_hash} jd={jd.jd_id}: {last_error}"
    )
