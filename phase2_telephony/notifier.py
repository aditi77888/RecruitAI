"""Sends the interview-link email -- this replaces the phone-dial step now
that we don't have telephony access. Same Gmail SMTP pattern as
phase4_postcall/notifier.py."""

import smtplib
from email.mime.text import MIMEText

from loguru import logger

from phase2_telephony import config


def send_interview_link_email(
    to_email: str,
    candidate_name: str,
    interview_link: str,
    company_name: str = "",
    job_role: str = "",
    company_email: str = "",
) -> None:
    role_phrase = f" for the {job_role} role" if job_role else ""
    company_phrase = f" at {company_name}" if company_name else ""
    subject = f"Your AI screening interview{role_phrase}{company_phrase} -- click when you're ready"
    signature_email = f" <{company_email}>" if company_email else ""
    body = f"""Hi {candidate_name},

Thank you for your interest in the {job_role or "role"}{company_phrase}. \
You've been shortlisted for a short AI-conducted screening interview.

Whenever you have about 10-15 minutes free, click the link below to begin -- \
no scheduling needed, just talk to our AI interviewer directly from your \
browser (a working microphone is all you need, no app to install):

{interview_link}

Take your time and answer naturally, just like a normal conversation. If you \
get disconnected partway through, the same link will let you continue.

Best regards,
{company_name or config.FROM_NAME}{signature_email}
"""
    msg = MIMEText(body)
    msg["Subject"] = subject
    msg["From"] = config.SMTP_USER
    msg["To"] = to_email
    # Reply-To points at the specific company's own email (not our shared
    # sending account) -- we can't safely spoof the From header without
    # that company providing their own SMTP credentials, but Reply-To
    # means a candidate's reply goes straight to the right company.
    if company_email:
        msg["Reply-To"] = company_email

    with smtplib.SMTP(config.SMTP_HOST, config.SMTP_PORT) as server:
        server.starttls()
        server.login(config.SMTP_USER, config.SMTP_APP_PASSWORD)
        server.send_message(msg)

    logger.info(f"Interview link email sent to {candidate_name} <{to_email}>")
