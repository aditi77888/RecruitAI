"""Thin wrapper around the same Google Sheet — looks up a candidate by id
and writes evaluation results back to their row."""

from typing import Optional

import gspread
from google.oauth2.service_account import Credentials

from . import config

_SCOPES = ["https://www.googleapis.com/auth/spreadsheets"]


def _get_worksheet():
    creds = Credentials.from_service_account_file(
        config.GOOGLE_CREDENTIALS_PATH, scopes=_SCOPES
    )
    client = gspread.authorize(creds)
    sheet = client.open_by_key(config.SHEET_ID)
    return sheet.worksheet(config.SHEET_WORKSHEET_NAME)


def get_candidate_by_id(candidate_id: str) -> Optional[dict]:
    ws = _get_worksheet()
    records = ws.get_all_records()
    for i, row in enumerate(records, start=2):
        if str(row.get(config.COL_CANDIDATE_ID)) == str(candidate_id):
            row["_row_number"] = i
            return row
    return None


def write_evaluation(
    row_number: int,
    score: int,
    strengths: str,
    weaknesses: str,
    shortlist: bool,
    summary: str,
) -> None:
    """Writes all evaluation fields + status in one batch update (fewer API calls
    than updating cell-by-cell)."""
    ws = _get_worksheet()
    header = ws.row_values(1)

    updates = {
        config.COL_SCORE: str(score),
        config.COL_STRENGTHS: strengths,
        config.COL_WEAKNESSES: weaknesses,
        config.COL_SHORTLIST: "yes" if shortlist else "no",
        config.COL_EVAL_SUMMARY: summary,
        config.COL_STATUS: config.STATUS_EVALUATED,
    }

    cells_to_update = []
    for col_name, value in updates.items():
        if col_name not in header:
            raise ValueError(
                f"Column '{col_name}' not found in sheet header {header}. "
                f"Add this column to the Sheet first."
            )
        col_index = header.index(col_name) + 1  # 1-indexed
        cells_to_update.append(gspread.Cell(row=row_number, col=col_index, value=value))

    ws.update_cells(cells_to_update)