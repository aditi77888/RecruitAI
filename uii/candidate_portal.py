"""
Candidate self-service portal -- shown instead of the HR dashboard when
logged_in_type == "candidate" (see app.py's login gate). A separate file
so the existing HR app.py stays untouched beyond the login gate itself.
"""

import pipeline_data as data
import streamlit as st


def _status_message(status: str) -> tuple[str, str]:
    """Returns (message, streamlit alert kind) for a given application status."""
    if status == "rejected":
        return (
            "Thank you for applying — you have not been shortlisted for this role.",
            "info",
        )
    if status == "declined":
        return "You opted out of the interview process.", "info"
    if status == "evaluated":
        return "Your interview is complete and under review by the hiring team.", "info"
    if status == "uploaded":
        return "Your application is under review.", "info"
    # shortlisted, ready_to_call, reschedule_requested, call_disconnected,
    # interview_context_processing, interview_context_error -- all past
    # the shortlist decision and not rejected/declined/evaluated yet.
    return "You are shortlisted for a virtual interview — check your mail!", "success"


def render_candidate_portal():
    st.markdown('<div class="login-brand">RecruitAI</div>', unsafe_allow_html=True)
    st.markdown(
        '<div class="login-tagline">Find your next role, powered by AI</div>',
        unsafe_allow_html=True,
    )

    full_name = st.session_state.get("candidate_full_name") or st.session_state.get(
        "candidate_email", ""
    )
    first_name = full_name.split(" ")[0].split("@")[0]
    st.markdown(
        f"<p style='text-align:center; color:#6B7686;'>Logged in as <b>{first_name}</b></p>",
        unsafe_allow_html=True,
    )

    companies = data.get_companies()
    if not companies:
        st.info("No companies have signed up yet -- check back later.")
        return

    company_names = [c["company_name"] for c in companies]
    company_id_by_name = {c["company_name"]: c["company_id"] for c in companies}

    _, toggle_col, _ = st.columns([1, 2, 1])
    with toggle_col:
        selected_company_name = st.radio(
            "Choose a company",
            company_names,
            horizontal=True,
            key="company_picker",
            label_visibility="collapsed",
        )
    selected_company_id = company_id_by_name[selected_company_name]
    st.session_state["selected_company_id"] = selected_company_id

    st.divider()

    tab_jobs, tab_applications = st.tabs(["Open roles", "My applications"])

    with tab_jobs:
        jds = data.get_jds(company_id=selected_company_id)
        if not jds:
            st.info(f"{selected_company_name} hasn't posted any roles yet.")
        for jd in jds:
            with st.expander(f"**{jd['title']}**"):
                st.write(jd["jd_text"])
                if jd.get("must_have_skills"):
                    st.caption(f"Must-have skills: {jd['must_have_skills']}")
                if jd.get("min_experience"):
                    st.caption(f"Minimum experience: {jd['min_experience']} years")

                resume_file = st.file_uploader(
                    "Upload your resume (PDF or DOCX)",
                    type=["pdf", "docx"],
                    key=f"resume_{jd['jd_id']}",
                )
                if st.button("Submit application", key=f"apply_{jd['jd_id']}"):
                    if not resume_file:
                        st.warning("Upload your resume first.")
                    else:
                        with st.spinner("Reviewing your resume against this role..."):
                            result = data.upload_and_shortlist(
                                jd["jd_id"],
                                [resume_file],
                                candidate_account_id=st.session_state[
                                    "candidate_account_id"
                                ],
                            )
                        if result.get("evaluated", 0) == 0:
                            st.error(
                                "We couldn't process your resume just now. "
                                "Please try again in a moment, or check the 'My applications' tab shortly."
                            )
                        else:
                            # Look up the application we just created to get its actual status.
                            my_apps = data.get_my_applications(
                                st.session_state["candidate_account_id"]
                            )
                            this_app = next(
                                (a for a in my_apps if a["jd_id"] == jd["jd_id"]), None
                            )
                            status = this_app["status"] if this_app else "uploaded"

                            if status == "shortlisted":
                                # The "check your mail" message below promises an
                                # email is on its way -- actually send it now
                                # (interview-context prep + link email), rather
                                # than waiting for HR to click a dispatch button
                                # or a background scheduler to pick it up later.
                                with st.spinner("Preparing your interview link..."):
                                    data.prep_and_send_interview_links(jd["jd_id"])

                            message, kind = _status_message(status)
                            getattr(st, kind)(message)

    with tab_applications:
        apps = data.get_my_applications(st.session_state["candidate_account_id"])
        if not apps:
            st.info(
                "You haven't applied to anything yet -- check the 'Open roles' tab."
            )
        for app in apps:
            message, kind = _status_message(app["status"])
            with st.container(border=True):
                st.markdown(f"**{app['jd_title']}** — {app.get('company_name') or ''}")
                getattr(st, kind)(message)

    st.divider()
    _, logout_col, _ = st.columns([2, 1, 2])
    with logout_col:
        if st.button("Log out", use_container_width=True):
            for key in (
                "logged_in_type",
                "candidate_account_id",
                "candidate_email",
                "candidate_full_name",
                "selected_company_id",
            ):
                st.session_state.pop(key, None)
            st.rerun()
