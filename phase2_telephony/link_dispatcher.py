"""
Replaces the phone-dial dispatcher now that we don't have telephony access.
For every ready_to_call candidate, generates (or reuses) a unique interview
link and emails it -- the candidate clicks it whenever they're free and
talks to the same Dograh agent through the browser widget instead of a call.

Reuses call_status='dialing' to mean "link sent, awaiting the candidate" --
not literally dialing anymore, but this keeps the existing retry machinery
(crud.get_ready_to_call's stale-dialing retry) working with no schema
change. A link resend only happens after config.LINK_RESEND_AFTER_MINUTES
(default 3 days), not the short window used for real phone retries --
we don't want to spam a candidate's inbox with the same link every run.

Usage:
    python -m phase2_telephony.link_dispatcher [--jd-id JD_ID]
"""

import argparse
import secrets

from loguru import logger

from phase2_telephony import config, db_client
from phase2_telephony.notifier import send_interview_link_email


def _build_link(token: str) -> str:
    return f"{config.INTERVIEW_LINK_BASE_URL}?token={token}"


def dispatch_interview_links(jd_id: str | None = None) -> dict:
    candidates = db_client.get_ready_to_call_candidates(
        jd_id, stale_dialing_minutes=config.LINK_RESEND_AFTER_MINUTES
    )
    logger.info(f"Found {len(candidates)} candidate(s) ready for an interview link.")

    sent, skipped, failed = 0, 0, 0
    for candidate in candidates:
        candidate_id = candidate["candidate_id"]
        name = candidate.get("name") or "there"
        email = candidate.get("email")

        if not email:
            logger.warning(f"Skipping {name} ({candidate_id}) -- no email on file.")
            skipped += 1
            continue

        # Reuse the existing token if this candidate already has one (so a
        # resend doesn't invalidate a link they may have saved), otherwise
        # generate a fresh opaque one.
        token = candidate.get("interview_token") or secrets.token_urlsafe(24)
        if not candidate.get("interview_token"):
            db_client.set_interview_token(candidate_id, token)

        link = _build_link(token)
        try:
            send_interview_link_email(
                email,
                name,
                link,
                company_name=candidate.get("company_name") or "",
                job_role=candidate.get("jd_title") or "",
                company_email=candidate.get("company_email") or "",
            )
            db_client.update_call_status(candidate_id, "dialing")
            logger.info(f"Interview link sent to {name}: {link}")
            sent += 1
        except Exception as e:
            db_client.update_call_status(candidate_id, "failed", error_log=str(e))
            logger.error(f"Failed to send interview link to {name}: {e}")
            failed += 1

    return {"sent": sent, "skipped_no_email": skipped, "failed": failed}


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--jd-id", required=False, default=None)
    args = parser.parse_args()

    result = dispatch_interview_links(args.jd_id)
    logger.info(f"Done: {result}")
