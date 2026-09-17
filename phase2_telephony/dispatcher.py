"""Main entry point: dial every ready_to_call candidate, in batches.

Candidates are grouped into batches of config.BATCH_SIZE. Within a batch,
calls are triggered with a small stagger (config.SECONDS_BETWEEN_CALLS)
rather than truly all-at-once -- this avoids slamming the telephony
provider with simultaneous requests. After a batch finishes, the dispatcher
waits config.SECONDS_BETWEEN_BATCHES before starting the next one.

IMPORTANT: confirm with your mentor how many concurrent calls your
Smartflo/Tata Tele trunk actually supports before raising BATCH_SIZE above
a low number (1-2) -- triggering more concurrent calls than your trunk
supports will just cause some of them to fail or queue.
"""

import asyncio

from loguru import logger

from . import config, db_client
from .dograh_client import DograhCallTriggerError, trigger_outbound_call


def _chunk(items: list, size: int) -> list[list]:
    """Split a list into consecutive chunks of at most `size` items each."""
    return [items[i : i + size] for i in range(0, len(items), size)]


def _normalize_phone(raw) -> str:
    """Force phone into the 10-digit local format confirmed working with
    Smartflo (no country code, no +, no spaces/dashes) -- regardless of
    whether Sheets handed it back as an int, a string with +91, or a string
    with a bare 91 prefix.
    """
    digits = "".join(ch for ch in str(raw) if ch.isdigit())
    if len(digits) == 12 and digits.startswith("91"):
        digits = digits[2:]
    return digits


async def _dial_one(candidate: dict) -> None:
    candidate_id = candidate["candidate_id"]
    name = candidate.get("name") or "unknown"
    raw_phone = candidate.get("phone")
    # interview_context (phase1's rich skills/education/projects JSON) is
    # what actually goes into the {{resume_summary}} prompt variable --
    # candidate["resume_summary"] is only phase0's short recruiter-facing
    # match blurb, not built for the interview itself.
    interview_context = candidate.get("interview_context") or ""

    if not raw_phone:
        logger.warning(f"Skipping {name} ({candidate_id}) — no phone number.")
        return

    phone = _normalize_phone(raw_phone)
    if len(phone) != 10:
        logger.warning(
            f"Skipping {name} ({candidate_id}) — phone '{raw_phone}' normalized "
            f"to '{phone}', which isn't 10 digits. Check the candidate record."
        )
        return

    logger.info(f"Dialing {name} ({phone})...")
    try:
        result = await trigger_outbound_call(
            candidate_id=candidate_id,
            phone_number=phone,
            candidate_name=name,
            resume_summary=interview_context,
        )
        db_client.update_call_status(candidate_id, config.STATUS_DIALING)
        logger.info(
            f"Call triggered for {name}: run_id={result.get('workflow_run_id')} "
            f"({result.get('workflow_run_name')})"
        )
    except DograhCallTriggerError as e:
        db_client.update_call_status(candidate_id, config.STATUS_FAILED)
        logger.error(f"Failed to dial {name}: {e}")


async def _run_batch(batch: list[dict]) -> None:
    """Trigger every candidate in this batch, staggered by SECONDS_BETWEEN_CALLS
    (not fully concurrent, to be gentle on the telephony trunk)."""
    tasks = []
    for candidate in batch:
        tasks.append(asyncio.create_task(_dial_one(candidate)))
        await asyncio.sleep(config.SECONDS_BETWEEN_CALLS)
    # wait for any still-in-flight trigger calls in this batch to finish
    await asyncio.gather(*tasks)


"""async def run_dispatcher() -> None:
    candidates = db_client.get_ready_to_call_candidates()
    logger.info(f"Found {len(candidates)} candidate(s) ready to call.")

    batches = _chunk(candidates, config.BATCH_SIZE)
    logger.info(f"Split into {len(batches)} batch(es) of up to {config.BATCH_SIZE} candidate(s) each.")

    for i, batch in enumerate(batches, start=1):
        logger.info(f"--- Starting batch {i}/{len(batches)} ({len(batch)} candidate(s)) ---")
        await _run_batch(batch)

        if i < len(batches):
            logger.info(f"Batch {i} done. Waiting {config.SECONDS_BETWEEN_BATCHES}s before next batch...")
            await asyncio.sleep(config.SECONDS_BETWEEN_BATCHES)

    logger.info("All batches dispatched.")"""

async def run_dispatcher(jd_id: str | None = None) -> None:
    candidates = db_client.get_ready_to_call_candidates(jd_id)
    logger.info(f"Found {len(candidates)} candidate(s) ready to call.")

    batches = _chunk(candidates, config.BATCH_SIZE)
    logger.info(f"Split into {len(batches)} batch(es) of up to {config.BATCH_SIZE} candidate(s) each.")

    for i, batch in enumerate(batches, start=1):
        logger.info(f"--- Starting batch {i}/{len(batches)} ({len(batch)} candidate(s)) ---")
        await _run_batch(batch)

        if i < len(batches):
            logger.info(f"Batch {i} done. Waiting {config.SECONDS_BETWEEN_BATCHES}s before next batch...")
            await asyncio.sleep(config.SECONDS_BETWEEN_BATCHES)

    logger.info("All batches dispatched.")


if __name__ == "__main__":
    asyncio.run(run_dispatcher())  # no jd_id when run standalone -> dials everyone, which is fine for CLI/testing


if __name__ == "__main__":
    asyncio.run(run_dispatcher())