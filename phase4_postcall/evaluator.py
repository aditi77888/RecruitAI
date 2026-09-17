"""Evaluates an interview transcript using Groq, producing a structured
score + strengths/weaknesses + shortlist recommendation -- plus a
call_outcome classification so the webhook can route disconnected calls,
reschedule requests, and declines differently from a real completed
interview."""

import json

import httpx
from loguru import logger

from phase4_postcall import config

GROQ_CHAT_URL = "https://api.groq.com/openai/v1/chat/completions"

_SYSTEM_PROMPT = """You are a hiring screener evaluating a short AI-conducted \
phone screening interview transcript. You will be given the candidate's resume \
summary, the raw technical call-disposition Dograh reported (how the call \
technically ended), and the interview transcript. Produce a fair, honest \
evaluation AND classify what actually happened on the call.

Respond with ONLY a JSON object (no markdown, no extra text) in exactly this shape:
{
  "call_outcome": "completed_interview" | "reschedule_requested" | "declined" | "disconnected_early" | "unclear",
  "reschedule_note": "<if call_outcome is reschedule_requested, what the candidate said about timing, in their own words -- else empty string>",
  "score": <integer 0-100>,
  "strengths": "<2-3 sentence summary of strengths shown in the interview>",
  "weaknesses": "<2-3 sentence summary of weaknesses or gaps>",
  "shortlist": <true or false>,
  "summary": "<1-2 sentence overall verdict>"
}

call_outcome definitions:
- "completed_interview": the candidate actually answered interview questions, even if briefly. Score this normally.
- "reschedule_requested": the candidate explicitly asked to be called at another time (busy right now, "call me later", etc.) -- little or no real interview content.
- "declined": the candidate said they're not interested / want to withdraw from the process.
- "disconnected_early": the call dropped, went silent, or ended abruptly (e.g. network issue, hung up without explanation) before any real interview conversation happened. Use this over "unclear" whenever the technical call_disposition suggests an abrupt/incomplete end AND the transcript has little real content.
- "unclear": none of the above clearly fits -- fall back to evaluating whatever transcript content exists.

For any call_outcome other than "completed_interview", still fill score/strengths/weaknesses/shortlist/summary as best you can from what little content exists (score low, shortlist false, summary should explain why e.g. "Call disconnected before interview could begin") -- these fields must never be omitted.

Base "shortlist" on whether this candidate seems worth moving to the next \
round given what they said — be honest, not falsely encouraging. If the \
transcript is too short, garbled, or the candidate didn't really engage, \
score low and set shortlist to false rather than guessing generously."""


async def evaluate_transcript(
    candidate_name: str,
    resume_summary: str,
    transcript_text: str,
    call_disposition: str = "",
) -> dict:
    """Returns a dict: {call_outcome, reschedule_note, score, strengths,
    weaknesses, shortlist, summary}. Raises ValueError if Groq's response
    isn't parseable JSON or is missing required keys."""
    user_content = (
        f"Candidate name: {candidate_name}\n\n"
        f"Resume summary: {resume_summary}\n\n"
        f"Technical call_disposition reported by the telephony platform: {call_disposition or 'not provided'}\n\n"
        f"Interview transcript:\n{transcript_text}"
    )

    headers = {
        "Authorization": f"Bearer {config.GROQ_API_KEY}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": config.GROQ_MODEL,
        "messages": [
            {"role": "system", "content": _SYSTEM_PROMPT},
            {"role": "user", "content": user_content},
        ],
        "temperature": 0.3,
        "response_format": {"type": "json_object"},
    }

    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.post(GROQ_CHAT_URL, json=payload, headers=headers)
    response.raise_for_status()

    raw_text = response.json()["choices"][0]["message"]["content"]
    try:
        result = json.loads(raw_text)
    except json.JSONDecodeError as e:
        logger.error(f"Groq returned non-JSON evaluation: {raw_text!r}")
        raise ValueError(f"Could not parse evaluation JSON: {e}") from e

    required_keys = {
        "call_outcome",
        "score",
        "strengths",
        "weaknesses",
        "shortlist",
        "summary",
    }
    if not required_keys.issubset(result.keys()):
        raise ValueError(f"Evaluation JSON missing keys, got: {result.keys()}")

    result.setdefault("reschedule_note", "")
    return result
