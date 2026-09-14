# Phase 1 — Resume ingestion, extraction & summary generation

## Mental model

Google Sheet is the single source of truth, matched to your Google Form.
This script never assumes column *order* — it reads the header row (row 1)
by *name*, so you can reorder or add columns freely without breaking anything.

Flow: `pending row -> download resume from Drive -> extract text (OCR if scanned)
-> Groq LLM builds structured JSON summary -> write summary + status back to the same row`

One row failing (bad link, unreadable file, LLM hiccup) never stops the batch —
it's marked `error` with a message in `error_message`, and the loop moves on.

## 1. Google Sheet setup

Create a sheet (or use the one linked to your Google Form) with this exact
header row (order doesn't matter, names do):

```
candidate_name | phone | resume_link | status | resume_summary | error_message | last_updated
```

Leave `status` empty for new rows — the script treats empty and `pending` the same way.

If resumes come from a Google Form with a file-upload question, Google
auto-populates `resume_link` with a Drive share link on form submit — you
don't need to do anything extra there.

## 2. Google Cloud service account (for gspread + Drive access)

1. Go to console.cloud.google.com, create/select a project.
2. Enable **Google Sheets API** and **Google Drive API**.
3. Create a **Service Account**, then create a JSON key for it — this downloads
   as a file, save it as `credentials.json` in this project folder.
4. Open the JSON file, copy the `client_email` value.
5. Share your Google Sheet **and** the Drive folder containing resumes with
   that email address (Viewer is enough for Drive, Editor needed for the Sheet).

## 3. Groq API key

Get a free key at console.groq.com. Check console.groq.com/docs/models for
the current list of available free models — `GROQ_MODEL` in `.env` may need
updating if the model name in this repo has since been deprecated.

## 4. System dependencies (for OCR fallback on scanned resumes)

You're on Windows, so:

- **Tesseract OCR**: install from the UB-Mannheim Windows build
  (github.com/UB-Mannheim/tesseract/wiki), then add its install folder
  (e.g. `C:\Program Files\Tesseract-OCR`) to your system PATH.
- **Poppler**: download a Windows build (e.g. from the `oschwartz10612/poppler-windows`
  releases on GitHub), extract it, and add its `bin` folder to PATH.
- Restart PyCharm / your terminal after editing PATH so it picks up the change.

Skip this step if all your resumes are digital PDFs/DOCX (not scanned images) —
the OCR path only triggers when normal text extraction returns almost nothing.

## 5. Install & configure

```bash
pip install -r requirements.txt
copy .aenvv.example .aenvv
```

Edit `.env` with your real `GOOGLE_SHEET_ID` (the long ID in the sheet's URL)
and `GROQ_API_KEY`. Make sure `credentials.json` sits in this folder (or update
`GOOGLE_SHEETS_CREDENTIALS_PATH` to point elsewhere).

## 6. Run

```bash
python main.py --once     # single pass — good for testing on 1-2 rows first
python main.py            # continuous polling every POLL_INTERVAL_MINUTES
```

Watch the console logs — each candidate logs as processing, then ready/error.
Check the sheet: `status` should flip to `ready_to_call` and `resume_summary`
should be filled with the structured JSON.

## Files

| File | Responsibility |
|---|---|
| `config.py` | Loads all settings from `.env`, defines sheet column names/status values |
| `sheets_client.py` | Reads pending rows, writes status/summary back — by header name |
| `resume_extractor.py` | Drive link -> file bytes -> extracted text (+ OCR fallback) |
| `summarizer.py` | Extracted text -> structured JSON summary via Groq |
| `scheduler.py` | Ties it together, runs as a periodic job with per-row error isolation |
| `main.py` | Entry point — `--once` for a single test pass, or continuous polling |

## Next (Phase 2 preview)

The `resume_summary` JSON written into each row is exactly what gets pulled
by Smartflo's dynamic endpoint / Dograh's pre-call data fetch and injected
into the agent's prompt when the outbound call is triggered — no format
changes needed between phases.