# RecruitAI — Frontend

A React + TypeScript web app for the RecruitAI hiring pipeline: company
dashboard (job openings, shortlisted candidates, reports, settings) and a
candidate self-service portal. Talks to the `api/` service, which wraps
the existing pipeline.

## Stack

- React 19 + TypeScript, built with Vite
- Tailwind CSS v4 for styling
- React Router for client-side routing
- Axios for API calls

## Setup

```bash
npm install
cp .env.example .env.local   # set VITE_API_BASE_URL if the API runs elsewhere
npm run dev
```

The dev server runs at `http://localhost:5173`. It expects the API
service (see `../api/README.md`) running at `http://localhost:8040` by
default.

## Scripts

- `npm run dev` — start the dev server
- `npm run build` — type-check and build for production (`dist/`)
- `npm run preview` — preview the production build locally
- `npm run lint` — run ESLint

## Structure

```
src/
  lib/          API client, auth context, toast notifications, shared types
  components/
    ui/         Reusable primitives (Button, Card, Input, Badge, Modal, ...)
    layout/     Sidebar, app shell, route guards
  pages/
    LoginPage.tsx           company + candidate login/signup
    company/                dashboard, shortlisted, reports, settings
    candidate/              candidate self-service portal
```

Every page only calls endpoints that exist on the API service — there is
no page or action here for functionality the backend doesn't implement.
