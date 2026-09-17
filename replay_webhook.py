"""
Replays a specific postcall webhook payload -- use this when a real call
already happened and the webhook fired, but processing failed for a fixable
reason (like the transcript-redirect bug). Saves you from placing a real
call again just to re-test the fix.

Run from ai_interview_agent/:
    python replay_webhook.py

Edit PAYLOAD below to match the raw payload logged by your webhook server
at the time (the [postcall-webhook] raw payload: {...} line).
"""
import asyncio
import sys
import os

sys.path.insert(0, os.path.dirname(__file__))
from phase4_postcall import webhook_server

# Paste the exact payload from your webhook server's log line here.
PAYLOAD = {
    "workflow_run_id": "78",
    "candidate_id": "ai_intern-2fccda607fb6f55e",
    "candidate_name": "Aditi Bais",
    "resume_summary": '{"candidate_name": "Aditi Bais", "total_experience_years": 0.1, "skills": ["Python"]}',  # trimmed -- paste the full one from your log
    "duration": "550",
    "recording_url": "https://jitters-squash-idealist.ngrok-free.dev/api/v1/public/download/workflow/2842f3b8-34ab-4ba5-add2-619b4e1143b2/recording",
    "transcript_url": "https://jitters-squash-idealist.ngrok-free.dev/api/v1/public/download/workflow/2842f3b8-34ab-4ba5-add2-619b4e1143b2/transcript",
    "call_disposition": "user_idle_max_duration_exceeded",
}


class _FakeRequest:
    async def json(self):
        return PAYLOAD


async def main():
    result = await webhook_server.postcall_webhook(_FakeRequest())
    print("Result:", result)


if __name__ == "__main__":
    asyncio.run(main())