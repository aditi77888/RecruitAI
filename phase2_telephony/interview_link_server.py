"""
Serves the web page candidates open from their interview-link email.
Embeds the Dograh voice widget (config.DOGRAH_WIDGET_SRC -- see config.py's
comment for how to get this) and injects the right candidate's context
server-side using the exact key names (candidate_id, candidate_name,
resume_summary) the existing Dograh workflow's node prompts already
reference via {{initial_context.*}} -- no changes needed on the Dograh
workflow side at all.

Usage:
    python -m phase2_telephony.interview_link_server

Then expose this port the same way you already expose the webhook server
(e.g. an ngrok tunnel), and set INTERVIEW_LINK_BASE_URL in your .env to
that public URL + "/interview".
"""

import asyncio
import json

import httpx
import websockets
from fastapi import FastAPI, Request, Response, WebSocket, WebSocketDisconnect
from fastapi.responses import HTMLResponse
from loguru import logger

from phase2_telephony import config, db_client

app = FastAPI()

PAGE_TEMPLATE = """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Your AI Interview</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
  <style>
    * {{ box-sizing: border-box; }}
    body {{
      margin: 0;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #ec4899 100%);
      padding: 24px;
    }}
    .card {{
      background: #ffffff;
      border-radius: 24px;
      padding: 48px 36px;
      max-width: 440px;
      width: 100%;
      text-align: center;
      box-shadow: 0 25px 50px -12px rgba(0,0,0,0.35);
    }}
    .icon-wrap {{
      width: 84px;
      height: 84px;
      margin: 0 auto 24px;
      border-radius: 50%;
      background: linear-gradient(135deg, #6366f1, #8b5cf6);
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
    }}
    .icon-wrap::before {{
      content: '';
      position: absolute;
      inset: -8px;
      border-radius: 50%;
      border: 2px solid #a5b4fc;
      animation: pulse 2s ease-out infinite;
    }}
    @keyframes pulse {{
      0% {{ transform: scale(0.9); opacity: 0.8; }}
      100% {{ transform: scale(1.4); opacity: 0; }}
    }}
    .icon-wrap svg {{ width: 34px; height: 34px; fill: white; }}
    h1 {{
      font-size: 1.5rem;
      font-weight: 700;
      color: #1e1b3a;
      margin: 0 0 12px;
    }}
    p {{
      color: #6b6478;
      line-height: 1.6;
      margin: 0 0 16px;
      font-size: 0.95rem;
    }}
    .meta {{
      display: flex;
      justify-content: center;
      gap: 20px;
      margin: 24px 0;
      padding: 16px 0;
      border-top: 1px solid #eee;
      border-bottom: 1px solid #eee;
    }}
    .meta-item {{
      font-size: 0.78rem;
      color: #8b85a0;
    }}
    .meta-item strong {{
      display: block;
      color: #1e1b3a;
      font-size: 0.92rem;
      font-weight: 600;
    }}
    .fine-print {{
      font-size: 0.85rem;
    }}
    .hint {{
      font-size: 0.8rem;
      color: #a39cb5;
      margin: 20px 0 0;
    }}
  </style>
</head>
<body>
  <div class="card">
    <div class="icon-wrap">
      <svg viewBox="0 0 24 24"><path d="M12 14a3 3 0 0 0 3-3V5a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.92V21h2v-3.08A7 7 0 0 0 19 11h-2z"/></svg>
    </div>
    <h1>Hi {candidate_name}, when you are ready!</h1>
    <p>You've been shortlisted for a short AI-conducted screening interview.
    Click the microphone button that appears on this page whenever you'd
    like to begin -- find a quiet spot first if you can.</p>
    <div class="meta">
      <div class="meta-item"><strong>10-15 min</strong>Duration</div>
      <div class="meta-item"><strong>Voice only</strong>Format</div>
      <div class="meta-item"><strong>No prep needed</strong>Just be yourself</div>
    </div>
    <p class="fine-print">Please allow microphone access when your browser asks for it.</p>
    <p class="hint">If you get disconnected partway through, just reopen this same link to continue where you left off.</p>
  </div>

  <script>
    (function(d, s, id) {{
        var js, fjs = d.getElementsByTagName(s)[0];
        if (d.getElementById(id)) return;
        js = d.createElement(s);
        js.id = id;
        js.src = '{widget_src}';
        js.setAttribute('data-dograh-context', JSON.stringify({context_json}));
        js.async = true;
        fjs.parentNode.insertBefore(js, fjs);
    }}(document, 'script', 'dograh-widget'));
  </script>
</body>
</html>
"""

ERROR_PAGE = """<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Interview Link</title>
  <style>
    body {{
      margin: 0; min-height: 100vh; display: flex; align-items: center;
      justify-content: center; font-family: -apple-system, BlinkMacSystemFont, sans-serif;
      background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #ec4899 100%); padding: 24px;
    }}
    .card {{
      background: #fff; border-radius: 24px; padding: 48px 36px; max-width: 420px;
      text-align: center; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.35);
    }}
    h1 {{ font-size: 1.3rem; color: #1e1b3a; margin: 0 0 12px; }}
    p {{ color: #6b6478; line-height: 1.6; margin: 0; }}
  </style>
</head>
<body>
  <div class="card">
    <h1>{title}</h1>
    <p>{message}</p>
  </div>
</body>
</html>
"""


@app.get("/interview", response_class=HTMLResponse)
async def interview_page(token: str):
    candidate = db_client.get_candidate_by_token(token)

    if not candidate:
        logger.warning(f"[interview-page] no candidate found for token={token}")
        return HTMLResponse(
            ERROR_PAGE.format(
                title="Link not recognized",
                message="This interview link isn't valid. Please check the link "
                "in your email, or reach out if this keeps happening.",
            ),
            status_code=404,
        )

    if not candidate.get("ready_to_call"):
        return HTMLResponse(
            ERROR_PAGE.format(
                title="Interview already completed",
                message="This interview has already been completed, or isn't "
                "active anymore. If you think this is a mistake, please "
                "reach out to us.",
            ),
            status_code=410,
        )

    if not config.DOGRAH_WIDGET_SRC:
        logger.error("[interview-page] DOGRAH_WIDGET_SRC is not configured in .env")
        return HTMLResponse(
            ERROR_PAGE.format(
                title="Setup incomplete",
                message="The interview page isn't fully configured yet. Please try again shortly.",
            ),
            status_code=503,
        )

    context = {
        "candidate_id": candidate["candidate_id"],
        "candidate_name": candidate.get("name") or "",
        # Same key name ("resume_summary") the existing Dograh workflow's
        # node prompts already use -- this carries phase1's interview_context.
        "resume_summary": candidate.get("interview_context") or "",
        # New: lets the Start Call node greet with the real company + role
        # instead of a hardcoded name -- see the workflow prompt update
        # that goes with this.
        "company_name": candidate.get("company_name") or "our company",
        "job_role": candidate.get("jd_title") or "this role",
    }
    # Guard against a candidate name/content that happens to contain
    # "</script>" from breaking out of the script tag.
    context_json = json.dumps(context).replace("</", "<\\/")

    html = PAGE_TEMPLATE.format(
        candidate_name=candidate.get("name") or "there",
        widget_src=config.DOGRAH_WIDGET_SRC,
        context_json=context_json,
    )
    return HTMLResponse(html)


# ---------------------------------------------------------------------
# Reverse proxy: consolidates Dograh's backend (config.DOGRAH_BACKEND_LOCAL,
# normally localhost:8000) and its widget frontend (config.DOGRAH_WIDGET_LOCAL,
# normally localhost:3000) behind THIS one server, so only ONE ngrok tunnel
# (pointed at this server) is needed -- and it can be ngrok's one free
# static "dev domain", so the URL never changes on restart. Without this,
# each of those two other services would need their own separate tunnel,
# and only one tunnel total gets a stable domain on the free plan -- the
# others get a new random URL every restart, breaking already-sent
# candidate email links and config each time.
#
# Point config.DOGRAH_WIDGET_SRC at THIS server's /widget/... path (not
# localhost:3000 directly), and the widget's apiEndpoint param at THIS
# server's /api path (not localhost:8000 directly) -- see config.py.
# ---------------------------------------------------------------------


async def _proxy(request: Request, target_base: str, path: str) -> Response:
    target_url = f"{target_base}/{path}"
    body = await request.body()
    forward_headers = {
        k: v
        for k, v in request.headers.items()
        if k.lower() not in ("host", "content-length")
    }
    async with httpx.AsyncClient(timeout=60) as client:
        upstream = await client.request(
            request.method,
            target_url,
            params=request.query_params,
            headers=forward_headers,
            content=body,
        )
    response_headers = {
        k: v
        for k, v in upstream.headers.items()
        if k.lower() not in ("content-length", "content-encoding", "transfer-encoding")
    }
    return Response(
        content=upstream.content,
        status_code=upstream.status_code,
        headers=response_headers,
        media_type=upstream.headers.get("content-type"),
    )


@app.api_route(
    "/api/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"]
)
async def proxy_dograh_backend(path: str, request: Request):
    return await _proxy(request, config.DOGRAH_BACKEND_LOCAL, path)


@app.api_route("/widget/{path:path}", methods=["GET", "POST", "OPTIONS"])
async def proxy_dograh_widget(path: str, request: Request):
    return await _proxy(request, config.DOGRAH_WIDGET_LOCAL, path)


# ---------------------------------------------------------------------
# WebSocket proxy: the widget's audio/signaling connection is a WebSocket
# (e.g. /api/api/v1/ws/public/signaling/<session>), not a regular HTTP
# request -- the plain @app.api_route proxy above can't handle protocol
# upgrades at all, which is exactly why it was coming back 403 Forbidden
# and the widget got stuck on "connecting". This bridges the browser's
# WebSocket to a fresh outbound WebSocket to the real Dograh backend and
# relays messages both directions until either side disconnects.
# ---------------------------------------------------------------------


def _to_ws_url(http_base: str, path: str, query: str) -> str:
    ws_base = http_base.replace("https://", "wss://").replace("http://", "ws://")
    url = f"{ws_base}/{path}"
    if query:
        url += f"?{query}"
    return url


@app.websocket("/api/{path:path}")
async def proxy_dograh_backend_ws(websocket: WebSocket, path: str):
    await websocket.accept()
    backend_url = _to_ws_url(config.DOGRAH_BACKEND_LOCAL, path, websocket.url.query)

    try:
        # compression=None -- audio frames are already compressed (e.g.
        # Opus); re-compressing them via permessage-deflate wastes CPU on
        # every frame for zero size benefit, and adds latency on a machine
        # already busy running Docker + STT/TTS locally.
        async with websockets.connect(backend_url, compression=None) as backend_ws:

            async def browser_to_backend():
                try:
                    while True:
                        message = await websocket.receive()
                        if message["type"] == "websocket.disconnect":
                            break
                        if "text" in message and message["text"] is not None:
                            await backend_ws.send(message["text"])
                        elif "bytes" in message and message["bytes"] is not None:
                            await backend_ws.send(message["bytes"])
                except WebSocketDisconnect:
                    pass

            async def backend_to_browser():
                async for message in backend_ws:
                    if isinstance(message, bytes):
                        await websocket.send_bytes(message)
                    else:
                        await websocket.send_text(message)

            done, pending = await asyncio.wait(
                [
                    asyncio.create_task(browser_to_backend()),
                    asyncio.create_task(backend_to_browser()),
                ],
                return_when=asyncio.FIRST_COMPLETED,
            )
            for task in pending:
                task.cancel()

    except Exception as e:
        logger.error(f"[ws-proxy] failed relaying {backend_url}: {e}")
        try:
            await websocket.close(code=1011)
        except Exception:
            pass


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=config.INTERVIEW_LINK_SERVER_PORT)
