"""
Downloads a resume from a Google Drive share link and extracts plain text.

Mental model:
  Drive link -> raw bytes -> sniff real file type -> extracted text
  - Digital PDFs/DOCX: extracted directly, near-instant.
  - Scanned/image-only PDFs: pdfplumber returns almost no text, so we
    fall back to OCR (pytesseract) on rendered page images.

We sniff the actual file type from its bytes (PDF magic bytes / zip header)
rather than trusting a file extension, because Drive links don't reliably
tell you the type up front.

This keeps phase 1 self-contained (no external OCR API dependency yet) —
swap in Mistral OCR or your Document Intelligence fallback chain later if
accuracy on scanned resumes isn't good enough.
"""

import logging
import re
from pathlib import Path

import pdfplumber
import requests
from docx import Document

import config

logger = logging.getLogger(__name__)

DRIVE_ID_PATTERNS = [
    r"/file/d/([a-zA-Z0-9_-]+)",
    r"[?&]id=([a-zA-Z0-9_-]+)",
]

MIN_CHARS_FOR_DIGITAL_PDF = 200  # below this, assume the PDF is scanned/image-only


class ExtractionError(Exception):
    pass


def extract_drive_file_id(link: str) -> str:
    for pattern in DRIVE_ID_PATTERNS:
        match = re.search(pattern, link)
        if match:
            return match.group(1)
    raise ExtractionError(f"Could not parse a Google Drive file ID from link: {link}")


def download_drive_file(file_id: str) -> bytes:
    """
    Downloads a Drive file accessible to the service account (or public link),
    handling the 'confirm token' Google adds for larger files.
    """
    session = requests.Session()
    base_url = "https://drive.google.com/uc?export=download"

    response = session.get(base_url, params={"id": file_id})
    token = next((v for k, v in response.cookies.items() if k.startswith("download_warning")), None)
    if token:
        response = session.get(base_url, params={"id": file_id, "confirm": token})

    if response.status_code != 200:
        raise ExtractionError(f"Drive download failed with status {response.status_code}")

    return response.content


def _sniff_extension(content: bytes) -> str:
    if content[:4] == b"%PDF":
        return ".pdf"
    if content[:2] == b"PK":  # .docx is a zip archive
        return ".docx"
    raise ExtractionError("Downloaded file is neither a PDF nor a DOCX (unrecognized format).")


def _extract_pdf_text(path: Path) -> str:
    text_parts = []
    with pdfplumber.open(path) as pdf:
        for page in pdf.pages:
            text_parts.append(page.extract_text() or "")
    text = "\n".join(text_parts).strip()

    if len(text) < MIN_CHARS_FOR_DIGITAL_PDF:
        logger.info("PDF looks scanned (only %d chars extracted), falling back to OCR", len(text))
        text = _ocr_pdf(path)

    return text


def _ocr_pdf(path: Path) -> str:
    try:
        import pytesseract
        from pdf2image import convert_from_path
    except ImportError as e:
        raise ExtractionError(
            "OCR fallback needs pytesseract + pdf2image, plus the system packages "
            "Tesseract OCR and Poppler installed. See README.md."
        ) from e

    images = convert_from_path(str(path))
    ocr_text = [pytesseract.image_to_string(image) for image in images]
    return "\n".join(ocr_text).strip()


def _extract_docx_text(path: Path) -> str:
    doc = Document(path)
    return "\n".join(p.text for p in doc.paragraphs if p.text.strip())


def extract_text(path: Path) -> str:
    suffix = path.suffix.lower()
    if suffix == ".pdf":
        text = _extract_pdf_text(path)
    elif suffix in (".docx", ".doc"):
        text = _extract_docx_text(path)
    else:
        raise ExtractionError(f"Unsupported resume file type: {suffix}")

    if not text.strip():
        raise ExtractionError("No text could be extracted from the resume (empty result).")

    return text


def fetch_and_extract(resume_link: str, candidate_id: str) -> str:
    """
    End-to-end: Drive link -> downloaded file -> extracted text.
    candidate_id is used only to name the local temp file uniquely.
    """
    file_id = extract_drive_file_id(resume_link)
    content = download_drive_file(file_id)
    ext = _sniff_extension(content)

    dest = config.DOWNLOAD_DIR / f"{candidate_id}{ext}"
    dest.parent.mkdir(parents=True, exist_ok=True)
    with open(dest, "wb") as f:
        f.write(content)

    return extract_text(dest)