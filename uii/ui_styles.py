"""
Embedded CSS for the recruitment dashboard.

Theme: navy + off-white.
  Navy      #10233F  (sidebar, headings, primary text)
  Navy-2    #1B3A63  (hover/secondary navy, used for gradients/accents)
  Off-white #F7F5F0  (page background -- warmer than pure white/grey)
  Card      #FFFFFF  (cards sit slightly lighter than the off-white backdrop)
  Accent    #2F6FED  (CTAs, links, active nav -- unchanged, still reads
                      as "action" against the new warmer neutrals)

Colors are exposed as CSS custom properties on :root so a future dark-mode
toggle (or any other re-theme) only needs to touch the block at the top.
"""

CUSTOM_CSS = """
<style>
:root {
    --navy: #10233F;
    --navy-2: #1B3A63;
    --off-white: #F7F5F0;
    --card-bg: #FFFFFF;
    --card-border: #E7E2D8;
    --accent: #2F6FED;
    --accent-hover: #1E5AA8;
    --text-primary: #10233F;
    --text-muted: #6B6558;

    /* Overrides Streamlit's own theme accent (used internally for the
       checked-radio dot, tab underline, focus rings, slider fill, etc).
       Without this, those specific built-in elements stay Streamlit's
       default red no matter what CSS we write for our own classes --
       this is the fix for the red radio dot / red tab underline. */
    --primary-color: var(--accent);
}

/* ---------- Base ---------- */
* {
    font-family: -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
}

/* ---------- Sidebar (navy) ---------- */
section[data-testid="stSidebar"] {
    background-color: var(--navy);
    padding-top: 0.5rem;
}
section[data-testid="stSidebar"] .block-container {
    padding-top: 1rem;
}
section[data-testid="stSidebar"] label, section[data-testid="stSidebar"] p {
    color: #C9D3E0;
}

/* ---------- Card container ---------- */
.card {
    background: var(--card-bg);
    border-radius: 12px;
    padding: 24px;
    box-shadow: 0 1px 3px rgba(16, 35, 63, 0.08);
    margin-bottom: 20px;
    border: 1px solid var(--card-border);
}
.card-title {
    font-size: 17px;
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: 4px;
}
.card-subtitle {
    font-size: 13px;
    color: var(--text-muted);
    margin-bottom: 16px;
}

/* ---------- Status pills ---------- */
.pill {
    display: inline-block;
    padding: 3px 12px;
    border-radius: 999px;
    font-size: 12px;
    font-weight: 600;
    white-space: nowrap;
}
.pill-shortlisted { background: #FBEED6; color: #92660A; }
.pill-selected    { background: #DCEEE1; color: #12784A; }
.pill-rejected    { background: #F7E1DC; color: #B3261E; }
.pill-called      { background: #DCE6F5; color: #1E5AA8; }
.pill-notcalled   { background: #EDEAE2; color: var(--text-muted); }
.pill-dialing     { background: #FBEED6; color: #92660A; }
.pill-completed   { background: #DCEEE1; color: #12784A; }
.pill-failed      { background: #F7E1DC; color: #B3261E; }
.pill-pending     { background: #EDEAE2; color: var(--text-muted); }

/* ---------- Progress bar ---------- */
.stProgress > div > div > div > div {
    background-color: var(--accent);
}

/* ---------- Buttons: primary accent CTA ---------- */
div.stButton > button, div.stDownloadButton > button {
    background-color: var(--accent);
    color: white;
    border: none;
    border-radius: 8px;
    padding: 0.5rem 1.25rem;
    font-weight: 600;
    transition: background-color 0.15s ease;
}
div.stButton > button:hover, div.stDownloadButton > button:hover {
    background-color: var(--accent-hover);
    color: white;
}

/* Secondary/destructive buttons (delete confirm, cancel) can opt into this
   via st.button(..., type="secondary") -- Streamlit already renders those
   with a different data attribute we can hook. */
div.stButton > button[kind="secondary"] {
    background-color: transparent;
    color: var(--text-primary);
    border: 1px solid var(--card-border);
}
div.stButton > button[kind="secondary"]:hover {
    background-color: var(--off-white);
    color: var(--text-primary);
}

/* ---------- Page headers ---------- */
h1, h2, h3 {
    color: var(--text-primary);
}

/* ---------- Dataframe polish ---------- */
[data-testid="stDataFrame"] {
    border-radius: 10px;
    overflow: hidden;
    border: 1px solid var(--card-border);
}

/* ---------- Metric cards ---------- */
[data-testid="stMetric"] {
    background: var(--card-bg);
    border-radius: 10px;
    padding: 14px 18px;
    border: 1px solid var(--card-border);
}

/* ---------- Login page: plain title + single real bordered container ---------- */
.stApp {
    background-color: var(--off-white);
    background-image: radial-gradient(circle, #DCD6C8 1px, transparent 1px);
    background-size: 26px 26px;
}
.login-title {
    text-align: center;
    font-size: 34px;
    font-weight: 700;
    color: var(--navy);
    margin: 36px 0 24px 0;
    letter-spacing: 0.3px;
}

/* This targets the actual st.container(border=True, key="login_card") --
   Streamlit tags a keyed container's element with a "st-key-<key>" class,
   which is what lets us style the REAL bordered wrapper (unlike the old
   raw <div> approach, which never actually enclosed the widgets inside
   it). Requires Streamlit >= ~1.32 for the key-based class; on older
   versions this selector simply won't match and you'll get Streamlit's
   default grey-border container instead -- everything still works, it
   just won't be navy. */
.st-key-login_card {
    max-width: 420px;
    margin: 0 auto 40px auto !important;
    border: 1.5px solid var(--navy) !important;
    border-radius: 16px !important;
    background: var(--card-bg) !important;
    box-shadow: 0 8px 24px rgba(16, 35, 63, 0.10) !important;
    padding: 28px 32px !important;
}

.login-welcome-title {
    font-size: 21px;
    font-weight: 700;
    color: var(--text-primary);
    margin: 18px 0 2px 0;
}
.login-welcome-subtitle {
    font-size: 13.5px;
    color: var(--text-muted);
    margin-bottom: 14px;
}
.login-forgot-link {
    text-align: right;
    font-size: 12.5px;
    color: var(--accent);
    margin: -8px 0 6px 0;
}

/* Visible borders on every text/password input -- on by default, not just
   on focus, per request. Streamlit's default border is nearly invisible
   against a white card, so this overrides it explicitly. */
div[data-testid="stTextInput"] input {
    border: 1.5px solid var(--navy-2) !important;
    border-radius: 8px !important;
    background-color: #FFFFFF !important;
}
div[data-testid="stTextInput"] input:focus {
    border-color: var(--accent) !important;
    box-shadow: 0 0 0 2px rgba(47, 111, 237, 0.15) !important;
}

/* Blue-themed tabs (Log in / Sign up) -- same styling applies on both the
   Company and Candidate side since they share this markup. The
   --primary-color override above handles the underline color; this adds
   the active-tab text color on top. */
button[data-baseweb="tab"] {
    color: var(--text-muted);
    font-weight: 600;
}
button[data-baseweb="tab"][aria-selected="true"] {
    color: var(--accent) !important;
}

/* Pill-style segmented toggle for the Company/Candidate radio, scoped to
   the login card so it doesn't affect any other st.radio in the app.
   Streamlit doesn't expose a "selected" class on the label itself, so
   :has() is used to style the checked option -- needs a modern
   Chromium/Edge/Safari browser (fine here, degrades to a plain radio row
   on very old browsers). */
.st-key-login_card div[data-testid="stRadio"] > div[role="radiogroup"] {
    display: flex;
    background: var(--off-white);
    border-radius: 999px;
    padding: 4px;
    gap: 4px;
    border: 1px solid var(--card-border);
}
.st-key-login_card div[data-testid="stRadio"] > div[role="radiogroup"] label {
    flex: 1;
    justify-content: center;
    margin: 0 !important;
    padding: 8px 14px !important;
    border-radius: 999px !important;
    background: transparent;
    transition: background-color 0.15s ease;
}
.st-key-login_card div[data-testid="stRadio"] > div[role="radiogroup"] label:has(input:checked) {
    background: var(--navy);
}
.st-key-login_card div[data-testid="stRadio"] > div[role="radiogroup"] label:has(input:checked) p {
    color: #FFFFFF !important;
    font-weight: 600;
}
.st-key-login_card div[data-testid="stRadio"] input[type="radio"] {
    position: absolute;
    opacity: 0;
}
.st-key-login_card div[data-testid="stRadio"] label > div:first-child {
    display: none; /* hide the native radio dot, pill background communicates selection */
}

/* ---------- Candidate portal: narrow company toggle ---------- */
.company-toggle-wrap div[role="radiogroup"] {
    display: inline-flex;
    width: auto;
}

/* ---------- Avatar initials (name badges in tables/cards) ---------- */
.avatar-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: var(--navy-2);
    color: white;
    font-size: 12px;
    font-weight: 700;
    margin-right: 8px;
    vertical-align: middle;
}
</style>
"""
