"""Client for triggering an outbound call via Dograh's "API Trigger" node.

Confirmed against Dograh's official docs (voice-agent/api-trigger):
  POST {base_url}/api/v1/public/agent/{uuid}          -> production
  POST {base_url}/api/v1/public/agent/test/{uuid}     -> test (latest draft)
  Auth: X-API-Key header
  Body: {"phone_number": "...", "initial_context": {...}}

initial_context is what shows up in your agent's prompt as {{candidate_name}},
{{resume_summary}} etc. — referenced directly by key name, no prefix needed
inside Agent node prompts.
"""

import httpx

from . import config


class DograhCallTriggerError(Exception):
    pass


def _trigger_url() -> str:
    path = (
        f"/api/v1/public/agent/test/{config.DOGRAH_TRIGGER_UUID}"
        if config.DOGRAH_USE_TEST_TRIGGER
        else f"/api/v1/public/agent/{config.DOGRAH_TRIGGER_UUID}"
    )
    return f"{config.DOGRAH_API_BASE_URL}{path}"


async def trigger_outbound_call(
    candidate_id: str,
    phone_number: str,
    candidate_name: str,
    resume_summary: str,
) -> dict:
    """Ask Dograh to dial `phone_number` and hand the agent candidate_name +
    resume_summary directly, so the prompt can reference {{candidate_name}}
    and {{resume_summary}} with no separate fetch step.
    """
    url = _trigger_url()
    headers = {
        "X-API-Key": config.DOGRAH_API_KEY,
        "Content-Type": "application/json",
    }
    payload = {
        "phone_number": phone_number,
        "initial_context": {
            "candidate_id": candidate_id,
            "candidate_name": candidate_name,
            "resume_summary": resume_summary,
        },
    }
    if config.DOGRAH_TELEPHONY_CONFIG_ID:
        payload["telephony_configuration_id"] = config.DOGRAH_TELEPHONY_CONFIG_ID

    try:
        async with httpx.AsyncClient(timeout=config.DOGRAH_REQUEST_TIMEOUT_SECONDS) as client:
            response = await client.post(url, json=payload, headers=headers)
    except httpx.TimeoutException as e:
        raise DograhCallTriggerError(
            f"Dograh trigger timed out after 50s for candidate {candidate_id}: {e}"
        ) from e
    except httpx.TransportError as e:
        # covers ConnectError, ReadError, ConnectTimeout, network-level failures
        raise DograhCallTriggerError(
            f"Dograh trigger network error for candidate {candidate_id}: {e}"
        ) from e

    if response.status_code != 200:
        raise DograhCallTriggerError(
            f"Dograh trigger failed: HTTP {response.status_code} {response.text}"
        )
    return response.json()  # {"status": "initiated", "workflow_run_id": ..., "workflow_run_name": ...}