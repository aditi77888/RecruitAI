from __future__ import annotations

from api import security, services
from db import auth as db_auth
from fastapi import APIRouter, Header, HTTPException, status

from api.schemas import (
    CandidateLogin,
    CandidateSignup,
    CompanyLogin,
    CompanySignupStart,
    CompanySignupVerify,
    SessionInfo,
    SignupCodeResponse,
    TokenResponse,
)

router = APIRouter(prefix="/auth", tags=["auth"])


# ---------------------------------------------------------------- Company

@router.post("/company/signup/start", response_model=SignupCodeResponse)
def company_signup_start(body: CompanySignupStart):
    if not (body.company_name and body.company_email and body.password):
        raise HTTPException(status_code=400, detail="All fields are required.")
    if db_auth.company_exists(body.company_name):
        raise HTTPException(
            status_code=409, detail=f"A company named '{body.company_name}' is already registered."
        )
    try:
        code = services.send_verification_code(body.company_email)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Couldn't send the verification email: {e}") from e

    pending_token = security.store_pending_signup(
        body.company_name, body.company_email, body.password, code
    )
    return SignupCodeResponse(pending_token=pending_token, email=body.company_email)


@router.post("/company/signup/resend", response_model=SignupCodeResponse)
def company_signup_resend(pending_token: str):
    pending = security.peek_pending_signup(pending_token)
    if not pending:
        raise HTTPException(status_code=404, detail="This signup session has expired. Start again.")
    try:
        code = services.send_verification_code(pending["email"])
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Couldn't resend: {e}") from e
    security.replace_pending_code(pending_token, code)
    return SignupCodeResponse(pending_token=pending_token, email=pending["email"])


@router.post("/company/signup/verify", response_model=TokenResponse)
def company_signup_verify(body: CompanySignupVerify):
    pending = security.peek_pending_signup(body.pending_token)
    if not pending:
        raise HTTPException(status_code=404, detail="This signup session has expired. Start again.")
    if body.code.strip() != pending["code"]:
        raise HTTPException(status_code=400, detail="That code doesn't match. Check your email and try again.")

    security.pop_pending_signup(body.pending_token)
    try:
        company_id = db_auth.create_company(pending["name"], pending["password"], pending["email"])
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e)) from e

    token = security.create_token("company", company_id)
    return TokenResponse(
        token=token, account_type="company", account_id=company_id, display_name=pending["name"]
    )


@router.post("/company/login", response_model=TokenResponse)
def company_login(body: CompanyLogin):
    company_id = db_auth.authenticate_company(body.company_name, body.password)
    if not company_id:
        raise HTTPException(status_code=401, detail="Incorrect company name or password.")
    token = security.create_token("company", company_id)
    company = db_auth.get_company(company_id)
    return TokenResponse(
        token=token,
        account_type="company",
        account_id=company_id,
        display_name=company["company_name"] if company else body.company_name,
    )


# ---------------------------------------------------------------- Candidate

@router.post("/candidate/signup", response_model=TokenResponse)
def candidate_signup(body: CandidateSignup):
    if not (body.email and body.password and body.full_name):
        raise HTTPException(status_code=400, detail="Full name, email, and password are required.")
    try:
        account_id = db_auth.create_candidate_account(body.email, body.password, body.full_name)
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e)) from e
    token = security.create_token("candidate", account_id)
    return TokenResponse(
        token=token, account_type="candidate", account_id=account_id, display_name=body.full_name
    )


@router.post("/candidate/login", response_model=TokenResponse)
def candidate_login(body: CandidateLogin):
    account_id = db_auth.authenticate_candidate(body.email, body.password)
    if not account_id:
        raise HTTPException(status_code=401, detail="Incorrect email or password.")
    account = db_auth.get_candidate_account(account_id)
    display_name = (account or {}).get("full_name") or body.email.split("@")[0]
    token = security.create_token("candidate", account_id)
    return TokenResponse(token=token, account_type="candidate", account_id=account_id, display_name=display_name)


# ---------------------------------------------------------------- Session

@router.get("/me", response_model=SessionInfo)
def me(authorization: str | None = Header(default=None)):
    if not authorization:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not logged in")
    token = authorization.split(" ", 1)[-1].strip()
    claims = security.decode_token(token)
    if claims["type"] == "company":
        company = db_auth.get_company(claims["sub"])
        display_name = company["company_name"] if company else claims["sub"]
    else:
        account = db_auth.get_candidate_account(claims["sub"])
        display_name = (account or {}).get("full_name") or claims["sub"]
    return SessionInfo(account_type=claims["type"], account_id=claims["sub"], display_name=display_name)
