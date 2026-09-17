"""
Normalizes raw resume files (PDF/DOCX/scanned images) into clean text,
cached by content hash so reruns don't reprocess unchanged files.

This is intentionally a thin wrapper -- plug in your existing Document
Intelligence pipeline here (DeepSeek -> Qwen -> Kimi -> Mistral OCR
fallback + pre-OCR quality gate) rather than reimplementing it.
"""
from __future__ import annotations
import hashlib
import json
import os
import sys
from pathlib import Path
from datetime import datetime, timezone

from phase0.shortlist_config import RESUME_INCOMING_DIR, TEXT_CACHE_DIR
from phase0.models import ResumeRecord

# phase1_precall/ is a sibling directory -- reuse its extract_text(path)
# (PDF/DOCX extraction with pdfplumber + pytesseract OCR fallback for
# scanned resumes) instead of reimplementing OCR here.
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "phase1_precall"))
from phase1_precall.resume_extractor import extract_text as _extract_text_local_file


def extract_text_with_ocr_fallback(file_path: str) -> str:
    return _extract_text_local_file(Path(file_path))


def _file_hash(file_path: str) -> str:
    h = hashlib.sha256()
    with open(file_path, "rb") as f:
        for chunk in iter(lambda: f.read(8192), b""):
            h.update(chunk)
    return h.hexdigest()


def _cache_path(resume_hash: str) -> str:
    os.makedirs(TEXT_CACHE_DIR, exist_ok=True)
    return os.path.join(TEXT_CACHE_DIR, f"{resume_hash}.json")


def process_resume_file(file_path: str) -> ResumeRecord:
    """
    Extracts text (or loads from cache if this exact file was seen before)
    and returns a ResumeRecord.
    """
    resume_hash = _file_hash(file_path)
    cache_path = _cache_path(resume_hash)

    if os.path.exists(cache_path):
        with open(cache_path, "r", encoding="utf-8") as f:
            cached = json.load(f)
        return ResumeRecord(**cached)

    raw_text = extract_text_with_ocr_fallback(file_path)

    record = ResumeRecord(
        resume_hash=resume_hash,
        candidate_name=None,  # optionally parse from text with a quick LLM/regex pass
        file_path=file_path,
        raw_text=raw_text,
        extracted_at=datetime.now(timezone.utc).isoformat(),
    )

    with open(cache_path, "w", encoding="utf-8") as f:
        f.write(record.model_dump_json())

    return record


def load_all_resumes(incoming_dir: str = RESUME_INCOMING_DIR) -> list[ResumeRecord]:
    """CLI/batch path -- scans a whole directory. Used by the old CLI flow."""
    supported_ext = (".pdf", ".docx", ".doc", ".png", ".jpg", ".jpeg")
    records = []
    for fname in sorted(os.listdir(incoming_dir)):
        if fname.lower().endswith(supported_ext):
            records.append(process_resume_file(os.path.join(incoming_dir, fname)))
    return records


def process_resume_files(file_paths: list[str]) -> list[ResumeRecord]:
    """
    UI path -- processes exactly the files just uploaded for one
    "Send to Shortlisting" click, instead of rescanning a whole directory
    (which would re-touch old files already shortlisted in a prior batch).
    """
    return [process_resume_file(fp) for fp in file_paths]