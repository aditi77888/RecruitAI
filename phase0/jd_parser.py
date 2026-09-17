"""
Parses raw JD text (extracted from an uploaded PDF/DOCX) into the
structured fields the DB's JD table expects. Same single-structured-call
pattern as llm_evaluator.py's resume evaluation -- one Groq call, no
separate extraction pass.
"""
from __future__ import annotations
import json
from groq import Groq

from phase0.shortlist_config import GROQ_API_KEY, MODEL_CHAIN

client = Groq(api_key=GROQ_API_KEY)

SYSTEM_PROMPT = """You are extracting structured fields from a job description document.
Respond with ONLY a JSON object, no markdown fences, no preamble, matching exactly this shape:
{
  "title": "<short job title, e.g. 'Senior Backend Developer'>",
  "must_have_skills": [<string>, ...],
  "nice_to_have_skills": [<string>, ...],
  "min_experience_years": <float or null>
}

Rules:
- title should be concise, just the role name, not the full posting text.
- must_have_skills / nice_to_have_skills: extract only what's actually in the
  document -- do not invent skills that aren't mentioned.
- If minimum experience isn't stated anywhere, use null.
"""


class JDParsingError(Exception):
    pass


def parse_jd_from_text(raw_text: str) -> dict:
    """
    Returns fields ready for crud.create_jd(): title, jd_text (the full raw
    text, unshortened -- so later resume matching has the complete JD to
    work with), must_have_skills / nice_to_have_skills (comma-separated
    strings, matching the DB's storage format), min_experience.
    """
    last_error = None
    for model_name in MODEL_CHAIN:
        try:
            response = client.chat.completions.create(
                model=model_name,
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": raw_text[:8000]},
                ],
                temperature=0.1,
                response_format={"type": "json_object"},
            )
            parsed = json.loads(response.choices[0].message.content)
            return {
                "title": parsed.get("title") or "Untitled JD",
                "jd_text": raw_text,
                "must_have_skills": ", ".join(parsed.get("must_have_skills", [])),
                "nice_to_have_skills": ", ".join(parsed.get("nice_to_have_skills", [])),
                "min_experience": parsed.get("min_experience_years") or 0.0,
            }
        except Exception as e:  # noqa: BLE001 -- try next model in the chain rather than crash
            last_error = e
            continue

    raise JDParsingError(f"Could not parse JD text with any model in MODEL_CHAIN: {last_error}")