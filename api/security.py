"""
Session tokens for the API layer.

The underlying auth checks (password hashing/verification) still live in
db/auth.py and are untouched -- this module only adds what a stateless
HTTP frontend needs on top of that: a signed bearer token carrying which
account is logged in, and a short-lived server-side store for signup
email-verification codes (kept on the server rather than handed back to
the browser, unlike the Streamlit app's in-session approach).
"""

from __future__ import annotations

import os
import time
import uuid
from typing import Literal

import jwt
from fastapi import Header, HTTPException, status

_JWT_SECRET = os.environ.get("API_JWT_SECRET", "dev-secret-change-me")
_JWT_ALGORITHM = "HS256"
_TOKEN_TTL_SECONDS = 60 * 60 * 12  # 12h

AccountType = Literal["company", "candidate"]


def create_token(account_type: AccountType, account_id: str) -> str:
    payload = {
        "sub": account_id,
        "type": account_type,
        "iat": int(time.time()),
        "exp": int(time.time()) + _TOKEN_TTL_SECONDS,
    }
    return jwt.encode(payload, _JWT_SECRET, algorithm=_JWT_ALGORITHM)


def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, _JWT_SECRET, algorithms=[_JWT_ALGORITHM])
    except jwt.PyJWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired session"
        ) from e


def _bearer_token(authorization: str | None) -> str:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing bearer token"
        )
    return authorization.split(" ", 1)[1].strip()


def require_company(authorization: str | None = Header(default=None)) -> str:
    """FastAPI dependency -- returns the logged-in company_id, or 401s."""
    claims = decode_token(_bearer_token(authorization))
    if claims.get("type") != "company":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Company login required")
    return claims["sub"]


def require_candidate(authorization: str | None = Header(default=None)) -> str:
    """FastAPI dependency -- returns the logged-in candidate_account_id, or 401s."""
    claims = decode_token(_bearer_token(authorization))
    if claims.get("type") != "candidate":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Candidate login required")
    return claims["sub"]


# ---------------------------------------------------------------- Signup verification codes

# In-memory store: pending_token -> {name, email, password, code, expires_at}.
# Fine for a single-process dev/small deployment, same durability class as
# the rest of this project's in-process state (Streamlit's session_state).
_PENDING_SIGNUPS: dict[str, dict] = {}
_CODE_TTL_SECONDS = 10 * 60


def store_pending_signup(name: str, email: str, password: str, code: str) -> str:
    pending_token = uuid.uuid4().hex
    _PENDING_SIGNUPS[pending_token] = {
        "name": name,
        "email": email,
        "password": password,
        "code": code,
        "expires_at": time.time() + _CODE_TTL_SECONDS,
    }
    return pending_token


def peek_pending_signup(pending_token: str) -> dict | None:
    entry = _PENDING_SIGNUPS.get(pending_token)
    if not entry or entry["expires_at"] < time.time():
        _PENDING_SIGNUPS.pop(pending_token, None)
        return None
    return entry


def replace_pending_code(pending_token: str, code: str) -> None:
    entry = _PENDING_SIGNUPS.get(pending_token)
    if entry:
        entry["code"] = code
        entry["expires_at"] = time.time() + _CODE_TTL_SECONDS


def pop_pending_signup(pending_token: str) -> dict | None:
    return _PENDING_SIGNUPS.pop(pending_token, None)
