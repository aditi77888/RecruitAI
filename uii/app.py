"""
Recruitment pipeline dashboard -- Streamlit UI.

Run: streamlit run app.py

Four tabs matching the finalized design:
  Dashboard   -- JD cards, resume upload, shortlisting progress
  Shortlisted -- master candidate table, evolving status (no Sheets lookups)
  Reports     -- one post-call table per JD
  Settings    -- placeholder, built later

Data comes from mock_data.py right now. Every data call is isolated in
one place so swapping in the real DB later touches only that layer.
"""

import pandas as pd
import pipeline_data as data
import streamlit as st
from streamlit_option_menu import option_menu
from ui_styles import CUSTOM_CSS

st.set_page_config(
    page_title="Recruitment Pipeline",
    page_icon="🧭",
    layout="wide",
    initial_sidebar_state="expanded",
)
st.markdown(CUSTOM_CSS, unsafe_allow_html=True)


# ---------------------------------------------------------------- Login gate
def render_login_gate():
    # Plain centered title -- no hero band, no logo icon (removed per
    # request). Everything else lives inside one bordered box below it.
    st.markdown('<div class="login-title">RecruitAI</div>', unsafe_allow_html=True)

    left, center, right = st.columns([1, 2, 1])
    with center:
        with st.container(border=True, key="login_card"):
            user_type = st.radio(
                "I am a...",
                ["🏢 Company (HR)", "👤 Candidate"],
                horizontal=True,
                key="login_user_type",
                label_visibility="collapsed",
            )
            is_company = user_type == "🏢 Company (HR)"

            st.markdown(
                f"""
                <div class="login-welcome-title">Welcome!</div>
                <div class="login-welcome-subtitle">
                    Log in to your {"HR" if is_company else "Candidate"} Account
                </div>
                """,
                unsafe_allow_html=True,
            )

            if is_company:
                login_tab, signup_tab = st.tabs(["Log in", "Sign up"])
                with login_tab, st.form("company_login_form"):
                    company_name = st.text_input(
                        "Company Name", placeholder="Company Name"
                    )
                    password = st.text_input(
                        "Password", type="password", placeholder="Password"
                    )
                    st.markdown(
                        '<div class="login-forgot-link">Forgot Password?</div>',
                        unsafe_allow_html=True,
                    )
                    if st.form_submit_button("Log in", use_container_width=True):
                        company_id = data.company_login(company_name, password)
                        if company_id:
                            st.session_state["logged_in_type"] = "company"
                            st.session_state["company_id"] = company_id
                            st.session_state["company_name"] = company_name
                            st.rerun()
                        else:
                            st.error("Incorrect company name or password.")

                with signup_tab:
                    # Two-step signup: (1) collect details + send a code to the
                    # given email, (2) verify that code before the account is
                    # actually created -- so only a real, reachable company
                    # email can be used to sign up.
                    pending = st.session_state.get("pending_company_signup")

                    if not pending:
                        with st.form("company_signup_form"):
                            new_company_name = st.text_input(
                                "Company name", key="signup_company_name"
                            )
                            new_company_email = st.text_input(
                                "Company email",
                                key="signup_company_email",
                                help="We'll send a verification code here. Candidates' replies to interview/shortlist emails go here too.",
                            )
                            new_password = st.text_input(
                                "Password",
                                type="password",
                                key="signup_company_password",
                            )
                            if st.form_submit_button("Send verification code"):
                                if not (
                                    new_company_name
                                    and new_company_email
                                    and new_password
                                ):
                                    st.error("All fields are required.")
                                elif data.company_name_taken(new_company_name):
                                    st.error(
                                        f"A company named '{new_company_name}' is already registered."
                                    )
                                else:
                                    try:
                                        code = data.send_verification_code(
                                            new_company_email
                                        )
                                        st.session_state["pending_company_signup"] = {
                                            "name": new_company_name,
                                            "email": new_company_email,
                                            "password": new_password,
                                            "code": code,
                                        }
                                        st.rerun()
                                    except Exception as e:
                                        st.error(
                                            f"Couldn't send the verification email: {e}"
                                        )
                    else:
                        st.info(
                            f"We've sent a 6-digit code to **{pending['email']}**. Enter it below to finish creating your account."
                        )
                        with st.form("company_verify_form"):
                            entered_code = st.text_input("Verification code")
                            verify_col, resend_col = st.columns(2)
                            with verify_col:
                                verify_clicked = st.form_submit_button(
                                    "Verify & create account"
                                )
                            with resend_col:
                                resend_clicked = st.form_submit_button("Resend code")

                        if verify_clicked:
                            if entered_code.strip() == pending["code"]:
                                try:
                                    data.company_signup(
                                        pending["name"],
                                        pending["password"],
                                        pending["email"],
                                    )
                                    del st.session_state["pending_company_signup"]
                                    st.success(
                                        "Company account created -- log in from the 'Log in' tab."
                                    )
                                except ValueError as e:
                                    st.error(str(e))
                            else:
                                st.error(
                                    "That code doesn't match. Check your email and try again."
                                )
                        if resend_clicked:
                            try:
                                new_code = data.send_verification_code(pending["email"])
                                pending["code"] = new_code
                                st.session_state["pending_company_signup"] = pending
                                st.toast(
                                    "A new verification code has been sent.", icon="📧"
                                )
                            except Exception as e:
                                st.error(f"Couldn't resend: {e}")
                        if st.button("Cancel and start over"):
                            del st.session_state["pending_company_signup"]
                            st.rerun()

            else:
                login_tab, signup_tab = st.tabs(["Log in", "Sign up"])
                with login_tab, st.form("candidate_login_form"):
                    email = st.text_input("Email")
                    password = st.text_input("Password", type="password")
                    if st.form_submit_button("Log in"):
                        account_id = data.candidate_login(email, password)
                        if account_id:
                            account = data.get_candidate_account(account_id)
                            st.session_state["logged_in_type"] = "candidate"
                            st.session_state["candidate_account_id"] = account_id
                            st.session_state["candidate_email"] = email
                            st.session_state["candidate_full_name"] = (
                                account or {}
                            ).get("full_name") or email.split("@")[0]
                            st.rerun()
                        else:
                            st.error("Incorrect email or password.")
                with signup_tab, st.form("candidate_signup_form"):
                    new_full_name = st.text_input(
                        "Full name", key="signup_candidate_name"
                    )
                    new_email = st.text_input("Email", key="signup_candidate_email")
                    new_password = st.text_input(
                        "Password", type="password", key="signup_candidate_password"
                    )
                    if st.form_submit_button("Create account"):
                        if new_email and new_password and new_full_name:
                            try:
                                data.candidate_signup(
                                    new_email, new_password, new_full_name
                                )
                                st.success(
                                    "Account created -- log in from the 'Log in' tab."
                                )
                            except ValueError as e:
                                st.error(str(e))
                        else:
                            st.error("Full name, email, and password are required.")


if not st.session_state.get("logged_in_type"):
    render_login_gate()
    st.stop()

if st.session_state["logged_in_type"] == "candidate":
    from candidate_portal import render_candidate_portal

    render_candidate_portal()
    st.stop()

# From here on: logged in as a company (HR) -- existing dashboard, now
# scoped to st.session_state["company_id"] wherever it calls into `data`.
COMPANY_ID = st.session_state["company_id"]

# ---------------------------------------------------------------- Sidebar
with st.sidebar:
    st.markdown(
        f"<div style='padding:12px 16px 4px 16px;'>"
        f"<span style='color:#FFFFFF; font-size:19px; font-weight:700;'>RecruitAI</span>"
        f"</div>"
        f"<div style='padding:0 16px 16px 16px;'>"
        f"<span style='color:#C9D3E0; font-size:16px; font-weight:600;'>{st.session_state['company_name']}</span>"
        f"</div>",
        unsafe_allow_html=True,
    )
    selected = option_menu(
        menu_title=None,
        options=["Dashboard", "Shortlisted", "Reports", "Settings"],
        icons=["house", "funnel", "bar-chart", "gear"],
        default_index=0,
        key="sidebar_nav",
        styles={
            "container": {"padding": "0", "background-color": "#10233F"},
            "icon": {"color": "#C9D3E0", "font-size": "16px"},
            "nav-link": {
                "color": "#C9D3E0",
                "font-size": "15px",
                "text-align": "left",
                "margin": "2px 8px",
                "padding": "10px 12px",
                "border-radius": "8px",
            },
            "nav-link-selected": {"background-color": "#2F6FED", "color": "white"},
        },
    )
    # Log out now lives only in Settings -> Account (see render_settings) --
    # removed the duplicate here to avoid two logout entry points.


# ---------------------------------------------------------------- Delete-JD modal
@st.dialog("Delete job opening")
def confirm_delete_jd_dialog(jd_id: str, jd_title: str):
    """Real modal (Streamlit >= 1.31) instead of an inline warning banner --
    keeps a destructive action from shifting the page layout and makes it
    unmistakably a separate step from the rest of the dashboard."""
    st.warning(
        f"Delete **{jd_title}**? This also deletes every shortlisted "
        f"candidate and evaluation under it. This cannot be undone."
    )
    confirm_col, cancel_col = st.columns(2)
    with confirm_col:
        if st.button("Yes, delete", type="primary", use_container_width=True):
            data.delete_jd(jd_id, company_id=COMPANY_ID)
            st.toast(f"'{jd_title}' deleted.", icon="🗑️")
            st.rerun()
    with cancel_col:
        if st.button("Cancel", type="secondary", use_container_width=True):
            st.rerun()


# ---------------------------------------------------------------- Dashboard
def render_dashboard():
    st.title("Dashboard")
    st.caption(
        "Upload resumes against a job opening. Shortlisting and calling run automatically from here."
    )

    jds = data.get_jds(company_id=COMPANY_ID)
    cols = st.columns(2)

    for i, jd in enumerate(jds):
        with cols[i % 2]:
            title_col, delete_col = st.columns([5, 1])
            with title_col:
                st.markdown(
                    f"""
                    <div class="card">
                        <div class="card-title">{jd["title"]}</div>
                        <div class="card-subtitle">Total Candidates: {jd["total_candidates"]}</div>
                    </div>
                    """,
                    unsafe_allow_html=True,
                )
            with delete_col:
                if st.button("🗑️", key=f"delete_{jd['jd_id']}", help="Delete this JD"):
                    confirm_delete_jd_dialog(jd["jd_id"], jd["title"])

            uploaded = st.file_uploader(
                "Upload Resumes",
                type=["pdf", "docx"],
                accept_multiple_files=True,
                key=f"upload_{jd['jd_id']}",
                label_visibility="collapsed",
            )
            st.progress(
                jd["shortlisting_progress"] / 100,
                text=f"Shortlisting Status: {jd['shortlisting_progress']}%",
            )

            if st.button("Send to Shortlisting", key=f"btn_{jd['jd_id']}"):
                if uploaded:
                    with st.spinner(
                        f"Extracting + evaluating {len(uploaded)} resume(s) against {jd['title']}..."
                    ):
                        result = data.upload_and_shortlist(jd["jd_id"], uploaded)
                    st.toast(
                        f"Evaluated {result['evaluated']} resume(s): "
                        f"{result['shortlisted']} shortlisted, {result['ready_to_call']} call-ready.",
                        icon="✅",
                    )
                    if result.get("errors"):
                        st.error(
                            "Some resumes failed to evaluate:\n"
                            + "\n".join(result["errors"])
                        )
                else:
                    st.warning("Upload at least one resume first.")

    st.divider()
    with st.expander("+ Add a new JD"):
        jd_input_mode = st.radio(
            "How do you want to add this JD?",
            ["Type manually", "Upload PDF/DOCX"],
            horizontal=True,
            key="jd_input_mode",
        )

        if jd_input_mode == "Type manually":
            with st.form("new_jd_form"):
                jd_title = st.text_input("Job title")
                jd_text = st.text_area("Job description")
                must_have = st.text_input("Must-have skills (comma-separated)")
                min_exp = st.number_input(
                    "Minimum experience (years)", min_value=0.0, step=0.5
                )
                submitted = st.form_submit_button("Create JD")
                if submitted:
                    if jd_title and jd_text:
                        data.create_jd(
                            jd_title,
                            jd_text,
                            must_have,
                            min_experience=min_exp,
                            company_id=COMPANY_ID,
                        )
                        st.toast(f"JD '{jd_title}' created.", icon="✅")
                        st.rerun()
                    else:
                        st.error("Title and description are required.")
        else:
            jd_file = st.file_uploader(
                "Upload the JD file", type=["pdf", "docx"], key="jd_file_upload"
            )
            if st.button("Create JD from file"):
                if jd_file:
                    with st.spinner(
                        "Extracting text and identifying title/skills/experience..."
                    ):
                        parsed = data.create_jd_from_file(
                            jd_file, company_id=COMPANY_ID
                        )
                    st.toast(
                        f"JD '{parsed['title']}' created. "
                        f"Auto-detected skills: {parsed['must_have_skills'] or '(none detected)'}",
                        icon="✅",
                    )
                    st.rerun()
                else:
                    st.warning("Upload a file first.")


# ---------------------------------------------------------------- Shortlisted
_STATUS_PILL_MAP = {
    "selected": "pill-selected",
    "shortlisted": "pill-shortlisted",
    "rejected": "pill-rejected",
}
_CALL_STATUS_PILL_MAP = {
    "pending": "pill-pending",
    "dialing": "pill-dialing",
    "completed": "pill-completed",
    "failed": "pill-failed",
}


def _status_pill(status: str) -> str:
    css_class = _STATUS_PILL_MAP.get(status, "pill-shortlisted")
    return f'<span class="pill {css_class}">{status.capitalize()}</span>'


def _call_status_pill(call_status: str | None) -> str:
    """Same pill treatment as _status_pill, but for the call_status column
    -- previously rendered as raw text, now visually consistent with the
    Status column (uses the pill-called/pill-notcalled/pill-dialing/etc.
    classes already defined in ui_styles.py)."""
    if not call_status:
        return '<span class="pill pill-notcalled">Not called</span>'
    css_class = _CALL_STATUS_PILL_MAP.get(call_status, "pill-notcalled")
    label = call_status.replace("_", " ").capitalize()
    return f'<span class="pill {css_class}">{label}</span>'


def render_shortlisted():
    st.title("Shortlisted Candidates")
    st.caption(
        "Master candidate list. Status updates automatically as candidates move through the pipeline."
    )

    jd_options = ["All JDs"] + [
        jd["title"] for jd in data.get_jds(company_id=COMPANY_ID)
    ]
    jd_id_by_title = {
        jd["title"]: jd["jd_id"] for jd in data.get_jds(company_id=COMPANY_ID)
    }
    col_search, col_filter = st.columns([3, 1])
    with col_search:
        search = st.text_input(
            "Search by name or ID",
            label_visibility="collapsed",
            placeholder="Search by name or candidate ID",
        )
    with col_filter:
        jd_filter = st.selectbox(
            "Filter by JD", jd_options, label_visibility="collapsed"
        )

    if jd_filter != "All JDs":
        if st.button(f"📧 Generate context + Send interview links for {jd_filter}"):
            with st.spinner(
                "Building interview context and emailing interview links to ready candidates..."
            ):
                result = data.prep_and_send_interview_links(jd_id_by_title[jd_filter])
            st.toast(
                f"Interview links sent: {result.get('sent', 0)} | "
                f"skipped: {result.get('skipped_no_email', 0)} | "
                f"failed: {result.get('failed', 0)}",
                icon="📧",
            )
            st.rerun()

    candidates = data.get_shortlisted_candidates(
        None if jd_filter == "All JDs" else jd_filter, company_id=COMPANY_ID
    )

    if search:
        s = search.lower()
        candidates = [
            c
            for c in candidates
            if s in c["name"].lower() or s in c["candidate_id"].lower()
        ]

    if not candidates:
        st.info("No candidates match this filter yet.")
        return

    df = pd.DataFrame(candidates)
    df_display = df[
        [
            "candidate_id",
            "name",
            "phone",
            "email",
            "jd_title",
            "match_score",
            "status",
            "call_status",
            "resume_summary",
        ]
    ].copy()
    df_display.columns = [
        "Candidate ID",
        "Name",
        "Phone",
        "Email",
        "JD",
        "Match Score",
        "Status",
        "Call Status",
        "Resume Summary",
    ]
    df_display["Status"] = df["status"].apply(_status_pill)
    # NEW: Call Status now renders as a pill too, matching Status --
    # previously this column was left as plain text.
    df_display["Call Status"] = df["call_status"].apply(_call_status_pill)

    st.markdown('<div class="card">', unsafe_allow_html=True)
    st.write(
        df_display.to_html(escape=False, index=False),
        unsafe_allow_html=True,
    )
    st.markdown("</div>", unsafe_allow_html=True)


# ---------------------------------------------------------------- Reports
def render_reports():
    st.title("Reports")
    st.caption(
        "Post-call evaluation outcomes, one section per job opening. Expand a candidate to see the full transcript and how the AI reached its evaluation."
    )

    for jd_title in data.get_all_report_jds(company_id=COMPANY_ID):
        rows = data.get_reports(jd_title, company_id=COMPANY_ID)
        if not rows:
            continue

        st.markdown(
            f'<div class="card"><div class="card-title">Report: {jd_title} Candidates</div>',
            unsafe_allow_html=True,
        )

        df = pd.DataFrame(rows)[
            ["candidate_id", "name", "evaluation_summary", "score", "selected"]
        ]
        df.columns = [
            "Candidate ID",
            "Candidate Name",
            "Evaluation Summary",
            "Score",
            "Selected",
        ]
        st.dataframe(df, use_container_width=True, hide_index=True)

        st.markdown("</div>", unsafe_allow_html=True)

        # Not a black box: let HR open any candidate and see exactly what
        # the AI saw (full transcript) and exactly how it reasoned
        # (strengths/weaknesses/summary), not just the final score.
        for row in rows:
            with st.expander(f"🔍 {row['name']} — full conversation & AI reasoning"):
                col1, col2 = st.columns(2)
                with col1:
                    st.markdown("**Strengths**")
                    st.write(row.get("strengths") or "—")
                with col2:
                    st.markdown("**Weaknesses**")
                    st.write(row.get("weaknesses") or "—")

                st.markdown("**Overall AI evaluation summary**")
                st.write(row.get("evaluation_summary") or "—")

                st.markdown("**Full interview transcript**")
                transcript = row.get("transcript")
                if transcript:
                    st.text_area(
                        "Transcript",
                        transcript,
                        height=250,
                        key=f"transcript_{row['candidate_id']}",
                        label_visibility="collapsed",
                    )
                else:
                    st.caption("No transcript was captured for this interview.")


# ---------------------------------------------------------------- Settings
def render_settings():
    st.title("Settings")

    company = data.get_company_settings(COMPANY_ID)

    # --- Account info ---
    st.markdown(
        '<div class="card"><div class="card-title">Account</div>',
        unsafe_allow_html=True,
    )
    st.write(f"**Company:** {company['company_name']}")
    st.write(f"**Company ID:** `{company['company_id']}`")
    st.markdown("</div>", unsafe_allow_html=True)

    # --- Contact email (used as Reply-To in candidate emails) ---
    st.markdown(
        '<div class="card"><div class="card-title">Contact email</div>',
        unsafe_allow_html=True,
    )
    st.caption(
        "Shown as the Reply-To address on interview and shortlist emails sent to candidates."
    )
    with st.form("update_email_form"):
        new_email = st.text_input("Company email", value=company.get("email") or "")
        if st.form_submit_button("Save email"):
            data.update_company_settings(COMPANY_ID, email=new_email)
            st.toast("Contact email updated.", icon="✅")
            st.rerun()
    st.markdown("</div>", unsafe_allow_html=True)

    # --- Shortlisting threshold ---
    st.markdown(
        '<div class="card"><div class="card-title">Shortlisting threshold</div>',
        unsafe_allow_html=True,
    )
    st.caption(
        "Candidates scoring above this get shortlisted; everyone else is rejected. Applies to every JD you post."
    )
    with st.form("threshold_form"):
        new_threshold = st.slider(
            "Minimum match score to shortlist",
            min_value=0,
            max_value=100,
            value=int(company.get("shortlist_threshold") or 50),
            step=5,
        )
        if st.form_submit_button("Save threshold"):
            data.update_company_settings(
                COMPANY_ID, shortlist_threshold=float(new_threshold)
            )
            st.toast(f"Threshold updated to {new_threshold}.", icon="✅")
            st.rerun()
    st.markdown("</div>", unsafe_allow_html=True)

    # --- Change password ---
    st.markdown(
        '<div class="card"><div class="card-title">Change password</div>',
        unsafe_allow_html=True,
    )
    with st.form("change_password_form"):
        old_password = st.text_input("Current password", type="password")
        new_password = st.text_input("New password", type="password")
        confirm_password = st.text_input("Confirm new password", type="password")
        if st.form_submit_button("Change password"):
            if not old_password or not new_password:
                st.error("Fill in all fields.")
            elif new_password != confirm_password:
                st.error("New passwords don't match.")
            elif data.change_company_password(COMPANY_ID, old_password, new_password):
                st.toast("Password changed.", icon="✅")
            else:
                st.error("Current password is incorrect.")
    st.markdown("</div>", unsafe_allow_html=True)

    # --- Export data ---
    st.markdown(
        '<div class="card"><div class="card-title">Export candidates</div>',
        unsafe_allow_html=True,
    )
    st.caption("Download every candidate across all your JDs as a CSV.")
    all_candidates = data.get_shortlisted_candidates(company_id=COMPANY_ID)
    if all_candidates:
        export_df = pd.DataFrame(all_candidates)[
            [
                "candidate_id",
                "name",
                "phone",
                "email",
                "jd_title",
                "match_score",
                "status",
                "call_status",
            ]
        ]
        st.download_button(
            "Download CSV",
            export_df.to_csv(index=False).encode("utf-8"),
            file_name=f"{company['company_id']}_candidates.csv",
            mime="text/csv",
        )
    else:
        st.caption("No candidates yet.")
    st.markdown("</div>", unsafe_allow_html=True)

    # --- Log out ---
    st.divider()
    if st.button("Log out", type="primary"):
        for key in ["logged_in_type", "company_id", "company_name"]:
            st.session_state.pop(key, None)
        st.rerun()


# ---------------------------------------------------------------- Router
if selected == "Dashboard":
    render_dashboard()
elif selected == "Shortlisted":
    render_shortlisted()
elif selected == "Reports":
    render_reports()
elif selected == "Settings":
    render_settings()
