"""
Turns raw resume text into a structured JSON summary via Groq (free-tier LLM).

This JSON becomes the dynamic variable injected into the voice agent later
(Phase 2), so the schema here is deliberately fixed and stable — the agent's
prompt will reference these exact field names.
"""

import json
import logging
import re

from groq import Groq

import config

logger = logging.getLogger(__name__)

_client = Groq(api_key=config.GROQ_API_KEY)

SUMMARY_SCHEMA_INSTRUCTIONS = """
You are analyzing a candidate's resume for an upcoming AI-conducted phone interview.
Return ONLY a single valid JSON object (no markdown fences, no commentary) with this exact shape:

{
  "candidate_name": string,
  "total_experience_years": number,
  "skills": [string],
  "education": [{"degree": string, "institution": string, "year": string}],
  "work_experience": [{"role": string, "company": string, "duration": string, "summary": string}],
  "projects": [{"name": string, "description": string, "tech_stack": [string]}],
  "certifications": [string],
  "notable_achievements": [string],
  "suggested_focus_areas": [string]
}

Rules:
- If a field is not present in the resume, use an empty list [] or empty string "" — never invent data.
- suggested_focus_areas should be 3-5 short phrases naming the topics an interviewer
  should probe deepest (e.g. "RAG pipeline design", "Postgres query optimization").
- Keep every string concise — this will be read aloud by a voice agent, not displayed as text.
"""


class SummarizationError(Exception):
    pass


def _strip_json_fences(text: str) -> str:
    text = text.strip()
    text = re.sub(r"^```(json)?", "", text).strip()
    text = re.sub(r"```$", "", text).strip()
    return text


def generate_summary(resume_text: str) -> dict:
    # Truncate very long resumes to stay well within free-tier token limits.
    prompt = f'{SUMMARY_SCHEMA_INSTRUCTIONS}\n\nResume text:\n"""\n{resume_text[:12000]}\n"""'

    response = _client.chat.completions.create(
        model=config.GROQ_MODEL,
        messages=[
            {"role": "system", "content": "You output only valid JSON, nothing else."},
            {"role": "user", "content": prompt},
        ],
        temperature=0.2,
    )

    raw = response.choices[0].message.content
    cleaned = _strip_json_fences(raw)

    try:
        return json.loads(cleaned)
    except json.JSONDecodeError as e:
        # Last-ditch attempt: grab the outermost {...} block in case the
        # model added stray text around the JSON despite instructions.
        match = re.search(r"\{.*\}", cleaned, re.DOTALL)
        if match:
            try:
                return json.loads(match.group(0))
            except json.JSONDecodeError:
                pass
        raise SummarizationError(f"LLM did not return valid JSON: {e}\nRaw output: {raw[:300]}")