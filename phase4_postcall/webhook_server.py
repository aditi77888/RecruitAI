"""FastAPI server exposing the post-call webhook endpoint for Dograh's
Webhook node. Configure a Webhook node at the end of your workflow (after
the End Call nodes, or as a workflow-level "on call end" webhook if Dograh
offers that) pointing to:

    https://<your-ngrok-domain>/postcall/webhook

with a JSON payload template like:
    {
      "workflow_run_id": "{{workflow_run_id}}",
      "candidate_id": "{{initial_context.candidate_id}}",
      "candidate_name": "{{initial_context.candidate_name}}",
      "resume_summary": "{{initial_context.resume_summary}}",
      "duration": "{{cost_info.call_duration_seconds}}",
      "recording_url": "{{recording_url}}",
      "transcript_url": "{{transcript_url}}"
    }

⚠️ UNVERIFIED: whether transcript_url needs auth (and which header) to fetch
isn't confirmed yet -- this tries X-API-Key first. Check the actual webhook
payload Dograh sends (logged below) and adjust _fetch_transcript if needed.

Runs on its own port (config.POSTCALL_SERVER_PORT) — needs its own ngrok
tunnel (a second `ngrok http <port>` in a separate terminal), separate from
whatever tunnel forwards to Dograh's own backend.
"""

import httpx
from fastapi import FastAPI, Request
from loguru import logger

from phase4_postcall import config, db_client, evaluator, notifier

app = FastAPI()


async def _fetch_transcript(transcript_url: str) -> str:
    headers = {"X-API-Key": config.DOGRAH_API_KEY}
    # follow_redirects=True: Dograh's transcript URL 302s to its own file
    # server (e.g. localhost:9000/voice-audio/transcripts/<id>.txt) --
    # httpx does NOT follow redirects by default, so without this the
    # request just returns the 302 itself instead of the transcript.
    async with httpx.AsyncClient(timeout=30, follow_redirects=True) as client:
        response = await client.get(transcript_url, headers=headers)
    response.raise_for_status()
    # Assumes plain text or JSON with a text field — adjust once you see the
    # real response shape from a test call.
    content_type = response.headers.get("content-type", "")
    if "application/json" in content_type:
        data = response.json()
        # common shapes: {"transcript": "..."} or a list of turns
        if isinstance(data, dict) and "transcript" in data:
            return data["transcript"]
        return str(data)
    return response.text


@app.post("/postcall/webhook")
async def postcall_webhook(request: Request):
    body = await request.json()
    logger.info(f"[postcall-webhook] raw payload: {body}")

    candidate_id = body.get("candidate_id")
    candidate_name = body.get("candidate_name", "the candidate")
    transcript_url = body.get("transcript_url")

    if not candidate_id:
        logger.error("[postcall-webhook] missing candidate_id, cannot process")
        return {"status": "error", "detail": "missing candidate_id"}

    candidate = db_client.get_candidate_by_id(candidate_id)
    if not candidate:
        logger.error(
            f"[postcall-webhook] no candidate found for candidate_id={candidate_id}"
        )
        return {"status": "error", "detail": "candidate not found in DB"}

    # Prefer whatever Dograh echoed back in the webhook payload; fall back to
    # the DB's own interview_context if the webhook payload came back empty
    # for some reason (e.g. a workflow-level webhook that doesn't forward
    # initial_context).
    resume_summary = body.get("resume_summary") or candidate.get(
        "interview_context", ""
    )

    if not transcript_url:
        logger.error(
            f"[postcall-webhook] no transcript_url in payload for {candidate_name}"
        )
        return {"status": "error", "detail": "missing transcript_url"}

    try:
        transcript_text = await _fetch_transcript(transcript_url)
    except Exception as e:
        logger.error(f"[postcall-webhook] failed to fetch transcript: {e}")
        return {"status": "error", "detail": f"transcript fetch failed: {e}"}

    try:
        result = await evaluator.evaluate_transcript(
            candidate_name,
            resume_summary,
            transcript_text,
            call_disposition=body.get("call_disposition", ""),
        )
    except Exception as e:
        logger.error(f"[postcall-webhook] evaluation failed for {candidate_name}: {e}")
        return {"status": "error", "detail": f"evaluation failed: {e}"}

    outcome = result["call_outcome"]

    if outcome == "reschedule_requested":
        note = result.get("reschedule_note") or "Candidate asked to be called back."
        db_client.requeue_for_retry(
            candidate_id,
            status="reschedule_requested",
            note=note,
            call_status="pending",
        )
        logger.info(
            f"{candidate_name} asked to reschedule ({note}). Requeued for a future dispatch run."
        )
        return {"status": "success", "outcome": outcome}

    if outcome == "disconnected_early":
        note = f"Call disconnected early (disposition: {body.get('call_disposition', 'unknown')})."
        db_client.requeue_for_retry(
            candidate_id, status="call_disconnected", note=note, call_status="failed"
        )
        logger.info(f"{candidate_name}'s call disconnected early. Requeued for retry.")
        return {"status": "success", "outcome": outcome}

    if outcome == "declined":
        note = (
            result.get("summary") or "Candidate declined to continue with the process."
        )
        db_client.mark_declined(candidate_id, note)
        logger.info(f"{candidate_name} declined the process. Will not be retried.")
        return {"status": "success", "outcome": outcome}

    # completed_interview or unclear -- treat as a real, evaluable interview
    db_client.write_evaluation(
        candidate_id=candidate_id,
        transcript=transcript_text,
        score=result["score"],
        strengths=result["strengths"],
        weaknesses=result["weaknesses"],
        shortlist=result["shortlist"],
        summary=result["summary"],
    )
    logger.info(
        f"Evaluation written for {candidate_name}: score={result['score']}, shortlist={result['shortlist']}"
    )

    if result["shortlist"]:
        candidate_email = candidate.get("email")
        if candidate_email:
            try:
                notifier.send_shortlist_email(
                    candidate_email,
                    candidate_name,
                    company_name=candidate.get("company_name") or "",
                    job_role=candidate.get("jd_title") or "",
                    company_email=candidate.get("company_email") or "",
                )
            except Exception as e:
                logger.error(f"Failed to send shortlist email to {candidate_name}: {e}")
        else:
            logger.warning(
                f"{candidate_name} shortlisted but has no email on file — skipping notification."
            )

    return {"status": "success", "outcome": outcome}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=config.POSTCALL_SERVER_PORT)
