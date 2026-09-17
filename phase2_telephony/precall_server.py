"""FastAPI server exposing the pre-call data fetch endpoint for Dograh's
Start Call node. Runs entirely on localhost — no ngrok needed, since Dograh's
own backend calls this directly on the same machine.

⚠️ UNVERIFIED: the exact request body Dograh sends is unknown until you see
a real request hit this endpoint. The /precall-context route below logs the
raw body on every call and tries a few plausible key names — check your
console output on the first real test call and tighten _extract_candidate_id
once you see the actual shape.
"""

from fastapi import FastAPI, Request
from loguru import logger

from . import config, db_client

app = FastAPI()


def _extract_candidate_id(body: dict) -> str | None:
    for key in ("candidate_id", "candidateId", "id"):
        if key in body:
            return str(body[key])
    initial_context = body.get("initial_context") or {}
    return initial_context.get("candidate_id")


@app.post("/precall-context")
async def precall_context(request: Request):
    body = await request.json()
    logger.info(f"[precall-context] raw request body: {body}")

    candidate_id = _extract_candidate_id(body)
    if not candidate_id:
        logger.warning("[precall-context] could not find candidate_id in request body")
        return {"template_variables": {}}

    candidate = db_client.get_candidate_by_id(candidate_id)
    if not candidate:
        logger.warning(f"[precall-context] no candidate found for id={candidate_id}")
        return {"template_variables": {}}

    return {
        "template_variables": {
            "candidate_name": candidate.get("name", ""),
            # interview_context (phase1's rich JSON), not resume_summary
            # (phase0's short recruiter blurb) -- same reasoning as dispatcher.py
            "resume_summary": candidate.get("interview_context", ""),
        }
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=config.PRECALL_SERVER_PORT)