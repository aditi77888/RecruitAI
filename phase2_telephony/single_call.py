"""One-off test: trigger a single call directly, bypassing the Sheet.

Run this FIRST before running dispatcher.py on the full candidate list —
it lets you verify the Dograh trigger + template variables work end-to-end
against one real phone call (ideally your own number) before dialing
everyone in the sheet.

Usage:
    python -m phase2_calltrigger.test_single_call
"""

import asyncio

from loguru import logger

from .dograh_client import DograhCallTriggerError, trigger_outbound_call

# ---- EDIT THESE BEFORE RUNNING ----
TEST_PHONE_NUMBER = "9893306331"  # your own number, E.164 format
TEST_CANDIDATE_NAME = "Aditi"
TEST_RESUME_SUMMARY = "3 years experience in backend development with Python and FastAPI."
# ------------------------------------


async def main() -> None:
    logger.info(f"Triggering test call to {TEST_PHONE_NUMBER}...")
    try:
        result = await trigger_outbound_call(
            candidate_id="test-001",
            phone_number=TEST_PHONE_NUMBER,
            candidate_name=TEST_CANDIDATE_NAME,
            resume_summary=TEST_RESUME_SUMMARY,
        )
        logger.info(f"SUCCESS: {result}")
        logger.info(f"Check Dograh's call/run history for run_id={result.get('workflow_run_id')}")
    except DograhCallTriggerError as e:
        logger.error(f"FAILED: {e}")


if __name__ == "__main__":
    asyncio.run(main())