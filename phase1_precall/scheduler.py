"""
Polls the DB for candidates phase0 shortlisted and deemed match_ready,
runs each one through interview-context generation, writes results back.

One candidate's failure never stops the batch -- it's marked
'interview_context_error' with a message and processing continues with
the next one.
"""

import json
import logging
from pathlib import Path

from apscheduler.schedulers.blocking import BlockingScheduler

import config
import db_client
from resume_extractor import extract_text, fetch_and_extract, ExtractionError
from summarizer import generate_summary, SummarizationError

logger = logging.getLogger(__name__)


def _get_resume_text(candidate: dict) -> str:
    """
    Fast path: phase0 already extracted this resume's text into the DB.
    Fallback path: only hit if resume_text is somehow empty -- re-extract
    from resume_link (local path, or a Drive link if that's how this
    candidate's resume arrived).
    """
    if candidate.get("resume_text"):
        return candidate["resume_text"]

    resume_link = (candidate.get("resume_link") or "").strip()
    if not resume_link:
        raise ExtractionError(
            "No resume_text in the DB and no resume_link to fall back on."
        )

    if "drive.google.com" in resume_link:
        return fetch_and_extract(resume_link, candidate["candidate_id"])

    local_path = Path(resume_link)
    if local_path.exists():
        return extract_text(local_path)

    raise ExtractionError(f"resume_link '{resume_link}' is neither a Drive link nor an existing local file.")


def process_pending_candidates() -> None:
    pending = db_client.get_pending_candidates()

    if not pending:
        logger.info("No candidates pending interview-context generation.")
        return

    logger.info("Found %d candidate(s) needing interview context.", len(pending))

    for candidate in pending:
        candidate_id = candidate["candidate_id"]
        name = candidate.get("name") or candidate_id

        db_client.mark_processing(candidate_id)
        logger.info("Processing candidate: %s (%s)", name, candidate_id)

        try:
            resume_text = _get_resume_text(candidate)
            summary = generate_summary(resume_text)
            db_client.mark_ready(candidate_id, json.dumps(summary, ensure_ascii=False))
            logger.info("Interview context ready for %s", name)
        except (ExtractionError, SummarizationError) as e:
            logger.error("Failed to process %s: %s", name, e)
            db_client.mark_error(candidate_id, str(e))
        except Exception as e:  # noqa: BLE001 - safety net so one bad row can't kill the batch job
            logger.exception("Unexpected error processing %s", name)
            db_client.mark_error(candidate_id, f"Unexpected error: {e}")


def run_scheduler() -> None:
    scheduler = BlockingScheduler()
    scheduler.add_job(
        process_pending_candidates,
        "interval",
        minutes=config.POLL_INTERVAL_MINUTES,
    )
    logger.info("Scheduler started, polling every %d minute(s).", config.POLL_INTERVAL_MINUTES)
    scheduler.start()