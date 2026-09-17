"""
Company (HR) and candidate self-service authentication.

Password hashing uses Python's built-in hashlib.pbkdf2_hmac (salted,
100k iterations) rather than pulling in bcrypt/passlib -- secure enough
for this project's scale without adding a new dependency.
"""

from __future__ import annotations

import hashlib
import secrets

from db.database import get_session
from db.models import CandidateAccount, Company

_PBKDF2_ITERATIONS = 100_000


def _hash_password(password: str, salt: str) -> str:
    return hashlib.pbkdf2_hmac(
        "sha256", password.encode("utf-8"), salt.encode("utf-8"), _PBKDF2_ITERATIONS
    ).hex()


def _make_password_hash(password: str) -> str:
    salt = secrets.token_hex(16)
    return f"{salt}${_hash_password(password, salt)}"


def _verify_password(password: str, stored_hash: str) -> bool:
    try:
        salt, hashed = stored_hash.split("$", 1)
    except ValueError:
        return False
    return secrets.compare_digest(_hash_password(password, salt), hashed)


def _slugify(name: str) -> str:
    return name.strip().lower().replace(" ", "_")


# ---------------------------------------------------------------- Companies


def company_exists(company_name: str) -> bool:
    company_id = _slugify(company_name)
    with get_session() as db:
        return (
            db.query(Company).filter(Company.company_id == company_id).first()
            is not None
        )


def create_company(company_name: str, password: str, email: str = "") -> str:
    """Raises ValueError if a company with this name already exists."""
    company_id = _slugify(company_name)
    with get_session() as db:
        if db.query(Company).filter(Company.company_id == company_id).first():
            raise ValueError(f"A company named '{company_name}' is already registered.")
        company = Company(
            company_id=company_id,
            company_name=company_name.strip(),
            email=email.strip() if email else None,
            password_hash=_make_password_hash(password),
        )
        db.add(company)
        db.commit()
    return company_id


def authenticate_company(company_name: str, password: str) -> str | None:
    """Returns company_id on success, None on bad name/password."""
    company_id = _slugify(company_name)
    with get_session() as db:
        company = db.query(Company).filter(Company.company_id == company_id).first()
        if company and _verify_password(password, company.password_hash):
            return company.company_id
    return None


def get_company(company_id: str) -> dict | None:
    with get_session() as db:
        company = db.query(Company).filter(Company.company_id == company_id).first()
        if not company:
            return None
        return {
            "company_id": company.company_id,
            "company_name": company.company_name,
            "email": company.email,
            "shortlist_threshold": company.shortlist_threshold,
        }


def get_all_companies() -> list[dict]:
    """For the candidate portal's company picker."""
    with get_session() as db:
        return [
            {
                "company_id": c.company_id,
                "company_name": c.company_name,
                "email": c.email,
            }
            for c in db.query(Company).order_by(Company.company_name).all()
        ]


def update_company_settings(
    company_id: str, email: str | None = None, shortlist_threshold: float | None = None
) -> None:
    """Settings-page updates. Pass only the fields being changed."""
    with get_session() as db:
        company = db.query(Company).filter(Company.company_id == company_id).first()
        if not company:
            return
        if email is not None:
            company.email = email.strip() or None
        if shortlist_threshold is not None:
            company.shortlist_threshold = shortlist_threshold
        db.commit()


def change_company_password(
    company_id: str, old_password: str, new_password: str
) -> bool:
    """Returns False if old_password is wrong -- caller shows an error and
    doesn't change anything."""
    with get_session() as db:
        company = db.query(Company).filter(Company.company_id == company_id).first()
        if not company or not _verify_password(old_password, company.password_hash):
            return False
        company.password_hash = _make_password_hash(new_password)
        db.commit()
        return True


# ---------------------------------------------------------------- Candidate accounts


def candidate_account_exists(email: str) -> bool:
    account_id = email.strip().lower()
    with get_session() as db:
        return (
            db.query(CandidateAccount)
            .filter(CandidateAccount.candidate_account_id == account_id)
            .first()
            is not None
        )


def create_candidate_account(email: str, password: str, full_name: str = "") -> str:
    """Raises ValueError if this email is already registered."""
    account_id = email.strip().lower()
    with get_session() as db:
        if (
            db.query(CandidateAccount)
            .filter(CandidateAccount.candidate_account_id == account_id)
            .first()
        ):
            raise ValueError(f"An account with email '{email}' already exists.")
        account = CandidateAccount(
            candidate_account_id=account_id,
            email=email.strip(),
            full_name=full_name.strip() or None,
            password_hash=_make_password_hash(password),
        )
        db.add(account)
        db.commit()
    return account_id


def get_candidate_account(candidate_account_id: str) -> dict | None:
    with get_session() as db:
        account = (
            db.query(CandidateAccount)
            .filter(CandidateAccount.candidate_account_id == candidate_account_id)
            .first()
        )
        if not account:
            return None
        return {
            "candidate_account_id": account.candidate_account_id,
            "email": account.email,
            "full_name": account.full_name,
        }


def authenticate_candidate(email: str, password: str) -> str | None:
    """Returns candidate_account_id on success, None on bad email/password."""
    account_id = email.strip().lower()
    with get_session() as db:
        account = (
            db.query(CandidateAccount)
            .filter(CandidateAccount.candidate_account_id == account_id)
            .first()
        )
        if account and _verify_password(password, account.password_hash):
            return account.candidate_account_id
    return None
