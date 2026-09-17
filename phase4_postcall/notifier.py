"""Sends a shortlist notification email via Gmail SMTP (App Password required
-- NOT your normal Gmail password: https://myaccount.google.com/apppasswords)."""

import smtplib
from email.mime.text import MIMEText

from loguru import logger

from . import config


def send_shortlist_email(
    to_email: str,
    candidate_name: str,
    company_name: str = "",
    job_role: str = "",
    company_email: str = "",
) -> None:
    role_phrase = f" for the {job_role} role" if job_role else ""
    company_phrase = f" at {company_name}" if company_name else ""
    subject = f"You've cleared the virtual technical interview{role_phrase}{company_phrase} — shortlisted for next steps"
    signature_email = f" <{company_email}>" if company_email else ""
    body = f"""Hi {candidate_name},

Thank you for taking the time to speak with our AI screening agent. \
We're pleased to let you know that you've cleared the virtual technical \
interview{role_phrase}{company_phrase} and have been shortlisted for the \
next round of our hiring process.

Our team will reach out shortly with further details.

Best regards,
{company_name or config.FROM_NAME}{signature_email}
"""
    msg = MIMEText(body)
    msg["Subject"] = subject
    msg["From"] = config.SMTP_USER
    msg["To"] = to_email
    if company_email:
        msg["Reply-To"] = company_email

    with smtplib.SMTP(config.SMTP_HOST, config.SMTP_PORT) as server:
        server.starttls()
        server.login(config.SMTP_USER, config.SMTP_APP_PASSWORD)
        server.send_message(msg)

    logger.info(f"Shortlist email sent to {candidate_name} <{to_email}>")
